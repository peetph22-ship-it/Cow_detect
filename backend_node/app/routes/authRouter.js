const express = require('express')
const router = express.Router()
const db = require('../config/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.SECRET_KEY

// POST: Login API
router.post('/login',async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter email and password!' 
            })
        }
        const {rows} = await db.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
        // const {rows2} = await db.query(`select * from users where `)
        const user = rows[0]
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password!' 
            })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password!'
            })
        }
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: '7d' }
        )

        // 6. อัปเดตเวลาเข้าสู่ระบบล่าสุด (อัปเดตแบบ background)
        db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])
            .catch(err => console.error('Error updating last_login_at:', err.message))

        return res.status(200).json({
            success: true,
            message: 'Login Success!',
            token,
            user: {
                id_user: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
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


// POST: Register API
router.post('/register',async(req,res) => {
    try{
        const { email,full_name,phone,password,role } = req.body
        if(!email || !full_name || !phone || password || !role ) return res.status(400).json({
            success:false,
            message:'Please Enter your [email,full_name,phone,password,role]'
        })

        const hash = await bcrypt.hash(password,10)
        const {rows} = await db.query(`insert into users (email,full_name,phone,password,role,created_at) values($1,$2,$3,$4,$5,NOW()) returning id,email,full_name,phone,role`,[email,full_name,phone,hash,role])
        return res.status(200).json({
            rows,
            success:true,
            message:'Register Success!'
        })
    }catch(err){
        // chk Email
        if (err.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered!'
            })
        }
        console.log("Error!, Register False!",err.message)
        res.status(500).json({
            success:false,
            message:'Error!, Register False!'
        })
    }
})

module.exports = router