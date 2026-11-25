/**
 * สถานะกล้อง (ออนไลน์/ขาดการติดต่อ) จากรอบถ่ายภาพจริงของกล่อง ไม่ใช่ค่าคงที่ 10 นาที
 * - รอบถ่ายภาพ = tb_devices.camera_interval_sec ของกล่องที่ผูกกับฟาร์ม (ตั้งจากหน้าเว็บ 15–3600 วิ)
 *   ไม่ได้ตั้ง = ค่าในเฟิร์มแวร์ (env CAMERA_INTERVAL_MIN, ค่าเริ่มต้น 10 นาที)
 * - ขาดการติดต่อ = ไม่มีภาพใหม่เกิน 4 รอบ (อย่างน้อย 5 นาที กันกระพริบตอน server ยุ่งข้ามบางภาพ)
 * - ภาพล่าสุด = ภาพที่ถึง server ล่าสุด (tb_camera_frames ถ้ามี รวมภาพที่ server ยุ่ง) หรือผลโมเดลล่าสุด
 */
const DEFAULT_INTERVAL_SEC = Math.max(1, Number(process.env.CAMERA_INTERVAL_MIN) || 10) * 60
const MIN_OFFLINE_SEC = 300

const offlineAfterSec = (intervalSec) => Math.max(MIN_OFFLINE_SEC, 4 * (Number(intervalSec) || DEFAULT_INTERVAL_SEC))

const latestOf = (...times) => {
    const ms = times.filter(Boolean).map(t => new Date(t).getTime()).filter(Number.isFinite)
    return ms.length ? new Date(Math.max(...ms)) : null
}

// status: no_data | online | offline
const cameraStatus = (lastImageAt, intervalSec, now = Date.now()) => {
    const interval = Number(intervalSec) || DEFAULT_INTERVAL_SEC
    const off = offlineAfterSec(interval)
    if (!lastImageAt) return { status: 'no_data', seconds_ago: null, interval_sec: interval, offline_after_sec: off }
    const s = Math.max(0, Math.round((now - new Date(lastImageAt).getTime()) / 1000))
    return { status: s <= off ? 'online' : 'offline', seconds_ago: s, interval_sec: interval, offline_after_sec: off }
}

const agoText = (sec) => {
    if (sec == null) return ''
    if (sec < 60) return `${sec} วินาทีที่แล้ว`
    if (sec < 3600) return `${Math.round(sec / 60)} นาทีที่แล้ว`
    if (sec < 86400) return `${Math.floor(sec / 3600)} ชม. ${Math.round((sec % 3600) / 60)} นาทีที่แล้ว`
    return `${Math.floor(sec / 86400)} วันที่แล้ว`
}

// ภาพที่ถึง server ล่าสุดของแต่ละฟาร์ม (ยังไม่รัน migration 20261125 = {} ใช้ผลโมเดลแทน)
const lastFrameByFarm = async (db, farmId = null) => {
    try {
        const { rows } = await db.query(
            `SELECT id_farms, MAX(received_at) AS last_frame_at FROM tb_camera_frames
             WHERE received_at > NOW() - INTERVAL '7 days' ${farmId ? 'AND id_farms = $1' : ''} GROUP BY id_farms`,
            farmId ? [farmId] : [])
        return Object.fromEntries(rows.map(r => [String(r.id_farms), r.last_frame_at]))
    } catch (err) {
        if (err.code !== '42P01') console.warn('[CameraStatus] last frame query failed:', err.message)
        return {}
    }
}

module.exports = { cameraStatus, offlineAfterSec, agoText, latestOf, lastFrameByFarm, DEFAULT_INTERVAL_SEC }
