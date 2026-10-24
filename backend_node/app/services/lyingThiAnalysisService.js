/**
 * CowCare AI - บริการนับเทียบความแม่นยำกล้อง (Model Audit) และวิเคราะห์ % วัวนอนรายชั่วโมงเทียบ THI
 *
 * 1) สรุปความคลาดเคลื่อนของโมเดล YOLO26m เทียบกับจำนวนที่ Admin นับเห็นจริงจากภาพตัวอย่างรายชั่วโมง
 * 2) วิเคราะห์ความสัมพันธ์ระหว่าง THI กับ % วัวนอนรายชั่วโมง:
 *    - ตัดช่วงเวลารีดนม/ให้อาหารของฟาร์ม (tb_farms.milking_times, feeding_times)
 *    - ควบคุมอิทธิพลของชั่วโมงของวัน (hour-of-day fixed effects centered at overall mean)
 *    - หาจุดหัก (broken-line regression) พร้อมช่วงความเชื่อมั่น 95% (bootstrap CI)
 *    - แสดงผลเฉพาะเมื่อมีข้อมูลจริงเพียงพอ และระบุชัดเจนว่าเป็น "ผลนำร่องในฟาร์มเดียว" ไม่ใช่เกณฑ์ใหม่ของโคนมไทย
 */

const db = require('../config/db')
const { thiSql, getFarmProfile, getThresholds } = require('./heatStress')
const { listFarmSamples } = require('./cameraSamples')

const MIN_PAIRED_HOURS = 48
const MIN_SIDE_POINTS = 10
const MIN_THI_SPAN = 6.0
const MIN_SENSOR_READINGS_PER_HOUR = 12
const BOOTSTRAP_ITERATIONS = 400

const SCOPE_LABEL_TH = 'ผลนำร่องในฟาร์มเดียว (Single-Farm Pilot Analysis) — ไม่ใช่เกณฑ์มาตรฐานใหม่ของโคนมไทย'

const r2 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100)
const r1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10)
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

/**
 * คำนวณสรุปความแม่นยำจากรายการที่ Admin นับเทียบแล้ว (pure function)
 */
const summarizeAudits = (audits = []) => {
    if (!audits.length) {
        return {
            audited_count: 0,
            metrics: null,
            summary_th: 'ยังไม่มีข้อมูลการนับเทียบจากผู้ดูแลระบบ'
        }
    }

    const calcClassMetric = (modelKey, humanKey, labelTh) => {
        const valid = audits.filter(a => a[humanKey] != null && a[modelKey] != null)
        if (!valid.length) return null
        const diffs = valid.map(a => Number(a[modelKey]) - Number(a[humanKey]))
        const absDiffs = diffs.map(d => Math.abs(d))
        const mae = r2(mean(absDiffs))
        const bias = r2(mean(diffs))
        let direction_th = 'ใกล้เคียงค่าจริง'
        if (bias > 0.1) direction_th = `นับเกินเฉลี่ย +${bias.toFixed(2)} ตัว/ภาพ`
        else if (bias < -0.1) direction_th = `นับขาดเฉลี่ย ${bias.toFixed(2)} ตัว/ภาพ`
        return {
            label_th: labelTh,
            n: valid.length,
            mae,
            bias,
            direction_th
        }
    }

    const metrics = {
        lying: calcClassMetric('model_lying', 'human_lying', 'วัวนอน (Lying)'),
        standing: calcClassMetric('model_standing', 'human_standing', 'วัวยืน (Standing)'),
        feeding: calcClassMetric('model_feeding', 'human_feeding', 'กินอาหาร (Feeding)'),
        drinking: calcClassMetric('model_drinking', 'human_drinking', 'ดื่มน้ำ (Drinking)'),
        total: calcClassMetric('model_total', 'human_total', 'จำนวนวัวรวม (Total)')
    }

    return {
        audited_count: audits.length,
        metrics,
        summary_th: `ตรวจนับเทียบแล้ว ${audits.length} ภาพ · วัวนอนคลาดเฉลี่ย ${metrics.lying?.mae ?? '—'} ตัว/ภาพ (${metrics.lying?.direction_th || '—'}) · วัวยืนคลาดเฉลี่ย ${metrics.standing?.mae ?? '—'} ตัว/ภาพ (${metrics.standing?.direction_th || '—'})`
    }
}

