// ทดสอบเหตุการณ์ขาดการติดต่อและสถานะการส่งข้อมูล: node backend_node/scripts/test_offline_events.js
const assert = require('assert')
const path = require('path')
const dbPath = require.resolve(path.resolve(__dirname, '../app/config/db'))
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async () => { throw new Error('no db in test') }, pool: { on() {} } } }
const { buildHeatEvents, connectionStatus } = require('../app/services/heatEvents')

const now = Date.now()
const min = 60e3
const b = (agoMin, thi = 70) => ({ t: new Date(now - agoMin * min), thi, temp: 28, hum: 70 })

// 1) ไม่มีข้อมูลในช่วงที่ดู แต่เคยมีข้อมูลเมื่อ 20 วันก่อน -> ขาดการติดต่อที่ยังไม่จบ
const lastAt = new Date(now - 20 * 1440 * min)
const ev1 = buildHeatEvents([], null, 'default', { lastDataAt: lastAt })
assert.strictEqual(ev1.length, 1)
assert.strictEqual(ev1[0].type, 'sensor_offline')
assert.strictEqual(ev1[0].ongoing, true)
assert.strictEqual(ev1[0].end, null)
assert.ok(Math.abs(ev1[0].duration_min - 20 * 1440) <= 1)

// 2) ไม่เคยมีข้อมูล -> ไม่มีเหตุการณ์ (ไม่ใช่ขาดการติดต่อ)
assert.deepStrictEqual(buildHeatEvents([], null, 'default', {}), [])
assert.deepStrictEqual(buildHeatEvents([], null, 'default'), [])

// 3) ข้อมูลล่าสุดเพิ่งมา 5 นาทีก่อน (ยังไม่ถึงเกณฑ์) -> ไม่มีเหตุการณ์
assert.deepStrictEqual(buildHeatEvents([], null, 'default', { lastDataAt: new Date(now - 5 * min) }), [])

// 4) มีข้อมูลในช่วง: ช่องว่างกลางวัน 10 ชม. ถูกนับ และ lastDataAt ไม่ทำให้เกิดเหตุการณ์ซ้ำ
const bs = []
for (let a = 24 * 60; a >= 14 * 60; a -= 5) bs.push(b(a))
for (let a = 4 * 60; a >= 0; a -= 5) bs.push(b(a))
const ev4 = buildHeatEvents(bs, null, 'default', { lastDataAt: lastAt })
const off = ev4.filter(e => e.type === 'sensor_offline')
assert.strictEqual(off.length, 1)
assert.strictEqual(off[0].ongoing, false)
assert.ok(off[0].duration_min >= 590 && off[0].duration_min <= 600, String(off[0].duration_min))

// 5) สถานะการส่งข้อมูล
assert.deepStrictEqual(connectionStatus(null), { status: 'never', last_data_at: null, silent_min: null })
assert.strictEqual(connectionStatus(new Date(now - 3 * min), now).status, 'live')
assert.strictEqual(connectionStatus(new Date(now - 15 * min), now).status, 'offline')
assert.strictEqual(connectionStatus(lastAt, now).silent_min, 20 * 1440)

console.log('offline events: ok')
