#!/usr/bin/env node
/**
 * ดาวน์โหลดภาพจากโหมดเก็บภาพทุกภาพ (อ่านอย่างเดียว ไม่ลบหรือแก้อะไรบน Storage)
 *
 *   node backend_node/scripts/download_collected.js                                 แสดงฟาร์มและวันที่ที่มีภาพ
 *   node backend_node/scripts/download_collected.js --farm <farm_id>                ดึงทุกวัน
 *   node backend_node/scripts/download_collected.js --farm <farm_id> --date 2026-11-25 [--out <dir>]
 *
 * ปลายทางเริ่มต้น: backend/training_archive/farm_collect/<farm_id>/<YYYY-MM-DD>/ (อยู่ใน .gitignore ภาพจากฟาร์มไม่ขึ้น git)
 * แต่ละวันได้ index.csv (เวลา สถานะ จำนวนวัวแต่ละท่า เวลาประมวลผล) ไว้ใช้ตีกรอบ/วิเคราะห์ต่อ
 * ไฟล์ที่มีอยู่แล้วจะข้าม รันซ้ำเพื่อดึงต่อได้
 * ต้องมี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน backend_node/.env
 * หลังดาวน์โหลด: ตรวจสำเนาแล้วลบออกจาก Storage ด้วย scripts/free_collected.js
 */
const fs = require('fs')
const path = require('path')
const { BUCKET, PREFIX, DEFAULT_OUT, parseArgs, getClient, listAll, dayFiles } = require('./lib/collectedStorage')

const PARALLEL = 4

const csvCell = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// index.csv ของวันนั้นจากไฟล์ .json ที่ดาวน์โหลดแล้ว
const writeIndex = (dir) => {
    const jpgs = fs.readdirSync(dir).filter(n => /^\d{6}\.jpg$/.test(n)).sort()
    const header = ['file', 'captured_at', 'status', 'total', 'lying', 'standing', 'feeding', 'drinking', 'model_sec', 'end_to_end_sec', 'resize', 'model']
    const status = { ok: 0, busy: 0, error: 0, no_json: 0 }
    const lines = [header.join(',')]
    for (const jpg of jpgs) {
        let meta = null
        try { meta = JSON.parse(fs.readFileSync(path.join(dir, jpg.replace('.jpg', '.json')), 'utf8')) } catch (e) { /* ไม่มีผลของภาพนี้ */ }
        const st = meta?.status || (meta ? 'ok' : 'no_json')
        status[st] = (status[st] || 0) + 1
        const c = meta?.counts || {}
        const sec = (ms) => (Number.isFinite(Number(ms)) && ms !== null ? Math.round(Number(ms) / 100) / 10 : '')
        lines.push([
            jpg, meta?.captured_at || '', st,
            meta?.total ?? '', c.lying ?? '', c.standing ?? '', c.feeding ?? '', c.drinking ?? '',
            sec(meta?.timing_ms?.total), sec(meta?.timing_ms?.end_to_end), meta?.resize || '', meta?.model || ''
        ].map(csvCell).join(','))
    }
    fs.writeFileSync(path.join(dir, 'index.csv'), lines.join('\n') + '\n')
    return { images: jpgs.length, status, first: jpgs[0], last: jpgs[jpgs.length - 1] }
}

const hhmmss = (name) => name ? `${name.slice(0, 2)}:${name.slice(2, 4)}:${name.slice(4, 6)}` : '-'

const main = async () => {
    const args = parseArgs(process.argv.slice(2))
    const storage = getClient().storage.from(BUCKET)

    if (!args.farm || args.farm === true) {
        const farms = (await listAll(storage, PREFIX)).filter(x => !x.id)
        if (!farms.length) return console.log(`ยังไม่มีภาพใน ${BUCKET}/${PREFIX}/ (เปิดโหมดเก็บภาพทุกภาพที่หน้า Admin > อุปกรณ์)`)
        console.log(`ฟาร์มที่มีภาพใน ${BUCKET}/${PREFIX}/:`)
        for (const f of farms) {
            const days = (await listAll(storage, `${PREFIX}/${f.name}`)).filter(x => !x.id).map(x => x.name)
            console.log(`  --farm ${f.name}   วันที่: ${days.join(', ') || '-'}`)
        }
        return
    }

    const farm = String(args.farm).trim()
    if (!/^[0-9a-f-]{36}$/i.test(farm)) throw new Error('--farm ต้องเป็นรหัสฟาร์ม (UUID)')
    if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(args.date))) throw new Error('--date ต้องเป็นรูปแบบ YYYY-MM-DD')
    const outRoot = args.out && args.out !== true ? path.resolve(String(args.out)) : DEFAULT_OUT
    const days = args.date
        ? [String(args.date)]
        : (await listAll(storage, `${PREFIX}/${farm}`)).filter(x => !x.id).map(x => x.name).filter(n => /^\d{4}-\d{2}-\d{2}$/.test(n))
    if (!days.length) return console.log('ไม่มีภาพของฟาร์มนี้')

    for (const day of days) {
        const remoteDir = `${PREFIX}/${farm}/${day}`
        const localDir = path.join(outRoot, farm, day)
        fs.mkdirSync(localDir, { recursive: true })
        const files = await dayFiles(storage, farm, day)
        const todo = files.filter(f => !fs.existsSync(path.join(localDir, f.name)))
        let done = 0
        let failed = 0
        for (let i = 0; i < todo.length; i += PARALLEL) {
            await Promise.all(todo.slice(i, i + PARALLEL).map(async (f) => {
                const { data, error } = await storage.download(`${remoteDir}/${f.name}`)
                if (error || !data) { failed++; return console.warn(`  ดาวน์โหลดไม่ได้ ${f.name}: ${error?.message || 'ไม่มีข้อมูล'}`) }
                fs.writeFileSync(path.join(localDir, f.name), Buffer.from(await data.arrayBuffer()))
                done++
            }))
            // ความคืบหน้าเฉพาะตอนรันในเทอร์มินัล (ถ้าส่งออกเป็น log จะกลายเป็นบรรทัดยาวมาก)
            if (process.stdout.isTTY) process.stdout.write(`\r  ${day}: ${done}/${todo.length} ไฟล์`)
        }
        if (todo.length && process.stdout.isTTY) process.stdout.write('\n')
        const s = writeIndex(localDir)
        console.log(`${day}: ภาพ ${s.images} (${hhmmss(s.first)}–${hhmmss(s.last)}) · มีผลของโมเดล ${s.status.ok} · ยุ่ง ${s.status.busy} · ผิดพลาด ${s.status.error}${s.status.no_json ? ` · ไม่มี .json ${s.status.no_json}` : ''} · ไฟล์ใหม่ ${done}${failed ? ` · ดึงไม่ได้ ${failed}` : ''}`)
        console.log(`  → ${path.relative(process.cwd(), localDir) || localDir}`)
    }
}

main().catch((err) => {
    console.error('ผิดพลาด:', err.message)
    process.exitCode = 1
})
