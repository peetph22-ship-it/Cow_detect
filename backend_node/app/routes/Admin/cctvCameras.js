const express = require('express')
const router = express.Router({ mergeParams: true })
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')

const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// Helper to build Hikvision dual-stream RTSP URLs
const buildHikvisionUrls = (username, password, ip, rtspPort = 554, channelNo = 1) => {
    const encUser = encodeURIComponent(username)
    const encPass = encodeURIComponent(password)
    const port = rtspPort || 554
    const ch = channelNo || 1
    return {
        mainStreamUrl: `rtsp://${encUser}:${encPass}@${ip}:${port}/Streaming/Channels/${ch}01`,
        subStreamUrl: `rtsp://${encUser}:${encPass}@${ip}:${port}/Streaming/Channels/${ch}02`
    }
}

// -----------------------------------------------------------------
// 1. GET /api/Admin/farms/:farmId/cameras
// List all CCTV cameras bound to the farm
// -----------------------------------------------------------------
router.get('/', async (req, res) => {
    const farmId = req.params.farmId
    if (!isUUID(farmId)) {
        return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    }

    try {
        const { rows } = await db.query(
            `SELECT id, farm_id, camera_name, barn_unit, brand, model, ip_address, 
                    rtsp_port, http_port, username, channel_no, main_stream_url, sub_stream_url, 
                    is_active, is_simulation, created_at, updated_at
             FROM cctv_cameras
             WHERE farm_id = $1
             ORDER BY created_at ASC`,
            [farmId]
        )
        return res.json({ success: true, cameras: rows, count: rows.length })
    } catch (err) {
        console.error('[CCTV Router] GET Cameras Error:', err)
        return res.status(500).json({ success: false, message: 'Database error fetching cameras' })
    }
})

// -----------------------------------------------------------------
// 2. POST /api/Admin/farms/:farmId/cameras
// Register a new Hikvision camera and bind to the farm (ACID Transaction)
// -----------------------------------------------------------------
router.post('/', async (req, res) => {
    const farmId = req.params.farmId
    if (!isUUID(farmId)) {
        return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    }

    const {
        camera_name,
        barn_unit,
        brand = 'Hikvision',
        model = 'DS-2CD2143G2-I',
        ip_address,
        rtsp_port = 554,
        http_port = 80,
        username,
        password,
        channel_no = 1,
        is_simulation = false
    } = req.body

    if (!camera_name || !ip_address || !username || !password) {
        return res.status(400).json({
            success: false,
            message: 'กรุณากรอกข้อมูลกล้องให้ครบถ้วน: camera_name, ip_address, username, password'
        })
    }

    const { mainStreamUrl, subStreamUrl } = buildHikvisionUrls(
        username,
        password,
        ip_address,
        rtsp_port,
        channel_no
    )

    const client = await db.pool.connect()
    try {
        await client.query('BEGIN')

        // Verify farm exists
        const farmCheck = await client.query('SELECT id_farms FROM tb_farms WHERE id_farms = $1', [farmId])
        if (farmCheck.rowCount === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ success: false, message: 'ไม่พบฟาร์มที่ระบุ' })
        }

        // Insert new camera
        const insertQuery = `
            INSERT INTO cctv_cameras (
                farm_id, camera_name, barn_unit, brand, model, ip_address,
                rtsp_port, http_port, username, password_encrypted, channel_no,
                main_stream_url, sub_stream_url, is_active, is_simulation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14)
            RETURNING id, farm_id, camera_name, barn_unit, brand, model, ip_address,
                      rtsp_port, http_port, username, channel_no, main_stream_url, sub_stream_url,
                      is_active, is_simulation, created_at
        `
        const values = [
            farmId,
            camera_name.trim(),
            (barn_unit || 'Main Barn Unit 1').trim(),
            brand,
            model,
            ip_address.trim(),
            Number(rtsp_port) || 554,
            Number(http_port) || 80,
            username.trim(),
            Buffer.from(password).toString('base64'), // Simple reversible encoding for gateway workers
            Number(channel_no) || 1,
            mainStreamUrl,
            subStreamUrl,
            Boolean(is_simulation)
        ]

        const { rows } = await client.query(insertQuery, values)
        await client.query('COMMIT')

        return res.status(201).json({
            success: true,
            message: 'ลงทะเบียนกล้องวงจรปิด Hikvision และผูกกับฟาร์มสำเร็จ',
            camera: rows[0]
        })
    } catch (err) {
        await client.query('ROLLBACK')
        console.error('[CCTV Router] POST Camera Error:', err)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกกล้อง' })
    } finally {
        client.release()
    }
})

