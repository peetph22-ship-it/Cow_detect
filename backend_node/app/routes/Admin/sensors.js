const express = require('express')
const router = express.Router()
const db = require('../../config/db')

// ฟังก์ชันคำนวณ THI (สูตร NRC 1971 / NOAA 1976 อิงเกณฑ์โคนมไทย)
const calculateTHI = (temp, hum) => {
    return (1.8 * temp + 32) - (0.55 - 0.0055 * hum) * (1.8 * temp - 26)
}

const getStressLevel = (thi) => {
    if (thi < 76.0) return 'normal'
    if (thi < 80.0) return 'mild'
    if (thi < 84.0) return 'moderate'
    return 'severe'
}

// -----------------------------------------------------------------
// 1. POST: /api/Admin/sensors/data (หรือ /api/Admin/sensors)
// รับข้อมูลจาก ESP32-S3 ผ่าน HTTP POST JSON
// -----------------------------------------------------------------
router.post(['/data', '/'], async (req, res) => {
    try {
        const { serial_no, temperature_c, humidity_pct, pressure_hpa } = req.body

        if (temperature_c === undefined || humidity_pct === undefined) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาส่งค่า temperature_c และ humidity_pct ให้ครบถ้วน'
            })
        }

        const temp = parseFloat(temperature_c)
        const hum = parseFloat(humidity_pct)
        const pressure = pressure_hpa ? parseFloat(pressure_hpa) : null
        const serial = serial_no ? String(serial_no).trim() : 'ESP32-S3-01'

        const thi = parseFloat(calculateTHI(temp, hum).toFixed(2))
        const stress_level = getStressLevel(thi)

        let readingId = null
        let deviceId = null
        let farmId = null

        try {
            // 1. ค้นหา Device ตาม serial_no
            let devRes = await db.query(`SELECT id_devices, id_farms FROM tb_devices WHERE serial_no = $1 LIMIT 1`, [serial])
            
            if (devRes.rows && devRes.rows.length > 0) {
                deviceId = devRes.rows[0].id_devices
                farmId = devRes.rows[0].id_farms
                // อัปเดตสถานะเป็น online และเวลาล่าสุด
                await db.query(`UPDATE tb_devices SET status = 'online', last_seen_at = NOW() WHERE id_devices = $1`, [deviceId])
            } else {
                // ถ้ายังไม่มี Device ให้หา Farm แรก หรือสร้าง Farm เริ่มต้น
                let farmRes = await db.query(`SELECT id_farms FROM tb_farms LIMIT 1`)
                if (farmRes.rows && farmRes.rows.length > 0) {
                    farmId = farmRes.rows[0].id_farms
                } else {
                    const newFarm = await db.query(`INSERT INTO tb_farms (name_farms, province) VALUES ($1, $2) RETURNING id_farms`, ['CowCare AI Demo Farm', 'สระบุรี'])
                    farmId = newFarm.rows[0].id_farms
                }

                // สร้าง Device ใหม่ในระบบ
                const newDev = await db.query(
                    `INSERT INTO tb_devices (id_farms, type, name_devices, serial_no, status, last_seen_at) 
                     VALUES ($1, 'env_sensor', $2, $3, 'online', NOW()) RETURNING id_devices`,
                    [farmId, `ESP32 SHT40 (${serial})`, serial]
                )
                deviceId = newDev.rows[0].id_devices
            }

            // 2. บันทึกข้อมูลลง sensor_readings
            const insertRes = await db.query(
                `INSERT INTO tb_sensor_readings (id_devices, id_farms, temperature_c, humidity_pct, pressure_hpa, recorded_at)
                 VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id_sensor_readings, recorded_at`,
                [deviceId, farmId, temp, hum, pressure]
            )
            readingId = insertRes.rows[0].id_sensor_readings

        } catch (dbErr) {
            console.error('[Admin IoT DB Warning] ไม่สามารถบันทึกลงตาราง devices/sensor_readings:', dbErr.message)
        }

        return res.status(200).json({
            success: true,
            message: 'Sensor data recorded in Admin system successfully!',
            data: {
                id: readingId,
                serial_no: serial,
                temperature_c: temp,
                humidity_pct: hum,
                pressure_hpa: pressure,
                thi,
                stress_level,
                timestamp: new Date().toISOString()
            }
        })

    } catch (err) {
        console.error('[Admin IoT Sensor Error]:', err.message)
        return res.status(500).json({
            success: false,
            message: 'Server error processing sensor data: ' + err.message
        })
    }
})

// -----------------------------------------------------------------
// 2. GET: /api/Admin/sensors/latest
// ดึงข้อมูลเซ็นเซอร์ล่าสุด สำหรับ Admin Dashboard แสดงผล Real-time
// -----------------------------------------------------------------
router.get('/latest', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT sr.*, d.name AS device_name, d.serial_no, d.status AS device_status
            FROM sensor_readings sr
            JOIN devices d ON d.id = sr.device_id
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
            data: rows[0]
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
router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50
        const { rows } = await db.query(`
            SELECT sr.id, sr.temperature_c, sr.humidity_pct, sr.pressure_hpa, sr.thi, sr.stress_level, sr.recorded_at,
                   d.serial_no, d.name AS device_name
            FROM sensor_readings sr
            LEFT JOIN devices d ON d.id = sr.device_id
            ORDER BY sr.recorded_at DESC
            LIMIT $1
        `, [limit])

        return res.json({
            success: true,
            count: rows.length,
            data: rows.reverse() // เรียงจากเก่าไปใหม่สำหรับวาดกราฟ
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
router.get('/devices', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT d.*, f.name_farms AS farm_name,
                   CASE 
                     WHEN d.last_seen_at >= NOW() - INTERVAL '5 minutes' THEN 'online'
                     ELSE 'offline'
                   END AS calculated_status
            FROM tb_devices d
            LEFT JOIN tb_farms f ON f.id_farms = d.id_farms
            ORDER BY d.created_at DESC
        `)

        return res.json({
            success: true,
            count: rows.length,
            devices: rows
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
router.get('/stats', async (req, res) => {
    try {
        const devicesRes = await db.query(`
            SELECT 
                COUNT(*) AS total_devices,
                COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '5 minutes') AS online_devices,
                COUNT(*) FILTER (WHERE last_seen_at < NOW() - INTERVAL '5 minutes' OR last_seen_at IS NULL) AS offline_devices
            FROM tb_devices
        `)

        const latestRes = await db.query(`
            SELECT thi, temperature_c, humidity_pct, recorded_at
            FROM tb_sensor_readings
            ORDER BY recorded_at DESC
            LIMIT 1
        `)

        const stats = {
            devices: devicesRes.rows[0] || { total_devices: 0, online_devices: 0, offline_devices: 0 },
            latest: latestRes.rows[0] || null
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
