const path = require('path')
let ort = null
try {
    ort = require('onnxruntime-node')
} catch (err) {
    console.warn('[LSTM ONNX Service] Notice: onnxruntime-node could not be loaded in this runtime:', err.message)
}
const db = require('../config/db')
const { calcThi, getRiskLevel, getFarmProfile } = require('./heatStress')
const { getRiskAdvisory, getBadgeClass } = require('./forecastService')

// ⚠️ EXPERIMENTAL - ปิดใช้งานใน production (ดู ENABLE_LSTM ใน dailyLstmScheduler.js)
// farm_lstm.onnx เทรนจากข้อมูลสังเคราะห์ (backend/ml_lstm/synthetic_pretrain.py) ด้วยสูตร THI ที่ปรับเองแบบไม่มีที่มา
// วัดผลแล้วแพ้ baseline ค่าเฉลี่ย 72 ชม. และทายต่ำกว่าจริง ~9 THI เมื่อไม่มีข้อมูลกล้อง
// ต้องเทรนใหม่ด้วยข้อมูลจริงก่อนเปิดใช้

let onnxSession = null

/**
 * โหลดโมเดล farm_lstm.onnx แบบ Singleton
 */
const getOnnxSession = async () => {
    if (!ort) return null
    if (onnxSession) return onnxSession

    const modelPaths = [
        path.resolve(__dirname, '../../../backend/app/weights/farm_lstm.onnx'),
        path.resolve(__dirname, '../../weights/farm_lstm.onnx'),
        path.resolve(__dirname, '../weights/farm_lstm.onnx'),
        path.resolve(process.cwd(), 'app/weights/farm_lstm.onnx'),
        path.resolve(process.cwd(), 'backend/app/weights/farm_lstm.onnx')
    ]

    let loaded = false
    for (const p of modelPaths) {
        try {
            onnxSession = await ort.InferenceSession.create(p)
            console.log(`[LSTM ONNX Service] ✅ Loaded farm_lstm.onnx successfully from: ${p}`)
            loaded = true
            break
        } catch (e) {
            // try next path
        }
    }

    if (!loaded) {
        console.warn('[LSTM ONNX Service] ⚠️ Could not load farm_lstm.onnx. Will use heuristic fallback.')
    }

    return onnxSession
}

/**
 * ดึงข้อมูลสภาพแวดล้อม 72 ชั่วโมง (3 วัน) ย้อนหลัง ผสานกับพฤติกรรมจากกล้องวงจรปิด Hikvision / CCTV Telemetry
 * @param {string} farmId - UUID ของฟาร์ม
 * @param {string} targetDateStr - วันที่เป้าหมาย YYYY-MM-DD
 */
