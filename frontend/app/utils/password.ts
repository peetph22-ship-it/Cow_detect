/**
 * กฎรหัสผ่านบัญชี (ต้องตรงกับ backend_node/app/routes/authRouter.js และ Admin/users.js)
 * admin ตั้งให้ตอนสร้างบัญชี และตั้งใหม่ได้เมื่อเกษตรกรลืม
 */
export const PASSWORD_MIN = 6

export const checkPassword = (password: string, phone?: string): string | null => {
  const p = String(password || '')
  if (p.length < PASSWORD_MIN) return `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`
  if (phone && p === String(phone).trim()) return 'ห้ามใช้เบอร์โทรเป็นรหัสผ่าน (ใครรู้เบอร์ก็เข้าบัญชีได้)'
  return null
}
