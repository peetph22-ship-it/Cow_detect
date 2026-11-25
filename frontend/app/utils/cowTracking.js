// สร้างอัตโนมัติจาก backend_node/app/services/cowTracking.js ห้ามแก้ไฟล์นี้โดยตรง
// แก้ที่ server แล้วรัน: node backend_node/scripts/sync_browser_tracking.js
/**
 * ติดตามวัวเป้าหมาย 1 ตัวจากภาพนิ่ง แล้วรวมเป็นช่วงพฤติกรรม - pure functions ทดสอบได้โดยไม่ต้องมีฐานข้อมูล
 *
 * ข้อมูลเข้า: กรอบจาก cctv_behavior_telemetry.detections ของแต่ละภาพ (พิกัดเป็นสัดส่วน 0-1 ของภาพ)
 * ผลลัพธ์: แถวสำหรับ tb_cow_behavior_observations (1 ภาพ = 1 แถว) และช่วงพฤติกรรมสำหรับกราฟ
 *
 * วิธี position-v2: กล้องติดอยู่กับที่ จึงจับคู่วัวข้ามภาพจากตำแหน่ง
 * - เลือกกรอบในภาพใหม่ที่ซ้อน/ใกล้ตำแหน่งล่าสุดของวัวเป้าหมายมากที่สุด
 * - วัวกำลังเดิน: เทียบกับตำแหน่งที่คาดว่าจะไปถึงตามทิศและความเร็วล่าสุดด้วย (v1 ไม่มีข้อนี้ จึงหลุดง่ายตอนเดิน)
 * - ไม่มีกรอบที่ใกล้พอ หรือมี 2 กรอบใกล้พอ ๆ กัน (เสี่ยงสลับตัว) = "ไม่เห็นในภาพ" ไม่เดา
 * - หายจากภาพนานเกิน maxLostSec = หลุดการติดตาม ต้องเลือกวัวใหม่ (ยังไม่มีการจำลายหรือเครื่องหมาย)
 *
 * การเคลื่อนที่ (buildMovement): ระยะที่ "ตำแหน่งเท้า" (กลางขอบล่างของกรอบ) ขยับระหว่าง 2 ภาพ เทียบกับขนาดตัว
 * นับเฉพาะเมื่อทั้ง 2 ภาพเป็นท่ายืน/กิน/ดื่ม (ตอนลุกหรือลงนอนกรอบเปลี่ยนรูป ไม่ใช่การเดิน)
 * เกณฑ์ = สูงกว่าการสั่นของกรอบที่วัดได้ตอนวัวนอนนิ่ง (กล้องแต่ละตัวสั่นไม่เท่ากัน)
 */

// iou จาก backend_node/app/services/visionPostprocess.js
const iou = (a, b) => {
    const x1 = Math.max(a.x1, b.x1)
    const y1 = Math.max(a.y1, b.y1)
    const x2 = Math.min(a.x2, b.x2)
    const y2 = Math.min(a.y2, b.y2)
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
    const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter
    return union > 0 ? inter / union : 0
}

const METHOD = 'position-v2'

