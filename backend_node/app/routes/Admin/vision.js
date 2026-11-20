/**
 * GET /api/Admin/vision/model  (admin)
 * ข้อมูลสำหรับรัน YOLO ในเบราว์เซอร์ (หน้า simulation ตรวจจับจากวิดีโอ): ลิงก์ชั่วคราวของไฟล์โมเดล
 * + ขนาดภาพ ชื่อคลาส และค่าที่ server ใช้จริง ฝั่งเบราว์เซอร์จะได้ตรวจจับแบบเดียวกับระบบ
 * วิดีโอไม่ถูกส่งขึ้น server
 */
const express = require('express')
const router = express.Router()
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')
const { signedModelUrls } = require('../../services/modelStore')
const { CLASS_NAMES, DETECT_OPTS, RESIZE_MODE } = require('../../services/visionPostprocess')
const { IMGSZ } = require('../../services/visionService')

router.get('/model', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const model = await signedModelUrls(600)
        if (!model) return res.status(503).json({ success: false, message: 'ยังไม่ได้ตั้งค่าที่เก็บโมเดลบน server' })
        return res.json({ success: true, ...model, imgsz: IMGSZ, class_names: CLASS_NAMES, detect_opts: DETECT_OPTS, resize: RESIZE_MODE })
    } catch (err) {
        console.error('[Vision Model] error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงลิงก์โมเดลไม่สำเร็จ' })
    }
})

module.exports = router
