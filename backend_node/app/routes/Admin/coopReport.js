/**
 * CowCare AI - Dairy Cooperative & ESG Digital Risk Logbook API
 * เอกสารรายงานความเสี่ยงความร้อนสำหรับสหกรณ์โคนม / ธ.ก.ส.
 *
 * รายงานนี้อาจถูกใช้ประกอบการพิจารณาสินเชื่อ จึงแสดงเฉพาะค่าที่คำนวณจากข้อมูลเซ็นเซอร์จริง
 * - ไม่มีการเติมค่าสมมติเมื่อไม่มีข้อมูล (เป็น null)
 * - ไม่ประมาณการมูลค่าความเสียหายน้ำนม (ยังไม่มีค่าสัมประสิทธิ์ที่วัดจากโคนมไทย)
 * - ไม่แสดงผลการปฏิบัติตามเกณฑ์ที่ระบบไม่ได้บันทึกจริง
 * - ไม่ให้เกรด/คะแนน และไม่อ้างว่าผ่านการรับรองจากหน่วยงานใด (เกณฑ์ภายในยังไม่ได้ตรวจสอบกับโรงเรือนไทย
 *   และเกรดต่ำอาจกระทบการพิจารณาสินเชื่อของเกษตรกรโดยไม่เป็นธรรม) แสดงเป็นตัวเลขที่วัดได้ + ความครบถ้วนของข้อมูล
 */

const express = require('express')
const router = express.Router()
const db = require('../../config/db')
const { verifyToken, requireRole } = require('../../middleware/authMiddleware')
const { getFarmProfile, getThresholds, thiSql, getMethod } = require('../../services/heatStress')
const { loadBuckets, summarizeBuckets } = require('../../services/heatMetrics')

const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim())

const REPORT_DAYS = 30
const DATA_NOTE = 'ข้อมูลจากเซ็นเซอร์ในโรงเรือนของฟาร์ม บันทึกอัตโนมัติ ยังไม่ผ่านการรับรองจากหน่วยงานภายนอก ผู้รับเอกสารควรตรวจสอบประกอบ'

const round1 = (v) => (v == null ? null : parseFloat(Number(v).toFixed(1)))

/**
 * สถิติความเสี่ยงรายชั่วโมงย้อนหลัง REPORT_DAYS วัน (THI เฉลี่ยรายชั่วโมง เวลาไทย)
 */
const computeFarmRisk = async (farm) => {
    const profile = getFarmProfile(farm)
    const thresholds = getThresholds(profile)

    // วิธีเดียวทั้งระบบ (heatMetrics): เฉลี่ย 5 นาที, กลางคืน 22:00–06:00 (เดิมนับเป็นชั่วโมงจากค่าเฉลี่ยรายชั่วโมง)
    const rangeEnd = new Date()
    const rangeStart = new Date(rangeEnd.getTime() - REPORT_DAYS * 86400000)
    const buckets = await loadBuckets(farm.id_farms, rangeStart, rangeEnd)
    const sm = summarizeBuckets(buckets, profile, REPORT_DAYS * 24)

    const { rows: latestRows } = await db.query(`
        SELECT sr.temperature_c, sr.humidity_pct, ${thiSql('sr')}::float AS thi, sr.recorded_at
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
        ORDER BY sr.recorded_at DESC
        LIMIT 1
    `, [farm.id_farms])
    const latest = latestRows[0] || null

    const r1 = (v) => (v == null ? 0 : Math.round(v * 10) / 10)
    const counts = sm.has_data ? {
        normal: r1(sm.data_hours - sm.watch_hours),
        mild: r1(sm.watch_hours - sm.stress_hours),
        moderate: r1(sm.stress_hours - sm.severe_hours),
        severe: r1(sm.severe_hours)
    } : { normal: 0, mild: 0, moderate: 0, severe: 0 }
    const hoursSampled = sm.data_hours || 0
    const avgThi = sm.avg_thi ?? null
    const nightHours = sm.night_data_hours || 0
    const nightRecoveryRate = nightHours > 0 ? Math.round((sm.night_relief_hours / nightHours) * 100) : null
    const thiValues = { max: sm.max_thi ?? null, min: sm.min_thi ?? null }

    // ความครบถ้วน: ชั่วโมงที่มีข้อมูล / ชั่วโมงทั้งหมดในรอบรายงาน
    // นับจากค่าแรกของฟาร์มถ้าติดตั้งไม่ถึง REPORT_DAYS วัน (แยกให้เห็นทั้ง 2 แบบ)
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd.getTime() - REPORT_DAYS * 86400000)
    const { rows: [firstRow] } = await db.query(`
        SELECT MIN(sr.recorded_at) AS first_at
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
    `, [farm.id_farms])
    const firstAt = firstRow?.first_at ? new Date(firstRow.first_at) : null
    const periodHours = REPORT_DAYS * 24
    const sinceInstallHours = firstAt
        ? Math.max(1, Math.ceil((periodEnd - Math.max(firstAt.getTime(), periodStart.getTime())) / 3600000))
        : null
    const coverage = {
        hours_with_data: hoursSampled,
        period_hours: periodHours,
        period_pct: Math.round((hoursSampled / periodHours) * 100),
        first_reading_at: firstAt ? firstAt.toISOString() : null,
        installed_within_period: Boolean(firstAt && firstAt > periodStart),
        since_install_hours: sinceInstallHours,
        since_install_pct: sinceInstallHours ? Math.min(100, Math.round((hoursSampled / sinceInstallHours) * 100)) : null,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString()
    }

    return {
        profile,
        thresholds,
        latest,
        hoursSampled,
        counts,
        avgThi,
        maxThi: thiValues.max,
        minThi: thiValues.min,
        dailyMeanLevel: sm.daily_mean_level || null,
        nightHours,
        nightRecoveryRate,
        coverage
    }
}