/**
 * แปลงเวลารีดนม/ให้อาหาร ('HH:MM') เป็นชุดชั่วโมงของวัน (0..23) ที่ต้องตัดออกจากการวิเคราะห์การนอน
 * ถ้าเวลาเริ่มที่นาที >= 30 จะตัดชั่วโมงถัดไปด้วย (เช่น 05:30 ตัดชั่วโมง 05 และ 06)
 */
const parseRoutineExcludedHours = (milkingTimes = [], feedingTimes = []) => {
    const hours = new Set()
    const labels = []
    const addList = (list, typeLabel) => {
        if (!Array.isArray(list)) return
        for (const item of list) {
            const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(item || '').trim())
            if (!m) continue
            const hh = Number(m[1])
            const mm = Number(m[2])
            hours.add(hh)
            if (mm >= 30) hours.add((hh + 1) % 24)
            labels.push(`${m[1]}:${m[2]} (${typeLabel})`)
        }
    }
    addList(milkingTimes, 'รีดนม')
    addList(feedingTimes, 'ให้อาหาร')
    return {
        excluded_hours: [...hours].sort((a, b) => a - b),
        routine_labels: labels
    }
}

/**
 * ควบคุมอิทธิพลของชั่วโมงของวัน (Within-hour centering):
 * Y*_i = Y_i - (mean(Y_h) - mean(Y))
 */
const adjustForHourOfDay = (points) => {
    if (!points.length) return []
    const grandMean = mean(points.map(p => p.lying_pct))
    const byHour = new Map()
    for (const p of points) {
        if (!byHour.has(p.hour_of_day)) byHour.set(p.hour_of_day, [])
        byHour.get(p.hour_of_day).push(p.lying_pct)
    }
    const hourMean = new Map()
    for (const [h, vals] of byHour) hourMean.set(h, mean(vals))

    return points.map(p => {
        const adj = p.lying_pct - (hourMean.get(p.hour_of_day) - grandMean)
        return {
            ...p,
            adjusted_lying_pct: r2(Math.max(0, Math.min(100, adj)))
        }
    })
}

/**
 * แก้สมการ OLS สำหรับโมเดลเส้นหัก 2 ช่วง (Two-phase broken-line regression) ที่จุดหัก tau:
 * y = b0 + b1 * min(0, x - tau) + b2 * max(0, x - tau)
 */
const fitAtBreakpoint = (pts, tau) => {
    const n = pts.length
    let s1 = 0, sX1 = 0, sX2 = 0, sY = 0
    let sX1X1 = 0, sX1X2 = 0, sX2X2 = 0
    let sX1Y = 0, sX2Y = 0

    for (let i = 0; i < n; i++) {
        const x = pts[i].thi
        const y = pts[i].adjusted_lying_pct
        const x1 = x < tau ? x - tau : 0
        const x2 = x > tau ? x - tau : 0
        s1 += 1
        sX1 += x1
        sX2 += x2
        sY += y
        sX1X1 += x1 * x1
        sX1X2 += x1 * x2
        sX2X2 += x2 * x2
        sX1Y += x1 * y
        sX2Y += x2 * y
    }

    // แก้ระบบสมการ 3x3 ด้วย Gaussian elimination
    const A = [
        [s1, sX1, sX2, sY],
        [sX1, sX1X1, sX1X2, sX1Y],
        [sX2, sX1X2, sX2X2, sX2Y]
    ]

    for (let col = 0; col < 3; col++) {
        let pivot = col
        for (let row = col + 1; row < 3; row++) {
            if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row
        }
        if (Math.abs(A[pivot][col]) < 1e-9) return null
        if (pivot !== col) {
            const tmp = A[col]
            A[col] = A[pivot]
            A[pivot] = tmp
        }
        const div = A[col][col]
        for (let j = col; j < 4; j++) A[col][j] /= div
        for (let row = 0; row < 3; row++) {
            if (row === col) continue
            const factor = A[row][col]
            for (let j = col; j < 4; j++) A[row][j] -= factor * A[col][j]
        }
    }

    const b0 = A[0][3]
    const slopeBefore = A[1][3]
    const slopeAfter = A[2][3]

    let rss = 0
    for (let i = 0; i < n; i++) {
        const x = pts[i].thi
        const y = pts[i].adjusted_lying_pct
        const x1 = x < tau ? x - tau : 0
        const x2 = x > tau ? x - tau : 0
        const yHat = b0 + slopeBefore * x1 + slopeAfter * x2
        const err = y - yHat
        rss += err * err
    }

    return { tau, b0, slopeBefore, slopeAfter, rss }
}