const TRACK_DEFAULTS = Object.freeze({
    minScore: 0.3,          // คะแนนต่ำกว่านี้ไม่ถือว่าเป็นตัวเดิม
    ambiguityMargin: 0.15,  // กรอบที่ 2 ได้คะแนนห่างจากกรอบที่ 1 ไม่ถึงค่านี้ = ไม่แน่ใจว่าตัวไหน
    maxShift: 0.5,          // ระยะขยับที่ยังนับว่าใกล้ (เท่าของเส้นทแยงกรอบเดิม)
    maxLostSec: 15 * 60,    // หาวัวไม่เจอนานเกินนี้ (นับเฉพาะช่วงที่มีภาพเข้ามา) = หลุดการติดตาม
    outageGapSec: 5 * 60    // ภาพห่างจากภาพก่อนเกินนี้ = กล้อง/เน็ตหลุด ไม่นับเป็นเวลาที่หาวัวไม่เจอ
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
 * @param {{predicted?: {x1,y1,x2,y2}}} opts  predicted = ตำแหน่งที่คาดไว้ตอนวัวเดิน (ใช้คะแนนที่ดีกว่าระหว่าง 2 ตำแหน่ง)
 * @returns {{box, score} | {box: null, reason: 'none'|'ambiguous'}}
 */
const matchTarget = (prev, boxes, opts = {}) => {
    const o = { ...TRACK_DEFAULTS, ...opts }
    const score = (box) => Math.max(matchScore(prev, box, o.maxShift), o.predicted ? matchScore(o.predicted, box, o.maxShift) : 0)
    const scored = (boxes || [])
        .map(box => ({ box, score: score(box) }))
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
    let state = seedState(seed)
    const observations = []
    for (const f of frames) {
        const r = stepTarget(state, f, opts)
        if (r.lost) return { observations, lostAt: new Date(toMs(f.observedAt)).toISOString() }
        observations.push(r.observation)
        state = r.state
    }
    return { observations, lostAt: null }
}

/**
 * สถานะการติดตาม (เก็บเป็น JSON ในฐานข้อมูลได้): ตำแหน่งล่าสุดที่เจอวัว เวลา (ms) และความเร็วจาก 2 ภาพล่าสุด
 * @param {{box: {x1,y1,x2,y2}, at}} seed  กรอบที่ผู้ใช้คลิกเลือก และเวลาของภาพนั้น
 */
const seedState = (seed) => ({ box: { x1: seed.box.x1, y1: seed.box.y1, x2: seed.box.x2, y2: seed.box.y2 }, at: toMs(seed.at), velocity: null })

/**
 * ติดตามต่อ 1 ภาพ (ใช้ทั้งตอนภาพเข้ามาสด ๆ และตอนคำนวณย้อนหลัง)
 * @returns {{lost: true} | {lost: false, observation, state}}  lost = หายจากภาพนานเกิน maxLostSec
 */
const stepTarget = (state, frame, opts = {}) => {
    const o = { ...TRACK_DEFAULTS, ...opts }
    const at = toMs(frame.observedAt)
    // เวลาที่หาวัวไม่เจอ: นับเฉพาะช่วงที่ภาพเข้ามาต่อเนื่อง ช่วงกล้อง/เน็ตหลุด (ภาพห่างเกิน outageGapSec) ไม่นับ
    // (เดิมนับจากเวลาที่เห็นวัวครั้งล่าสุด เน็ตหลุด 15 นาทีจึงหลุดการติดตามทั้งที่วัวยังอยู่ที่เดิม)
    const lastFrame = state.frameAt ?? state.at
    const gap = Math.max(0, at - lastFrame)
    const missedMs = (state.missedMs ?? 0) + (gap > o.outageGapSec * 1000 ? 0 : gap)
    if (missedMs > o.maxLostSec * 1000) return { lost: true }
    // คาดตำแหน่งไม่เกิน 2 รอบถ่ายภาพล่าสุด (หายนานกว่านั้น วัวอาจหยุดหรือเลี้ยวไปแล้ว)
    const v = state.velocity
    const dt = v ? Math.min(at - state.at, 2 * v.stepMs) : 0
    const predicted = v ? shiftBox(state.box, v.dx * dt, v.dy * dt) : null
    const m = matchTarget(state.box, frame.boxes, { ...o, predicted })
    const base = { observedAt: new Date(at).toISOString(), telemetryId: frame.telemetryId ?? null, cameraId: frame.cameraId ?? null, method: METHOD }
    if (!m.box) return { lost: false, observation: { ...base, behavior: 'not_visible', box: null, matchScore: null }, state: { ...state, frameAt: at, missedMs } }
    const box = { x1: m.box.x1, y1: m.box.y1, x2: m.box.x2, y2: m.box.y2 }
    const stepMs = at - state.at
    const c0 = center(state.box)
    const c1 = center(box)
    return {
        lost: false,
        observation: { ...base, behavior: CLASS_TO_BEHAVIOR[m.box.cls] || 'not_visible', box, matchScore: Math.round(m.score * 1000) / 1000 },
        state: { box, at, frameAt: at, missedMs: 0, velocity: stepMs > 0 ? { dx: (c1.x - c0.x) / stepMs, dy: (c1.y - c0.y) / stepMs, stepMs } : null }
    }
}

const center = (b) => ({ x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 })
const shiftBox = (b, dx, dy) => ({ x1: b.x1 + dx, y1: b.y1 + dy, x2: b.x2 + dx, y2: b.y2 + dy })

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
        // นับเฉพาะส่วนที่อยู่ในช่วงนี้ (รอบที่ต่อจากเมื่อวานจะไม่ยาวกว่าเวลานอนรวมของวัน)
        if (b.behavior === 'lying') longestLyingMin = Math.max(longestLyingMin, min)
    }
    const coveredMin = Object.values(minutes).reduce((a, b) => a + b, 0)
    for (const k of Object.keys(minutes)) minutes[k] = round1(minutes[k])
    return { minutes, bouts: counts, longestLyingMin: round1(longestLyingMin), coveredMin: round1(coveredMin), windowMin: round1((t - f) / 60e3) }
}

