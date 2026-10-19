let cron = null
try {
    cron = require('node-cron')
} catch (err) {
    console.warn('[Daily LSTM Scheduler] Notice: node-cron could not be loaded in this runtime:', err.message)
}
const db = require('../config/db')
const { 
    fetch72HourMultimodalWindow, 
    runOnnxInference, 
    generateElderlyFriendlyAdvisory
} = require('./lstmOnnxService')
const { calcThi, getFarmProfile, getThresholds } = require('./heatStress')
const { generateBaselineForecast } = require('./forecastService')

// Bi-LSTM ปิดไว้จนกว่าจะเทรนใหม่ด้วยข้อมูลจริง (ดูหมายเหตุใน lstmOnnxService.js)
const isLstmEnabled = () => String(process.env.ENABLE_LSTM || '').toLowerCase() === 'true'

/**
 * แปลงวันที่เป็น YYYY-MM-DD ตามโซนเวลา Asia/Bangkok
 */
const getBangkokDateStr = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date)
}

/**
 * ประมวลผล Daily Summary และ LSTM Forecast สำหรับ 1 ฟาร์ม
 * @param {string} farmId - UUID ของฟาร์ม
 * @param {string} targetDateStr - วันที่สรุปผล รูปแบบ YYYY-MM-DD
 */
