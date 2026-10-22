const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')
const { 
    calculateFarmDailySummary, 
    runAllFarmsDailySummary, 
    getDailySummariesByFarm 
} = require('../../services/dailyLstmScheduler')
const { calcThi, thiSql, getRiskLevel, getFarmProfile, getThresholds, toAlertLevel, PROFILES } = require('../../services/heatStress')
const { generateBaselineForecast, isCurrentForecast } = require('../../services/forecastService')
const { buildRtspUrls } = require('../../services/rtspUrls')
const { encryptSecret, CameraSecretError } = require('../../services/cameraSecrets')

// คอลัมน์กล้องที่ส่งกลับให้หน้าเว็บได้ (ไม่มี password_encrypted)
const CAMERA_PUBLIC_COLUMNS = `id, farm_id, camera_name, barn_unit, brand, model, ip_address, rtsp_port, http_port,
    username, channel_no, main_stream_url, sub_stream_url, is_active, is_simulation, created_at, updated_at`

// Helper function to check if a string is a valid UUID
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// -----------------------------------------------------------------
// 1. GET: /api/Admin/farms/all
// ดึงข้อมูลฟาร์มทั้งหมด พร้อมค่าเซ็นเซอร์ล่าสุดต่ออุปกรณ์
// -----------------------------------------------------------------
router.get('/all', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                f.id_farms,
                f.name_farms,
                f.province,
                f.district,
                f.address,
                COALESCE(f.barn_unit, 'โรงเรือนหลัก (Unit 1)') AS barn_unit,
                f.barn_height_m,
                f.roof_type,
                f.cooling_system,
                to_jsonb(f)->>'hf_profile' AS hf_profile,
                f.id_users,
                u.name_users AS owner_name,
                u.organization AS owner_org,
                u.phone AS owner_phone,
                d.id_devices,
                d.name_devices,
                d.serial_no,
                d.status AS device_status,
                d.last_seen_at AS device_last_seen,
                sr.id_sensor_readings,
                sr.temperature_c,
                sr.humidity_pct,
                sr.thi,
                sr.recorded_at,
                COALESCE(dev_summary.device_count, 0)::int AS total_devices,
                COALESCE(dev_summary.devices_list, '[]'::json) AS devices
            FROM tb_farms f
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            LEFT JOIN LATERAL (
                SELECT d1.*
                FROM tb_devices d1
                WHERE d1.id_farms = f.id_farms
                ORDER BY d1.last_seen_at DESC NULLS LAST, d1.created_at DESC
                LIMIT 1
            ) d ON true
            LEFT JOIN LATERAL (
                SELECT sr1.*
                FROM tb_sensor_readings sr1
                WHERE sr1.id_devices = d.id_devices
                ORDER BY sr1.recorded_at DESC
                LIMIT 1
            ) sr ON true
            LEFT JOIN LATERAL (
                SELECT 
                    COUNT(d2.id_devices) AS device_count,
                    json_agg(
                        json_build_object(
                            'id_devices', d2.id_devices,
                            'name_devices', d2.name_devices,
                            'serial_no', d2.serial_no,
                            'status', d2.status,
                            'last_seen_at', d2.last_seen_at
                        )
                    ) AS devices_list
                FROM tb_devices d2
                WHERE d2.id_farms = f.id_farms
            ) dev_summary ON true
            ORDER BY f.created_at DESC
        `)
        const formattedRows = rows.map(r => {
            const lastTime = r.recorded_at ? new Date(r.recorded_at).getTime() : (r.device_last_seen ? new Date(r.device_last_seen).getTime() : 0);
            const isOnline = lastTime > 0 && (Date.now() - lastTime) < 2 * 60 * 1000;
            const thi = calcThi(r.temperature_c, r.humidity_pct) ?? (r.thi != null ? parseFloat(r.thi) : null);
            const profile = getFarmProfile(r);
            return {
                ...r,
                thi,
                hf_profile: profile,
                stress_level: getRiskLevel(thi, profile),
                device_status: isOnline ? 'online' : 'offline'
            };
        });
        res.json({
            rows: formattedRows,
            status: 200,
            success: true,
            message: 'Get all farm success!'
        })
    } catch (err) {
        console.error('Error!, Can not get all farm!', err.message)
        res.status(500).json({
            success: false,
            message: 'Error!, Can not get all farm!'
        })
    }
})

// 2. GET: /api/Admin/farms/user_farms
router.get('/user_farms', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT * FROM tb_users WHERE role = 'farmer' ORDER BY id_users DESC`)
        res.json({
            rows,
            status: 200,
            message: 'Get all user_farms success',
            success: true
        })
    } catch (err) {
        console.error('Error!, Can not get user_farms', err.message)
        res.status(500).json({
            success: false,
            message: 'Error!, Can not get user_farms'
        })
    }
})

