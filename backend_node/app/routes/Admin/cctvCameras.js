const express = require('express')
const router = express.Router({ mergeParams: true })
const db = require('../../config/db')
const { verifyToken, requireRole, adminOrInternal } = require('../../middleware/authMiddleware')
const { encryptSecret, decryptSecret, isConfigured, CameraSecretError } = require('../../services/cameraSecrets')
const { getCameraBehavior } = require('../../services/cameraBehavior')
const {
    getFarmSamplesWithAudits,
    saveSampleAudit,
    getFarmLyingThiAnalysis
} = require('../../services/lyingThiAnalysisService')

// ข้อมูลกล้อง (ที่อยู่, user, รหัส) ดูหรือแก้ได้เฉพาะ admin
// ส่ง telemetry/alerts: admin หรือ behavior engine ฝั่ง Python ที่ส่ง X-Internal-Key (INTERNAL_API_KEY)
const adminOnly = [verifyToken, requireRole('admin')]

const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

const { buildRtspUrls } = require('../../services/rtspUrls')

// -----------------------------------------------------------------
// 1. GET /api/Admin/farms/:farmId/cameras
// List all CCTV cameras bound to the farm
// -----------------------------------------------------------------
router.get('/', adminOnly, async (req, res) => {
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
router.post('/', adminOnly, async (req, res) => {
    const farmId = req.params.farmId
    if (!isUUID(farmId)) {
        return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    }

    const {
        camera_name,
        barn_unit,
        brand = 'Dahua',
        model = '',
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
    if (!isConfigured()) {
        return res.status(503).json({ success: false, message: 'ยังไม่ได้ตั้ง CAMERA_SECRET_KEY บน server จึงบันทึกรหัสกล้องไม่ได้' })
    }

    const { mainStreamUrl, subStreamUrl } = buildRtspUrls({
        brand,
        username,
        password,
        ip: ip_address,
        port: rtsp_port,
        channel: channel_no
    })

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
            encryptSecret(password),
            Number(channel_no) || 1,
            mainStreamUrl,
            subStreamUrl,
            Boolean(is_simulation)
        ]

        const { rows } = await client.query(insertQuery, values)
        await client.query('COMMIT')

        return res.status(201).json({
            success: true,
            message: 'ลงทะเบียนกล้องและผูกกับฟาร์มสำเร็จ',
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
// GET /api/Admin/farms/:farmId/cameras/behavior
// ผลนับพฤติกรรมวัวจากกล้องล่าสุด + รายชั่วโมง 24 ชม. (ข้อมูลจริงเท่านั้น)
// -----------------------------------------------------------------
router.get('/behavior', adminOnly, async (req, res) => {
    const { farmId } = req.params
    if (!isUUID(farmId)) return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    try {
        return res.json({ success: true, camera_behavior: await getCameraBehavior(farmId) })
    } catch (err) {
        console.error('[CCTV Router] behavior error:', err.message)
        return res.status(500).json({ success: false, message: 'Database error fetching camera behavior' })
    }
})

// -----------------------------------------------------------------
// GET /api/Admin/farms/:farmId/cameras/samples
// รายการภาพตัวอย่างรายชั่วโมงจาก bucket camera-samples + กรอบ YOLO + ผลนับเทียบที่ Admin กรอกไว้
// -----------------------------------------------------------------
router.get('/samples', adminOnly, async (req, res) => {
    const { farmId } = req.params
    if (!isUUID(farmId)) return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24))
    try {
        const data = await getFarmSamplesWithAudits(farmId, { limit })
        return res.json({ success: true, ...data })
    } catch (err) {
        console.error('[CCTV Router] GET samples error:', err.message)
        return res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายการภาพตัวอย่างได้' })
    }
})

// -----------------------------------------------------------------
// POST /api/Admin/farms/:farmId/cameras/samples/audit
// บันทึกผลนับจริงจาก Admin (นอน/ยืน/กินอาหาร/ดื่มน้ำ) ลงตาราง tb_camera_sample_audits
// -----------------------------------------------------------------
router.post('/samples/audit', adminOnly, async (req, res) => {
    const { farmId } = req.params
    if (!isUUID(farmId)) return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    try {
        const adminActor = req.user?.email || req.user?.name || String(req.user?.id || 'admin')
        const saved = await saveSampleAudit(farmId, req.body || {}, adminActor)
        const updated = await getFarmSamplesWithAudits(farmId, { limit: 24 })
        return res.json({
            success: true,
            message: 'บันทึกผลการนับเทียบเรียบร้อย',
            audit: saved,
            summary: updated.summary
        })
    } catch (err) {
        const status = err.statusCode || 500
        if (status >= 500) console.error('[CCTV Router] POST samples/audit error:', err.message)
        return res.status(status).json({
            success: false,
            message: err.message || 'เกิดข้อผิดพลาดในการบันทึกผลนับเทียบ'
        })
    }
})

// -----------------------------------------------------------------
// GET /api/Admin/farms/:farmId/cameras/lying-thi-analysis
// วิเคราะห์ % วัวนอนรายชั่วโมงเทียบ THI (ตัดช่วงรีดนม/ให้อาหาร, ควบคุมชั่วโมงของวัน, broken-line regression)
// -----------------------------------------------------------------
router.get('/lying-thi-analysis', adminOnly, async (req, res) => {
    const { farmId } = req.params
    if (!isUUID(farmId)) return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30))
    try {
        const analysis = await getFarmLyingThiAnalysis(farmId, { days })
        return res.json({ success: true, analysis })
    } catch (err) {
        const status = err.statusCode || 500
        if (status >= 500) console.error('[CCTV Router] GET lying-thi-analysis error:', err.message)
        return res.status(status).json({
            success: false,
            message: err.message || 'ไม่สามารถวิเคราะห์ข้อมูล % วัวนอนเทียบ THI ได้'
        })
    }
})

// -----------------------------------------------------------------
// PUT /api/Admin/farms/:farmId/cameras/:cameraId
// แก้ไขกล้อง: ส่งเฉพาะช่องที่เปลี่ยน, password ว่าง = ใช้รหัสเดิม
// -----------------------------------------------------------------
router.put('/:cameraId', adminOnly, async (req, res) => {
    const { farmId, cameraId } = req.params
    if (!isUUID(farmId) || !isUUID(cameraId)) {
        return res.status(400).json({ success: false, message: 'Invalid UUID' })
    }
    try {
        const cur = await db.query(`SELECT * FROM cctv_cameras WHERE id = $1 AND farm_id = $2`, [cameraId, farmId])
        if (cur.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบกล้อง' })
        const c = cur.rows[0]
        const b = req.body || {}
        const pick = (key, fallback) => (b[key] !== undefined && b[key] !== null && String(b[key]).trim() !== '' ? b[key] : fallback)

        const next = {
            camera_name: String(pick('camera_name', c.camera_name)).trim(),
            barn_unit: String(pick('barn_unit', c.barn_unit || '')).trim(),
            brand: String(pick('brand', c.brand)).trim(),
            model: String(pick('model', c.model || '')).trim(),
            ip_address: String(pick('ip_address', c.ip_address)).trim(),
            rtsp_port: Number(pick('rtsp_port', c.rtsp_port)) || 554,
            http_port: Number(pick('http_port', c.http_port)) || 80,
            username: String(pick('username', c.username)).trim(),
            channel_no: Number(pick('channel_no', c.channel_no)) || 1,
            is_active: b.is_active === undefined ? c.is_active : Boolean(b.is_active)
        }
        const newPassword = b.password ? String(b.password) : ''
        if (newPassword && !isConfigured()) {
            return res.status(503).json({ success: false, message: 'ยังไม่ได้ตั้ง CAMERA_SECRET_KEY บน server จึงบันทึกรหัสกล้องไม่ได้' })
        }
        const { mainStreamUrl, subStreamUrl } = buildRtspUrls({
            brand: next.brand, ip: next.ip_address, port: next.rtsp_port, channel: next.channel_no
        })
        const { rows } = await db.query(`
            UPDATE cctv_cameras
            SET camera_name = $1, barn_unit = $2, brand = $3, model = $4, ip_address = $5,
                rtsp_port = $6, http_port = $7, username = $8, channel_no = $9, is_active = $10,
                main_stream_url = $11, sub_stream_url = $12,
                password_encrypted = COALESCE($13, password_encrypted), updated_at = NOW()
            WHERE id = $14 AND farm_id = $15
            RETURNING id, farm_id, camera_name, barn_unit, brand, model, ip_address, rtsp_port, http_port,
                      username, channel_no, main_stream_url, sub_stream_url, is_active, is_simulation, created_at, updated_at
        `, [
            next.camera_name, next.barn_unit, next.brand, next.model, next.ip_address,
            next.rtsp_port, next.http_port, next.username, next.channel_no, next.is_active,
            mainStreamUrl, subStreamUrl, newPassword ? encryptSecret(newPassword) : null, cameraId, farmId
        ])
        return res.json({ success: true, message: 'แก้ไขข้อมูลกล้องสำเร็จ', camera: rows[0] })
    } catch (err) {
        if (err instanceof CameraSecretError) return res.status(503).json({ success: false, message: err.message })
        console.error('[CCTV Router] PUT Camera Error:', err.message)
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขกล้อง' })
    }
})

// -----------------------------------------------------------------
// GET /api/Admin/farms/:farmId/cameras/:cameraId/stream-url
// ที่อยู่ RTSP พร้อม user/รหัส สำหรับเปิดภาพสดเท่านั้น (admin) ไม่เก็บไว้ในรายการกล้อง
// -----------------------------------------------------------------
router.get('/:cameraId/stream-url', adminOnly, async (req, res) => {
    const { farmId, cameraId } = req.params
    if (!isUUID(farmId) || !isUUID(cameraId)) {
        return res.status(400).json({ success: false, message: 'Invalid UUID' })
    }
    try {
        const { rows } = await db.query(
            `SELECT brand, ip_address, rtsp_port, username, password_encrypted, channel_no
             FROM cctv_cameras WHERE id = $1 AND farm_id = $2`,
            [cameraId, farmId]
        )
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบกล้อง' })
        const c = rows[0]
        const urls = buildRtspUrls({
            brand: c.brand,
            username: c.username,
            password: decryptSecret(c.password_encrypted),
            ip: c.ip_address,
            port: c.rtsp_port,
            channel: c.channel_no,
            includeCredentials: true
        })
        res.set('Cache-Control', 'no-store')
        return res.json({ success: true, main_stream_url: urls.mainStreamUrl, sub_stream_url: urls.subStreamUrl })
    } catch (err) {
        if (err instanceof CameraSecretError) return res.status(503).json({ success: false, message: err.message })
        console.error('[CCTV Router] stream-url error:', err.message)
        return res.status(500).json({ success: false, message: 'Database error fetching camera' })
    }
})

// -----------------------------------------------------------------
// 3. DELETE /api/Admin/farms/:farmId/cameras/:cameraId
// Delete/unbind a camera (ACID Transaction)
// -----------------------------------------------------------------
router.delete('/:cameraId', adminOnly, async (req, res) => {
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
router.get('/telemetry', adminOnly, async (req, res) => {
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
router.post('/telemetry', adminOrInternal, async (req, res) => {
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
router.get('/alerts', adminOnly, async (req, res) => {
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
router.post('/alerts', adminOrInternal, async (req, res) => {
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
router.patch('/alerts/:alertId/resolve', adminOnly, async (req, res) => {
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
router.post(['/alerts/:alertId/feedback', '/behavior-alerts/:alertId/feedback'], adminOnly, async (req, res) => {
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
