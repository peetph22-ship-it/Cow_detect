/**
 * CowCare AI - System Accuracy Benchmarks & Multimodal Verification Router
 * Calibrated against Argon Simulation Model and Empirical Thai Literature
 */

const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { evaluateMultimodalStatus } = require('../../services/multimodalValidationService')
const { PROFILES, PROFILE_LABELS } = require('../../services/heatStress')
const { FORECAST_VERSION } = require('../../services/forecastService')

// Helper function to check valid UUID
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// -----------------------------------------------------------------
// 1. GET /api/system/accuracy-benchmarks
// ดึงตารางเกณฑ์ความแม่นยำระบบ (Scorecard สำหรับ Argon Simulation & Literature Benchmarks)
// -----------------------------------------------------------------
// ตัวเลขความแม่นยำเดิม (Argon benchmark) ไม่มีการวัดรองรับ จึงถูกลบออก
// รายงานเฉพาะสิ่งที่ตรวจสอบได้: วิธีที่ใช้ เกณฑ์ และสถานะการทดสอบ
router.get('/accuracy-benchmarks', (req, res) => {
    return res.json({
        success: true,
        benchmarks: {
            validation_status: 'not_field_validated',
            validation_note_th: 'ต้นแบบ อยู่ระหว่างทดสอบภาคสนาม ยังไม่มีตัวเลขความแม่นยำจากข้อมูลจริง',
            thi_formula: 'NRC (1971): THI = (1.8T + 32) - (0.55 - 0.0055RH)(1.8T - 26)',
            thresholds: Object.fromEntries(Object.entries(PROFILES).map(([k, v]) => [k, { ...v, label_th: PROFILE_LABELS[k] }])),
            forecast: {
                version: FORECAST_VERSION,
                method_th: 'ค่าเฉลี่ย THI 72 ชั่วโมงล่าสุด',
                lstm_enabled: String(process.env.ENABLE_LSTM || '').toLowerCase() === 'true'
            },
            computer_vision: {
                model: 'YOLO26m fine-tuned (backend/app/weights/best1.pt)',
                classes: ['drinking', 'feeding', 'lying down', 'standing'],
                dataset: 'Roboflow cow-behavior-analysiws v2 (CC BY 4.0) ไม่ใช่ภาพจากโรงเรือนไทย',
                metrics: null
            }
        }
    })
})

// -----------------------------------------------------------------
// 2. GET /api/system/farms/:farmId/multimodal-status
// ตรวจสอบสถานะการเชื่อมโยงสองระบบ (IoT Sensor + CCTV Behavior Cross-Validation Gate)
// -----------------------------------------------------------------
router.get('/farms/:farmId/multimodal-status', async (req, res) => {
    const { farmId } = req.params
    if (!isUUID(farmId)) {
        return res.status(400).json({ success: false, message: 'Invalid Farm UUID' })
    }

    try {
        const statusResult = await evaluateMultimodalStatus(farmId)
        return res.json({
            success: true,
            multimodal_status: statusResult
        })
    } catch (err) {
        console.error('[System Router] Multimodal Status Error:', err)
        return res.status(500).json({ success: false, message: 'Error evaluating multimodal status: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 3. POST /api/alerts/:alertId/feedback
// Human-in-the-Loop Feedback (ปุ่มยืนยันความแม่นยำ/แจ้งเตือนหลอก จากหน้าเว็บ/LINE)
// -----------------------------------------------------------------
router.post(['/alerts/:alertId/feedback', '/:alertId/feedback'], async (req, res) => {
    const { alertId } = req.params
    if (!isUUID(alertId)) {
        return res.status(400).json({ success: false, message: 'Invalid Alert UUID' })
    }

    const { is_accurate, feedback_note = null } = req.body
    if (typeof is_accurate !== 'boolean') {
        return res.status(400).json({ success: false, message: 'is_accurate (boolean) is required' })
    }

    try {
        const { rows } = await db.query(
            `UPDATE animal_behavior_alerts
             SET is_accurate = $1, feedback_note = $2, feedback_at = NOW()
             WHERE id = $3
             RETURNING id, farm_id, is_accurate, feedback_note, feedback_at`,
            [is_accurate, feedback_note, alertId]
        )
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการแจ้งเตือน' })
        }
        return res.json({
            success: true,
            message: is_accurate ? 'ยืนยันความแม่นยำการแจ้งเตือนสำเร็จ (True Positive)' : 'บันทึกการแจ้งเตือนคลาดเคลื่อนสำเร็จ (False Positive)',
            feedback: rows[0]
        })
    } catch (err) {
        console.error('[System Router] Alert Feedback Error:', err)
        return res.status(500).json({ success: false, message: 'Database error recording alert feedback' })
    }
})

module.exports = router
