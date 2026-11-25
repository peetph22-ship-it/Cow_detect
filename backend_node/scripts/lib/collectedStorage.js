/**
 * ตัวช่วยร่วมของสคริปต์ภาพจากโหมดเก็บภาพทุกภาพ (download_collected.js, free_collected.js)
 * ไฟล์บน Storage: camera-samples/collect/<farm_id>/<YYYY-MM-DD>/<HHMMSS>.jpg (+ .json)
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })

const BUCKET = process.env.CAMERA_SAMPLE_BUCKET || 'camera-samples'
const PREFIX = 'collect'
const DEFAULT_OUT = path.resolve(__dirname, '../../../backend/training_archive/farm_collect')
const PAGE = 1000
const FILE_RE = /^\d{6}\.(jpg|json)$/

const parseArgs = (argv) => {
    const out = {}
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) continue
        const next = argv[i + 1]
        if (next !== undefined && !next.startsWith('--')) { out[argv[i].slice(2)] = next; i++ } else out[argv[i].slice(2)] = true
    }
    return out
}

const getClient = () => {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
        throw new Error('ไม่มี SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ใน backend_node/.env\n'
            + '  เพิ่ม 2 บรรทัดนี้ใน backend_node/.env (ค่าเดียวกับ Render > Environment หรือ Supabase > Project Settings > API > service_role)\n'
            + '  ห้าม commit ไฟล์ .env (มีใน .gitignore แล้ว)')
    }
    const { createClient } = require('@supabase/supabase-js')
    return createClient(url, key, { auth: { persistSession: false } })
}

// รายการทั้งหมดในโฟลเดอร์ (โฟลเดอร์ย่อยมี id = null)
const listAll = async (storage, dir) => {
    const items = []
    for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await storage.list(dir, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
        if (error) throw new Error(`list ${dir}: ${error.message}`)
        items.push(...(data || []).filter(x => x.name && x.name !== '.emptyFolderPlaceholder'))
        if (!data || data.length < PAGE) break
    }
    return items
}

const dayFiles = async (storage, farm, day) =>
    (await listAll(storage, `${PREFIX}/${farm}/${day}`)).filter(x => x.id && FILE_RE.test(x.name))

const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex')

/**
 * ตรวจว่าไฟล์บน Storage ของวันนั้นมีสำเนาในเครื่องครบและตรงทุกไฟล์
 * ตรวจ: มีไฟล์ / ขนาดเท่ากัน / md5 ตรงกับ eTag (ถ้า Storage ให้มา) / JPEG ครบหัวท้าย / JSON อ่านได้
 * @returns {{total, ok: string[], problems: Array<{name, reason}>, bytes}}
 */
const verifyCopies = (remoteFiles, dirs) => {
    const ok = []
    const problems = []
    let bytes = 0
    for (const f of remoteFiles) {
        const size = Number(f.metadata?.size)
        const etag = String(f.metadata?.eTag || '').replace(/"/g, '').toLowerCase()
        let bad = null
        for (const dir of dirs) {
            const p = path.join(dir, f.name)
            if (!fs.existsSync(p)) { bad = `ไม่มีไฟล์ใน ${dir}`; break }
            const buf = fs.readFileSync(p)
            if (Number.isFinite(size) && buf.length !== size) { bad = `ขนาดไม่ตรง (${buf.length} ≠ ${size}) ใน ${dir}`; break }
            if (/^[0-9a-f]{32}$/.test(etag) && md5(buf) !== etag) { bad = `md5 ไม่ตรงใน ${dir}`; break }
            if (f.name.endsWith('.jpg') && !(buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9)) { bad = `JPEG ไม่ครบใน ${dir}`; break }
            if (f.name.endsWith('.json')) { try { JSON.parse(buf.toString('utf8')) } catch (e) { bad = `JSON อ่านไม่ได้ใน ${dir}`; break } }
        }
        if (bad) problems.push({ name: f.name, reason: bad })
        else { ok.push(f.name); bytes += Number.isFinite(size) ? size : 0 }
    }
    return { total: remoteFiles.length, ok, problems, bytes }
}

// ลบเป็นชุด (ชุดละ 100) คืนจำนวนที่ลบสำเร็จ
const removeFiles = async (storage, remoteDir, names) => {
    let removed = 0
    for (let i = 0; i < names.length; i += 100) {
        const batch = names.slice(i, i + 100).map(n => `${remoteDir}/${n}`)
        const { data, error } = await storage.remove(batch)
        if (error) throw new Error(`remove: ${error.message} (ลบไปแล้ว ${removed} ไฟล์)`)
        removed += Array.isArray(data) ? data.length : batch.length
    }
    return removed
}

module.exports = { BUCKET, PREFIX, DEFAULT_OUT, FILE_RE, parseArgs, getClient, listAll, dayFiles, verifyCopies, removeFiles, md5 }
