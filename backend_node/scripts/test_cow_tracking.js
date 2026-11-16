// ทดสอบ services/cowTracking (ติดตามวัวเป้าหมาย + ช่วงพฤติกรรม) ด้วยข้อมูลจำลอง: node backend_node/scripts/test_cow_tracking.js
const assert = require('assert')
const { trackTarget, matchTarget, buildBouts, summarizeBouts, buildMovement, movementWithin } = require('../app/services/cowTracking')

const T0 = Date.parse('2026-11-11T17:00:00Z')   // 00:00 เวลาไทย
const at = (min) => new Date(T0 + min * 60e3).toISOString()
let seed = 11
const jit = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return (seed / 2147483648 - 0.5) * 0.01 }
const box = (cls, cx, cy, w, h) => ({ cls, x1: cx - w / 2 + jit(), y1: cy - h / 2 + jit(), x2: cx + w / 2 + jit(), y2: cy + h / 2 + jit() })
const lie = (cx, cy) => box('lying down', cx, cy, 0.18, 0.15)
const stand = (cls, cx, cy) => box(cls, cx, cy, 0.12, 0.30)
const lerp = (a, b, f) => a + (b - a) * f

// --- 1) จำลอง 6 ชม. ภาพทุก 1 นาที: วัวเป้าหมาย + วัวข้างตัวนอนติดกันตลอด + วัวอีกตัวยืนมุมขวาบน
const frames = []
const truth = []
for (let m = 0; m < 360; m++) {
    let target = null
    let beh
    if (m < 90) { target = lie(0.49, 0.625); beh = 'lying' }
    else if (m < 110) { target = stand('standing', 0.50, 0.55); beh = 'standing' }
    else if (m < 140) { const f = (m - 110) / 30; target = stand('standing', lerp(0.50, 0.20, f), lerp(0.55, 0.20, f)); beh = 'standing' }   // เดินไปรางอาหาร
    else if (m < 200) { target = stand('feeding', 0.20, 0.20); beh = 'feeding' }
    else if (m < 205) { target = stand('drinking', 0.22, 0.22); beh = 'drinking' }
    else if (m < 235) { const f = (m - 205) / 30; target = stand('standing', lerp(0.22, 0.49, f), lerp(0.22, 0.55, f)); beh = 'standing' }   // เดินกลับ
    else { target = lie(0.48, 0.63); beh = 'lying' }
    if (m === 50 || m === 60 || (m >= 300 && m <= 302)) { target = null; beh = 'not_visible' }   // ถูกบัง
    const boxes = [lie(0.69, 0.625), stand('standing', 0.85, 0.20)]
    if (target) boxes.splice(m % 2, 0, target)   // ลำดับกรอบในภาพไม่คงที่
    frames.push({ observedAt: at(m), telemetryId: 1000 + m, boxes })
    truth.push(beh)
}
const { observations, lostAt } = trackTarget(frames, { box: lie(0.49, 0.625), at: at(0) })
assert.strictEqual(lostAt, null)
assert.strictEqual(observations.length, 360)
const wrong = observations.filter((o, i) => o.behavior !== truth[i]).map((o, i) => i)
assert.deepStrictEqual(wrong, [], 'every frame tracked as the target cow, no switch to the neighbour')
assert.strictEqual(observations[50].box, null); assert.strictEqual(observations[50].matchScore, null)
assert.ok(observations[0].matchScore > 0.8 && observations[0].telemetryId === 1000 && observations[0].method === 'position-v2')

const { bouts, intervalSec } = buildBouts(observations)
assert.strictEqual(intervalSec, 60)
assert.deepStrictEqual(bouts.map(b => [b.behavior, b.durationMin]), [
    ['lying', 90],        // หายจากภาพ 1 ภาพ (นาที 50, 60) ไม่ตัดช่วง
    ['standing', 50],
    ['feeding', 60],
    ['standing', 35],     // ดื่ม 5 นาทีรวมกับยืน
    ['lying', 65],
    ['not_visible', 3],   // หาย 3 ภาพติดกัน = ตัดช่วง
    ['lying', 57]
])
assert.strictEqual(bouts[0].start, new Date(T0 - 30e3).toISOString())
const day = summarizeBouts(bouts, at(0), at(360))
// ช่วงแรกเริ่มก่อนภาพแรกครึ่งรอบ (30 วิ) ซึ่งอยู่นอกช่วงที่สรุป จึงถูกตัด 0.5 นาที
assert.deepStrictEqual(day.minutes, { lying: 211.5, standing: 85, feeding: 60, drinking: 0, not_visible: 3 })
assert.deepStrictEqual(day.bouts, { lying: 3, standing: 2, feeding: 1, drinking: 0 })
assert.strictEqual(day.longestLyingMin, 89.5)   // รอบแรกถูกตัดที่ขอบช่วงเหมือนกัน

// --- 2) ตัดตามช่วงเวลา: ช่วงที่คร่อมขอบนับเฉพาะส่วนที่อยู่ในช่วง
// จุดเปลี่ยนท่าอยู่กึ่งกลางระหว่างภาพ: นอน→ยืน ที่นาที 89.5, ยืน→กิน ที่ 139.5
const part = summarizeBouts(bouts, at(60), at(150))
assert.deepStrictEqual([part.minutes.lying, part.minutes.standing, part.minutes.feeding], [29.5, 50, 10.5])
assert.deepStrictEqual(part.bouts, { lying: 1, standing: 1, feeding: 1, drinking: 0 })

// --- 3) แยกท่าดื่มได้ถ้าต้องการ
const withDrink = buildBouts(observations, { mergeDrinking: false }).bouts
assert.ok(withDrink.some(b => b.behavior === 'drinking' && b.durationMin === 5))

