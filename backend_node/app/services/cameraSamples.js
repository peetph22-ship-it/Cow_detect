/**
 * เก็บภาพตัวอย่างจากกล้องชั่วโมงละ 1 รูปต่อฟาร์ม ไว้ใน Supabase Storage (bucket private)
 * ใช้นับเทียบความแม่นของโมเดล และเป็น dataset โรงเรือนไทยสำหรับเทรน YOLO รอบถัดไป ภาพอื่นทั้งหมดถูกทิ้งหลังประมวลผล
 *
 * path: <farm_id>/<YYYY-MM-DD>/<HH>.jpg (เวลาไทย) ถ้ามีรูปของชั่วโมงนั้นแล้วจะไม่เขียนทับ
 *       <farm_id>/latest.jpg + latest.json = ภาพล่าสุด เขียนทับทุกภาพ (ใช้คลิกเลือกวัวเป้าหมาย)
 *       <HH>.json ข้างกัน = ผลของโมเดลกับภาพนั้นภาพเดียว (จำนวนแต่ละท่า + กรอบเป็นสัดส่วน 0-1 บนภาพจริง)
 *       เขียนเฉพาะเมื่อภาพถูกบันทึกในรอบเดียวกัน ภาพกับผลจึงตรงกันเสมอ
 *       collect/<farm_id>/<YYYY-MM-DD>/<HHMMSS>.jpg (+ .json) = ทุกภาพระหว่างเปิดโหมดเก็บภาพทุกภาพ
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
    // วิธีย่อภาพเข้าโมเดล (ภาพก่อน 2026-11-20 ไม่มีฟิลด์นี้ = letterbox) ไว้แยกผลตอนตรวจ/วัดความแม่นยำย้อนหลัง
    resize: result.resize || null,
    image: result.image || null,
    // เวลาประมวลผลต่อภาพ: total = ในโมเดล (ย่อภาพ + YOLO), end_to_end = ตั้งแต่ server รับภาพจนได้ผล (รวมรอคิวภาพก่อนหน้า)
    timing_ms: result.timing_ms || null,
    total: result.total,
    counts: result.counts,
    // boxes[].id = เลขวัวที่ระบบตั้ง (คงที่ข้ามภาพ ไม่ใช่เบอร์หู), next_cow_id = เลขถัดไปของฟาร์มนี้
    boxes: result.boxes || [],
    ...(result.next_cow_id ? { next_cow_id: result.next_cow_id } : {})
})

/**
 * โหมดเก็บภาพทุกภาพ (tb_devices.collect_until): collect/<farm_id>/<YYYY-MM-DD>/<HHMMSS>.jpg (+ .json) เวลาไทย
 * แยกจากภาพรายชั่วโมง (<farm_id>/<YYYY-MM-DD>/<HH>.jpg) ดาวน์โหลดด้วย scripts/download_collected.js
 */
const COLLECT_PREFIX = 'collect'
const collectPath = (farmId, capturedAt) => {
    const bkk = new Date(capturedAt.getTime() + 7 * 3600 * 1000).toISOString()
    return `${COLLECT_PREFIX}/${farmId}/${bkk.slice(0, 10)}/${bkk.slice(11, 19).replace(/:/g, '')}.jpg`
}

// status: ok = มีผลของโมเดล, busy = server กำลังประมวลผลภาพก่อนหน้า (ตอบกล่อง 429), error = โมเดลทำงานไม่สำเร็จ
const buildCollectJson = (capturedAt, { status, result = null, imgsz = null, error = null }) => (
    status === 'ok' && result
        ? { ...buildSampleJson(capturedAt, result, imgsz), status: 'ok' }
        : { version: 1, captured_at: capturedAt.toISOString(), model: MODEL_FILE, status, error: error || null }
)

const uploadCollected = async (path, body, contentType) => {
    const supabase = getClient()
    if (!supabase) return { saved: false, reason: 'storage_not_configured' }
    try {
        // upsert: กล่องส่งภาพเวลาเดิมซ้ำ = ภาพเดิม เขียนทับได้
        const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true })
        if (error) throw error
        return { saved: true, path }
    } catch (err) {
        console.warn('[CameraSamples] collect upload failed:', err.message)
        return { saved: false, reason: err.message }
    }
}

// ไม่ throw (ล้มเหลวแค่ log) เหมือนภาพตัวอย่าง
const saveCollectedImage = async (farmId, capturedAt, jpeg) => {
    if (!farmId) return { saved: false, reason: 'no_farm' }
    return uploadCollected(collectPath(farmId, capturedAt), jpeg, 'image/jpeg')
}

const saveCollectedResult = async (farmId, capturedAt, json) => {
    if (!farmId) return { saved: false, reason: 'no_farm' }
    const path = collectPath(farmId, capturedAt).replace(/\.jpg$/, '.json')
    return uploadCollected(path, Buffer.from(JSON.stringify(json)), 'application/json')
}

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

// จำนวนที่โมเดลนับได้จาก HH.json (null = ไม่มีผลของโมเดลสำหรับภาพนี้)
const countsFromMeta = (meta) => {
    const c = meta?.counts
    if (!c) return null
    const n = (v) => Number(v || 0)
    const total = meta.total != null ? Number(meta.total) : n(c.lying) + n(c.standing) + n(c.feeding) + n(c.drinking)
    return { lying: n(c.lying), standing: n(c.standing), feeding: n(c.feeding), drinking: n(c.drinking), total }
}