const MOVE_DEFAULTS = Object.freeze({
    defaultThreshold: 0.25, // ใช้เมื่อยังมีช่วงวัวนอนไม่พอให้วัดการสั่นของกรอบ (เท่าของขนาดตัว)
    minThreshold: 0.1,
    maxThreshold: 0.5,
    noiseFactor: 2,         // เกณฑ์ = 2 เท่าของการสั่นระดับ 95% ตอนวัวนอนนิ่ง
    minNoisePairs: 20,
    maxGapFactor: 2.5
})

const UPRIGHT = new Set(['standing', 'feeding', 'drinking'])
const foot = (b) => ({ x: (b.x1 + b.x2) / 2, y: b.y2 })
const bodySize = (b) => Math.hypot(b.x2 - b.x1, b.y2 - b.y1)
// ระยะที่เท้าขยับ หน่วยเป็น "เท่าของขนาดตัว" (เส้นทแยงกรอบ) วัวใกล้หรือไกลกล้องจึงเทียบกันได้
const step = (a, b) => Math.hypot(foot(b).x - foot(a).x, foot(b).y - foot(a).y) / ((bodySize(a) + bodySize(b)) / 2)

/**
 * ช่วงที่วัวเคลื่อนที่ จากแถวที่เรียงตามเวลา (ต้องมี box)
 * ช่วงเคลื่อนที่ = ระหว่าง 2 ภาพที่เท้าขยับเกินเกณฑ์ (รู้แค่ว่าขยับระหว่าง 2 ภาพนี้ ไม่รู้เส้นทางจริง)
 * @returns {{segments: Array<{start, end, durationMin, distanceBody}>, thresholdBody: number, thresholdSource: 'measured'|'default'}}
 */
const buildMovement = (observations, opts = {}) => {
    const o = { ...MOVE_DEFAULTS, ...opts }
    const times = observations.map(x => toMs(x.observedAt))
    const maxGap = (o.intervalSec ? o.intervalSec * 1000 : medianGap(times)) * o.maxGapFactor
    const pairs = []
    for (let i = 1; i < observations.length; i++) {
        const a = observations[i - 1]
        const b = observations[i]
        if (a.box && b.box && times[i] - times[i - 1] <= maxGap) pairs.push({ i, a, b, d: step(a.box, b.box) })
    }

    const noise = pairs.filter(p => p.a.behavior === 'lying' && p.b.behavior === 'lying').map(p => p.d).sort((x, y) => x - y)
    const measured = noise.length >= o.minNoisePairs
    const threshold = measured
        ? Math.min(o.maxThreshold, Math.max(o.minThreshold, noise[Math.floor(noise.length * 0.95)] * o.noiseFactor))
        : o.defaultThreshold

    const segments = []
    let cur = null
    for (const p of pairs) {
        const moving = UPRIGHT.has(p.a.behavior) && UPRIGHT.has(p.b.behavior) && p.d > threshold
        if (moving && cur && cur.endIdx === p.i - 1) { cur.endIdx = p.i; cur.distance += p.d; continue }
        if (cur) segments.push(cur)
        cur = moving ? { startIdx: p.i - 1, endIdx: p.i, distance: p.d } : null
    }
    if (cur) segments.push(cur)

    return {
        segments: segments.map(s => ({
            start: new Date(times[s.startIdx]).toISOString(),
            end: new Date(times[s.endIdx]).toISOString(),
            durationMin: round1((times[s.endIdx] - times[s.startIdx]) / 60e3),
            distanceBody: round1(s.distance)
        })),
        thresholdBody: Math.round(threshold * 100) / 100,
        thresholdSource: measured ? 'measured' : 'default'
    }
}

// นาทีที่เคลื่อนที่ในช่วง [from, to) และระยะ (คิดตามสัดส่วนเวลาถ้าช่วงถูกตัดขอบ)
const movementWithin = (segments, from, to) => {
    const f = toMs(from)
    const t = toMs(to)
    let minutes = 0, distance = 0, moves = 0
    for (const s of segments) {
        const s0 = toMs(s.start), s1 = toMs(s.end)
        const a = Math.max(s0, f), b = Math.min(s1, t)
        if (b <= a) continue
        minutes += (b - a) / 60e3
        distance += s.distanceBody * ((b - a) / Math.max(1, s1 - s0))
        moves++
    }
    return { movingMin: round1(minutes), distanceBody: round1(distance), moves }
}

