const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')

// Helper function to check if a string is a valid UUID
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// -----------------------------------------------------------------
// 1. GET: /api/Admin/farms/all
// ดึงข้อมูลฟาร์มทั้งหมด พร้อมค่าเซ็นเซอร์ล่าสุดต่ออุปกรณ์
// -----------------------------------------------------------------
router.get('/all', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT DISTINCT ON (tb_devices.id_devices)
                tb_farms.id_farms,
                tb_farms.name_farms,
                tb_farms.province,
                tb_devices.id_devices,
                tb_devices.name_devices,
                tb_devices.serial_no,
                tb_sensor_readings.id_sensor_readings,
                tb_sensor_readings.temperature_c,
                tb_sensor_readings.humidity_pct,
                tb_sensor_readings.thi,
                tb_sensor_readings.recorded_at
            FROM tb_farms, tb_devices, tb_sensor_readings 
            WHERE tb_farms.id_farms = tb_devices.id_farms 
            AND tb_devices.id_devices = tb_sensor_readings.id_devices 
            ORDER BY tb_devices.id_devices, tb_sensor_readings.recorded_at DESC
        `)
        res.json({
            rows,
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
// เพิ่มฟาร์มใหม่ พร้อมผูกอุปกรณ์ IoT
// -----------------------------------------------------------------
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { 
            name_farms, name, 
            province, district, address, 
            barn_height_m, roof_type, cooling_system,
            id_devices, device_serial, new_device_name 
        } = req.body

        const farmName = (name_farms || name || '').trim()
        if (!farmName) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อฟาร์ม' })
        }

        // 1. เพิ่มฟาร์มลง tb_farms
        const farmRes = await db.query(
            `INSERT INTO tb_farms (name_farms, province, district, address, barn_height_m, roof_type, cooling_system, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
             RETURNING *`,
            [
                farmName,
                province ? province.trim() : 'สระบุรี',
                district ? district.trim() : 'มวกเหล็ก',
                address ? address.trim() : null,
                barn_height_m ? parseFloat(barn_height_m) : 2.7,
                roof_type ? roof_type.trim() : 'สังกะสี (Zinc)',
                cooling_system ? cooling_system.trim() : 'พัดลมระบายอากาศ'
            ]
        )
        const newFarm = farmRes.rows[0]
        const farmId = newFarm.id_farms

        // 2. ผูกอุปกรณ์กับฟาร์ม
        let assignedDevice = null
        if (id_devices) {
            if (isUUID(id_devices)) {
                const devUpdate = await db.query(
                    `UPDATE tb_devices SET id_farms = $1, status = 'online', last_seen_at = NOW() WHERE id_devices = $2 RETURNING *`,
                    [farmId, id_devices]
                )
                if (devUpdate.rows.length > 0) assignedDevice = devUpdate.rows[0]
            } else {
                // กรณีส่ง serial_no หรือชื่อมาแทน UUID
                const devUpdate = await db.query(
                    `UPDATE tb_devices SET id_farms = $1, status = 'online', last_seen_at = NOW() WHERE serial_no = $2 RETURNING *`,
                    [farmId, String(id_devices).trim()]
                )
                if (devUpdate.rows.length > 0) assignedDevice = devUpdate.rows[0]
            }
        } else if (device_serial && device_serial.trim()) {
            const serial = device_serial.trim()
            const devName = new_device_name ? new_device_name.trim() : `ESP32 SHT40 (${serial})`
            const devRes = await db.query(
                `INSERT INTO tb_devices (id_farms, type, name_devices, serial_no, status, last_seen_at, created_at, updated_at)
                 VALUES ($1, 'env_sensor', $2, $3, 'online', NOW(), NOW(), NOW())
                 ON CONFLICT (serial_no) DO UPDATE SET id_farms = $1, name_devices = EXCLUDED.name_devices
                 RETURNING *`,
                [farmId, devName, serial]
            )
            if (devRes.rows.length > 0) assignedDevice = devRes.rows[0]
        }

        // 3. ตรวจสอบและใส่ค่า sensor_reading เริ่มต้นให้ฟาร์มแสดงในตารางได้
        if (assignedDevice) {
            const checkReading = await db.query(
                `SELECT id_sensor_readings FROM tb_sensor_readings WHERE id_devices = $1 LIMIT 1`,
                [assignedDevice.id_devices]
            )
            if (checkReading.rows.length === 0) {
                await db.query(
                    `INSERT INTO tb_sensor_readings (id_devices, id_farms, temperature_c, humidity_pct, recorded_at)
                     VALUES ($1, $2, 28.5, 70.0, NOW())`,
                    [assignedDevice.id_devices, farmId]
                )
            }
        }

        return res.status(201).json({
            success: true,
            message: 'เพิ่มข้อมูลฟาร์มสำเร็จ!',
            farm: newFarm,
            device: assignedDevice
        })
    } catch (err) {
        console.error('[Add Farm Error]:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มฟาร์ม: ' + err.message })
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
            const { rows } = await db.query(`SELECT * FROM tb_farms WHERE name_farms ILIKE $1 LIMIT 1`, [`%${id}%`])
            if (rows.length > 0) farm = rows[0]
        }

        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลฟาร์ม'
            })
        }

        // ดึงค่าเซ็นเซอร์ล่าสุด
        let latestReading = null
        try {
            const { rows } = await db.query(`
                SELECT sr.*, d.serial_no, d.name_devices, d.status AS device_status, d.last_seen_at
                FROM tb_sensor_readings sr
                JOIN tb_devices d ON d.id_devices = sr.id_devices
                WHERE sr.id_farms = $1
                ORDER BY sr.recorded_at DESC
                LIMIT 1
            `, [farm.id_farms])
            if (rows.length > 0) latestReading = rows[0]
        } catch (err) {
            console.warn('[Farm Detail API] Latest reading fallback:', err.message)
        }

        // ดึงประวัติ readings ย้อนหลัง 30 รายการ
        let history = []
        try {
            const { rows } = await db.query(`
                SELECT sr.id_sensor_readings AS id, sr.temperature_c, sr.humidity_pct, sr.pressure_hpa, sr.thi, sr.stress_level, sr.recorded_at,
                       d.serial_no
                FROM tb_sensor_readings sr
                LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
                WHERE sr.id_farms = $1
                ORDER BY sr.recorded_at DESC
                LIMIT 30
            `, [farm.id_farms])
            history = rows.reverse()
        } catch (err) {
            console.warn('[Farm Detail API] History readings fallback:', err.message)
        }

        return res.json({
            success: true,
            farm,
            latest_sensor: latestReading || (history.length > 0 ? history[history.length - 1] : null),
            history
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
    try {
        const { id } = req.params
        const { name_farms, name, province, district, address, barn_height_m, roof_type, cooling_system, id_devices } = req.body
        const farmName = (name_farms || name || '').trim()

        if (!farmName) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อฟาร์ม' })
        }

        const { rows } = await db.query(
            `UPDATE tb_farms 
             SET name_farms = $1, province = $2, district = $3, address = $4, 
                 barn_height_m = $5, roof_type = $6, cooling_system = $7, updated_at = NOW()
             WHERE id_farms = $8 RETURNING *`,
            [
                farmName,
                province ? province.trim() : 'สระบุรี',
                district ? district.trim() : 'มวกเหล็ก',
                address ? address.trim() : null,
                barn_height_m ? parseFloat(barn_height_m) : 2.7,
                roof_type ? roof_type.trim() : 'สังกะสี (Zinc)',
                cooling_system ? cooling_system.trim() : 'พัดลมระบายอากาศ',
                id
            ]
        )

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบฟาร์มที่ต้องการแก้ไข' })
        }

        if (id_devices) {
            if (isUUID(id_devices)) {
                await db.query(`UPDATE tb_devices SET id_farms = $1 WHERE id_devices = $2`, [id, id_devices])
            } else {
                await db.query(`UPDATE tb_devices SET id_farms = $1 WHERE serial_no = $2`, [id, String(id_devices).trim()])
            }
        }

        return res.json({
            success: true,
            message: 'แก้ไขข้อมูลฟาร์มสำเร็จ!',
            farm: rows[0]
        })
    } catch (err) {
        console.error('[Update Farm Error]:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขฟาร์ม: ' + err.message })
    }
})

// 7. DELETE: /api/Admin/farms/:id
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params
        if (!id) return res.status(400).json({ success: false, message: 'Invalid ID' })

        // 1. ปลดการผูกอุปกรณ์ก่อน หรือเคลียร์ foreign key
        try {
            await db.query(`UPDATE tb_devices SET id_farms = NULL WHERE id_farms = $1`, [id])
        } catch (e) {
            // ถ้า NOT NULL ให้ปล่อยให้ cascade จัดการ
        }

        try {
            await db.query(`DELETE FROM tb_sensor_readings WHERE id_farms = $1`, [id])
        } catch (e) {}

        try {
            await db.query(`DELETE FROM tb_farm_members WHERE id_farms = $1`, [id])
        } catch (e) {}

        const delRes = await db.query(`DELETE FROM tb_farms WHERE id_farms = $1 RETURNING id_farms`, [id])
        if (delRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบฟาร์มที่ต้องการลบ' })
        }

        return res.json({
            success: true,
            message: 'ลบข้อมูลฟาร์มสำเร็จ!'
        })
    } catch (err) {
        console.error('[Delete Farm Error]:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบฟาร์ม: ' + err.message })
    }
})

module.exports = router