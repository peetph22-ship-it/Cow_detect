const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.SECRET_KEY

exports.verifyToken = (req,res,next) => {
    // const
}