const findBestBrokenLine = (pts, minSide = MIN_SIDE_POINTS) => {
    const sortedThi = pts.map(p => p.thi).sort((a, b) => a - b)
    if (sortedThi.length < minSide * 2) return null

    const lowThi = Math.ceil(sortedThi[minSide] * 5) / 5
    const highThi = Math.floor(sortedThi[sortedThi.length - 1 - minSide] * 5) / 5
    if (highThi <= lowThi) return null

    let best = null
    for (let t = lowThi; t <= highThi + 1e-6; t = Math.round((t + 0.2) * 10) / 10) {
        const leftCount = pts.filter(p => p.thi < t).length
        const rightCount = pts.filter(p => p.thi >= t).length
        if (leftCount < minSide || rightCount < minSide) continue
        const fit = fitAtBreakpoint(pts, t)
        if (fit && (!best || fit.rss < best.rss)) best = fit
    }
    return best
}

/**
 * วิเคราะห์ Broken-line Regression พร้อม 95% Bootstrap CI (pure function)
 */
const runBrokenLineAnalysis = (rawPoints, { excludedHours = [], routineLabels = [], thresholds = null } = {}) => {
    const excludedSet = new Set(excludedHours)
    const filtered = rawPoints.filter(p => !excludedSet.has(p.hour_of_day))
    const excludedCount = rawPoints.length - filtered.length

    const thiVals = filtered.map(p => p.thi).filter(Number.isFinite)
    const thiMin = thiVals.length ? r1(Math.min(...thiVals)) : null
    const thiMax = thiVals.length ? r1(Math.max(...thiVals)) : null
    const thiSpan = thiMin != null && thiMax != null ? r1(thiMax - thiMin) : 0

    const baseInfo = {
        scope_label_th: SCOPE_LABEL_TH,
        total_paired_hours: rawPoints.length,
        excluded_routine_hours_count: excludedCount,
        analyzed_hours: filtered.length,
        min_required_hours: MIN_PAIRED_HOURS,
        min_required_thi_span: MIN_THI_SPAN,
        excluded_hours_of_day: excludedHours,
        routine_labels: routineLabels,
        thi_range: { min: thiMin, max: thiMax, span: thiSpan },
        thresholds
    }

    if (filtered.length < MIN_PAIRED_HOURS) {
        return {
            ...baseInfo,
            sufficient_data: false,
            reason_th: `มีข้อมูลรายชั่วโมงหลังตัดช่วงรีดนม/ให้อาหาร ${filtered.length} ชั่วโมง (ต้องการอย่างน้อย ${MIN_PAIRED_HOURS} ชั่วโมง เพื่อวิเคราะห์จุดหักอย่างน่าเชื่อถือ)`,
            broken_line: null,
            points: adjustForHourOfDay(filtered)
        }
    }

    if (thiSpan < MIN_THI_SPAN) {
        return {
            ...baseInfo,
            sufficient_data: false,
            reason_th: `ช่วงค่า THI ที่วัดได้แคบเกินไป (${thiMin}–${thiMax}, ต่างกัน ${thiSpan} หน่วย ต้องการอย่างน้อย ${MIN_THI_SPAN} หน่วย เพื่อหาจุดหัก)`,
            broken_line: null,
            points: adjustForHourOfDay(filtered)
        }
    }

    const adjusted = adjustForHourOfDay(filtered)
    const best = findBestBrokenLine(adjusted, MIN_SIDE_POINTS)
    if (!best) {
        return {
            ...baseInfo,
            sufficient_data: false,
            reason_th: 'จำนวนข้อมูลฝั่งซ้ายหรือขวาของจุดหักยังไม่เพียงพอ (ต้องการอย่างน้อยฝั่งละ 10 ชั่วโมง)',
            broken_line: null,
            points: adjusted
        }
    }

    // คำนวณ R^2
    const yMean = mean(adjusted.map(p => p.adjusted_lying_pct))
    const tss = adjusted.reduce((s, p) => s + (p.adjusted_lying_pct - yMean) ** 2, 0)
    const rSquared = tss > 0 ? Math.max(0, 1 - best.rss / tss) : 0

    // Deterministic Bootstrap (LCG seed คงที่) สำหรับคำนวณ 95% CI ของจุดหัก
    let seed = 20261028
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    const bootTaus = []
    const n = adjusted.length
    for (let b = 0; b < BOOTSTRAP_ITERATIONS; b++) {
        const sample = Array.from({ length: n }, () => adjusted[Math.floor(rand() * n)])
        const bFit = findBestBrokenLine(sample, Math.max(6, Math.floor(MIN_SIDE_POINTS * 0.8)))
        if (bFit) bootTaus.push(bFit.tau)
    }
    bootTaus.sort((a, b) => a - b)
    const ciLow = bootTaus.length >= 20 ? r1(bootTaus[Math.floor(bootTaus.length * 0.025)]) : null
    const ciHigh = bootTaus.length >= 20 ? r1(bootTaus[Math.floor(bootTaus.length * 0.975)]) : null

    return {
        ...baseInfo,
        sufficient_data: true,
        reason_th: null,
        broken_line: {
            breakpoint_thi: r1(best.tau),
            ci95_low: ciLow,
            ci95_high: ciHigh,
            intercept_at_breakpoint: r2(best.b0),
            slope_before_per_thi: r2(best.slopeBefore),
            slope_after_per_thi: r2(best.slopeAfter),
            r_squared: r2(rSquared),
            bootstrap_samples: bootTaus.length,
            interpretation_th: best.slopeAfter < 0
                ? `เมื่อ THI สูงเกินประมาณ ${r1(best.tau)} (95% CI: ${ciLow ?? '—'}–${ciHigh ?? '—'}) สัดส่วนวัวนอน (ปรับตามชั่วโมงของวันแล้ว) เปลี่ยนแปลง ${r2(best.slopeAfter)}% ต่อ +1 THI (ผลนำร่องเฉพาะโรงเรือนนี้)`
                : `จุดเปลี่ยนความชันอยู่ที่ THI ประมาณ ${r1(best.tau)} (95% CI: ${ciLow ?? '—'}–${ciHigh ?? '—'}) แต่ยังไม่พบการลดลงของ % วัวนอนหลังจุดหักอย่างชัดเจนในชุดข้อมูลนำร่องนี้`
        },
        points: adjusted
    }
}

