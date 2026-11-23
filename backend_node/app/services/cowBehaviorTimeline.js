/**
 * ข้อมูล 1 วัน (เวลาไทย 00:00–24:00) ของวัวเป้าหมาย 1 ตัว สำหรับกราฟในหน้ารายละเอียดฟาร์ม
 * - bouts: ช่วง นอน / ยืน / กิน / ไม่เห็นในภาพ (ท่าดื่มรวมกับยืน) ตัดที่ขอบวัน
 * - summary: นาทีของแต่ละท่า จำนวนรอบ รอบนอนนานสุด และเวลาที่มีภาพ
 * - movement: ช่วงที่วัวเคลื่อนที่ (เท้าขยับเกินเกณฑ์ระหว่าง 2 ภาพ ตอนยืน/กิน) และนาทีที่เดินในแต่ละรอบยืน
 * - current: ท่าปัจจุบันและอยู่ท่านี้มานานเท่าไร (เฉพาะวันนี้ และภาพล่าสุดยังไม่เก่า)
 * - thi: ค่าเฉลี่ย THI ทุก 5 นาทีของวันเดียวกัน (ชุดเดียวกับหน้าฟาร์ม จาก heatMetrics)
 *   แต่ละช่วงพฤติกรรม/เคลื่อนที่มี thi ของช่วงนั้นด้วย (เฉลี่ย ต่ำสุด สูงสุด)
 * ช่วงที่ไม่มีแถบเลย = ไม่มีภาพจากกล้อง ไม่เดาค่า
 */
const db = require('../config/db')
const { METHOD, BOUT_DEFAULTS, buildBouts, summarizeBouts, buildMovement, movementWithin } = require('./cowTracking')
const { loadBuckets, bkkDate, round1, BUCKET_MIN } = require('./heatMetrics')
const { getFarmProfile, getThresholds } = require('./heatStress')

// ดึงภาพก่อน/หลังวันเผื่อไว้ จุดตัดช่วงที่เที่ยงคืนจะได้คำนวณจากภาพทั้ง 2 ฝั่ง
const PAD_MS = 30 * 60e3

const dayWindow = (date) => {
    const from = new Date(`${date}T00:00:00+07:00`)
    return { from, to: new Date(from.getTime() + 24 * 3600e3) }
}

const formatInterval = (sec) => (sec >= 60 && sec % 60 === 0 ? `${sec / 60} นาที` : `${sec} วินาที`)

