/**
 * เทียบผลของระบบ (ภาพนิ่งทุก N วินาที) กับคำตอบที่คนจดจากวิดีโอ (ต่อเนื่อง)
 * ฟังก์ชันล้วน ไม่แตะฐานข้อมูล · เทสต์: scripts/test_video_validation.js · ใช้ผ่าน scripts/compare_video.js
 *
 * คำตอบจากวิดีโอ = ช่วงพฤติกรรม [{start, end, behavior}] (ms) จากไฟล์จดเวลาที่ท่าเปลี่ยน
 * ผลของระบบ   = ท่าของวัวเป้าหมายต่อภาพ [{t, behavior}] (ms)
 * ท่า: lying / standing / feeding (ดื่มรวมกับยืน) / not_visible
 *
 * แยกความคลาดเคลื่อน 2 แหล่ง:
 *   1) จากรอบถ่าย: สุ่มคำตอบจากวิดีโอทุก N วิ (เหมือนระบบที่โมเดลไม่ผิดเลย) แล้วเทียบกับคำตอบต่อเนื่อง
 *   2) จากโมเดล/การติดตาม: ผลของระบบจริงที่รอบเดียวกัน เทียบกับคำตอบ
 */
const { buildBouts } = require('./cowTracking')

const BEHAVIORS = ['lying', 'standing', 'feeding']
const ALIASES = {
    lying: 'lying', 'lying down': 'lying', lie: 'lying', 'นอน': 'lying',
    standing: 'standing', stand: 'standing', 'ยืน': 'standing', drinking: 'standing', drink: 'standing', 'ดื่ม': 'standing', 'ดื่มน้ำ': 'standing',
    feeding: 'feeding', eating: 'feeding', eat: 'feeding', 'กิน': 'feeding', 'กินอาหาร': 'feeding',
    not_visible: 'not_visible', 'not visible': 'not_visible', hidden: 'not_visible', 'ไม่เห็น': 'not_visible', 'ไม่เห็นในภาพ': 'not_visible',
    end: 'end', 'จบ': 'end'
}
const round1 = (x) => Math.round(x * 10) / 10
const round3 = (x) => Math.round(x * 1000) / 1000

const normBehavior = (v) => ALIASES[String(v || '').trim().toLowerCase()] || null

/**
 * แถวจดเวลา [{t (ms), behavior}] -> ช่วงต่อเนื่อง แถวสุดท้ายต้องเป็น end (เวลาจบการดูวิดีโอ)
 * @returns {{intervals: Array<{start, end, behavior}>, errors: string[]}}
 */
const toIntervals = (rows) => {
    const errors = []
    const r = rows.map((x, i) => ({ ...x, line: x.line ?? i + 1, behavior: normBehavior(x.behavior) }))
    r.forEach(x => { if (!x.behavior) errors.push(`บรรทัด ${x.line}: ไม่รู้จักท่านี้ (ใช้ lying / standing / feeding / not_visible / end)`) })
    for (let i = 1; i < r.length; i++) if (r[i].t <= r[i - 1].t) errors.push(`บรรทัด ${r[i].line}: เวลาต้องมากกว่าบรรทัดก่อนหน้า`)
    if (r.length && r[r.length - 1].behavior !== 'end') errors.push('แถวสุดท้ายต้องเป็น end (เวลาที่หยุดดูวิดีโอ)')
    if (errors.length) return { intervals: [], errors }
    const intervals = []
    for (let i = 0; i < r.length - 1; i++) {
        if (r[i].behavior === 'end') { errors.push(`บรรทัด ${r[i].line}: end ต้องอยู่แถวสุดท้ายเท่านั้น`); continue }
        intervals.push({ start: r[i].t, end: r[i + 1].t, behavior: r[i].behavior })
    }
    return { intervals, errors }
}

const behaviorAt = (intervals, t) => {
    for (const iv of intervals) if (t >= iv.start && t < iv.end) return iv.behavior
    return null
}

// นาทีของแต่ละท่าในช่วง [from, to)
const budgetOfIntervals = (intervals, from, to) => {
    const m = { lying: 0, standing: 0, feeding: 0, not_visible: 0 }
    for (const iv of intervals) {
        const s = Math.max(iv.start, from), e = Math.min(iv.end, to)
        if (e > s) m[iv.behavior] = (m[iv.behavior] || 0) + (e - s) / 60e3
    }
    for (const k of Object.keys(m)) m[k] = round1(m[k])
    return m
}

