// ทดสอบตัวเลขฮาร์ดแวร์ของเปเปอร์ (ฟังก์ชันล้วน): node backend_node/scripts/test_hardware_stats.js
const assert = require('assert')
const { availability, heartbeatStats, sensorStats, frameStats, bandwidthPerDay } = require('../app/services/hardwareStats')

const T0 = Date.parse('2026-12-07T02:00:00Z')   // 09:00 เวลาไทย
const at = (sec) => new Date(T0 + sec * 1000)
const from = at(0), to = at(6 * 3600)             // ช่วง 6 ชม.

// ---- heartbeat ทุก 5 นาที, เน็ตหลุด 40 นาที (60–100 นาที), รีบูตเพราะ watchdog ที่นาที 200 ----
const hb = []
let up = 3600            // เปิดเครื่องก่อนเริ่มช่วง 1 ชม.
for (let m = 0; m < 360; m += 5) {
    if (m > 60 && m < 100) { up += 300; continue }
    if (m === 200) up = 120
    hb.push({ received_at: at(m * 60 + 30), health: { uptime_s: up, rssi: m < 180 ? -62 : -71, min_free_heap: 150000 - m, queue: m === 100 ? 160 : 0, reset_reason: m >= 200 ? 'watchdog' : 'power_on', i2c_recoveries: m > 300 ? 1 : 0, fw_version: '1.6.0', sensor_model: 'sht4x' } })
    up += 300
}
const h = heartbeatStats(hb, from, to)
assert.strictEqual(h.expected, 72)
assert.strictEqual(h.count, 65)
assert.strictEqual(h.reboots.count, 1, 'uptime dropped once')
assert.deepStrictEqual(h.reboots.by_reason, { watchdog: 1 })
assert.strictEqual(h.availability.outages.length, 1, 'one outage over 15 min')
assert.ok(h.availability.pct > 88 && h.availability.pct < 92, `availability ${h.availability.pct}`)
assert.deepStrictEqual([h.rssi.min, h.rssi.max], [-71, -62])
assert.strictEqual(h.queue_max, 160)
assert.strictEqual(h.i2c_recoveries_max, 1)
assert.deepStrictEqual(h.fw_versions, ['1.6.0']); assert.deepStrictEqual(h.sensor_models, ['sht4x'])

// เปิดเครื่องหลังเริ่มช่วงเวลา = นับเป็นรีบูต 1 ครั้ง (heartbeat แรกบอกว่าเพิ่งเปิดได้ 60 วิ)
const late = heartbeatStats([{ received_at: at(1800), health: { uptime_s: 60, reset_reason: 'power_on' } }], from, to)
assert.strictEqual(late.reboots.count, 1)

// รีบูตติดกัน: heartbeat แรกหลังบูตส่งตอน uptime 9 วิทุกครั้ง (uptime ไม่ลดลง แต่เปิดเครื่องใหม่หลัง heartbeat ก่อนหน้า) = 3 ครั้ง
// ข้อมูลจริง 27 พ.ย. ซ้อมรอบภาพ 15 วิ: 20:32:47, 20:40:35, 20:49:20 uptime 9 ทั้งหมด
const chain = heartbeatStats([
    { received_at: at(600), health: { uptime_s: 4000, reset_reason: 'power_on' } },
    { received_at: at(1200), health: { uptime_s: 9, reset_reason: 'watchdog' } },
    { received_at: at(1700), health: { uptime_s: 9, reset_reason: 'crash' } },
    { received_at: at(2200), health: { uptime_s: 9, reset_reason: 'watchdog' } },
    { received_at: at(2500), health: { uptime_s: 309, reset_reason: 'watchdog' } }
], from, to)
assert.strictEqual(chain.reboots.count, 3, `back-to-back reboots ${chain.reboots.count}`)
assert.deepStrictEqual(chain.reboots.by_reason, { watchdog: 2, crash: 1 })

// ไม่มี heartbeat เลย = ขาดการติดต่อทั้งช่วง
assert.ok(availability([], from, to).pct < 2)

// ---- ค่าเซ็นเซอร์ทุก 15 วิ: ช่วงเน็ตหลุด ค่ายังครบ (คิวในกล่อง) แต่ถึง server ช้า ----
const readings = []
for (let s = 0; s < 6 * 3600; s += 15) {
    const outage = s >= 3600 && s < 6000
    readings.push({ recorded_at: at(s), received_at: at(outage ? 6000 + 5 : s + 2) })
}
const sen = sensorStats(readings, from, to)
assert.strictEqual(sen.expected, 1440); assert.strictEqual(sen.count, 1440); assert.strictEqual(sen.pct, 100)
assert.strictEqual(sen.delay_sec.median, 2, 'normal delay 2 s')
assert.ok(sen.late.count > 150 && sen.late.count <= 160, `late ${sen.late.count} (queued during the outage)`)
assert.strictEqual(sensorStats([{ recorded_at: at(10), received_at: null }], from, to).delay_sec.n, 0, 'rows before the migration have no delay')

// ---- ภาพทุก 15 วิ: 300 KB, server ยุ่ง 10 ภาพ, หาย 1 ช่วง 5 นาที ----
const frames = []
for (let s = 0; s < 6 * 3600; s += 15) {
    if (s >= 7200 && s < 7500) continue
    frames.push({ captured_at: at(s), received_at: at(s + 3), bytes: 300 * 1024, status: frames.length % 100 === 0 && frames.length < 1000 ? 'busy' : 'accepted' })
}
const fr = frameStats(frames, from, to, 15)
assert.strictEqual(fr.expected, 1440); assert.strictEqual(fr.count, 1420)
assert.strictEqual(fr.busy, 10); assert.strictEqual(fr.accepted, 1410)
assert.strictEqual(fr.image_kb.median, 300)
assert.strictEqual(fr.delay_sec.median, 3)
assert.ok(Math.abs(fr.mb_per_day - 1664.1) < 1, `mb/day ${fr.mb_per_day}`)   // 1420 ภาพ x 300 KB ใน 6 ชม. x 4
assert.ok(fr.longest_gap_min >= 5)

// ---- ปริมาณเน็ตต่อวัน ----
const bw = bandwidthPerDay({ frames: fr, sensor: sen, heartbeats: h }, from, to)
assert.strictEqual(bw.images_mb, fr.mb_per_day)
assert.ok(bw.other_mb_estimate > 5 && bw.other_mb_estimate < 7, `other ${bw.other_mb_estimate}`)   // (1440+65)/0.25 วัน x 1 KB
assert.ok(bw.month_gb > 48 && bw.month_gb < 50)

console.log('test_hardware_stats: all passed')
