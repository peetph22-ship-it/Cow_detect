/**
 * CowCare AI - พยากรณ์ THI 3 วันข้างหน้า
 *
 * วิธีหลัก (hybrid): พยากรณ์อากาศ ECMWF จาก Open-Meteo ที่พิกัดฟาร์ม แล้วลบ "ค่าเพี้ยน" ที่เรียนจากเซ็นเซอร์ของฟาร์มเอง
 *   ค่าเพี้ยน (แยกตามระยะ +1/+2/+3 วัน) = เฉลี่ยของ (พยากรณ์ที่เคยออกล่วงหน้า k วัน - THI เฉลี่ยจริงของฟาร์ม)
 *   จากวันที่จบแล้วไม่เกิน 14 วันล่าสุด (วันที่มีข้อมูล >= 20 ชม.) ต้องมีอย่างน้อย 3 วัน
 *   ค่าเพี้ยนนี้รวมทั้งความคลาดของแบบจำลอง และความต่างระหว่างโรงเรือนกับข้างนอกไว้ในตัวเดียว
 * ข้อมูลฟาร์มยังไม่ถึง 3 วัน: ใช้ค่าเพี้ยนเฉลี่ยของพื้นที่เชียงใหม่ (REGIONAL_BIAS) แทน และบอกว่ายังไม่ได้ปรับตามโรงเรือน
 * ไม่มีพิกัด / Open-Meteo ล่ม / ขอพยากรณ์ย้อนหลัง: กลับไปใช้ค่าเฉลี่ย THI 72 ชม. เดิม (baseline)
 *
 * ผลวัด (EVALUATION) จาก backend/ml_lstm/forecast_eval/: ทดสอบย้อนหลังกับสถานีอุตุฯ สนามบินเชียงใหม่ (กลางแจ้ง)
 * ยังไม่ใช่ความแม่นในโรงเรือนจริง ต้องวัดซ้ำหลังติดตั้ง LSTM/GRU แพ้วิธีนี้ในการทดสอบเดียวกัน จึงไม่ได้ใช้
 */

const db = require('../config/db')
const axios = require('axios')
const { getRiskLevel, getFarmProfile, getThresholds, thiSql, getCoolingAdvice, calcThi } = require('./heatStress')
const { resolveLocation } = require('./outdoorWeather')
const { dailySeries, bkkDate } = require('./heatMetrics')

// เปลี่ยนเมื่อวิธีพยากรณ์เปลี่ยน: บันทึกเก่าใน tb_farm_daily_summaries ที่เป็นเวอร์ชันอื่นจะไม่ถูกแสดง
const FORECAST_VERSION = 'hybrid-ecmwf-bias-v1'
const LOOKBACK_HOURS = 72
const MIN_HOURS = 24

// ---- hybrid ----
const OM_MODEL = 'ecmwf_ifs025'        // ดีที่สุดหลังปรับค่าเพี้ยนในการทดสอบ (best_match ใช้สำรองเมื่อ ECMWF ไม่มีค่า)
const OM_FALLBACK_MODEL = 'best_match'
const BIAS_WINDOW_DAYS = 14
const MIN_BIAS_DAYS = 3
const MIN_DAY_HOURS = 20               // วันที่ใช้เรียนค่าเพี้ยนต้องมีข้อมูลเซ็นเซอร์อย่างน้อย 20 ชม.
const OM_CACHE_MS = 60 * 60 * 1000
const OM_TIMEOUT_MS = 5000
// ค่าเพี้ยนเฉลี่ยของ ECMWF เทียบสถานีสนามบินเชียงใหม่ ช่วงเทรน 2024 (ECMWF เย็นเกินจริง) ใช้เมื่อฟาร์มยังมีข้อมูลไม่ถึง 3 วัน
const REGIONAL_BIAS = { 1: -1.41, 2: -1.37, 3: -1.32 }
const EVALUATION = {
    truth: 'สถานีอุตุนิยมวิทยาสนามบินเชียงใหม่ (WMO 48327) กลางแจ้ง ไม่ใช่โรงเรือน',
    test_period: '2024-12-19..2025-12-18',
    test_days: 354,
    metric: 'MAE ของ THI เฉลี่ยรายวัน',
    mae: { 1: 0.69, 2: 0.78, 3: 0.88 },
    mae_with_3_farm_days: { 1: 0.80, 2: 0.92, 3: 1.07 },
    mae_regional_bias_only: { 1: 0.77, 2: 0.83, 3: 0.90 },
    mae_previous_baseline_72h: { 1: 1.10, 2: 1.38, 3: 1.56 },
    level_match_pct: { 1: 94, 2: 93, 3: 92 }
}

