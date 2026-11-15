/**
 * ข้อมูล 1 วัน (เวลาไทย 00:00–24:00) ของวัวเป้าหมาย 1 ตัว สำหรับกราฟในหน้ารายละเอียดฟาร์ม
 * - bouts: ช่วง นอน / ยืน / กิน / ไม่เห็นในภาพ (ท่าดื่มรวมกับยืน) ตัดที่ขอบวัน
 * - summary: นาทีของแต่ละท่า จำนวนรอบ รอบนอนนานสุด และเวลาที่มีภาพ
 * - thi: ค่าเฉลี่ย THI ทุก 5 นาทีของวันเดียวกัน (ชุดเดียวกับหน้าฟาร์ม จาก heatMetrics)
 * ช่วงที่ไม่มีแถบเลย = ไม่มีภาพจากกล้อง ไม่เดาค่า
 */
const db = require('../config/db')
const { METHOD, buildBouts, summarizeBouts } = require('./cowTracking')
const { loadBuckets, bkkDate, round1 } = require('./heatMetrics')
const { getFarmProfile, getThresholds } = require('./heatStress')

// ดึงภาพก่อน/หลังวันเผื่อไว้ จุดตัดช่วงที่เที่ยงคืนจะได้คำนวณจากภาพทั้ง 2 ฝั่ง
const PAD_MS = 30 * 60e3

const dayWindow = (date) => {
    const from = new Date(`${date}T00:00:00+07:00`)
    return { from, to: new Date(from.getTime() + 24 * 3600e3) }
}

const formatInterval = (sec) => (sec >= 60 && sec % 60 === 0 ? `${sec / 60} นาที` : `${sec} วินาที`)

// วัวที่ระบุ (ต้องอยู่ในฟาร์มนี้) หรือถ้าไม่ระบุ = ตัวที่มีข้อมูลล่าสุดของฟาร์ม (ระยะแรกติดตามตัวเดียว)
const findCow = async (farmId, cowId) => {
    if (cowId) {
        const { rows } = await db.query(
            `SELECT id_cows, tag_id, name_cows FROM tb_cows WHERE id_cows = $1 AND id_farms = $2 AND deleted_at IS NULL LIMIT 1`,
            [cowId, farmId])
        return rows[0] || null
    }
    const { rows } = await db.query(`
        SELECT c.id_cows, c.tag_id, c.name_cows
        FROM tb_cow_behavior_observations o
        JOIN tb_cows c ON c.id_cows = o.id_cows AND c.deleted_at IS NULL
        WHERE o.id_farms = $1
        ORDER BY o.observed_at DESC
        LIMIT 1
    `, [farmId])
    return rows[0] || null
}

/**
 * @param {object} farm  แถวจาก tb_farms (ใช้ id_farms และโปรไฟล์เกณฑ์ THI)
 * @param {{date?: string, cowId?: string}} opts  date = 'YYYY-MM-DD' เวลาไทย (ไม่ระบุ = วันนี้)
 */
const getCowBehaviorDay = async (farm, { date, cowId } = {}) => {
    const day = date || bkkDate(new Date())
    const { from, to } = dayWindow(day)
    const profile = getFarmProfile(farm)
    const thresholds = getThresholds(profile)

    const [cow, buckets] = await Promise.all([
        findCow(farm.id_farms, cowId),
        loadBuckets(farm.id_farms, from, to)
    ])
    const thi = buckets.map(b => ({ t: b.t.toISOString(), thi: round1(b.thi) }))
    const base = { date: day, window: { from: from.toISOString(), to: to.toISOString() }, thi, thresholds, method: METHOD }
    if (!cow) return { ...base, cow: null, bouts: [], summary: null, interval_sec: null, note_th: 'ยังไม่มีวัวที่ติดตามในฟาร์มนี้' }

    const { rows } = await db.query(`
        SELECT observed_at, behavior
        FROM tb_cow_behavior_observations
        WHERE id_cows = $1 AND method = $2 AND observed_at >= $3 AND observed_at < $4
        ORDER BY observed_at
    `, [cow.id_cows, METHOD, new Date(from.getTime() - PAD_MS).toISOString(), new Date(to.getTime() + PAD_MS).toISOString()])

    const cowOut = { id: cow.id_cows, tag_id: cow.tag_id, name: cow.name_cows }
    if (!rows.length) return { ...base, cow: cowOut, bouts: [], summary: null, interval_sec: null, note_th: 'ไม่มีภาพของวัวตัวนี้ในวันที่เลือก' }

    const { bouts, intervalSec } = buildBouts(rows.map(r => ({ observedAt: r.observed_at, behavior: r.behavior })))
    const summary = summarizeBouts(bouts, from, to)
    const clipped = bouts
        .filter(b => new Date(b.end) > from && new Date(b.start) < to)
        .map(b => {
            const s = Math.max(new Date(b.start).getTime(), from.getTime())
            const e = Math.min(new Date(b.end).getTime(), to.getTime())
            return {
                behavior: b.behavior,
                start: new Date(s).toISOString(),
                end: new Date(e).toISOString(),
                duration_min: round1((e - s) / 60e3),
                from_previous_day: new Date(b.start) < from,
                to_next_day: new Date(b.end) > to
            }
        })

    return {
        ...base,
        cow: cowOut,
        bouts: clipped,
        summary: {
            minutes: summary.minutes,
            bouts: summary.bouts,
            longest_lying_min: summary.longestLyingMin,
            covered_min: summary.coveredMin,
            window_min: summary.windowMin
        },
        interval_sec: intervalSec,
        note_th: `ข้อมูลจากภาพนิ่งทุก ${formatInterval(intervalSec)} เวลาเริ่ม–จบของแต่ละช่วงคลาดได้ประมาณ ±${formatInterval(Math.round(intervalSec / 2))} · ท่าดื่มน้ำนับรวมในท่ายืน · "ไม่เห็นในภาพ" = หาวัวตัวนี้ในภาพไม่เจอ (ถูกบังหรือออกนอกภาพ) · ช่วงที่ไม่มีแถบ = ไม่มีภาพจากกล้อง`
    }
}

module.exports = { getCowBehaviorDay, dayWindow }
