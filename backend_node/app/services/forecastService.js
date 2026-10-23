/**
 * CowCare AI - Baseline Heat Stress Forecast
 *
 * พยากรณ์ THI 3 วันข้างหน้าด้วย "ค่าเฉลี่ย THI รายชั่วโมงของ 72 ชม.ล่าสุด"
 * เหตุผล: บนข้อมูลสังเคราะห์ชุดเดียวกับที่ใช้เทรน วิธีนี้ได้ MAE ~0.45 THI ดีกว่า Bi-LSTM เดิม (~0.87)
 * ดูสคริปต์วัดผลที่ backend/ml_lstm/eval_baselines.py และ backend_node/scripts/eval_forecast.js
 *
 * ข้อจำกัด: ยังไม่ได้ใช้พยากรณ์อากาศ และยังไม่มีผลทดสอบกับข้อมูลภาคสนาม
 * ค่าพยากรณ์ทั้ง 3 วันจึงเท่ากัน (บอกแนวโน้มความร้อนสะสม ไม่ใช่พยากรณ์อากาศรายวัน)
 */

const db = require('../config/db')
const { getRiskLevel, getFarmProfile, getThresholds, thiSql, getCoolingAdvice } = require('./heatStress')

const FORECAST_VERSION = 'baseline-72h-mean-v2'  // v2: คำแนะนำใช้ช่วงร้อน/เย็นจริงของโรงเรือน (บันทึกเก่าที่เป็น v1 จะไม่ถูกแสดง)
const LOOKBACK_HOURS = 72
const MIN_HOURS = 24

const HORIZONS = [
    { offset: 1, label: 'พรุ่งนี้ (+24 ชม.)', day_name: 'Day +1' },
    { offset: 2, label: 'มะรืนนี้ (+48 ชม.)', day_name: 'Day +2' },
    { offset: 3, label: '3 วันข้างหน้า (+72 ชม.)', day_name: 'Day +3' }
]

const BADGE_CLASS = {
    normal: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    mild: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    moderate: 'bg-amber-50 text-amber-800 border-amber-200',
    severe: 'bg-rose-50 text-rose-800 border-rose-200'
}