// -----------------------------------------------------------------
// 3. GET: /api/Admin/farms/devices
// ดึงรายการอุปกรณ์ IoT ทั้งหมดสำหรับ Dropdown (ต้องอยู่ก่อน /:id)
// -----------------------------------------------------------------
router.get('/devices', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        let { rows } = await db.query(`
            SELECT d.id_devices, d.name_devices, d.serial_no, d.status, d.type, d.id_farms,
                   f.name_farms
            FROM tb_devices d
            LEFT JOIN tb_farms f ON f.id_farms = d.id_farms
            ORDER BY d.created_at DESC
        `)

        // ถ้ายังไม่มีอุปกรณ์ใน tb_devices เลย ให้สร้างตัวเริ่มต้นอย่างปลอดภัย
        if (rows.length === 0) {
            const insertDev = await db.query(`
                INSERT INTO tb_devices (name_devices, serial_no, type, status, last_seen_at)
                VALUES ('ESP32 SHT40 (ESP32-S3-01)', 'ESP32-S3-01', 'env_sensor', 'online', NOW())
                ON CONFLICT (serial_no) DO UPDATE SET status = 'online'
                RETURNING id_devices, name_devices, serial_no, status, type, id_farms
            `)
            rows = insertDev.rows
        }

        res.json({
            success: true,
            devices: rows
        })
    } catch (err) {
        console.error('Error getting devices for farms:', err.message)
        res.status(500).json({ success: false, message: 'Cannot fetch devices: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 4. POST: /api/Admin/farms
// เพิ่มฟาร์มใหม่ พร้อมผูกอุปกรณ์ IoT ด้วย Database Transaction (Atomic)
// -----------------------------------------------------------------
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { 
            name_farms, name, 
            province, district, address, 
            barn_unit, id_users,
            barn_height_m, roof_type, cooling_system,
            id_devices, device_serial, new_device_name,
            hf_profile
        } = req.body

        if (hf_profile !== undefined && !PROFILES[hf_profile]) {
            return res.status(400).json({ success: false, message: `hf_profile ต้องเป็น ${Object.keys(PROFILES).join(' หรือ ')}` })
        }

        const farmName = (name_farms || name || '').trim()
        if (!farmName) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อฟาร์ม' })
        }

        await client.query('BEGIN')

        // 1. เพิ่มฟาร์มลง tb_farms
        const farmRes = await client.query(
            `INSERT INTO tb_farms (name_farms, province, district, address, barn_unit, id_users, barn_height_m, roof_type, cooling_system, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
             RETURNING *`,
            [
                farmName,
                province ? province.trim() : 'สระบุรี',
                district ? district.trim() : 'มวกเหล็ก',
                address ? address.trim() : null,
                barn_unit ? barn_unit.trim() : 'โรงเรือนหลัก (Unit 1)',
                id_users && isUUID(id_users) ? id_users : null,
                barn_height_m ? parseFloat(barn_height_m) : 2.7,
                roof_type ? roof_type.trim() : 'สังกะสี (Zinc)',
                cooling_system ? cooling_system.trim() : 'พัดลมระบายอากาศ'
            ]
        )
        let newFarm = farmRes.rows[0]
        const farmId = newFarm.id_farms

        // ต้องรัน migrations/20261021_farm_hf_profile.sql ก่อน
        if (hf_profile !== undefined) {
            const profRes = await client.query(`UPDATE tb_farms SET hf_profile = $1 WHERE id_farms = $2 RETURNING *`, [hf_profile, farmId])
            newFarm = profRes.rows[0]
        }

        // 2. ถ้ามี id_users ให้บันทึกความสัมพันธ์ใน tb_farm_members
        if (newFarm.id_users) {
            await client.query(
                `INSERT INTO tb_farm_members (id_farms, id_users, role, joined_at)
                 VALUES ($1, $2, 'owner', NOW())
                 ON CONFLICT (id_farms, id_users) DO NOTHING`,
                [farmId, newFarm.id_users]
            )
        }

        // 3. ผูกอุปกรณ์กับฟาร์ม
        let assignedDevice = null
        if (id_devices) {
            if (isUUID(id_devices)) {
                const devUpdate = await client.query(
                    `UPDATE tb_devices SET id_farms = $1, status = 'online', last_seen_at = NOW() WHERE id_devices = $2 RETURNING *`,
                    [farmId, id_devices]
                )
                if (devUpdate.rows.length > 0) assignedDevice = devUpdate.rows[0]
            } else {
                const devUpdate = await client.query(
                    `UPDATE tb_devices SET id_farms = $1, status = 'online', last_seen_at = NOW() WHERE serial_no = $2 RETURNING *`,
                    [farmId, String(id_devices).trim()]
                )
                if (devUpdate.rows.length > 0) assignedDevice = devUpdate.rows[0]
            }
        } else if (device_serial && device_serial.trim()) {
            const serial = device_serial.trim()
            const devName = new_device_name ? new_device_name.trim() : `ESP32 SHT40 (${serial})`
            const devRes = await client.query(
                `INSERT INTO tb_devices (id_farms, type, name_devices, serial_no, status, last_seen_at, created_at, updated_at)
                 VALUES ($1, 'env_sensor', $2, $3, 'online', NOW(), NOW(), NOW())
                 ON CONFLICT (serial_no) DO UPDATE SET id_farms = $1, name_devices = EXCLUDED.name_devices
                 RETURNING *`,
                [farmId, devName, serial]
            )
            if (devRes.rows.length > 0) assignedDevice = devRes.rows[0]
        }

        // 4. ผูกกล้อง CCTV กับฟาร์ม (ถ้ามีการส่งข้อมูลกล้องมา)
        let assignedCamera = null
        const camData = req.body.camera || (req.body.has_camera ? req.body : null)
        if (camData && (camData.camera_ip || camData.ip_address)) {
            const camIp = String(camData.camera_ip || camData.ip_address).trim()
            if (camIp) {
                const camName = String(camData.camera_name || `${farmName} Camera 1`).trim()
                const camUser = String(camData.camera_user || camData.username || 'admin').trim()
                const camPass = String(camData.camera_pass || camData.password || '').trim()
                const camPort = Number(camData.camera_rtsp_port || camData.rtsp_port) || 554
                const camCh = Number(camData.channel_no) || 1
                const camBrand = String(camData.brand || 'Hikvision').trim()
                const camModel = String(camData.model || 'DS-2CD2143G2-I').trim()
                const { mainStreamUrl, subStreamUrl } = buildRtspUrls({ brand: camBrand, ip: camIp, port: camPort, channel: camCh })

                const camRes = await client.query(`
                    INSERT INTO cctv_cameras (
                        farm_id, camera_name, barn_unit, brand, model, ip_address,
                        rtsp_port, http_port, username, password_encrypted, channel_no,
                        main_stream_url, sub_stream_url, is_active, is_simulation, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 80, $8, $9, $10, $11, $12, TRUE, FALSE, NOW(), NOW())
                    RETURNING ${CAMERA_PUBLIC_COLUMNS}
                `, [
                    farmId, camName, barn_unit ? barn_unit.trim() : 'Unit 1', camBrand, camModel, camIp,
                    camPort, camUser, camPass ? encryptSecret(camPass) : '', camCh, mainStreamUrl, subStreamUrl
                ])
                if (camRes.rows.length > 0) assignedCamera = camRes.rows[0]
            }
        }

        // Strict Real Data Mode: ไม่มีการ mock telemetry (28.5, 70.0) ลงในตารางเซ็นเซอร์
        await client.query('COMMIT')

        return res.status(201).json({
            success: true,
            message: 'เพิ่มข้อมูลฟาร์มสำเร็จ!',
            farm: newFarm,
            device: assignedDevice,
            camera: assignedCamera
        })
    } catch (err) {
        await client.query('ROLLBACK')
        console.error('[Add Farm Error - Rollbacked]:', err.message)
        if (err instanceof CameraSecretError) return res.status(503).json({ success: false, message: err.message })
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มฟาร์ม: ' + err.message })
    } finally {
        client.release()
    }
})

