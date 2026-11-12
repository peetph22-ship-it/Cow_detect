/**
 * ติดตามวัวเป้าหมาย 1 ตัวจากภาพนิ่ง แล้วรวมเป็นช่วงพฤติกรรม - pure functions ทดสอบได้โดยไม่ต้องมีฐานข้อมูล
 *
 * ข้อมูลเข้า: กรอบจาก cctv_behavior_telemetry.detections ของแต่ละภาพ (พิกัดเป็นสัดส่วน 0-1 ของภาพ)
 * ผลลัพธ์: แถวสำหรับ tb_cow_behavior_observations (1 ภาพ = 1 แถว) และช่วงพฤติกรรมสำหรับกราฟ
 *
 * วิธี position-v1: กล้องติดอยู่กับที่ จึงจับคู่วัวข้ามภาพจากตำแหน่ง
 * - เลือกกรอบในภาพใหม่ที่ซ้อน/ใกล้ตำแหน่งล่าสุดของวัวเป้าหมายมากที่สุด
 * - ไม่มีกรอบที่ใกล้พอ หรือมี 2 กรอบใกล้พอ ๆ กัน (เสี่ยงสลับตัว) = "ไม่เห็นในภาพ" ไม่เดา
 * - หายจากภาพนานเกิน maxLostSec = หลุดการติดตาม ต้องเลือกวัวใหม่ (ยังไม่มีการจำลายหรือเครื่องหมาย)
 */

const { iou } = require('./visionPostprocess')

const METHOD = 'position-v1'

const TRACK_DEFAULTS = Object.freeze({
    minScore: 0.3,          // คะแนนต่ำกว่านี้ไม่ถือว่าเป็นตัวเดิม
    ambiguityMargin: 0.15,  // กรอบที่ 2 ได้คะแนนห่างจากกรอบที่ 1 ไม่ถึงค่านี้ = ไม่แน่ใจว่าตัวไหน
    maxShift: 0.5,          // ระยะขยับที่ยังนับว่าใกล้ (เท่าของเส้นทแยงกรอบเดิม)
    maxLostSec: 15 * 60
})

const BOUT_DEFAULTS = Object.freeze({
    mergeDrinking: true,    // โมเดลแยกท่าดื่มได้แม่นต่ำ (AP50 0.37) จึงแสดงรวมกับยืน
    maxMissed: 1,           // หายจากภาพได้กี่ภาพติดกันโดยไม่ตัดช่วง (ถ้าก่อนและหลังเป็นท่าเดียวกัน)
    maxGapFactor: 2.5,      // ภาพห่างกันเกินกี่เท่าของรอบปกติ = ช่วงไม่มีข้อมูล (กล้องหลุด) ไม่ลากเส้นต่อ
    intervalSec: null       // รอบถ่ายภาพ ไม่ระบุ = ใช้มัธยฐานของระยะห่างจริง
})

const CLASS_TO_BEHAVIOR = { 'lying down': 'lying', lying: 'lying', standing: 'standing', feeding: 'feeding', drinking: 'drinking' }

const toMs = (t) => (t instanceof Date ? t.getTime() : new Date(t).getTime())
const round1 = (v) => Math.round(v * 10) / 10

// 0-1: ส่วนใหญ่มาจากการซ้อนทับ ส่วนที่เหลือจากระยะห่างของจุดกึ่งกลาง (ช่วยตอนวัวลุก/นอนแล้วรูปกรอบเปลี่ยน)
const matchScore = (prev, box, maxShift) => {
    const diag = Math.hypot(prev.x2 - prev.x1, prev.y2 - prev.y1)
    const dist = Math.hypot((box.x1 + box.x2 - prev.x1 - prev.x2) / 2, (box.y1 + box.y2 - prev.y1 - prev.y2) / 2)
    const proximity = diag > 0 ? Math.max(0, 1 - dist / (maxShift * diag)) : 0
    return 0.7 * iou(prev, box) + 0.3 * proximity
}

/**
 * @param {{x1,y1,x2,y2}} prev  ตำแหน่งล่าสุดของวัวเป้าหมาย
 * @param {Array<{cls,x1,y1,x2,y2}>} boxes  กรอบทั้งหมดในภาพใหม่
 * @returns {{box, score} | {box: null, reason: 'none'|'ambiguous'}}
 */
const matchTarget = (prev, boxes, opts = {}) => {
    const o = { ...TRACK_DEFAULTS, ...opts }
    const scored = (boxes || [])
        .map(box => ({ box, score: matchScore(prev, box, o.maxShift) }))
        .filter(s => s.score >= o.minScore)
        .sort((a, b) => b.score - a.score)
    if (!scored.length) return { box: null, reason: 'none' }
    if (scored.length > 1 && scored[0].score - scored[1].score < o.ambiguityMargin) return { box: null, reason: 'ambiguous' }
    return scored[0]
}

/**
 * ติดตามวัวเป้าหมายในภาพที่เรียงตามเวลา
 * @param {Array<{observedAt, telemetryId?, cameraId?, boxes}>} frames
 * @param {{box: {x1,y1,x2,y2}, at}} seed  ตำแหน่งเริ่มต้นของวัวเป้าหมาย (เวลาไม่หลังภาพแรก)
 * @returns {{observations: Array, lostAt: string|null}}  หลุดการติดตามแล้วจะหยุดสร้างแถว
 */
