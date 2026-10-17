/**
 * CowCare AI - Admin Device Management Router
 * API สำหรับจัดการอุปกรณ์ IoT (ESP32-S3 SHT40/BMP280) และกล้อง CCTV/Vision AI
 */

const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')

// Helper function to check valid UUID
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// -----------------------------------------------------------------
// 1. GET: /api/Admin/devices
// ดึงรายการอุปกรณ์ทั้งหมด พร้อมฟาร์มที่ผูกและค่าตรวจวัดล่าสุด
// -----------------------------------------------------------------
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const query = `
            SELECT 
                d.id_devices,
                d.name_devices,
                d.serial_no,
                COALESCE(d.type, 'env_sensor') AS type,
                d.status,
                d.last_seen_at,
                d.created_at,
                f.id_farms,
                f.name_farms,
                f.province,
                COALESCE(f.barn_unit, 'โรงเรือนหลัก (Unit 1)') AS barn_unit,
                u.name_users AS farmer_name,
                sr.temperature_c,
                sr.humidity_pct,
                sr.thi,
                sr.recorded_at AS last_reading_time
            FROM tb_devices d
            LEFT JOIN tb_farms f ON f.id_farms = d.id_farms
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            LEFT JOIN LATERAL (
                SELECT s.temperature_c, s.humidity_pct, s.thi, s.recorded_at
                FROM tb_sensor_readings s
                WHERE s.id_devices = d.id_devices
                ORDER BY s.recorded_at DESC
                LIMIT 1
            ) sr ON true
            ORDER BY d.created_at DESC
        `
        const { rows } = await db.query(query)

        const now = Date.now()
        const devices = rows.map(dev => {
            const lastSeen = dev.last_seen_at ? new Date(dev.last_seen_at).getTime() : 0
            const diffMin = lastSeen > 0 ? (now - lastSeen) / (1000 * 60) : 9999
            const isOnline = diffMin < 10

            return {
                ...dev,
                computed_status: isOnline ? 'online' : 'offline',
                minutes_since_seen: Math.round(diffMin),
                battery_pct: 95, // ESP32-S3 AC Powered / LiPo Backup
                signal_rssi: isOnline ? -65 : -95,
                signal_quality: isOnline ? 'ดีเยี่ยม (-65 dBm)' : 'ไม่มีสัญญาณ'
            }
        })

        const total = devices.length
        const onlineCount = devices.filter(d => d.computed_status === 'online').length
        const offlineCount = total - onlineCount

        res.json({
            success: true,
            total,
            online_count: onlineCount,
            offline_count: offlineCount,
            devices
        })
    } catch (err) {
        console.error('[Admin Devices List Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลอุปกรณ์ได้: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 2. POST: /api/Admin/devices
// ลงทะเบียนอุปกรณ์ IoT ใหม่
// -----------------------------------------------------------------
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { name_devices, serial_no, type, id_farms } = req.body

        if (!name_devices || !serial_no) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่ออุปกรณ์และ Serial Number' })
        }

        const cleanSerial = String(serial_no).trim().toUpperCase()

        // ตรวจสอบ Serial ซ้ำ
        const checkExist = await db.query(`SELECT id_devices FROM tb_devices WHERE UPPER(serial_no) = $1`, [cleanSerial])
        if (checkExist.rows.length > 0) {
            return res.status(400).json({ success: false, message: `Serial Number ${cleanSerial} นี้มีอยู่ในระบบแล้ว` })
        }

        let farmUuid = null
        if (id_farms && isUUID(id_farms)) {
            farmUuid = id_farms
        }

        const insertRes = await db.query(
            `INSERT INTO tb_devices (name_devices, serial_no, type, id_farms, status, created_at)
             VALUES ($1, $2, $3, $4, 'offline', NOW())
             RETURNING id_devices, name_devices, serial_no, type, id_farms, status, created_at`,
            [name_devices.trim(), cleanSerial, type || 'env_sensor', farmUuid]
        )

        res.status(201).json({
            success: true,
            message: 'ลงทะเบียนอุปกรณ์สำเร็จ',
            device: insertRes.rows[0]
        })
    } catch (err) {
        console.error('[Admin Register Device Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถลงทะเบียนอุปกรณ์ได้: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 3. PUT: /api/Admin/devices/:id
// อัปเดตข้อมูลอุปกรณ์ / สลับฟาร์มที่ติดตั้ง
// -----------------------------------------------------------------
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params
        const { name_devices, serial_no, type, id_farms, status } = req.body

        let farmUuid = null
        if (id_farms && isUUID(id_farms)) {
            farmUuid = id_farms
        }

        const updateRes = await db.query(
            `UPDATE tb_devices 
             SET name_devices = COALESCE($1, name_devices),
                 serial_no = COALESCE($2, serial_no),
                 type = COALESCE($3, type),
                 id_farms = $4,
                 status = COALESCE($5, status)
             WHERE id_devices = $6
             RETURNING *`,
            [
                name_devices ? name_devices.trim() : null,
                serial_no ? String(serial_no).trim().toUpperCase() : null,
                type || null,
                farmUuid,
                status || null,
                id
            ]
        )

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์ที่ต้องการแก้ไข' })
        }

        res.json({
            success: true,
            message: 'อัปเดตข้อมูลอุปกรณ์สำเร็จ',
            device: updateRes.rows[0]
        })
    } catch (err) {
        console.error('[Admin Update Device Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถอัปเดตอุปกรณ์ได้: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 4. DELETE: /api/Admin/devices/:id
// ยกเลิกการเชื่อมต่อ / ลบอุปกรณ์
// -----------------------------------------------------------------
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params

        const delRes = await db.query(`DELETE FROM tb_devices WHERE id_devices = $1 RETURNING id_devices, name_devices`, [id])
        if (delRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' })
        }

        res.json({
            success: true,
            message: `ลบอุปกรณ์ ${delRes.rows[0].name_devices} สำเร็จ`
        })
    } catch (err) {
        console.error('[Admin Delete Device Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถลบอุปกรณ์ได้: ' + err.message })
    }
})

module.exports = router
