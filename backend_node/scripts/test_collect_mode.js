// ทดสอบโหมดเก็บภาพทุกภาพ (ฐานข้อมูล/YOLO/Storage จำลอง): node backend_node/scripts/test_collect_mode.js
// - POST/GET /api/Admin/devices/:id/collect เปิด ต่อเวลา หยุด ตรวจค่าผิด และกรณียังไม่รัน migration
// - POST /api/camera/snapshot ระหว่างเปิด: เก็บทุกภาพ + ผลของโมเดล (ok), ภาพที่ server ยุ่ง (busy) และโมเดลล้ม (error)
// - เวลาประมวลผล (timing_ms) อยู่ในผลของภาพและในแถว telemetry
const assert = require('assert')
const path = require('path')
process.env.SECRET_KEY = 'test-secret-collect-mode'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY

const DEV = '66666666-6666-4666-8666-666666666666'
const LONE = '77777777-7777-4777-8777-777777777777'  // กล่องที่ยังไม่ผูกฟาร์ม
const FARM = '88888888-8888-4888-8888-888888888888'
const iso = (ms) => new Date(ms).toISOString()

const state = {
    interval: 60,
    started: null,
    until: null,
    columnExists: true,
    settingsFail: false,
    accept: true,
    detect: 'ok',
    telemetry: [],
    calls: []
}

const stub = (rel, exports) => {
    const p = require.resolve(path.resolve(__dirname, rel))
    require.cache[p] = { id: p, filename: p, loaded: true, exports }
}

stub('../app/config/db', {
    query: async (sql, p = []) => {
        // รอบถ่ายภาพ + โหมดเก็บภาพ ตอนรับภาพ (routes/camera.js)
        if (sql.includes("to_jsonb(d)->>'camera_interval_sec'") && sql.includes("to_jsonb(d)->>'collect_until' AS collect_until") && sql.includes('WHERE id_devices = $1')) {
            if (state.settingsFail) throw new Error('db down')
            return { rows: [{ s: state.interval, collect_until: state.columnExists ? state.until : null }] }
        }
        // แถวสถานะสำหรับหน้า Admin
        if (sql.includes("to_jsonb(d)->>'collect_started_at' AS collect_started_at") && sql.includes('WHERE d.id_devices = $1')) {
            if (p[0] !== DEV) return { rows: [] }
            return { rows: [{ id_devices: DEV, id_farms: FARM, camera_interval_sec: state.interval, collect_started_at: state.started, collect_until: state.until }] }
        }
        if (sql.includes('FROM storage.objects') && sql.includes('name LIKE $2')) {
            assert.strictEqual(p[0], 'camera-samples')
            assert.strictEqual(p[1], `collect/${FARM}/%`)
            return { rows: [{ images: 3, bytes: '943718', last_at: iso(Date.now() - 60e3) }] }
        }
        if (sql.includes('FROM storage.objects')) return { rows: [{ bytes: String(80 * 1048576) }] }
        if (sql.includes('SELECT id_devices, id_farms FROM tb_devices WHERE id_devices = $1')) {
            if (p[0] === DEV) return { rows: [{ id_devices: DEV, id_farms: FARM }] }
            if (p[0] === LONE) return { rows: [{ id_devices: LONE, id_farms: null }] }
            return { rows: [] }
        }
        // จำลอง UPDATE ตาม SQL ใน routes/Admin/devices.js (ตรวจกับ Postgres จริงแล้วด้วย SELECT แบบอ่านอย่างเดียว)
        // กล่องอื่น (LONE) ไม่เคยเปิด ไม่กระทบสถานะของ DEV (WHERE id_devices = $1)
        if (sql.includes('UPDATE tb_devices') && sql.includes('collect_until') && p[0] !== DEV) {
            return { rows: [{ collect_started_at: null, collect_until: null }] }
        }
        if (sql.includes("collect_until = NOW() + ($2::int * INTERVAL '1 minute')")) {
            if (!state.columnExists) throw Object.assign(new Error('column "collect_until" does not exist'), { code: '42703' })
            const now = Date.now()
            const active = state.until && new Date(state.until).getTime() > now && state.started
            state.started = active ? state.started : iso(now)
            state.until = iso(now + p[1] * 60e3)
            return { rows: [{ collect_started_at: state.started, collect_until: state.until }] }
        }
        if (sql.includes('SET collect_until = CASE WHEN collect_until > NOW() THEN NOW() ELSE collect_until END')) {
            if (!state.columnExists) throw Object.assign(new Error('column "collect_until" does not exist'), { code: '42703' })
            const now = Date.now()
            if (state.until && new Date(state.until).getTime() > now) state.until = iso(now)
            return { rows: [{ collect_started_at: state.started, collect_until: state.until }] }
        }
        // รายการอุปกรณ์ (GET /api/Admin/devices)
        if (sql.includes('FROM tb_devices d') && sql.includes('LEFT JOIN LATERAL')) {
            return { rows: [{ id_devices: DEV, name_devices: 'box', serial_no: 'BOX-1', type: 'env_sensor', camera_interval_sec: 60, collect_started_at: state.started, collect_until: state.until, id_farms: FARM }] }
        }
        if (sql.includes('FROM cctv_cameras')) return { rows: [] }
        if (sql.includes('INSERT INTO cctv_behavior_telemetry')) {
            state.telemetry.push(p)
            return { rows: [{ id: state.telemetry.length }] }
        }
        throw new Error('unexpected query: ' + sql.replace(/\s+/g, ' ').slice(0, 100))
    },
    pool: { on() {} }
})
stub('../app/middleware/deviceAuthMiddleware', {
    verifyDeviceKey: (req, res, next) => { req.device = { id: DEV, farmId: FARM, serial: 'BOX-1' }; next() },
    hashDeviceKey: () => '', generateDeviceKey: () => ''
})
class VisionBusyError extends Error {}
stub('../app/services/visionService', {
    canAccept: () => state.accept,
    detect: async () => {
        state.calls.push({ fn: 'detect' })
        if (state.detect === 'error') throw new Error('boom')
        if (state.detect === 'busy') throw new VisionBusyError('vision queue full')
        const counts = { standing: 1, lying: 0, feeding: 0, drinking: 0 }
        return {
            boxes: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.4, cls: 'standing', conf: 0.8 }],
            counts, pct: { standing: 100, lying: 0, feeding: 0, drinking: 0 },
            total: 1, cci: 50, confidence_avg: 0.8, resize: 'stretch', image: { w: 1920, h: 1080 },
            timing_ms: { preprocess: 200, inference: 1034, total: 1234 }
        }
    },
    IMGSZ: 480, status: () => ({}), VisionBusyError
})
stub('../app/services/cowTargetTracker', { onSnapshot: async () => {} })

