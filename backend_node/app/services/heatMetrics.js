/**
 * ตัวชี้วัดความร้อนชุดเดียวของทั้งระบบ (หน้าฟาร์ม, หน้าเกษตรกร, สรุปรายวัน 20:00, สมุดสหกรณ์)
 * ทุกหน้าต้องใช้ไฟล์นี้ ตัวเลขจะได้ตรงกัน (เดิมคำนวณ "ชั่วโมงเครียด" 4 วิธีต่างกัน)
 *
 * วิธีคำนวณ
 * - เฉลี่ยค่าเซ็นเซอร์ทุก 5 นาที แล้วนับช่วง 5 นาทีที่ THI เฉลี่ยถึงเกณฑ์ ไม่เดาค่าในช่วงที่ไม่มีข้อมูล
 *   (ไม่ขึ้นกับความถี่การส่งของกล่อง และช่วงที่กล่องหลุดจะไม่ถูกนับว่า "เครียด" หรือ "สบาย")
 * - ความครบถ้วน = ชั่วโมงที่มีข้อมูล / ชั่วโมงในช่วงที่สรุป
 * - ระดับรายวัน = จาก THI เฉลี่ยทั้งวัน เพราะเกณฑ์ในงานวิจัยกำหนดจาก THI เฉลี่ยรายวัน (ดู heatStress.METHOD)
 * - กลางคืน 22:00–06:00 เวลาไทย: ชั่วโมงที่ THI ต่ำกว่าเกณฑ์เฝ้าระวัง = โคได้พักจากความร้อน
 * - เครียดติดต่อกัน = จำนวนวันล่าสุดที่ THI เฉลี่ยรายวันถึงระดับเครียด (เฉพาะวันที่มีข้อมูลอย่างน้อย 12 ชม.)
 */
const db = require('../config/db')
const { thiSql, getRiskLevel, getThresholds } = require('./heatStress')

const BUCKET_MIN = 5
const BUCKET_H = BUCKET_MIN / 60
const NIGHT_START_H = 22
const NIGHT_END_H = 6
const STREAK_MIN_DATA_H = 12
const TODAY_MIN_DATA_H = 6

const round1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10)
const bkkDate = (d) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10)
const bkkHour = (d) => new Date(d.getTime() + 7 * 3600e3).getUTCHours()
const isNight = (h) => h >= NIGHT_START_H || h < NIGHT_END_H

// ค่าเฉลี่ยทุก 5 นาทีในช่วง [from, to)
const loadBuckets = async (farmId, from, to) => {
    const { rows } = await db.query(`
        SELECT to_timestamp(floor(extract(epoch FROM sr.recorded_at) / ${BUCKET_MIN * 60}) * ${BUCKET_MIN * 60}) AS t,
               AVG(sr.temperature_c) AS temp, AVG(sr.humidity_pct) AS hum, AVG(${thiSql('sr')}) AS thi,
               COUNT(*)::int AS n, MAX(d.serial_no) AS serial_no
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
          AND sr.temperature_c IS NOT NULL AND sr.humidity_pct IS NOT NULL
          AND sr.recorded_at >= $2 AND sr.recorded_at < $3
        GROUP BY 1 ORDER BY 1
    `, [farmId, from.toISOString(), to.toISOString()])
    return rows.map(r => ({ t: new Date(r.t), temp: Number(r.temp), hum: Number(r.hum), thi: Number(r.thi), n: r.n, serial_no: r.serial_no }))
}

/**
 * สรุปชุดค่าเฉลี่ย 5 นาที windowHours = ความยาวช่วงที่สรุป (ใช้คิดความครบถ้วน)
 */
const summarizeBuckets = (buckets, profile, windowHours) => {
    const t = getThresholds(profile)
    if (!buckets.length) {
        return { data_hours: 0, window_hours: round1(windowHours), coverage_pct: 0, has_data: false }
    }
    let thiSum = 0, tempSum = 0, humSum = 0
    let watch = 0, stress = 0, severe = 0
    let nightData = 0, nightRelief = 0, nightThiSum = 0
    let maxThi = -Infinity, minThi = Infinity, maxTemp = -Infinity, minTemp = Infinity, maxHum = -Infinity, minHum = Infinity
    const hourThi = new Map()
    for (const b of buckets) {
        thiSum += b.thi; tempSum += b.temp; humSum += b.hum
        if (b.thi >= t.mild) watch++
        if (b.thi >= t.moderate) stress++
        if (b.thi >= t.severe) severe++
        maxThi = Math.max(maxThi, b.thi); minThi = Math.min(minThi, b.thi)
        maxTemp = Math.max(maxTemp, b.temp); minTemp = Math.min(minTemp, b.temp)
        maxHum = Math.max(maxHum, b.hum); minHum = Math.min(minHum, b.hum)
        const h = bkkHour(b.t)
        if (isNight(h)) {
            nightData++
            nightThiSum += b.thi
            if (b.thi < t.mild) nightRelief++
        }
        const hv = hourThi.get(h) || { s: 0, n: 0 }
        hv.s += b.thi; hv.n++
        hourThi.set(h, hv)
    }
    const n = buckets.length
    const avgThi = thiSum / n
    let peakHour = null, peak = -Infinity
    for (const [h, v] of hourThi) if (v.s / v.n > peak) { peak = v.s / v.n; peakHour = h }
    const dataHours = n * BUCKET_H
    return {
        has_data: true,
        data_hours: round1(dataHours),
        window_hours: round1(windowHours),
        coverage_pct: Math.min(100, Math.round((dataHours / windowHours) * 100)),
        avg_thi: round1(avgThi),
        // ระดับจาก THI เฉลี่ย: เทียบกับวิธีของงานวิจัย (เฉลี่ยรายวัน)
        daily_mean_level: getRiskLevel(avgThi, profile),
        max_thi: round1(maxThi),
        min_thi: round1(minThi),
        avg_temp: round1(tempSum / n),
        max_temp: round1(maxTemp),
        min_temp: round1(minTemp),
        avg_hum: round1(humSum / n),
        max_hum: round1(maxHum),
        min_hum: round1(minHum),
        watch_hours: round1(watch * BUCKET_H),
        stress_hours: round1(stress * BUCKET_H),
        severe_hours: round1(severe * BUCKET_H),
        // สัดส่วนจากช่วงที่มีข้อมูล (ไม่ใช่จาก 24 ชม.)
        stress_pct_of_data: Math.round((stress / n) * 100),
        night_data_hours: round1(nightData * BUCKET_H),
        night_relief_hours: round1(nightRelief * BUCKET_H),
        night_mean_thi: nightData ? round1(nightThiSum / nightData) : null,
        peak_hour: peakHour
    }
}