const fmt3 = (o) => [1, 2, 3].map(k => Number(o[k]).toFixed(2)).join('/')

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
    const peak = windows?.peak ? ` โดยเฉพาะช่วง ${windows.peak.label} (ช่วงที่ร้อนที่สุดของวัน)` : ''
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
        model_name: 'สำรอง: ค่าเฉลี่ย THI 72 ชม.ล่าสุด',
        version: FORECAST_VERSION,
        engine: 'baseline_72h_mean',
        method_th: 'ใช้ค่าเฉลี่ยดัชนี THI ของ 72 ชั่วโมงที่ผ่านมาเป็นแนวโน้มความร้อนสะสม (ยังไม่ใช้พยากรณ์อากาศ)',
        evaluation_note: `วิธีสำรอง ทดสอบกับสถานีสนามบินเชียงใหม่คลาดเฉลี่ย ${fmt3(EVALUATION.mae_previous_baseline_72h)} THI (+1/+2/+3 วัน)`,
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

const omCache = new Map() // "model_lat_lon" -> { data, at }

/**
 * Open-Meteo Previous Runs API: ค่าพยากรณ์รายชั่วโมงของรอบล่าสุด (ใช้ทายวันข้างหน้า)
 * และค่าที่เคยพยากรณ์ไว้ล่วงหน้า 1/2/3 วันของ 15 วันย้อนหลัง (ใช้เรียนค่าเพี้ยน) ในคำขอเดียว เวลาไทย
 */
const fetchPreviousRuns = async (lat, lon, model = OM_MODEL) => {
    const key = `${model}_${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}`
    const hit = omCache.get(key)
    if (hit && Date.now() - hit.at < OM_CACHE_MS) return hit.data
    const vars = ['temperature_2m', 'relative_humidity_2m']
    const hourly = [...vars, ...[1, 2, 3].flatMap(k => vars.map(v => `${v}_previous_day${k}`))].join(',')
    const url = 'https://previous-runs-api.open-meteo.com/v1/forecast'
        + `?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&hourly=${hourly}`
        + `&models=${model}&past_days=15&forecast_days=4&timezone=Asia%2FBangkok`
    const { data } = await axios.get(url, { timeout: OM_TIMEOUT_MS })
    if (!data?.hourly?.time?.length) throw new Error('Open-Meteo previous-runs: empty response')
    omCache.set(key, { data, at: Date.now() })
    return data
}

// THI รายชั่วโมงของชุดตัวแปร (suffix '' = รอบล่าสุด, '_previous_dayK' = ที่เคยพยากรณ์ล่วงหน้า K วัน)
const hourlyThi = (om, suffix) => {
    const h = om.hourly, T = h[`temperature_2m${suffix}`] || [], R = h[`relative_humidity_2m${suffix}`] || []
    return h.time.map((t, i) => ({ t, thi: calcThi(T[i], R[i]), hum: R[i] })).filter(x => x.thi != null)
}

// ค่าเฉลี่ยรายวัน (วันเวลาไทย) เฉพาะวันที่มีครบ 24 ชม.
const dailyMeans = (rows) => {
    const by = new Map()
    for (const r of rows) {
        const d = r.t.slice(0, 10)
        if (!by.has(d)) by.set(d, [])
        by.get(d).push(r)
    }
    const out = new Map()
    for (const [d, v] of by) if (v.length === 24) out.set(d, { thi: mean(v.map(x => x.thi)), hum: mean(v.map(x => x.hum)) })
    return out
}

