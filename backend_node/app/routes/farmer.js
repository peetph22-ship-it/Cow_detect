/**
 * CowCare AI - API สำหรับหน้าเกษตรกร (Enhanced Senior-Friendly & Minimal Edition)
 *
 * ทุก route: ข้อมูลเฉพาะฟาร์มของผู้ที่ login (เจ้าของฟาร์ม tb_farms.id_users หรือสมาชิก tb_farm_members)
 *   ?farm_id=<uuid>  เลือกฟาร์ม (กรณีมีหลายฟาร์ม) admin ใช้ดูตัวอย่างหน้าเกษตรกรของฟาร์มใดก็ได้
 *
 * GET  /api/farmer/me             สภาพอากาศตอนนี้ + คำแนะนำสำหรับผู้สูงอายุ + 24 ชม. + พยากรณ์
 * GET  /api/farmer/actions        เช็คลิสต์สิ่งที่ต้องทำประจำวันของฟาร์ม
 * POST /api/farmer/actions/toggle ติ๊กทำแล้ว/ยกเลิก สิ่งที่ต้องทำ
 * GET  /api/farmer/history        สรุปรายวัน 7 วัน พร้อมคำอธิบายภาษาชาวบ้านเข้าใจง่าย
 * GET  /api/farmer/events         ประวัติเหตุการณ์เตือนความร้อน 7 วัน
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')
const { verifyToken } = require('../middleware/authMiddleware')
const { calcThi, getRiskLevel, getFarmProfile, getThresholds, getMethod, getCoolingAdvice } = require('../services/heatStress')
const { loadBuckets: loadBucketRange, dailySeries, stressStreak, bkkDate, round1 } = require('../services/heatMetrics')
const { getFarm24h } = require('../services/farmHistory')
const { generateBaselineForecast } = require('../services/forecastService')
const { getCameraBehavior } = require('../services/cameraBehavior')
const { summarizeHealth } = require('../services/deviceHealth')

const SENSOR_OFFLINE_MIN = 5  // กล่องส่งทุก 15 วินาที เงียบเกิน 5 นาที = ขาดการติดต่อ
const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

// สำรองในหน่วยความจำ เมื่อยังไม่ได้รัน migrations/20261027_farmer_senior_portal.sql
// (ไม่สร้างตารางเองตอนเปิดเซิร์ฟเวอร์: ตารางต้องมาจาก migration ที่เจ้าของโปรเจกต์รันเท่านั้น)
const inMemoryActions = new Map() // key: `${farmId}_${date}_${actionKey}` -> boolean

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
// ค่าเฉลี่ยทุก 5 นาที ตั้งแต่เที่ยงคืน (เวลาไทย) ของ N-1 วันก่อน ถึงตอนนี้
const loadBuckets = (farmId, days) => {
    const firstKey = bkkDate(new Date(Date.now() - (days - 1) * 86400e3))
    return loadBucketRange(farmId, new Date(`${firstKey}T00:00:00+07:00`), new Date(Date.now() + 60e3))
}

/**
 * ผู้ช่วยสร้างข้อความสรุปมินิมอลสำหรับผู้สูงอายุ (คนแก่อ่านเข้าใจทันที ไม่ศัพท์เทคนิค)
 */
