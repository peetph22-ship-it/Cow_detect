/**
 * เลือกวัวเป้าหมายโดยคลิกกรอบในภาพ (admin)
 *
 * GET  /api/Admin/farms/:farmId/cow-target              สถานะการติดตาม + ภาพล่าสุดพร้อมกรอบ
 * GET  /api/Admin/farms/:farmId/cow-target/images?date= ภาพตัวอย่างรายชั่วโมงของวันนั้น (เลือกจากภาพย้อนหลัง)
 * POST /api/Admin/farms/:farmId/cow-target              { source: 'latest' | <sample path>, captured_at, box_index, tag_id, name? }
 * POST /api/Admin/farms/:farmId/cow-target/stop         เลิกติดตาม
 *
 * กรอบที่ใช้เริ่มติดตามอ่านจากไฟล์ผลของโมเดลฝั่ง server (ไม่เชื่อพิกัดที่ client ส่งมา)
 */
const express = require('express')
const router = express.Router({ mergeParams: true })
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')
const { getLatestImage, listDaySamples, readLatestResult, readSampleResult } = require('../../services/cameraSamples')
const { selectTarget, stopTarget, getLatestTarget } = require('../../services/cowTargetTracker')

const adminOnly = [verifyToken, requireRole('admin')]
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// ตรวจ id ฟาร์มและว่ามีฟาร์มจริง
const farmGuard = async (req, res, next) => {
    const { farmId } = req.params
    if (!isUUID(farmId)) return res.status(400).json({ success: false, message: 'id ฟาร์มไม่ถูกต้อง' })
    try {
        const { rows } = await db.query(`SELECT id_farms FROM tb_farms WHERE id_farms = $1 AND deleted_at IS NULL LIMIT 1`, [farmId])
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลฟาร์ม' })
        return next()
    } catch (err) {
        console.error('[Cow Target] farm lookup failed:', err.message)
        return res.status(500).json({ success: false, message: 'ตรวจสอบฟาร์มไม่สำเร็จ' })
    }
}

router.get('/', adminOnly, farmGuard, async (req, res) => {
    try {
        const [tracking, latest] = await Promise.all([getLatestTarget(req.params.farmId), getLatestImage(req.params.farmId)])
        // วัวเป้าหมายในภาพล่าสุด (ไว้ไฮไลต์บนจอภาพล่าสุด): ผลติดตามของภาพเวลาเดียวกัน
        let target_in_latest = null
        if (tracking?.target?.cow?.id && latest?.captured_at) {
            try {
                const { rows } = await db.query(
                    `SELECT behavior, box_x1, box_y1, box_x2, box_y2, match_score FROM tb_cow_behavior_observations
                     WHERE id_cows = $1 AND observed_at = $2 LIMIT 1`, [tracking.target.cow.id, latest.captured_at])
                const r = rows[0]
                if (r) {
                    target_in_latest = {
                        behavior: r.behavior,
                        match_score: r.match_score == null ? null : Number(r.match_score),
                        box: r.box_x1 == null ? null : { x1: Number(r.box_x1), y1: Number(r.box_y1), x2: Number(r.box_x2), y2: Number(r.box_y2) }
                    }
                }
            } catch (e) {
                console.warn('[Cow Target] target in latest image:', e.message)
            }
        }
        return res.json({ success: true, ...tracking, latest, target_in_latest })
    } catch (err) {
        console.error('[Cow Target] GET error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงสถานะการติดตามวัวไม่สำเร็จ' })
    }
})

router.get('/images', adminOnly, farmGuard, async (req, res) => {
    const { date } = req.query
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return res.status(400).json({ success: false, message: 'วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD' })
    try {
        return res.json({ success: true, date, images: await listDaySamples(req.params.farmId, date) })
    } catch (err) {
        console.error('[Cow Target] images error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงภาพย้อนหลังไม่สำเร็จ' })
    }
})

