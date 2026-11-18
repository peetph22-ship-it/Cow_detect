/**
 * CowCare AI - Admin Alerts & LINE Notification Router
 * ระบบจัดการประวัติแจ้งเตือนดัชนีความร้อน และการเชื่อมต่อ LINE Messaging API
 */

const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')
const { sendLineAlert, getAlertLogs, getFarmsAlertSummary } = require('../../services/lineAlertService')
const { loadFarmEvents, lastReadingAt, connectionStatus } = require('../../services/heatEvents')

// Helper function to check valid UUID
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// -----------------------------------------------------------------
// 1. GET: /api/Admin/alerts/farms-summary
// ดึงข้อมูลสรุปสถานะการแจ้งเตือนแยกตามรายฟาร์ม (สำหรับหน้ารวมฟาร์ม)
// -----------------------------------------------------------------
router.get('/farms-summary', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const farms = await getFarmsAlertSummary()
        const totalFarms = farms.length
        const criticalFarms = farms.filter(f => f.alert_status === 'critical').length
        const moderateFarms = farms.filter(f => f.alert_status === 'moderate').length
        const mildFarms = farms.filter(f => f.alert_status === 'mild').length
        const normalFarms = farms.filter(f => f.alert_status === 'normal').length
        const offlineFarms = farms.filter(f => f.alert_status === 'offline').length
        const warningFarms = moderateFarms + mildFarms

        // สรุปประวัติแจ้งเตือนสะสมในระบบ
        const totalAlertsCount = farms.reduce((sum, f) => sum + (f.total_alerts || 0), 0)
        const criticalAlertsCount = farms.reduce((sum, f) => sum + (f.critical_alerts || 0), 0)
        const moderateAlertsCount = farms.reduce((sum, f) => sum + (f.moderate_alerts || 0), 0)
        const mildAlertsCount = farms.reduce((sum, f) => sum + (f.mild_alerts || 0), 0)
        const farmsWithAlertsCount = farms.filter(f => (f.total_alerts || 0) > 0).length

        res.json({
            success: true,
            total_farms: totalFarms,
            stats: {
                critical: criticalFarms,
                moderate: moderateFarms,
                mild: mildFarms,
                warning: warningFarms,
                normal: normalFarms,
                offline: offlineFarms,
                total_alerts_count: totalAlertsCount,
                critical_alerts_count: criticalAlertsCount,
                moderate_alerts_count: moderateAlertsCount,
                mild_alerts_count: mildAlertsCount,
                farms_with_alerts: farmsWithAlertsCount
            },
            farms
        })
    } catch (err) {
        console.error('[Admin Alerts Farms Summary Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลสรุปฟาร์มได้: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 2. GET: /api/Admin/alerts
// ดึงประวัติการแจ้งเตือนทั้งหมด (รองรับ ?farm_id=...)
// -----------------------------------------------------------------
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 50
        const farmId = req.query.farm_id || null
        const alerts = await getAlertLogs(limit, farmId)

        const totalAlerts = alerts.length
        // level กำหนดตามเกณฑ์ของแต่ละฟาร์มใน lineAlertService แล้ว
        const criticalCount = alerts.filter(a => a.level === 'critical').length
        const warningCount = alerts.filter(a => a.level === 'warning' || a.level === 'moderate').length

        res.json({
            success: true,
            total: totalAlerts,
            stats: {
                critical: criticalCount,
                warning: warningCount,
                normal: 0
            },
            alerts,
            connection: connectionStatus(lastDataAt),
            offline_events: offlineEvents
        })
    } catch (err) {
        console.error('[Admin Alerts List Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลแจ้งเตือนได้: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 3. GET: /api/Admin/alerts/farm/:farmId (และ /:farmId)
// ดึงประวัติการแจ้งเตือนเฉพาะฟาร์มนั้นๆ
// -----------------------------------------------------------------
router.get(['/farm/:farmId', '/:farmId'], verifyToken, requireRole('admin'), async (req, res, next) => {
    const farmId = req.params.farmId
    if (farmId === 'farms-summary' || farmId === 'send-test') {
        return next()
    }

    try {
        const limit = parseInt(req.query.limit, 10) || 100

        // 1. ดึงข้อมูลฟาร์ม
        const farmRes = await db.query(`
            SELECT 
                f.id_farms,
                f.name_farms,
                f.province,
                f.district,
                COALESCE(f.barn_unit, 'โรงเรือนหลัก (Unit 1)') AS barn_unit,
                u.name_users AS farmer_name,
                u.phone AS farmer_phone,
                d.name_devices,
                d.serial_no AS device_serial,
                d.status AS device_status,
                d.last_seen_at
            FROM tb_farms f
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            LEFT JOIN LATERAL (
                SELECT * FROM tb_devices WHERE id_farms = f.id_farms ORDER BY last_seen_at DESC NULLS LAST LIMIT 1
            ) d ON true
            WHERE f.id_farms = $1
        `, [farmId])

        if (farmRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลฟาร์ม' })
        }

        const farm = farmRes.rows[0]

        // 2. ดึงประวัติแจ้งเตือนเฉพาะฟาร์มนี้ + สถานะการส่งข้อมูลและช่วงขาดการติดต่อ 7 วัน
        const [alerts, events, lastDataAt] = await Promise.all([
            getAlertLogs(limit, farmId),
            loadFarmEvents({ id_farms: farmId, hf_profile: null }, 7),
            lastReadingAt(farmId)
        ])
        const offlineEvents = events.filter(e => e.type === 'sensor_offline')

        const totalAlerts = alerts.length
        const criticalCount = alerts.filter(a => a.level === 'critical').length
        const moderateCount = alerts.filter(a => a.level === 'moderate').length
        const warningCount = alerts.filter(a => a.level === 'warning').length

        res.json({
            success: true,
            farm,
            total: totalAlerts,
            stats: {
                critical: criticalCount,
                moderate: moderateCount,
                warning: warningCount
            },
            alerts
        })
    } catch (err) {
        console.error('[Admin Farm Alerts Detail Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลแจ้งเตือนของฟาร์มได้: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 2. POST: /api/Admin/alerts/send-test
// ส่งการแจ้งเตือนทดสอบผ่าน LINE Messaging API
// -----------------------------------------------------------------
router.post('/send-test', verifyToken, requireRole('admin'), async (req, res) => {
    // ปิดไว้จนกว่าจะทำ LINE รายฟาร์ม: sendLineAlert เดิม broadcast ถึงผู้ติดตามทุกคนเมื่อไม่มี LINE_USER_ID
    // และส่งค่าตัวอย่าง (THI 84.5 วิกฤต) ที่ไม่ใช่ข้อมูลจริงของฟาร์ม
    if (String(process.env.LINE_TEST_SEND_ENABLED || '').toLowerCase() !== 'true') {
        return res.status(403).json({ success: false, message: 'การส่ง LINE ยังไม่เปิดใช้ (อยู่ในแผนงาน) หน้านี้แสดงตัวอย่างข้อความเท่านั้น' })
    }
    try {
        const { farm_id, farm_name, barn_unit, thi, temp, hum, advice, level } = req.body

        const alertResult = await sendLineAlert({
            farmId: farm_id || 'test-farm-01',
            farmName: farm_name || 'ฟาร์มตัวอย่าง สหกรณ์โคนมมวกเหล็ก',
            barnUnit: barn_unit || 'โรงเรือน 1',
            thi: thi || 84.5,
            temp: temp || 33.2,
            hum: hum || 78.0,
            advice: advice || 'เปิดพัดลมระบายอากาศทันที งดพ่นหมอกเนื่องจากความชื้นสูงเกิน 75%',
            level: level || 'critical'
        })

        res.json({
            success: true,
            message: 'ส่งการแจ้งเตือนทดสอบสำเร็จ',
            data: alertResult
        })
    } catch (err) {
        console.error('[Admin Send Test Alert Error]:', err.message)
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งแจ้งเตือน: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 3. POST: /api/Admin/alerts/resolve/:id
// ยืนยันการดำเนินการแก้ไข (Action Taken) — ยังไม่มีตารางบันทึกจริง จึงตอบ 501
// -----------------------------------------------------------------
router.post('/resolve/:id', verifyToken, requireRole('admin'), async (req, res) => {
    return res.status(501).json({ success: false, message: 'ยังไม่รองรับการบันทึกการดำเนินการ' })
})

module.exports = router