// วัวที่ระบุ (ต้องอยู่ในฟาร์มนี้) หรือถ้าไม่ระบุ = ตัวที่เลือกติดตามล่าสุด / ตัวที่มีข้อมูลล่าสุดของฟาร์ม (ระยะแรกติดตามตัวเดียว)
const findCow = async (farmId, cowId) => {
    if (cowId) {
        const { rows } = await db.query(
            `SELECT id_cows, tag_id, name_cows FROM tb_cows WHERE id_cows = $1 AND id_farms = $2 AND deleted_at IS NULL LIMIT 1`,
            [cowId, farmId])
        return rows[0] || null
    }
    try {
        const { rows } = await db.query(`
            SELECT c.id_cows, c.tag_id, c.name_cows
            FROM tb_cow_tracking_targets t
            JOIN tb_cows c ON c.id_cows = t.id_cows AND c.deleted_at IS NULL
            WHERE t.id_farms = $1
            ORDER BY t.active DESC, t.created_at DESC
            LIMIT 1
        `, [farmId])
        if (rows[0]) return rows[0]
    } catch (err) {
        if (err.code !== '42P01') throw err   // ยังไม่ได้รัน migration 20261117: ใช้ตัวที่มีข้อมูลล่าสุดแทน
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
const getCowBehaviorDay = async (farm, opts = {}) => {
    const { date, cowId, now = new Date() } = opts
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
        SELECT observed_at, behavior, box_x1, box_y1, box_x2, box_y2, match_score
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
    // THI ระหว่างช่วงนั้น จากค่าเฉลี่ย 5 นาทีที่คาบเกี่ยวกับช่วง (ไม่มีข้อมูลเซ็นเซอร์ = null)
    // above = เกณฑ์สูงสุดที่ THI เฉลี่ยของช่วงถึง (บอกแค่การเทียบค่า เกณฑ์ในงานวิจัยกำหนดจาก THI เฉลี่ยรายวัน)
    const thiDuring = (s, e) => {
        const vals = buckets.filter(b => b.t.getTime() < e && b.t.getTime() + BUCKET_MIN * 60e3 > s).map(b => b.thi)
        if (!vals.length) return null
        // ตัดสินเกณฑ์จากค่าที่ปัดแล้ว ตัวเลขที่แสดงกับป้ายเกณฑ์จะได้ตรงกัน (75.96 แสดงเป็น 76.0 ต้องถึงเกณฑ์ 76)
        const avg = round1(vals.reduce((a, v) => a + v, 0) / vals.length)
        const above = avg >= thresholds.severe ? 'severe' : avg >= thresholds.moderate ? 'moderate' : avg >= thresholds.mild ? 'mild' : null
        return { avg, max: round1(Math.max(...vals)), min: round1(Math.min(...vals)), above }
    }
    const clipped = bouts.filter(inDay).map(b => {
        const { s, e, ...c } = clip(b)
        return {
            behavior: b.behavior,
            ...c,
            thi: thiDuring(s, e),
            // นาทีที่เดินในรอบยืน/กินนี้ (รอบนอนไม่มี)
            moving_min: b.behavior === 'standing' || b.behavior === 'feeding' ? movementWithin(segments, s, e).movingMin : null,
            from_previous_day: new Date(b.start) < from,
            to_next_day: new Date(b.end) > to
        }
    })
    const movement = segments.filter(inDay).map(m => {
        const { s, e, ...c } = clip(m)
        return { ...c, thi: thiDuring(s, e), distance_body: round1(m.distanceBody * ((e - s) / Math.max(1, new Date(m.end) - new Date(m.start)))) }
    })

    // ท่าปัจจุบัน: เฉพาะเมื่อดูวันนี้ และภาพล่าสุดไม่เก่ากว่าช่วงที่ถือว่ากล้องยังส่งภาพ
    const lastAt = new Date(rows[rows.length - 1].observed_at).getTime()
    const lastBout = bouts[bouts.length - 1]
    const fresh = now >= from && now < to && now.getTime() - lastAt <= intervalSec * 1000 * BOUT_DEFAULTS.maxGapFactor
    const current = fresh && lastBout.behavior !== 'not_visible'
        ? { behavior: lastBout.behavior, since: lastBout.start, minutes: round1((now.getTime() - new Date(lastBout.start).getTime()) / 60e3), last_image_at: new Date(lastAt).toISOString() }
        : null
    const moved = movementWithin(segments, from, to)

    // แถวรายภาพของวันนี้ (ใช้ส่งออก CSV) ส่งเฉพาะเมื่อขอ เพราะวันละได้ถึง 1,440 แถว
    const snapshots = opts.includeSnapshots
        ? rows.filter(r => new Date(r.observed_at) >= from && new Date(r.observed_at) < to).map(r => {
            const t = new Date(r.observed_at).getTime()
            const b = buckets.find(x => t >= x.t.getTime() && t < x.t.getTime() + BUCKET_MIN * 60e3)
            return {
                observed_at: new Date(t).toISOString(),
                behavior: r.behavior,
                match_score: r.match_score == null ? null : Number(r.match_score),
                box: r.box_x1 == null ? null : { x1: Number(r.box_x1), y1: Number(r.box_y1), x2: Number(r.box_x2), y2: Number(r.box_y2) },
                thi: b ? round1(b.thi) : null,
                temperature_c: b && b.temp != null ? round1(b.temp) : null,
                humidity_pct: b && b.hum != null ? round1(b.hum) : null
            }
        })
        : undefined

    return {
        ...base,
        cow: cowOut,
        ...(snapshots ? { snapshots } : {}),
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

// ---------- ส่งออก CSV (เปิดด้วย Excel ได้: มี BOM ให้อ่านภาษาไทยถูก) ----------
const BEHAVIOR_TH = { lying: 'นอน', standing: 'ยืน', feeding: 'กิน', drinking: 'ดื่มน้ำ', not_visible: 'ไม่เห็นในภาพ' }
const csvCell = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const bkkText = (iso) => {
    const d = new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString()
    return `${d.slice(0, 10)} ${d.slice(11, 19)}`
}
const r4 = (v) => (v == null ? null : Math.round(v * 10000) / 10000)

/**
 * CSV ของวัวเป้าหมาย 1 วัน
 * kind = 'snapshots': 1 แถว = 1 ภาพ (ท่า คะแนนจับคู่ กรอบ THI/อุณหภูมิ/ความชื้นช่วง 5 นาทีนั้น)
 * kind = 'bouts':     1 แถว = 1 ช่วงพฤติกรรม (ตรงกับตารางและกราฟในหน้า farm_detail)
 * @returns {{filename, csv} | null}  null = ยังไม่มีวัวที่ติดตาม
 */
const buildCowBehaviorCsv = async (farm, { date, cowId, kind = 'snapshots', now = new Date() } = {}) => {
    const day = await getCowBehaviorDay(farm, { date, cowId, now, includeSnapshots: kind === 'snapshots' })
    if (!day.cow) return null
    const cowCols = [day.cow.tag_id, day.cow.name]
    let header
    let rows
    if (kind === 'bouts') {
        header = ['cow_tag', 'cow_name', 'behavior', 'behavior_th', 'start_th', 'end_th', 'duration_min', 'thi_avg', 'thi_min', 'thi_max', 'thi_level', 'moving_min', 'from_previous_day', 'to_next_day']
        rows = day.bouts.map(b => [...cowCols, b.behavior, BEHAVIOR_TH[b.behavior], bkkText(b.start), bkkText(b.end), b.duration_min,
            b.thi?.avg, b.thi?.min, b.thi?.max, b.thi?.above, b.moving_min, b.from_previous_day, b.to_next_day])
    } else {
        header = ['cow_tag', 'cow_name', 'observed_at_th', 'behavior', 'behavior_th', 'match_score', 'box_x1', 'box_y1', 'box_x2', 'box_y2', 'thi_5min', 'temperature_c', 'humidity_pct']
        rows = (day.snapshots || []).map(s => [...cowCols, bkkText(s.observed_at), s.behavior, BEHAVIOR_TH[s.behavior], s.match_score,
            r4(s.box?.x1), r4(s.box?.y1), r4(s.box?.x2), r4(s.box?.y2), s.thi, s.temperature_c, s.humidity_pct])
    }
    const meta = `# farm=${farm.id_farms},date=${day.date},method=${day.method},interval_sec=${day.interval_sec ?? ''},times=Asia/Bangkok`
    const csv = '\uFEFF' + [meta, header.join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n') + '\n'
    const tag = String(day.cow.tag_id || 'cow').replace(/[^\w-]+/g, '_')
    return { filename: `cow_${tag}_${day.date}_${kind}.csv`, csv }
}

/**
 * ภาพรายชั่วโมงของวันนั้น พร้อมกรอบของวัวเป้าหมายในภาพ (ไว้ตรวจด้วยตาว่าระบบติดตามถูกตัว)
 * จับคู่ภาพกับผลติดตามด้วยเวลาที่ถ่าย (ภาพตัวอย่างคือภาพเดียวกับที่ใช้ติดตาม)
 */
const getCowDayImages = async (farm, { date, cowId } = {}) => {
    const { listDaySamples } = require('./cameraSamples')
    const cow = await findCow(farm.id_farms, cowId)
    const images = await listDaySamples(farm.id_farms, date)
    if (!cow || !images.length) return { cow: cow ? { id: cow.id_cows, tag_id: cow.tag_id, name: cow.name_cows } : null, images: images.map(i => ({ ...i, target: null })) }
    const times = images.map(i => i.captured_at)
    const { rows } = await db.query(`
        SELECT observed_at, behavior, box_x1, box_y1, box_x2, box_y2, match_score
        FROM tb_cow_behavior_observations
        WHERE id_cows = $1 AND observed_at = ANY($2::timestamptz[])
    `, [cow.id_cows, times])
    const byTime = new Map(rows.map(r => [new Date(r.observed_at).getTime(), r]))
    return {
        cow: { id: cow.id_cows, tag_id: cow.tag_id, name: cow.name_cows },
        images: images.map(i => {
            const r = byTime.get(new Date(i.captured_at).getTime())
            return {
                ...i,
                // null = ภาพนี้ไม่มีผลติดตาม (ก่อนเริ่มติดตาม/หลังหลุด), behavior not_visible = ติดตามอยู่แต่หาวัวไม่เจอ
                target: r ? {
                    behavior: r.behavior,
                    match_score: r.match_score == null ? null : Number(r.match_score),
                    box: r.box_x1 == null ? null : { x1: Number(r.box_x1), y1: Number(r.box_y1), x2: Number(r.box_x2), y2: Number(r.box_y2) }
                } : null
            }
        })
    }
}

module.exports = { getCowBehaviorDay, dayWindow, buildCowBehaviorCsv, getCowDayImages }