/**
 * เลขประจำตัวชั่วคราวของวัวทุกตัว (ใช้ทั้งตอนรับภาพบน server และหน้า simulator)
 * จับคู่กรอบในภาพใหม่กับวัวที่เห็นล่าสุดด้วย matchScore ทั้งภาพพร้อมกัน (คู่คะแนนสูงสุดได้ก่อน ไม่มีเลขซ้ำในภาพเดียว)
 * วัวที่หายไปไม่เกิน maxLostSec แล้วกลับมาที่เดิม = เลขเดิม, กรอบที่ไม่ตรงกับใคร = เลขใหม่ (เรียงซ้ายไปขวา)
 * เลขนี้ระบบตั้งเอง ไม่ใช่เบอร์หู (เบอร์หูผูกกับวัวเป้าหมายใน tb_cows)
 * @param {{tracks: Array<{id, box, at}>, nextId: number}} state  at = ms
 * @param {{observedAt, boxes}} frame
 * @returns {{ids: number[], state}}
 */
const stepCowIds = (state, frame, opts = {}) => {
    const o = { ...TRACK_DEFAULTS, ...opts }
    const at = toMs(frame.observedAt)
    const tracks = (state?.tracks || []).filter(tr => at - tr.at <= o.maxLostSec * 1000).map(tr => ({ ...tr }))
    let nextId = Math.max(state?.nextId || 1, ...tracks.map(tr => tr.id + 1))
    const boxes = frame.boxes || []
    const pairs = []
    tracks.forEach((tr, ti) => boxes.forEach((b, bi) => {
        const s = matchScore(tr.box, b, o.maxShift)
        if (s >= o.minScore) pairs.push({ ti, bi, s })
    }))
    pairs.sort((a, b) => b.s - a.s)
    const ids = new Array(boxes.length).fill(0)
    const used = new Set()
    for (const p of pairs) {
        if (used.has(p.ti) || ids[p.bi]) continue
        used.add(p.ti)
        ids[p.bi] = tracks[p.ti].id
        tracks[p.ti].box = { x1: boxes[p.bi].x1, y1: boxes[p.bi].y1, x2: boxes[p.bi].x2, y2: boxes[p.bi].y2 }
        tracks[p.ti].at = at
    }
    boxes.map((b, bi) => ({ b, bi })).filter(x => !ids[x.bi])
        .sort((a, b) => (a.b.x1 + a.b.x2) - (b.b.x1 + b.b.x2))
        .forEach(({ b, bi }) => {
            ids[bi] = nextId++
            tracks.push({ id: ids[bi], box: { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 }, at })
        })
    return { ids, state: { tracks, nextId } }
}

/**
 * ตำแหน่งวัวแบบอ่านง่าย (ใช้ใน CSV ทั้ง simulator และ farm_detail) คู่กับพิกัด x1..y2 เดิม
 * zone = ช่องในภาพ 3x3 (top-left ... center ... bottom-right), ค่าเป็น % ของภาพ (0 = ซ้าย/บน, 100 = ขวา/ล่าง)
 */
const ROW_EN = ['top', 'middle', 'bottom']
const COL_EN = ['left', 'center', 'right']
const pct1 = (v) => Math.round(v * 1000) / 10
const describePosition = (box) => {
    if (!box) return null
    const cx = (box.x1 + box.x2) / 2
    const cy = (box.y1 + box.y2) / 2
    const third = (v) => Math.min(2, Math.max(0, Math.floor(v * 3)))
    const r = third(cy)
    const c = third(cx)
    return {
        zone: r === 1 && c === 1 ? 'center' : `${ROW_EN[r]}-${COL_EN[c]}`,
        centerXPct: pct1(cx),
        centerYPct: pct1(cy),
        widthPct: pct1(box.x2 - box.x1),
        heightPct: pct1(box.y2 - box.y1)
    }
}

// เท้าขยับจากภาพก่อนหน้าเท่าไร (เท่าของขนาดตัว วิธีเดียวกับ buildMovement) และคำอธิบาย
// เกณฑ์ "เคลื่อนที่" = เกณฑ์ตั้งต้นของ buildMovement (ในกราฟอาจใช้เกณฑ์ที่วัดจากการสั่นของภาพแทน)
const describeMove = (prevBox, box) => {
    if (!prevBox || !box) return { movedBody: null, movement: null }
    const d = step(prevBox, box)
    return {
        movedBody: Math.round(d * 100) / 100,
        movement: d < 0.1 ? 'still' : d < MOVE_DEFAULTS.defaultThreshold ? 'slight' : 'moving'
    }
}

export {
    METHOD, TRACK_DEFAULTS, BOUT_DEFAULTS, MOVE_DEFAULTS,
    matchScore, matchTarget, trackTarget, seedState, stepTarget, stepCowIds, buildBouts, summarizeBouts, buildMovement, movementWithin,
    describePosition, describeMove
}
