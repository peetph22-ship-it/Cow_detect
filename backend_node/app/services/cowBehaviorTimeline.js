/**
 * ข้อมูล 1 วัน (เวลาไทย 00:00–24:00) ของวัวเป้าหมาย 1 ตัว สำหรับกราฟในหน้ารายละเอียดฟาร์ม
 * - bouts: ช่วง นอน / ยืน / กิน / ไม่เห็นในภาพ (ท่าดื่มรวมกับยืน) ตัดที่ขอบวัน
 * - summary: นาทีของแต่ละท่า จำนวนรอบ รอบนอนนานสุด และเวลาที่มีภาพ
 * - movement: ช่วงที่วัวเคลื่อนที่ (เท้าขยับเกินเกณฑ์ระหว่าง 2 ภาพ ตอนยืน/กิน) และนาทีที่เดินในแต่ละรอบยืน
 * - current: ท่าปัจจุบันและอยู่ท่านี้มานานเท่าไร (เฉพาะวันนี้ และภาพล่าสุดยังไม่เก่า)
 * - thi: ค่าเฉลี่ย THI ทุก 5 นาทีของวันเดียวกัน (ชุดเดียวกับหน้าฟาร์ม จาก heatMetrics)
 * ช่วงที่ไม่มีแถบเลย = ไม่มีภาพจากกล้อง ไม่เดาค่า
 */
const db = require('../config/db')
const { METHOD, BOUT_DEFAULTS, buildBouts, summarizeBouts, buildMovement, movementWithin } = require('./cowTracking')
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
 * @param {{date?: string, cowId?: string, now?: Date}} opts  date = 'YYYY-MM-DD' เวลาไทย (ไม่ระบุ = วันนี้), now ใช้ในการทดสอบ
 */