// 24 ชม. ย้อนจากค่าล่าสุดของฟาร์ม (อุปกรณ์ออฟไลน์ก็ยังเห็นวันสุดท้ายที่มีข้อมูล)
const rolling24h = async (farmId, profile) => {
    const { rows: [last] } = await db.query(`
        SELECT MAX(sr.recorded_at) AS t
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
    `, [farmId])
    if (!last?.t) return { buckets: [], summary: summarizeBuckets([], profile, 24), window_start: null, window_end: null }
    const end = new Date(new Date(last.t).getTime() + 1000)
    const start = new Date(end.getTime() - 24 * 3600e3)
    const buckets = await loadBuckets(farmId, start, end)
    return { buckets, summary: summarizeBuckets(buckets, profile, 24), window_start: start, window_end: end }
}

// เที่ยงคืนเวลาไทยของวันที่ (YYYY-MM-DD)
const bkkMidnight = (dateStr) => new Date(`${dateStr}T00:00:00+07:00`)

// สรุปรายวัน N วันล่าสุด (วันตามเวลาไทย) วันนี้นับถึงตอนนี้
const dailySeries = async (farmId, profile, days) => {
    const todayKey = bkkDate(new Date())
    const firstKey = bkkDate(new Date(Date.now() - (days - 1) * 86400e3))
    const buckets = await loadBuckets(farmId, bkkMidnight(firstKey), new Date(Date.now() + 60e3))
    const byDay = new Map()
    for (const b of buckets) {
        const k = bkkDate(b.t)
        if (!byDay.has(k)) byDay.set(k, [])
        byDay.get(k).push(b)
    }
    const out = []
    for (let i = days - 1; i >= 0; i--) {
        const key = bkkDate(new Date(Date.now() - i * 86400e3))
        const isToday = key === todayKey
        const windowHours = isToday ? Math.max(BUCKET_H, (Date.now() - bkkMidnight(key).getTime()) / 3600e3) : 24
        out.push({ date: key, is_today: isToday, ...summarizeBuckets(byDay.get(key) || [], profile, windowHours) })
    }
    return out
}

// สรุปวันเดียว (ใช้กับสรุปรายวัน 20:00)
const daySummary = async (farmId, profile, dateStr) => {
    const start = bkkMidnight(dateStr)
    const end = new Date(start.getTime() + 24 * 3600e3)
    const buckets = await loadBuckets(farmId, start, end)
    const windowHours = Math.max(BUCKET_H, (Math.min(end.getTime(), Date.now()) - start.getTime()) / 3600e3)
    return summarizeBuckets(buckets, profile, windowHours)
}

/**
 * จำนวนวันล่าสุดที่ THI เฉลี่ยรายวันถึงระดับเครียดติดต่อกัน
 * เริ่มนับจากวันนี้ถ้ามีข้อมูลพอ (>= 6 ชม.) ไม่งั้นเริ่มจากเมื่อวาน วันที่ข้อมูลไม่ถึง 12 ชม. ถือว่าตัดสินไม่ได้ (หยุดนับ)
 */
const stressStreak = (days, profile) => {
    const t = getThresholds(profile)
    let count = 0
    let includesToday = false
    for (let i = days.length - 1; i >= 0; i--) {
        const d = days[i]
        const enough = d.is_today ? d.data_hours >= TODAY_MIN_DATA_H : d.data_hours >= STREAK_MIN_DATA_H
        if (d.is_today && !enough) continue
        if (!enough || d.avg_thi == null || d.avg_thi < t.moderate) break
        count++
        if (d.is_today) includesToday = true
    }
    return { days: count, includes_today: includesToday, basis: `THI เฉลี่ยรายวัน ≥ ${t.moderate}` }
}

module.exports = {
    BUCKET_MIN, NIGHT_START_H, NIGHT_END_H,
    loadBuckets, summarizeBuckets, rolling24h, dailySeries, daySummary, stressStreak, bkkDate, bkkHour, round1
}
