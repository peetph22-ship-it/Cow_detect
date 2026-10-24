const express = require('express')
const router = express.Router()
const db = require('../config/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.SECRET_KEY
const { verifyToken, requireRole } = require('../middleware/authMiddleware')

const ROLES = ['admin', 'farmer', 'expert']
const STATUSES = ['pending', 'active', 'suspended']
const { checkPassword } = require('../services/passwordPolicy')

// POST: Login API
router.post('/login', async (req, res) => {
    try {
        const identifier = (req.body.email || req.body.phone || req.body.username || '').trim()
        const password = req.body.password
        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์ และรหัสผ่าน' 
            })
        }
        const { rows } = await db.query(
            'SELECT * FROM tb_users WHERE email = $1 OR phone = $1 LIMIT 1', 
            [identifier]
        )
        const user = rows[0]
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'อีเมล/เบอร์โทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง' 
            })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'อีเมล/เบอร์โทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง'
            })
        }

        // 🔒 ตรวจสอบสถานะผู้ใช้งาน (Active Only)
        if (user.status === 'suspended') {
            return res.status(403).json({
                success: false,
                message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
            })
        }
        if (user.status === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'บัญชีนี้อยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ'
            })
        }
        if (user.status && user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: `บัญชีของคุณยังไม่สามารถเข้าใช้งานได้ (สถานะ: ${user.status})`
            })
        }

        const token = jwt.sign(
            { id: user.id_users, email: user.email, role: user.role, status: user.status },
            SECRET_KEY,
            { expiresIn: '7d' }
        )

        // 6. อัปเดตเวลาเข้าสู่ระบบล่าสุด (อัปเดตแบบ background)
        db.query('UPDATE tb_users SET last_login_at = NOW() WHERE id_users = $1', [user.id_users])
            .catch(err => console.error('Error updating last_login_at:', err.message))

        return res.status(200).json({
            success: true,
            message: 'Login Success!',
            token,
            user: {
                id: user.id_users,
                id_users: user.id_users,
                email: user.email,
                name: user.name_users,
                full_name: user.name_users,
                name_users: user.name_users,
                role: user.role,
                status: user.status
            }
        })

    } catch (err) {
        console.error("Login Error:", err.message)
        return res.status(500).json({
            success: false,
            message: 'Server Error!'
        })
    }
})

// POST: Logout API
router.post('/logout', async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Logout Success!'
        })
    } catch (err) {
        console.error("Logout Error:", err.message)
        return res.status(500).json({
            success: false,
            message: 'Server Error during logout'
        })
    }
})

// POST: สร้างบัญชี (เฉพาะ admin ที่ login แล้ว) เดิมเปิดให้ทุกคนสมัครเป็น admin เองได้
router.post('/register', verifyToken, requireRole('admin'), async(req,res) => {
    try{
        const { email,full_name,phone,password,role,organization,status } = req.body
        if(!full_name || !phone || !password || !role ) return res.status(400).json({
            success:false,
            message:'Please Enter your [full_name,phone,password,role]'
        })
        if (!ROLES.includes(role)) return res.status(400).json({ success: false, message: `role ต้องเป็น ${ROLES.join(' / ')}` })
        if (status && !STATUSES.includes(status)) return res.status(400).json({ success: false, message: `status ต้องเป็น ${STATUSES.join(' / ')}` })
        const passwordError = checkPassword(password, phone)
        if (passwordError) return res.status(400).json({ success: false, message: passwordError })

        const userStatus = status || 'active'
        const hash = await bcrypt.hash(password, 10)
        const { rows } = await db.query(
            `insert into tb_users (email,name_users,phone,password,role,organization,status,created_at) values($1,$2,$3,$4,$5,$6,$7,NOW()) returning id_users,email,name_users,phone,role,organization,status`,
            [email || null, full_name, phone, hash, role, organization || null, userStatus]
        )
        return res.status(200).json({
            user: rows[0],
            success: true,
            message: 'Register Success!'
        })
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'This phone or email is already registered!'
            })
        }
        console.log("Error!, Register False!", err.message)
        res.status(500).json({
            success: false,
            message: 'Error!, Register False!'
        })
    }
})

module.exports = router
