// ทดสอบรอบถ่ายภาพที่ตั้งจากหน้าเว็บ (ฐานข้อมูล/YOLO จำลอง): node backend_node/scripts/test_camera_interval.js
// - PUT /api/Admin/devices/:id รับ camera_interval_sec 15–3600 หรือ null
// - POST /api/camera/snapshot ตอบ next_interval_sec ทั้งตอนรับภาพ (202) และตอนยุ่ง (429)
const assert = require('assert')
const path = require('path')
process.env.SECRET_KEY = 'test-secret-camera-interval'

const DEV = '55555555-5555-4555-8555-555555555555'
const state = { interval: null, columnExists: true, accept: true }
const stub = (rel, exports) => {
    const p = require.resolve(path.resolve(__dirname, rel))
    require.cache[p] = { id: p, filename: p, loaded: true, exports }
}
stub('../app/config/db', {
    query: async (sql, p = []) => {
        if (sql.includes("to_jsonb(d)->>'camera_interval_sec'") && sql.includes('WHERE id_devices')) {
            return { rows: [{ s: state.columnExists ? state.interval : null }] }
        }
        if (sql.includes('SET camera_interval_sec')) {
            if (!state.columnExists) throw Object.assign(new Error('column does not exist'), { code: '42703' })
            state.interval = p[0]
            return { rows: [] }
        }
        if (sql.includes('UPDATE tb_devices')) return { rows: p[5] === DEV ? [{ id_devices: DEV, name_devices: 'box' }] : [] }
        if (sql.includes('INSERT INTO cctv_behavior_telemetry') || sql.includes('FROM cctv_cameras')) return { rows: [] }
        throw new Error('unexpected query: ' + sql.slice(0, 80))
    },
    pool: { on() {} }
})
stub('../app/middleware/deviceAuthMiddleware', {
    verifyDeviceKey: (req, res, next) => { req.device = { id: DEV, farmId: 'farm-1', serial: 'BOX-1' }; next() },
    hashDeviceKey: () => '', generateDeviceKey: () => ''
})
stub('../app/services/visionService', {
    canAccept: () => state.accept,
    detect: async () => {
        const zero = { standing: 0, lying: 0, feeding: 0, drinking: 0 }
        return { boxes: [], counts: zero, pct: zero, total: 0, cci: null, confidence_avg: null, timing_ms: { total: 0 } }
    },
    IMGSZ: 480, status: () => ({})
})
stub('../app/services/cameraSamples', { maybeSaveSample: async () => {}, buildSampleJson: () => ({}) })

const express = require('express')
const jwt = require('jsonwebtoken')
const app = express()
app.use(express.json())
app.use('/api/Admin/devices', require('../app/routes/Admin/devices'))
app.use('/api/camera', require('../app/routes/camera'))
const admin = jwt.sign({ id: 'u1', role: 'admin' }, process.env.SECRET_KEY)
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0xff, 0xd9])

const server = app.listen(0, async () => {
    const base = `http://127.0.0.1:${server.address().port}/api`
    const put = async (body) => {
        const r = await fetch(`${base}/Admin/devices/${DEV}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` }, body: JSON.stringify(body) })
        return { status: r.status, body: await r.json() }
    }
    const shot = async () => {
        const r = await fetch(`${base}/camera/snapshot`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: JPEG })
        return { status: r.status, body: await r.json() }
    }
    try {
        // ยังไม่ตั้ง = ไม่ส่ง next_interval_sec กล่องใช้ค่าในเฟิร์มแวร์
        let s = await shot()
        assert.strictEqual(s.status, 202); assert.ok(!('next_interval_sec' in s.body))

        // ตั้ง 60 วินาที แล้วกล่องได้ค่าในคำตอบ
        assert.strictEqual((await put({ name_devices: 'box', camera_interval_sec: 60 })).status, 200)
        s = await shot()
        assert.strictEqual(s.status, 202); assert.strictEqual(s.body.next_interval_sec, 60)

        // server ยุ่ง (429) ก็ยังบอกรอบใหม่
        state.accept = false
        s = await shot()
        assert.strictEqual(s.status, 429); assert.strictEqual(s.body.next_interval_sec, 60)
        state.accept = true

        // ค่าผิดช่วง/ไม่ใช่จำนวนเต็ม ไม่ถูกบันทึก
        for (const bad of [10, 3601, 30.5, 'abc']) assert.strictEqual((await put({ camera_interval_sec: bad })).status, 400, `reject ${bad}`)
        assert.strictEqual(state.interval, 60)

        // ไม่ส่ง field = ไม่แก้ / null = กลับไปใช้ค่าในเฟิร์มแวร์
        await put({ name_devices: 'box renamed' }); assert.strictEqual(state.interval, 60)
        await put({ camera_interval_sec: null }); assert.strictEqual(state.interval, null)
        assert.ok(!('next_interval_sec' in (await shot()).body))

        // ยังไม่ได้รัน migration: บันทึกรอบไม่ได้ บอกให้รัน migration และการรับภาพยังทำงานปกติ
        state.columnExists = false
        const m = await put({ camera_interval_sec: 60 })
        assert.strictEqual(m.status, 409); assert.ok(m.body.message.includes('20261116_device_camera_interval.sql'))
        s = await shot()
        assert.strictEqual(s.status, 202); assert.ok(!('next_interval_sec' in s.body))

        console.log('camera_interval_test: all passed')
    } catch (e) {
        console.error(e); process.exitCode = 1
    } finally {
        server.close()
        setTimeout(() => process.exit(), 200)
    }
})
