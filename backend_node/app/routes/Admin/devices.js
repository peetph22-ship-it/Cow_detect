/**
 * CowCare AI - Admin Device Management Router
 * API สำหรับจัดการอุปกรณ์ IoT (ESP32-S3 + SHT20 RS485) และกล้อง CCTV/Vision AI
 */

const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')
const { generateDeviceKey, hashDeviceKey } = require('../../middleware/deviceAuthMiddleware')
const { summarizeHealth, BOX_ONLINE_MIN } = require('../../services/deviceHealth')
const { calcThi } = require('../../services/heatStress')
const { cameraStatus, agoText, latestOf, lastFrameByFarm } = require('../../services/cameraStatus')
const { MAX_MINUTES: COLLECT_MAX_MINUTES, DEFAULT_IMAGE_KB, parseCollectMinutes, collectState } = require('../../services/collectMode')
const { BUCKET: SAMPLE_BUCKET, COLLECT_PREFIX } = require('../../services/cameraSamples')

const COLLECT_MIGRATION = 'migrations/20261121_device_collect_mode.sql'
const STORAGE_LIMIT_MB = 1024  // Supabase ฟรี

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
                (to_jsonb(d)->>'camera_interval_sec')::int AS camera_interval_sec,
                to_jsonb(d)->>'collect_started_at' AS collect_started_at,
                to_jsonb(d)->>'collect_until' AS collect_until,
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
                lt.last_image_at,
                di.interval_sec
            FROM cctv_cameras c
            LEFT JOIN tb_farms f ON f.id_farms = c.farm_id
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            LEFT JOIN LATERAL (
                SELECT MAX(t.timestamp) AS last_image_at
                FROM cctv_behavior_telemetry t
                WHERE t.farm_id = c.farm_id AND t.is_simulation = false
            ) lt ON true
            -- รอบถ่ายภาพของกล่องที่ผูกกับฟาร์มเดียวกัน (ใช้ตัดสินว่ากล้องขาดการติดต่อ)
            LEFT JOIN LATERAL (
                SELECT (to_jsonb(d)->>'camera_interval_sec')::int AS interval_sec
                FROM tb_devices d WHERE d.id_farms = c.farm_id
                ORDER BY d.last_seen_at DESC NULLS LAST LIMIT 1
            ) di ON true
            ORDER BY c.created_at DESC
        `

        const [devRes, camRes, frames] = await Promise.all([
            db.query(queryDevices),
            db.query(queryCameras).catch(err => {
                console.warn('[Admin Devices] cctv_cameras query error:', err.message)
                return { rows: [] }
            }),
            lastFrameByFarm(db)
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
            const { health: _raw, collect_started_at: _cs, collect_until: _cu, ...rest } = dev
            return {
                ...rest,
                collect: collectState(dev, new Date(now)),
                thi: calcThi(temp, hum),
                computed_status: diffMin != null && diffMin < BOX_ONLINE_MIN ? 'online' : 'offline',
                minutes_since_seen: diffMin != null ? Math.round(diffMin) : null,
                // อายุของค่าเซ็นเซอร์ล่าสุด (นาที) หน้าเว็บใช้บอกว่าเป็นค่าเก่า
                reading_age_min: dev.last_reading_time ? Math.max(0, Math.round((now - new Date(dev.last_reading_time).getTime()) / 60000)) : null,
                health_summary: health
            }
        })

        // กล้อง: ออนไลน์ = มีภาพใหม่ภายใน 4 รอบถ่ายภาพจริงของกล่อง (อย่างน้อย 5 นาที) ดู services/cameraStatus.js
        const cameras = camRes.rows.map(cam => {
            const lastImageAt = latestOf(cam.last_image_at, frames[String(cam.farm_id)])
            const st = cameraStatus(lastImageAt, cam.interval_sec, now)
            const imgMin = st.seconds_ago == null ? null : Math.round(st.seconds_ago / 60)
            const isOnline = cam.is_active !== false && st.status === 'online'
            return {
                id_devices: cam.id,
                name_devices: cam.camera_name,
                serial_no: `${cam.brand || 'กล้อง'} (${cam.ip_address})`,
                type: 'camera',
                status: cam.is_active !== false ? 'active' : 'inactive',
                last_seen_at: lastImageAt ? lastImageAt.toISOString() : null,
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
                        : isOnline ? `ภาพล่าสุด ${agoText(st.seconds_ago)}` : `ไม่มีภาพใหม่ตั้งแต่ ${agoText(st.seconds_ago)} (รอบถ่าย ${st.interval_sec} วิ)`,
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

        // รอบถ่ายภาพกล้อง (วินาที) ส่งมา = ตั้งค่า, null = กลับไปใช้ค่าในเฟิร์มแวร์, ไม่ส่งมา = ไม่แก้
        const hasInterval = Object.prototype.hasOwnProperty.call(req.body, 'camera_interval_sec')
        const interval = req.body.camera_interval_sec == null || req.body.camera_interval_sec === '' ? null : Number(req.body.camera_interval_sec)
        if (hasInterval && interval !== null && !(Number.isInteger(interval) && interval >= 15 && interval <= 3600)) {
            return res.status(400).json({ success: false, message: 'รอบถ่ายภาพต้องเป็นจำนวนเต็ม 15–3600 วินาที' })
        }

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

        if (hasInterval) {
            try {
                await db.query(`UPDATE tb_devices SET camera_interval_sec = $1 WHERE id_devices = $2`, [interval, id])
                updateRes.rows[0].camera_interval_sec = interval
            } catch (err) {
                if (err.code !== '42703') throw err
                return res.status(409).json({
                    success: false,
                    message: 'บันทึกข้อมูลอุปกรณ์แล้ว แต่ตั้งรอบถ่ายภาพไม่ได้: ต้องรัน migrations/20261116_device_camera_interval.sql ก่อน'
                })
            }
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
// 3.2 GET/POST: /api/Admin/devices/:id/collect
// โหมดเก็บภาพทุกภาพ (ใช้วันดูหน้างานและวันเก็บข้อมูล) ภาพไปอยู่ที่ camera-samples/collect/<farm>/<date>/
// POST { minutes: 1–720 } = เปิด/ต่อเวลานับจากตอนนี้ (กำลังเปิดอยู่ = เวลาเริ่มเดิม), { minutes: 0 } = หยุดทันที
// -----------------------------------------------------------------
const COLLECT_ROW_SQL = `
    SELECT d.id_devices, d.id_farms,
           (to_jsonb(d)->>'camera_interval_sec')::int AS camera_interval_sec,
           to_jsonb(d)->>'collect_started_at' AS collect_started_at,
           to_jsonb(d)->>'collect_until' AS collect_until
    FROM tb_devices d WHERE d.id_devices = $1`

// จำนวน/ขนาดภาพที่เก็บได้ตั้งแต่เริ่มรอบล่าสุด และพื้นที่ Storage ทั้งหมด (อ่านจาก storage.objects; อ่านไม่ได้ = null)
const collectUsage = async (farmId, startedAt) => {
    const out = { saved: null, storage_used_mb: null }
    try {
        if (farmId && startedAt) {
            const { rows } = await db.query(
                `SELECT count(*)::int AS images,
                        COALESCE(sum((metadata->>'size')::bigint), 0)::bigint AS bytes,
                        max(created_at) AS last_at
                 FROM storage.objects
                 WHERE bucket_id = $1 AND name LIKE $2 AND name LIKE '%.jpg' AND created_at >= $3`,
                [SAMPLE_BUCKET, `${COLLECT_PREFIX}/${farmId}/%`, startedAt]
            )
            const r = rows[0] || {}
            out.saved = { images: r.images || 0, mb: Math.round(Number(r.bytes || 0) / 1048576 * 10) / 10, last_at: r.last_at || null }
        }
        const total = await db.query(`SELECT COALESCE(sum((metadata->>'size')::bigint), 0)::bigint AS bytes FROM storage.objects`)
        out.storage_used_mb = Math.round(Number(total.rows[0]?.bytes || 0) / 1048576)
    } catch (err) {
        console.warn('[Admin Devices] collect usage unavailable:', err.message)
    }
    return out
}

router.get('/:id/collect', verifyToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params
    if (!isUUID(id)) return res.status(400).json({ success: false, message: 'รหัสอุปกรณ์ไม่ถูกต้อง' })
    try {
        const { rows } = await db.query(COLLECT_ROW_SQL, [id])
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' })
        const row = rows[0]
        const collect = collectState(row)
        const usage = await collectUsage(row.id_farms, collect.started_at)
        res.json({
            success: true,
            collect,
            id_farms: row.id_farms,
            camera_interval_sec: row.camera_interval_sec,
            max_minutes: COLLECT_MAX_MINUTES,
            image_kb_estimate: DEFAULT_IMAGE_KB,
            storage_limit_mb: STORAGE_LIMIT_MB,
            folder: row.id_farms ? `${SAMPLE_BUCKET}/${COLLECT_PREFIX}/${row.id_farms}/` : null,
            ...usage
        })
    } catch (err) {
        console.error('[Admin Collect Status Error]:', err.message)
        res.status(500).json({ success: false, message: 'อ่านสถานะการเก็บภาพไม่สำเร็จ: ' + err.message })
    }
})

router.post('/:id/collect', verifyToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params
    if (!isUUID(id)) return res.status(400).json({ success: false, message: 'รหัสอุปกรณ์ไม่ถูกต้อง' })
    const minutes = parseCollectMinutes(req.body?.minutes)
    if (minutes === null) {
        return res.status(400).json({ success: false, message: `ระยะเวลาเก็บภาพต้องเป็นจำนวนเต็ม 0–${COLLECT_MAX_MINUTES} นาที (0 = หยุด)` })
    }
    try {
        const dev = await db.query(`SELECT id_devices, id_farms FROM tb_devices WHERE id_devices = $1`, [id])
        if (!dev.rows.length) return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์' })
        // กล่องที่ไม่ผูกฟาร์ม server ไม่รับภาพอยู่แล้ว (routes/camera.js) เปิดไปก็ไม่ได้ภาพ
        if (minutes > 0 && !dev.rows[0].id_farms) {
            return res.status(400).json({ success: false, message: 'ผูกอุปกรณ์กับฟาร์มก่อน ภาพจากกล่องที่ยังไม่ผูกฟาร์มจะไม่ถูกรับ' })
        }

        const upd = minutes > 0
            ? await db.query(
                `UPDATE tb_devices
                 SET collect_started_at = CASE WHEN collect_until > NOW() AND collect_started_at IS NOT NULL
                                               THEN collect_started_at ELSE NOW() END,
                     collect_until = NOW() + ($2::int * INTERVAL '1 minute')
                 WHERE id_devices = $1
                 RETURNING collect_started_at, collect_until`,
                [id, minutes])
            : await db.query(
                `UPDATE tb_devices
                 SET collect_until = CASE WHEN collect_until > NOW() THEN NOW() ELSE collect_until END
                 WHERE id_devices = $1
                 RETURNING collect_started_at, collect_until`,
                [id])

        const collect = collectState(upd.rows[0])
        res.json({
            success: true,
            message: minutes > 0 ? `เปิดเก็บภาพทุกภาพ ${minutes} นาที` : 'หยุดเก็บภาพทุกภาพแล้ว',
            collect
        })
    } catch (err) {
        if (err.code === '42703') {
            return res.status(409).json({ success: false, message: `ยังเปิดโหมดเก็บภาพไม่ได้: ต้องรัน ${COLLECT_MIGRATION} ก่อน` })
        }
        console.error('[Admin Collect Error]:', err.message)
        res.status(500).json({ success: false, message: 'ตั้งค่าการเก็บภาพไม่สำเร็จ: ' + err.message })
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