function buildSeniorSummary(now, today, forecast, farm) {
    const risk = now?.risk_level || today?.daily_mean_level || 'normal'
    let level = 'good'
    let title = 'อากาศสบายดี แม่วัวไม่เครียด'
    let message = 'สภาพอากาศในคอกเหมาะสมดี แม่วัวเคี้ยวเอื้องสบาย ให้น้ำนมได้ดี'
    let color = '#2D6A4F'
    let bg = '#E8F5E9'
    let icon = 'mdi-emoticon-happy-outline'

    if (risk === 'severe') {
        level = 'danger'
        title = 'อากาศร้อนจัดมาก แม่วัวกำลังเครียด!'
        message = 'อุณหภูมิและความชื้นสูงมาก เสี่ยงน้ำนมตกฮวบ รีบเปิดพัดลมและสเปรย์น้ำด่วน'
        color = '#DC2626'
        bg = '#FEE2E2'
        icon = 'mdi-alert-octagon-outline'
    } else if (risk === 'moderate' || risk === 'mild') {
        level = 'warning'
        title = 'อากาศเริ่มร้อนขึ้นแล้ว ระวังแม่วัวหอบ'
        message = 'ความร้อนสะสมเริ่มเพิ่มขึ้น แนะนำเปิดพัดลมระบายอากาศ และเตรียมน้ำสะอาดให้พร้อม'
        color = '#D97706'
        bg = '#FEF3C7'
        icon = 'mdi-weather-sunny-alert'
    }

    const temp = now ? Number(now.temperature_c).toFixed(1) : (today?.max_temp ? Number(today.max_temp).toFixed(1) : '31.0')
    const hum = now ? Math.round(now.humidity_pct) : (today?.avg_humidity_pct ? Math.round(today.avg_humidity_pct) : 70)
    
    // ข้อความสำหรับ Speech Synthesis อ่านออกเสียงภาษาไทย
    const voiceText = `สวัสดีจ้า ตอนนี้ในคอกวัว อุณหภูมิ ${temp} องศาเซลเซียส ความชื้น ${hum} เปอร์เซ็นต์ ${title} ${message} อย่าลืมตรวจดูน้ำดื่มให้แม่วัวนะจ๊ะ`

    // พยากรณ์ช่วงบ่าย/พรุ่งนี้ ภาษาชาวบ้าน
    let forecastSimple = 'สภาพอากาศพรุ่งนี้ใกล้เคียงกับวันนี้ เตรียมน้ำสะอาดให้พร้อม'
    // forecast = ผลจาก forecastService (รายการวันอยู่ใน forecasts, peak_window เป็นออบเจกต์ที่มี label)
    const nextDay = forecast?.forecasts?.[0]
    if (nextDay) {
        if (nextDay.risk_level === 'severe') {
            forecastSimple = 'พรุ่งนี้ช่วงบ่ายจะร้อนจัดมาก ควรตรวจระบบพัดลมและน้ำสำรองล่วงหน้า'
        } else if (nextDay.risk_level === 'moderate') {
            forecastSimple = 'พรุ่งนี้ช่วงบ่ายจะเริ่มร้อน มีช่วงที่วัวอาจอึดอัด ควรเตรียมเปิดพัดลม'
        } else {
            forecastSimple = 'พรุ่งนี้อากาศสบายดี ลมพัดถ่ายเทสะดวก'
        }
        if (forecast?.peak_window?.label && ['moderate', 'severe'].includes(nextDay.risk_level)) {
            forecastSimple += ` ช่วงร้อนที่สุดประมาณ ${forecast.peak_window.label}`
        }
    }

    // สิ่งที่ควรทำ 4 ข้อใหญ่
    const actionTemplates = [
        {
            id: 'fan',
            title: 'เปิดพัดลมในคอก',
            desc: 'ช่วยระบายอากาศร้อน ไม่ให้อากาศอับ',
            icon: 'mdi-fan',
            recommended: risk !== 'normal'
        },
        {
            id: 'water_spray',
            title: 'เปิดละอองน้ำ / สปริงเกลอร์',
            desc: 'พ่นละอองน้ำเป็นรอบๆ ช่วยลดอุณหภูมิร่างกายวัว',
            icon: 'mdi-sprinkler-variant',
            recommended: risk === 'severe' || risk === 'moderate'
        },
        {
            id: 'fresh_water',
            title: 'เติมน้ำสะอาดให้เต็มราง',
            desc: 'แม่วัวกินน้ำเยอะขึ้นเมื่ออากาศร้อน ดื่มน้ำลดเครียด',
            icon: 'mdi-cup-water',
            recommended: true
        },
        {
            id: 'check_cow',
            title: 'สังเกตอาการแม่วัว (ไม่หอบ)',
            desc: 'สังเกตว่ามีตัวไหนยืนหอบ อ้าปาก หรือน้ำลายยืดหรือไม่',
            icon: 'mdi-cow',
            recommended: true
        }
    ]

    return {
        level,
        title,
        message,
        color,
        bg,
        icon,
        voice_text: voiceText,
        forecast_simple: forecastSimple,
        action_templates: actionTemplates,
        vet_phone: farm.vet_phone || null,
        vet_name: 'สัตวแพทย์ / สหกรณ์'
    }
}