// ใช้ฟังก์ชันจริงของ cameraSamples (path/JSON) แต่บันทึกการอัปโหลดแทนการส่งขึ้น Storage
const samples = require('../app/services/cameraSamples')
const samplesPath = require.resolve(path.resolve(__dirname, '../app/services/cameraSamples'))
const record = (fn) => async (...args) => { state.calls.push({ fn, args }); return { saved: true } }
require.cache[samplesPath].exports = {
    ...samples,
    maybeSaveSample: record('maybeSaveSample'),
    saveLatest: record('saveLatest'),
    saveCollectedImage: record('saveCollectedImage'),
    saveCollectedResult: record('saveCollectedResult')
}

const collect = require('../app/services/collectMode')

// ---------- ฟังก์ชันล้วน ----------
for (const [v, want] of [[0, 0], [60, 60], ['180', 180], [720, 720], [-1, null], [721, null], [1.5, null], ['abc', null], [true, null], [null, null], [undefined, null], ['', null]]) {
    assert.strictEqual(collect.parseCollectMinutes(v), want, `parseCollectMinutes(${JSON.stringify(v)})`)
}
const t0 = new Date('2026-11-25T03:00:00Z')
assert.deepStrictEqual(collect.collectState(null, t0), { active: false, started_at: null, until: null, remaining_min: 0 })
assert.deepStrictEqual(
    collect.collectState({ collect_started_at: '2026-11-25T02:00:00Z', collect_until: '2026-11-25T03:30:00Z' }, t0),
    { active: true, started_at: '2026-11-25T02:00:00.000Z', until: '2026-11-25T03:30:00.000Z', remaining_min: 30 }
)
assert.strictEqual(collect.collectState({ collect_started_at: '2026-11-25T01:00:00Z', collect_until: '2026-11-25T02:00:00Z' }, t0).active, false)
assert.strictEqual(collect.isCollecting({ collectUntil: '2026-11-25T03:00:01Z' }, t0), true)
assert.strictEqual(collect.isCollecting({ collectUntil: '2026-11-25T03:00:00Z' }, t0), false, 'ถึงเวลาพอดี = หยุด')
assert.strictEqual(collect.isCollecting({ collectUntil: 'not a date' }, t0), false)
assert.strictEqual(collect.isCollecting(null, t0), false)
assert.deepStrictEqual(collect.estimateCollect(360, 60), { images: 360, mb: 105 })
assert.deepStrictEqual(collect.estimateCollect(60, 600), { images: 6, mb: 2 })

