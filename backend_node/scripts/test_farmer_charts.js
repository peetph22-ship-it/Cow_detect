// ทดสอบข้อมูลกราฟหน้าเกษตรกร: node backend_node/scripts/test_farmer_charts.js
const assert = require('assert')
const path = require('path')
const dbPath = require.resolve(path.resolve(__dirname, '../app/config/db'))
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async () => { throw new Error('no db in test') }, pool: { on() {} } } }
const { hourlyThi, weekBars } = require('../app/services/farmerCharts')

const H = 3600e3
const end = new Date('2026-11-17T06:30:00Z') // 13:30 น. เวลาไทย
const bucket = (iso, thi) => ({ t: new Date(iso), thi, temp: 30, hum: 70 })

// ไม่มีข้อมูล -> ไม่มีจุด
assert.deepStrictEqual(hourlyThi([], end, 'default'), [])
assert.deepStrictEqual(hourlyThi([bucket('2026-11-17T06:00:00Z', 70)], null, 'default'), [])

const pts = hourlyThi([
    bucket('2026-11-17T06:00:00Z', 70), bucket('2026-11-17T06:05:00Z', 72), // ชั่วโมงล่าสุด เฉลี่ย 71
    bucket('2026-11-16T07:00:00Z', 80),   // ชั่วโมงแรกของช่วง (13:00 เมื่อวาน)
    bucket('2026-11-16T06:55:00Z', 99)    // ก่อนช่วง: ต้องไม่ถูกนับ
], end, 'default')
assert.strictEqual(pts.length, 24)
assert.strictEqual(pts[23].t, '2026-11-17T06:00:00.000Z')
assert.strictEqual(pts[23].thi, 71)
assert.strictEqual(pts[23].samples, 2)
assert.strictEqual(pts[0].t, '2026-11-16T07:00:00.000Z')
assert.strictEqual(pts[0].thi, 80)
assert.ok(pts[0].level && pts[0].level !== 'normal')
// ชั่วโมงไม่มีข้อมูลเป็น null ไม่ใช่ 0
assert.strictEqual(pts[10].thi, null)
assert.strictEqual(pts[10].level, null)
assert.ok(!pts.some(p => p.thi === 99))
// windowEnd ตรงชั่วโมงเต็มพอดี: ชั่วโมงล่าสุดคือชั่วโมงก่อนหน้า
const exact = hourlyThi([bucket('2026-11-17T05:59:00Z', 75)], new Date('2026-11-17T06:00:00Z'), 'default')
assert.strictEqual(exact[23].t, '2026-11-17T05:00:00.000Z')
assert.strictEqual(exact[23].thi, 75)

// 7 วัน: ชั่วโมงแต่ละระดับไม่ซ้อนกัน
const days = Array.from({ length: 9 }, (_, i) => ({ date: `2026-11-${String(9 + i).padStart(2, '0')}`, is_today: i === 8, has_data: false }))
days[8] = { date: '2026-11-17', is_today: true, has_data: true, watch_hours: 6, stress_hours: 4, severe_hours: 1.5, data_hours: 13.5, coverage_pct: 100, avg_thi: 74.2, max_thi: 81, daily_mean_level: 'mild' }
const w = weekBars(days)
assert.strictEqual(w.length, 7)
assert.strictEqual(w[0].date, '2026-11-11')
assert.deepStrictEqual(w[0], { date: '2026-11-11', is_today: false, has_data: false })
assert.strictEqual(w[6].mild_hours, 2)
assert.strictEqual(w[6].moderate_hours, 2.5)
assert.strictEqual(w[6].severe_hours, 1.5)
assert.strictEqual(w[6].risk_level, 'mild')

console.log('farmer charts: ok')
