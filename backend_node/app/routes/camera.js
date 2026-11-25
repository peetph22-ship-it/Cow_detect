/**
 * CowCare AI - Camera snapshot ingest
 *
 * POST /api/camera/snapshot
 *   body:    JPEG (Content-Type: image/jpeg) ไม่เกิน 2MB
 *   headers: X-Device-Serial, X-Device-Key, X-Captured-At (Unix epoch UTC วินาที, ไม่บังคับ)
 *
 * ESP32 ดึงภาพนิ่งจากกล้องทุก CAMERA_INTERVAL_MIN_VAL นาที (ค่าเริ่มต้น 10) แล้วส่งมาที่นี่ -> ตอบ 202 ทันที -> YOLO (worker thread) เบื้องหลัง
 * ถ้าตั้งรอบถ่ายภาพจากหน้าเว็บ (tb_devices.camera_interval_sec) คำตอบจะมี next_interval_sec ให้กล่องใช้รอบใหม่
 * -> บันทึกจำนวนวัวต่อพฤติกรรม -> ทิ้งภาพ
 * ตอบทันทีเพราะบน Render ฟรี (CPU 0.1) YOLO ใช้ ~30 วินาที/รูป ถ้าให้บอร์ดรอ HTTPS จะค้างนานและงานส่งเซ็นเซอร์ต้องรอตาม
 * เก็บภาพตัวอย่างชั่วโมงละ 1 รูป พร้อมผลของโมเดลกับภาพนั้น (services/cameraSamples.js)
 * โหมดเก็บภาพทุกภาพ (tb_devices.collect_until): เก็บทุกภาพ รวมภาพที่ประมวลผลไม่ทัน (กล่องไม่ส่งภาพที่ได้ 429 ซ้ำ)
 */
const express = require('express')
const router = express.Router()
const db = require('../config/db')
const { verifyDeviceKey } = require('../middleware/deviceAuthMiddleware')
const { parseRecordedAt, checkTimeWindow } = require('../services/sensorIngest')
const vision = require('../services/visionService')
const {
    maybeSaveSample, saveLatest, buildSampleJson, buildCollectJson, saveCollectedImage, saveCollectedResult
} = require('../services/cameraSamples')
const cowTarget = require('../services/cowTargetTracker')
const { isCollecting } = require('../services/collectMode')
const { assignBoxIds } = require('../services/cowIdAssign')
const { recordFrame } = require('../services/hardwareLog')

// แปลง error ของ body parser (เช่น รูปเกิน 2MB) ให้ตอบเป็น JSON ที่ firmware อ่านได้
const rawJpeg = express.raw({ type: ['image/jpeg', 'application/octet-stream'], limit: '2mb' })
const parseJpeg = (req, res, next) => rawJpeg(req, res, (err) => {
    if (!err) return next()
    const status = err.status || 400
    return res.status(status).json({ success: false, message: status === 413 ? 'ไฟล์ภาพเกิน 2MB' : 'อ่านไฟล์ภาพไม่สำเร็จ' })
})

const isJpeg = (buf) => Buffer.isBuffer(buf) && buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8

// อุปกรณ์ที่ส่งภาพต้องลงทะเบียนอยู่แล้ว (ไม่สร้างอัตโนมัติแบบ endpoint เซ็นเซอร์)
const resolveDevice = async (req) => {
    if (req.device) return req.device
    const serial = String(req.get('X-Device-Serial') || '').trim().toUpperCase()
    if (!serial) return null
    const { rows } = await db.query(`SELECT id_devices, id_farms FROM tb_devices WHERE UPPER(serial_no) = $1 LIMIT 1`, [serial])
    return rows[0] ? { id: rows[0].id_devices, farmId: rows[0].id_farms, serial } : null
}

// รอบถ่ายภาพ + โหมดเก็บภาพทุกภาพ ใน query เดียว
// to_jsonb: ยังไม่ได้รัน migration 20261116 / 20261121 ก็ไม่ error (ได้ null = ใช้ค่าในเฟิร์มแวร์ / ไม่เก็บทุกภาพ)
const getCameraSettings = async (deviceId) => {
    try {
        const { rows } = await db.query(
            `SELECT (to_jsonb(d)->>'camera_interval_sec')::int AS s, to_jsonb(d)->>'collect_until' AS collect_until
             FROM tb_devices d WHERE id_devices = $1`,
            [deviceId]
        )
        return { interval: rows[0]?.s || null, collectUntil: rows[0]?.collect_until || null }
    } catch (err) {
        console.warn('[Camera] read camera settings failed:', err.message)
        return { interval: null, collectUntil: null }
    }
}

