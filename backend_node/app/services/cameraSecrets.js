/**
 * เข้ารหัสรหัสผ่านกล้องก่อนเก็บลง DB (AES-256-GCM)
 * กุญแจอยู่ใน env CAMERA_SECRET_KEY ของ server เท่านั้น (hex 64 ตัว สร้างด้วย: openssl rand -hex 32)
 * ถ้า DB หลุด รหัสกล้องยังอ่านไม่ได้ถ้าไม่มีกุญแจ
 *
 * รูปแบบที่เก็บ: v1:<iv>:<tag>:<ciphertext> (base64)
 * ค่าที่ไม่มี v1: นำหน้า = ค่าเก่าก่อนมีระบบนี้ (ข้อความธรรมดา) อ่านได้จนกว่าจะบันทึกรหัสใหม่
 */
const crypto = require('crypto')

const PREFIX = 'v1:'

class CameraSecretError extends Error {}

const getKey = () => {
    const raw = String(process.env.CAMERA_SECRET_KEY || '').trim()
    return /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : null
}

const isConfigured = () => Boolean(getKey())

const encryptSecret = (plain) => {
    const key = getKey()
    if (!key) throw new CameraSecretError('ยังไม่ได้ตั้ง CAMERA_SECRET_KEY บน server จึงบันทึกรหัสกล้องไม่ได้')
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
    return `${PREFIX}${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ct.toString('base64')}`
}

const decryptSecret = (stored) => {
    if (!stored) return ''
    const s = String(stored)
    if (!s.startsWith(PREFIX)) return s
    const key = getKey()
    if (!key) throw new CameraSecretError('ยังไม่ได้ตั้ง CAMERA_SECRET_KEY บน server จึงอ่านรหัสกล้องไม่ได้')
    const [iv, tag, ct] = s.slice(PREFIX.length).split(':').map(p => Buffer.from(p, 'base64'))
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(tag)
        return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
    } catch (err) {
        throw new CameraSecretError('ถอดรหัสกล้องไม่สำเร็จ (CAMERA_SECRET_KEY ไม่ตรงกับตอนบันทึก)')
    }
}

module.exports = { encryptSecret, decryptSecret, isConfigured, CameraSecretError }
