/**
 * ตัวเลขฝั่งฮาร์ดแวร์สำหรับเปเปอร์ (scripts/hardware_report.js) ฟังก์ชันล้วน ไม่แตะฐานข้อมูล
 * เทสต์: scripts/test_hardware_stats.js
 *
 * แหล่งข้อมูล (migration 20261125):
 *   tb_device_heartbeats  ทุก heartbeat (กล่องส่งทุก 5 นาที)  -> ความต่อเนื่อง การรีบูต สัญญาณ Wi-Fi หน่วยความจำ
 *   tb_sensor_readings    recorded_at (กล่องวัด) + received_at (server ได้รับ) -> ความครบ ความหน่วง ค่าที่ส่งย้อนหลัง
 *   tb_camera_frames      captured_at + received_at + bytes + status -> ความครบของภาพ ปริมาณเน็ต ความหน่วง
 */
const { coverage, percentile, summarizeSeconds, SENSOR_INTERVAL_SEC } = require('./rehearsalStats')

const HEARTBEAT_SEC = 300
const OFFLINE_AFTER_SEC = 15 * 60          // ไม่มี heartbeat เกิน 15 นาที = กล่องขาดการติดต่อ (เกณฑ์เดียวกับระบบแจ้งเตือน)
const LATE_SEC = 60                        // ค่าเซ็นเซอร์ถึง server ช้ากว่านี้ = ส่งย้อนหลังจากคิว (ตอนเน็ตหลุด)
const round1 = (x) => Math.round(x * 10) / 10
const round2 = (x) => Math.round(x * 100) / 100
const toMs = (t) => (t instanceof Date ? t.getTime() : new Date(t).getTime())
const pct = (a, b) => (b > 0 ? round1((a / b) * 100) : null)
const inWindow = (t, from, to) => { const m = toMs(t); return Number.isFinite(m) && m >= toMs(from) && m < toMs(to) }
const summarize = (values) => {
    const v = values.filter(Number.isFinite)
    if (!v.length) return { n: 0, min: null, median: null, max: null }
    return { n: v.length, min: Math.min(...v), median: round1(percentile(v, 0.5)), max: Math.max(...v) }
}

/**
 * ช่วงที่กล่องขาดการติดต่อ (ไม่มี heartbeat เกิน OFFLINE_AFTER_SEC) รวมขอบต้น/ท้ายช่วง
 * ความพร้อมใช้งาน = 1 - เวลาที่ขาดการติดต่อ / ช่วงเวลาทั้งหมด
 */
const availability = (times, from, to, offlineAfterSec = OFFLINE_AFTER_SEC) => {
    const start = toMs(from), end = toMs(to)
    const ts = times.map(toMs).filter(t => Number.isFinite(t) && t >= start && t < end).sort((a, b) => a - b)
    const points = [start, ...ts, end]
    const outages = []
    let offlineMs = 0
    for (let i = 1; i < points.length; i++) {
        const gap = points[i] - points[i - 1]
        if (gap > offlineAfterSec * 1000) {
            // ช่วงที่ "ควร" มี heartbeat แต่ไม่มี: นับเวลาที่เกินรอบปกติ 1 รอบ
            const lost = gap - HEARTBEAT_SEC * 1000
            offlineMs += lost
            outages.push({ from: new Date(points[i - 1]), to: new Date(points[i]), min: round1(gap / 60000) })
        }
    }
    const windowMs = Math.max(1, end - start)
    return { pct: round2(Math.max(0, 100 - (offlineMs / windowMs) * 100)), offline_min: round1(offlineMs / 60000), outages }
}

/**
 * heartbeat: ความต่อเนื่อง การรีบูต (uptime ลดลง = เพิ่งเปิดเครื่องใหม่) สัญญาณ Wi-Fi หน่วยความจำ คิวค้าง
 * rows: [{ received_at, health: { uptime_s, rssi, min_free_heap, queue, reset_reason, i2c_recoveries, fw_version, sensor_model, wifi_reconnects } }]
 */
