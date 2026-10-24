const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.SECRET_KEY

exports.verifyToken = (req, res, next) => {
    const authHeader = req.header("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({
        success: false,
        message: 'No Token Provided!'
    })

    const token = authHeader.split(" ")[ 1 ]
    try {
        req.user = jwt.verify(token, SECRET_KEY)
        next()
    } catch (err) {
        if (err.name === "TokenExpiredError") return res.status(401).json({
            success: false,
            message: "Token Timeout!",
        })
        return res.status(403).json({
            success: false,
            message: 'Invalid Token!'
        })
    }
}

exports.requireRole = (role) => (req, res, next) => {
    req.user?.role === role
        ? next()
        : res.status(403).json({
            success: false,
            message: 'Invalid User Role!'
        })
}

/**
 * admin ที่ login แล้ว หรือโปรแกรมภายใน (behavior engine ฝั่ง Python) ที่ส่ง X-Internal-Key = INTERNAL_API_KEY
 * ไม่ตั้ง INTERNAL_API_KEY = รับเฉพาะ admin
 */
exports.adminOrInternal = (req, res, next) => {
    const expected = process.env.INTERNAL_API_KEY || ''
    const given = String(req.get('X-Internal-Key') || '')
    if (expected && given) {
        const crypto = require('crypto')
        const a = Buffer.from(given), b = Buffer.from(expected)
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
            req.user = { id: 'internal', role: 'internal' }
            return next()
        }
        return res.status(403).json({ success: false, message: 'Invalid internal key' })
    }
    return exports.verifyToken(req, res, () => exports.requireRole('admin')(req, res, next))
}