// ภาพที่ประมวลผลไม่ทันระหว่างโหมดเก็บภาพทุกภาพ: เก็บภาพไว้ (ไม่มีผลของโมเดล) ไม่ throw
const keepUnprocessed = (farmId, capturedAt, jpeg, status, error = null) => Promise.all([
    saveCollectedImage(farmId, capturedAt, jpeg),
    saveCollectedResult(farmId, capturedAt, buildCollectJson(capturedAt, { status, error }))
]).catch(err => console.warn('[Camera] keep unprocessed snapshot failed:', err.message))

router.post(
    '/snapshot',
    parseJpeg,
    verifyDeviceKey,
    async (req, res) => {
        if (!isJpeg(req.body)) {
            return res.status(400).json({ success: false, message: 'body ต้องเป็นไฟล์ JPEG (Content-Type: image/jpeg) ไม่เกิน 2MB' })
        }

        const t = parseRecordedAt(req.get('X-Captured-At'))
        if (t.error) return res.status(400).json({ success: false, error: t.error })
        const capturedAt = t.date || new Date()
        const timeError = checkTimeWindow(capturedAt)
        if (timeError) return res.status(400).json({ success: false, error: timeError })

        let device
        try {
            device = await resolveDevice(req)
        } catch (err) {
            console.error('[Camera] device lookup failed:', err.message)
            return res.status(503).json({ success: false, message: 'ตรวจสอบอุปกรณ์ไม่สำเร็จ' })
        }
        if (!device || !device.farmId) {
            return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์หรืออุปกรณ์ยังไม่ผูกกับฟาร์ม' })
        }

        // รอบถ่ายภาพที่ตั้งจากหน้าเว็บ ส่งกลับไปให้กล่องใช้รอบถัดไป (ไม่มีค่า = กล่องใช้ค่าในเฟิร์มแวร์)
        const receivedAt = new Date()
        const settings = await getCameraSettings(device.id)
        const next = settings.interval ? { next_interval_sec: settings.interval } : {}
        const collect = isCollecting(settings, receivedAt)
        const jpeg = req.body
        // ทุกภาพที่ถึง server (ขนาด เวลาถ่าย เวลาที่ได้รับ) ใช้คำนวณความครบ ปริมาณเน็ต และความหน่วง ไม่รอผล
        const frame = { deviceId: device.id, farmId: device.farmId, capturedAt, receivedAt, bytes: jpeg.length }

        if (!vision.canAccept()) {
            recordFrame({ ...frame, status: 'busy' })
            // โหมดเก็บภาพทุกภาพ: ประมวลผลไม่ทันก็ยังเก็บภาพไว้ (กล่องข้ามภาพนี้ ไม่ส่งซ้ำ)
            if (collect) keepUnprocessed(device.farmId, capturedAt, jpeg, 'busy')
            res.set('Retry-After', '60')
            return res.status(429).json({ success: false, message: 'กำลังประมวลผลภาพก่อนหน้า ลองใหม่ภายหลัง', ...next })
        }

        res.status(202).json({ success: true, accepted: true, captured_at: Math.floor(capturedAt.getTime() / 1000), ...next })
        recordFrame({ ...frame, status: 'accepted' })

        // ประมวลผลเบื้องหลัง (บอร์ดไม่ต้องรอ) ผลลัพธ์ดูได้จากตาราง cctv_behavior_telemetry
        processSnapshot(device, capturedAt, jpeg, { collect, receivedAt }).catch(err => console.error('[Camera] processing failed:', err.message))
    }
)

const TELEMETRY_INSERT_SQL = `
        INSERT INTO cctv_behavior_telemetry (
            camera_id, farm_id, timestamp, total_cows_detected,
            standing_count, lying_count, feeding_count, drinking_count,
            standing_pct, lying_pct, feeding_pct, drinking_pct,
            cow_comfort_index, ai_confidence_avg, is_simulation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false)`
const TELEMETRY_INSERT_WITH_DETECTIONS_SQL = `
        INSERT INTO cctv_behavior_telemetry (
            camera_id, farm_id, timestamp, total_cows_detected,
            standing_count, lying_count, feeding_count, drinking_count,
            standing_pct, lying_pct, feeding_pct, drinking_pct,
            cow_comfort_index, ai_confidence_avg, is_simulation, detections)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false, $15::jsonb)
        RETURNING id`
// ถ้าพบว่ายังไม่มีคอลัมน์ detections ครั้งหนึ่ง จะไม่ลองซ้ำจนกว่าจะรีสตาร์ตเซิร์ฟเวอร์ (หลังรัน migration)
let detectionsColumnReady = true

