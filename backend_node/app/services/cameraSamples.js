/**
 * เก็บภาพตัวอย่างจากกล้องชั่วโมงละ 1 รูปต่อฟาร์ม ไว้ใน Supabase Storage (bucket private)
 * ใช้เป็น dataset โรงเรือนไทยสำหรับเทรน YOLO รอบถัดไป ภาพอื่นทั้งหมดถูกทิ้งหลังประมวลผล
 *
 * path: <farm_id>/<YYYY-MM-DD>/<HH>.jpg (เวลาไทย) ถ้ามีรูปของชั่วโมงนั้นแล้วจะไม่เขียนทับ
 * env: CAMERA_SAMPLE_BUCKET (ค่าเริ่มต้น camera-samples), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
const BUCKET = process.env.CAMERA_SAMPLE_BUCKET || 'camera-samples'

let client = null
const getClient = () => {
    if (client) return client
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    const { createClient } = require('@supabase/supabase-js')
    client = createClient(url, key, { auth: { persistSession: false } })
    return client
}

const samplePath = (farmId, capturedAt) => {
    const bkk = new Date(capturedAt.getTime() + 7 * 3600 * 1000)
    const day = bkk.toISOString().slice(0, 10)
    const hour = String(bkk.getUTCHours()).padStart(2, '0')
    return `${farmId}/${day}/${hour}.jpg`
}

// จำชั่วโมงที่เก็บแล้วไว้ในหน่วยความจำ จะได้ไม่ต้องยิง Storage ทุกรูป
const savedKeys = new Set()

/**
 * เก็บรูปถ้ายังไม่มีของชั่วโมงนี้ ไม่ throw (ล้มเหลวแค่ log) เพื่อไม่ให้กระทบการตอบอุปกรณ์
 */
const maybeSaveSample = async (farmId, capturedAt, jpeg) => {
    const supabase = getClient()
    if (!supabase || !farmId) return { saved: false, reason: 'storage_not_configured' }
    const key = samplePath(farmId, capturedAt)
    if (savedKeys.has(key)) return { saved: false, reason: 'already_saved' }
    try {
        const { error } = await supabase.storage.from(BUCKET).upload(key, jpeg, { contentType: 'image/jpeg', upsert: false })
        if (error && !/exists|duplicate/i.test(error.message)) throw error
        savedKeys.add(key)
        if (savedKeys.size > 5000) savedKeys.clear()
        return { saved: !error, path: key }
    } catch (err) {
        console.warn('[CameraSamples] upload failed:', err.message)
        return { saved: false, reason: err.message }
    }
}

module.exports = { maybeSaveSample, samplePath }