// -----------------------------------------------------------------
// 4.5 GET: /api/Admin/farms/:id/latest
// Lightweight polling endpoint for live telemetry & data gap alerts
// -----------------------------------------------------------------
router.get('/:id/latest', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params

        const { rows } = await db.query(`
            SELECT sr.*, d.serial_no, d.name_devices, d.status AS device_status, d.last_seen_at
            FROM tb_devices d
            JOIN tb_sensor_readings sr ON sr.id_devices = d.id_devices
            WHERE d.id_farms::text = $1 OR sr.id_farms::text = $1
            ORDER BY sr.recorded_at DESC
            LIMIT 1
        `, [id])

        if (rows.length === 0) {
            return res.json({
                success: true,
                has_data: false,
                is_online: false,
                latest_sensor: null,
                gap_alert: {
                    is_gap_detected: true,
                    duration_minutes: null,
                    message: 'ยังไม่มีข้อมูลเซ็นเซอร์ส่งเข้ามาจากอุปกรณ์'
                }
            })
        }

        const latest = rows[0]
        const lastTime = new Date(latest.recorded_at).getTime()
        const diffMs = Math.max(0, Date.now() - lastTime)
        const diffMinutes = Math.floor(diffMs / 60000)
        const isOnline = diffMinutes < 2

        const farmRes = await db.query(`SELECT * FROM tb_farms WHERE id_farms::text = $1 LIMIT 1`, [id])
        const profile = getFarmProfile(farmRes.rows[0])

        const temp = latest.temperature_c != null ? parseFloat(latest.temperature_c) : null
        const hum = latest.humidity_pct != null ? parseFloat(latest.humidity_pct) : null
        // คำนวณจาก temp/hum ด้วยสูตรกลาง ไม่ใช้ค่า thi / stress_level ที่เก็บใน DB (สูตร/เกณฑ์เดิม)
        const thi = calcThi(temp, hum) ?? (latest.thi != null ? parseFloat(latest.thi) : null)
        const stress = getRiskLevel(thi, profile)

        const gapAlert = {
            is_gap_detected: !isOnline,
            duration_minutes: diffMinutes,
            last_recorded_at: latest.recorded_at,
            message: !isOnline 
                ? `⚠️ ข้อมูลเซ็นเซอร์ขาดหายไป ${diffMinutes >= 60 ? `${(diffMinutes / 60).toFixed(1)} ชั่วโมง` : `${diffMinutes} นาที`} (ล่าสุดเมื่อ ${new Date(latest.recorded_at).toLocaleTimeString('th-TH')})`
                : null
        }

        return res.json({
            success: true,
            has_data: true,
            is_online: isOnline,
            device_status: isOnline ? 'online' : 'offline',
            latest_sensor: {
                id: latest.id_sensor_readings || latest.id,
                serial_no: latest.serial_no,
                name_devices: latest.name_devices,
                temperature_c: temp,
                humidity_pct: hum,
                thi,
                stress_level: stress,
                hf_profile: profile,
                recorded_at: latest.recorded_at
            },
            gap_alert: gapAlert
        })
    } catch (err) {
        console.error('[Latest Farm Telemetry Error]:', err.message)
        return res.status(500).json({ success: false, message: err.message })
    }
})