// ผลของโมเดลของภาพเดียวจาก telemetry (กรอบเรียงลำดับเดียวกับ latest.json ของภาพนั้น)
// รับเฉพาะภาพของฟาร์มนี้ไม่เกิน 1 ชม. ที่แล้ว
const readFrameResult = async (farmId, capturedAt) => {
    const t = new Date(capturedAt)
    if (!Number.isFinite(t.getTime()) || Date.now() - t.getTime() > 3600e3) return null
    try {
        const { rows } = await db.query(
            `SELECT timestamp, detections->'boxes' AS boxes FROM cctv_behavior_telemetry
             WHERE farm_id = $1 AND is_simulation = false AND timestamp = $2 AND detections IS NOT NULL
             ORDER BY id DESC LIMIT 1`, [farmId, t.toISOString()])
        const r = rows[0]
        if (!r || !Array.isArray(r.boxes)) return null
        return { captured_at: new Date(r.timestamp).toISOString(), boxes: r.boxes }
    } catch (err) {
        console.warn('[Cow Target] frame lookup failed:', err.message)
        return null
    }
}

router.post('/', adminOnly, farmGuard, async (req, res) => {
    const { farmId } = req.params
    const { source, captured_at: capturedAt, box_index: boxIndex } = req.body || {}
    const tagId = String(req.body?.tag_id || '').trim()
    const name = String(req.body?.name || '').trim()
    if (!tagId || tagId.length > 50) return res.status(400).json({ success: false, message: 'กรุณากรอกหมายเลขหู (ไม่เกิน 50 ตัวอักษร)' })
    if (name.length > 100) return res.status(400).json({ success: false, message: 'ชื่อวัวยาวเกิน 100 ตัวอักษร' })
    if (!Number.isInteger(boxIndex) || boxIndex < 0) return res.status(400).json({ success: false, message: 'กรุณาคลิกเลือกวัวในภาพ' })

    // ภาพย้อนหลังต้องเป็นของฟาร์มนี้เท่านั้น
    const isSample = typeof source === 'string' && source.startsWith(`${farmId}/`) && /^[^/]+\/\d{4}-\d{2}-\d{2}\/\d{2}\.jpg$/.test(source)
    if (source !== 'latest' && !isSample) return res.status(400).json({ success: false, message: 'ภาพที่เลือกไม่ถูกต้อง' })

    try {
        let meta = source === 'latest' ? await readLatestResult(farmId) : await readSampleResult(source)
        if (!meta) return res.status(404).json({ success: false, message: 'ไม่พบภาพหรือผลของโมเดลของภาพนี้' })
        // ภาพล่าสุดถูกเขียนทับทุกรอบถ่ายภาพ (ทุก 15 วิ ภาพมักเปลี่ยนก่อนผู้ใช้กดเลือกเสร็จ)
        // ใช้กรอบของภาพที่ผู้ใช้เห็นจริงจาก telemetry (กรอบลำดับเดียวกับภาพล่าสุดตอนนั้น) แทนการให้เลือกใหม่
        if (capturedAt && meta.captured_at !== capturedAt) {
            meta = source === 'latest' ? await readFrameResult(farmId, capturedAt) : null
            if (!meta) {
                return res.status(409).json({ success: false, message: 'ไม่พบผลของภาพที่เลือก (ภาพเก่าเกินไปหรือยังประมวลผลไม่เสร็จ) กรุณาโหลดภาพใหม่แล้วเลือกอีกครั้ง' })
            }
        }
        const box = meta.boxes?.[boxIndex]
        if (!box) return res.status(400).json({ success: false, message: 'ไม่พบกรอบวัวที่เลือกในภาพนี้' })

        const result = await selectTarget(farmId, {
            seedAt: meta.captured_at,
            box: { x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2 },
            source,
            tagId,
            name,
            createdBy: req.user?.id ? String(req.user.id) : null
        })
        return res.json({ success: true, ...result })
    } catch (err) {
        if (err.status === 409) return res.status(409).json({ success: false, message: err.message })
        console.error('[Cow Target] select error:', err.message)
        return res.status(500).json({ success: false, message: 'บันทึกการเลือกวัวไม่สำเร็จ' })
    }
})

router.post('/stop', adminOnly, farmGuard, async (req, res) => {
    try {
        return res.json({ success: true, stopped: await stopTarget(req.params.farmId) })
    } catch (err) {
        console.error('[Cow Target] stop error:', err.message)
        return res.status(500).json({ success: false, message: 'เลิกติดตามไม่สำเร็จ' })
    }
})

module.exports = router
