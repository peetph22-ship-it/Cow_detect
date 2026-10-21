/**
 * จัดการ worker ของ YOLO: ประมวลผลทีละรูป, จำกัดคิว, timeout, สร้าง worker ใหม่เมื่อพัง
 * ถ้า YOLO มีปัญหา API หลัก (รับข้อมูลเซ็นเซอร์) ต้องไม่ล่มตาม
 */
const path = require('path')
const { Worker } = require('worker_threads')
const { ensureModel } = require('./modelStore')

const IMGSZ = 480
const MAX_PENDING = 2              // กำลังทำ 1 + รอ 1 (ภาพมาทุก 5 นาที ปกติไม่เกินนี้)
const TIMEOUT_MS = Number(process.env.VISION_TIMEOUT_MS || 120000)

let worker = null
let readyPromise = null
let chain = Promise.resolve()
let pendingCount = 0
let nextId = 1
const waiting = new Map()

class VisionBusyError extends Error {}

const failAll = (err) => {
    for (const { reject, timer } of waiting.values()) { clearTimeout(timer); reject(err) }
    waiting.clear()
}

const resetWorker = (reason) => {
    if (worker) { worker.removeAllListeners(); worker.terminate().catch(() => {}) }
    worker = null
    readyPromise = null
    failAll(new Error(`vision worker reset: ${reason}`))
}

const startWorker = () => {
    readyPromise = (async () => {
        const modelPath = await ensureModel()
        const w = new Worker(path.join(__dirname, 'visionWorker.js'), { workerData: { modelPath, imgsz: IMGSZ } })
        await new Promise((resolve, reject) => {
            const onMsg = (m) => {
                if (m.type === 'ready') { w.off('message', onMsg); resolve() }
                if (m.type === 'fatal') { w.off('message', onMsg); reject(new Error(m.error)) }
            }
            w.on('message', onMsg)
            w.once('error', reject)
        })
        w.on('message', (m) => {
            const job = waiting.get(m.id)
            if (!job) return
            waiting.delete(m.id)
            clearTimeout(job.timer)
            if (m.type === 'result') job.resolve(m.result)
            else job.reject(new Error(m.error))
        })
        w.on('error', (err) => { console.error('[Vision] worker error:', err.message); resetWorker(err.message) })
        w.on('exit', (code) => { if (worker === w) { console.warn('[Vision] worker exited', code); resetWorker(`exit ${code}`) } })
        worker = w
        console.log('[Vision] ✅ YOLO worker ready')
    })().catch(err => { readyPromise = null; throw err })
    return readyPromise
}

const runOne = async (jpeg) => {
    await (readyPromise || startWorker())
    if (!worker) throw new Error('vision worker not available')
    return new Promise((resolve, reject) => {
        const id = nextId++
        const timer = setTimeout(() => {
            waiting.delete(id)
            reject(new Error(`vision timeout after ${TIMEOUT_MS} ms`))
            resetWorker('timeout')  // worker ที่ค้างต้องทิ้ง ไม่งั้นงานถัดไปจะค้างตาม
        }, TIMEOUT_MS)
        waiting.set(id, { resolve, reject, timer })
        worker.postMessage({ id, jpeg })
    })
}

/**
 * ตรวจจับวัวในภาพ JPEG หนึ่งรูป (ทำทีละรูปเรียงกัน)
 * throw VisionBusyError เมื่อคิวเต็ม
 */
const detect = (jpeg) => {
    if (pendingCount >= MAX_PENDING) return Promise.reject(new VisionBusyError('vision queue full'))
    pendingCount++
    const job = chain.then(() => runOne(jpeg))
    chain = job.catch(() => {})
    return job.finally(() => { pendingCount-- })
}

const canAccept = () => pendingCount < MAX_PENDING

const status = () => ({ ready: Boolean(worker), pending: pendingCount })

const shutdown = () => resetWorker('shutdown')

module.exports = { detect, canAccept, status, shutdown, VisionBusyError, IMGSZ }