// -----------------------------------------------------------------
// 4.6 POST: /api/Admin/farms/run-all-daily-summaries
// รันประมวลผล Daily Summary และ LSTM Forecast ให้ทุกฟาร์มทันที (Manual Trigger)
// -----------------------------------------------------------------
router.post('/run-all-daily-summaries', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { target_date } = req.body || {}
        const result = await runAllFarmsDailySummary(target_date || null)
        return res.json({
            success: true,
            message: `ประมวลผล Daily Summary และ LSTM สำเร็จ (${result.total_farms} ฟาร์ม)`,
            data: result
        })
    } catch (err) {
        console.error('[Run All Daily Summaries Error]:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการประมวลผล: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 4.7 POST: /api/Admin/farms/:id/run-daily-summary
// รันประมวลผล Daily Summary และ LSTM Forecast ให้เฉพาะฟาร์มนี้
// -----------------------------------------------------------------
router.post('/:id/run-daily-summary', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params
        const { target_date } = req.body || {}

        let farmId = id
        if (!isUUID(farmId)) {
            const { rows } = await db.query(`SELECT id_farms FROM tb_farms WHERE id_farms::text = $1 OR name_farms ILIKE $2 LIMIT 1`, [farmId, `%${farmId}%`])
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'ไม่พบฟาร์มที่ระบุ' })
            }
            farmId = rows[0].id_farms
        }

        const result = await calculateFarmDailySummary(farmId, target_date || null)
        return res.json({
            success: true,
            message: `ประมวลผล Daily Summary และ LSTM สำหรับฟาร์มสำเร็จ`,
            data: result
        })
    } catch (err) {
        console.error('[Run Farm Daily Summary Error]:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการประมวลผล: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 4.8 GET: /api/Admin/farms/:id/daily-summaries
// ดึงประวัติ Daily Summaries ย้อนหลังของฟาร์มนี้ (เช่น 14 วันล่าสุด)
// -----------------------------------------------------------------
router.get('/:id/daily-summaries', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params
        const limit = parseInt(req.query.limit, 10) || 14

        let farmId = id
        if (!isUUID(farmId)) {
            const { rows } = await db.query(`SELECT id_farms FROM tb_farms WHERE id_farms::text = $1 OR name_farms ILIKE $2 LIMIT 1`, [farmId, `%${farmId}%`])
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'ไม่พบฟาร์มที่ระบุ' })
            }
            farmId = rows[0].id_farms
        }

        const summaries = await getDailySummariesByFarm(farmId, limit)
        return res.json({
            success: true,
            summaries
        })
    } catch (err) {
        console.error('[Get Farm Daily Summaries Error]:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงประวัติ: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 4.9 GET: /api/Admin/farms/dashboard-stats
// ดึงข้อมูลสถิติภาพรวมเครือข่ายสำหรับหน้า Executive Command Center Dashboard
// -----------------------------------------------------------------
router.get('/dashboard-stats', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        // 1. ดึงข้อมูลฟาร์มทั้งหมด
        // to_jsonb(...)->>'hf_profile' ใช้ได้ทั้งก่อนและหลังรัน migration
        const farmsRes = await db.query(`SELECT id_farms, name_farms, created_at, to_jsonb(tb_farms)->>'hf_profile' AS hf_profile FROM tb_farms`)
        const profileByFarm = new Map(farmsRes.rows.map(f => [String(f.id_farms), getFarmProfile(f)]))
        const totalFarms = farmsRes.rows.length

        // คำนวณฟาร์มใหม่ในเดือนนี้
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const newThisMonth = farmsRes.rows.filter(f => f.created_at && new Date(f.created_at) >= startOfMonth).length

        // 2. ดึงข้อมูลอุปกรณ์ทั้งหมด
        const devicesRes = await db.query(`SELECT id_devices, id_farms, status, last_seen_at FROM tb_devices`)
        const totalDevices = devicesRes.rows.length
        const now = Date.now()
        const onlineDevices = devicesRes.rows.filter(d => {
            if (!d.last_seen_at) return false
            const diffMs = now - new Date(d.last_seen_at).getTime()
            return diffMs >= 0 && diffMs < 10 * 60 * 1000 // ภายใน 10 นาที
        }).length
        const offlineDevices = totalDevices - onlineDevices
        const onlineRate = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0

        // 3. ดึงค่าเซ็นเซอร์ล่าสุดของแต่ละฟาร์ม/อุปกรณ์
        const latestReadingsRes = await db.query(`
            SELECT DISTINCT ON (COALESCE(sr.id_farms, d.id_farms))
                sr.*, 
                f.name_farms,
                d.serial_no,
                d.name_devices
            FROM tb_sensor_readings sr
            LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
            LEFT JOIN tb_farms f ON f.id_farms = COALESCE(sr.id_farms, d.id_farms)
            WHERE COALESCE(sr.id_farms, d.id_farms) IS NOT NULL
            ORDER BY COALESCE(sr.id_farms, d.id_farms), sr.recorded_at DESC
        `)
        const latestReadings = latestReadingsRes.rows

        const thiList = []
        const tempList = []
        const humList = []
        let countNormal = 0
        let countMild = 0
        let countModerate = 0
        let countSevere = 0
        const alertItems = []

        latestReadings.forEach((r, idx) => {
            const t = r.temperature_c != null ? parseFloat(r.temperature_c) : null
            const rh = r.humidity_pct != null ? parseFloat(r.humidity_pct) : null
            const thi = calcThi(t, rh) ?? (r.thi != null ? parseFloat(r.thi) : null)
            const farmKey = String(r.id_farms || '')
            const level = getRiskLevel(thi, profileByFarm.get(farmKey))

            if (t !== null) tempList.push(t)
            if (rh !== null) humList.push(rh)
            if (thi === null) return
            thiList.push(thi)
            if (level === 'normal') {
                countNormal++
                return
            }
            if (level === 'mild') countMild++
            else if (level === 'moderate') countModerate++
            else countSevere++

            const ALERT_TEXT = {
                mild: { issue: `ดัชนี THI ${thi} (เฝ้าระวังความร้อน)`, status: 'acknowledged', action: 'เปิดพัดลมระบายอากาศ' },
                moderate: { issue: `ดัชนี THI ${thi} (เครียดจากความร้อน)`, status: 'new', action: 'เปิดพัดลม + ระบบพ่นหมอก (งดพ่นหมอกถ้าความชื้น ≥ 75%)' },
                severe: { issue: `🚨 ดัชนี THI ${thi} (วิกฤต เสี่ยงแม่โคหอบ)`, status: 'new', action: 'ลดความร้อนฉุกเฉินทันที' }
            }[level]
            alertItems.push({
                id: `alert-${r.id_farms || idx}`,
                farm_id: r.id_farms,
                farm_code: `F0${idx + 1}`,
                name_farms: r.name_farms || 'ฟาร์มไม่ระบุชื่อ',
                device_serial: r.serial_no || 'N/A',
                level: toAlertLevel(level),
                risk_level: level,
                thi,
                temperature_c: t,
                issue_description: ALERT_TEXT.issue,
                workflow_status: ALERT_TEXT.status,
                workflow_text: ALERT_TEXT.action,
                detected_at: r.recorded_at
            })
        })

        // 4. สรุปค่าเฉลี่ยดัชนีความร้อนของเครือข่าย
        // ไม่มีข้อมูล = null (ไม่เติมค่าสมมติ)
        const avgThi = thiList.length ? parseFloat((thiList.reduce((a, b) => a + b, 0) / thiList.length).toFixed(1)) : null
        const avgTemp = tempList.length ? parseFloat((tempList.reduce((a, b) => a + b, 0) / tempList.length).toFixed(1)) : null
        const avgHum = humList.length ? parseFloat((humList.reduce((a, b) => a + b, 0) / humList.length).toFixed(1)) : null

        // ภาพรวมเครือข่ายใช้เกณฑ์ค่าเริ่มต้น
        const statusLevel = getRiskLevel(avgThi, 'default')
        const STATUS_TEXT = {
            normal: 'ปกติ (Comfort Zone)',
            mild: 'เฝ้าระวัง (Mild)',
            moderate: 'เครียดจากความร้อน (Moderate)',
            severe: 'วิกฤต (Severe)'
        }
        const statusText = statusLevel ? STATUS_TEXT[statusLevel] : 'ยังไม่มีข้อมูล'

        // ความครบถ้วนของข้อมูล 24 ชม. (firmware ส่งทุก 15 วินาที = 5,760 รายการ/วัน/อุปกรณ์)
        const EXPECTED_READINGS_PER_DEVICE_DAY = 86400 / 15
        const completenessRes = await db.query(`
            SELECT COUNT(*)::int AS readings, COUNT(DISTINCT id_devices)::int AS devices
            FROM tb_sensor_readings
            WHERE recorded_at > NOW() - INTERVAL '24 hours'
        `)
        const { readings: readings24h, devices: devices24h } = completenessRes.rows[0]
        const completenessPct = devices24h > 0
            ? parseFloat(Math.min(100, (readings24h / (devices24h * EXPECTED_READINGS_PER_DEVICE_DAY)) * 100).toFixed(1))
            : null

        // 5. ดึงจำนวนประวัติการอ่านทั้งหมดใน tb_sensor_readings
        const totalReadingsRes = await db.query(`SELECT COUNT(*) FROM tb_sensor_readings`)
        const totalReadings = parseInt(totalReadingsRes.rows[0].count, 10) || 0

        return res.json({
            success: true,
            stats: {
                farms: {
                    total: totalFarms,
                    growth: `+${newThisMonth} ฟาร์มใหม่เดือนนี้`
                },
                devices: {
                    total: totalDevices,
                    online: onlineDevices,
                    offline: offlineDevices,
                    online_rate: onlineRate
                },
                thi: {
                    average: avgThi,
                    temp_average: avgTemp,
                    hum_average: avgHum,
                    status: statusText,
                    status_level: statusLevel
                },
                alerts: {
                    active_count: alertItems.length,
                    pending_ack: alertItems.filter(a => a.workflow_status === 'new').length,
                    items: alertItems
                },
                distribution: {
                    normal: countNormal,
                    mild: countMild,
                    moderate: countModerate,
                    severe: countSevere
                },
                diagnostics: {
                    total_readings: totalReadings,
                    readings_last_24h: readings24h,
                    devices_reporting_24h: devices24h,
                    completeness_pct: completenessPct,
                    missing_rate_pct: completenessPct != null ? parseFloat((100 - completenessPct).toFixed(1)) : null
                }
            }
        })
    } catch (err) {
        console.error('[Dashboard Stats API Error]:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการคำนวณสถิติแดชบอร์ด: ' + err.message })
    }
})