const addDays = (dateStr, n) => new Date(Date.parse(`${dateStr}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)
const r1 = (v) => Math.round(v * 10) / 10

/**
 * สร้างผลพยากรณ์แบบ hybrid (pure function ทดสอบได้โดยไม่ต้องมี DB/เน็ต)
 * om = ผลจาก fetchPreviousRuns, farmDays = dailySeries ของฟาร์ม (วันเวลาไทย)
 * คืน null ถ้าพยากรณ์ของวันข้างหน้าไม่ครบ (ให้ผู้เรียกใช้ baseline แทน)
 */
const buildHybridForecast = ({ farm, om, farmDays = [], location, model = OM_MODEL, now = new Date() }) => {
    const profile = getFarmProfile(farm)
    const today = bkkDate(now)
    const latest = hourlyThi(om, '')
    const latestDaily = dailyMeans(latest)
    const targets = HORIZONS.map(h => addDays(today, h.offset))
    if (!targets.every(d => latestDaily.has(d))) return null

    // วันจริงของฟาร์มที่จบแล้ว (ก่อนวันนี้) และมีข้อมูลพอ
    const obs = new Map(farmDays
        .filter(d => d.date < today && d.has_data !== false && d.avg_thi != null && d.data_hours >= MIN_DAY_HOURS)
        .map(d => [d.date, d.avg_thi]))

    const bias = {}
    for (const h of HORIZONS) {
        const past = dailyMeans(hourlyThi(om, `_previous_day${h.offset}`))
        const errs = []
        for (let j = 1; j <= BIAS_WINDOW_DAYS; j++) {
            const d = addDays(today, -j)
            if (obs.has(d) && past.has(d)) errs.push(past.get(d).thi - obs.get(d))
        }
        bias[h.offset] = errs.length >= MIN_BIAS_DAYS
            ? { value: r1(mean(errs)), days: errs.length, source: 'farm' }
            : { value: REGIONAL_BIAS[h.offset], days: errs.length, source: 'regional' }
    }
    const adjusted = HORIZONS.every(h => bias[h.offset].source === 'farm')
    const daysUsed = Math.min(...HORIZONS.map(h => bias[h.offset].days))

    // รายชั่วโมงที่ปรับแล้วของ 3 วันข้างหน้า: ใช้หาช่วงร้อน/เย็น
    const horizonOf = new Map(targets.map((d, i) => [d, HORIZONS[i].offset]))
    const correctedHourly = latest
        .filter(x => horizonOf.has(x.t.slice(0, 10)))
        .map(x => ({ hour_bucket: `${x.t}:00`.slice(0, 19), avg_thi: x.thi - bias[horizonOf.get(x.t.slice(0, 10))].value, avg_hum: x.hum }))
    const windows = findWindows(correctedHourly)

    const forecasts = HORIZONS.map((h, i) => {
        const day = latestDaily.get(targets[i])
        const predicted = r1(day.thi - bias[h.offset].value)
        const risk = getRiskLevel(predicted, profile)
        return {
            horizon_days: h.offset,
            label: h.label,
            day_name: h.day_name,
            date: new Date(`${targets[i]}T12:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric', month: 'short' }),
            target_date: targets[i],
            predicted_thi: predicted,
            raw_forecast_thi: r1(day.thi),
            risk_level: risk,
            advisory: getRiskAdvisory(risk, day.hum, windows),
            badge_class: getBadgeClass(risk)
        }
    })

    const ev = EVALUATION
    const method_th = adjusted
        ? `พยากรณ์อากาศ ECMWF (Open-Meteo) ที่พิกัดฟาร์ม ปรับด้วยค่าเพี้ยนที่เรียนจากเซ็นเซอร์ของฟาร์มเอง ${daysUsed} วันล่าสุด (รวมความต่างระหว่างโรงเรือนกับข้างนอก)`
        : `พยากรณ์อากาศ ECMWF (Open-Meteo) ที่พิกัดฟาร์ม ปรับด้วยค่าเพี้ยนเฉลี่ยของพื้นที่เชียงใหม่ ยังไม่ได้ปรับตามโรงเรือน (ต้องมีข้อมูลเซ็นเซอร์ครบอย่างน้อย ${MIN_BIAS_DAYS} วัน ตอนนี้ ${daysUsed} วัน)`
    return {
        model_name: adjusted ? 'พยากรณ์อากาศ + ปรับตามโรงเรือน' : 'พยากรณ์อากาศ + ปรับตามพื้นที่',
        version: FORECAST_VERSION,
        engine: adjusted ? 'openmeteo_ecmwf_farm_bias' : 'openmeteo_ecmwf_regional_bias',
        model_source: `Open-Meteo ${model}`,
        method_th,
        evaluation_note: `ทดสอบย้อนหลัง ${ev.test_days} วัน (${ev.test_period}) เทียบ${ev.truth}: คลาดเฉลี่ย ${fmt3(ev.mae)} THI สำหรับ +1/+2/+3 วัน (วิธีเดิมค่าเฉลี่ย 72 ชม. ${fmt3(ev.mae_previous_baseline_72h)}) ความแม่นในโรงเรือนจริงยังต้องวัดหลังติดตั้ง`,
        evaluation: ev,
        adjusted,
        bias_days_used: daysUsed,
        bias_by_horizon: Object.fromEntries(HORIZONS.map(h => [h.offset, bias[h.offset]])),
        location: location ? { source: location.source, approximate: location.approximate, label: location.label } : null,
        hf_profile: profile,
        thresholds: getThresholds(profile),
        insufficient_data: false,
        peak_predicted_thi: Math.max(...forecasts.map(f => f.predicted_thi)),
        // ช่วงร้อนสุด/เย็นสุดจากพยากรณ์รายชั่วโมงที่ปรับแล้วของ 3 วันข้างหน้า
        peak_window: windows?.peak || null,
        cool_window: windows?.cool || null,
        forecasts
    }
}