const fetch72HourMultimodalWindow = async (farmId, targetDateStr = null) => {
    const targetDate = targetDateStr ? new Date(`${targetDateStr}T23:59:59+07:00`) : new Date()
    const past72hDate = new Date(targetDate.getTime() - 72 * 3600 * 1000)

    // 1. ดึงข้อมูลเซ็นเซอร์รายชั่วโมง 72 ชม. ย้อนหลัง
    const sensorQuery = `
        SELECT 
            date_trunc('hour', sr.recorded_at AT TIME ZONE 'Asia/Bangkok') AS hour_bucket,
            AVG(sr.temperature_c)::numeric(5,2) AS avg_temp,
            AVG(sr.humidity_pct)::numeric(5,2) AS avg_hum,
            AVG(sr.thi)::numeric(5,2) AS avg_thi,
            COUNT(sr.id_sensor_readings) AS readings_count
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
          AND sr.recorded_at >= $2
          AND sr.recorded_at <= $3
        GROUP BY hour_bucket
        ORDER BY hour_bucket ASC
    `
    const { rows: sensorRows } = await db.query(sensorQuery, [farmId, past72hDate.toISOString(), targetDate.toISOString()])

    // 2. ดึงข้อมูลพฤติกรรมจากกล้องวงจรปิด (cctv_behavior_telemetry)
    const telemetryMap = new Map()
    try {
        const cctvQuery = `
            SELECT 
                date_trunc('hour', timestamp AT TIME ZONE 'Asia/Bangkok') AS hour_bucket,
                AVG(standing_pct)::numeric(5,2) AS avg_standing_pct,
                AVG(lying_pct)::numeric(5,2) AS avg_lying_pct,
                AVG(cow_comfort_index)::numeric(5,2) AS avg_cci
            FROM cctv_behavior_telemetry
            WHERE farm_id = $1
              AND timestamp >= $2
              AND timestamp <= $3
            GROUP BY hour_bucket
        `
        const { rows: cctvRows } = await db.query(cctvQuery, [farmId, past72hDate.toISOString(), targetDate.toISOString()])
        for (const c of cctvRows) {
            const k = new Date(c.hour_bucket).toISOString()
            if (c.avg_standing_pct == null || c.avg_lying_pct == null || c.avg_cci == null) continue
            telemetryMap.set(k, {
                standing_pct: parseFloat(c.avg_standing_pct),
                lying_pct: parseFloat(c.avg_lying_pct),
                cow_comfort_index: parseFloat(c.avg_cci)
            })
        }
    } catch (cctvErr) {
        // cctv_behavior_telemetry table query error fallback
    }

    // 3. Fallback เพิ่มเติมจาก behavior_logs (ถ้ามี)
    let behaviorMap = new Map()
    try {
        const behaviorQuery = `
            SELECT 
                date_trunc('hour', recorded_at AT TIME ZONE 'Asia/Bangkok') AS hour_bucket,
                COUNT(*) FILTER (WHERE behavior = 'standing') AS standing_count,
                COUNT(*) FILTER (WHERE behavior = 'lying') AS lying_count,
                COUNT(*) AS total_detected
            FROM behavior_logs
            WHERE farm_id = $1
              AND recorded_at >= $2
              AND recorded_at <= $3
            GROUP BY hour_bucket
        `
        const { rows: behRows } = await db.query(behaviorQuery, [farmId, past72hDate.toISOString(), targetDate.toISOString()])
        for (const b of behRows) {
            const k = new Date(b.hour_bucket).toISOString()
            const total = parseInt(b.total_detected, 10) || 1
            const standRatio = parseFloat((parseInt(b.standing_count, 10) / total).toFixed(2))
            const lieRatio = parseFloat((parseInt(b.lying_count, 10) / total).toFixed(2))
            behaviorMap.set(k, {
                standing_pct: parseFloat((standRatio * 100).toFixed(1)),
                lying_pct: parseFloat((lieRatio * 100).toFixed(1)),
                cow_comfort_index: parseFloat(((lieRatio / (standRatio + lieRatio || 1)) * 100).toFixed(1))
            })
        }
    } catch (behErr) {
        // behavior_logs fallback
    }

    // 4. ตรวจสอบชั่วโมงที่มีข้อมูล
    const totalFoundHours = sensorRows.length

    // ถ้ามีข้อมูลน้อยกว่า 24 ชม. ให้สลับไปใช้ Heuristic Fallback
    if (totalFoundHours < 24) {
        return {
            is_fallback: true,
            reason: `ฟาร์มเพิ่งเริ่มบันทึกข้อมูล (มีประวัติ ${totalFoundHours} ชั่วโมง / ต้องการอย่างน้อย 24 ชั่วโมง)`,
            found_hours: totalFoundHours,
            hourly_data: []
        }
    }

    // สร้าง Bucket ต่อเนื่อง 72 ช่อง
    const hourlyData = []
    let prevThi = null
    let missingBehaviorHours = 0

    // หากมีข้อมูลระหว่าง 24 - 71 ชม. ให้ทำ Diurnal Padding ย้อนหลังจาก 24 ชม. แรก
    const fillSource = sensorRows.length > 0 ? sensorRows : []

    for (let i = 0; i < 72; i++) {
        const bucketTime = new Date(past72hDate.getTime() + (i + 1) * 3600 * 1000)
        const hourStr = bucketTime.toISOString()

        // หา row ที่ตรงกับชั่วโมงนี้
        let match = sensorRows.find(r => {
            const rTime = new Date(r.hour_bucket).getTime()
            return Math.abs(rTime - bucketTime.getTime()) < 1800 * 1000 // ภายใน 30 นาที
        })

        // ถ้าไม่มีข้อมูล ให้ทำ Diurnal Forward-fill หรือ Padding จากวันก่อนหน้า
        if (!match) {
            const fallbackIdx = i % fillSource.length
            match = fillSource[fallbackIdx]
        }

        const temp = match?.avg_temp != null ? parseFloat(match.avg_temp) : 28.5
        const hum = match?.avg_hum != null ? parseFloat(match.avg_hum) : 70.0
        
        const thaiThi = calcThi(temp, hum)
        const rawThi = thaiThi

        const dThi = prevThi !== null ? parseFloat((thaiThi - prevThi).toFixed(2)) : 0.0
        prevThi = thaiThi

        // Accumulated heat hours in rolling 24h: ค่า 76.0 ต้องตรงกับตอนเทรน (synthetic_pretrain.py) ห้ามเปลี่ยนตามเกณฑ์ใหม่
        const startW = Math.max(0, i - 23)
        const accHeat = hourlyData.slice(startW, i).filter(h => h.thai_thi >= 76.0).length + (thaiThi >= 76.0 ? 1 : 0)

        // Night recovery avg (00:00 - 06:00 Bangkok Time)
        const bangkokHour = (bucketTime.getUTCHours() + 7) % 24
        const nightReadings = hourlyData.slice(startW, i).filter(h => h.bangkok_hour < 6).map(h => h.thai_thi)
        const nightRec = nightReadings.length > 0 
            ? parseFloat((nightReadings.reduce((a, b) => a + b, 0) / nightReadings.length).toFixed(1))
            : thaiThi

        const hSin = parseFloat(Math.sin(bangkokHour * 2 * Math.PI / 24).toFixed(3))
        const hCos = parseFloat(Math.cos(bangkokHour * 2 * Math.PI / 24).toFixed(3))

        // รวมข้อมูลพฤติกรรม: กล้อง CCTV -> behavior_logs (ไม่เติมค่า "วัวสบายดี" แทนข้อมูลที่ขาด)
        const cctvBeh = telemetryMap.get(hourStr) || behaviorMap.get(hourStr) || null
        if (!cctvBeh) missingBehaviorHours++

        hourlyData.push({
            hour_index: i,
            bangkok_hour: bangkokHour,
            timestamp: bucketTime.toISOString(),
            temperature_c: temp,
            humidity_pct: hum,
            raw_thi: rawThi,
            thai_thi: thaiThi,
            thi: thaiThi, // compatibility
            thi_rate_of_change: dThi,
            accumulated_heat_hours: accHeat,
            night_recovery_thi: nightRec,
            hour_sin: hSin,
            hour_cos: hCos,
            standing_pct: cctvBeh ? cctvBeh.standing_pct : null,
            lying_pct: cctvBeh ? cctvBeh.lying_pct : null,
            cow_comfort_index: cctvBeh ? cctvBeh.cow_comfort_index : null
        })
    }

    return {
        is_fallback: false,
        has_behavior: missingBehaviorHours === 0,
        missing_behavior_hours: missingBehaviorHours,
        engine: totalFoundHours < 72 ? 'onnx_bilstm_attention_v2.5 (padded_warmup)' : 'onnx_bilstm_attention_v2.5',
        found_hours: totalFoundHours,
        hourly_data: hourlyData
    }
}

