const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.SECRET_KEY
const db = require('../../config/db')
const {verifyToken,requireRole} = require('../../middleware/authMiddleware')

// GET: All Users
router.get(['/users', '/'], verifyToken, requireRole('admin') ,async (req,res) => {
    try{
        const {rows} = await db.query(`select * from tb_users order by id_users desc`)
        return res.json({rows,message:'Get all users success!'})
    }catch(err){
        console.error("Error get all users!",err.message)
        return res.status(500).json({
            message:'Error get all users!',
            success: false,
            status:500
        })
    }
})

// Get: users by id (1 data)
router.get(['/users/:id', '/:id'], verifyToken, requireRole('admin'), async (req,res) => {
    try{
        const {id} = req.params
        const {rows} = await db.query(`select * from tb_users where id_users=$1`,[id])
        res.json({rows,message:'Get Users Success!',status:200,success:true})
    }catch(err){
        console.error('Error, Get Users by id False!',err.message)
        res.status(500).json({
            status:500,
            message:'Error, Get Users by id False!',
            success:false
        })
    }
})

// PUT: Edit Users (Update)
router.put(['/users/:id', '/:id'], verifyToken, requireRole('admin'), async (req,res) => {
    try{
        const {id} = req.params
        const { email,password,full_name,name_users,organization,phone,role,status } = req.body
        const userName = name_users || full_name
        if(password && password.trim()){
            const hash = await bcrypt.hash(password,10)
            await db.query(
                `update tb_users set email=$1,password=$2,name_users=$3,organization=$4,phone=$5,role=$6,status=COALESCE($7,status) where id_users=$8`,
                [email,hash,userName,organization,phone,role,status || null,id]
            )
        }else{
            await db.query(
                `update tb_users set email=$1,name_users=$2,organization=$3,phone=$4,role=$5,status=COALESCE($6,status) where id_users=$7`,
                [email,userName,organization,phone,role,status || null,id]
            )
        }
        res.json({
            message:'Update user success!',
            status:200,
            success:true
        })
    }catch(err){
        console.error('Error!, Update Table:tb_users False!',err.message)
        res.status(500).json({
            message:'Error!, Update Table:tb_users False!',
            status:500,
            success:false
        })
    }
})

// Delete: users
router.delete(['/users/:id', '/:id'], verifyToken, requireRole('admin'), async (req,res) => {
    try{
        const {id} = req.params
        const {rows} = await db.query(`delete from tb_users where id_users=$1`,[id])
        return res.json({
            rows,
            status:200,
            message:'Delete User Success!',
            success:true
        })
    }catch(err){
        console.error('Error!, Delete User False!',err.message)
        res.status(500).json({
            status:500,
            message:'Error!, Delete User False!',
            success:false
        })
    }
})

module.exports = router