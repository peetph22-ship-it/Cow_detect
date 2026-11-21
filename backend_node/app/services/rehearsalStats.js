/**
 * ตัวเลขของรายงานซ้อม (scripts/rehearsal_report.js) ใช้ทั้งระยะ 1 และด่านไป/ไม่ไประยะ 3
 * ฟังก์ชันล้วน ไม่แตะฐานข้อมูล (เทสต์: scripts/test_rehearsal_stats.js)
 */

// เกณฑ์จาก docs/PROJECT_PLAN.md (ระยะ 1, หัวข้อ 5 และด่านระยะ 3)
const CRITERIA = {
    minWindowMin: 60,       // ซ้อมอย่างน้อย 1 ชม.
    sensorPct: 95,          // ค่าเซ็นเซอร์ครบ (กล่องส่งทุก 15 วินาที มีคิวเก็บค่าตอนเน็ตหลุด)
    maxGapMin: 15,          // ไม่หลุดเกิน 15 นาที (= เกณฑ์ "ขาดการติดต่อ" ของระบบ)
    cameraPct: 95,          // ภาพเข้าครบ
    maxProcessSec: 40,      // เกินนี้ = ควรอัปเกรด Render หรือรัน backend บน laptop
    maxBusyPct: 10          // server ตอบ "ยุ่ง" เกินนี้ = ควรอัปเกรด
}

const SENSOR_INTERVAL_SEC = 15

const round1 = (x) => Math.round(x * 10) / 10
const toMs = (t) => (t instanceof Date ? t.getTime() : new Date(t).getTime())

/**
 * ความครบถ้วนของข้อมูลที่ควรมาทุก intervalSec วินาทีในช่วง [from, to)
 * ช่องว่างนับรวมต้นช่วงถึงค่าแรก และค่าสุดท้ายถึงท้ายช่วง
 * missing_gaps = ช่วงที่ขาดอย่างน้อย 1 ค่า (ห่างเกิน 1.5 เท่าของรอบ) เรียงตามเวลา
 */
const coverage = (times, from, to, intervalSec) => {
    const start = toMs(from)
    const end = toMs(to)
    const ts = times.map(toMs).filter(t => Number.isFinite(t) && t >= start && t < end).sort((a, b) => a - b)
    const windowSec = Math.max(0, (end - start) / 1000)
    const expected = intervalSec > 0 ? Math.floor(windowSec / intervalSec) : 0
    const points = [start, ...ts, end]
    let longest = { sec: 0, from: null, to: null }
    const missingGaps = []
    for (let i = 1; i < points.length; i++) {
        const sec = (points[i] - points[i - 1]) / 1000
        if (sec > longest.sec) longest = { sec, from: new Date(points[i - 1]), to: new Date(points[i]) }
        if (intervalSec > 0 && sec > intervalSec * 1.5) {
            // ระหว่างค่าที่ได้จริงสองค่า: ขาด round(ช่วง/รอบ) - 1 ค่า, ช่วงติดขอบเวลา (ต้น/ท้าย): ขาด floor(ช่วง/รอบ) ค่า
            const edge = i === 1 || i === points.length - 1
            const missing = edge ? Math.floor(sec / intervalSec) : Math.round(sec / intervalSec) - 1
            if (missing >= 1) missingGaps.push({ from: new Date(points[i - 1]), to: new Date(points[i]), sec, missing })
        }
    }
    return {
        count: ts.length,
        expected,
        pct: expected > 0 ? Math.min(100, round1((ts.length / expected) * 100)) : null,
        window_min: round1(windowSec / 60),
        longest_gap: { min: round1(longest.sec / 60), from: longest.from, to: longest.to },
        missing_gaps: missingGaps
    }
}

