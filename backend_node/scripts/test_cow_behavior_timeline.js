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
let mockThi = 78.04
const dbPath = require.resolve(path.resolve(__dirname, '../app/config/db'))
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: {
        query: async (sql, p = []) => {
            queries.push(sql)
            if (sql.includes('FROM tb_farms')) return { rows: [FARM, EMPTY_FARM].includes(p[0]) ? [{ id_farms: p[0], hf_profile: null }] : [] }
            if (sql.includes('FROM tb_cow_tracking_targets')) return { rows: [] }   // ยังไม่ได้เลือกวัว: ใช้ตัวที่มีข้อมูลล่าสุด
            if (sql.includes('FROM tb_cows WHERE id_cows')) return { rows: p[0] === COW && p[1] === FARM ? [{ id_cows: COW, tag_id: 'TH-012', name_cows: 'มะลิ' }] : [] }
            if (sql.includes('FROM tb_cow_behavior_observations o')) return { rows: p[0] === FARM ? [{ id_cows: COW, tag_id: 'TH-012', name_cows: 'มะลิ' }] : [] }
            if (sql.includes('observed_at = ANY')) {
                const want = new Set(p[1].map(t => new Date(t).getTime()))
                return { rows: obs.filter(o => want.has(o.observed_at.getTime())).map(o => ({ ...o, box_x1: 0.1, box_y1: 0.2, box_x2: 0.3, box_y2: 0.4, match_score: 0.9 })) }
            }
            if (sql.includes('FROM tb_cow_behavior_observations')) {
                const [, , from, to] = p
                return { rows: obs.filter(o => o.observed_at >= new Date(from) && o.observed_at < new Date(to)) }
            }
            if (sql.includes('tb_sensor_readings')) {
                const rows = []
                for (let t = new Date(p[1]).getTime(); t < new Date(p[2]).getTime(); t += 5 * 60e3) rows.push({ t: new Date(t), temp: 30, hum: 70, thi: mockThi, n: 20, serial_no: 'X' })
                return { rows }
            }
            throw new Error('unexpected query: ' + sql.slice(0, 80))
        },
        pool: { on() {} }
    }
}

