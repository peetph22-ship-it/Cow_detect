/**
 * CowCare AI - Admin Device Management Router
 * API สำหรับจัดการอุปกรณ์ IoT (ESP32-S3 + SHT20 RS485) และกล้อง CCTV/Vision AI
 */

const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')
const { generateDeviceKey, hashDeviceKey } = require('../../middleware/deviceAuthMiddleware')
const { summarizeHealth } = require('../../services/deviceHealth')
const { calcThi } = require('../../services/heatStress')
const { INTERVAL_MIN: CAMERA_INTERVAL_MIN } = require('../../services/cameraBehavior')

// Helper function to check valid UUID
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// -----------------------------------------------------------------
// 1. GET: /api/Admin/devices
// ดึงรายการอุปกรณ์ทั้งหมด พร้อมฟาร์มที่ผูกและค่าตรวจวัดล่าสุด
// -----------------------------------------------------------------
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const queryDevices = `
            SELECT 
                d.id_devices,
                d.name_devices,
                d.serial_no,
                COALESCE(d.type, 'env_sensor') AS type,
                d.status,
                d.last_seen_at,
                d.created_at,
                to_jsonb(d)->>'fw_version' AS fw_version,
                to_jsonb(d)->>'last_heartbeat_at' AS last_heartbeat_at,
                to_jsonb(d)->'health' AS health,
                f.id_farms,
                f.name_farms,
                f.province,
                COALESCE(f.barn_unit, 'โรงเรือนหลัก (Unit 1)') AS barn_unit,
                u.name_users AS farmer_name,
                sr.temperature_c,
                sr.humidity_pct,
                sr.recorded_at AS last_reading_time
            FROM tb_devices d
            LEFT JOIN tb_farms f ON f.id_farms = d.id_farms
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            LEFT JOIN LATERAL (
                SELECT s.temperature_c, s.humidity_pct, s.recorded_at
                FROM tb_sensor_readings s
                WHERE s.id_devices = d.id_devices
                ORDER BY s.recorded_at DESC
                LIMIT 1
            ) sr ON true
            ORDER BY d.created_at DESC
        `

        const queryCameras = `
            SELECT 
                c.id,
                c.farm_id,
                c.camera_name,
                c.barn_unit,
                c.brand,
                c.model,
                c.ip_address,
                c.rtsp_port,
                c.channel_no,
                c.is_active,
                c.is_simulation,
                c.created_at,
                c.updated_at,
                f.name_farms,
                f.province,
                u.name_users AS farmer_name,
                lt.last_image_at
            FROM cctv_cameras c
            LEFT JOIN tb_farms f ON f.id_farms = c.farm_id
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            LEFT JOIN LATERAL (
                SELECT MAX(t.timestamp) AS last_image_at
                FROM cctv_behavior_telemetry t
                WHERE t.farm_id = c.farm_id AND t.is_simulation = false
            ) lt ON true
            ORDER BY c.created_at DESC
        `

        const [devRes, camRes] = await Promise.all([
            db.query(queryDevices),
            db.query(queryCameras).catch(err => {
                console.warn('[Admin Devices] cctv_cameras query error:', err.message)
                return { rows: [] }
            })
        ])

        const now = Date.now()
        // สถานะจริงจาก heartbeat (firmware 1.4.0+) และเวลาค่าล่าสุด ไม่มีค่าสมมติ (เดิมใส่แบตเตอรี่ 95% และสัญญาณ -65 dBm ตายตัว)
        const devices = devRes.rows.map(dev => {
            const lastSeen = dev.last_seen_at ? new Date(dev.last_seen_at).getTime() : 0
            const diffMin = lastSeen > 0 ? (now - lastSeen) / (1000 * 60) : null
            const health = summarizeHealth({
                last_heartbeat_at: dev.last_heartbeat_at,
                health: dev.health,
                last_reading_at: dev.last_reading_time,
                last_seen_at: dev.last_seen_at
            })
            const temp = dev.temperature_c != null ? Number(dev.temperature_c) : null
            const hum = dev.humidity_pct != null ? Number(dev.humidity_pct) : null
            const { health: _raw, ...rest } = dev
            return {
                ...rest,
                thi: calcThi(temp, hum),
                computed_status: diffMin != null && diffMin < 5 ? 'online' : 'offline',
                minutes_since_seen: diffMin != null ? Math.round(diffMin) : null,
                health_summary: health
            }
        })

        // กล้อง: ออนไลน์ = มีภาพจริงเข้ามาภายใน 3 รอบ (เดิมถือว่าออนไลน์ทุกตัวที่เปิดใช้งาน)
        const cameras = camRes.rows.map(cam => {
            const imgMin = cam.last_image_at ? Math.round((now - new Date(cam.last_image_at).getTime()) / 60000) : null
            const isOnline = cam.is_active !== false && imgMin != null && imgMin <= CAMERA_INTERVAL_MIN * 3
            return {
                id_devices: cam.id,
                name_devices: cam.camera_name,
                serial_no: `${cam.brand || 'กล้อง'} (${cam.ip_address})`,
                type: 'camera',
                status: cam.is_active !== false ? 'active' : 'inactive',
                last_seen_at: cam.last_image_at || null,
                created_at: cam.created_at,
                id_farms: cam.farm_id,
                name_farms: cam.name_farms || 'ฟาร์มไม่ระบุ',
                province: cam.province || '-',
                barn_unit: cam.barn_unit || 'โรงเรือนหลัก',
                farmer_name: cam.farmer_name || '-',
                temperature_c: null,
                humidity_pct: null,
                thi: null,
                last_reading_time: null,
                computed_status: isOnline ? 'online' : 'offline',
                minutes_since_seen: imgMin,
                health_summary: {
                    status: cam.is_active === false ? 'disabled' : imgMin == null ? 'never_seen' : isOnline ? 'ok' : 'offline',
                    message: cam.is_active === false ? 'ปิดใช้งาน'
                        : imgMin == null ? 'ยังไม่เคยได้รับภาพจากกล้องนี้'
                        : isOnline ? `ภาพล่าสุด ${imgMin} นาทีที่แล้ว` : `ไม่มีภาพใหม่ ${imgMin} นาที`,
                    warnings: []
                },
                is_simulation: cam.is_simulation,
                is_camera: true
            }
        })

        const allDevices = [...devices, ...cameras]
        const total = allDevices.length
        const onlineCount = allDevices.filter(d => d.computed_status === 'online').length
        const offlineCount = total - onlineCount

        res.json({
            success: true,
            total,
            online_count: onlineCount,
            offline_count: offlineCount,
            devices: allDevices
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
             RETURNING id_devices, name_devices, serial_no, type, id_farms, status, last_seen_at, created_at`,
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
// 3.1 POST: /api/Admin/devices/:id/rotate-key
// สร้าง / เปลี่ยน Device API Key (key เดิมใช้ไม่ได้ทันที)
// key จริงแสดงครั้งเดียวใน response นี้ ในฐานข้อมูลเก็บเฉพาะ SHA-256 hash
// -----------------------------------------------------------------
router.post('/:id/rotate-key', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params
        if (!isUUID(id)) {
            return res.status(400).json({ success: false, message: 'รหัสอุปกรณ์ไม่ถูกต้อง' })
        }

        const apiKey = generateDeviceKey()
        const updateRes = await db.query(
            `UPDATE tb_devices
             SET api_key_hash = $1, api_key_created_at = NOW()
             WHERE id_devices = $2
             RETURNING id_devices, name_devices, serial_no, api_key_created_at`,
            [hashDeviceKey(apiKey), id]
        )

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' })
        }

        res.set('Cache-Control', 'no-store')
        res.json({
            success: true,
            message: 'สร้าง Device API Key สำเร็จ กรุณาคัดลอกเก็บไว้ ระบบจะไม่แสดง key นี้อีก',
            device: updateRes.rows[0],
            api_key: apiKey
        })
    } catch (err) {
        console.error('[Admin Rotate Device Key Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถสร้าง API Key ได้: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 4. DELETE: /api/Admin/devices/:id
// ยกเลิกการเชื่อมต่อ / ลบอุปกรณ์
// -----------------------------------------------------------------
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params

        let delRes = await db.query(`DELETE FROM tb_devices WHERE id_devices = $1 RETURNING id_devices, name_devices`, [id])
        if (delRes.rows.length === 0) {
            const delCam = await db.query(`DELETE FROM cctv_cameras WHERE id = $1 RETURNING id, camera_name`, [id])
            if (delCam.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' })
            }
            return res.json({
                success: true,
                message: `ลบกล้อง ${delCam.rows[0].camera_name} สำเร็จ`
            })
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
