const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { verifyDeviceKey } = require('../../middleware/deviceAuthMiddleware')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')

const { calcThi, getRiskLevel } = require('../../services/heatStress')
const { MAX_BATCH, parseReading, resolveDevice, insertReadings } = require('../../services/sensorIngest')
const { sanitizeHeartbeat } = require('../../services/deviceHealth')
const { recordHeartbeat } = require('../../services/hardwareLog')

const UNKNOWN_DEVICE = { success: false, message: 'ไม่พบอุปกรณ์นี้ในระบบ ลงทะเบียนในหน้า Admin > Devices ก่อน (ข้อมูลยังเก็บอยู่ในกล่อง)' }

// endpoint ส่วนนี้ไม่ผูกฟาร์ม ใช้เกณฑ์ค่าเริ่มต้น (ระดับรายฟาร์มดูที่ /api/Admin/farms/:id)
const getStressLevel = (thi) => getRiskLevel(thi, 'default')

// GET ทั้งหมดในไฟล์นี้เป็นข้อมูลสำหรับ admin (อุปกรณ์ส่งข้อมูลผ่าน POST + device key)
const adminOnly = [verifyToken, requireRole('admin')]

const withThi = (r) => {
    const temp = r.temperature_c != null ? parseFloat(r.temperature_c) : null
    const hum = r.humidity_pct != null ? parseFloat(r.humidity_pct) : null
    const thi = calcThi(temp, hum) ?? (r.thi != null ? parseFloat(r.thi) : null)
    return { ...r, temperature_c: temp, humidity_pct: hum, thi, stress_level: getStressLevel(thi) }
}

// -----------------------------------------------------------------
// 1. POST: /api/sensors/data (หรือ /api/Admin/sensors/data, /api/sensors)
// รับข้อมูล 1 ค่าจาก ESP32-S3 (recorded_at ไม่บังคับ: ไม่ส่ง = ใช้เวลา server)
// -----------------------------------------------------------------
router.post(['/data', '/'], verifyDeviceKey, async (req, res) => {
    const body = req.body ?? {}
    const serial = body.serial_no ? String(body.serial_no).trim() : ''
    if (!serial) return res.status(400).json({ success: false, message: 'กรุณาส่ง serial_no' })

    if (body.temperature_c === undefined || body.humidity_pct === undefined) {
        return res.status(400).json({ success: false, message: 'กรุณาส่งค่า temperature_c และ humidity_pct ให้ครบถ้วน' })
    }
    const parsed = parseReading(body)
    if (parsed.error) {
        return res.status(400).json({ success: false, error: parsed.error, message: 'ค่าเซ็นเซอร์หรือเวลาไม่ถูกต้อง (temperature_c -10..65, humidity_pct 0..100, recorded_at ไม่เกิน 5 นาทีในอนาคต และไม่เก่ากว่า 30 วัน)' })
    }
    const r = parsed.reading

    try {
        const dev = await resolveDevice(req, serial)
        if (!dev) return res.status(404).json(UNKNOWN_DEVICE)
        const { deviceId, farmId } = dev
        const { inserted, duplicates } = await insertReadings(deviceId, farmId, [r])
        const thi = calcThi(r.temperature_c, r.humidity_pct)
        return res.status(200).json({
            success: true,
            message: duplicates ? 'Duplicate reading ignored' : 'Sensor data recorded',
            duplicate: duplicates > 0,
            data: {
                id: inserted[0]?.id_sensor_readings ?? null,
                serial_no: serial,
                temperature_c: r.temperature_c,
                humidity_pct: r.humidity_pct,
                pressure_hpa: r.pressure_hpa,
                thi,
                stress_level: getStressLevel(thi),
                recorded_at: inserted[0]?.recorded_at ?? r.recorded_at ?? null
            }
        })
    } catch (err) {
        // ห้ามตอบ 200 เมื่อบันทึกไม่สำเร็จ ไม่งั้นบอร์ดจะลบข้อมูลออกจากคิวทั้งที่ยังไม่ได้บันทึก
        console.error('[Sensor Ingest Error]:', err.message)
        return res.status(503).json({ success: false, message: 'บันทึกข้อมูลไม่สำเร็จ กรุณาส่งใหม่' })
    }
})

