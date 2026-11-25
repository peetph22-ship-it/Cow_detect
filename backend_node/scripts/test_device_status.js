// ทดสอบสถานะกล่องและกล้อง (ฐานข้อมูลจำลอง): node backend_node/scripts/test_device_status.js
// - กล้องออนไลน์/ขาดการติดต่อตามรอบถ่ายภาพจริงของกล่อง (ไม่ใช่ค่าคงที่ 10 นาที)
// - ภาพที่ถึง server ล่าสุด (tb_camera_frames) นับด้วย ยังไม่มีตาราง = ใช้ผลโมเดล
// - หน้า Devices ได้อายุของค่าเซ็นเซอร์ล่าสุด และกล่องที่ส่ง heartbeat ทุก 5 นาทีไม่ขึ้นออฟไลน์
const assert = require('assert')
const path = require('path')
process.env.SECRET_KEY = 'test-secret-device-status'
const { cameraStatus, offlineAfterSec, agoText, latestOf, DEFAULT_INTERVAL_SEC } = require('../app/services/cameraStatus')

const now = Date.parse('2026-12-06T08:00:00Z')
const ago = (s) => new Date(now - s * 1000).toISOString()

// ---- กติกา ----
assert.strictEqual(DEFAULT_INTERVAL_SEC, 600)
assert.strictEqual(offlineAfterSec(15), 300, 'รอบ 15 วิ: ขาดการติดต่อหลัง 5 นาที (ขั้นต่ำ)')
assert.strictEqual(offlineAfterSec(120), 480, 'รอบ 2 นาที: 4 รอบ')
assert.strictEqual(offlineAfterSec(null), 2400, 'ไม่ได้ตั้งรอบ: ค่าเฟิร์มแวร์ 10 นาที x 4')
assert.strictEqual(cameraStatus(null, 15, now).status, 'no_data')
assert.strictEqual(cameraStatus(ago(60), 15, now).status, 'online')
assert.strictEqual(cameraStatus(ago(6 * 60), 15, now).status, 'offline', 'เดิมขึ้นออนไลน์ถึง 30 นาที')
assert.strictEqual(cameraStatus(ago(6 * 60), null, now).status, 'online', 'รอบเฟิร์มแวร์ 10 นาที ยังไม่ถึง 40 นาที')
assert.strictEqual(agoText(42), '42 วินาทีที่แล้ว')
assert.strictEqual(agoText(600), '10 นาทีที่แล้ว')
assert.strictEqual(agoText(3 * 86400), '3 วันที่แล้ว')
assert.strictEqual(latestOf(null, ago(30), ago(90)).toISOString(), ago(30))
assert.strictEqual(latestOf(null, undefined), null)

// ---- หน้า Devices (route จริง ฐานข้อมูลจำลอง) ----
const FARM = '88888888-8888-4888-8888-888888888888'
const state = { framesTable: true }
const realNow = Date.now()
const rAgo = (s) => new Date(realNow - s * 1000).toISOString()
const stub = (rel, exports) => {
    const p = require.resolve(path.resolve(__dirname, rel))
    require.cache[p] = { id: p, filename: p, loaded: true, exports }
}
stub('../app/config/db', {
    query: async (sql) => {
        if (sql.includes('FROM tb_camera_frames')) {
            if (!state.framesTable) throw Object.assign(new Error('relation does not exist'), { code: '42P01' })
            return { rows: [{ id_farms: FARM, last_frame_at: rAgo(20) }] }
        }
        if (sql.includes('FROM cctv_cameras c')) {
            return { rows: [{ id: 'cam-1', farm_id: FARM, camera_name: 'cam', brand: 'Dahua', ip_address: '192.168.1.108',
                is_active: true, is_simulation: false, created_at: rAgo(86400), last_image_at: rAgo(10 * 60), interval_sec: 15 }] }
        }
        if (sql.includes('FROM tb_devices d') && sql.includes('LEFT JOIN LATERAL')) {
            return { rows: [{
                id_devices: 'dev-1', name_devices: 'box', serial_no: 'ESP32-S3-01', type: 'env_sensor', status: 'online',
                last_seen_at: rAgo(4 * 60), created_at: rAgo(86400), fw_version: '1.6.0', last_heartbeat_at: rAgo(4 * 60),
                health: { fw_version: '1.6.0', sensor_ok: false, sensor_last_ok_s: -1, rssi: -66 },
                camera_interval_sec: 15, id_farms: FARM, name_farms: 'farm', province: 'x', barn_unit: 'u', farmer_name: 'f',
                temperature_c: 30.1, humidity_pct: 70, last_reading_time: rAgo(3 * 86400)
            }] }
        }
        throw new Error('unexpected query: ' + sql.slice(0, 80))
    },
    pool: { on() {} }
})
const express = require('express')
const jwt = require('jsonwebtoken')
const app = express()
app.use('/api/Admin/devices', require('../app/routes/Admin/devices'))
const admin = jwt.sign({ id: 'u1', role: 'admin' }, process.env.SECRET_KEY)

const server = app.listen(0, async () => {
    const get = async () => {
        const r = await fetch(`http://127.0.0.1:${server.address().port}/api/Admin/devices`, { headers: { Authorization: `Bearer ${admin}` } })
        return r.json()
    }
    try {
        let body = await get()
        const box = body.devices.find(d => d.id_devices === 'dev-1')
        const cam = body.devices.find(d => d.is_camera)
        assert.strictEqual(box.computed_status, 'online', 'heartbeat 4 นาทีที่แล้ว = ยังออนไลน์ (เดิมเกณฑ์ 5 นาทีพอดี กระพริบ)')
        assert.strictEqual(box.health_summary.status, 'sensor_fault')
        assert.ok(/SHT40/.test(box.health_summary.message), 'ข้อความชี้ไปที่ SHT40 ไม่ใช่ RS485')
        assert.strictEqual(box.reading_age_min, 3 * 1440, 'อายุค่าล่าสุด 3 วัน')
        assert.strictEqual(cam.computed_status, 'online', 'ภาพจาก tb_camera_frames 20 วิที่แล้ว')
        assert.ok(cam.health_summary.message.includes('วินาทีที่แล้ว'))

        // ยังไม่มีตาราง tb_camera_frames: ใช้ผลโมเดล 10 นาทีที่แล้ว ที่รอบ 15 วิ = ขาดการติดต่อ
        state.framesTable = false
        body = await get()
        const cam2 = body.devices.find(d => d.is_camera)
        assert.strictEqual(cam2.computed_status, 'offline', 'รอบ 15 วิ ไม่มีภาพ 10 นาที = ขาดการติดต่อ (เดิมออนไลน์ถึง 30 นาที)')
        assert.ok(cam2.health_summary.message.includes('รอบถ่าย 15 วิ'))

        console.log('test_device_status: all passed')
    } catch (err) {
        console.error('FAILED:', err.message)
        process.exitCode = 1
    } finally {
        server.close()
    }
})
