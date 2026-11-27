/**
 * CowCare AI - บริการนับเทียบความแม่นยำกล้อง (Model Audit) และวิเคราะห์ % วัวนอนรายชั่วโมงเทียบ THI
 *
 * 1) สรุปความคลาดเคลื่อนของโมเดล YOLO26m เทียบกับจำนวนที่ Admin นับเห็นจริงจากภาพตัวอย่างรายชั่วโมง
 * 2) วิเคราะห์ความสัมพันธ์ระหว่าง THI กับ % วัวนอนรายชั่วโมง:
 *    - ตัดช่วงเวลารีดนม/ให้อาหารของฟาร์ม (tb_farms.milking_times, feeding_times)
 *    - ควบคุมชั่วโมงของวัน: ตัดค่าเฉลี่ยรายชั่วโมงออกจากทั้ง % วัวนอน และตัวแปรของเส้นหัก (hour fixed effects แบบ Frisch-Waugh)
 *    - หาจุดหัก (broken-line regression) ช่วงความเชื่อมั่น 95% ด้วย block bootstrap รายวัน (ข้อมูลรายชั่วโมงในวันเดียวกันสัมพันธ์กัน)
 *    - แสดงจุดหักเฉพาะเมื่อ: ข้อมูล >= 14 วัน, ความชันก่อน/หลังต่างกันจริง (CI ของผลต่างไม่คร่อม 0)
 *      และความชันหลังจุดหักไม่คร่อม 0 ไม่งั้นรายงานว่า "ยังไม่พบจุดเปลี่ยนที่ชัดเจน"
 *    - ระบุชัดเจนว่าเป็น "ผลนำร่องในฟาร์มเดียว" ไม่ใช่เกณฑ์ใหม่ของโคนมไทย
 */

const db = require('../config/db')
const { thiSql, getFarmProfile, getThresholds } = require('./heatStress')
const { listFarmSamples, readSampleResult, countsFromMeta } = require('./cameraSamples')

const MIN_DAYS = 14                 // ตรงกับคำแนะนำบนหน้าเว็บ "2–3 สัปดาห์"
const MIN_PAIRED_HOURS = 150
const MIN_SIDE_POINTS = 20
const MIN_THI_SPAN = 6.0
const MIN_SENSOR_READINGS_PER_HOUR = 12
const BOOTSTRAP_ITERATIONS = 200
const MIN_AUDITS_FOR_TRUST = 30     // ก่อนนับเทียบภาพครบ ให้ติดป้ายว่ายังไม่รู้ความแม่นของกล้อง
const CACHE_MS = 10 * 60 * 1000

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
 * % วัวนอนหลังหักค่าเฉลี่ยของชั่วโมงนั้น (ไว้แสดงกราฟ) ค่าในการคำนวณจริงใช้ demeanByHour ด้านล่าง
 */
const adjustForHourOfDay = (points) => {
    if (!points.length) return []
    const grandMean = mean(points.map(p => p.lying_pct))
    const hourMean = groupMean(points, p => p.lying_pct)
    return points.map(p => ({ ...p, adjusted_lying_pct: r2(p.lying_pct - (hourMean.get(p.hour_of_day) - grandMean)) }))
}

const groupMean = (points, f) => {
    const acc = new Map()
    for (const p of points) {
        const v = acc.get(p.hour_of_day) || { s: 0, n: 0 }
        v.s += f(p); v.n++
        acc.set(p.hour_of_day, v)
    }
    const out = new Map()
    for (const [h, v] of acc) out.set(h, v.s / v.n)
    return out
}

// ตัดค่าเฉลี่ยรายชั่วโมงออก (hour fixed effects)
const demeanByHour = (points, values) => {
    const acc = new Map()
    points.forEach((p, i) => {
        const v = acc.get(p.hour_of_day) || { s: 0, n: 0 }
        v.s += values[i]; v.n++
        acc.set(p.hour_of_day, v)
    })
    return values.map((x, i) => { const v = acc.get(points[i].hour_of_day); return x - v.s / v.n })
}

/**
 * OLS ไม่มีค่าคงที่ (ตัวแปรถูก demean ตามชั่วโมงแล้ว) y ~ b1*h1 + b2*h2 คืน { b1, b2, rss }
 */