const getCowBehaviorDay = async (farm, { date, cowId, now = new Date() } = {}) => {
    const day = date || bkkDate(now)
    const { from, to } = dayWindow(day)
    const profile = getFarmProfile(farm)
    const thresholds = getThresholds(profile)

    const [cow, buckets] = await Promise.all([
        findCow(farm.id_farms, cowId),
        loadBuckets(farm.id_farms, from, to)
    ])
    const thi = buckets.map(b => ({ t: b.t.toISOString(), thi: round1(b.thi) }))
    const base = { date: day, window: { from: from.toISOString(), to: to.toISOString() }, thi, thresholds, method: METHOD }
    const empty = { bouts: [], movement: [], summary: null, current: null, interval_sec: null }
    if (!cow) return { ...base, ...empty, cow: null, note_th: 'ยังไม่มีวัวที่ติดตามในฟาร์มนี้' }

    const { rows } = await db.query(`
        SELECT observed_at, behavior, box_x1, box_y1, box_x2, box_y2
        FROM tb_cow_behavior_observations
        WHERE id_cows = $1 AND method = $2 AND observed_at >= $3 AND observed_at < $4
        ORDER BY observed_at
    `, [cow.id_cows, METHOD, new Date(from.getTime() - PAD_MS).toISOString(), new Date(to.getTime() + PAD_MS).toISOString()])

    const cowOut = { id: cow.id_cows, tag_id: cow.tag_id, name: cow.name_cows }
    if (!rows.length) return { ...base, ...empty, cow: cowOut, note_th: 'ไม่มีภาพของวัวตัวนี้ในวันที่เลือก' }

    const obs = rows.map(r => ({
        observedAt: r.observed_at,
        behavior: r.behavior,
        box: r.box_x1 == null ? null : { x1: Number(r.box_x1), y1: Number(r.box_y1), x2: Number(r.box_x2), y2: Number(r.box_y2) }
    }))
    const { bouts, intervalSec } = buildBouts(obs)
    const { segments, thresholdBody, thresholdSource } = buildMovement(obs, { intervalSec })
    const summary = summarizeBouts(bouts, from, to)
    const clip = (item) => {
        const s = Math.max(new Date(item.start).getTime(), from.getTime())
        const e = Math.min(new Date(item.end).getTime(), to.getTime())
        return { s, e, start: new Date(s).toISOString(), end: new Date(e).toISOString(), duration_min: round1((e - s) / 60e3) }
    }
    const inDay = (item) => new Date(item.end) > from && new Date(item.start) < to
    const clipped = bouts.filter(inDay).map(b => {
        const { s, e, ...c } = clip(b)
        return {
            behavior: b.behavior,
            ...c,
            // นาทีที่เดินในรอบยืน/กินนี้ (รอบนอนไม่มี)
            moving_min: b.behavior === 'standing' || b.behavior === 'feeding' ? movementWithin(segments, s, e).movingMin : null,
            from_previous_day: new Date(b.start) < from,
            to_next_day: new Date(b.end) > to
        }
    })
    const movement = segments.filter(inDay).map(m => {
        const { s, e, ...c } = clip(m)
        return { ...c, distance_body: round1(m.distanceBody * ((e - s) / Math.max(1, new Date(m.end) - new Date(m.start)))) }
    })

    // ท่าปัจจุบัน: เฉพาะเมื่อดูวันนี้ และภาพล่าสุดไม่เก่ากว่าช่วงที่ถือว่ากล้องยังส่งภาพ
    const lastAt = new Date(rows[rows.length - 1].observed_at).getTime()
    const lastBout = bouts[bouts.length - 1]
    const fresh = now >= from && now < to && now.getTime() - lastAt <= intervalSec * 1000 * BOUT_DEFAULTS.maxGapFactor
    const current = fresh && lastBout.behavior !== 'not_visible'
        ? { behavior: lastBout.behavior, since: lastBout.start, minutes: round1((now.getTime() - new Date(lastBout.start).getTime()) / 60e3), last_image_at: new Date(lastAt).toISOString() }
        : null
    const moved = movementWithin(segments, from, to)

    return {
        ...base,
        cow: cowOut,
        bouts: clipped,
        movement,
        current,
        summary: {
            minutes: summary.minutes,
            bouts: summary.bouts,
            longest_lying_min: summary.longestLyingMin,
            covered_min: summary.coveredMin,
            window_min: summary.windowMin,
            moving_min: moved.movingMin,
            moves: moved.moves,
            distance_body: moved.distanceBody,
            moving_threshold_body: thresholdBody,
            moving_threshold_source: thresholdSource
        },
        interval_sec: intervalSec,
        note_th: `ข้อมูลจากภาพนิ่งทุก ${formatInterval(intervalSec)} เวลาเริ่ม–จบของแต่ละช่วงคลาดได้ประมาณ ±${formatInterval(Math.round(intervalSec / 2))} · ท่าดื่มน้ำนับรวมในท่ายืน · "ไม่เห็นในภาพ" = หาวัวตัวนี้ในภาพไม่เจอ (ถูกบังหรือออกนอกภาพ) · ช่วงที่ไม่มีแถบ = ไม่มีภาพจากกล้อง`,
        movement_note_th: `เคลื่อนที่ = ตำแหน่งเท้าในภาพขยับเกิน ${Math.round(thresholdBody * 100)}% ของขนาดตัวระหว่าง 2 ภาพ ขณะยืนหรือกิน ` +
            `(${thresholdSource === 'measured' ? 'เกณฑ์ตั้งจากการสั่นของภาพตอนวัวนอนนิ่งในวันนี้' : 'ใช้เกณฑ์ตั้งต้น เพราะช่วงวัวนอนยังไม่พอให้วัด'}) · ` +
            `ระยะเป็น "ช่วงตัว" โดยประมาณ ใช้เทียบกันในกล้องตัวเดียวกัน ไม่ใช่เมตร · การเดินที่สั้นกว่ารอบถ่ายภาพจะไม่ถูกนับ`
    }
}

module.exports = { getCowBehaviorDay, dayWindow }