// -----------------------------------------------------------------
// 3. DELETE /api/Admin/farms/:farmId/cameras/:cameraId
// Delete/unbind a camera (ACID Transaction)
// -----------------------------------------------------------------
router.delete('/:cameraId', async (req, res) => {
    const { farmId, cameraId } = req.params
    if (!isUUID(farmId) || !isUUID(cameraId)) {
        return res.status(400).json({ success: false, message: 'Invalid UUID' })
    }

    const client = await db.pool.connect()
    try {
        await client.query('BEGIN')
        const delRes = await client.query(
            'DELETE FROM cctv_cameras WHERE id = $1 AND farm_id = $2 RETURNING id, camera_name',
            [cameraId, farmId]
        )
        if (delRes.rowCount === 0) {
            await client.query('ROLLBACK')
            return res.status(404).json({ success: false, message: 'ไม่พบกล้องที่ต้องการลบ' })
        }
        await client.query('COMMIT')
        return res.json({ success: true, message: `ลบกล้อง ${delRes.rows[0].camera_name} สำเร็จ` })
    } catch (err) {
        await client.query('ROLLBACK')
        console.error('[CCTV Router] DELETE Camera Error:', err)
        return res.status(500).json({ success: false, message: 'Database error deleting camera' })
    } finally {
        client.release()
    }
})

// -----------------------------------------------------------------
// 4. GET /api/Admin/farms/:farmId/behavior-telemetry
// Get rolling 5-minute behavior telemetry for charts and Cockpit
// -----------------------------------------------------------------
router.get('/telemetry', async (req, res) => {
    const farmId = req.params.farmId
    if (!isUUID(farmId)) {
        return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    }

    const limit = Math.min(288, Math.max(1, Number(req.query.limit) || 72)) // Default 72 points (6 hours)
    const isSimulation = req.query.is_simulation === 'true'

    try {
        const { rows } = await db.query(
            `SELECT id, camera_id, farm_id, timestamp, total_cows_detected,
                    standing_count, lying_count, feeding_count, drinking_count,
                    standing_pct, lying_pct, feeding_pct, drinking_pct,
                    cow_comfort_index, ai_confidence_avg, active_track_ids, is_simulation
             FROM cctv_behavior_telemetry
             WHERE farm_id = $1 AND is_simulation = $2
             ORDER BY timestamp DESC
             LIMIT $3`,
            [farmId, isSimulation, limit]
        )
        return res.json({ success: true, telemetry: rows.reverse() })
    } catch (err) {
        console.error('[CCTV Router] GET Telemetry Error:', err)
        return res.status(500).json({ success: false, message: 'Database error fetching behavior telemetry' })
    }
})

// -----------------------------------------------------------------
// 5. POST /api/Admin/farms/:farmId/behavior-telemetry
// Ingest 5-minute periodic herd aggregate from FastAPI Worker / Simulator
// -----------------------------------------------------------------
router.post('/telemetry', async (req, res) => {
    const farmId = req.params.farmId
    if (!isUUID(farmId)) {
        return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    }

    const {
        camera_id = null,
        total_cows_detected = 0,
        standing_count = 0,
        lying_count = 0,
        feeding_count = 0,
        drinking_count = 0,
        standing_pct = 0,
        lying_pct = 0,
        feeding_pct = 0,
        drinking_pct = 0,
        cow_comfort_index = null,
        ai_confidence_avg = 0.85,
        active_track_ids = [],
        is_simulation = false
    } = req.body

    // Compute Cow Comfort Index (CCI) if not provided
    // CCI = (lying_count / max(1, standing_count + lying_count)) * 100
    const calcCci = cow_comfort_index !== null 
        ? Number(cow_comfort_index)
        : Number((lying_count / Math.max(1, standing_count + lying_count) * 100).toFixed(1))

    try {
        const insertQuery = `
            INSERT INTO cctv_behavior_telemetry (
                camera_id, farm_id, total_cows_detected,
                standing_count, lying_count, feeding_count, drinking_count,
                standing_pct, lying_pct, feeding_pct, drinking_pct,
                cow_comfort_index, ai_confidence_avg, active_track_ids, is_simulation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, timestamp, cow_comfort_index
        `
        const { rows } = await db.query(insertQuery, [
            camera_id && isUUID(camera_id) ? camera_id : null,
            farmId,
            total_cows_detected,
            standing_count,
            lying_count,
            feeding_count,
            drinking_count,
            standing_pct,
            lying_pct,
            feeding_pct,
            drinking_pct,
            calcCci,
            ai_confidence_avg,
            active_track_ids,
            Boolean(is_simulation)
        ])

        return res.status(201).json({ success: true, telemetry: rows[0] })
    } catch (err) {
        console.error('[CCTV Router] POST Telemetry Error:', err)
        return res.status(500).json({ success: false, message: 'Database error storing behavior telemetry' })
    }
})

