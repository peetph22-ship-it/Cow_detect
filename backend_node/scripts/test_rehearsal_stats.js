// ทดสอบตัวเลขของรายงานซ้อม (ฟังก์ชันล้วน): node backend_node/scripts/test_rehearsal_stats.js
const assert = require('assert')
const { CRITERIA, coverage, percentile, summarizeSeconds, cameraBreakdown, judge } = require('../app/services/rehearsalStats')

const from = new Date('2026-11-22T03:00:00Z')  // 10:00 เวลาไทย
const to = new Date('2026-11-22T04:00:00Z')    // 11:00 เวลาไทย
const every = (startSec, stepSec, n) => Array.from({ length: n }, (_, i) => new Date(from.getTime() + (startSec + i * stepSec) * 1000))

// ครบทุกภาพ (ทุก 60 วินาที เริ่มวินาทีที่ 30)
let c = coverage(every(30, 60, 60), from, to, 60)
assert.strictEqual(c.count, 60)
assert.strictEqual(c.expected, 60)
assert.strictEqual(c.pct, 100)
assert.strictEqual(c.window_min, 60)
assert.ok(c.longest_gap.min <= 1, 'ห่างกันไม่เกิน 1 นาที')
assert.deepStrictEqual(c.missing_gaps, [])

// ขาด 2 ภาพติดกัน -> ช่วงที่ขาด 1 ช่วง ขาด 2 ภาพ
const holes = every(30, 60, 60).filter((_, i) => i !== 20 && i !== 21)
c = coverage(holes, from, to, 60)
assert.strictEqual(c.count, 58)
assert.strictEqual(c.pct, 96.7)
assert.strictEqual(c.missing_gaps.length, 1)
assert.strictEqual(c.missing_gaps[0].missing, 2)
assert.strictEqual(c.longest_gap.min, 3)

// ไม่มีข้อมูลเลย = ขาดทั้งช่วง (นับเท่าจำนวนที่ควรได้)
c = coverage([], from, to, 60)
assert.strictEqual(c.count, 0)
assert.strictEqual(c.pct, 0)
assert.strictEqual(c.longest_gap.min, 60)
assert.strictEqual(c.missing_gaps.length, 1)
assert.strictEqual(c.missing_gaps[0].missing, 60)

// ช่วงติดขอบต้น: ภาพแรกมาวินาทีที่ 150 = ขาด 2 ภาพแรก
c = coverage(every(150, 60, 58), from, to, 60)
assert.strictEqual(c.missing_gaps[0].missing, 2)
assert.strictEqual(c.missing_gaps[0].from.getTime(), from.getTime())

// ค่านอกช่วงไม่นับ, ไม่เรียงก็ได้, รับ string ได้
c = coverage([new Date(to.getTime() + 1000), new Date(from.getTime() - 1000), every(90, 60, 1)[0].toISOString(), every(30, 60, 1)[0]], from, to, 60)
assert.strictEqual(c.count, 2)

// เซ็นเซอร์ทุก 15 วินาที 1 ชม. = 240 ค่า
c = coverage(every(5, 15, 240), from, to, 15)
assert.strictEqual(c.expected, 240)
assert.strictEqual(c.pct, 100)

// percentile / สรุปเวลา
assert.strictEqual(percentile([4, 1, 3, 2], 0.5), 2.5)
assert.ok(Math.abs(percentile([1, 2, 3, 4], 0.9) - 3.7) < 1e-9)
assert.strictEqual(percentile([], 0.5), null)
let s = summarizeSeconds([24000, 25000, null, 26000, 'x', -5, undefined, '', 40000])
assert.deepStrictEqual(s, { n: 4, median: 25.5, p90: 35.8, max: 40 })
assert.strictEqual(summarizeSeconds([null, null, 30000]).median, 30, 'null ไม่ใช่ 0 วินาที')
assert.deepStrictEqual(summarizeSeconds([undefined, null]), { n: 0, median: null, p90: null, max: null })

// แยกภาพที่หาย
let b = cameraBreakdown({ expected: 60, processed: 55, received: 58 })
assert.strictEqual(b.busy_or_error, 3)
assert.strictEqual(b.lost, 2)
assert.strictEqual(b.lost_or_busy, 5)
assert.strictEqual(b.busy_pct, 5.2)
b = cameraBreakdown({ expected: 60, processed: 55 })
assert.strictEqual(b.busy_pct, null)
assert.strictEqual(b.lost_or_busy, 5)
assert.strictEqual(cameraBreakdown({ expected: 60, processed: 61, received: 60 }).busy_or_error, 0)

// ตัดสินตามเกณฑ์
const good = {
    window_min: 60,
    sensor: coverage(every(5, 15, 240), from, to, 15),
    camera: coverage(every(30, 60, 60), from, to, 60),
    breakdown: cameraBreakdown({ expected: 60, processed: 59, received: 60 }),
    processing: { model: summarizeSeconds([24000, 25000, 26000]) }
}
let checks = judge(good)
assert.deepStrictEqual(checks.map(x => x.key), ['window', 'sensor', 'camera', 'processing', 'busy'])
assert.ok(checks.every(x => x.ok === true), JSON.stringify(checks))

checks = judge({ ...good, processing: { model: summarizeSeconds([41000, 42000]) } })
assert.strictEqual(checks.find(x => x.key === 'processing').ok, false)
checks = judge({ ...good, breakdown: cameraBreakdown({ expected: 60, processed: 59 }) })
assert.strictEqual(checks.find(x => x.key === 'busy').ok, null, 'ไม่ได้เปิดโหมดเก็บทุกภาพ = ตัดสินไม่ได้')
checks = judge({ ...good, window_min: 45 })
assert.strictEqual(checks.find(x => x.key === 'window').ok, false)
// หลุด 15 นาทีพอดี = ไม่ผ่าน (ระบบนับเป็นขาดการติดต่อ)
const sensorGap = coverage(every(5, 15, 240).filter(t => t < new Date(from.getTime() + 20 * 60e3) || t >= new Date(from.getTime() + 35 * 60e3 + 5000)), from, to, 15)
assert.ok(sensorGap.longest_gap.min >= CRITERIA.maxGapMin)
assert.strictEqual(judge({ ...good, sensor: sensorGap }).find(x => x.key === 'sensor').ok, false)
checks = judge({ ...good, processing: { model: summarizeSeconds([]) } })
assert.strictEqual(checks.find(x => x.key === 'processing').ok, null)

console.log('rehearsal_stats_test: all passed')