const calculateFarmDailySummary = async (farmId, targetDateStr = null) => {
    const summaryDate = targetDateStr || getBangkokDateStr()

    // 1. ดึงข้อมูลฟาร์ม
    const farmRes = await db.query(`SELECT * FROM tb_farms WHERE id_farms = $1`, [farmId])
    if (farmRes.rows.length === 0) {
        throw new Error(`Farm with ID ${farmId} not found`)
    }
    const farm = farmRes.rows[0]
    const profile = getFarmProfile(farm)
    const thresholds = getThresholds(profile)

    // 2. ดึงข้อมูลเซ็นเซอร์ของวันนั้น (00:00:00 ถึง 23:59:59 เวลาไทย)
    const startOfDay = `${summaryDate} 00:00:00+07`
    const endOfDay = `${summaryDate} 23:59:59+07`

    const readingsRes = await db.query(`
        SELECT sr.temperature_c, sr.humidity_pct, sr.thi, sr.recorded_at
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
          AND sr.recorded_at >= $2
          AND sr.recorded_at <= $3
        ORDER BY sr.recorded_at ASC
    `, [farmId, startOfDay, endOfDay])

    const readings = readingsRes.rows

    if (readings.length === 0) {
        return {
            success: false,
            message: `ไม่มีข้อมูลเซ็นเซอร์สำหรับฟาร์ม ${farm.name_farms} ในวันที่ ${summaryDate}`,
            summary_date: summaryDate,
            id_farms: farmId
        }
    }

    // 3. ประมวลผลสถิติของวันตามเกณฑ์โคนมไทย
    const temps = []
    const hums = []
    const thisList = []
    let stressCount = 0
    let severeCount = 0
    const nightThis = []

    for (const r of readings) {
        const t = r.temperature_c != null ? parseFloat(r.temperature_c) : null
        const h = r.humidity_pct != null ? parseFloat(r.humidity_pct) : null
        let thi = (t !== null && h !== null) ? calcThi(t, h) : (r.thi != null ? parseFloat(r.thi) : null)

        if (t !== null && !isNaN(t)) temps.push(t)
        if (h !== null && !isNaN(h)) hums.push(h)
        if (thi !== null && !isNaN(thi)) {
            thisList.push(thi)
            // ชั่วโมงเครียด = ระดับ moderate ขึ้นไป ตามเกณฑ์ของฟาร์ม (heatStress.js)
            if (thi >= thresholds.moderate) stressCount++
            if (thi >= thresholds.severe) severeCount++

            // ตรวจสอบช่วงกลางคืน (00:00 - 06:00 เวลาไทย) เพื่อประเมิน Night Recovery
            if (r.recorded_at) {
                const recDate = new Date(r.recorded_at)
                const bangkokHour = (recDate.getUTCHours() + 7) % 24
                if (bangkokHour >= 0 && bangkokHour < 6) {
                    nightThis.push(thi)
                }
            }
        }
    }

    const totalCount = thisList.length || 1
    const avgThi = thisList.length ? parseFloat((thisList.reduce((a, b) => a + b, 0) / thisList.length).toFixed(1)) : null
    const minThi = thisList.length ? parseFloat(Math.min(...thisList).toFixed(1)) : null
    const maxThi = thisList.length ? parseFloat(Math.max(...thisList).toFixed(1)) : null

    const avgTemp = temps.length ? parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)) : null
    const minTemp = temps.length ? parseFloat(Math.min(...temps).toFixed(1)) : null
    const maxTemp = temps.length ? parseFloat(Math.max(...temps).toFixed(1)) : null

    const avgHum = hums.length ? parseFloat((hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1)) : null
    const minHum = hums.length ? parseFloat(Math.min(...hums).toFixed(1)) : null
    const maxHum = hums.length ? parseFloat(Math.max(...hums).toFixed(1)) : null

    // ประมาณการชั่วโมงความเครียดสะสมในรอบวัน
    const stressHours = parseFloat(((stressCount / totalCount) * 24).toFixed(1))
    const severeHours = parseFloat(((severeCount / totalCount) * 24).toFixed(1))
    const nightRecoveryThi = nightThis.length 
        ? parseFloat((nightThis.reduce((a, b) => a + b, 0) / nightThis.length).toFixed(1)) 
        : (minThi || avgThi)

    // ดึงค่าเฉลี่ย Cow Comfort Index (CCI) จากกล้องวงจรปิดในรอบวัน
    let dayCci = null
    try {
        const cctvRes = await db.query(`
            SELECT AVG(cow_comfort_index)::numeric(5,2) AS avg_cci
            FROM cctv_behavior_telemetry
            WHERE farm_id = $1
              AND timestamp >= $2
              AND timestamp <= $3
        `, [farmId, startOfDay, endOfDay])
        if (cctvRes.rows[0]?.avg_cci != null) {
            dayCci = parseFloat(cctvRes.rows[0].avg_cci)
        }
    } catch (cctvErr) {
        // ไม่มีข้อมูลกล้อง: ปล่อยเป็น null ไม่เติมค่าสมมติ
    }

    // 4. ดึงสถิติย้อนหลังเพื่อเปรียบเทียบกับเมื่อวาน (Yesterday Comparison)
    const historySummariesRes = await db.query(`
        SELECT * FROM tb_farm_daily_summaries
        WHERE id_farms = $1 AND summary_date < $2
        ORDER BY summary_date DESC
        LIMIT 14
    `, [farmId, summaryDate])
    const pastSummaries = historySummariesRes.rows

    const yesterdaySummary = pastSummaries.length > 0 ? pastSummaries[0] : null
    let yesterdayComparison = {
        has_yesterday_data: false,
        diff_avg_thi: 0,
        diff_max_temp: 0,
        diff_stress_hours: 0,
        trend: 'stable',
        trend_description: 'ไม่มีข้อมูลเปรียบเทียบของวันที่ผ่านมา'
    }

    if (yesterdaySummary) {
        const yAvgThi = yesterdaySummary.avg_thi != null ? parseFloat(yesterdaySummary.avg_thi) : null
        const yMaxTemp = yesterdaySummary.max_temp_c != null ? parseFloat(yesterdaySummary.max_temp_c) : null
        const yStressHours = yesterdaySummary.stress_hours != null ? parseFloat(yesterdaySummary.stress_hours) : 0

        const diffThi = avgThi !== null && yAvgThi !== null ? parseFloat((avgThi - yAvgThi).toFixed(1)) : 0
        const diffTemp = maxTemp !== null && yMaxTemp !== null ? parseFloat((maxTemp - yMaxTemp).toFixed(1)) : 0
        const diffStress = parseFloat((stressHours - yStressHours).toFixed(1))

        let trend = 'stable'
        let trendDesc = 'สภาวะอากาศและระดับความเครียดใกล้เคียงกับเมื่อวาน'
        if (diffThi >= 1.0) {
            trend = 'increasing'
            trendDesc = `ความร้อนสะสมเฉลี่ยเพิ่มขึ้น +${diffThi} THI เทียบกับเมื่อวาน`
        } else if (diffThi <= -1.0) {
            trend = 'decreasing'
            trendDesc = `สภาวะอากาศเย็นลง -${Math.abs(diffThi)} THI เทียบกับเมื่อวาน`
        }

        yesterdayComparison = {
            has_yesterday_data: true,
            yesterday_date: yesterdaySummary.summary_date,
            diff_avg_thi: diffThi,
            diff_max_temp: diffTemp,
            diff_stress_hours: diffStress,
            trend,
            trend_description: trendDesc
        }
    }

    // 5. พยากรณ์ล่วงหน้า 3 วัน: baseline ค่าเฉลี่ย 72 ชม. (Bi-LSTM ใช้เฉพาะเมื่อเปิด ENABLE_LSTM=true)
    const endOfSummaryDay = new Date(`${summaryDate}T23:59:59+07:00`)
    const forecastEnd = endOfSummaryDay < new Date() ? endOfSummaryDay : new Date()
    let lstmForecast = null
    if (isLstmEnabled()) {
        try {
            const windowData = await fetch72HourMultimodalWindow(farmId, summaryDate)
            if (!windowData.is_fallback) {
                lstmForecast = await runOnnxInference(farm, windowData)
            }
        } catch (onnxErr) {
            console.warn(`[Daily Summary Job] ⚠️ ONNX inference error for farm ${farm.name_farms}:`, onnxErr.message)
        }
    }
    if (!lstmForecast) {
        lstmForecast = await generateBaselineForecast(farm, forecastEnd)
    }

    // 6. ข้อเสนอแนะเชิงรุกประจำวันภาษาชาวบ้าน (แยกแยะฤดูร้อน vs ฤดูฝน & Anti-Misting Rule)
    const dailyAdvisory = generateElderlyFriendlyAdvisory(
        summaryDate, 
        avgThi, 
        maxThi, 
        avgTemp, 
        avgHum, 
        severeHours, 
        stressHours, 
        nightRecoveryThi,
        dayCci,
        profile
    )

    // 7. บันทึกข้อมูลลง tb_farm_daily_summaries (UPSERT)
    const upsertQuery = `
        INSERT INTO tb_farm_daily_summaries (
            id_farms, summary_date,
            avg_thi, min_thi, max_thi,
            avg_temp_c, min_temp_c, max_temp_c,
            avg_humidity_pct, min_humidity_pct, max_humidity_pct,
            stress_hours, severe_hours, night_recovery_thi,
            yesterday_comparison, lstm_forecast, advisory, created_at
        ) VALUES (
            $1, $2,
            $3, $4, $5,
            $6, $7, $8,
            $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17, NOW()
        )
        ON CONFLICT (id_farms, summary_date) DO UPDATE SET
            avg_thi = EXCLUDED.avg_thi,
            min_thi = EXCLUDED.min_thi,
            max_thi = EXCLUDED.max_thi,
            avg_temp_c = EXCLUDED.avg_temp_c,
            min_temp_c = EXCLUDED.min_temp_c,
            max_temp_c = EXCLUDED.max_temp_c,
            avg_humidity_pct = EXCLUDED.avg_humidity_pct,
            min_humidity_pct = EXCLUDED.min_humidity_pct,
            max_humidity_pct = EXCLUDED.max_humidity_pct,
            stress_hours = EXCLUDED.stress_hours,
            severe_hours = EXCLUDED.severe_hours,
            night_recovery_thi = EXCLUDED.night_recovery_thi,
            yesterday_comparison = EXCLUDED.yesterday_comparison,
            lstm_forecast = EXCLUDED.lstm_forecast,
            advisory = EXCLUDED.advisory,
            created_at = NOW()
        RETURNING *;
    `

    const upsertRes = await db.query(upsertQuery, [
        farmId,
        summaryDate,
        avgThi, minThi, maxThi,
        avgTemp, minTemp, maxTemp,
        avgHum, minHum, maxHum,
        stressHours, severeHours, nightRecoveryThi,
        JSON.stringify(yesterdayComparison),
        JSON.stringify(lstmForecast),
        dailyAdvisory
    ])

    return {
        success: true,
        summary: upsertRes.rows[0],
        readings_count: readings.length,
        farm_name: farm.name_farms,
        engine: lstmForecast.engine || lstmForecast.model_name
    }
}