// 5. GET: /api/Admin/farms/:id
router.get('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params

        let farm = null
        if (isUUID(id)) {
            const { rows } = await db.query(`SELECT * FROM tb_farms WHERE id_farms = $1 LIMIT 1`, [id])
            if (rows.length > 0) farm = rows[0]
        } else {
            // ลองค้นหาด้วย id_farms ที่เป็นตัวเลขหรือข้อความก่อน
            const { rows } = await db.query(`SELECT * FROM tb_farms WHERE id_farms::text = $1 LIMIT 1`, [id])
            if (rows.length > 0) {
                farm = rows[0]
            } else {
                const nameRes = await db.query(`SELECT * FROM tb_farms WHERE name_farms ILIKE $1 LIMIT 1`, [`%${id}%`])
                if (nameRes.rows.length > 0) farm = nameRes.rows[0]
            }
        }

        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลฟาร์ม'
            })
        }

        const profile = getFarmProfile(farm)
        const thresholds = getThresholds(profile)

        // ดึงอุปกรณ์ที่ผูกกับฟาร์ม
        let device = null
        try {
            const devRes = await db.query(`
                SELECT id_devices, name_devices, serial_no, status, type, last_seen_at
                FROM tb_devices
                WHERE id_farms = $1
                LIMIT 1
            `, [farm.id_farms])
            if (devRes.rows.length > 0) {
                device = devRes.rows[0]
            }
        } catch (devErr) {
            console.warn('[Farm Detail API] Device query fallback:', devErr.message)
        }

        // ดึงค่าเซ็นเซอร์ล่าสุด
        let latestReading = null
        try {
            // ค้นหาผ่านอุปกรณ์ที่ผูกกับฟาร์มเป็นหลักก่อน (สอดคล้องกับ tb_devices.id_farms)
            let res = await db.query(`
                SELECT sr.*, d.serial_no, d.name_devices, d.status AS device_status, d.last_seen_at
                FROM tb_sensor_readings sr
                JOIN tb_devices d ON d.id_devices = sr.id_devices
                WHERE d.id_farms = $1
                ORDER BY sr.recorded_at DESC
                LIMIT 1
            `, [farm.id_farms])

            // หากไม่พบผ่าน devices ให้ลองค้นหาตรงจาก sr.id_farms (เผื่อกรณีไม่มี device mapping)
            if (res.rows.length === 0) {
                try {
                    const altRes = await db.query(`
                        SELECT sr.*, d.serial_no, d.name_devices, d.status AS device_status, d.last_seen_at
                        FROM tb_sensor_readings sr
                        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
                        WHERE sr.id_farms = $1
                        ORDER BY sr.recorded_at DESC
                        LIMIT 1
                    `, [farm.id_farms])
                    if (altRes.rows.length > 0) res = altRes
                } catch (altErr) {
                    // id_farms อาจไม่มีในคอลัมน์ tb_sensor_readings
                }
            }

            if (res.rows.length > 0) {
                latestReading = res.rows[0]
                latestReading.thi = calcThi(latestReading.temperature_c, latestReading.humidity_pct) ?? (latestReading.thi != null ? parseFloat(latestReading.thi) : null)
                latestReading.stress_level = getRiskLevel(latestReading.thi, profile)
                latestReading.id = latestReading.id_sensor_readings || latestReading.id
            }
        } catch (err) {
            console.warn('[Farm Detail API] Latest reading query error:', err.message)
        }

        // คำนวณสถานะ online/offline ของอุปกรณ์ตาม heartbeat 2 นาที (120 วินาที)
        let lastActiveTime = 0
        if (device && device.last_seen_at) {
            lastActiveTime = Math.max(lastActiveTime, new Date(device.last_seen_at).getTime())
        }
        if (latestReading && latestReading.recorded_at) {
            lastActiveTime = Math.max(lastActiveTime, new Date(latestReading.recorded_at).getTime())
        }
        const isDeviceOnline = lastActiveTime > 0 && (Date.now() - lastActiveTime) < 2 * 60 * 1000
        if (device) {
            device.status = isDeviceOnline ? 'online' : 'offline'
        }

        // ประวัติ 24 ชม. ล่าสุดของฟาร์ม เฉลี่ยทุก 5 นาที (ไม่เกิน 288 จุด) สำหรับกราฟและตาราง
        // และสรุป 24 ชม. จากค่าดิบทั้งหมดในช่วงเดียวกัน (เดิมดึงแค่ 50 ค่า = ~12 นาที)
        // ช่วง 24 ชม. นับย้อนจากค่าล่าสุดของฟาร์ม: อุปกรณ์ออฟไลน์ก็ยังเห็นวันสุดท้ายที่มีข้อมูล
        let history = []
        let daily_summary = null
        try {
            const windowCte = `
                WITH farm_readings AS (
                    SELECT sr.recorded_at, sr.temperature_c, sr.humidity_pct, d.serial_no,
                           ${thiSql('sr')} AS thi
                    FROM tb_sensor_readings sr
                    LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
                    WHERE (d.id_farms = $1 OR sr.id_farms = $1)
                      AND sr.temperature_c IS NOT NULL AND sr.humidity_pct IS NOT NULL
                ),
                win AS (
                    SELECT * FROM farm_readings
                    WHERE recorded_at > (SELECT MAX(recorded_at) FROM farm_readings) - INTERVAL '24 hours'
                )`
            const [bucketRes, summaryRes] = await Promise.all([
                db.query(`${windowCte}
                    SELECT to_timestamp(floor(extract(epoch FROM recorded_at) / 300) * 300) AS recorded_at,
                           AVG(temperature_c) AS temperature_c, AVG(humidity_pct) AS humidity_pct,
                           AVG(thi) AS thi, COUNT(*)::int AS sample_count, MAX(serial_no) AS serial_no
                    FROM win GROUP BY 1 ORDER BY 1
                `, [farm.id_farms]),
                db.query(`${windowCte}
                    SELECT AVG(thi) AS avg_thi,
                           MIN(temperature_c) AS min_temp, MAX(temperature_c) AS max_temp,
                           MIN(humidity_pct) AS min_hum, MAX(humidity_pct) AS max_hum,
                           COUNT(*)::int AS total_readings,
                           COUNT(*) FILTER (WHERE thi >= $2)::int AS stress_readings,
                           MIN(recorded_at) AS window_start, MAX(recorded_at) AS window_end
                    FROM win
                `, [farm.id_farms, thresholds.moderate])
            ])

            history = bucketRes.rows.map(r => {
                const thi = r.thi != null ? parseFloat(r.thi) : null
                return {
                    id: `b-${new Date(r.recorded_at).getTime()}`,
                    recorded_at: r.recorded_at,
                    temperature_c: r.temperature_c != null ? parseFloat(r.temperature_c) : null,
                    humidity_pct: r.humidity_pct != null ? parseFloat(r.humidity_pct) : null,
                    thi,
                    stress_level: getRiskLevel(thi, profile),
                    sample_count: r.sample_count,
                    serial_no: r.serial_no
                }
            })

            const sm = summaryRes.rows[0]
            if (sm && sm.total_readings > 0) {
                const fix1 = (v) => v != null ? Number(v).toFixed(1) : null
                daily_summary = {
                    avg_thi: fix1(sm.avg_thi),
                    min_temp: fix1(sm.min_temp),
                    max_temp: fix1(sm.max_temp),
                    min_hum: fix1(sm.min_hum),
                    max_hum: fix1(sm.max_hum),
                    count_stress_readings: sm.stress_readings,
                    total_readings: sm.total_readings,
                    stress_percentage: Math.round((sm.stress_readings / sm.total_readings) * 100),
                    // ชั่วโมงที่ THI ถึงระดับเครียด (สัดส่วนค่าที่เครียด x ความยาวช่วงข้อมูล) อ่านง่ายกว่าจำนวนค่า
                    stress_hours: Number(((sm.stress_readings / sm.total_readings) *
                        ((new Date(sm.window_end) - new Date(sm.window_start)) / 3600000)).toFixed(1)),
                    window_start: sm.window_start,
                    window_end: sm.window_end
                }
            }
        } catch (err) {
            console.warn('[Farm Detail API] History readings query error:', err.message)
        }

        // พยากรณ์ 3 วันแบบ baseline (ค่าเฉลี่ย THI 72 ชม.) ดู services/forecastService.js
        let lstm_forecast = null
        try {
            lstm_forecast = await generateBaselineForecast(farm)
        } catch (fcErr) {
            console.warn('[Farm Detail API] Baseline forecast error:', fcErr.message)
        }

        // ตรวจสอบความต่อเนื่องของสัญญาณเซ็นเซอร์ (Data Continuity & Gap Alert)
        let gapAlert = null
        if (latestReading && latestReading.recorded_at) {
            const lastTime = new Date(latestReading.recorded_at).getTime()
            const diffMs = Math.max(0, Date.now() - lastTime)
            const diffMinutes = Math.floor(diffMs / 60000)
            const isOnline = diffMinutes < 2
            gapAlert = {
                is_gap_detected: !isOnline,
                duration_minutes: diffMinutes,
                last_recorded_at: latestReading.recorded_at,
                message: !isOnline 
                    ? `⚠️ ข้อมูลเซ็นเซอร์ขาดหายไป ${diffMinutes >= 60 ? `${(diffMinutes / 60).toFixed(1)} ชั่วโมง` : `${diffMinutes} นาที`} (ล่าสุดเมื่อ ${new Date(latestReading.recorded_at).toLocaleTimeString('th-TH')})`
                    : null
            }
        }

        // ดึงข้อมูลเจ้าของฟาร์ม
        let owner = null
        if (farm.id_users) {
            try {
                const uRes = await db.query(`SELECT id_users, name_users, organization, phone, email FROM tb_users WHERE id_users = $1`, [farm.id_users])
                if (uRes.rows.length > 0) owner = uRes.rows[0]
            } catch (uErr) {
                console.warn('[Farm Detail API] Owner query fallback:', uErr.message)
            }
        }

        // ดึงบันทึก Daily Summary ของวันนี้ (หากรัน Daily Batch ไว้แล้ว)
        let saved_daily_summary = null
        try {
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
            const dsRes = await db.query(`
                SELECT * FROM tb_farm_daily_summaries 
                WHERE id_farms = $1 AND summary_date = $2
            `, [farm.id_farms, todayStr])
            if (dsRes.rows.length > 0) {
                saved_daily_summary = dsRes.rows[0]
            }
        } catch (dsErr) {
            console.warn('[Farm Detail API] Saved daily summary query error:', dsErr.message)
        }

        return res.json({
            success: true,
            farm,
            owner,
            device,
            latest_sensor: latestReading || (history.length > 0 ? history[history.length - 1] : null),
            daily_summary,
            saved_daily_summary,
            history,
            // ผลพยากรณ์ที่บันทึกจากเวอร์ชันเก่า (มีตัวเลขความแม่นยำปลอม) จะไม่ถูกนำมาแสดง
            lstm_forecast: isCurrentForecast(saved_daily_summary?.lstm_forecast)
                ? saved_daily_summary.lstm_forecast
                : lstm_forecast,
            hf_profile: profile,
            thresholds,
            gap_alert: gapAlert
        })
    } catch (err) {
        console.error('[Get Farm Detail Error]:', err.message)
        return res.status(500).json({
            success: false,
            message: 'Error fetching farm detail: ' + err.message
        })
    }
})

