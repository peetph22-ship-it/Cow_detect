/**
 * CowCare AI - API สำหรับหน้าเกษตรกร
 *
 * ทุก route: ข้อมูลเฉพาะฟาร์มของผู้ที่ login (เจ้าของฟาร์ม tb_farms.id_users หรือสมาชิก tb_farm_members)
 *   ?farm_id=<uuid>  เลือกฟาร์ม (กรณีมีหลายฟาร์ม) admin ใช้ดูตัวอย่างหน้าเกษตรกรของฟาร์มใดก็ได้
 *
 * GET /api/farmer/me       ตอนนี้ + 24 ชม. + พยากรณ์ 3 วัน + กล้อง
 * GET /api/farmer/history  สรุปรายวัน 7 วัน (ตามวันเวลาไทย)
 * GET /api/farmer/events   ช่วงที่ร้อนเกินเกณฑ์ และช่วงที่กล่องเซ็นเซอร์ขาดการติดต่อ 7 วัน
 *
 * ส่งเฉพาะสิ่งที่เกษตรกรใช้: สภาพตอนนี้, สรุป 24 ชม., พยากรณ์ 3 วัน, ผลกล้องล่าสุด
 * ไม่ส่งข้อมูลส่วนตัวของผู้อื่น (เบอร์โทร, อีเมล) และไม่ส่งข้อมูลอุปกรณ์/รหัสกล้อง
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')
const { verifyToken } = require('../middleware/authMiddleware')
const { calcThi, thiSql, getRiskLevel, getFarmProfile, getThresholds } = require('../services/heatStress')
const { getFarm24h } = require('../services/farmHistory')
const { generateBaselineForecast } = require('../services/forecastService')
const { getCameraBehavior } = require('../services/cameraBehavior')
const { summarizeHealth } = require('../services/deviceHealth')

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

// เฉพาะเกษตรกร (และ admin ที่ดูตัวอย่าง) แล้วเลือกฟาร์มที่ผู้ใช้มีสิทธิ์เท่านั้น
const requireFarm = async (req, res, next) => {
    if (!['farmer', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ success: false, message: 'หน้านี้สำหรับเกษตรกร' })
    }
    try {
        const farms = await farmsOfUser(req.user)
        if (farms.length === 0) {
            return res.json({ success: true, farm: null, farms: [], message: 'บัญชีนี้ยังไม่ได้ผูกกับฟาร์ม กรุณาติดต่อเจ้าหน้าที่' })
        }
        const wanted = isUUID(req.query.farm_id) ? String(req.query.farm_id) : null
        req.farms = farms
        req.farm = (wanted && farms.find(f => f.id_farms === wanted)) || farms[0]
        req.profile = getFarmProfile(req.farm)
        req.thresholds = getThresholds(req.profile)
        next()
    } catch (err) {
        console.error('[Farmer API] farm lookup error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงข้อมูลฟาร์มไม่สำเร็จ' })
    }
}

const BUCKET_MIN = 5
// ค่าเฉลี่ยทุก 5 นาทีย้อนหลัง N วัน (วันตามเวลาไทย) ใช้ร่วมกันระหว่าง history และ events
const loadBuckets = async (farmId, days) => {
    const { rows } = await db.query(`
        SELECT to_timestamp(floor(extract(epoch FROM sr.recorded_at) / ${BUCKET_MIN * 60}) * ${BUCKET_MIN * 60}) AS t,
               AVG(sr.temperature_c) AS temp, AVG(${thiSql('sr')}) AS thi
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
          AND sr.temperature_c IS NOT NULL AND sr.humidity_pct IS NOT NULL
          AND sr.recorded_at >= (((NOW() AT TIME ZONE 'Asia/Bangkok')::date - $2::int)::timestamp AT TIME ZONE 'Asia/Bangkok')
        GROUP BY 1 ORDER BY 1
    `, [farmId, days - 1])
    return rows.map(r => ({ t: new Date(r.t), temp: Number(r.temp), thi: Number(r.thi) }))
}

const bkkDate = (d) => new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)
const bkkHour = (d) => new Date(d.getTime() + 7 * 3600 * 1000).getUTCHours()
const round1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10)

router.get('/me', verifyToken, requireFarm, async (req, res) => {
    try {
        const { farms, farm, profile, thresholds } = req

        const [latestRes, h24, forecast, camera, devRes] = await Promise.all([
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
            getCameraBehavior(farm.id_farms).catch(() => null),
            db.query(`
                SELECT d.last_seen_at, to_jsonb(d)->>'last_heartbeat_at' AS last_heartbeat_at, to_jsonb(d)->'health' AS health
                FROM tb_devices d WHERE d.id_farms = $1
                ORDER BY d.last_seen_at DESC NULLS LAST LIMIT 1
            `, [farm.id_farms]).catch(() => ({ rows: [] }))
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

        const dv = devRes.rows[0]
        const health = dv ? summarizeHealth({ ...dv, last_reading_at: r?.recorded_at || null }) : null

        const d = h24.daily_summary
        return res.json({
            success: true,
            farms: farms.map(f => ({ id: f.id_farms, name: f.name_farms })),
            farm: {
                id: farm.id_farms,
                name: farm.name_farms,
                barn_unit: farm.barn_unit || null,
                province: farm.province || null,
                vet_phone: farm.vet_phone || null,
                profile
            },
            thresholds,
            now,
            // สถานะกล่อง: ใช้บอกเกษตรกรว่าควรตรวจอะไร (ไม่ส่งรายละเอียดทางเทคนิค)
            device: health ? { status: health.status, message: health.message, signal: health.signal } : null,
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

// สรุปรายวัน 7 วัน: ชั่วโมงที่เครียด/วิกฤต นับจากช่วง 5 นาทีที่ค่าเฉลี่ย THI ถึงเกณฑ์ (ไม่ขึ้นกับความถี่การส่ง)
router.get('/history', verifyToken, requireFarm, async (req, res) => {
    try {
        const DAYS = 7
        const buckets = await loadBuckets(req.farm.id_farms, DAYS)
        const t = req.thresholds
        const byDay = new Map()
        for (const b of buckets) {
            const key = bkkDate(b.t)
            if (!byDay.has(key)) byDay.set(key, { buckets: 0, stress: 0, severe: 0, maxTemp: -Infinity, minTemp: Infinity, thiSum: 0, hourThi: new Map() })
            const d = byDay.get(key)
            d.buckets++
            d.thiSum += b.thi
            if (b.thi >= t.moderate) d.stress++
            if (b.thi >= t.severe) d.severe++
            d.maxTemp = Math.max(d.maxTemp, b.temp)
            d.minTemp = Math.min(d.minTemp, b.temp)
            const h = bkkHour(b.t)
            const hv = d.hourThi.get(h) || { sum: 0, n: 0 }
            hv.sum += b.thi; hv.n++
            d.hourThi.set(h, hv)
        }
        const todayKey = bkkDate(new Date())
        const days = []
        for (let i = DAYS - 1; i >= 0; i--) {
            const key = bkkDate(new Date(Date.now() - i * 86400000))
            const d = byDay.get(key)
            if (!d) { days.push({ date: key, is_today: key === todayKey, has_data: false }); continue }
            let peakHour = null, peakThi = -Infinity
            for (const [h, v] of d.hourThi) if (v.sum / v.n > peakThi) { peakThi = v.sum / v.n; peakHour = h }
            const avgThi = d.thiSum / d.buckets
            days.push({
                date: key,
                is_today: key === todayKey,
                has_data: true,
                stress_hours: round1(d.stress * BUCKET_MIN / 60),
                severe_hours: round1(d.severe * BUCKET_MIN / 60),
                data_hours: round1(d.buckets * BUCKET_MIN / 60),
                max_temp: round1(d.maxTemp),
                min_temp: round1(d.minTemp),
                avg_thi: round1(avgThi),
                risk_level: getRiskLevel(avgThi, req.profile),
                peak_hour: peakHour
            })
        }
        return res.json({ success: true, farm_id: req.farm.id_farms, thresholds: t, days })
    } catch (err) {
        console.error('[Farmer API] /history error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงข้อมูลย้อนหลังไม่สำเร็จ' })
    }
})

// เหตุการณ์ 7 วัน: ช่วงความร้อนระดับเครียดขึ้นไปต่อเนื่อง (ตัดที่เที่ยงคืน ให้แต่ละรายการอยู่ในวันเดียว)
// และช่วงที่ไม่มีข้อมูลเกิน 15 นาที (ใช้เกณฑ์เครียด ไม่ใช่เฝ้าระวัง เพราะโรงเรือนไทยเกินเฝ้าระวังเกือบทั้งวัน)
router.get('/events', verifyToken, requireFarm, async (req, res) => {
    try {
        const buckets = await loadBuckets(req.farm.id_farms, 7)
        const t = req.thresholds
        const STEP = BUCKET_MIN * 60000
        const GAP_MS = 15 * 60000
        const MIN_HEAT_MIN = 30  // สั้นกว่านี้ไม่นับเป็นเหตุการณ์ (กันแจ้งถี่)
        const rank = { moderate: 2, severe: 3 }
        const events = []
        let cur = null
        const closeHeat = () => {
            if (cur && (cur.end - cur.start + STEP) / 60000 >= MIN_HEAT_MIN) events.push(cur)
            cur = null
        }
        for (let i = 0; i < buckets.length; i++) {
            const b = buckets[i]
            const prev = buckets[i - 1]
            if (prev && b.t - prev.t > GAP_MS) {
                closeHeat()
                events.push({ type: 'sensor_offline', start: new Date(prev.t.getTime() + STEP), end: b.t })
            }
            if (cur && bkkDate(b.t) !== bkkDate(cur.start)) closeHeat()
            const lvl = b.thi >= t.moderate ? getRiskLevel(b.thi, req.profile) : null
            if (!lvl) { closeHeat(); continue }
            if (!cur) cur = { type: 'heat', level: lvl, start: b.t, end: b.t, peak_thi: b.thi, peak_temp: b.temp }
            cur.end = b.t
            if (rank[lvl] > rank[cur.level]) cur.level = lvl
            if (b.thi > cur.peak_thi) { cur.peak_thi = b.thi; cur.peak_temp = b.temp }
        }
        const last = buckets[buckets.length - 1]
        const lastIsRecent = last && Date.now() - last.t.getTime() < GAP_MS
        if (cur) { cur.ongoing = Boolean(lastIsRecent); closeHeat() }
        if (last && !lastIsRecent) events.push({ type: 'sensor_offline', start: new Date(last.t.getTime() + STEP), end: null, ongoing: true })

        const out = events
            .map(e => ({
                type: e.type,
                level: e.level || null,
                start: e.start,
                end: e.ongoing ? null : new Date(e.end.getTime() + (e.type === 'heat' ? STEP : 0)),
                ongoing: Boolean(e.ongoing),
                duration_min: Math.round(((e.ongoing ? Date.now() : e.end.getTime() + (e.type === 'heat' ? STEP : 0)) - e.start.getTime()) / 60000),
                peak_thi: round1(e.peak_thi ?? null),
                peak_temp: round1(e.peak_temp ?? null)
            }))
            .sort((a, b) => b.start - a.start)
            .slice(0, 40)
        return res.json({ success: true, farm_id: req.farm.id_farms, events: out })
    } catch (err) {
        console.error('[Farmer API] /events error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงประวัติแจ้งเตือนไม่สำเร็จ' })
    }
})

module.exports = router
