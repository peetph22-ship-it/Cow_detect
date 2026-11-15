// ทดสอบ GET /api/Admin/farms/:id/cow-behavior ด้วยฐานข้อมูลจำลอง (ไม่ต่อ DB จริง): node backend_node/scripts/test_cow_behavior_timeline.js
const assert = require('assert')
const path = require('path')
process.env.SECRET_KEY = 'test-secret-cow-behavior'

const FARM = '11111111-1111-4111-8111-111111111111'
const EMPTY_FARM = '22222222-2222-4222-8222-222222222222'
const COW = '33333333-3333-4333-8333-333333333333'
const OTHER_COW = '44444444-4444-4444-8444-444444444444'
const bkk = (s) => Date.parse(`${s}+07:00`)

// 15 พ.ย. (เวลาไทย) ภาพทุก 1 นาที: นอนต่อจากเมื่อคืน → ยืน 01:30 → กิน 02:00 → หาย 3 ภาพ 03:00
// → กล้องหลุด 03:03–03:59 → นอน 04:00 → ยืน 23:30 ต่อถึงวันถัดไป
const obs = []
for (let t = bkk('2026-11-14T23:00:00'); t < bkk('2026-11-16T01:00:00'); t += 60e3) {
    const h = (t - bkk('2026-11-15T00:00:00')) / 3600e3
    let behavior
    if (h < 1.5) behavior = 'lying'
    else if (h < 2) behavior = 'standing'
    else if (h < 3) behavior = 'feeding'
    else if (h < 3 + 3 / 60) behavior = 'not_visible'
    else if (h < 4) continue
    else if (h < 23.5) behavior = 'lying'
    else behavior = 'standing'
    obs.push({ observed_at: new Date(t), behavior })
}

const queries = []
const dbPath = require.resolve(path.resolve(__dirname, '../app/config/db'))
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: {
        query: async (sql, p = []) => {
            queries.push(sql)
            if (sql.includes('FROM tb_farms')) return { rows: [FARM, EMPTY_FARM].includes(p[0]) ? [{ id_farms: p[0], hf_profile: null }] : [] }
            if (sql.includes('FROM tb_cows WHERE id_cows')) return { rows: p[0] === COW && p[1] === FARM ? [{ id_cows: COW, tag_id: 'TH-012', name_cows: 'มะลิ' }] : [] }
            if (sql.includes('FROM tb_cow_behavior_observations o')) return { rows: p[0] === FARM ? [{ id_cows: COW, tag_id: 'TH-012', name_cows: 'มะลิ' }] : [] }
            if (sql.includes('FROM tb_cow_behavior_observations')) {
                const [, , from, to] = p
                return { rows: obs.filter(o => o.observed_at >= new Date(from) && o.observed_at < new Date(to)) }
            }
            if (sql.includes('tb_sensor_readings')) {
                const rows = []
                for (let t = new Date(p[1]).getTime(); t < new Date(p[2]).getTime(); t += 5 * 60e3) rows.push({ t: new Date(t), temp: 30, hum: 70, thi: 78.04, n: 20, serial_no: 'X' })
                return { rows }
            }
            throw new Error('unexpected query: ' + sql.slice(0, 80))
        },
        pool: { on() {} }
    }
}

const express = require('express')
const jwt = require('jsonwebtoken')
const app = express()
app.use('/api/Admin/farms', require('../app/routes/Admin/farms'))
const admin = jwt.sign({ id: 'u1', role: 'admin' }, process.env.SECRET_KEY)
const farmer = jwt.sign({ id: 'u2', role: 'farmer' }, process.env.SECRET_KEY)

const server = app.listen(0, async () => {
    const base = `http://127.0.0.1:${server.address().port}/api/Admin/farms`
    const get = async (url, token = admin) => {
        const r = await fetch(base + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        return { status: r.status, body: await r.json() }
    }
    try {
        assert.strictEqual((await get(`/${FARM}/cow-behavior?date=2026-11-15`, null)).status, 401)
        assert.strictEqual((await get(`/${FARM}/cow-behavior?date=2026-11-15`, farmer)).status, 403)
        assert.strictEqual((await get(`/${FARM}/cow-behavior?date=2026-02-30`)).status, 400)
        assert.strictEqual((await get(`/${FARM}/cow-behavior?date=15-11-2026`)).status, 400)
        assert.strictEqual((await get(`/${FARM}/cow-behavior?cowId=abc`)).status, 400)
        assert.strictEqual((await get(`/${FARM}/cow-behavior?date=2026-11-15&cowId=${OTHER_COW}`)).status, 404)
        assert.strictEqual((await get(`/99999999-9999-4999-8999-999999999999/cow-behavior`)).status, 404)

        const { status, body } = await get(`/${FARM}/cow-behavior?date=2026-11-15`)
        assert.strictEqual(status, 200)
        const d = body.cow_behavior
        assert.deepStrictEqual(d.cow, { id: COW, tag_id: 'TH-012', name: 'มะลิ' })
        assert.strictEqual(d.interval_sec, 60)
        assert.strictEqual(d.thi.length, 288)
        assert.deepStrictEqual(d.thresholds, { mild: 74, moderate: 76, severe: 82 })
        assert.ok(d.note_th.includes('±30 วินาที') && d.note_th.includes('ท่าดื่มน้ำนับรวมในท่ายืน'))

        const hm = (iso) => new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(11, 19)
        assert.deepStrictEqual(d.bouts.map(b => [b.behavior, hm(b.start), hm(b.end), b.duration_min, b.from_previous_day, b.to_next_day]), [
            ['lying', '00:00:00', '01:29:30', 89.5, true, false],     // นอนต่อจากเมื่อคืน ตัดที่เที่ยงคืน
            ['standing', '01:29:30', '01:59:30', 30, false, false],
            ['feeding', '01:59:30', '02:59:30', 60, false, false],
            ['not_visible', '02:59:30', '03:02:30', 3, false, false],
            ['lying', '03:59:30', '23:29:30', 1170, false, false],    // ช่วงกล้องหลุดไม่มีแถบ
            ['standing', '23:29:30', '00:00:00', 30.5, false, true]
        ])
        assert.deepStrictEqual(d.summary.minutes, { lying: 1259.5, standing: 60.5, feeding: 60, drinking: 0, not_visible: 3 })
        assert.deepStrictEqual(d.summary.bouts, { lying: 2, standing: 2, feeding: 1, drinking: 0 })
        assert.strictEqual(d.summary.longest_lying_min, 1170)
        assert.strictEqual(d.summary.covered_min, 1383)
        assert.strictEqual(d.summary.window_min, 1440)

        const same = (await get(`/${FARM}/cow-behavior?date=2026-11-15&cowId=${COW}`)).body.cow_behavior
        assert.deepStrictEqual(same.bouts, d.bouts)

        const empty = (await get(`/${EMPTY_FARM}/cow-behavior?date=2026-11-15`)).body.cow_behavior
        assert.strictEqual(empty.cow, null); assert.deepStrictEqual(empty.bouts, []); assert.strictEqual(empty.thi.length, 288)

        const noImages = (await get(`/${FARM}/cow-behavior?date=2026-10-01`)).body.cow_behavior
        assert.strictEqual(noImages.cow.id, COW); assert.strictEqual(noImages.summary, null); assert.ok(/ยังไม่มีภาพ/.test(noImages.note_th))

        console.log('cow_behavior_timeline_test: all passed')
    } catch (e) {
        console.error(e); process.exitCode = 1
    } finally {
        server.close()
    }
})
