#!/usr/bin/env node
/**
 * คืนพื้นที่ Storage หลังวันเก็บข้อมูล: ตรวจว่าภาพบน Storage มีสำเนาในเครื่องครบและตรงทุกไฟล์ แล้วจึงลบ
 * (Supabase แพ็กฟรี 1 GB: เก็บทุกภาพทุก 15 วิ ~430 MB ต่อ 6 ชม. ต้องลบคืนวันที่ 6 ก่อนเริ่มวันที่ 7)
 *
 *   node backend_node/scripts/free_collected.js --farm <farm_id> --date 2026-12-06
 *       ตรวจอย่างเดียว (ไม่ลบ): บอกจำนวนไฟล์ ไฟล์ที่ตรง ไฟล์ที่มีปัญหา และพื้นที่ที่จะได้คืน
 *   ... --backup <dir>   ตรวจสำเนาชุดที่ 2 ด้วย (เช่น โฟลเดอร์ Google Drive บนเครื่อง) ต้องตรงทั้ง 2 ที่
 *   ... --delete         ลบจริง เฉพาะเมื่อทุกไฟล์ตรง (มีปัญหาแม้ไฟล์เดียว = ไม่ลบอะไรเลย) และต้องพิมพ์ยืนยัน
 *
 * ลบเฉพาะ collect/<farm>/<date>/ ไม่แตะภาพรายชั่วโมงหรือภาพล่าสุด
 * ลบได้เฉพาะไฟล์ที่ตรวจแล้วตอนรัน ภาพที่เข้ามาระหว่างนั้น (โหมดเก็บภาพยังเปิด) ยังอยู่ รันซ้ำได้
 * ต้องรัน download_collected.js ก่อน และมี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน backend_node/.env
 */
const path = require('path')
const readline = require('readline')
const { BUCKET, PREFIX, DEFAULT_OUT, parseArgs, getClient, dayFiles, verifyCopies, removeFiles } = require('./lib/collectedStorage')

const mb = (b) => `${(b / 1048576).toFixed(1)} MB`

const ask = (q) => new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, (a) => { rl.close(); resolve(a.trim()) })
})

const run = async (args, storage, confirm = ask) => {
    const farm = String(args.farm || '').trim()
    const day = String(args.date || '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(farm)) throw new Error('--farm ต้องเป็นรหัสฟาร์ม (UUID)')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('--date ต้องเป็นรูปแบบ YYYY-MM-DD (ลบทีละวันเท่านั้น)')
    const outRoot = args.out && args.out !== true ? path.resolve(String(args.out)) : DEFAULT_OUT
    const dirs = [path.join(outRoot, farm, day)]
    if (args.backup && args.backup !== true) dirs.push(path.join(path.resolve(String(args.backup)), farm, day))

    const remoteDir = `${PREFIX}/${farm}/${day}`
    const files = await dayFiles(storage, farm, day)
    if (!files.length) { console.log(`ไม่มีไฟล์ใน ${BUCKET}/${remoteDir}/ (อาจลบไปแล้ว)`); return { deleted: 0, total: 0, problems: [] } }

    const v = verifyCopies(files, dirs)
    console.log(`${BUCKET}/${remoteDir}/: ${v.total} ไฟล์ · ตรงกับสำเนา ${v.ok.length} · มีปัญหา ${v.problems.length} · พื้นที่ที่จะได้คืน ${mb(v.bytes)}`)
    console.log(`สำเนาที่ตรวจ: ${dirs.join(' และ ')}`)
    if (dirs.length < 2) console.log('แนะนำ: ทำสำเนาชุดที่ 2 (เช่น Google Drive) แล้วรันพร้อม --backup <dir> ข้อมูลวันจริงเก็บใหม่ไม่ได้')
    for (const p of v.problems.slice(0, 20)) console.log(`  ✗ ${p.name}: ${p.reason}`)
    if (v.problems.length > 20) console.log(`  ... และอีก ${v.problems.length - 20} ไฟล์`)

    if (!args.delete) { console.log('ตรวจอย่างเดียว ยังไม่ลบ (เพิ่ม --delete เพื่อลบ)'); return { deleted: 0, total: v.total, problems: v.problems } }
    if (v.problems.length) {
        console.log('ไม่ลบ: มีไฟล์ที่ยังไม่มีสำเนาหรือสำเนาไม่ตรง รัน download_collected.js อีกครั้ง แล้วตรวจใหม่')
        process.exitCode = 2
        return { deleted: 0, total: v.total, problems: v.problems }
    }
    const answer = await confirm(`ลบ ${v.ok.length} ไฟล์ (${mb(v.bytes)}) จาก ${BUCKET}/${remoteDir}/ ถาวร? พิมพ์ ${day} เพื่อยืนยัน: `)
    if (answer !== day) { console.log('ยกเลิก ไม่ได้ลบอะไร'); return { deleted: 0, total: v.total, problems: [] } }
    const deleted = await removeFiles(storage, remoteDir, v.ok)
    console.log(`ลบแล้ว ${deleted} ไฟล์ ได้พื้นที่คืนประมาณ ${mb(v.bytes)}`)
    return { deleted, total: v.total, problems: [] }
}

if (require.main === module) {
    const args = parseArgs(process.argv.slice(2))
    Promise.resolve()
        .then(() => run(args, getClient().storage.from(BUCKET)))
        .catch((err) => { console.error('ผิดพลาด:', err.message); process.exitCode = 1 })
}

module.exports = { run }