const ols2 = (y, h1, h2) => {
    let a11 = 0, a12 = 0, a22 = 0, c1 = 0, c2 = 0
    for (let i = 0; i < y.length; i++) {
        a11 += h1[i] * h1[i]; a12 += h1[i] * h2[i]; a22 += h2[i] * h2[i]
        c1 += h1[i] * y[i]; c2 += h2[i] * y[i]
    }
    const det = a11 * a22 - a12 * a12
    if (Math.abs(det) < 1e-9) return null
    const b1 = (c1 * a22 - c2 * a12) / det
    const b2 = (a11 * c2 - a12 * c1) / det
    let rss = 0
    for (let i = 0; i < y.length; i++) { const e = y[i] - b1 * h1[i] - b2 * h2[i]; rss += e * e }
    return { b1, b2, rss }
}

/**
 * หาจุดหักที่ดีที่สุด: % วัวนอน = ผลของชั่วโมง + b1*min(0, THI-tau) + b2*max(0, THI-tau)
 * ชั่วโมงของวันถูกควบคุมทั้งฝั่ง y และฝั่งตัวแปรเส้นหัก ความชันจึงไม่หดเพราะ THI กับชั่วโมงสัมพันธ์กัน
 */
const findBestBrokenLine = (pts, minSide = MIN_SIDE_POINTS) => {
    const n = pts.length
    if (n < minSide * 2) return null
    const sorted = pts.map(p => p.thi).sort((a, b) => a - b)
    const lo = Math.ceil(sorted[minSide] * 5) / 5
    const hi = Math.floor(sorted[n - 1 - minSide] * 5) / 5
    if (hi <= lo) return null
    const y = demeanByHour(pts, pts.map(p => p.lying_pct))
    let best = null
    for (let t = lo; t <= hi + 1e-6; t = Math.round((t + 0.2) * 10) / 10) {
        const h1 = pts.map(p => (p.thi < t ? p.thi - t : 0))
        const h2 = pts.map(p => (p.thi > t ? p.thi - t : 0))
        const fit = ols2(y, demeanByHour(pts, h1), demeanByHour(pts, h2))
        if (fit && (!best || fit.rss < best.rss)) best = { tau: t, slopeBefore: fit.b1, slopeAfter: fit.b2, rss: fit.rss }
    }
    if (!best) return null
    const tss = y.reduce((s2, v) => s2 + v * v, 0)
    return { ...best, r2_within_hour: tss > 0 ? Math.max(0, 1 - best.rss / tss) : 0 }
}

const pct = (sortedArr, q) => sortedArr[Math.min(sortedArr.length - 1, Math.max(0, Math.floor(sortedArr.length * q)))]

/**
 * วิเคราะห์ Broken-line Regression (pure function)
 * แต่ละจุดต้องมี day_key (วันเวลาไทย) สำหรับ block bootstrap รายวัน
 */
