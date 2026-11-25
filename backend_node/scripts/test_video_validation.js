// ทดสอบการเทียบผลระบบกับคำตอบจากวิดีโอ (ฟังก์ชันล้วน): node backend_node/scripts/test_video_validation.js
const assert = require('assert')
const V = require('../app/services/videoValidation')

const T0 = Date.parse('2026-12-07T01:00:00Z')
const at = (sec) => T0 + sec * 1000

// ---- คำตอบจากวิดีโอ: 2 ชม. นอน 50 นาที / ยืน 10 นาที (ลุกดื่มน้ำ 2 นาทีอยู่ในนั้น) / กิน 20 นาที / นอน 40 นาที ----
const rows = [
    { t: at(0), behavior: 'นอน' }, { t: at(3000), behavior: 'standing' }, { t: at(3300), behavior: 'drinking' },
    { t: at(3420), behavior: 'standing' }, { t: at(3600), behavior: 'กิน' }, { t: at(4800), behavior: 'lying' }, { t: at(7200), behavior: 'end' }
]
const { intervals, errors } = V.toIntervals(rows)
assert.deepStrictEqual(errors, [])
assert.strictEqual(intervals.length, 6)
assert.strictEqual(V.behaviorAt(intervals, at(3350)), 'standing', 'drinking counts as standing')
assert.deepStrictEqual(V.budgetOfIntervals(intervals, at(0), at(7200)), { lying: 90, standing: 10, feeding: 20, not_visible: 0 })
assert.deepStrictEqual(V.boutCounts(intervals), { lying: 2, standing: 1, feeding: 1 }, 'standing-drinking-standing is one standing bout')

// ไฟล์จดเวลาผิดรูปแบบ
assert.ok(V.toIntervals([{ t: at(0), behavior: 'sleep' }, { t: at(60), behavior: 'end' }]).errors[0].includes('ไม่รู้จัก'))
assert.ok(V.toIntervals([{ t: at(0), behavior: 'lying' }, { t: at(60), behavior: 'standing' }]).errors.some(e => e.includes('end')))
assert.ok(V.toIntervals([{ t: at(60), behavior: 'lying' }, { t: at(0), behavior: 'end' }]).errors.some(e => e.includes('มากกว่า')))

// ---- ระบบที่ไม่ผิดเลย ทุก 15 วิ: เวลารวมตรงกับวิดีโอ (คลาดไม่เกินครึ่งรอบต่อการเปลี่ยนท่า) ----
const perfect = []
for (let s = 0; s < 7200; s += 15) perfect.push({ t: at(s), behavior: V.behaviorAt(intervals, at(s)) })
let r = V.compare(perfect, intervals, [15, 60, 300])
assert.strictEqual(r.agreement.accuracy_pct, 100); assert.strictEqual(r.agreement.kappa, 1)
const s15 = r.sensitivity[0]
for (const k of V.BEHAVIORS) assert.ok(Math.abs(s15.system[k].diff) <= 0.5, `${k} diff ${s15.system[k].diff} at 15 s`)
assert.deepStrictEqual(s15.system.bouts, { lying: 2, standing: 1, feeding: 1 })
assert.deepStrictEqual(s15.system, s15.sampling_only, 'a perfect system equals pure sampling')
// รอบ 300 วิ: คลาดมากขึ้น (ยืน 10 นาทีเห็นแค่ 2 ภาพ)
assert.ok(Math.abs(r.sensitivity[2].system.standing.diff) >= Math.abs(s15.system.standing.diff))

// ---- ระบบจริง: ทายนอนเป็นยืน 10% ของภาพ + มองไม่เห็น 5% ----
const noisy = perfect.map((o, i) => ({ t: o.t, behavior: i % 20 === 7 ? 'not_visible' : (o.behavior === 'lying' && i % 10 === 3 ? 'standing' : o.behavior) }))
r = V.compare(noisy, intervals, [15, 60])
assert.ok(r.agreement.accuracy_pct < 100 && r.agreement.accuracy_pct > 85, `accuracy ${r.agreement.accuracy_pct}`)
assert.ok(r.agreement.system_not_visible_pct > 3 && r.agreement.system_not_visible_pct < 7)
assert.ok(r.agreement.kappa < 1 && r.agreement.kappa > 0.6, `kappa ${r.agreement.kappa}`)
assert.ok(r.sensitivity[0].system.standing.diff > 0, 'misclassified lying shows up as extra standing')
assert.ok(r.sensitivity[0].system.bouts.standing > 1, 'flicker adds false standing bouts')

// ---- ระบบเริ่ม/จบไม่ตรงวิดีโอ: ใช้เฉพาะช่วงที่ซ้อนกัน ----
r = V.compare(perfect.filter(o => o.t >= at(600)), intervals, [15])
assert.ok(Math.abs(r.window.minutes - 109.8) < 0.3, `window ${r.window.minutes}`)
assert.ok(V.compare(perfect, [{ start: at(9000), end: at(9500), behavior: 'lying' }]).error)

// ---- วิดีโอขาด 10 นาที (เปลี่ยนแบต) ระบบยังทายท่าในช่วงนั้น: ไม่นับเป็นความคลาด ----
const gapRows = [{ t: at(0), behavior: 'lying' }, { t: at(1200), behavior: 'not_visible' }, { t: at(1800), behavior: 'lying' }, { t: at(3000), behavior: 'end' }]
const gapIv = V.toIntervals(gapRows).intervals
const sysAllLying = []
for (let s = 0; s < 3000; s += 15) sysAllLying.push({ t: at(s), behavior: 'lying' })
r = V.compare(sysAllLying, gapIv, [15])
// ช่วงเทียบจบที่ภาพสุดท้ายของระบบ (49:45) จึงเห็นวัว 39.75 นาที ไม่ใช่ 40
assert.ok(Math.abs(r.window.video_visible_minutes - 39.8) < 0.11)
assert.strictEqual(r.truth.minutes.lying, r.window.video_visible_minutes)
assert.ok(Math.abs(r.sensitivity[0].system.lying.diff) <= 0.5, `gap not counted as error (${r.sensitivity[0].system.lying.diff})`)

// subsample: จาก 15 วิเหลือ 60 วิ = 1 ใน 4
assert.strictEqual(V.subsample(perfect, 60).length, 120)

console.log('test_video_validation: all passed')