// opts.collect = โหมดเก็บภาพทุกภาพเปิดอยู่ตอนรับภาพ, opts.receivedAt = เวลาที่ server รับภาพ (ใช้วัดเวลาประมวลผลรวมรอคิว)
const processSnapshot = async (device, capturedAt, jpeg, opts = {}) => {
    const receivedMs = (opts.receivedAt || new Date()).getTime()
    // อัปโหลดภาพไปพร้อมกับประมวลผล: ภาพไม่หายแม้โมเดลหรือฐานข้อมูลล้มเหลว
    const collectImage = opts.collect ? saveCollectedImage(device.farmId, capturedAt, jpeg) : null
    let result
    try {
        result = await vision.detect(jpeg)
    } catch (err) {
        const busy = err instanceof vision.VisionBusyError
        if (opts.collect) {
            await Promise.all([
                collectImage,
                saveCollectedResult(device.farmId, capturedAt, buildCollectJson(capturedAt, { status: busy ? 'busy' : 'error', error: busy ? null : err.message }))
            ])
        }
        if (busy) return console.warn('[Camera] dropped snapshot: vision queue full')
        throw err
    }
    result.timing_ms = { ...(result.timing_ms || {}), end_to_end: Date.now() - receivedMs }
    // เลขวัวทุกตัว (คงที่ข้ามภาพ) ก่อนบันทึก ภาพที่เก็บ/telemetry/ภาพล่าสุดจะได้มีเลขตรงกัน
    if (detectionsColumnReady) await assignBoxIds(device.farmId, capturedAt, result)
    // ผลของภาพที่เก็บ: บันทึกก่อนงานฐานข้อมูล (ฐานข้อมูลล้มก็ยังได้ภาพพร้อมผล)
    const collectResult = opts.collect
        ? collectImage.then(() => saveCollectedResult(device.farmId, capturedAt, buildCollectJson(capturedAt, { status: 'ok', result, imgsz: vision.IMGSZ })))
        : null

    let cameraId = null
    try {
        const cam = await db.query(`SELECT id FROM cctv_cameras WHERE farm_id = $1 ORDER BY created_at ASC LIMIT 1`, [device.farmId])
        cameraId = cam.rows[0]?.id ?? null
    } catch (camErr) {
        // ยังไม่ได้ลงทะเบียนกล้อง: บันทึกได้โดยไม่มี camera_id
    }
    const { counts, pct } = result
    const params = [
        cameraId, device.farmId, capturedAt.toISOString(), result.total,
        counts.standing, counts.lying, counts.feeding, counts.drinking,
        pct.standing, pct.lying, pct.feeding, pct.drinking,
        result.cci, result.confidence_avg
    ]
    // เก็บตำแหน่งกรอบของทุกภาพ (รูปแบบเดียวกับ HH.json ของภาพตัวอย่าง) แทนการเก็บวิดีโอ
    const detections = buildSampleJson(capturedAt, result, vision.IMGSZ)
    let telemetryId = null
    try {
        if (!detectionsColumnReady) throw Object.assign(new Error('detections column not available'), { code: '42703' })
        const ins = await db.query(TELEMETRY_INSERT_WITH_DETECTIONS_SQL, [...params, JSON.stringify(detections)])
        telemetryId = ins.rows?.[0]?.id ?? null
    } catch (err) {
        if (err.code !== '42703') throw err
        // ยังไม่ได้รัน migrations/20261106_telemetry_detection_boxes.sql: บันทึกแบบเดิมไปก่อน ไม่ให้ข้อมูลหาย
        if (detectionsColumnReady) console.warn('[Camera] detections column missing - run migrations/20261106_telemetry_detection_boxes.sql (saving counts only)')
        detectionsColumnReady = false
        await db.query(TELEMETRY_INSERT_SQL, params)
    }
    console.log(`[Camera] ${device.serial || device.id}: ${result.total} cows ${JSON.stringify(counts)} cci=${result.cci} in ${result.timing_ms.total} ms`)

    // ติดตามวัวเป้าหมายที่ผู้ดูแลคลิกเลือกไว้ (ถ้ามี) ต่ออีก 1 ภาพ
    if (telemetryId) await cowTarget.onSnapshot(device.farmId, { id: telemetryId, camera_id: cameraId, timestamp: capturedAt, detections })

    await Promise.all([
        maybeSaveSample(device.farmId, capturedAt, jpeg, result, vision.IMGSZ),
        saveLatest(device.farmId, capturedAt, jpeg, result, vision.IMGSZ),
        collectResult
    ])
}

// สถานะ worker (ไม่มีข้อมูลลับ)
router.get('/status', (req, res) => res.json({ success: true, vision: vision.status() }))

// เปิดให้สคริปต์ทดสอบเรียกได้โดยตรง (ไม่ใช่ route)
router._processSnapshot = processSnapshot

module.exports = router
