/**
 * CowCare AI - บริการรวมกลุ่มเหตุการณ์ความร้อนและสัญญาณขาดหาย (ใช้ร่วมกันทั้งหน้าเกษตรกรและหน้าแอดมิน)
 *
 * กฎการจัดกลุ่มเหตุการณ์:
 * - เฉลี่ยค่าเซ็นเซอร์เป็นถังละ 5 นาที (BUCKET_MIN)
 * - เหตุการณ์ความร้อน (type = 'heat'): ถังที่มี THI >= เกณฑ์ระดับอากาศร้อน (moderate) ต่อเนื่องอย่างน้อย 30 นาที
 *   แยกตามวันเวลาไทย และตัดจบเมื่อสัญญาณขาดหายเกิน 15 นาที
 * - เหตุการณ์สัญญาณขาดหาย (type = 'sensor_offline'): ช่วงที่ไม่มีข้อมูลเกิน 15 นาที
 */
const db = require('../config/db')
const { BUCKET_MIN, loadBuckets: loadBucketRange, bkkDate, round1 } = require('./heatMetrics')
const { getRiskLevel, getFarmProfile, getThresholds } = require('./heatStress')

// เงียบเกินเท่านี้ = ขาดการติดต่อ (เกณฑ์เดียวกับการตัดเหตุการณ์ด้านล่าง)
const OFFLINE_MIN = 15

/**
 * สร้างรายการเหตุการณ์จากถังข้อมูล 5 นาที เรียงจากใหม่ไปเก่า
 * @param opts.lastDataAt เวลาข้อมูลล่าสุดของฟาร์ม ใช้เมื่อไม่มีข้อมูลเลยในช่วงที่โหลด
 *   (กล่องเงียบนานกว่าช่วงที่ดู) จะได้เหตุการณ์ "ขาดการติดต่อ" ที่ยังไม่จบ แทนที่จะไม่มีอะไรเลย
 */
const buildHeatEvents = (buckets, thresholds, profile = 'default', opts = {}) => {
    const t = thresholds || getThresholds(profile)
    const STEP = BUCKET_MIN * 60000
    const GAP_MS = OFFLINE_MIN * 60000
    const MIN_HEAT_MIN = 30
    const rank = { moderate: 2, severe: 3 }
    const events = []
    let cur = null
    const closeHeat = () => {
        if (cur && (cur.end - cur.start + STEP) / 60000 >= MIN_HEAT_MIN) events.push(cur)
        cur = null
    }
    for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]
        const prev = buckets[i - 1]
        if (prev && b.t - prev.t > GAP_MS) {
            closeHeat()
            events.push({ type: 'sensor_offline', start: new Date(prev.t.getTime() + STEP), end: b.t })
        }
        if (cur && bkkDate(b.t) !== bkkDate(cur.start)) closeHeat()
        const lvl = b.thi >= t.moderate ? getRiskLevel(b.thi, profile) : null
        if (!lvl) { closeHeat(); continue }
        if (!cur) cur = { type: 'heat', level: lvl, start: b.t, end: b.t, peak_thi: b.thi, peak_temp: b.temp }
        cur.end = b.t
        if (rank[lvl] > rank[cur.level]) cur.level = lvl
        if (b.thi > cur.peak_thi) { cur.peak_thi = b.thi; cur.peak_temp = b.temp }
    }
    const last = buckets[buckets.length - 1]
    const lastIsRecent = last && Date.now() - last.t.getTime() < GAP_MS
    if (cur) { cur.ongoing = Boolean(lastIsRecent); closeHeat() }
    if (last && !lastIsRecent) events.push({ type: 'sensor_offline', start: new Date(last.t.getTime() + STEP), end: null, ongoing: true })
    if (!last && opts.lastDataAt) {
        const lastAt = new Date(opts.lastDataAt)
        if (Date.now() - lastAt.getTime() >= GAP_MS) events.push({ type: 'sensor_offline', start: lastAt, end: null, ongoing: true })
    }

    return events
        .map(e => ({
            type: e.type,
            level: e.level || null,
            start: e.start,
            end: e.ongoing ? null : new Date(e.end.getTime() + (e.type === 'heat' ? STEP : 0)),
            ongoing: Boolean(e.ongoing),
            duration_min: Math.round(((e.ongoing ? Date.now() : e.end.getTime() + (e.type === 'heat' ? STEP : 0)) - e.start.getTime()) / 60000),
            peak_thi: round1(e.peak_thi ?? null),
            peak_temp: round1(e.peak_temp ?? null)
        }))
        .sort((a, b) => b.start - a.start)
}

/**
 * โหลดถัง 5 นาทีย้อนหลัง days วัน (ตั้งแต่เที่ยงคืนเวลาไทยของ N-1 วันก่อน ถึงตอนนี้) แล้วแปลงเป็นเหตุการณ์
 */
const loadFarmEvents = async (farm, days = 7) => {
    const farmId = typeof farm === 'object' ? (farm.id_farms || farm.id) : farm
    const profile = getFarmProfile(farm)
    const thresholds = getThresholds(profile)
    const firstKey = bkkDate(new Date(Date.now() - (days - 1) * 86400e3))
    const buckets = await loadBucketRange(farmId, new Date(`${firstKey}T00:00:00+07:00`), new Date(Date.now() + 60e3))
    const lastDataAt = buckets.length ? null : await lastReadingAt(farmId)
    return buildHeatEvents(buckets, thresholds, profile, { lastDataAt })
}

// เวลาข้อมูลเซ็นเซอร์ล่าสุดของฟาร์ม (ทุกกล่องในฟาร์ม)
const lastReadingAt = async (farmId) => {
    const { rows } = await db.query(
        `SELECT sr.recorded_at AS last
         FROM tb_sensor_readings sr
         WHERE sr.id_farms = $1
         ORDER BY sr.recorded_at DESC
         LIMIT 1`,
        [farmId]
    )
    return rows[0]?.last || null
}

/**
 * สถานะการส่งข้อมูลของฟาร์ม จากเวลาข้อมูลล่าสุด
 * live = ส่งมาภายใน 15 นาที, offline = เงียบเกิน 15 นาที, never = ไม่เคยมีข้อมูล
 */
const connectionStatus = (lastDataAt, now = Date.now()) => {
    if (!lastDataAt) return { status: 'never', last_data_at: null, silent_min: null }
    const silentMin = Math.max(0, Math.floor((now - new Date(lastDataAt).getTime()) / 60000))
    return { status: silentMin >= OFFLINE_MIN ? 'offline' : 'live', last_data_at: new Date(lastDataAt), silent_min: silentMin }
}

module.exports = {
    OFFLINE_MIN,
    buildHeatEvents,
    loadFarmEvents,
    lastReadingAt,
    connectionStatus
}
