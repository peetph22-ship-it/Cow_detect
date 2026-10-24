// ทดสอบ services/lyingThiAnalysisService.runBrokenLineAnalysis ด้วยข้อมูลจำลอง: node backend_node/scripts/test_lying_thi_analysis.js
const assert = require('assert')
const path = require('path')
const dbPath = require.resolve(path.resolve(__dirname, '../app/config/db'))
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async () => ({ rows: [] }) } }
const { runBrokenLineAnalysis } = require('../app/services/lyingThiAnalysisService')
let seed = 7
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd())
// THI ขึ้นลงตามชั่วโมง + ต่างกันรายวัน, % นอนขึ้นกับชั่วโมงของวัน (+ ผลของ THI ถ้ามี)
const make = (days, effect) => {
  const pts = []
  for (let d = 0; d < days; d++) {
    const dayShift = (rnd() - 0.5) * 8
    for (let h = 0; h < 24; h++) {
      const thi = 72 + 5 * Math.sin((h - 9) / 24 * 2 * Math.PI) + dayShift + gauss()
      let lying = 55 + 15 * Math.cos(h / 24 * 2 * Math.PI) + gauss() * 8
      if (effect) lying += thi > 76 ? -4 * (thi - 76) : 0
      pts.push({ day_key: `2026-11-${String(d + 1).padStart(2, '0')}`, hour_of_day: h, thi, lying_pct: lying })
    }
  }
  return pts
}
let t0 = Date.now(), r = runBrokenLineAnalysis(make(30, false))
console.log('noise 30d:', r.breakpoint_found, r.broken_line && r.broken_line.slope_change_ci95, `${Date.now() - t0} ms`)
assert.strictEqual(r.breakpoint_found, false, 'pure noise must not report a breakpoint')
t0 = Date.now(); r = runBrokenLineAnalysis(make(30, true))
console.log('effect 30d:', r.breakpoint_found, r.broken_line.breakpoint_thi, r.broken_line.ci95_low, r.broken_line.ci95_high, 'slope', r.broken_line.slope_after_per_thi, r.broken_line.slope_after_ci95, `${Date.now() - t0} ms`)
assert.ok(r.breakpoint_found && Math.abs(r.broken_line.breakpoint_thi - 76) <= 1.5, 'true breakpoint ~76 found')
assert.ok(r.broken_line.slope_after_per_thi < -2.5, 'slope not shrunk much (true -4)')
r = runBrokenLineAnalysis(make(5, true))
assert.strictEqual(r.sufficient_data, false); assert.ok(/14 วัน/.test(r.reason_th))
r = runBrokenLineAnalysis(make(30, true), { auditedCount: 3 })
assert.ok(/30 ภาพ/.test(r.camera_accuracy_note_th))
console.log('lying_thi_analysis_test: all passed')
