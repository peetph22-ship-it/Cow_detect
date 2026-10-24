/**
 * กฎรหัสผ่านบัญชี (ตรงกับ frontend/app/utils/password.ts)
 * admin ตั้งให้ตอนสร้างบัญชี และตั้งใหม่ได้เมื่อผู้ใช้ลืม (ไม่มีรหัสเริ่มต้นเป็นเบอร์โทรแล้ว)
 */
const PASSWORD_MIN = 6

const checkPassword = (password, phone) => {
    const p = String(password || '')
    if (p.length < PASSWORD_MIN) return `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`
    if (phone && p === String(phone).trim()) return 'ห้ามใช้เบอร์โทรเป็นรหัสผ่าน'
    return null
}

module.exports = { PASSWORD_MIN, checkPassword }
