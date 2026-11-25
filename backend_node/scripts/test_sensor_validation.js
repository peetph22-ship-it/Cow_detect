// ทดสอบการเทียบเซ็นเซอร์กับเครื่องอ้างอิง (ฟังก์ชันล้วน): node backend_node/scripts/test_sensor_validation.js
const assert = require('assert')
const { pairReadings, errorStats, compareSensor } = require('../app/services/sensorValidation')

const T0 = Date.parse('2026-11-30T03:00:00Z')
const at = (s) => T0 + s * 1000

// กล่องวัดทุก 15 วิ: อุณหภูมิสูงกว่าจริง +0.3 °C ความชื้นต่ำกว่า −2 % (bias คงที่)
const truth = (s) => ({ T: 28 + 4 * Math.sin(s / 7200), RH: 70 - 10 * Math.sin(s / 7200) })
const sys = []
for (let s = 0; s < 24 * 3600; s += 15) sys.push({ t: at(s), temperature_c: truth(s).T + 0.3, humidity_pct: truth(s).RH - 2 })
// จดค่าอ้างอิงทุกชั่วโมง (นาฬิกาคลาด 20 วิ) + 1 ค่าตอนกล่องปิด
const ref = []
for (let h = 0; h < 24; h++) ref.push({ t: at(h * 3600 + 20), temperature_c: truth(h * 3600 + 20).T, humidity_pct: truth(h * 3600 + 20).RH })
ref.push({ t: at(30 * 3600), temperature_c: 25, humidity_pct: 80 })

const p = pairReadings(ref, sys, 60)
assert.strictEqual(p.pairs.length, 24); assert.strictEqual(p.unmatched.length, 1)
assert.ok(p.pairs.every(x => x.n >= 6 && x.n <= 9), 'about 8 box readings within ±60 s (6 at the very start)')

const r = compareSensor(ref, sys)
assert.ok(Math.abs(r.temperature_c.bias - 0.3) < 0.02, `T bias ${r.temperature_c.bias}`)
assert.ok(Math.abs(r.temperature_c.mae - 0.3) < 0.02)
assert.ok(Math.abs(r.humidity_pct.bias + 2) < 0.05, `RH bias ${r.humidity_pct.bias}`)
assert.ok(r.temperature_c.r > 0.99, 'a constant offset keeps r near 1')
assert.ok(Math.abs(r.temperature_c.slope - 1) < 0.02)
assert.ok(r.thi.n === 24 && r.thi.mae > 0 && r.thi.mae < 1, `THI MAE ${r.thi.mae}`)
assert.ok(r.risk_level_agreement_pct >= 80, `risk agreement ${r.risk_level_agreement_pct}`)
assert.strictEqual(r.unmatched, 1); assert.strictEqual(r.rows.length, 24)

// ค่าคงที่ (อ้างอิงไม่เปลี่ยน) = คำนวณ r ไม่ได้ แต่ bias/MAE ยังได้
const flat = errorStats([[25.2, 25], [25.4, 25], [25.0, 25]])
assert.strictEqual(flat.r, null); assert.strictEqual(flat.bias, 0.2); assert.strictEqual(flat.max_abs, 0.4)
assert.deepStrictEqual(errorStats([]), { n: 0 })

console.log('test_sensor_validation: all passed')