// ใช้ baseline เดิม พร้อมบอกเหตุผลที่ใช้วิธีสำรอง
const baselineWithReason = async (farm, endTime, reason) => {
    const hourly = await fetchHourlyThi(farm.id_farms, endTime)
    const res = buildBaselineForecast({ farm, hourly, now: endTime })
    return { ...res, fallback_reason: reason }
}

/**
 * พยากรณ์ 3 วันของฟาร์ม (ชื่อเดิมคงไว้ เพราะหลายจุดเรียกใช้)
 * endTime ห่างจากตอนนี้เกิน 2 ชม. (คำนวณย้อนหลัง) = ใช้ baseline เพราะพยากรณ์อากาศใช้ได้แค่ปัจจุบัน
 */
const generateBaselineForecast = async (farm, endTime = new Date()) => {
    if (Math.abs(Date.now() - endTime.getTime()) > 2 * 3600e3) {
        return baselineWithReason(farm, endTime, 'คำนวณย้อนหลัง ใช้ค่าเฉลี่ย 72 ชม.')
    }
    const location = resolveLocation(farm)
    if (!location) return baselineWithReason(farm, endTime, 'ยังไม่มีพิกัดฟาร์ม ใช้ค่าเฉลี่ย 72 ชม.')
    let om = null, model = OM_MODEL
    try {
        om = await fetchPreviousRuns(location.latitude, location.longitude, OM_MODEL)
        if (!dailyMeans(hourlyThi(om, '')).size) {
            model = OM_FALLBACK_MODEL
            om = await fetchPreviousRuns(location.latitude, location.longitude, OM_FALLBACK_MODEL)
        }
    } catch (err) {
        console.warn('[Forecast] Open-Meteo unavailable, using baseline:', err.message)
        return baselineWithReason(farm, endTime, 'เชื่อมต่อพยากรณ์อากาศไม่ได้ ใช้ค่าเฉลี่ย 72 ชม.')
    }
    const farmDays = await dailySeries(farm.id_farms, getFarmProfile(farm), BIAS_WINDOW_DAYS + 1).catch(() => [])
    const hybrid = buildHybridForecast({ farm, om, farmDays, location, model, now: endTime })
    return hybrid || baselineWithReason(farm, endTime, 'พยากรณ์อากาศของวันข้างหน้าไม่ครบ ใช้ค่าเฉลี่ย 72 ชม.')
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
    buildHybridForecast,
    fetchPreviousRuns,
    generateBaselineForecast,
    EVALUATION,
    REGIONAL_BIAS,
    isCurrentForecast
}
