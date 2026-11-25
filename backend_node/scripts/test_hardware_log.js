// ทดสอบการเก็บหลักฐานฝั่งฮาร์ดแวร์ (ฐานข้อมูล/YOLO จำลอง): node backend_node/scripts/test_hardware_log.js
// - heartbeat ทุกครั้งถูกเก็บลง tb_device_heartbeats
// - ทุกภาพที่ถึง server ถูกเก็บลง tb_camera_frames (ขนาด เวลาถ่าย เวลาที่ได้รับ สถานะ accepted/busy)
// - ยังไม่รัน migration (42P01) = ข้าม ไม่ทำให้ heartbeat/ภาพล้ม
const assert = require('assert')
const path = require('path')
process.env.SECRET_KEY = 'test-secret-hardware-log'

const DEV = '66666666-6666-4666-8666-666666666666'
const FARM = '77777777-7777-4777-8777-777777777777'
const state = { accept: true, tablesExist: true, inserts: [] }
const stub = (rel, exports) => {
    const p = require.resolve(path.resolve(__dirname, rel))
    require.cache[p] = { id: p, filename: p, loaded: true, exports }
}
const missing = () => Object.assign(new Error('relation does not exist'), { code: '42P01' })
stub('../app/config/db', {
    query: async (sql, p = []) => {
        if (sql.includes('INSERT INTO tb_device_heartbeats') || sql.includes('INSERT INTO tb_camera_frames')) {
            if (!state.tablesExist) throw missing()
            state.inserts.push({ sql, p })
            return { rows: [] }
        }
        if (sql.includes("to_jsonb(d)->>'camera_interval_sec'")) return { rows: [{ s: 15 }] }
        if (sql.includes('UPDATE tb_devices')) return { rows: [] }
        if (sql.includes('INSERT INTO cctv_behavior_telemetry')) return { rows: [{ id: 1 }] }
        if (sql.includes("detections->'boxes'")) return { rows: [] }
        if (sql.includes('FROM cctv_cameras') || sql.includes('FROM tb_cow_tracking_targets')) return { rows: [] }
        if (sql.includes('FROM tb_devices') && sql.includes('serial_no')) return { rows: [{ id_devices: DEV, id_farms: FARM }] }
        throw new Error('unexpected query: ' + sql.slice(0, 80))
    },
    pool: { on() {} }
})
stub('../app/middleware/deviceAuthMiddleware', {
    verifyDeviceKey: (req, res, next) => { req.device = { id: DEV, farmId: FARM, serial: 'BOX-1' }; next() },
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
stub('../app/services/cameraSamples', { maybeSaveSample: async () => {}, saveLatest: async () => {}, buildSampleJson: () => ({}) })

const express = require('express')
const app = express()
app.use(express.json())
app.use('/api/sensors', require('../app/routes/Admin/sensors'))
app.use('/api/camera', require('../app/routes/camera'))
const hw = require('../app/services/hardwareLog')
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 0xff, 0xd9])
const wait = (ms) => new Promise(r => setTimeout(r, ms))

const server = app.listen(0, async () => {
    const base = `http://127.0.0.1:${server.address().port}/api`
    const shot = (capturedS) => fetch(`${base}/camera/snapshot`, {
        method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Captured-At': String(capturedS) }, body: JPEG
    })
    const beat = () => fetch(`${base}/sensors/heartbeat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial_no: 'BOX-1', fw_version: '1.6.0', uptime_s: 600, rssi: -70, reset_reason: 'watchdog' })
    })
    try {
        const now = Math.floor(Date.now() / 1000)

        // ภาพที่รับไปประมวลผล
        let r = await shot(now - 3)
        assert.strictEqual(r.status, 202)
        await wait(50)
        let f = state.inserts.filter(i => i.sql.includes('tb_camera_frames'))
        assert.strictEqual(f.length, 1, 'accepted frame recorded')
        assert.deepStrictEqual([f[0].p[0], f[0].p[1], f[0].p[4], f[0].p[5]], [DEV, FARM, JPEG.length, 'accepted'])
        assert.strictEqual(f[0].p[2], new Date((now - 3) * 1000).toISOString(), 'captured_at from the box')
        assert.ok(new Date(f[0].p[3]) >= new Date((now - 3) * 1000), 'received_at is after captured_at')

        // server ยุ่ง: ตอบ 429 แต่ยังนับว่าภาพมาถึง
        state.accept = false
        r = await shot(now)
        assert.strictEqual(r.status, 429)
        await wait(20)
        f = state.inserts.filter(i => i.sql.includes('tb_camera_frames'))
        assert.strictEqual(f.length, 2)
        assert.strictEqual(f[1].p[5], 'busy')
        state.accept = true

        // heartbeat ทุกครั้งถูกเก็บเป็นประวัติ
        r = await beat()
        assert.strictEqual(r.status, 200)
        const h = state.inserts.filter(i => i.sql.includes('tb_device_heartbeats'))
        assert.strictEqual(h.length, 1)
        assert.strictEqual(h[0].p[0], DEV)
        const health = JSON.parse(h[0].p[1])
        assert.strictEqual(health.fw_version, '1.6.0')
        assert.strictEqual(health.reset_reason, 'watchdog')

        // ยังไม่รัน migration: heartbeat และภาพยังผ่าน แค่ไม่บันทึกประวัติ
        state.tablesExist = false
        r = await beat()
        assert.strictEqual(r.status, 200, 'heartbeat still accepted without the table')
        r = await shot(now + 5)
        assert.strictEqual(r.status, 202, 'snapshot still accepted without the table')
        await wait(20)
        assert.strictEqual(hw._ready.heartbeats, false)
        assert.strictEqual(hw._ready.frames, false)
        assert.strictEqual(await hw.recordHeartbeat(DEV, {}), false, 'stops trying after the first missing-table error')

        console.log('test_hardware_log: all passed')
    } catch (err) {
        console.error('FAILED:', err.message)
        process.exitCode = 1
    } finally {
        server.close()
        setTimeout(() => process.exit(), 50)
    }
})
