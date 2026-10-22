/**
 * โหลดไฟล์โมเดล YOLO ตอนเปิด server
 * ไฟล์ ~82MB ไม่เก็บใน git: เก็บใน Supabase Storage (bucket private) แล้วดาวน์โหลดมาไว้ในเครื่องเมื่อยังไม่มี
 * ดิสก์ของ Render ล้างทุกครั้งที่ deploy จึงดาวน์โหลดใหม่หลัง deploy (ไม่กี่วินาที)
 *
 * env:
 *   YOLO_MODEL_FILE         ชื่อไฟล์ (ค่าเริ่มต้น yolo26m_480.onnx)
 *   YOLO_MODEL_BUCKET       bucket (ค่าเริ่มต้น models)
 *   YOLO_MODEL_SHA256       checksum ของไฟล์ (แนะนำให้ตั้ง กันไฟล์เสียหรือถูกสลับ)
 *   YOLO_MODEL_PARTS        จำนวนส่วน (ค่าเริ่มต้น 1) Supabase แผนฟรีรับไฟล์ไม่เกิน 50MB จึงแบ่งโมเดลเป็น
 *                           <file>.part1, <file>.part2, ... (scripts/split_model.js) แล้วต่อกลับตอนดาวน์โหลด
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   key ฝั่ง server เท่านั้น ห้ามใช้ใน frontend
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const MODEL_FILE = process.env.YOLO_MODEL_FILE || 'yolo26m_480.onnx'
const PARTS = Math.max(1, parseInt(process.env.YOLO_MODEL_PARTS || '1', 10) || 1)
const BUCKET = process.env.YOLO_MODEL_BUCKET || 'models'
const LOCAL_DIR = path.resolve(__dirname, '../weights')
const LOCAL_PATH = path.join(LOCAL_DIR, MODEL_FILE)

const sha256File = (file) => new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256')
    fs.createReadStream(file).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject)
})

const checksumOk = async (file) => {
    const expected = (process.env.YOLO_MODEL_SHA256 || '').trim().toLowerCase()
    if (!expected) return true
    return (await sha256File(file)) === expected
}

const download = async () => {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error(`ไม่พบไฟล์โมเดล ${LOCAL_PATH} และยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY สำหรับดาวน์โหลด`)
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const names = PARTS === 1 ? [MODEL_FILE] : Array.from({ length: PARTS }, (_, i) => `${MODEL_FILE}.part${i + 1}`)
    if (PARTS > 1 && !process.env.YOLO_MODEL_SHA256) console.warn('[ModelStore] YOLO_MODEL_SHA256 not set - cannot verify joined parts')
    console.log(`[ModelStore] downloading ${BUCKET}/${names.join(', ')} ...`)
    const t0 = Date.now()
    fs.mkdirSync(LOCAL_DIR, { recursive: true })
    const tmp = `${LOCAL_PATH}.download`
    fs.writeFileSync(tmp, Buffer.alloc(0))
    let total = 0
    try {
        // ทีละส่วน แล้วต่อท้ายไฟล์ชั่วคราว: RAM ใช้แค่ขนาดส่วนเดียว (~41MB) ไม่ใช่ทั้งไฟล์
        for (const name of names) {
            const { data, error } = await supabase.storage.from(BUCKET).download(name)
            if (error) throw new Error(`ดาวน์โหลดโมเดลไม่สำเร็จ (${name}): ${error.message}`)
            const buf = Buffer.from(await data.arrayBuffer())
            fs.appendFileSync(tmp, buf)
            total += buf.length
        }
        if (!(await checksumOk(tmp))) throw new Error('checksum ของโมเดลที่ดาวน์โหลดไม่ตรงกับ YOLO_MODEL_SHA256')
    } catch (err) {
        fs.rmSync(tmp, { force: true })
        throw err
    }
    fs.renameSync(tmp, LOCAL_PATH)
    console.log(`[ModelStore] ✅ ${MODEL_FILE} (${(total / 1048576).toFixed(1)} MB, ${names.length} part) in ${Date.now() - t0} ms`)
}

let inflight = null

// คืน path ของโมเดลที่พร้อมใช้ (ดาวน์โหลดครั้งเดียวแม้ถูกเรียกพร้อมกันหลายครั้ง)
const ensureModel = () => {
    if (!inflight) {
        inflight = (async () => {
            if (fs.existsSync(LOCAL_PATH)) {
                if (await checksumOk(LOCAL_PATH)) return LOCAL_PATH
                console.warn('[ModelStore] local model checksum mismatch - re-downloading')
                fs.unlinkSync(LOCAL_PATH)
            }
            await download()
            return LOCAL_PATH
        })().catch(err => { inflight = null; throw err })
    }
    return inflight
}

module.exports = { ensureModel, LOCAL_PATH, MODEL_FILE }