// ภาพรายชั่วโมงจำลอง: 01:00 (ยืน), 03:30 (กล้องหลุด ไม่มีผลติดตาม)
const samplesPath = require.resolve(path.resolve(__dirname, '../app/services/cameraSamples'))
require.cache[samplesPath] = { id: samplesPath, filename: samplesPath, loaded: true, exports: {
    listDaySamples: async (farmId, day) => farmId === FARM && day === '2026-11-15' ? [
        { source: 'x/01.jpg', captured_at: new Date(bkk('2026-11-15T01:30:00')).toISOString(), hour_label: '01:00', image_url: 'https://img/1', image_size: null, boxes: [] },
        { source: 'x/03.jpg', captured_at: new Date(bkk('2026-11-15T03:30:00')).toISOString(), hour_label: '03:00', image_url: 'https://img/3', image_size: null, boxes: [] }
    ] : []
} }

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
        assert.strictEqual(noImages.cow.id, COW); assert.strictEqual(noImages.summary, null); assert.ok(/ไม่มีภาพของวัวตัวนี้ในวันที่เลือก/.test(noImages.note_th))

        // THI ของแต่ละช่วง (ข้อมูลจำลอง THI คงที่ 78.04 ทั้งวัน)
        assert.deepStrictEqual(d.bouts[0].thi, { avg: 78, max: 78, min: 78, above: 'moderate' })
        assert.ok(d.bouts.every(b => b.thi && b.thi.avg === 78), 'every bout has THI for its own time range')

        // แถวจำลองไม่มีกรอบ: ไม่มีช่วงเคลื่อนที่ และใช้เกณฑ์ตั้งต้น
        assert.deepStrictEqual(d.movement, []); assert.strictEqual(d.summary.moving_min, 0)
        assert.strictEqual(d.summary.moving_threshold_source, 'default'); assert.ok(d.movement_note_th.includes('25%'))
        assert.strictEqual(d.bouts[1].moving_min, 0); assert.strictEqual(d.bouts[0].moving_min, null)
        assert.strictEqual(d.current, null, 'past day has no current posture')

        // ท่าปัจจุบัน: ภาพล่าสุด 00:59 ยืนตั้งแต่ 23:29:30 เมื่อวาน
        const { getCowBehaviorDay } = require('../app/services/cowBehaviorTimeline')
        const farmRow = { id_farms: FARM, hf_profile: null }
        const live = await getCowBehaviorDay(farmRow, { date: '2026-11-16', now: new Date(bkk('2026-11-16T01:00:30')) })
        assert.deepStrictEqual(live.current, {
            behavior: 'standing', since: new Date(bkk('2026-11-15T23:29:30')).toISOString(), minutes: 91, last_image_at: new Date(bkk('2026-11-16T00:59:00')).toISOString()
        })
        const stale = await getCowBehaviorDay(farmRow, { date: '2026-11-16', now: new Date(bkk('2026-11-16T03:00:00')) })
        assert.strictEqual(stale.current, null, 'no current posture when the last image is old')

        // ป้ายเกณฑ์ตัดสินจากค่าที่แสดง: 75.96 แสดงเป็น 76 ต้องเป็นเกณฑ์ 76 ไม่ใช่ 74
        mockThi = 75.96
        const edge = await getCowBehaviorDay(farmRow, { date: '2026-11-15' })
        assert.deepStrictEqual(edge.bouts[0].thi, { avg: 76, max: 76, min: 76, above: 'moderate' })
        mockThi = 78.04

        // ---- CSV ----
        const raw = async (url, token = admin) => { const r = await fetch(base + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); return { status: r.status, type: r.headers.get('content-type'), disp: r.headers.get('content-disposition'), buf: Buffer.from(await r.clone().arrayBuffer()), text: await r.text() } }
        assert.strictEqual((await raw(`/${FARM}/cow-behavior/export?date=2026-11-15`, farmer)).status, 403)
        assert.strictEqual((await raw(`/${FARM}/cow-behavior/export`)).status, 400, 'date required')
        assert.strictEqual((await raw(`/${EMPTY_FARM}/cow-behavior/export?date=2026-11-15`)).status, 404)
        const snap = await raw(`/${FARM}/cow-behavior/export?date=2026-11-15`)
        assert.strictEqual(snap.status, 200)
        assert.ok(snap.type.startsWith('text/csv'))
        assert.ok(snap.disp.includes('cow_TH-012_2026-11-15_snapshots.csv'))
        assert.deepStrictEqual([...snap.buf.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'BOM so Excel reads Thai')
        assert.ok(snap.text.startsWith('# farm='))
        const lines = snap.text.trim().split('\n')
        assert.strictEqual(lines[1], 'cow_tag,cow_name,observed_at_th,behavior,behavior_th,match_score,box_x1,box_y1,box_x2,box_y2,thi_5min,temperature_c,humidity_pct')
        assert.strictEqual(lines.length - 2, obs.filter(o => o.observed_at >= new Date(bkk('2026-11-15T00:00:00')) && o.observed_at < new Date(bkk('2026-11-16T00:00:00'))).length, 'one row per snapshot of that day only')
        assert.ok(lines[2].startsWith('TH-012,มะลิ,2026-11-15 00:00:00,lying,นอน,'), lines[2])
        assert.ok(lines[2].endsWith(',78,30,70'), 'THI/temp/humidity of that 5-minute bucket')
        const bts = await raw(`/${FARM}/cow-behavior/export?date=2026-11-15&kind=bouts`)
        const bl = bts.text.trim().split('\n')
        assert.strictEqual(bl.length - 2, d.bouts.length, 'same bouts as the page')
        assert.ok(bl[2].startsWith('TH-012,มะลิ,lying,นอน,2026-11-15 00:00:00,2026-11-15 01:29:30,89.5,78,78,78,moderate,,true,false'), bl[2])

        // ---- ภาพรายชั่วโมง + กรอบวัวเป้าหมาย ----
        assert.strictEqual((await get(`/${FARM}/cow-behavior/images?date=2026-11-15`, farmer)).status, 403)
        const im = await get(`/${FARM}/cow-behavior/images?date=2026-11-15`)
        assert.strictEqual(im.status, 200)
        assert.strictEqual(im.body.cow.tag_id, 'TH-012')
        assert.deepStrictEqual(im.body.images[0].target, { behavior: 'standing', match_score: 0.9, box: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 } })
        assert.strictEqual(im.body.images[1].target, null, 'camera gap: no tracking result for that image')
        const imEmpty = await get(`/${FARM}/cow-behavior/images?date=2026-11-14`)
        assert.deepStrictEqual(imEmpty.body.images, [])

        console.log('cow_behavior_timeline_test: all passed')
    } catch (e) {
        console.error(e); process.exitCode = 1
    } finally {
        server.close()
    }
})