// 6. PUT: /api/Admin/farms/:id
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    const client = await db.pool.connect()
    try {
        const { id } = req.params
        const { 
            name_farms, name, 
            province, district, address, 
            barn_unit, id_users,
            barn_height_m, roof_type, cooling_system, 
            id_devices,
            hf_profile
        } = req.body
        const farmName = (name_farms || name || '').trim()

        if (hf_profile !== undefined && !PROFILES[hf_profile]) {
            return res.status(400).json({ success: false, message: `hf_profile ต้องเป็น ${Object.keys(PROFILES).join(' หรือ ')}` })
        }

        if (!farmName) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อฟาร์ม' })
        }

        await client.query('BEGIN')

        const { rows } = await client.query(
            `UPDATE tb_farms 
             SET name_farms = $1, province = $2, district = $3, address = $4, 
                 barn_unit = COALESCE($5, barn_unit),
                 id_users = CASE WHEN $6::text IS NOT NULL AND $6::text != '' THEN $6::uuid ELSE id_users END,
                 barn_height_m = $7, roof_type = $8, cooling_system = $9, updated_at = NOW()
             WHERE id_farms = $10 RETURNING *`,
            [
                farmName,
                province ? province.trim() : 'สระบุรี',
                district ? district.trim() : 'มวกเหล็ก',
                address ? address.trim() : null,
                barn_unit ? barn_unit.trim() : null,
                id_users && isUUID(id_users) ? id_users : null,
                barn_height_m ? parseFloat(barn_height_m) : 2.7,
                roof_type ? roof_type.trim() : 'สังกะสี (Zinc)',
                cooling_system ? cooling_system.trim() : 'พัดลมระบายอากาศ',
                id
            ]
        )

        if (rows.length === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ success: false, message: 'ไม่พบฟาร์มที่ต้องการแก้ไข' })
        }

        // ต้องรัน migrations/20261021_farm_hf_profile.sql ก่อน
        if (hf_profile !== undefined) {
            const profRes = await client.query(`UPDATE tb_farms SET hf_profile = $1 WHERE id_farms = $2 RETURNING *`, [hf_profile, id])
            rows[0] = profRes.rows[0]
        }

        if (id_devices) {
            if (isUUID(id_devices)) {
                await client.query(`UPDATE tb_devices SET id_farms = $1 WHERE id_devices = $2`, [id, id_devices])
            } else {
                await client.query(`UPDATE tb_devices SET id_farms = $1 WHERE serial_no = $2`, [id, String(id_devices).trim()])
            }
        }

        // จัดการผูก/แก้ไขกล้องวงจรปิดประจำฟาร์ม
        const camData = req.body.camera || (req.body.has_camera ? req.body : null)
        if (camData && (camData.camera_ip || camData.ip_address)) {
            const camIp = String(camData.camera_ip || camData.ip_address).trim()
            if (camIp) {
                const camName = String(camData.camera_name || `${farmName} Camera 1`).trim()
                const camUser = String(camData.camera_user || camData.username || 'admin').trim()
                const camPass = String(camData.camera_pass || camData.password || '').trim()
                const camPort = Number(camData.camera_rtsp_port || camData.rtsp_port) || 554
                const camCh = Number(camData.channel_no) || 1
                const camBrand = String(camData.brand || 'Hikvision').trim()
                const camModel = String(camData.model || 'DS-2CD2143G2-I').trim()

                const existingCam = await client.query(`SELECT id, password_encrypted, username FROM cctv_cameras WHERE farm_id = $1 LIMIT 1`, [id])
                // ไม่กรอกรหัสใหม่ = ใช้รหัสเดิมที่เก็บไว้ (เข้ารหัสอยู่แล้ว ไม่ต้องแปลงซ้ำ)
                let finalPass = camPass ? encryptSecret(camPass) : ''
                if (!finalPass && existingCam.rows.length > 0) {
                    finalPass = existingCam.rows[0].password_encrypted || ''
                }

                const { mainStreamUrl, subStreamUrl } = buildRtspUrls({ brand: camBrand, ip: camIp, port: camPort, channel: camCh })

                if (existingCam.rows.length > 0) {
                    await client.query(`
                        UPDATE cctv_cameras
                        SET camera_name = $1, brand = $2, model = $3, ip_address = $4,
                            rtsp_port = $5, username = $6, password_encrypted = $7, channel_no = $8,
                            main_stream_url = $9, sub_stream_url = $10, is_active = TRUE, updated_at = NOW()
                        WHERE id = $11
                    `, [
                        camName, camBrand, camModel, camIp,
                        camPort, camUser, finalPass, camCh, mainStreamUrl, subStreamUrl, existingCam.rows[0].id
                    ])
                } else {
                    await client.query(`
                        INSERT INTO cctv_cameras (
                            farm_id, camera_name, barn_unit, brand, model, ip_address,
                            rtsp_port, http_port, username, password_encrypted, channel_no,
                            main_stream_url, sub_stream_url, is_active, is_simulation, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 80, $8, $9, $10, $11, $12, TRUE, FALSE, NOW(), NOW())
                    `, [
                        id, camName, barn_unit ? barn_unit.trim() : 'Unit 1', camBrand, camModel, camIp,
                        camPort, camUser, finalPass, camCh, mainStreamUrl, subStreamUrl
                    ])
                }
            }
        } else if (req.body.has_camera === false) {
            await client.query(`UPDATE cctv_cameras SET is_active = FALSE WHERE farm_id = $1`, [id])
        }

        await client.query('COMMIT')

        return res.json({
            success: true,
            message: 'แก้ไขข้อมูลฟาร์มสำเร็จ!',
            farm: rows[0]
        })
    } catch (err) {
        await client.query('ROLLBACK')
        console.error('[Update Farm Error - Rollbacked]:', err.message)
        if (err instanceof CameraSecretError) return res.status(503).json({ success: false, message: err.message })
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขฟาร์ม: ' + err.message })
    } finally {
        client.release()
    }
})