/**
 * ประมวลผล Daily Summary และ LSTM Forecast ให้กับทุกฟาร์มในระบบ
 */
const runAllFarmsDailySummary = async (targetDateStr = null) => {
    const summaryDate = targetDateStr || getBangkokDateStr()
    console.log(`[Daily LSTM Job] 🚀 Starting daily summary job for date: ${summaryDate} at ${new Date().toISOString()}`)

    try {
        const { rows: farms } = await db.query(`SELECT id_farms, name_farms FROM tb_farms ORDER BY created_at ASC`)
        console.log(`[Daily LSTM Job] Found ${farms.length} farms to process.`)

        const results = []
        for (const farm of farms) {
            try {
                const res = await calculateFarmDailySummary(farm.id_farms, summaryDate)
                results.push({ farm_id: farm.id_farms, farm_name: farm.name_farms, ...res })
                if (res.success) {
                    console.log(`[Daily LSTM Job] ✅ [${farm.name_farms}] Summary created successfully (${res.readings_count} readings, Engine: ${res.engine})`)
                } else {
                    console.log(`[Daily LSTM Job] ℹ️ [${farm.name_farms}] ${res.message}`)
                }
            } catch (err) {
                console.error(`[Daily LSTM Job] ❌ [${farm.name_farms}] Error processing summary:`, err.message)
                results.push({ farm_id: farm.id_farms, farm_name: farm.name_farms, success: false, error: err.message })
            }
        }

        console.log(`[Daily LSTM Job] 🏁 Daily summary job completed for ${farms.length} farms.`)
        return {
            success: true,
            summary_date: summaryDate,
            total_farms: farms.length,
            results
        }
    } catch (err) {
        console.error(`[Daily LSTM Job] Fatal error running daily summary job:`, err.message)
        throw err
    }
}