/**
 * ดึงภาพตัวอย่างพร้อมผลนับเทียบจาก DB
 */
const getFarmSamplesWithAudits = async (farmId, { limit = 24 } = {}) => {
    const storageRes = await listFarmSamples(farmId, { limit })
    let audits = []
    let migrationRequired = false

    try {
        const { rows } = await db.query(
            `SELECT * FROM tb_camera_sample_audits WHERE id_farms = $1 ORDER BY captured_at DESC NULLS LAST, updated_at DESC`,
            [farmId]
        )
        audits = rows
    } catch (err) {
        if (err.code === '42P01') {
            migrationRequired = true
        } else {
            throw err
        }
    }

    const auditByPath = new Map(audits.map(a => [a.sample_path, a]))
    const samples = (storageRes.samples || []).map(s => {
        const a = auditByPath.get(s.sample_path) || null
        return {
            ...s,
            audit: a ? {
                id: a.id,
                human_lying: a.human_lying,
                human_standing: a.human_standing,
                human_feeding: a.human_feeding,
                human_drinking: a.human_drinking,
                human_total: a.human_total,
                note: a.note,
                audited_by: a.audited_by,
                updated_at: a.updated_at
            } : null
        }
    })

    return {
        storage_configured: storageRes.configured,
        bucket: storageRes.bucket,
        migration_required: migrationRequired,
        migration_file: 'backend_node/migrations/20261028_camera_sample_audits.sql',
        summary: summarizeAudits(audits),
        samples
    }
}

/**
 * บันทึกผลการนับจริงของ Admin สำหรับภาพตัวอย่าง 1 ภาพ
 */
