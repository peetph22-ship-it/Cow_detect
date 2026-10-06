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
