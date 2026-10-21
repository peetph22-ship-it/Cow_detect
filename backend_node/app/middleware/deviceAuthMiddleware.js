const crypto = require('crypto')
const db = require('../config/db')

// DEVICE_AUTH_MODE:
//   warn    (default) - ยังรับข้อมูลทุก request แต่ log เตือนเมื่อ key ไม่ถูกต้อง (ช่วงรอแฟลช firmware)
//   enforce           - ปฏิเสธ request ที่ไม่มี key หรือ key ไม่ถูกต้อง (401)
const getMode = () => (process.env.DEVICE_AUTH_MODE || 'warn').trim().toLowerCase()

// key สุ่ม 32 bytes มี entropy สูงพอ ใช้ SHA-256 ได้เลย ไม่ต้องใช้ bcrypt (ซึ่งช้าโดยตั้งใจ)
exports.hashDeviceKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex')

exports.generateDeviceKey = () => 'ccdev_' + crypto.randomBytes(32).toString('base64url')

const keysMatch = (key, storedHash) => {
    const a = Buffer.from(exports.hashDeviceKey(key), 'hex')
    const b = Buffer.from(String(storedHash), 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

exports.verifyDeviceKey = async (req, res, next) => {
    const enforce = getMode() === 'enforce'
    // serial มาจาก JSON body หรือ header X-Device-Serial (เช่น endpoint รับภาพที่ body เป็น JPEG)
    const serial = String((req.body && req.body.serial_no) || req.get('X-Device-Serial') || '').trim().toUpperCase()
    const key = req.get('X-Device-Key')

    // enforce: ตอบข้อความเดียวกันทุกกรณี ไม่บอกว่าผิดที่ serial หรือ key
    const fail = (reason) => {
        if (enforce) {
            console.warn(`[DeviceAuth BLOCK] ${reason} (serial=${serial || '-'}, ip=${req.ip})`)
            return res.status(401).json({ success: false, message: 'Unauthorized device' })
        }
        console.warn(`[DeviceAuth WARN] ${reason} (serial=${serial || '-'}, ip=${req.ip}) - allowed because DEVICE_AUTH_MODE=warn`)
        return next()
    }

    if (!serial) return fail('missing serial_no')
    if (!key) return fail('missing X-Device-Key header')

    try {
        const devRes = await db.query(
            `SELECT id_devices, id_farms, api_key_hash FROM tb_devices WHERE UPPER(serial_no) = $1 LIMIT 1`,
            [serial]
        )
        const device = devRes.rows[0]

        if (!device) return fail('unknown serial_no')
        if (!device.api_key_hash) return fail('device has no API key yet')
        if (!keysMatch(key, device.api_key_hash)) return fail('invalid X-Device-Key')

        req.device = { id: device.id_devices, farmId: device.id_farms, serial }
        return next()
    } catch (err) {
        // เช่น ยังไม่ได้รัน migration (ไม่มีคอลัมน์ api_key_hash) หรือ DB ล่ม
        console.error('[DeviceAuth Error]:', err.message)
        if (enforce) return res.status(503).json({ success: false, message: 'Device authentication unavailable' })
        return next()
    }
}