/**
 * รัน Inference ด้วยโมเดล ONNX Deep Learning (11 Dynamic Features + 3 Static Barn Features)
 */
const runOnnxInference = async (farm, windowData) => {
    const session = await getOnnxSession()
    if (!session || !ort || windowData.is_fallback) {
        return null // ให้ระบบ fallback ไปใช้สูตร
    }

    const { hourly_data } = windowData
    if (hourly_data.length !== 72) return null
    // โมเดลพึ่งข้อมูลพฤติกรรมจากกล้อง ถ้าขาดจะทายต่ำกว่าจริงมาก ห้ามรัน
    if (!windowData.has_behavior) return null
    const profile = getFarmProfile(farm)

    // 1. สร้าง Float32Array สำหรับ x_temporal: [1, 72, 11]
    const temporalArr = new Float32Array(1 * 72 * 11)
    for (let i = 0; i < 72; i++) {
        const h = hourly_data[i]
        const offset = i * 11
        temporalArr[offset + 0] = h.temperature_c
        temporalArr[offset + 1] = h.humidity_pct
        temporalArr[offset + 2] = h.thai_thi
        temporalArr[offset + 3] = h.thi_rate_of_change
        temporalArr[offset + 4] = h.accumulated_heat_hours
        temporalArr[offset + 5] = h.night_recovery_thi
        temporalArr[offset + 6] = h.hour_sin
        temporalArr[offset + 7] = h.hour_cos
        temporalArr[offset + 8] = h.standing_pct
        temporalArr[offset + 9] = h.lying_pct
        temporalArr[offset + 10] = h.cow_comfort_index
    }
    const tensorTemporal = new ort.Tensor('float32', temporalArr, [1, 72, 11])

    // 2. สร้าง Float32Array สำหรับ x_static: [1, 3] (barn_height_m, roof_type_id, cooling_type_id)
    const barnHeight = farm?.barn_height_m ? parseFloat(farm.barn_height_m) : 2.7
    let roofId = 0.0 // 0: Tile
    if (farm?.roof_type && (farm.roof_type.includes('สังกะสี') || farm.roof_type.toLowerCase().includes('zinc'))) {
        roofId = 1.0 // 1: Zinc
    } else if (farm?.roof_type && farm.roof_type.toLowerCase().includes('metal')) {
        roofId = 2.0 // 2: Metal Sheet
    }

    let coolingId = 1.0 // 1: Fan default
    if (farm?.cooling_system && (farm.cooling_system.includes('หมอก') || farm.cooling_system.toLowerCase().includes('mist'))) {
        coolingId = 2.0 // 2: Mist+Fan
    } else if (farm?.cooling_system && (farm.cooling_system.includes('ไม่มี') || farm.cooling_system.toLowerCase().includes('none'))) {
        coolingId = 0.0 // 0: None
    }

    const staticArr = new Float32Array([barnHeight, roofId, coolingId])
    const tensorStatic = new ort.Tensor('float32', staticArr, [1, 3])

    // 3. รัน Inference
    const startMs = Date.now()
    const feeds = { x_temporal: tensorTemporal, x_static: tensorStatic }
    const results = await session.run(feeds)
    const inferenceLatencyMs = Date.now() - startMs

    const predThiArr = Array.from(results.predicted_thi.data)
    const riskLogitsData = Array.from(results.risk_logits.data) // [3, 4]
    const attnWeights = Array.from(results.attention_weights.data) // [72]

    // หา 3 ชั่วโมงที่มี Attention Weight สูงสุด (Critical Stress Contributing Hours)
    const indexedAttn = attnWeights.map((w, idx) => ({ idx, weight: w, hour: hourly_data[idx]?.bangkok_hour }))
    indexedAttn.sort((a, b) => b.weight - a.weight)
    const topAttentionHours = indexedAttn.slice(0, 3).map(a => `${String(a.hour).padStart(2, '0')}:00`)

    // ค่าเฉลี่ยความชื้นสัมพัทธ์และ CCI ล่าสุดในรอบ 24 ชั่วโมง เพื่อใช้ในข้อเสนอแนะ
    const recent24h = hourly_data.slice(48, 72)
    const avgRecentHum = recent24h.length 
        ? recent24h.reduce((a, b) => a + b.humidity_pct, 0) / recent24h.length 
        : 70.0
    const latestCci = recent24h.length ? recent24h[recent24h.length - 1].cow_comfort_index : null

    // สร้างข้อมูลพยากรณ์ 3 วัน
    const horizons = [
        { offset: 1, label: 'พรุ่งนี้ (+24 ชม.)', day_name: 'Day +1' },
        { offset: 2, label: 'มะรืนนี้ (+48 ชม.)', day_name: 'Day +2' },
        { offset: 3, label: '3 วันข้างหน้า (+72 ชม.)', day_name: 'Day +3' }
    ]

    const now = new Date()
    const forecasts = horizons.map((h, dIdx) => {
        const targetTime = new Date(now.getTime() + h.offset * 24 * 3600 * 1000)
        const predThi = parseFloat(predThiArr[dIdx].toFixed(1))

        // ใช้เกณฑ์กลางตาม profile ของฟาร์ม (ไม่ใช้ risk head ของโมเดลซึ่งเทรนกับเกณฑ์เก่า)
        let riskLevel = getRiskLevel(predThi, profile)
        let cciWarning = ''
        if (latestCci != null && latestCci < 50.0 && riskLevel !== 'severe') {
            if (riskLevel === 'moderate') riskLevel = 'severe'
            else if (riskLevel === 'mild') riskLevel = 'moderate'
            cciWarning = ' [CCI วัวไม่ยอมนอน <50%]'
        }

        return {
            horizon_days: h.offset,
            label: h.label,
            day_name: h.day_name,
            date: targetTime.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric', month: 'short' }),
            predicted_thi: predThi,
            risk_level: riskLevel,
            advisory: getRiskAdvisory(riskLevel, avgRecentHum) + cciWarning,
            badge_class: getBadgeClass(riskLevel)
        }
    })

    return {
        model_name: 'Bi-LSTM (EXPERIMENTAL, synthetic-trained)',
        version: 'onnx-bilstm-experimental',
        engine: windowData.engine,
        evaluation_note: 'เทรนจากข้อมูลสังเคราะห์ ยังไม่ผ่านการทดสอบภาคสนาม',
        hf_profile: profile,
        inference_latency_ms: inferenceLatencyMs,
        lookback_hours: 72,
        critical_attention_hours: topAttentionHours,
        peak_predicted_thi: Math.max(...forecasts.map(d => d.predicted_thi)),
        latest_cow_comfort_index: latestCci,
        forecasts
    }
}