// -----------------------------------------------------------------
// 1. GET: /api/Admin/coop-report/farms-summary
// ดึงสรุปข้อมูล ESG & สมุดความเสี่ยงของทุกฟาร์ม
// -----------------------------------------------------------------
router.get('/farms-summary', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const farmsQuery = `
            SELECT
                f.id_farms,
                f.name_farms,
                f.province,
                f.district,
                f.barn_unit,
                f.barn_height_m,
                f.roof_type,
                f.cooling_system,
                to_jsonb(f)->>'hf_profile' AS hf_profile,
                f.created_at,
                u.name_users AS farmer_name,
                u.phone AS owner_phone,
                u.organization AS cooperative,
                d.serial_no AS device_serial,
                d.status AS device_status,
                d.last_seen_at
            FROM tb_farms f
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            LEFT JOIN LATERAL (
                SELECT d1.serial_no, d1.status, d1.last_seen_at
                FROM tb_devices d1
                WHERE d1.id_farms = f.id_farms
                ORDER BY d1.last_seen_at DESC NULLS LAST, d1.created_at DESC
                LIMIT 1
            ) d ON true
            ORDER BY f.created_at DESC
        `
        const { rows: farms } = await db.query(farmsQuery)

        const farmsSummary = await Promise.all(farms.map(async (farm) => {
            const base = {
                id_farms: farm.id_farms,
                name_farms: farm.name_farms || 'ฟาร์มไม่ระบุชื่อ',
                province: farm.province || null,
                district: farm.district || null,
                barn_unit: farm.barn_unit || null,
                barn_height_m: farm.barn_height_m || null,
                roof_type: farm.roof_type || null,
                cooling_system: farm.cooling_system || null,
                farmer_name: farm.farmer_name || null,
                owner_phone: farm.owner_phone || null,
                cooperative: farm.cooperative || null,
                device_serial: farm.device_serial || null,
                device_status: farm.device_status || 'unknown'
            }
            try {
                const r = await computeFarmRisk(farm)
                return {
                    ...base,
                    hf_profile: r.profile,
                    report_days: REPORT_DAYS,
                    latest_thi: r.latest ? round1(r.latest.thi) : null,
                    latest_temp: r.latest?.temperature_c != null ? parseFloat(r.latest.temperature_c) : null,
                    latest_hum: r.latest?.humidity_pct != null ? parseFloat(r.latest.humidity_pct) : null,
                    avg_thi: r.avgThi,
                    max_thi: r.maxThi,
                    min_thi: r.minThi,
                    night_recovery_rate_pct: r.nightRecoveryRate,
                    data_coverage: r.coverage,
                    stress_breakdown: {
                        mild_hours: r.counts.mild,
                        moderate_hours: r.counts.moderate,
                        severe_hours: r.counts.severe
                    },
                    hours_sampled: r.hoursSampled
                }
            } catch (farmErr) {
                console.warn(`[Coop Farm Summary Error for ${farm.id_farms}]:`, farmErr.message)
                return { ...base, error: 'ไม่สามารถคำนวณข้อมูลความเสี่ยงของฟาร์มนี้ได้', hours_sampled: 0 }
            }
        }))

        return res.json({
            success: true,
            total_farms: farmsSummary.length,
            farms: farmsSummary
        })
    } catch (err) {
        console.error('[Coop Farms Summary Error]:', err.message)
        return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลสรุปสหกรณ์ได้: ' + err.message })
    }
})