// --- 4) กรอบ 2 กรอบใกล้พอ ๆ กัน = ไม่เดา
const prev = { x1: 0.4, y1: 0.55, x2: 0.58, y2: 0.70 }
const amb = matchTarget(prev, [{ cls: 'lying down', x1: 0.40, y1: 0.55, x2: 0.49, y2: 0.70 }, { cls: 'standing', x1: 0.49, y1: 0.55, x2: 0.58, y2: 0.70 }])
assert.strictEqual(amb.box, null); assert.strictEqual(amb.reason, 'ambiguous')
assert.strictEqual(matchTarget(prev, [{ cls: 'standing', x1: 0.85, y1: 0.1, x2: 0.95, y2: 0.4 }]).reason, 'none')

// --- 5) หายจากภาพนานเกิน 15 นาที = หลุดการติดตาม หยุดสร้างแถว
const lostFrames = []
for (let m = 0; m < 40; m++) lostFrames.push({ observedAt: at(m), boxes: m < 10 ? [lie(0.49, 0.625)] : [] })
const lost = trackTarget(lostFrames, { box: lie(0.49, 0.625), at: at(0) })
assert.strictEqual(lost.lostAt, at(25))
assert.strictEqual(lost.observations.length, 25)
assert.strictEqual(lost.observations.filter(o => o.behavior === 'not_visible').length, 15)

// --- 6) กล้องหลุด 30 นาที: ไม่ลากช่วงข้าม และไม่นับเป็นเวลาที่มีข้อมูล
const gapObs = []
for (let m = 0; m < 10; m++) gapObs.push({ observedAt: at(m), behavior: 'lying' })
for (let m = 40; m < 50; m++) gapObs.push({ observedAt: at(m), behavior: 'lying' })
const gap = buildBouts(gapObs)
assert.deepStrictEqual(gap.bouts.map(b => b.durationMin), [10, 10])
assert.strictEqual(summarizeBouts(gap.bouts, at(-1), at(60)).coveredMin, 20)

// --- 7) หาย 1 ภาพระหว่างท่าต่างกัน = ไม่เดาว่าเป็นท่าไหน
const mixed = ['lying', 'lying', 'not_visible', 'standing', 'standing'].map((b, m) => ({ observedAt: at(m), behavior: b }))
assert.deepStrictEqual(buildBouts(mixed).bouts.map(b => b.behavior), ['lying', 'not_visible', 'standing'])

// --- 8) เดินเร็ว (ขยับเท่าความกว้างตัวต่อภาพ): ไม่ทำนายจะหลุด ทำนายทิศทางแล้วติดตามได้ตลอด
const walkSteps = [0, 0.04, 0.08, 0.12, 0.12, 0.12, 0.12, 0.12]
let wx = 0.15
const walkFrames = walkSteps.map((s, m) => { wx += s; return { observedAt: at(m), boxes: [stand('standing', wx, 0.45), lie(0.85, 0.85)] } })
const walk = trackTarget(walkFrames, { box: stand('standing', 0.15, 0.45), at: at(0) })
assert.deepStrictEqual(walk.observations.map(o => o.behavior), Array(8).fill('standing'), 'fast walk tracked with prediction')
const prevWalk = stand('standing', 0.5, 0.45)
assert.strictEqual(matchTarget(prevWalk, [stand('standing', 0.62, 0.45)]).reason, 'none', 'same step is lost without prediction')

// --- 9) การเคลื่อนที่: เกณฑ์จากการสั่นตอนนอน, ยืนนิ่งไม่นับ, เดินนับ, ลุกจากนอนไม่นับ
const mv = []
for (let m = 0; m < 60; m++) mv.push({ observedAt: at(m), behavior: 'lying', box: lie(0.49, 0.625) })
for (let m = 60; m < 80; m++) mv.push({ observedAt: at(m), behavior: 'standing', box: stand('standing', 0.30, 0.55) })        // ยืนนิ่ง (ลุกที่นาที 60 ไม่นับ)
for (let m = 80; m < 85; m++) mv.push({ observedAt: at(m), behavior: 'standing', box: stand('standing', 0.30 + 0.15 * (m - 79), 0.55) })   // เดิน 5 ภาพ
for (let m = 85; m < 100; m++) mv.push({ observedAt: at(m), behavior: 'feeding', box: stand('feeding', 1.05, 0.55) })          // กินนิ่ง
mv.push({ observedAt: at(100), behavior: 'lying', box: lie(0.70, 0.62) })   // ลงนอน กรอบเปลี่ยนรูป ไม่นับ
const move = buildMovement(mv)
assert.strictEqual(move.thresholdSource, 'measured')
assert.ok(move.thresholdBody >= 0.1 && move.thresholdBody < 0.25, `threshold from lying jitter: ${move.thresholdBody}`)
assert.deepStrictEqual(move.segments.map(s => [s.durationMin, s.start, s.end]), [[5, at(79), at(84)]])
assert.ok(Math.abs(move.segments[0].distanceBody - 5 * 0.15 / Math.hypot(0.12, 0.30)) < 0.3)
assert.deepStrictEqual(movementWithin(move.segments, at(60), at(85)), { movingMin: 5, distanceBody: move.segments[0].distanceBody, moves: 1 })
assert.strictEqual(movementWithin(move.segments, at(0), at(60)).movingMin, 0)
assert.strictEqual(buildMovement(mv.slice(55, 90)).thresholdSource, 'default', 'too little lying to measure jitter')

console.log('cow_tracking_test: all passed')
