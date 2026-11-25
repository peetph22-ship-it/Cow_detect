/**
 * สรุปสถานะกล่องเซ็นเซอร์จาก heartbeat (firmware 1.4.0+) + เวลาค่าล่าสุด
 * ใช้แยกให้ออกว่าเสียที่ "เน็ต/ไฟ" หรือ "ตัวเซ็นเซอร์" หรือ "ส่งข้อมูลค้าง"
 */
const HEARTBEAT_EVERY_MIN = 5
const OFFLINE_AFTER_MIN = HEARTBEAT_EVERY_MIN * 3   // พลาด 3 รอบ
const READING_STALE_MIN = 5                         // ค่าใหม่ทุก 15 วินาที

// รับเฉพาะ field ที่รู้จัก และจำกัดขนาด กัน payload แปลกๆ ลง DB
const num = (v, min, max) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : null)
const bool = (v) => (typeof v === 'boolean' ? v : null)
const str = (v, len = 32) => (v == null ? null : String(v).replace(/[^\w.\-]/g, '').slice(0, len) || null)

const sanitizeHeartbeat = (b = {}) => ({
    fw_version: str(b.fw_version, 16),
    uptime_s: num(b.uptime_s, 0, 1e9),
    rssi: num(b.rssi, -127, 0),
    free_heap: num(b.free_heap, 0, 1e9),
    min_free_heap: num(b.min_free_heap, 0, 1e9),
    psram_free: num(b.psram_free, 0, 1e10),
    queue: num(b.queue, 0, 1e7),
    pending: num(b.pending, 0, 1e5),
    fs_ok: bool(b.fs_ok),
    sensor_ok: bool(b.sensor_ok),
    sensor_ok_reads: num(b.sensor_ok_reads, 0, 1e7),
    sensor_fail_reads: num(b.sensor_fail_reads, 0, 1e7),
    sensor_last_ok_s: num(b.sensor_last_ok_s, -1, 1e9),
    last_http_code: num(b.last_http_code, -100, 999),
    wifi_reconnects: num(b.wifi_reconnects, 0, 1e7),
    reset_reason: str(b.reset_reason, 20),
    camera_enabled: bool(b.camera_enabled),
    camera_status: num(b.camera_status, 0, 9),
    tls: str(b.tls, 10),
    // firmware 1.6.0+: SHT40 I2C + watchdog
    sensor_model: str(b.sensor_model, 16),
    sensor_serial: str(b.sensor_serial, 16),
    i2c_recoveries: num(b.i2c_recoveries, 0, 1e7),
    last_server_ok_s: num(b.last_server_ok_s, -1, 1e9),
    camera_last_round_s: num(b.camera_last_round_s, -1, 1e9)
})

const signalLabel = (rssi) => (rssi == null ? null : rssi >= -60 ? 'ดีมาก' : rssi >= -70 ? 'ดี' : rssi >= -80 ? 'พอใช้' : 'อ่อน')

const minutesSince = (t) => (t ? Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 60000)) : null)

/**
 * status: ok | sensor_fault | backlog | offline | no_heartbeat (firmware เก่า) | never_seen
 */
const summarizeHealth = ({ last_heartbeat_at, health, last_reading_at, last_seen_at }) => {
    const hbMin = minutesSince(last_heartbeat_at)
    const readMin = minutesSince(last_reading_at)
    const h = health || {}
    const warnings = []
    if (h.rssi != null && h.rssi < -80) warnings.push('สัญญาณ Wi-Fi อ่อน ย้ายเราเตอร์หรือกล่องให้ใกล้กันขึ้น')
    if (h.reset_reason === 'brownout') warnings.push('บอร์ดรีสตาร์ตเพราะไฟตก ตรวจอะแดปเตอร์และสายไฟ')
    if (h.reset_reason === 'crash' || h.reset_reason === 'watchdog') warnings.push('บอร์ดรีสตาร์ตเองเพราะโปรแกรมค้าง')
    if (h.fs_ok === false) warnings.push('พื้นที่เก็บคิวใช้ไม่ได้ ถ้าเน็ตหลุดข้อมูลจะหาย')
    if (h.tls === 'insecure') warnings.push('บอร์ดใช้โหมดไม่ตรวจใบรับรอง HTTPS (โหมดฉุกเฉิน)')

    let status
    let message
    if (!last_heartbeat_at) {
        const seenMin = minutesSince(last_reading_at || last_seen_at)
        status = seenMin == null ? 'never_seen' : 'no_heartbeat'
        message = seenMin == null ? 'ยังไม่เคยได้รับข้อมูลจากกล่องนี้' : 'firmware รุ่นเก่า ยังไม่ส่งสถานะกล่อง'
    } else if (hbMin > OFFLINE_AFTER_MIN) {
        status = 'offline'
        message = 'กล่องไม่ได้ติดต่อมา ตรวจไฟและอินเทอร์เน็ตที่โรงเรือน'
    } else if (h.sensor_ok === false || (h.sensor_last_ok_s != null && h.sensor_last_ok_s > 120) || h.sensor_last_ok_s === -1) {
        status = 'sensor_fault'
        message = 'กล่องออนไลน์ แต่อ่านค่าเซ็นเซอร์ไม่ได้ ตรวจสายเซ็นเซอร์ RS485'
    } else if ((h.queue || 0) + (h.pending || 0) > 40 || (readMin != null && readMin > READING_STALE_MIN)) {
        status = 'backlog'
        message = 'กล่องอ่านค่าได้ แต่ส่งข้อมูลขึ้นระบบไม่ทัน (ข้อมูลยังเก็บอยู่ในกล่อง)'
    } else {
        status = 'ok'
        message = 'ทำงานปกติ'
    }

    return {
        status,
        message,
        warnings,
        minutes_since_heartbeat: hbMin,
        minutes_since_reading: readMin,
        fw_version: h.fw_version || null,
        rssi: h.rssi ?? null,
        signal: signalLabel(h.rssi),
        queue: h.queue ?? null,
        uptime_h: h.uptime_s != null ? Math.round(h.uptime_s / 360) / 10 : null,
        reset_reason: h.reset_reason || null,
        sensor_fail_reads: h.sensor_fail_reads ?? null
    }
}

module.exports = { sanitizeHeartbeat, summarizeHealth, HEARTBEAT_EVERY_MIN }