// percentile แบบ linear interpolation (p = 0–1), ไม่มีค่า = null
const percentile = (values, p) => {
    const v = values.filter(Number.isFinite).sort((a, b) => a - b)
    if (!v.length) return null
    const idx = (v.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    return v[lo] + (v[hi] - v[lo]) * (idx - lo)
}

// สรุปเวลา (มิลลิวินาที) เป็นวินาที: จำนวน มัธยฐาน p90 สูงสุด
const summarizeSeconds = (msValues) => {
    // null/ว่าง = ไม่มีเวลา (Number(null) = 0 จะทำให้มัธยฐานต่ำเกินจริง)
    const v = msValues.filter(x => x !== null && x !== undefined && x !== '').map(Number).filter(x => Number.isFinite(x) && x >= 0)
    if (!v.length) return { n: 0, median: null, p90: null, max: null }
    const s = (x) => round1(x / 1000)
    return { n: v.length, median: s(percentile(v, 0.5)), p90: s(percentile(v, 0.9)), max: s(Math.max(...v)) }
}

/**
 * แยกภาพที่ควรได้ออกเป็น: ประมวลผลแล้ว / ถึง server แต่ยุ่งหรือผิดพลาด / หายก่อนถึง server
 * received = ภาพที่เก็บได้ในโหมดเก็บทุกภาพ (null = ไม่ได้เปิดโหมดนี้ แยกไม่ได้ว่ายุ่งหรือหาย)
 */
const cameraBreakdown = ({ expected, processed, received = null }) => {
    if (received == null) {
        const lostOrBusy = Math.max(0, expected - processed)
        return { expected, processed, received: null, busy_or_error: null, lost: null, lost_or_busy: lostOrBusy, busy_pct: null }
    }
    const busy = Math.max(0, received - processed)
    return {
        expected,
        processed,
        received,
        busy_or_error: busy,
        lost: Math.max(0, expected - received),
        lost_or_busy: Math.max(0, expected - processed),
        busy_pct: received > 0 ? round1((busy / received) * 100) : null
    }
}

/**
 * ตัดสินตามเกณฑ์ (ok: true/false, null = ไม่มีข้อมูลพอจะตัดสิน)
 * input: { window_min, sensor: coverage, camera: coverage, breakdown, processing: { model, end_to_end } }
 */
const judge = ({ window_min, sensor, camera, breakdown, processing }) => {
    const c = CRITERIA
    const checks = []
    checks.push({
        key: 'window',
        label: `ซ้อมนานพอ (≥ ${c.minWindowMin} นาที)`,
        ok: window_min >= c.minWindowMin,
        detail: `${window_min} นาที`
    })
    checks.push({
        key: 'sensor',
        label: `เซ็นเซอร์ครบ ≥ ${c.sensorPct}% และไม่หลุดเกิน ${c.maxGapMin} นาที`,
        ok: sensor && sensor.pct != null ? sensor.pct >= c.sensorPct && sensor.longest_gap.min < c.maxGapMin : null,
        detail: sensor && sensor.pct != null ? `${sensor.count}/${sensor.expected} ค่า (${sensor.pct}%) · หลุดนานสุด ${sensor.longest_gap.min} นาที` : 'ไม่มีข้อมูล'
    })
    checks.push({
        key: 'camera',
        label: `ภาพเข้าครบ ≥ ${c.cameraPct}%`,
        ok: camera && camera.pct != null ? camera.pct >= c.cameraPct : null,
        detail: camera && camera.pct != null ? `${camera.count}/${camera.expected} ภาพ (${camera.pct}%)` : 'ไม่มีข้อมูล'
    })
    const model = processing?.model
    checks.push({
        key: 'processing',
        label: `ประมวลผล ≤ ${c.maxProcessSec} วิ/ภาพ (มัธยฐาน)`,
        ok: model && model.median != null ? model.median <= c.maxProcessSec : null,
        detail: model && model.median != null ? `มัธยฐาน ${model.median} วิ · p90 ${model.p90} วิ (${model.n} ภาพ)` : 'ไม่มีเวลาประมวลผล (ต้องเป็นภาพหลัง deploy เวอร์ชันนี้)'
    })
    checks.push({
        key: 'busy',
        label: `server ตอบ "ยุ่ง" ≤ ${c.maxBusyPct}%`,
        ok: breakdown && breakdown.busy_pct != null ? breakdown.busy_pct <= c.maxBusyPct : null,
        detail: breakdown && breakdown.busy_pct != null
            ? `${breakdown.busy_or_error}/${breakdown.received} ภาพ (${breakdown.busy_pct}%)`
            : 'แยกไม่ได้: เปิดโหมดเก็บภาพทุกภาพระหว่างซ้อมจึงจะนับได้'
    })
    return checks
}

module.exports = { CRITERIA, SENSOR_INTERVAL_SEC, coverage, percentile, summarizeSeconds, cameraBreakdown, judge }