// จำนวนครั้ง (รอบ) ของแต่ละท่า: ช่วงติดกันที่เป็นท่าเดียวกันนับเป็นครั้งเดียว ไม่นับช่วงไม่เห็น
const boutCounts = (intervals) => {
    const c = { lying: 0, standing: 0, feeding: 0 }
    let prev = null
    for (const iv of intervals) {
        if (iv.behavior === 'not_visible') continue
        if (iv.behavior !== prev) c[iv.behavior] = (c[iv.behavior] || 0) + 1
        prev = iv.behavior
    }
    return c
}

// ช่วงเวลาที่ทั้งสองฝั่งมีข้อมูล
const commonWindow = (intervals, obs) => {
    if (!intervals.length || !obs.length) return null
    const from = Math.max(intervals[0].start, obs[0].t)
    const to = Math.min(intervals[intervals.length - 1].end, obs[obs.length - 1].t)
    return to > from ? { from, to } : null
}

// เก็บภาพทีละ stepSec (เหมือนตั้งรอบถ่ายภาพห่างขึ้น) จากภาพที่ถี่กว่า
const subsample = (obs, stepSec) => {
    const out = []
    let next = -Infinity
    const tol = 1000   // ภาพจริงไม่ตรงวินาทีเป๊ะ
    for (const o of obs) {
        if (o.t >= next - tol) { out.push(o); next = o.t + stepSec * 1000 }
    }
    return out
}

// นาทีของแต่ละท่า นับเฉพาะส่วนที่ทับกับช่วงที่วิดีโอเห็นวัว (ranges)
// ช่วงที่วิดีโอไม่มีหรือไม่เห็นวัว (เปลี่ยนแบต, คนบัง) จึงไม่ถูกนับเป็นความคลาดของระบบ
const budgetWithin = (intervals, ranges) => {
    const m = { lying: 0, standing: 0, feeding: 0, not_visible: 0 }
    for (const iv of intervals) {
        for (const r of ranges) {
            const s = Math.max(iv.start, r.start), e = Math.min(iv.end, r.end)
            if (e > s) m[iv.behavior] = (m[iv.behavior] || 0) + (e - s) / 60e3
        }
    }
    for (const k of Object.keys(m)) m[k] = round1(m[k])
    return m
}

// ผลของระบบ -> ช่วงพฤติกรรม (วิธีเดียวกับหน้าเว็บ) -> นาทีต่อท่า + จำนวนครั้ง
const systemSummary = (obs, ranges, intervalSec) => {
    const { bouts } = buildBouts(obs.map(o => ({ observedAt: new Date(o.t).toISOString(), behavior: o.behavior })), { intervalSec })
    const ivs = bouts.map(b => ({ start: Date.parse(b.start), end: Date.parse(b.end), behavior: b.behavior }))
    return { minutes: budgetWithin(ivs, ranges), bouts: boutCounts(ivs) }
}

const errorsVsTruth = (minutes, truth) => Object.fromEntries(BEHAVIORS.map(k => {
    const diff = round1((minutes[k] || 0) - (truth[k] || 0))
    return [k, { minutes: minutes[k] || 0, truth: truth[k] || 0, diff, pct: truth[k] ? round1((diff / truth[k]) * 100) : null }]
}))

/**
 * ทายถูกกี่ % ต่อภาพ (เทียบท่าจากวิดีโอ ณ เวลาของภาพนั้น)
 * ไม่นับภาพที่วิดีโอไม่เห็นวัว · ระบบบอก "ไม่เห็น" แต่วิดีโอเห็น = นับเป็นผิด และรายงานแยก
 */
