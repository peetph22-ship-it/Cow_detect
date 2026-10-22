require('dotenv').config()
const express = require('express')
const cors = require('cors')

// ป้องกันกระบวนการ Node.js ดับจาก Uncaught Exceptions หรือ Unhandled Rejections จาก Pooler
process.on('uncaughtException', (err) => {
    console.error('[Node Process Uncaught Exception]:', err?.message || err)
})
process.on('unhandledRejection', (reason) => {
    console.error('[Node Process Unhandled Rejection]:', reason?.message || reason)
})

const app = express()
const PORT = process.env.PORT || 4001

const rawOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean)
    : []
const frontendOrigins = Array.from(new Set([...rawOrigins, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001']))

app.use(cors({
    origin: (origin, callback) => {
        // อนุญาตคำขอที่ไม่มี origin (เช่น ESP32-S3, Postman, Server-to-Server) หรือตรงกับ Origin ที่อนุญาต
        if (!origin || frontendOrigins.includes(origin) || frontendOrigins.includes('*')) {
            return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true
}))

app.use(express.json())
// ============================

// ===== Start Route =====

// test route
app.get('/',(req,res) => {
    res.json({message:'Connect node success!'})
})

// routerAPI ===================

// auth
const auth = require('./app/routes/authRouter')
app.use('/api/auth',auth)

// users
const users = require('./app/routes/Admin/users')
app.use('/api/Admin/users',users)

// sensors / IoT (Admin & Global)
const sensors = require('./app/routes/Admin/sensors')
app.use('/api/Admin/sensors', sensors)
app.use('/api/sensors', sensors)

// farms (Admin)
const farms = require('./app/routes/Admin/farms')
app.use('/api/Admin/farms', farms)

// devices (Admin)
const devices = require('./app/routes/Admin/devices')
app.use('/api/Admin/devices', devices)

// alerts & notifications (Admin)
const alerts = require('./app/routes/Admin/alerts')
app.use('/api/Admin/alerts', alerts)

// dairy cooperative report & digital risk logbook (Admin)
const coopReport = require('./app/routes/Admin/coopReport')
app.use('/api/Admin/coop-report', coopReport)
app.use('/api/Admin/risk-logbook', coopReport)

// cctv cameras & behavior vision (Admin & Global)
const cctvCameras = require('./app/routes/Admin/cctvCameras')
app.use('/api/Admin/farms/:farmId/cameras', cctvCameras)
app.use('/api/farms/:farmId/cameras', cctvCameras)

// camera snapshot ingest from ESP32 gateway (device key)
const camera = require('./app/routes/camera')
app.use('/api/camera', camera)

// system benchmarks, multimodal validation & feedback (Admin & Global)
const systemRouter = require('./app/routes/Admin/system')
app.use('/api/Admin/system', systemRouter)
app.use('/api/system', systemRouter)
app.use('/api/alerts', systemRouter)


// =============================

// 404 Check
app.use((req,res) => res.status(404).json({message: 'Invalid Route!'}))

// Start Daily LSTM Scheduler (Runs daily at 20:00 Bangkok Time)
const { startDailyLstmCron } = require('./app/services/dailyLstmScheduler')

// End , Listen Port;
app.listen(PORT , () => {
    console.log(`Server Running On Port ${PORT}`)
    startDailyLstmCron()
    if (process.env.VISION_PRELOAD === '1') require('./app/services/visionService').warmup()
})