// -----------------------------------------------------------------
// 6. GET /api/Admin/farms/:farmId/behavior-alerts
// List active welfare alerts
// -----------------------------------------------------------------
router.get('/alerts', async (req, res) => {
    const farmId = req.params.farmId
    if (!isUUID(farmId)) {
        return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    }

    try {
        const { rows } = await db.query(
            `SELECT id, farm_id, camera_id, track_id, alert_type, severity,
                    duration_minutes, message_th, thi_at_event, snapshot_url,
                    is_resolved, is_simulation, created_at,
                    is_accurate, feedback_note, feedback_at
             FROM animal_behavior_alerts
             WHERE farm_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [farmId]
        )
        return res.json({ success: true, alerts: rows })
    } catch (err) {
        console.error('[CCTV Router] GET Alerts Error:', err)
        return res.status(500).json({ success: false, message: 'Database error fetching behavior alerts' })
    }
})

// -----------------------------------------------------------------
// 7. POST /api/Admin/farms/:farmId/behavior-alerts
// Trigger animal welfare alert (Layer 3 Engine)
// -----------------------------------------------------------------
router.post('/alerts', async (req, res) => {
    const farmId = req.params.farmId
    if (!isUUID(farmId)) {
        return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    }

    const {
        camera_id = null,
        track_id = null,
        alert_type,
        severity = 'warning',
        duration_minutes = 0,
        message_th,
        thi_at_event = null,
        snapshot_url = null,
        is_simulation = false
    } = req.body

    if (!alert_type || !message_th) {
        return res.status(400).json({ success: false, message: 'alert_type and message_th are required' })
    }

    try {
        const insertQuery = `
            INSERT INTO animal_behavior_alerts (
                farm_id, camera_id, track_id, alert_type, severity,
                duration_minutes, message_th, thi_at_event, snapshot_url, is_simulation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, created_at, message_th, severity
        `
        const { rows } = await db.query(insertQuery, [
            farmId,
            camera_id && isUUID(camera_id) ? camera_id : null,
            track_id ? Number(track_id) : null,
            alert_type,
            severity,
            Number(duration_minutes) || 0,
            message_th,
            thi_at_event ? Number(thi_at_event) : null,
            snapshot_url,
            Boolean(is_simulation)
        ])

        return res.status(201).json({ success: true, alert: rows[0] })
    } catch (err) {
        console.error('[CCTV Router] POST Alert Error:', err)
        return res.status(500).json({ success: false, message: 'Database error recording behavior alert' })
    }
})

// -----------------------------------------------------------------
// 8. PATCH /api/Admin/farms/:farmId/behavior-alerts/:alertId/resolve
// Mark alert as acknowledged / resolved
// -----------------------------------------------------------------
router.patch('/alerts/:alertId/resolve', async (req, res) => {
    const { farmId, alertId } = req.params
    if (!isUUID(farmId) || !isUUID(alertId)) {
        return res.status(400).json({ success: false, message: 'Invalid UUID' })
    }

    try {
        const { rows } = await db.query(
            'UPDATE animal_behavior_alerts SET is_resolved = TRUE WHERE id = $1 AND farm_id = $2 RETURNING id, is_resolved',
            [alertId, farmId]
        )
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบการแจ้งเตือน' })
        }
        return res.json({ success: true, message: 'รับทราบและระงับการเตือนเรียบร้อย' })
    } catch (err) {
        console.error('[CCTV Router] Resolve Alert Error:', err)
        return res.status(500).json({ success: false, message: 'Database error resolving alert' })
    }
})

// -----------------------------------------------------------------
// 9. POST /api/Admin/farms/:farmId/behavior-alerts/:alertId/feedback
// Human-in-the-loop farmer feedback (accurate / false alarm)
// -----------------------------------------------------------------
router.post(['/alerts/:alertId/feedback', '/behavior-alerts/:alertId/feedback'], async (req, res) => {
    const { farmId, alertId } = req.params
    if (!isUUID(farmId) || !isUUID(alertId)) {
        return res.status(400).json({ success: false, message: 'Invalid UUID' })
    }

    const { is_accurate, feedback_note = null } = req.body
    if (typeof is_accurate !== 'boolean') {
        return res.status(400).json({ success: false, message: 'is_accurate (boolean) is required' })
    }

    try {
        const { rows } = await db.query(
            `UPDATE animal_behavior_alerts
             SET is_accurate = $1, feedback_note = $2, feedback_at = NOW()
             WHERE id = $3 AND farm_id = $4
             RETURNING id, is_accurate, feedback_note, feedback_at`,
            [is_accurate, feedback_note, alertId, farmId]
        )
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบการแจ้งเตือน' })
        }
        return res.json({ success: true, message: 'บันทึกการประเมินความแม่นยำเรียบร้อย', alert: rows[0] })
    } catch (err) {
        console.error('[CCTV Router] Feedback Error:', err)
        return res.status(500).json({ success: false, message: 'Database error saving alert feedback' })
    }
})

module.exports = router