// -----------------------------------------------------------------
// 2. GET: /api/Admin/coop-report/farm/:farmId หรือ /:farmId
// ดึงข้อมูลสรุปสมุดความเสี่ยงสำหรับยื่นสหกรณ์โคนม / ธนาคาร
// -----------------------------------------------------------------
const handleFarmReportDetail = async (req, res) => {
    try {
        const farmId = req.params.farmId || req.params.id
        if (!isUUID(farmId)) {
            return res.status(400).json({ success: false, message: 'รหัสฟาร์มไม่ถูกต้อง' })
        }

        const farmRes = await db.query(`
            SELECT f.*, u.name_users AS owner_name, u.phone AS owner_phone, u.organization AS owner_org
            FROM tb_farms f
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            WHERE f.id_farms = $1
        `, [farmId])

        // ห้ามแสดงรายงานของฟาร์มอื่นแทน
        if (farmRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลฟาร์ม' })
        }
        const farm = farmRes.rows[0]

        const r = await computeFarmRisk(farm)
        const stressedHours = r.counts.mild + r.counts.moderate + r.counts.severe

        res.json({
            success: true,
            report_id: `CCR-${new Date().getFullYear()}-${farm.id_farms.slice(0, 8)}`,
            generated_at: new Date().toISOString(),
            report_days: REPORT_DAYS,
            data_basis: `THI เฉลี่ยรายชั่วโมง (สูตร NRC 1971) จากเซ็นเซอร์ในโรงเรือน ย้อนหลัง ${REPORT_DAYS} วัน`,
            data_note: DATA_NOTE,
            method: getMethod(r.profile),
            data_coverage: r.coverage,
            farm_profile: {
                id_farms: farm.id_farms,
                name_farms: farm.name_farms,
                province: farm.province || null,
                district: farm.district || null,
                barn_unit: farm.barn_unit || null,
                barn_height_m: farm.barn_height_m || null,
                roof_type: farm.roof_type || null,
                cooling_system: farm.cooling_system || null,
                farmer_name: farm.owner_name || null,
                cooperative: farm.owner_org || null,
                hf_profile: r.profile,
                thresholds: r.thresholds
            },
            risk_metrics: {
                hours_sampled: r.hoursSampled,
                average_thi: r.avgThi,
                max_thi: r.maxThi,
                min_thi: r.minThi,
                stress_breakdown: {
                    comfort_hours: r.counts.normal,
                    mild_hours: r.counts.mild,
                    moderate_hours: r.counts.moderate,
                    severe_hours: r.counts.severe
                },
                stressed_hours: stressedHours,
                night_hours_sampled: r.nightHours,
                night_recovery_rate_pct: r.nightRecoveryRate
            },
            // ระบบยังไม่ได้บันทึกการปฏิบัติของเกษตรกร จึงรายงานได้เฉพาะรายการที่วัดจากเซ็นเซอร์
            action_checklist: [
                {
                    item: `การระบายความร้อนกลางคืน 22:00–05:00 น. (THI < ${r.thresholds.mild})`,
                    compliance_pct: r.nightRecoveryRate,
                    source: 'sensor'
                },
                { item: 'เปิดพัดลมระบายอากาศเมื่อเข้าระดับเฝ้าระวัง', compliance_pct: null, source: 'not_recorded' },
                { item: 'งดพ่นหมอกเมื่อความชื้นในอากาศ ≥ 75%', compliance_pct: null, source: 'not_recorded' },
                { item: 'น้ำดื่มสะอาดไหลเวียนต่อเนื่อง', compliance_pct: null, source: 'not_recorded' }
            ]
        })
    } catch (err) {
        console.error('[Coop Report Error]:', err.message)
        res.status(500).json({ success: false, message: 'ไม่สามารถสร้างรายงานสหกรณ์ได้: ' + err.message })
    }
}

router.get('/farm/:farmId', verifyToken, requireRole('admin'), handleFarmReportDetail)
router.get('/:farmId', verifyToken, requireRole('admin'), handleFarmReportDetail)

module.exports = router
