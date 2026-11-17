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
// Render (และ Cloudflare Tunnel) อยู่หน้าเซิร์ฟเวอร์ 1 ชั้น: ให้ req.ip เป็น IP จริงของผู้ใช้/บอร์ด แทน IP ของ proxy
// (ใช้ใน log ของ device auth) ไว้ 1 ชั้นพอ ถ้าเชื่อทุกชั้น ใครก็ปลอม X-Forwarded-For ได้
app.set('trust proxy', 1)
const PORT = process.env.PORT || 4001

const rawOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean)
    : []
const frontendOrigins = Array.from(new Set([...rawOrigins, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001']))

// ตรวจสอบ origin: FRONTEND_URL, localhost และ IP วงแลน (ไม่เปิดให้โดเมน tunnel สาธารณะ เช่น trycloudflare/ngrok)
const isAllowedOrigin = (origin) => {
    if (!origin) return true
    if (frontendOrigins.includes(origin) || frontendOrigins.includes('*')) return true
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true
    return false
}

app.use(cors({
    origin: (origin, callback) => {
        // อนุญาตคำขอที่ไม่มี origin (ESP32-S3, Postman) หรือตรงกับ origin ที่อนุญาต/เพื่อนในวงแลน
        if (isAllowedOrigin(origin)) {
            return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true
}))

app.use(express.json())
// ============================

// ===== Start Route =====

// test & ping routes สำหรับให้หน้าบ้านหรือหลังบ้านเพื่อนทดสอบเชื่อมต่อ
app.get('/', (req, res) => {
    res.json({ message: 'Connect node success!', status: 'online', timestamp: new Date().toISOString() })
})

app.get('/ping', (req, res) => {
    res.json({ success: true, message: 'CowCare AI Node Backend is alive', timestamp: new Date().toISOString() })
})

app.get('/api/ping', (req, res) => {
    res.json({ success: true, message: 'CowCare AI Node Backend is alive', timestamp: new Date().toISOString() })
})

// routerAPI ===================

// auth
const auth = require('./app/routes/authRouter')
app.use('/api/auth', auth)

// users
const users = require('./app/routes/Admin/users')
app.use('/api/Admin/users', users)

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

// เลือกวัวเป้าหมายจากภาพ (Admin)
const cowTarget = require('./app/routes/Admin/cowTarget')
app.use('/api/Admin/farms/:farmId/cow-target', cowTarget)

// ลิงก์โมเดล YOLO ให้เบราว์เซอร์ admin ตรวจจับจากวิดีโอ (หน้า simulation)
const visionAdmin = require('./app/routes/Admin/vision')
app.use('/api/Admin/vision', visionAdmin)

// farmer view: only the logged-in farmer's own farm
const farmer = require('./app/routes/farmer')
app.use('/api/farmer', farmer)

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
app.use((req, res) => res.status(404).json({ message: 'Invalid Route!' }))

// Start Daily LSTM Scheduler (Runs daily at 20:00 Bangkok Time)
const { startDailyLstmCron } = require('./app/services/dailyLstmScheduler')

// End , Listen Port;
app.listen(PORT, () => {
    console.log(`Server Running On Port ${PORT}`)
    // งาน 20:00 เขียนลง DB จริง: รันเฉพาะบน Render (Render ตั้ง RENDER=true ให้เอง) หรือเมื่อสั่ง ENABLE_DAILY_CRON=1
    // เครื่อง dev ต่อ DB ตัวเดียวกับ production จึงต้องไม่รันเองโดยไม่ตั้งใจ
    if (process.env.RENDER === 'true' || process.env.ENABLE_DAILY_CRON === '1') {
        startDailyLstmCron()
    } else {
        console.log('[Daily Summary Job] skipped on this machine (set ENABLE_DAILY_CRON=1 to run)')
    }
    if (process.env.VISION_PRELOAD === '1') require('./app/services/visionService').warmup()
})
