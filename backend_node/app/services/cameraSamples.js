/**
 * เก็บภาพตัวอย่างจากกล้องชั่วโมงละ 1 รูปต่อฟาร์ม ไว้ใน Supabase Storage (bucket private)
 * ใช้นับเทียบความแม่นของโมเดล และเป็น dataset โรงเรือนไทยสำหรับเทรน YOLO รอบถัดไป ภาพอื่นทั้งหมดถูกทิ้งหลังประมวลผล
 *
 * path: <farm_id>/<YYYY-MM-DD>/<HH>.jpg (เวลาไทย) ถ้ามีรูปของชั่วโมงนั้นแล้วจะไม่เขียนทับ
 *       <HH>.json ข้างกัน = ผลของโมเดลกับภาพนั้นภาพเดียว (จำนวนแต่ละท่า + กรอบเป็นสัดส่วน 0-1 บนภาพจริง)
 *       เขียนเฉพาะเมื่อภาพถูกบันทึกในรอบเดียวกัน ภาพกับผลจึงตรงกันเสมอ
 * env: CAMERA_SAMPLE_BUCKET (ค่าเริ่มต้น camera-samples), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
const BUCKET = process.env.CAMERA_SAMPLE_BUCKET || 'camera-samples'
const { MODEL_FILE } = require('./modelStore')

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

// ผลของโมเดลสำหรับภาพนั้น (ไม่มีข้อมูลส่วนตัว)
const buildSampleJson = (capturedAt, result, imgsz) => ({
    version: 1,
    captured_at: capturedAt.toISOString(),
    model: MODEL_FILE,
    imgsz,
    detect_opts: result.detect_opts || null,
    image: result.image || null,
    total: result.total,
    counts: result.counts,
    boxes: result.boxes || []
})

/**
 * เก็บรูปถ้ายังไม่มีของชั่วโมงนี้ แล้วเก็บผลของโมเดล (ถ้ามี result) ไว้ข้างกัน
 * ไม่ throw (ล้มเหลวแค่ log) เพื่อไม่ให้กระทบการตอบอุปกรณ์
 */
const maybeSaveSample = async (farmId, capturedAt, jpeg, result = null, imgsz = null) => {
    const supabase = getClient()
    if (!supabase || !farmId) return { saved: false, reason: 'storage_not_configured' }
    const key = samplePath(farmId, capturedAt)
    if (savedKeys.has(key)) return { saved: false, reason: 'already_saved' }
    try {
        const { error } = await supabase.storage.from(BUCKET).upload(key, jpeg, { contentType: 'image/jpeg', upsert: false })
        if (error && !/exists|duplicate/i.test(error.message)) throw error
        savedKeys.add(key)
        if (savedKeys.size > 5000) savedKeys.clear()
        if (error) return { saved: false, reason: 'already_saved', path: key }

        let jsonPath = null
        if (result) {
            jsonPath = key.replace(/\.jpg$/, '.json')
            const body = Buffer.from(JSON.stringify(buildSampleJson(capturedAt, result, imgsz)))
            const { error: jsonErr } = await supabase.storage.from(BUCKET).upload(jsonPath, body, { contentType: 'application/json', upsert: true })
            if (jsonErr) {
                console.warn('[CameraSamples] result json upload failed:', jsonErr.message)
                jsonPath = null
            }
        }
        return { saved: true, path: key, json_path: jsonPath }
    } catch (err) {
        console.warn('[CameraSamples] upload failed:', err.message)
        return { saved: false, reason: err.message }
    }
}

/**
 * ดึงรายการภาพตัวอย่างของฟาร์มจาก bucket camera-samples พร้อม Signed URL และไฟล์ผลลัพธ์ .json ข้างกัน
 * ใช้ในหน้า Admin นับเทียบความแม่นยำของโมเดล
 */