/**
 * สร้างคำแนะนำสรุปประจำวันภาษาชาวบ้าน (แยกแยะบริบทฤดูร้อน vs ฤดูฝน & Anti-Misting Rule)
 */
const generateElderlyFriendlyAdvisory = (summaryDate, avgThi, maxThi, avgTemp, avgHum, severeHours, stressHours, nightRecoveryThi, cci = null, profile = 'default') => {
    let advisory = `สรุปสภาวะอากาศวันที่ ${summaryDate}: ค่า THI เฉลี่ย ${avgThi} (สูงสุด ${maxThi}) อุณหภูมิเฉลี่ย ${avgTemp}°C ความชื้นเฉลี่ย ${avgHum}%`

    // บริบทพิเศษ: ฤดูฝน (ความชื้นสูงจัด >= HUMID_RH ใน heatStress.js, ค่าแนวทางของระบบ)
    if (avgHum >= 75.0) {
        if (severeHours > 0) {
            advisory += ` 🌧️🚨 อากาศอบอ้าวความชื้นสูงจัด (${avgHum}%) ตรวจพบวิกฤตความร้อน ${severeHours} ชม. เสี่ยงน้ำนมตก! ให้เปิดพัดลมระบายอากาศเต็มที่ *ห้ามพ่นหมอกเด็ดขาด* เพื่อป้องกันคอกแฉะและโรคเต้านมอักเสบ`
        } else if (stressHours >= 4.0) {
            advisory += ` 🌧️⚠️ อากาศอบอ้าวจากความชื้นสูง (>75%) แม่โคระบายเหงื่อยาก แนะนำเปิดพัดลมระบายอากาศ *ห้ามพ่นหมอก* เพื่อป้องกันคอกแฉะและโรคเต้านมอักเสบ`
        } else {
            advisory += ` 🌧️ อากาศมีความชื้นสูง (${avgHum}%) แต่ยังอยู่ในเกณฑ์ปกติ ควรรักษาความแห้งของพื้นคอกและเปิดพัดลมหมุนเวียนอากาศ`
        }
    } else {
        if (severeHours > 0) {
            advisory += ` 🚨 ตรวจพบวิกฤตความร้อนจัด ${severeHours} ชม. เสี่ยงน้ำนมดิ่งในอีก 5 วัน! ควรเปิดพัดลมพ่นหมอกเต็มที่ และเสริมเกลือแร่ในน้ำ`
        } else if (stressHours >= 4.0) {
            advisory += ` ⚠️ มีความร้อนสะสมนาน ${stressHours} ชม. แนะนำเปิดพัดลมระบายอากาศช่วง 11:00-15:00 น.`
        } else {
            advisory += ` ✅ สภาวะอากาศปกติ`
        }
    }

    if (cci != null && cci < 50.0) {
        advisory += ` (⚠️ ดัชนีความสบาย CCI ต่ำ ${cci}%: โคยืนแช่ไม่ยอมนอนพักผ่อน ควรตรวจสอบความร้อนใต้หลังคาหรือพื้นคอก)`
    }

    // กลางคืนควรลดลงต่ำกว่าระดับเฝ้าระวังของฟาร์ม
    if (nightRecoveryThi != null && nightRecoveryThi >= getRiskThresholdMild(profile)) {
        advisory += ` (⚠️ กลางคืนระบายความร้อนไม่ทัน: Night THI ${nightRecoveryThi})`
    } else if (nightRecoveryThi != null) {
        advisory += ` (🌙 กลางคืนอากาศเย็นสบาย ฟื้นตัวได้ดี: Night THI ${nightRecoveryThi})`
    }

    return advisory
}

const getRiskThresholdMild = (profile) => require('./heatStress').getThresholds(profile).mild

module.exports = {
    getOnnxSession,
    calcThi,
    fetch72HourMultimodalWindow,
    runOnnxInference,
    generateElderlyFriendlyAdvisory
}