// -----------------------------------------------------------------
// 1.1 POST: /api/sensors/batch
// Store-and-forward: บอร์ดส่งค่าที่ค้างในคิว (เก่าสุดก่อน) ครั้งละไม่เกิน MAX_BATCH
// body: { serial_no, readings: [{ recorded_at (epoch วินาที UTC), temperature_c, humidity_pct, pressure_hpa? }] }
// ตอบ processed = จำนวนค่าแรกของ readings ที่บอร์ดลบออกจากคิวได้ (บันทึกแล้ว ซ้ำ หรือผิดถาวร)
// -----------------------------------------------------------------
router.post('/batch', verifyDeviceKey, async (req, res) => {
    const body = req.body ?? {}
    const serial = body.serial_no ? String(body.serial_no).trim() : ''
    if (!serial) return res.status(400).json({ success: false, message: 'กรุณาส่ง serial_no' })
    const items = body.readings

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'readings ต้องเป็น array ที่มีอย่างน้อย 1 ค่า' })
    }
    if (items.length > MAX_BATCH) {
        return res.status(413).json({ success: false, message: `ส่งได้ครั้งละไม่เกิน ${MAX_BATCH} ค่า` })
    }

    const now = Date.now()
    const valid = []
    const rejected = []
    items.forEach((raw, index) => {
        const parsed = parseReading(raw, now)
        // ค่าที่ไม่มีเวลาใน batch ไม่มีความหมาย (ส่งย้อนหลัง) ถือว่าผิดถาวร
        if (!parsed.error && !parsed.reading.recorded_at) parsed.error = 'missing_time'
        if (parsed.error) rejected.push({ index, reason: parsed.error })
        else valid.push(parsed.reading)
    })

    try {
        const dev = await resolveDevice(req, serial)
        if (!dev) return res.status(404).json({ ...UNKNOWN_DEVICE, processed: 0 })
        const { deviceId, farmId } = dev
        const { inserted, duplicates } = await insertReadings(deviceId, farmId, valid)
        const lastMs = valid.reduce((m, r) => Math.max(m, r.recorded_at.getTime()), 0)
        if (rejected.length) console.warn(`[Sensor Batch] ${serial}: rejected ${rejected.length}/${items.length}`, rejected.slice(0, 5))
        return res.status(200).json({
            success: true,
            processed: items.length,
            accepted: inserted.length,
            duplicates,
            rejected,
            last_recorded_at: lastMs ? Math.floor(lastMs / 1000) : null
        })
    } catch (err) {
        console.error('[Sensor Batch Error]:', err.message)
        return res.status(503).json({ success: false, processed: 0, message: 'บันทึกข้อมูลไม่สำเร็จ กรุณาส่งใหม่' })
    }
})

// -----------------------------------------------------------------
// 1.2 POST: /api/sensors/heartbeat
// สถานะกล่องทุก 5 นาที (firmware 1.4.0+) ส่งแม้เซ็นเซอร์อ่านค่าไม่ได้
// ต้องรัน migrations/20261025_device_heartbeat.sql (ยังไม่รัน = อัปเดตแค่ last_seen_at)
// -----------------------------------------------------------------
router.post('/heartbeat', verifyDeviceKey, async (req, res) => {
    const body = req.body ?? {}
    const serial = body.serial_no ? String(body.serial_no).trim() : ''
    if (!serial) return res.status(400).json({ success: false, message: 'กรุณาส่ง serial_no' })
    try {
        const dev = await resolveDevice(req, serial)
        if (!dev) return res.status(404).json(UNKNOWN_DEVICE)
        const health = sanitizeHeartbeat(body)
        try {
            await db.query(
                `UPDATE tb_devices SET status = 'online', last_seen_at = NOW(), last_heartbeat_at = NOW(),
                        fw_version = $1, health = $2::jsonb WHERE id_devices = $3`,
                [health.fw_version, JSON.stringify(health), dev.deviceId]
            )
        } catch (colErr) {
            if (colErr.code !== '42703') throw colErr
            console.warn('[Heartbeat] columns missing - run migrations/20261025_device_heartbeat.sql')
            await db.query(`UPDATE tb_devices SET status = 'online', last_seen_at = NOW() WHERE id_devices = $1`, [dev.deviceId])
            return res.json({ success: true, stored: false })
        }
        // ประวัติทุก heartbeat (uptime, รีบูต, สัญญาณ Wi-Fi ย้อนหลัง) บันทึกพลาดไม่กระทบคำตอบ
        await recordHeartbeat(dev.deviceId, health)
        return res.json({ success: true, stored: true })
    } catch (err) {
        console.error('[Heartbeat Error]:', err.message)
        return res.status(503).json({ success: false, message: 'บันทึกสถานะไม่สำเร็จ' })
    }
})