const heartbeatStats = (rows, from, to) => {
    const hb = rows.filter(r => inWindow(r.received_at, from, to)).sort((a, b) => toMs(a.received_at) - toMs(b.received_at))
    const cov = coverage(hb.map(r => r.received_at), from, to, HEARTBEAT_SEC)
    const reboots = []
    for (let i = 0; i < hb.length; i++) {
        const h = hb[i].health || {}
        const prev = i > 0 ? hb[i - 1].health || {} : null
        const restarted = prev ? (Number.isFinite(h.uptime_s) && Number.isFinite(prev.uptime_s) && h.uptime_s < prev.uptime_s)
            // heartbeat แรกในช่วง: เปิดเครื่องหลังเริ่มช่วงเวลา = รีบูตในช่วงนี้
            : (Number.isFinite(h.uptime_s) && toMs(hb[i].received_at) - h.uptime_s * 1000 > toMs(from))
        if (restarted) reboots.push({ at: new Date(toMs(hb[i].received_at) - (h.uptime_s || 0) * 1000), reason: h.reset_reason || 'unknown' })
    }
    const byReason = {}
    for (const r of reboots) byReason[r.reason] = (byReason[r.reason] || 0) + 1
    const H = hb.map(r => r.health || {})
    const uniq = (k) => [...new Set(H.map(h => h[k]).filter(Boolean))]
    const maxOf = (k) => { const v = H.map(h => h[k]).filter(Number.isFinite); return v.length ? Math.max(...v) : null }
    return {
        count: hb.length,
        expected: cov.expected,
        pct: pct(hb.length, cov.expected),
        availability: availability(hb.map(r => r.received_at), from, to),
        reboots: { count: reboots.length, by_reason: byReason, events: reboots },
        rssi: summarize(H.map(h => h.rssi)),
        min_free_heap: (() => { const v = H.map(h => h.min_free_heap).filter(Number.isFinite); return v.length ? Math.min(...v) : null })(),
        queue_max: maxOf('queue'),
        i2c_recoveries_max: maxOf('i2c_recoveries'),
        wifi_reconnects_max: maxOf('wifi_reconnects'),
        fw_versions: uniq('fw_version'),
        sensor_models: uniq('sensor_model')
    }
}

/**
 * ค่าเซ็นเซอร์: ความครบ (ควรมาทุก 15 วิ) ความหน่วงจากกล่องวัดถึง server ได้รับ ค่าที่ส่งย้อนหลังจากคิว
 * rows: [{ recorded_at, received_at }]  received_at ว่าง = แถวก่อน migration 20261125 (ไม่นับความหน่วง)
 */
const sensorStats = (rows, from, to) => {
    const r = rows.filter(x => inWindow(x.recorded_at, from, to))
    const cov = coverage(r.map(x => x.recorded_at), from, to, SENSOR_INTERVAL_SEC)
    const delays = r.filter(x => x.received_at).map(x => toMs(x.received_at) - toMs(x.recorded_at)).filter(d => d >= -5000)
    return {
        count: r.length,
        expected: cov.expected,
        pct: pct(Math.min(r.length, cov.expected), cov.expected),
        longest_gap_min: cov.longest_gap.min,
        delay_sec: summarizeSeconds(delays.map(d => Math.max(0, d))),
        late: { count: delays.filter(d => d > LATE_SEC * 1000).length, pct: pct(delays.filter(d => d > LATE_SEC * 1000).length, delays.length) }
    }
}

/**
 * ภาพจากกล้องที่ถึง server: ความครบ (ตามรอบถ่าย) รับไปประมวลผล/server ยุ่ง ขนาด ปริมาณเน็ตต่อวัน ความหน่วง
 * rows: [{ captured_at, received_at, bytes, status }]
 */
const frameStats = (rows, from, to, intervalSec) => {
    const r = rows.filter(x => inWindow(x.captured_at, from, to))
    const cov = coverage(r.map(x => x.captured_at), from, to, intervalSec)
    const bytes = r.map(x => Number(x.bytes)).filter(Number.isFinite)
    const total = bytes.reduce((a, b) => a + b, 0)
    const windowDays = Math.max(1e-9, (toMs(to) - toMs(from)) / 86400e3)
    const busy = r.filter(x => x.status === 'busy').length
    return {
        count: r.length,
        expected: cov.expected,
        pct: pct(Math.min(r.length, cov.expected), cov.expected),
        longest_gap_min: cov.longest_gap.min,
        accepted: r.length - busy,
        busy,
        busy_pct: pct(busy, r.length),
        image_kb: summarize(bytes.map(b => round1(b / 1024))),
        total_mb: round2(total / 1048576),
        mb_per_day: round1(total / 1048576 / windowDays),
        delay_sec: summarizeSeconds(r.map(x => Math.max(0, toMs(x.received_at) - toMs(x.captured_at))))
    }
}

/**
 * ปริมาณเน็ตต่อวันของกล่อง: ภาพ = วัดจริง (ขนาดไฟล์) · ค่าเซ็นเซอร์/heartbeat = ประมาณจากจำนวนคำขอ
 * (HTTPS + header + JSON ต่อคำขอประมาณ 1 KB เป็นค่าประมาณ ไม่ได้วัด)
 */
const REQUEST_KB_ESTIMATE = 1
const bandwidthPerDay = ({ frames, sensor, heartbeats }, from, to) => {
    const days = Math.max(1e-9, (toMs(to) - toMs(from)) / 86400e3)
    const imagesMb = frames ? frames.mb_per_day : 0
    const requests = ((sensor?.count || 0) + (heartbeats?.count || 0)) / days
    const otherMb = round1((requests * REQUEST_KB_ESTIMATE) / 1024)
    return { images_mb: imagesMb, other_mb_estimate: otherMb, total_mb: round1(imagesMb + otherMb), month_gb: round2(((imagesMb + otherMb) * 30) / 1024) }
}

module.exports = { HEARTBEAT_SEC, OFFLINE_AFTER_SEC, LATE_SEC, availability, heartbeatStats, sensorStats, frameStats, bandwidthPerDay }
