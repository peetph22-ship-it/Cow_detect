/**
 * เทียบค่าเซ็นเซอร์ของกล่อง (SHT40) กับเครื่องวัดอ้างอิง ฟังก์ชันล้วน ไม่แตะฐานข้อมูล
 * เทสต์: scripts/test_sensor_validation.js · ใช้ผ่าน scripts/compare_sensor.js
 *
 * จับคู่: ค่าอ้างอิง 1 ค่า (เวลาที่จด) กับค่าเฉลี่ยของกล่องในช่วง ±toleranceSec รอบเวลานั้น
 * (กล่องวัดทุก 15 วิ ค่าเฉลี่ยรอบเวลาที่จดช่วยลดผลของการจดเวลาไม่ตรงวินาที)
 * ตัวเลข: bias (กล่อง − อ้างอิง), MAE, RMSE, คลาดมากสุด, r, เส้นตรง กล่อง = a × อ้างอิง + b
 * และ THI (สูตร NRC เดียวกับระบบ) + ระดับความเสี่ยงตรงกันกี่ %
 */
const { calcThi, getRiskLevel } = require('./heatStress')

const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100)
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000)
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length

/**
 * @param {Array<{t, temperature_c, humidity_pct}>} ref  ค่าอ้างอิง (t = ms)
 * @param {Array<{t, temperature_c, humidity_pct}>} sys  ค่าของกล่อง (t = ms)
 * @returns {{pairs: Array<{t, ref:{T,RH}, sys:{T,RH}, n}>, unmatched: number[]}}  unmatched = เวลาอ้างอิงที่ไม่มีค่ากล่องใกล้ ๆ
 */
const pairReadings = (ref, sys, toleranceSec = 60) => {
    const s = [...sys].filter(x => Number.isFinite(x.t)).sort((a, b) => a.t - b.t)
    const tol = toleranceSec * 1000
    const pairs = []
    const unmatched = []
    for (const r of ref) {
        const near = s.filter(x => Math.abs(x.t - r.t) <= tol && Number.isFinite(Number(x.temperature_c)) && Number.isFinite(Number(x.humidity_pct)))
        if (!near.length) { unmatched.push(r.t); continue }
        pairs.push({
            t: r.t,
            ref: { T: Number(r.temperature_c), RH: Number(r.humidity_pct) },
            sys: { T: mean(near.map(x => Number(x.temperature_c))), RH: mean(near.map(x => Number(x.humidity_pct))) },
            n: near.length
        })
    }
    return { pairs, unmatched }
}

// ตัวเลขความคลาดของตัวแปรเดียว (คู่ [ระบบ, อ้างอิง])
const errorStats = (xs) => {
    const v = xs.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    if (!v.length) return { n: 0 }
    const d = v.map(([a, b]) => a - b)
    const sys = v.map(x => x[0]), ref = v.map(x => x[1])
    const ms = mean(sys), mr = mean(ref)
    const cov = v.reduce((acc, [a, b]) => acc + (a - ms) * (b - mr), 0)
    const vs = sys.reduce((acc, a) => acc + (a - ms) ** 2, 0)
    const vr = ref.reduce((acc, b) => acc + (b - mr) ** 2, 0)
    const slope = vr > 0 ? cov / vr : null
    return {
        n: v.length,
        bias: r2(mean(d)),
        mae: r2(mean(d.map(Math.abs))),
        rmse: r2(Math.sqrt(mean(d.map(x => x * x)))),
        max_abs: r2(Math.max(...d.map(Math.abs))),
        r: vs > 0 && vr > 0 ? r3(cov / Math.sqrt(vs * vr)) : null,
        slope: r3(slope),
        intercept: slope == null ? null : r2(ms - slope * mr),
        ref_range: [r2(Math.min(...ref)), r2(Math.max(...ref))]
    }
}

/**
 * รายงานทั้งหมด
 * @param {string} profile  ระดับความเสี่ยงของฟาร์ม (default | high_hf) ใช้เทียบว่าเตือนระดับเดียวกันไหม
 */
const compareSensor = (ref, sys, { toleranceSec = 60, profile = 'default' } = {}) => {
    const { pairs, unmatched } = pairReadings(ref, sys, toleranceSec)
    const thi = pairs.map(p => [calcThi(p.sys.T, p.sys.RH), calcThi(p.ref.T, p.ref.RH)])
    const sameLevel = thi.filter(([a, b]) => a != null && b != null && getRiskLevel(a, profile) === getRiskLevel(b, profile)).length
    return {
        pairs: pairs.length,
        unmatched: unmatched.length,
        unmatched_times: unmatched.map(t => new Date(t).toISOString()),
        tolerance_sec: toleranceSec,
        temperature_c: errorStats(pairs.map(p => [p.sys.T, p.ref.T])),
        humidity_pct: errorStats(pairs.map(p => [p.sys.RH, p.ref.RH])),
        thi: errorStats(thi),
        risk_level_agreement_pct: thi.length ? Math.round((sameLevel / thi.length) * 1000) / 10 : null,
        rows: pairs.map((p, i) => ({ t: new Date(p.t).toISOString(), ref_T: r2(p.ref.T), sys_T: r2(p.sys.T), ref_RH: r2(p.ref.RH), sys_RH: r2(p.sys.RH), ref_THI: r2(thi[i][1]), sys_THI: r2(thi[i][0]), n_sys: p.n }))
    }
}

module.exports = { pairReadings, errorStats, compareSensor }