const saveSampleAudit = async (farmId, payload, adminEmail = null) => {
    const samplePath = String(payload.sample_path || '').trim()
    if (!samplePath || !samplePath.startsWith(`${farmId}/`)) {
        const err = new Error('sample_path ไม่ถูกต้องหรือไม่ตรงกับฟาร์มนี้')
        err.statusCode = 400
        throw err
    }

    const parseNonNegInt = (v, required = false) => {
        if (v === undefined || v === null || v === '') {
            if (required) {
                const err = new Error('กรุณากรอกจำนวนวัวนอนและวัวยืนที่นับเห็นจริง (จำนวนเต็ม >= 0)')
                err.statusCode = 400
                throw err
            }
            return null
        }
        const n = Number(v)
        if (!Number.isInteger(n) || n < 0 || n > 500) {
            const err = new Error('จำนวนวัวต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 500')
            err.statusCode = 400
            throw err
        }
        return n
    }

    const humanLying = parseNonNegInt(payload.human_lying, true)
    const humanStanding = parseNonNegInt(payload.human_standing, true)
    const humanFeeding = parseNonNegInt(payload.human_feeding, false)
    const humanDrinking = parseNonNegInt(payload.human_drinking, false)
    const humanTotal = payload.human_total !== undefined && payload.human_total !== null && payload.human_total !== ''
        ? parseNonNegInt(payload.human_total, true)
        : humanLying + humanStanding + (humanFeeding || 0) + (humanDrinking || 0)

    const modelLying = parseNonNegInt(payload.model_lying ?? 0, false) ?? 0
    const modelStanding = parseNonNegInt(payload.model_standing ?? 0, false) ?? 0
    const modelFeeding = parseNonNegInt(payload.model_feeding ?? 0, false) ?? 0
    const modelDrinking = parseNonNegInt(payload.model_drinking ?? 0, false) ?? 0
    const modelTotal = payload.model_total != null
        ? (parseNonNegInt(payload.model_total, false) ?? 0)
        : modelLying + modelStanding + modelFeeding + modelDrinking

    const capturedAt = payload.captured_at ? new Date(payload.captured_at) : null
    const validCapturedAt = capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt.toISOString() : null
    const note = payload.note ? String(payload.note).trim().slice(0, 500) : null

    try {
        const { rows } = await db.query(
            `INSERT INTO tb_camera_sample_audits (
                id_farms, sample_path, captured_at,
                model_lying, model_standing, model_feeding, model_drinking, model_total,
                human_lying, human_standing, human_feeding, human_drinking, human_total,
                note, audited_by, updated_at
             ) VALUES (
                $1, $2, $3,
                $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13,
                $14, $15, NOW()
             )
             ON CONFLICT (sample_path) DO UPDATE SET
                captured_at = COALESCE(EXCLUDED.captured_at, tb_camera_sample_audits.captured_at),
                model_lying = EXCLUDED.model_lying,
                model_standing = EXCLUDED.model_standing,
                model_feeding = EXCLUDED.model_feeding,
                model_drinking = EXCLUDED.model_drinking,
                model_total = EXCLUDED.model_total,
                human_lying = EXCLUDED.human_lying,
                human_standing = EXCLUDED.human_standing,
                human_feeding = EXCLUDED.human_feeding,
                human_drinking = EXCLUDED.human_drinking,
                human_total = EXCLUDED.human_total,
                note = EXCLUDED.note,
                audited_by = EXCLUDED.audited_by,
                updated_at = NOW()
             RETURNING *`,
            [
                farmId, samplePath, validCapturedAt,
                modelLying, modelStanding, modelFeeding, modelDrinking, modelTotal,
                humanLying, humanStanding, humanFeeding, humanDrinking, humanTotal,
                note, adminEmail
            ]
        )
        return rows[0]
    } catch (err) {
        if (err.code === '42P01') {
            const migErr = new Error('ยังไม่ได้สร้างตาราง tb_camera_sample_audits กรุณารันไฟล์ SQL: backend_node/migrations/20261028_camera_sample_audits.sql ใน Supabase ก่อน')
            migErr.statusCode = 503
            throw migErr
        }
        throw err
    }
}

/**
 * วิเคราะห์ % วัวนอนรายชั่วโมงเทียบกับ THI ของฟาร์ม (ดึงข้อมูลจริงจาก DB)
 */
