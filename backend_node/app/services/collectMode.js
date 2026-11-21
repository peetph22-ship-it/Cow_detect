/**
 * โหมดเก็บภาพทุกภาพ (tb_devices.collect_started_at / collect_until, migrations/20261121_device_collect_mode.sql)
 * เปิดอยู่ = collect_until อยู่หลังเวลาปัจจุบัน ภาพทุกภาพจากกล่องจะถูกเก็บไว้ที่ camera-samples/collect/...
 * (ดู services/cameraSamples.js: collectPath)
 */

// จำกัดครั้งละ 12 ชม.: ภาพละ ~300 KB ทุก 1 นาที = ~210 MB กัน Storage ฟรี (1 GB) เต็มเพราะลืมปิด
const MAX_MINUTES = 720
const DEFAULT_IMAGE_KB = 300  // ประมาณการก่อนมีภาพจริง (ภาพนิ่งจากกล้อง Dahua ตามที่เฟิร์มแวร์ประมาณไว้)

// 0 = หยุด, 1–720 = เปิด/ต่อเวลานับจากตอนนี้, อย่างอื่น = null (ผิดรูปแบบ)
const parseCollectMinutes = (value) => {
    if (value === '' || value === null || value === undefined || typeof value === 'boolean') return null
    const n = Number(value)
    return Number.isInteger(n) && n >= 0 && n <= MAX_MINUTES ? n : null
}

const toDate = (v) => {
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
}

// สถานะสำหรับหน้าเว็บ (row = แถว tb_devices ที่มี collect_started_at / collect_until)
const collectState = (row, now = new Date()) => {
    const started = toDate(row?.collect_started_at)
    const until = toDate(row?.collect_until)
    const active = Boolean(until && until > now)
    return {
        active,
        started_at: started ? started.toISOString() : null,
        until: until ? until.toISOString() : null,
        remaining_min: active ? Math.ceil((until - now) / 60000) : 0
    }
}

// ใช้ตอนรับภาพ: settings.collectUntil มาจาก tb_devices (ยังไม่รัน migration = null = ไม่เก็บ)
const isCollecting = (settings, now = new Date()) => {
    const until = toDate(settings?.collectUntil)
    return Boolean(until && until > now)
}

// จำนวนภาพและพื้นที่โดยประมาณ ถ้าเปิดไว้ minutes นาทีที่รอบถ่ายภาพ intervalSec วินาที
const estimateCollect = (minutes, intervalSec, imageKb = DEFAULT_IMAGE_KB) => {
    const images = intervalSec > 0 ? Math.floor((minutes * 60) / intervalSec) : 0
    return { images, mb: Math.round((images * imageKb) / 1024) }
}

module.exports = { MAX_MINUTES, DEFAULT_IMAGE_KB, parseCollectMinutes, collectState, isCollecting, estimateCollect }