const runBrokenLineAnalysis = (rawPoints, { excludedHours = [], routineLabels = [], thresholds = null, auditedCount = null } = {}) => {
    const excludedSet = new Set(excludedHours)
    const filtered = rawPoints.filter(p => !excludedSet.has(p.hour_of_day))
    const excludedCount = rawPoints.length - filtered.length
    const dayKeys = [...new Set(filtered.map(p => p.day_key || String(p.hour_key || '').slice(0, 10)))]

    const thiVals = filtered.map(p => p.thi).filter(Number.isFinite)
    const thiMin = thiVals.length ? r1(Math.min(...thiVals)) : null
    const thiMax = thiVals.length ? r1(Math.max(...thiVals)) : null
    const thiSpan = thiMin != null && thiMax != null ? r1(thiMax - thiMin) : 0

    const cameraNote = auditedCount != null && auditedCount < MIN_AUDITS_FOR_TRUST
        ? `ยังนับเทียบภาพกล้องแล้ว ${auditedCount} ภาพ (ควรอย่างน้อย ${MIN_AUDITS_FOR_TRUST} ภาพ) จึงยังไม่รู้ว่ากล้องนับวัวนอนแม่นแค่ไหนในโรงเรือนนี้`
        : null
    const baseInfo = {
        scope_label_th: SCOPE_LABEL_TH,
        total_paired_hours: rawPoints.length,
        excluded_routine_hours_count: excludedCount,
        analyzed_hours: filtered.length,
        analyzed_days: dayKeys.length,
        min_required_days: MIN_DAYS,
        min_required_hours: MIN_PAIRED_HOURS,
        min_required_thi_span: MIN_THI_SPAN,
        excluded_hours_of_day: excludedHours,
        routine_labels: routineLabels,
        thi_range: { min: thiMin, max: thiMax, span: thiSpan },
        thresholds,
        camera_accuracy_note_th: cameraNote
    }
    const points = adjustForHourOfDay(filtered)
    const notEnough = (reason) => ({ ...baseInfo, sufficient_data: false, breakpoint_found: false, reason_th: reason, broken_line: null, points })

    if (dayKeys.length < MIN_DAYS) return notEnough(`มีข้อมูล ${dayKeys.length} วัน ต้องการอย่างน้อย ${MIN_DAYS} วัน (ข้อมูลไม่กี่วันมักได้จุดหักที่เกิดจากความบังเอิญ)`)
    if (filtered.length < MIN_PAIRED_HOURS) return notEnough(`มีข้อมูลรายชั่วโมงหลังตัดช่วงรีดนม/ให้อาหาร ${filtered.length} ชั่วโมง (ต้องการอย่างน้อย ${MIN_PAIRED_HOURS} ชั่วโมง)`)
    if (thiSpan < MIN_THI_SPAN) return notEnough(`ช่วงค่า THI ที่วัดได้แคบเกินไป (${thiMin}–${thiMax}, ต่างกัน ${thiSpan} หน่วย ต้องการอย่างน้อย ${MIN_THI_SPAN} หน่วย)`)

    const best = findBestBrokenLine(filtered, MIN_SIDE_POINTS)
    if (!best) return notEnough(`ข้อมูลฝั่งซ้ายหรือขวาของจุดหักไม่พอ (ต้องการอย่างน้อยฝั่งละ ${MIN_SIDE_POINTS} ชั่วโมง)`)

    // block bootstrap รายวัน (seed คงที่ ผลซ้ำได้)
    let seed = 20261028
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
    const byDay = new Map()
    for (const p of filtered) {
        const k = p.day_key || String(p.hour_key || '').slice(0, 10)
        if (!byDay.has(k)) byDay.set(k, [])
        byDay.get(k).push(p)
    }
    const days = [...byDay.values()]
    const taus = [], afters = [], diffs = []
    for (let b = 0; b < BOOTSTRAP_ITERATIONS; b++) {
        const sample = []
        for (let d = 0; d < days.length; d++) sample.push(...days[Math.floor(rand() * days.length)])
        const f = findBestBrokenLine(sample, Math.floor(MIN_SIDE_POINTS * 0.8))
        if (!f) continue
        taus.push(f.tau); afters.push(f.slopeAfter); diffs.push(f.slopeAfter - f.slopeBefore)
    }
    if (taus.length < 50) return notEnough('คำนวณช่วงความเชื่อมั่นไม่ได้ (ข้อมูลกระจายไม่พอ)')
    for (const arr of [taus, afters, diffs]) arr.sort((x, y2) => x - y2)
    const ci = (arr) => [r2(pct(arr, 0.025)), r2(pct(arr, 0.975))]
    const [tauLo, tauHi] = ci(taus), [aftLo, aftHi] = ci(afters), [dLo, dHi] = ci(diffs)
    const slopeChangeReal = dLo > 0 || dHi < 0           // เส้นหักต่างจากเส้นตรงจริง
    const afterNonZero = aftLo > 0 || aftHi < 0          // หลังจุดหักมีแนวโน้มจริง
    const found = slopeChangeReal && afterNonZero && best.slopeAfter < 0

    const brokenLine = {
        breakpoint_thi: r1(best.tau),
        ci95_low: r1(tauLo),
        ci95_high: r1(tauHi),
        slope_before_per_thi: r2(best.slopeBefore),
        slope_after_per_thi: r2(best.slopeAfter),
        slope_after_ci95: [aftLo, aftHi],
        slope_change_ci95: [dLo, dHi],
        r_squared_within_hour: r2(best.r2_within_hour),
        bootstrap_samples: taus.length,
        bootstrap_method: 'block bootstrap รายวัน',
        interpretation_th: found
            ? `ผลนำร่อง: เมื่อ THI สูงเกินประมาณ ${r1(best.tau)} (95% CI ${r1(tauLo)}–${r1(tauHi)}) % วัวนอน (หลังควบคุมชั่วโมงของวัน) ลดลง ${Math.abs(r2(best.slopeAfter))}% ต่อ +1 THI (95% CI ${aftLo}–${aftHi}) เฉพาะโรงเรือนนี้ ${dayKeys.length} วัน`
            : `ยังไม่พบจุดเปลี่ยนที่ชัดเจน: เส้นหักไม่ต่างจากเส้นตรงอย่างมีนัยสำคัญ หรือหลังจุดหักไม่มีแนวโน้มลดลงที่ชัด (ข้อมูล ${dayKeys.length} วัน) จึงไม่รายงานค่า THI ของจุดหัก`
    }
    return { ...baseInfo, sufficient_data: true, breakpoint_found: found, reason_th: null, broken_line: found ? brokenLine : { ...brokenLine, breakpoint_thi: null, ci95_low: null, ci95_high: null }, points }
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

    // จำนวนที่โมเดลนับ: อ่านจาก <HH>.json ฝั่ง server เท่านั้น (ไม่เชื่อค่าจาก client) ไม่มีไฟล์ = บันทึกไม่ได้
    const meta = await readSampleResult(samplePath)
    const modelCounts = countsFromMeta(meta)
    if (!modelCounts) {
        const err = new Error('ภาพนี้ไม่มีผลของโมเดล (ไม่มีไฟล์ .json ข้างภาพ) จึงนับเทียบไม่ได้')
        err.statusCode = 400
        throw err
    }
    const { lying: modelLying, standing: modelStanding, feeding: modelFeeding, drinking: modelDrinking, total: modelTotal } = modelCounts

    const capturedAt = meta?.captured_at ? new Date(meta.captured_at) : null
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
const analysisCache = new Map() // `${farmId}_${days}` -> { at, data } bootstrap ใช้ CPU จึงไม่คำนวณซ้ำทุกคำขอ
const getFarmLyingThiAnalysis = async (farmId, { days = 30 } = {}) => {
    const lookbackDays = Math.min(90, Math.max(7, Number(days) || 30))
    const cacheKey = `${farmId}_${lookbackDays}`
    const hit = analysisCache.get(cacheKey)
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data
    const data = await computeFarmLyingThiAnalysis(farmId, lookbackDays)
    analysisCache.set(cacheKey, { at: Date.now(), data })
    if (analysisCache.size > 200) analysisCache.clear()
    return data
}

const computeFarmLyingThiAnalysis = async (farmId, lookbackDays) => {

    // to_jsonb ใช้ได้ทั้งก่อนและหลังรัน migration ของ hf_profile / milking_times / feeding_times
    const { rows: farmRows } = await db.query(
        `SELECT f.id_farms, f.name_farms, to_jsonb(f)->>'hf_profile' AS hf_profile,
                to_jsonb(f)->'milking_times' AS milking_times, to_jsonb(f)->'feeding_times' AS feeding_times
         FROM tb_farms f WHERE f.id_farms = $1 LIMIT 1`,
        [farmId]
    )
    const farm = farmRows[0] || null

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
             WHERE sr.id_farms = $1
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
        return { key: `${yyyy}-${mm}-${dd} ${hh}:00`, day: `${yyyy}-${mm}-${dd}`, hour: t.getHours() }
    }

    const sensorMap = new Map()
    for (const r of sensorRes.rows) {
        const { key } = toKey(r.hour_bkk)
        sensorMap.set(key, r)
    }

    const paired = []
    for (const c of camRes.rows) {
        const { key, day, hour } = toKey(c.hour_bkk)
        const s = sensorMap.get(key)
        if (!s) continue
        const thi = Number(s.avg_thi)
        const lyingPct = Number(c.lying_pct)
        if (!Number.isFinite(thi) || !Number.isFinite(lyingPct)) continue
        paired.push({
            hour_key: key,
            day_key: day,
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

    let auditedCount = null
    try {
        const { rows: [c] } = await db.query(`SELECT COUNT(*)::int AS n FROM tb_camera_sample_audits WHERE id_farms = $1`, [farmId])
        auditedCount = c.n
    } catch (e) { auditedCount = 0 }

    const analysis = runBrokenLineAnalysis(paired, {
        excludedHours: excluded_hours,
        routineLabels: routine_labels,
        thresholds,
        auditedCount
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
    MIN_DAYS,
    summarizeAudits,
    parseRoutineExcludedHours,
    adjustForHourOfDay,
    runBrokenLineAnalysis,
    getFarmSamplesWithAudits,
    saveSampleAudit,
    getFarmLyingThiAnalysis
}