// GET /api/farmer/ping : ทดสอบการเชื่อมต่อ API (สาธารณะ ไม่ต้องใช้ token)
router.get('/ping', (req, res) => {
    return res.json({
        success: true,
        message: 'CowCare AI Farmer API is ready',
        timestamp: new Date().toISOString(),
        version: '3.1.0-senior'
    })
})

// (ลบ POST /friend-bridge/test: ให้เซิร์ฟเวอร์ไปเปิด URL ใดก็ได้โดยไม่ต้อง login = SSRF
//  หน้าเว็บทดสอบหลังบ้านเพื่อนด้วยการ ping จากเบราว์เซอร์เองอยู่แล้ว)

// GET /api/farmer/me
router.get('/me', verifyToken, requireFarm, async (req, res) => {
    try {
        const { farms, farm, profile, thresholds } = req

        const [latestRes, h24, forecast, camera, devRes, week] = await Promise.all([
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
            `, [farm.id_farms]).catch(() => ({ rows: [] })),
            dailySeries(farm.id_farms, profile, 14).catch(() => [])
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

        // สรุปมินิมอลสำหรับผู้สูงอายุ
        const seniorSummary = buildSeniorSummary(now, d, forecast, farm)

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
            senior: seniorSummary,
            // สถานะกล่อง: ใช้บอกเกษตรกรว่าควรตรวจอะไร (ไม่ส่งรายละเอียดทางเทคนิค)
            device: health ? { status: health.status, message: health.message, signal: health.signal } : null,
            today: d ? {
                avg_thi: d.avg_thi,
                daily_mean_level: d.daily_mean_level,
                max_temp: d.max_temp,
                min_temp: d.min_temp,
                stress_hours: d.stress_hours,
                severe_hours: d.severe_hours,
                stress_percentage: d.stress_percentage,
                data_hours: d.data_hours,
                coverage_pct: d.coverage_pct,
                night_relief_hours: d.night_relief_hours,
                night_data_hours: d.night_data_hours,
                window_start: d.window_start,
                window_end: d.window_end
            } : null,
            streak: stressStreak(week, profile),
            method: getMethod(profile),
            cooling: now ? getCoolingAdvice(now.humidity_pct) : null,
            forecast: forecast ? {
                insufficient_data: Boolean(forecast.insufficient_data),
                reason: forecast.reason || null,
                method_th: forecast.method_th || null,
                adjusted: forecast.adjusted ?? null,
                peak_window: forecast.peak_window || null,
                cool_window: forecast.cool_window || null,
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

// GET /api/farmer/actions : ดึงรายการสิ่งที่ทำแล้ววันนี้
router.get('/actions', verifyToken, requireFarm, async (req, res) => {
    try {
        const todayStr = bkkDate(new Date())
        let doneActions = []

        try {
            const { rows } = await db.query(
                `SELECT action_key, is_done FROM tb_farmer_daily_actions 
                 WHERE id_farms = $1 AND action_date = $2`,
                [req.farm.id_farms, todayStr]
            )
            doneActions = rows.filter(r => r.is_done).map(r => r.action_key)
        } catch (dbErr) {
            // fallback in-memory
            for (const [key, val] of inMemoryActions.entries()) {
                if (key.startsWith(`${req.farm.id_farms}_${todayStr}_`) && val) {
                    doneActions.push(key.split('_')[2])
                }
            }
        }

        return res.json({
            success: true,
            date: todayStr,
            done_actions: doneActions
        })
    } catch (err) {
        console.error('[Farmer API] /actions error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงรายการเช็คลิสต์ไม่สำเร็จ' })
    }
})

// POST /api/farmer/actions/toggle : ติ๊กทำแล้ว/ยกเลิก สิ่งที่ต้องทำ
router.post('/actions/toggle', verifyToken, requireFarm, async (req, res) => {
    try {
        const { action_id, is_done } = req.body
        if (!action_id) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ action_id' })
        }

        const todayStr = bkkDate(new Date())
        const targetState = is_done !== undefined ? Boolean(is_done) : true

        try {
            await db.query(
                `INSERT INTO tb_farmer_daily_actions (id_farms, action_date, action_key, is_done, updated_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (id_farms, action_date, action_key)
                 DO UPDATE SET is_done = $4, updated_at = NOW()`,
                [req.farm.id_farms, todayStr, action_id, targetState]
            )
        } catch (dbErr) {
            // fallback in-memory
            const memKey = `${req.farm.id_farms}_${todayStr}_${action_id}`
            inMemoryActions.set(memKey, targetState)
        }

        return res.json({
            success: true,
            action_id,
            is_done: targetState,
            message: targetState ? 'บันทึกเรียบร้อย' : 'ยกเลิกเครื่องหมายเรียบร้อย'
        })
    } catch (err) {
        console.error('[Farmer API] /actions/toggle error:', err.message)
        return res.status(500).json({ success: false, message: 'บันทึกสถานะไม่สำเร็จ' })
    }
})

// สรุปรายวัน 7 วัน: พร้อมคำอธิบายภาษาชาวบ้านที่ผู้สูงอายุเข้าใจง่าย
router.get('/history', verifyToken, requireFarm, async (req, res) => {
    try {
        const series = await dailySeries(req.farm.id_farms, req.profile, 7)
        const days = series.map(d => {
            if (!d.has_data) {
                return {
                    date: d.date,
                    is_today: d.is_today,
                    has_data: false,
                    senior_status: 'ไม่มีข้อมูล',
                    senior_desc: 'กล่องเซ็นเซอร์ไม่ได้เชื่อมต่อในวันนี้',
                    badge_color: '#9E9E9E'
                }
            }

            // คำอธิบายภาษาง่ายๆ ตามระดับความเครียด
            let seniorStatus = 'สบายดีตลอดวัน'
            let seniorDesc = 'อากาศในคอกร่มรื่น แม่วัวไม่เครียด กินอาหารได้ตามปกติ'
            let badgeColor = '#2D6A4F'

            if (d.severe_hours > 0) {
                seniorStatus = `ร้อนจัด ${round1(d.severe_hours)} ชั่วโมง`
                seniorDesc = `มีช่วงอากาศร้อนจัดมาก สูงสุด ${round1(d.max_temp)}°C ในช่วงบ่าย ควรเฝ้าดูปริมาณน้ำนม`
                badgeColor = '#DC2626'
            } else if (d.stress_hours > 0) {
                seniorStatus = `เริ่มร้อน ${round1(d.stress_hours)} ชั่วโมง`
                seniorDesc = `มีช่วงอุณหภูมิสูงขึ้น สูงสุด ${round1(d.max_temp)}°C แม่วัวอาจอึดอัดบ้างเล็กน้อย`
                badgeColor = '#D97706'
            }

            return {
                date: d.date,
                is_today: d.is_today,
                has_data: true,
                stress_hours: round1(d.stress_hours),
                severe_hours: round1(d.severe_hours),
                data_hours: d.data_hours,
                coverage_pct: d.coverage_pct,
                max_temp: round1(d.max_temp),
                min_temp: round1(d.min_temp),
                avg_thi: round1(d.avg_thi),
                risk_level: d.daily_mean_level,
                night_relief_hours: round1(d.night_relief_hours),
                night_data_hours: d.night_data_hours,
                peak_hour: d.peak_hour,
                senior_status: seniorStatus,
                senior_desc: seniorDesc,
                badge_color: badgeColor
            }
        })

        return res.json({
            success: true,
            farm_id: req.farm.id_farms,
            thresholds: req.thresholds,
            days,
            streak: stressStreak(series, req.profile),
            method: getMethod(req.profile)
        })
    } catch (err) {
        console.error('[Farmer API] /history error:', err.message)
        return res.status(500).json({ success: false, message: 'ดึงข้อมูลย้อนหลังไม่สำเร็จ' })
    }
})

// เหตุการณ์ 7 วัน: ช่วงความร้อนระดับเครียดขึ้นไปต่อเนื่อง
router.get('/events', verifyToken, requireFarm, async (req, res) => {
    try {
        const buckets = await loadBuckets(req.farm.id_farms, 7)
        const t = req.thresholds
        const STEP = BUCKET_MIN * 60000
        const GAP_MS = 15 * 60000
        const MIN_HEAT_MIN = 30
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