// path เวลาไทย และข้ามเที่ยงคืน
assert.strictEqual(samples.collectPath('F', new Date('2026-11-25T03:31:05Z')), 'collect/F/2026-11-25/103105.jpg')
assert.strictEqual(samples.collectPath('F', new Date('2026-11-25T17:00:00Z')), 'collect/F/2026-11-26/000000.jpg')

// JSON ของภาพ: timing_ms อยู่ในผล, ภาพที่ยุ่งไม่มีจำนวนวัว (ห้ามแสดงเป็น 0)
const fakeResult = { total: 2, counts: { lying: 2 }, boxes: [], timing_ms: { total: 900, end_to_end: 1500 } }
assert.deepStrictEqual(samples.buildSampleJson(t0, fakeResult, 480).timing_ms, { total: 900, end_to_end: 1500 })
assert.strictEqual(samples.buildSampleJson(t0, { total: 0, counts: {} }, 480).timing_ms, null)
const okJson = samples.buildCollectJson(t0, { status: 'ok', result: fakeResult, imgsz: 480 })
assert.strictEqual(okJson.status, 'ok')
assert.strictEqual(okJson.total, 2)
const busyJson = samples.buildCollectJson(t0, { status: 'busy' })
assert.deepStrictEqual(Object.keys(busyJson).sort(), ['captured_at', 'error', 'model', 'status', 'version'])
assert.strictEqual(busyJson.status, 'busy')
assert.ok(!('counts' in busyJson))

// ---------- route ----------
const express = require('express')
const jwt = require('jsonwebtoken')
const app = express()
app.use(express.json())
app.use('/api/Admin/devices', require('../app/routes/Admin/devices'))
app.use('/api/camera', require('../app/routes/camera'))
const admin = jwt.sign({ id: 'u1', role: 'admin' }, process.env.SECRET_KEY)
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9])

const waitFor = async (cond, ms = 2000) => {
    const end = Date.now() + ms
    while (!cond()) {
        if (Date.now() > end) throw new Error('timeout waiting for background work: ' + JSON.stringify(state.calls.map(c => c.fn)))
        await new Promise(r => setTimeout(r, 10))
    }
}
const callsOf = (fn) => state.calls.filter(c => c.fn === fn)