const listFarmSamples = async (farmId, { limit = 24, maxDays = 14 } = {}) => {
    const supabase = getClient()
    if (!supabase || !farmId) {
        return { configured: false, bucket: BUCKET, samples: [] }
    }

    try {
        const { data: dayEntries, error: dayErr } = await supabase.storage
            .from(BUCKET)
            .list(String(farmId), { limit: 60, sortBy: { column: 'name', order: 'desc' } })

        if (dayErr) throw dayErr
        const days = (dayEntries || [])
            .map(e => e.name)
            .filter(n => /^\d{4}-\d{2}-\d{2}$/.test(n))
            .sort((a, b) => b.localeCompare(a))
            .slice(0, maxDays)

        const items = []
        for (const day of days) {
            if (items.length >= limit) break
            const { data: files, error: fileErr } = await supabase.storage
                .from(BUCKET)
                .list(`${farmId}/${day}`, { limit: 60, sortBy: { column: 'name', order: 'desc' } })
            if (fileErr || !files) continue

            const fileSet = new Set(files.map(f => f.name))
            const hours = files
                .map(f => f.name)
                .filter(n => /^\d{2}\.jpg$/i.test(n))
                .map(n => n.slice(0, 2))
                .sort((a, b) => b.localeCompare(a))

            for (const hh of hours) {
                if (items.length >= limit) break
                const jpgPath = `${farmId}/${day}/${hh}.jpg`
                const jsonName = `${hh}.json`
                const jsonPath = fileSet.has(jsonName) ? `${farmId}/${day}/${jsonName}` : null
                items.push({
                    sample_path: jpgPath,
                    json_path: jsonPath,
                    date: day,
                    hour: Number(hh),
                    hour_label: `${day} ${hh}:00 น.`
                })
            }
        }

        if (!items.length) {
            return { configured: true, bucket: BUCKET, samples: [] }
        }

        // สร้าง Signed URL อายุ 1 ชั่วโมงสำหรับภาพตัวอย่างทั้งหมดในครั้งเดียว
        const jpgPaths = items.map(x => x.sample_path)
        const { data: signedList } = await supabase.storage.from(BUCKET).createSignedUrls(jpgPaths, 3600)
        const signedMap = new Map((signedList || []).map(s => [s.path, s.signedUrl]))

        // ดึงข้อมูล .json ของแต่ละภาพแบบขนาน
        const samples = await Promise.all(items.map(async (item) => {
            let meta = null
            if (item.json_path) {
                try {
                    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(item.json_path)
                    if (!dlErr && blob) {
                        const text = await blob.text()
                        meta = JSON.parse(text)
                    }
                } catch (e) {
                    // ถ้าอ่าน json ไม่สำเร็จ ยังแสดงภาพได้
                }
            }
            const counts = meta?.counts || { lying: 0, standing: 0, feeding: 0, drinking: 0 }
            const total = meta?.total != null
                ? Number(meta.total)
                : Number(counts.lying || 0) + Number(counts.standing || 0) + Number(counts.feeding || 0) + Number(counts.drinking || 0)

            return {
                sample_path: item.sample_path,
                date: item.date,
                hour: item.hour,
                hour_label: item.hour_label,
                captured_at: meta?.captured_at || `${item.date}T${String(item.hour).padStart(2, '0')}:00:00+07:00`,
                image_url: signedMap.get(item.sample_path) || null,
                model: meta?.model || MODEL_FILE,
                image_size: meta?.image || null,
                model_counts: {
                    lying: Number(counts.lying || 0),
                    standing: Number(counts.standing || 0),
                    feeding: Number(counts.feeding || 0),
                    drinking: Number(counts.drinking || 0),
                    total
                },
                boxes: Array.isArray(meta?.boxes) ? meta.boxes : [],
                has_json: Boolean(meta)
            }
        }))

        return { configured: true, bucket: BUCKET, samples }
    } catch (err) {
        console.warn('[CameraSamples] listFarmSamples failed:', err.message)
        return { configured: true, bucket: BUCKET, samples: [], error: err.message }
    }
}

module.exports = { maybeSaveSample, samplePath, buildSampleJson, listFarmSamples }
