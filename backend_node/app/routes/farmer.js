/**
 * CowCare AI - API สำหรับหน้าเกษตรกร
 *
 * GET /api/farmer/me  ข้อมูลเฉพาะฟาร์มของผู้ที่ login (เจ้าของฟาร์ม tb_farms.id_users หรือสมาชิก tb_farm_members)
 *   ?farm_id=<uuid>  เลือกฟาร์ม (กรณีมีหลายฟาร์ม) admin ใช้ดูตัวอย่างหน้าเกษตรกรของฟาร์มใดก็ได้
 *
 * ส่งเฉพาะสิ่งที่เกษตรกรใช้: สภาพตอนนี้, สรุป 24 ชม., พยากรณ์ 3 วัน, ผลกล้องล่าสุด
 * ไม่ส่งข้อมูลส่วนตัวของผู้อื่น (เบอร์โทร, อีเมล) และไม่ส่งข้อมูลอุปกรณ์/รหัสกล้อง
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')
const { verifyToken } = require('../middleware/authMiddleware')
const { calcThi, getRiskLevel, getFarmProfile, getThresholds } = require('../services/heatStress')
const { getFarm24h } = require('../services/farmHistory')
const { generateBaselineForecast } = require('../services/forecastService')
const { getCameraBehavior } = require('../services/cameraBehavior')

const SENSOR_OFFLINE_MIN = 5  // กล่องส่งทุก 15 วินาที เงียบเกิน 5 นาที = ขาดการติดต่อ
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

const farmsOfUser = async (user) => {
    if (user.role === 'admin') {
        const { rows } = await db.query(`SELECT * FROM tb_farms ORDER BY created_at ASC`)
        return rows
    }
    const { rows } = await db.query(`
        SELECT f.* FROM tb_farms f
        WHERE f.id_users = $1
           OR EXISTS (SELECT 1 FROM tb_farm_members fm WHERE fm.id_farms = f.id_farms AND fm.id_users = $1)
        ORDER BY f.created_at ASC
    `, [user.id])
    return rows
}

router.get('/me', verifyToken, async (req, res) => {
    if (!['farmer', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ success: false, message: 'หน้านี้สำหรับเกษตรกร' })
    }
    try {
        const farms = await farmsOfUser(req.user)
        if (farms.length === 0) {
            return res.json({ success: true, farm: null, farms: [], message: 'บัญชีนี้ยังไม่ได้ผูกกับฟาร์ม กรุณาติดต่อเจ้าหน้าที่' })
        }
        const wanted = isUUID(req.query.farm_id) ? String(req.query.farm_id) : null
        const farm = (wanted && farms.find(f => f.id_farms === wanted)) || farms[0]
        const profile = getFarmProfile(farm)
        const thresholds = getThresholds(profile)

        const [latestRes, h24, forecast, camera] = await Promise.all([
            db.query(`
                SELECT sr.temperature_c, sr.humidity_pct, sr.recorded_at
                FROM tb_sensor_readings sr
                LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
                WHERE (d.id_farms = $1 OR sr.id_farms = $1)
                  AND sr.temperature_c IS NOT NULL AND sr.humidity_pct IS NOT NULL
                ORDER BY sr.recorded_at DESC
                LIMIT 1
            `, [farm.id_farms]),
            getFarm24h(farm.id_farms, profile).catch(() => ({ daily_summary: null })),
            generateBaselineForecast(farm).catch(() => null),
            getCameraBehavior(farm.id_farms).catch(() => null)
        ])

        const r = latestRes.rows[0]
        let now = null
        if (r) {
            const temperature_c = Number(r.temperature_c)
            const humidity_pct = Number(r.humidity_pct)
            const thi = calcThi(temperature_c, humidity_pct)
            const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(r.recorded_at).getTime()) / 60000))
            now = {
                temperature_c: Number(temperature_c.toFixed(1)),
                humidity_pct: Number(humidity_pct.toFixed(1)),
                thi: thi != null ? Number(thi.toFixed(1)) : null,
                risk_level: getRiskLevel(thi, profile),
                recorded_at: r.recorded_at,
                minutes_ago: minutesAgo,
                sensor_status: minutesAgo <= SENSOR_OFFLINE_MIN ? 'online' : 'offline'
            }
        }

        const d = h24.daily_summary
        return res.json({
            success: true,
            farms: farms.map(f => ({ id: f.id_farms, name: f.name_farms })),
            farm: {
                id: farm.id_farms,
                name: farm.name_farms,
                barn_unit: farm.barn_unit || null,
                province: farm.province || null,
                profile
            },
            thresholds,
            now,
            today: d ? {
                avg_thi: d.avg_thi != null ? Number(d.avg_thi) : null,
                max_temp: d.max_temp != null ? Number(d.max_temp) : null,
                min_temp: d.min_temp != null ? Number(d.min_temp) : null,
                stress_hours: d.stress_hours,
                stress_percentage: d.stress_percentage,
                window_start: d.window_start,
                window_end: d.window_end
            } : null,
            forecast: forecast ? {
                insufficient_data: Boolean(forecast.insufficient_data),
                reason: forecast.reason || null,
                days: (forecast.forecasts || []).map(f => ({
                    horizon_days: f.horizon_days,
                    label: f.label,
                    date: f.date,
                    predicted_thi: f.predicted_thi,
                    risk_level: f.risk_level,
                    advisory: f.advisory
                }))
            } : null,
            camera: camera && camera.status !== 'no_data' ? {
                status: camera.status,
                minutes_ago: camera.minutes_ago,
                total: camera.latest?.total ?? null,
                lying_pct: camera.latest?.pct?.lying ?? null,
                standing_pct: camera.latest?.pct?.standing ?? null,
                cci: camera.latest?.cci ?? null
            } : null
        })
    } catch (err) {
        console.error('[Farmer API] /me error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงข้อมูลฟาร์มไม่สำเร็จ' })
    }
})

module.exports = router