/**
 * ดึงประวัติ Daily Summaries ของฟาร์ม
 */
const getDailySummariesByFarm = async (farmId, limit = 14) => {
    const { rows } = await db.query(`
        SELECT * FROM tb_farm_daily_summaries
        WHERE id_farms = $1
        ORDER BY summary_date DESC
        LIMIT $2
    `, [farmId, limit])
    return rows
}

/**
 * เริ่มต้น Background Cron Job ทำงานวันละ 1 ครั้ง เวลา 20:00 น.
 */
const startDailyLstmCron = () => {
    if (!cron) {
        console.warn('[Daily LSTM Scheduler] ⚠️ node-cron is not available. Scheduled background job disabled, on-demand execution is still available.')
        return
    }
    const cronSchedule = '0 20 * * *'

    console.log(`[Daily LSTM Scheduler] ⏰ Scheduling daily job at ${cronSchedule} (Asia/Bangkok timezone)`)

    cron.schedule(cronSchedule, async () => {
        console.log(`[Daily LSTM Scheduler] 🔔 Triggered scheduled daily LSTM & Telemetry summary at ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`)
        try {
            await runAllFarmsDailySummary()
        } catch (err) {
            console.error('[Daily LSTM Scheduler] Failed to execute scheduled job:', err.message)
        }
    }, {
        timezone: 'Asia/Bangkok'
    })
}

module.exports = {
    calcThi,
    getBangkokDateStr,
    calculateFarmDailySummary,
    runAllFarmsDailySummary,
    getDailySummariesByFarm,
    startDailyLstmCron
}