const trackTarget = (frames, seed, opts = {}) => {
    const o = { ...TRACK_DEFAULTS, ...opts }
    let last = { box: seed.box, at: toMs(seed.at) }
    const observations = []
    for (const f of frames) {
        const at = toMs(f.observedAt)
        if (at - last.at > o.maxLostSec * 1000) return { observations, lostAt: new Date(at).toISOString() }
        const m = matchTarget(last.box, f.boxes, o)
        const base = { observedAt: new Date(at).toISOString(), telemetryId: f.telemetryId ?? null, cameraId: f.cameraId ?? null, method: METHOD }
        if (!m.box) {
            observations.push({ ...base, behavior: 'not_visible', box: null, matchScore: null })
            continue
        }
        const { x1, y1, x2, y2 } = m.box
        observations.push({ ...base, behavior: CLASS_TO_BEHAVIOR[m.box.cls] || 'not_visible', box: { x1, y1, x2, y2 }, matchScore: Math.round(m.score * 1000) / 1000 })
        last = { box: { x1, y1, x2, y2 }, at }
    }
    return { observations, lostAt: null }
}

const medianGap = (times) => {
    const gaps = times.slice(1).map((t, i) => t - times[i]).filter(g => g > 0).sort((a, b) => a - b)
    return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 60e3
}

/**
 * รวมแถวที่เรียงตามเวลาเป็นช่วงพฤติกรรม
 * จุดเปลี่ยนท่าอยู่ระหว่าง 2 ภาพ จึงตัดช่วงที่กึ่งกลาง (คลาดจากจริงได้ไม่เกินครึ่งรอบถ่ายภาพ)
 * ภาพแรก/สุดท้าย และขอบช่วงที่ไม่มีข้อมูล ขยายออกครึ่งรอบ
 * @returns {{bouts: Array<{behavior, start, end, durationMin, snapshots}>, intervalSec: number}}
 */
const buildBouts = (observations, opts = {}) => {
    const o = { ...BOUT_DEFAULTS, ...opts }
    const n = observations.length
    const times = observations.map(x => toMs(x.observedAt))
    const interval = o.intervalSec ? o.intervalSec * 1000 : medianGap(times)
    const maxGap = interval * o.maxGapFactor
    const beh = observations.map(x => (o.mergeDrinking && x.behavior === 'drinking' ? 'standing' : x.behavior))
    const linked = (i) => i > 0 && i < n && times[i] - times[i - 1] <= maxGap   // ภาพ i ต่อเนื่องกับภาพก่อนหน้า

    // หายจากภาพสั้น ๆ ระหว่างท่าเดียวกัน = ยังอยู่ท่าเดิม
    for (let i = 0; i < n; i++) {
        if (beh[i] !== 'not_visible') continue
        let j = i
        while (j < n && beh[j] === 'not_visible') j++
        const continuous = i > 0 && j < n && Array.from({ length: j - i + 1 }, (_, k) => linked(i + k)).every(Boolean)
        if (j - i <= o.maxMissed && continuous && beh[i - 1] === beh[j]) beh.fill(beh[i - 1], i, j)
        i = j - 1
    }

    const bouts = []
    let cur = null
    const close = (lastIdx) => {
        cur.endMs = linked(lastIdx + 1) ? (times[lastIdx] + times[lastIdx + 1]) / 2 : times[lastIdx] + interval / 2
        bouts.push({
            behavior: cur.behavior,
            start: new Date(cur.startMs).toISOString(),
            end: new Date(cur.endMs).toISOString(),
            durationMin: round1((cur.endMs - cur.startMs) / 60e3),
            snapshots: cur.snapshots
        })
    }
    for (let k = 0; k < n; k++) {
        if (cur && cur.behavior === beh[k] && linked(k)) { cur.snapshots++; continue }
        if (cur) close(k - 1)
        cur = { behavior: beh[k], startMs: linked(k) ? (times[k - 1] + times[k]) / 2 : times[k] - interval / 2, snapshots: 1 }
    }
    if (cur) close(n - 1)
    return { bouts, intervalSec: Math.round(interval / 1000) }
}

/**
 * สรุปช่วง [from, to) เช่น 1 วัน: นาทีของแต่ละท่า จำนวนรอบ (นับรอบที่อยู่ในช่วงนี้ แม้เริ่มก่อนเที่ยงคืน)
 * coveredMin = เวลาที่มีภาพ (รวมช่วงไม่เห็นในภาพ) ไม่รวมช่วงที่กล้องหลุด
 */
const summarizeBouts = (bouts, from, to) => {
    const f = toMs(from)
    const t = toMs(to)
    const minutes = { lying: 0, standing: 0, feeding: 0, drinking: 0, not_visible: 0 }
    const counts = { lying: 0, standing: 0, feeding: 0, drinking: 0 }
    let longestLyingMin = 0
    for (const b of bouts) {
        const s = Math.max(toMs(b.start), f)
        const e = Math.min(toMs(b.end), t)
        if (e <= s) continue
        const min = (e - s) / 60e3
        minutes[b.behavior] = (minutes[b.behavior] || 0) + min
        if (b.behavior in counts) counts[b.behavior]++
        if (b.behavior === 'lying') longestLyingMin = Math.max(longestLyingMin, b.durationMin)
    }
    const coveredMin = Object.values(minutes).reduce((a, b) => a + b, 0)
    for (const k of Object.keys(minutes)) minutes[k] = round1(minutes[k])
    return { minutes, bouts: counts, longestLyingMin: round1(longestLyingMin), coveredMin: round1(coveredMin), windowMin: round1((t - f) / 60e3) }
}

module.exports = { METHOD, TRACK_DEFAULTS, BOUT_DEFAULTS, matchScore, matchTarget, trackTarget, buildBouts, summarizeBouts }