const server = app.listen(0, async () => {
    const base = `http://127.0.0.1:${server.address().port}/api`
    const auth = { Authorization: `Bearer ${admin}` }
    const post = async (id, body) => {
        const r = await fetch(`${base}/Admin/devices/${id}/collect`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) })
        return { status: r.status, body: await r.json() }
    }
    const get = async (url) => {
        const r = await fetch(`${base}${url}`, { headers: auth })
        return { status: r.status, body: await r.json() }
    }
    const capturedAt = Math.floor(Date.now() / 1000) - 5
    const shot = async () => {
        const r = await fetch(`${base}/camera/snapshot`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Captured-At': String(capturedAt) }, body: JPEG })
        return { status: r.status, body: await r.json() }
    }
    try {
        // ต้องเป็นผู้ดูแล
        const anon = await fetch(`${base}/Admin/devices/${DEV}/collect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"minutes":60}' })
        assert.ok([401, 403].includes(anon.status))

        // เปิด 60 นาที
        let r = await post(DEV, { minutes: 60 })
        assert.strictEqual(r.status, 200, JSON.stringify(r.body))
        assert.strictEqual(r.body.collect.active, true)
        assert.strictEqual(r.body.collect.remaining_min, 60)
        const firstStart = r.body.collect.started_at

        // ต่อเวลาระหว่างเปิด: เวลาเริ่มเดิม
        await new Promise(res => setTimeout(res, 15))
        r = await post(DEV, { minutes: 180 })
        assert.strictEqual(r.body.collect.started_at, firstStart)
        assert.strictEqual(r.body.collect.remaining_min, 180)

        // สถานะ + จำนวนภาพที่เก็บได้
        r = await get(`/Admin/devices/${DEV}/collect`)
        assert.strictEqual(r.status, 200)
        assert.strictEqual(r.body.collect.active, true)
        assert.strictEqual(r.body.saved.images, 3)
        assert.strictEqual(r.body.saved.mb, 0.9)
        assert.strictEqual(r.body.storage_used_mb, 80)
        assert.strictEqual(r.body.storage_limit_mb, 1024)
        assert.strictEqual(r.body.camera_interval_sec, 60)
        assert.strictEqual(r.body.folder, `camera-samples/collect/${FARM}/`)
        assert.strictEqual((await get(`/Admin/devices/${LONE.replace('7', '9')}/collect`)).status, 404)

        // รายการอุปกรณ์มีสถานะเก็บภาพ (ไม่ส่งคอลัมน์ดิบ)
        r = await get('/Admin/devices')
        const dev = r.body.devices.find(d => d.id_devices === DEV)
        assert.strictEqual(dev.collect.active, true)
        assert.ok(!('collect_until' in dev) && !('collect_started_at' in dev))

        // ค่าผิด ไม่แก้สถานะ
        const before = state.until
        for (const bad of [-1, 721, 1.5, 'abc', true, null]) assert.strictEqual((await post(DEV, { minutes: bad })).status, 400, `reject ${JSON.stringify(bad)}`)
        assert.strictEqual((await post(DEV, {})).status, 400)
        assert.strictEqual((await post('not-a-uuid', { minutes: 60 })).status, 400)
        assert.strictEqual((await post('99999999-9999-4999-8999-999999999999', { minutes: 60 })).status, 404)
        assert.strictEqual(state.until, before)

        // กล่องที่ยังไม่ผูกฟาร์ม: เปิดไม่ได้ (server ไม่รับภาพอยู่แล้ว) แต่สั่งหยุดได้
        r = await post(LONE, { minutes: 60 })
        assert.strictEqual(r.status, 400)
        assert.ok(r.body.message.includes('ผูกอุปกรณ์กับฟาร์ม'))
        assert.strictEqual((await post(LONE, { minutes: 0 })).status, 200)

        // ---------- รับภาพระหว่างเปิด ----------
        // A) ประมวลผลได้: เก็บภาพ + ผล (ok) พร้อมเวลาประมวลผล
        state.calls = []
        let s = await shot()
        assert.strictEqual(s.status, 202)
        assert.strictEqual(s.body.next_interval_sec, 60)
        await waitFor(() => callsOf('saveCollectedResult').length === 1 && callsOf('saveLatest').length === 1)
        const img = callsOf('saveCollectedImage')
        assert.strictEqual(img.length, 1)
        assert.strictEqual(img[0].args[0], FARM)
        assert.strictEqual(img[0].args[1].getTime(), capturedAt * 1000)
        assert.ok(Buffer.compare(img[0].args[2], JPEG) === 0)
        let json = callsOf('saveCollectedResult')[0].args[2]
        assert.strictEqual(json.status, 'ok')
        assert.strictEqual(json.total, 1)
        assert.strictEqual(json.boxes.length, 1)
        assert.strictEqual(json.timing_ms.total, 1234)
        assert.ok(Number.isFinite(json.timing_ms.end_to_end) && json.timing_ms.end_to_end >= 0)
        // อัปโหลดภาพเริ่มก่อนโมเดลทำงาน (ภาพไม่หายแม้โมเดลล้ม)
        assert.ok(state.calls.findIndex(c => c.fn === 'saveCollectedImage') < state.calls.findIndex(c => c.fn === 'detect'))
        // แถว telemetry มีเวลาประมวลผล
        const detections = JSON.parse(state.telemetry[state.telemetry.length - 1][14])
        assert.strictEqual(detections.timing_ms.total, 1234)
        assert.ok(Number.isFinite(detections.timing_ms.end_to_end))

        // B) server ยุ่ง (429): ยังเก็บภาพ ผล = busy ไม่เรียกโมเดล
        state.calls = []
        state.accept = false
        s = await shot()
        assert.strictEqual(s.status, 429)
        assert.strictEqual(s.body.next_interval_sec, 60)
        await waitFor(() => callsOf('saveCollectedResult').length === 1)
        assert.strictEqual(callsOf('saveCollectedImage').length, 1)
        assert.strictEqual(callsOf('saveCollectedResult')[0].args[2].status, 'busy')
        assert.strictEqual(callsOf('detect').length, 0)
        state.accept = true

        // C) โมเดลล้ม: เก็บภาพ ผล = error พร้อมข้อความ
        state.calls = []
        state.detect = 'error'
        s = await shot()
        assert.strictEqual(s.status, 202)
        await waitFor(() => callsOf('saveCollectedResult').length === 1)
        json = callsOf('saveCollectedResult')[0].args[2]
        assert.strictEqual(json.status, 'error')
        assert.strictEqual(json.error, 'boom')
        assert.strictEqual(callsOf('saveCollectedImage').length, 1)

        // D) คิวเต็มระหว่างทาง: ผล = busy
        state.calls = []
        state.detect = 'busy'
        await shot()
        await waitFor(() => callsOf('saveCollectedResult').length === 1)
        assert.strictEqual(callsOf('saveCollectedResult')[0].args[2].status, 'busy')
        state.detect = 'ok'

        // E) หยุดแล้ว: ไม่เก็บทุกภาพ แต่ภาพตัวอย่าง/ภาพล่าสุดยังทำงาน
        r = await post(DEV, { minutes: 0 })
        assert.strictEqual(r.body.collect.active, false)
        assert.ok(r.body.collect.until)
        state.calls = []
        s = await shot()
        assert.strictEqual(s.status, 202)
        await waitFor(() => callsOf('saveLatest').length === 1)
        assert.strictEqual(callsOf('saveCollectedImage').length + callsOf('saveCollectedResult').length, 0)
        assert.strictEqual(callsOf('maybeSaveSample').length, 1)
        // หยุดซ้ำตอนไม่ได้เปิด: เวลาสิ้นสุดเดิม
        const stoppedAt = state.until
        await new Promise(res => setTimeout(res, 15))
        assert.strictEqual((await post(DEV, { minutes: 0 })).body.collect.until, stoppedAt)

        // F) อ่านการตั้งค่าไม่ได้: รับภาพตามปกติ ไม่เก็บทุกภาพ ไม่ส่งรอบใหม่
        state.until = iso(Date.now() + 3600e3)
        state.settingsFail = true
        state.calls = []
        s = await shot()
        assert.strictEqual(s.status, 202)
        assert.ok(!('next_interval_sec' in s.body))
        await waitFor(() => callsOf('saveLatest').length === 1)
        assert.strictEqual(callsOf('saveCollectedImage').length, 0)
        state.settingsFail = false

        // G) ยังไม่ได้รัน migration: เปิดไม่ได้ บอกชื่อไฟล์ และรับภาพตามปกติ
        state.columnExists = false
        r = await post(DEV, { minutes: 60 })
        assert.strictEqual(r.status, 409)
        assert.ok(r.body.message.includes('20261121_device_collect_mode.sql'))
        state.calls = []
        s = await shot()
        assert.strictEqual(s.status, 202)
        await waitFor(() => callsOf('saveLatest').length === 1)
        assert.strictEqual(callsOf('saveCollectedImage').length, 0)

        console.log('collect_mode_test: all passed')
    } catch (e) {
        console.error(e); process.exitCode = 1
    } finally {
        server.close()
        setTimeout(() => process.exit(), 200)
    }
})