/**
 * อ่านผลของโมเดลของภาพเดียวจาก <HH>.json ฝั่ง server (ใช้ตอนบันทึกผลนับเทียบ ไม่เชื่อค่าที่ client ส่งมา)
 * คืน null ถ้าไม่มีไฟล์หรืออ่านไม่ได้
 */
const readSampleResult = async (samplePath) => {
    const supabase = getClient()
    if (!supabase || !/^[^/]+\/\d{4}-\d{2}-\d{2}\/\d{2}\.jpg$/.test(samplePath)) return null
    try {
        const { data: blob, error } = await supabase.storage.from(BUCKET).download(samplePath.replace(/\.jpg$/, '.json'))
        if (error || !blob) return null
        return JSON.parse(await blob.text())
    } catch (e) {
        return null
    }
}

/**
 * ภาพล่าสุดของฟาร์ม: <farm_id>/latest.jpg + latest.json เขียนทับทุกภาพ (ไม่เพิ่มพื้นที่)
 * ใช้ให้ผู้ดูแลคลิกเลือกวัวเป้าหมายจากภาพล่าสุด ไม่ throw
 */
const LATEST_JPG = (farmId) => `${farmId}/latest.jpg`
const LATEST_JSON = (farmId) => `${farmId}/latest.json`

const saveLatest = async (farmId, capturedAt, jpeg, result, imgsz) => {
    const supabase = getClient()
    if (!supabase || !farmId) return
    try {
        const json = Buffer.from(JSON.stringify(buildSampleJson(capturedAt, result, imgsz)))
        const [a, b] = await Promise.all([
            supabase.storage.from(BUCKET).upload(LATEST_JPG(farmId), jpeg, { contentType: 'image/jpeg', upsert: true }),
            supabase.storage.from(BUCKET).upload(LATEST_JSON(farmId), json, { contentType: 'application/json', upsert: true })
        ])
        if (a.error || b.error) console.warn('[CameraSamples] latest upload failed:', (a.error || b.error).message)
    } catch (err) {
        console.warn('[CameraSamples] latest upload failed:', err.message)
    }
}

const readJson = async (supabase, path) => {
    try {
        const { data: blob, error } = await supabase.storage.from(BUCKET).download(path)
        return error || !blob ? null : JSON.parse(await blob.text())
    } catch (e) {
        return null
    }
}

// ผลของโมเดลของภาพล่าสุด (อ่านฝั่ง server ตอนบันทึกการเลือกวัว ไม่เชื่อกรอบที่ client ส่งมา)
const readLatestResult = async (farmId) => {
    const supabase = getClient()
    return supabase && farmId ? readJson(supabase, LATEST_JSON(farmId)) : null
}

// ภาพล่าสุดพร้อม Signed URL และกรอบ (null = ยังไม่มีภาพ)
const getLatestImage = async (farmId) => {
    const supabase = getClient()
    if (!supabase || !farmId) return null
    const meta = await readJson(supabase, LATEST_JSON(farmId))
    if (!meta) return null
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(LATEST_JPG(farmId), 3600)
    if (!data?.signedUrl) return null
    return { source: 'latest', captured_at: meta.captured_at, image_url: data.signedUrl, image_size: meta.image || null, boxes: Array.isArray(meta.boxes) ? meta.boxes : [] }
}

// ภาพตัวอย่างรายชั่วโมงของวันเดียว (เวลาไทย) สำหรับคลิกเลือกวัวจากภาพย้อนหลัง เรียงจากเก่าไปใหม่
const listDaySamples = async (farmId, day) => {
    const supabase = getClient()
    if (!supabase || !farmId || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return []
    const { data: files, error } = await supabase.storage.from(BUCKET).list(`${farmId}/${day}`, { limit: 60 })
    if (error || !files) return []
    const names = new Set(files.map(f => f.name))
    const hours = [...names].filter(n => /^\d{2}\.jpg$/.test(n) && names.has(n.replace('.jpg', '.json'))).sort()
    if (!hours.length) return []
    const paths = hours.map(n => `${farmId}/${day}/${n}`)
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
    const urls = new Map((signed || []).map(s => [s.path, s.signedUrl]))
    const metas = await Promise.all(paths.map(p => readJson(supabase, p.replace(/\.jpg$/, '.json'))))
    return paths.map((p, i) => ({
        source: p,
        captured_at: metas[i]?.captured_at || null,
        hour_label: `${hours[i].slice(0, 2)}:00`,
        image_url: urls.get(p) || null,
        image_size: metas[i]?.image || null,
        boxes: Array.isArray(metas[i]?.boxes) ? metas[i].boxes : []
    })).filter(s => s.image_url && s.captured_at)
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
            // ไม่มี HH.json = ไม่รู้ว่าโมเดลนับได้เท่าไร (ห้ามแสดงเป็น 0)
            const counts = meta?.counts || null

            return {
                sample_path: item.sample_path,
                date: item.date,
                hour: item.hour,
                hour_label: item.hour_label,
                captured_at: meta?.captured_at || `${item.date}T${String(item.hour).padStart(2, '0')}:00:00+07:00`,
                image_url: signedMap.get(item.sample_path) || null,
                model: meta?.model || MODEL_FILE,
                image_size: meta?.image || null,
                model_counts: countsFromMeta(meta),
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

module.exports = {
    BUCKET, COLLECT_PREFIX,
    maybeSaveSample, samplePath, buildSampleJson, listFarmSamples, readSampleResult, countsFromMeta,
    saveLatest, readLatestResult, getLatestImage, listDaySamples,
    collectPath, buildCollectJson, saveCollectedImage, saveCollectedResult
}