// 7. DELETE: /api/Admin/farms/:id (Database Transaction)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params
    if (!id) return res.status(400).json({ success: false, message: 'Invalid ID' })

    const client = await db.pool.connect()
    try {
        await client.query('BEGIN')

        // 1. ปลดการผูกอุปกรณ์ก่อน
        await client.query(`UPDATE tb_devices SET id_farms = NULL WHERE id_farms = $1`, [id])

        // 2. ลบประวัติเซ็นเซอร์ของฟาร์มนี้
        await client.query(`DELETE FROM tb_sensor_readings WHERE id_farms = $1`, [id])

        // 3. ลบสมาชิกฟาร์ม
        await client.query(`DELETE FROM tb_farm_members WHERE id_farms = $1`, [id])

        // 4. ลบข้อมูลฟาร์ม
        const delRes = await client.query(`DELETE FROM tb_farms WHERE id_farms = $1 RETURNING id_farms`, [id])
        if (delRes.rows.length === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ success: false, message: 'ไม่พบฟาร์มที่ต้องการลบ' })
        }

        await client.query('COMMIT')
        return res.json({
            success: true,
            message: 'ลบข้อมูลฟาร์มสำเร็จ!'
        })
    } catch (err) {
        await client.query('ROLLBACK')
        console.error('[Delete Farm Error - Rollbacked]:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบฟาร์ม: ' + err.message })
    } finally {
        client.release()
    }
})

module.exports = router