// -----------------------------------------------------------------
// 2. GET: /api/Admin/sensors/latest
// ดึงข้อมูลเซ็นเซอร์ล่าสุด สำหรับ Admin Dashboard แสดงผล Real-time
// -----------------------------------------------------------------
router.get('/latest', adminOnly, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT sr.*, d.name_devices AS device_name, d.serial_no, d.status AS device_status
            FROM tb_sensor_readings sr
            LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
            ORDER BY sr.recorded_at DESC
            LIMIT 1
        `)

        if (rows.length === 0) {
            return res.json({
                success: true,
                message: 'No sensor data recorded yet.',
                data: null
            })
        }

        return res.json({
            success: true,
            data: withThi(rows[0])
        })
    } catch (err) {
        console.error('[Get Latest Sensor Error]:', err.message)
        return res.status(500).json({
            success: false,
            message: 'Error fetching latest sensor data: ' + err.message
        })
    }
})

// -----------------------------------------------------------------
// 3. GET: /api/Admin/sensors/history
// ดึงประวัติข้อมูลเซ็นเซอร์ 50 รายการล่าสุด สำหรับวาดกราฟใน Dashboard
// -----------------------------------------------------------------
router.get('/history', adminOnly, async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 1000)
        const { rows } = await db.query(`
            SELECT sr.*, d.serial_no, d.name_devices AS device_name
            FROM tb_sensor_readings sr
            LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
            ORDER BY sr.recorded_at DESC
            LIMIT $1
        `, [limit])

        const mapped = rows.map(withThi)

        return res.json({
            success: true,
            count: mapped.length,
            data: mapped.reverse() // เรียงจากเก่าไปใหม่สำหรับวาดกราฟ
        })
    } catch (err) {
        console.error('[Get Sensor History Error]:', err.message)
        return res.status(500).json({
            success: false,
            message: 'Error fetching sensor history: ' + err.message
        })
    }
})

// -----------------------------------------------------------------
// 4. GET: /api/Admin/sensors/devices
// ดึงรายการอุปกรณ์ IoT ทั้งหมด พร้อมสถานะ Online/Offline
// -----------------------------------------------------------------
router.get('/devices', adminOnly, async (req, res) => {
    try {
        // ไม่ส่ง hash ของ device key ออกไป (to_jsonb - คอลัมน์ ใช้ได้แม้ตารางมีคอลัมน์เพิ่มในอนาคต)
        const { rows } = await db.query(`
            SELECT to_jsonb(d) - 'api_key_hash' AS device, f.name_farms AS farm_name,
                   CASE 
                     WHEN d.last_seen_at >= NOW() - INTERVAL '5 minutes' THEN 'online'
                     ELSE 'offline'
                   END AS calculated_status
            FROM tb_devices d
            LEFT JOIN tb_farms f ON f.id_farms = d.id_farms
            ORDER BY d.created_at DESC
        `)

        const devices = rows.map(({ device, ...rest }) => ({ ...device, ...rest }))
        return res.json({
            success: true,
            count: devices.length,
            devices
        })
    } catch (err) {
        console.error('[Get Devices Error]:', err.message)
        return res.status(500).json({
            success: false,
            message: 'Error fetching devices: ' + err.message
        })
    }
})

// -----------------------------------------------------------------
// 5. GET: /api/Admin/sensors/stats
// สรุปภาพรวมสถานะสำหรับ Metrics Cards ในหน้า Admin
// -----------------------------------------------------------------
router.get('/stats', adminOnly, async (req, res) => {
    try {
        const devicesRes = await db.query(`
            SELECT 
                COUNT(*) AS total_devices,
                COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '5 minutes') AS online_devices,
                COUNT(*) FILTER (WHERE last_seen_at < NOW() - INTERVAL '5 minutes' OR last_seen_at IS NULL) AS offline_devices
            FROM tb_devices
        `)

        const latestRes = await db.query(`
            SELECT temperature_c, humidity_pct, recorded_at
            FROM tb_sensor_readings
            ORDER BY recorded_at DESC
            LIMIT 1
        `)

        const stats = {
            devices: devicesRes.rows[0] || { total_devices: 0, online_devices: 0, offline_devices: 0 },
            latest: latestRes.rows[0] ? withThi(latestRes.rows[0]) : null
        }

        return res.json({
            success: true,
            data: stats
        })
    } catch (err) {
        console.error('[Get Sensor Stats Error]:', err.message)
        return res.status(500).json({
            success: false,
            message: 'Error fetching sensor stats: ' + err.message
        })
    }
})

module.exports = router