const pad = (h) => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`

/**
 * ช่วงร้อนที่สุด (4 ชม.) และช่วงเย็นที่สุดสำหรับให้อาหาร (3 ชม. ภายใน 04:00–20:00) ของโรงเรือนนี้ จาก THI เฉลี่ยรายชั่วโมงของวันในช่วง lookback
 * ใช้แทนเวลาตายตัว (เดิม "11:00–15:00") เพราะโรงเรือนแต่ละแบบร้อนสุดคนละเวลา เช่น หลังคาสังกะสีมักร้อนสุดตอนเย็น
 */
const findWindows = (hourly) => {
    const byHour = new Map()
    for (const h of hourly) {
        const thi = Number(h.avg_thi)
        if (!Number.isFinite(thi) || !h.hour_bucket) continue
        // hour_bucket เป็นเวลาไทยแบบไม่มี timezone: getHours() คืนชั่วโมงเดิมเสมอ
        const hr = new Date(h.hour_bucket).getHours()
        const v = byHour.get(hr) || { s: 0, n: 0 }
        v.s += thi; v.n++
        byHour.set(hr, v)
    }
    if (byHour.size < 18) return null  // ข้อมูลไม่ครอบคลุมทั้งวัน
    const avg = (hr) => { const v = byHour.get(((hr % 24) + 24) % 24); return v ? v.s / v.n : null }
    const scan = (len, better, firstStart = 0, lastStart = 23) => {
        let best = null
        for (let start = firstStart; start <= lastStart; start++) {
            const vals = Array.from({ length: len }, (_, i) => avg(start + i))
            if (vals.some(v => v == null)) continue
            const m = vals.reduce((a, b) => a + b, 0) / len
            if (!best || better(m, best.mean)) best = { start, end: start + len, mean: m }
        }
        return best && { start_hour: best.start % 24, end_hour: best.end % 24, label: `${pad(best.start)}–${pad(best.end)} น.`, mean_thi: Math.round(best.mean * 10) / 10 }
    }
    // ช่วงเย็นสำหรับให้อาหาร: เฉพาะเวลาที่เกษตรกรทำงานได้จริง (เริ่ม 04:00 ถึงจบไม่เกิน 20:00)
    return { peak: scan(4, (a, b) => a > b), cool: scan(3, (a, b) => a < b, 4, 17) }
}

// คำแนะนำภาษาชาวบ้านตามระดับความเสี่ยง ใช้ช่วงเวลาจริงของโรงเรือน และกฎความชื้นจาก heatStress
const getRiskAdvisory = (riskLevel, avgHum = null, windows = null) => {
    const cooling = getCoolingAdvice(avgHum)
    const peak = windows?.peak ? ` โดยเฉพาะช่วง ${windows.peak.label} (ช่วงที่โรงเรือนนี้ร้อนที่สุด)` : ''
    const feed = windows?.cool ? ` ให้อาหารช่วงที่เย็นที่สุด ${windows.cool.label}` : ' ให้อาหารช่วงที่อากาศเย็น'
    if (riskLevel === 'severe') {
        return `🚨 วิกฤต: เปิดพัดลมเต็มกำลัง${peak} ${cooling.short}${feed} และเสริมเกลือแร่ในน้ำ`
    }
    if (riskLevel === 'moderate') {
        return `⚠️ เครียดจากความร้อน: เปิดพัดลมระบายอากาศ${peak} ${cooling.short} จัดน้ำสะอาดให้กินตลอดเวลา`
    }
    if (riskLevel === 'mild') {
        return `เฝ้าระวัง: อากาศเริ่มอบอ้าว เปิดพัดลมระบายอากาศ${peak}`
    }
    return 'สภาวะอากาศปกติ'
}

const getBadgeClass = (riskLevel) => BADGE_CLASS[riskLevel] || BADGE_CLASS.normal

/**
 * THI (NRC) เฉลี่ยรายชั่วโมงของฟาร์ม ในช่วง LOOKBACK_HOURS ก่อน endTime
 */
const fetchHourlyThi = async (farmId, endTime = new Date(), hours = LOOKBACK_HOURS) => {
    const start = new Date(endTime.getTime() - hours * 3600 * 1000)
    const { rows } = await db.query(`
        SELECT
            date_trunc('hour', sr.recorded_at AT TIME ZONE 'Asia/Bangkok') AS hour_bucket,
            AVG(${thiSql('sr')})::float AS avg_thi,
            AVG(sr.humidity_pct)::float AS avg_hum
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
          AND sr.recorded_at > $2
          AND sr.recorded_at <= $3
          AND sr.temperature_c IS NOT NULL
          AND sr.humidity_pct IS NOT NULL
        GROUP BY 1
        ORDER BY 1 ASC
    `, [farmId, start.toISOString(), endTime.toISOString()])
    return rows
}

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length

/**
 * สร้างผลพยากรณ์จากข้อมูลรายชั่วโมง (pure function ทดสอบได้โดยไม่ต้องมี DB)
 */
const buildBaselineForecast = ({ farm, hourly, now = new Date() }) => {
    const profile = getFarmProfile(farm)
    const thiValues = hourly.map(h => Number(h.avg_thi)).filter(Number.isFinite)
    const base = {
        model_name: 'Baseline: ค่าเฉลี่ย THI 72 ชม.ล่าสุด',
        version: FORECAST_VERSION,
        engine: 'baseline_72h_mean',
        method_th: 'ใช้ค่าเฉลี่ยดัชนี THI ของ 72 ชั่วโมงที่ผ่านมาเป็นแนวโน้มความร้อนสะสม (ยังไม่ใช้พยากรณ์อากาศ)',
        evaluation_note: 'ยังไม่มีผลทดสอบกับข้อมูลภาคสนาม',
        hf_profile: profile,
        thresholds: getThresholds(profile),
        lookback_hours: LOOKBACK_HOURS,
        hours_available: thiValues.length
    }

    if (thiValues.length < MIN_HOURS) {
        return {
            ...base,
            insufficient_data: true,
            reason: `มีข้อมูล ${thiValues.length} ชั่วโมง ต้องการอย่างน้อย ${MIN_HOURS} ชั่วโมงในรอบ 72 ชั่วโมง`,
            peak_predicted_thi: null,
            forecasts: []
        }
    }

    const predictedThi = parseFloat(mean(thiValues).toFixed(1))
    const recentHums = hourly.slice(-24).map(h => Number(h.avg_hum)).filter(Number.isFinite)
    const avgRecentHum = recentHums.length ? mean(recentHums) : null
    const riskLevel = getRiskLevel(predictedThi, profile)
    const windows = findWindows(hourly)

    const forecasts = HORIZONS.map(h => {
        const targetTime = new Date(now.getTime() + h.offset * 24 * 3600 * 1000)
        return {
            horizon_days: h.offset,
            label: h.label,
            day_name: h.day_name,
            date: targetTime.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric', month: 'short' }),
            predicted_thi: predictedThi,
            risk_level: riskLevel,
            advisory: getRiskAdvisory(riskLevel, avgRecentHum, windows),
            badge_class: getBadgeClass(riskLevel)
        }
    })

    return {
        ...base,
        insufficient_data: false,
        peak_predicted_thi: predictedThi,
        // ช่วงร้อนสุด/เย็นสุดของโรงเรือนนี้ (3 วันล่าสุด) ใช้ในคำแนะนำ
        peak_window: windows?.peak || null,
        cool_window: windows?.cool || null,
        forecasts
    }
}

const generateBaselineForecast = async (farm, endTime = new Date()) => {
    const hourly = await fetchHourlyThi(farm.id_farms, endTime)
    return buildBaselineForecast({ farm, hourly, now: endTime })
}

// ผลพยากรณ์ที่บันทึกไว้ใน DB จากเวอร์ชันเก่า (LSTM / heuristic ที่มีตัวเลขความแม่นยำปลอม) ห้ามนำมาแสดง
const isCurrentForecast = (forecast) => Boolean(forecast && forecast.version === FORECAST_VERSION)

module.exports = {
    FORECAST_VERSION,
    LOOKBACK_HOURS,
    MIN_HOURS,
    getRiskAdvisory,
    getBadgeClass,
    fetchHourlyThi,
    buildBaselineForecast,
    generateBaselineForecast,
    isCurrentForecast
}