const getFarmLyingThiAnalysis = async (farmId, { days = 30 } = {}) => {
    const lookbackDays = Math.min(90, Math.max(7, Number(days) || 30))

    let farm = null
    try {
        const { rows } = await db.query(
            `SELECT id_farms, name_farms, hf_profile, milking_times, feeding_times
             FROM tb_farms WHERE id_farms = $1 LIMIT 1`,
            [farmId]
        )
        farm = rows[0] || null
    } catch (err) {
        if (err.code === '42703') {
            const { rows } = await db.query(
                `SELECT id_farms, name_farms, hf_profile FROM tb_farms WHERE id_farms = $1 LIMIT 1`,
                [farmId]
            )
            farm = rows[0] ? { ...rows[0], milking_times: [], feeding_times: [] } : null
        } else {
            throw err
        }
    }

    if (!farm) {
        const err = new Error('ไม่พบฟาร์มที่ระบุ')
        err.statusCode = 404
        throw err
    }

    const profile = getFarmProfile(farm)
    const thresholds = getThresholds(profile)
    const { excluded_hours, routine_labels } = parseRoutineExcludedHours(farm.milking_times, farm.feeding_times)

    const [camRes, sensorRes] = await Promise.all([
        db.query(
            `SELECT
                date_trunc('hour', timestamp AT TIME ZONE 'Asia/Bangkok') AS hour_bkk,
                AVG(lying_pct)::float AS lying_pct,
                AVG(standing_pct)::float AS standing_pct,
                AVG(cow_comfort_index)::float AS cci,
                AVG(total_cows_detected)::float AS avg_cows,
                COUNT(*)::int AS images
             FROM cctv_behavior_telemetry
             WHERE farm_id = $1
               AND is_simulation = false
               AND total_cows_detected > 0
               AND timestamp >= NOW() - ($2::int * INTERVAL '1 day')
             GROUP BY 1
             ORDER BY 1 ASC`,
            [farmId, lookbackDays]
        ),
        db.query(
            `SELECT
                date_trunc('hour', sr.recorded_at AT TIME ZONE 'Asia/Bangkok') AS hour_bkk,
                AVG(${thiSql('sr')})::float AS avg_thi,
                AVG(sr.temperature_c)::float AS avg_temp,
                AVG(sr.humidity_pct)::float AS avg_hum,
                COUNT(*)::int AS readings
             FROM tb_sensor_readings sr
             LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
             WHERE (d.id_farms = $1 OR sr.id_farms = $1)
               AND sr.temperature_c IS NOT NULL
               AND sr.humidity_pct IS NOT NULL
               AND sr.recorded_at >= NOW() - ($2::int * INTERVAL '1 day')
             GROUP BY 1
             HAVING COUNT(*) >= $3
             ORDER BY 1 ASC`,
            [farmId, lookbackDays, MIN_SENSOR_READINGS_PER_HOUR]
        )
    ])

    const toKey = (d) => {
        const t = new Date(d)
        const yyyy = t.getFullYear()
        const mm = String(t.getMonth() + 1).padStart(2, '0')
        const dd = String(t.getDate()).padStart(2, '0')
        const hh = String(t.getHours()).padStart(2, '0')
        return { key: `${yyyy}-${mm}-${dd} ${hh}:00`, hour: t.getHours() }
    }

    const sensorMap = new Map()
    for (const r of sensorRes.rows) {
        const { key } = toKey(r.hour_bkk)
        sensorMap.set(key, r)
    }

    const paired = []
    for (const c of camRes.rows) {
        const { key, hour } = toKey(c.hour_bkk)
        const s = sensorMap.get(key)
        if (!s) continue
        const thi = Number(s.avg_thi)
        const lyingPct = Number(c.lying_pct)
        if (!Number.isFinite(thi) || !Number.isFinite(lyingPct)) continue
        paired.push({
            hour_key: key,
            hour_of_day: hour,
            thi: r1(thi),
            temp_c: r1(Number(s.avg_temp)),
            humidity_pct: r1(Number(s.avg_hum)),
            lying_pct: r1(lyingPct),
            standing_pct: r1(Number(c.standing_pct)),
            cci: r1(Number(c.cci)),
            avg_cows: r1(Number(c.avg_cows)),
            images: Number(c.images)
        })
    }

    const analysis = runBrokenLineAnalysis(paired, {
        excludedHours: excluded_hours,
        routineLabels: routine_labels,
        thresholds
    })

    return {
        farm_id: farm.id_farms,
        farm_name: farm.name_farms,
        hf_profile: profile,
        lookback_days: lookbackDays,
        camera_hours_count: camRes.rows.length,
        sensor_hours_count: sensorRes.rows.length,
        ...analysis
    }
}

module.exports = {
    SCOPE_LABEL_TH,
    MIN_PAIRED_HOURS,
    summarizeAudits,
    parseRoutineExcludedHours,
    adjustForHourOfDay,
    runBrokenLineAnalysis,
    getFarmSamplesWithAudits,
    saveSampleAudit,
    getFarmLyingThiAnalysis
}