const snapshotAgreement = (obs, intervals) => {
    const cats = [...BEHAVIORS, 'not_visible']
    const matrix = Object.fromEntries(BEHAVIORS.map(g => [g, Object.fromEntries(cats.map(c => [c, 0]))]))
    let n = 0, correct = 0, missed = 0
    for (const o of obs) {
        const truth = behaviorAt(intervals, o.t)
        if (!truth || truth === 'not_visible') continue
        const sys = BEHAVIORS.includes(o.behavior) ? o.behavior : 'not_visible'
        matrix[truth][sys]++
        n++
        if (sys === truth) correct++
        if (sys === 'not_visible') missed++
    }
    // Cohen's kappa เฉพาะภาพที่ระบบเห็นวัว (3 ท่า)
    const pairs = BEHAVIORS.flatMap(g => BEHAVIORS.map(s => ({ g, s, k: matrix[g][s] })))
    const N = pairs.reduce((a, p) => a + p.k, 0)
    let kappa = null
    if (N > 0) {
        const po = BEHAVIORS.reduce((a, c) => a + matrix[c][c], 0) / N
        const pe = BEHAVIORS.reduce((a, c) => {
            const row = BEHAVIORS.reduce((x, s) => x + matrix[c][s], 0) / N
            const col = BEHAVIORS.reduce((x, g) => x + matrix[g][c], 0) / N
            return a + row * col
        }, 0)
        kappa = pe < 1 ? round3((po - pe) / (1 - pe)) : null
    }
    return { n, accuracy_pct: n ? round1((correct / n) * 100) : null, system_not_visible_pct: n ? round1((missed / n) * 100) : null, kappa, confusion: matrix }
}

/**
 * รายงานเทียบทั้งหมด
 * @param {Array<{t, behavior}>} obs  ผลของระบบ (ms, เรียงเวลา)
 * @param {Array<{start, end, behavior}>} intervals  คำตอบจากวิดีโอ
 * @param {number[]} steps  รอบถ่ายภาพที่จะลอง (วินาที) ตัวแรกควรเป็นรอบจริง
 */
const compare = (obs, intervals, steps = [15, 30, 60, 120, 300]) => {
    const o = [...obs].filter(x => Number.isFinite(x.t)).sort((a, b) => a.t - b.t).map(x => ({ t: x.t, behavior: normBehavior(x.behavior) || 'not_visible' }))
    const win = commonWindow(intervals, o)
    if (!win) return { error: 'ช่วงเวลาของวิดีโอกับผลของระบบไม่ซ้อนกัน (ตรวจเวลาเริ่มวิดีโอ / --video-start)' }
    const inWin = o.filter(x => x.t >= win.from && x.t < win.to)
    // ช่วงที่วิดีโอเห็นวัว (ภายในช่วงที่ซ้อนกัน)
    const ranges = intervals.filter(iv => iv.behavior !== 'not_visible')
        .map(iv => ({ start: Math.max(iv.start, win.from), end: Math.min(iv.end, win.to) })).filter(r => r.end > r.start)
    const truth = budgetOfIntervals(intervals, win.from, win.to)
    const truthBouts = boutCounts(intervals.filter(iv => iv.end > win.from && iv.start < win.to))
    const sensitivity = steps.map(sec => {
        const sys = subsample(inWin, sec)
        const sysSum = systemSummary(sys, ranges, sec)
        // รอบถ่ายอย่างเดียว: สุ่มคำตอบจากวิดีโอทุก sec วินาที (เหมือนโมเดลไม่ผิดเลย)
        const ideal = []
        for (let t = win.from; t < win.to; t += sec * 1000) ideal.push({ t, behavior: behaviorAt(intervals, t) || 'not_visible' })
        const idealSum = systemSummary(ideal, ranges, sec)
        return {
            interval_sec: sec,
            snapshots: sys.length,
            system: { ...errorsVsTruth(sysSum.minutes, truth), bouts: sysSum.bouts },
            sampling_only: { ...errorsVsTruth(idealSum.minutes, truth), bouts: idealSum.bouts }
        }
    })
    return {
        window: { from: new Date(win.from).toISOString(), to: new Date(win.to).toISOString(), minutes: round1((win.to - win.from) / 60e3),
            video_visible_minutes: round1(ranges.reduce((a, r) => a + (r.end - r.start), 0) / 60e3) },
        truth: { minutes: truth, bouts: truthBouts },
        agreement: snapshotAgreement(inWin, intervals),
        sensitivity
    }
}

module.exports = { BEHAVIORS, normBehavior, toIntervals, behaviorAt, budgetOfIntervals, boutCounts, subsample, snapshotAgreement, compare }
