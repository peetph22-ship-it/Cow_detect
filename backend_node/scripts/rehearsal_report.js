#!/usr/bin/env node
/**
 * รายงานซ้อมกล่องเซ็นเซอร์ + กล้อง (อ่านอย่างเดียว: ทุก query อยู่ใน transaction READ ONLY แก้ฐานข้อมูลไม่ได้)
 *
 *   node backend_node/scripts/rehearsal_report.js                    แสดงรายชื่อกล่อง
 *   node backend_node/scripts/rehearsal_report.js --device <serial>
 *   node backend_node/scripts/rehearsal_report.js --device <serial> --from "2026-11-22 10:00" --to "2026-11-22 11:00"
 *   ตัวเลือก: --interval 60  รอบถ่ายภาพ (วินาที) ถ้าเปลี่ยนระหว่างซ้อม
 *            --json         ผลแบบ JSON
 *
 * ไม่ระบุช่วงเวลา = รอบเก็บภาพทุกภาพล่าสุดของกล่อง (ไม่เคยเปิด = 60 นาทีล่าสุด)
 * เวลาที่ไม่มีโซนเวลา = เวลาไทย, พิมพ์แค่ "10:00" = วันนี้
 * ต้องมี backend_node/.env (DATABASE_URL) เหมือนตอนรัน server
 * เกณฑ์: docs/PROJECT_PLAN.md ระยะ 1 และหัวข้อ 5 (services/rehearsalStats.js: CRITERIA)
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true })
// เน็ตบางที่ต่อฐานข้อมูลช้า (5–30 วิ): รอได้นานขึ้นและลองใหม่ ก่อนโหลด config/db
process.env.DB_CONNECT_TIMEOUT_MS = process.env.DB_CONNECT_TIMEOUT_MS || '30000'
const db = require('../app/config/db')

const connectWithRetry = async (tries = 3) => {
    for (let i = 1; ; i++) {
        try {
            return await db.pool.connect()
        } catch (err) {
            if (i >= tries || !/timeout|ECONNRESET|terminated/i.test(err.message)) {
                throw new Error(`${err.message} (ลองต่อฐานข้อมูล ${i} ครั้งแล้ว ถ้ายังไม่ได้ ลองเปลี่ยนเน็ต เช่น hotspot มือถือ)`)
            }
            console.log(`ต่อฐานข้อมูลไม่ทัน (ครั้งที่ ${i}) กำลังลองใหม่...`)
        }
    }
}
const { CRITERIA, SENSOR_INTERVAL_SEC, coverage, summarizeSeconds, cameraBreakdown, judge } = require('../app/services/rehearsalStats')

const BUCKET = process.env.CAMERA_SAMPLE_BUCKET || 'camera-samples'
const COLLECT_PREFIX = 'collect'
const FIRMWARE_DEFAULT_INTERVAL_SEC = 600

const parseArgs = (argv) => {
    const out = {}
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) continue
        const key = argv[i].slice(2)
        const next = argv[i + 1]
        if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++ } else out[key] = true
    }
    return out
}

const thaiDay = (d) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10)

// "10:00" = วันนี้ (เวลาไทย), "2026-11-22 10:00" = เวลาไทย, ISO มีโซนเวลา = ตามนั้น
const parseTime = (value, now) => {
    if (!value || value === true) return null
    const s = String(value).trim()
    const hm = (t) => {
        const [h, m, sec = '00'] = t.split(':')
        return `${h.padStart(2, '0')}:${m}:${sec.padStart(2, '0')}`
    }
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return new Date(`${thaiDay(now)}T${hm(s)}+07:00`)
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2}(:\d{2})?)$/)
    if (m) return new Date(`${m[1]}T${hm(m[2])}+07:00`)
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
}

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'
const fmtDate = (d) => new Date(d).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' })

// วันที่ (เวลาไทย) ทุกวันที่ช่วงเวลาครอบคลุม
const thaiDaysBetween = (from, to) => {
    const days = []
    for (let t = from.getTime(); ; t += 86400e3) {
        const day = thaiDay(new Date(Math.min(t, to.getTime())))
        if (!days.includes(day)) days.push(day)
        if (t >= to.getTime()) break
    }
    return days
}

// collect/<farm>/<YYYY-MM-DD>/<HHMMSS>.jpg -> เวลาที่ถ่าย
const collectNameToDate = (name) => {
    const m = name.match(/\/(\d{4}-\d{2}-\d{2})\/(\d{2})(\d{2})(\d{2})\.jpg$/)
    return m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}+07:00`) : null
}

const BEHAVIOR_TH = { lying: 'นอน', standing: 'ยืน', feeding: 'กิน', drinking: 'ดื่มน้ำ', not_visible: 'ไม่เห็น' }

const main = async () => {
    const args = parseArgs(process.argv.slice(2))
    const now = new Date()
    // ตรวจเวลาที่พิมพ์ก่อนต่อฐานข้อมูล (เช่น ลืมแก้ HH:MM ในตัวอย่าง)
    for (const k of ['from', 'to']) {
        if (args[k] && !parseTime(args[k], now)) throw new Error(`อ่านเวลา --${k} "${args[k]}" ไม่ได้ ใส่เวลาจริง เช่น "2026-11-25 16:00" หรือ "16:00"`)
    }
    const client = await connectWithRetry()
    // query ที่อาจไม่มีตาราง/คอลัมน์ (ยังไม่รัน migration): ห่อด้วย savepoint ไม่ให้ transaction ทั้งก้อนล้ม
    const tryQuery = async (sql, params) => {
        await client.query('SAVEPOINT q')
        try {
            const r = await client.query(sql, params)
            await client.query('RELEASE SAVEPOINT q')
            return r.rows
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT q')
            return { error: err }
        }
    }

    try {
        await client.query('BEGIN TRANSACTION READ ONLY')

        const devices = await client.query(`
            SELECT d.id_devices, d.serial_no, d.name_devices, d.id_farms, f.name_farms,
                   to_jsonb(d)->>'fw_version' AS fw_version,
                   (to_jsonb(d)->>'camera_interval_sec')::int AS camera_interval_sec,
                   to_jsonb(d)->>'collect_started_at' AS collect_started_at,
                   to_jsonb(d)->>'collect_until' AS collect_until
            FROM tb_devices d LEFT JOIN tb_farms f ON f.id_farms = d.id_farms
            ORDER BY d.created_at`)
        const wanted = args.device && args.device !== true ? String(args.device).trim().toUpperCase() : null
        const bound = devices.rows.filter(d => d.id_farms)
        const device = wanted
            ? devices.rows.find(d => String(d.serial_no || '').toUpperCase() === wanted || String(d.id_devices).toUpperCase() === wanted)
            : bound.length === 1 ? bound[0] : null
        if (!device) {
            console.log(wanted ? `ไม่พบกล่อง ${wanted}` : 'ระบุกล่องด้วย --device <serial>')
            console.log('กล่องในระบบ:')
            for (const d of devices.rows) console.log(`  ${d.serial_no}  ${d.name_devices || ''}  ฟาร์ม: ${d.name_farms || '(ยังไม่ผูก)'}`)
            process.exitCode = 1
            return
        }
        if (!device.id_farms) {
            console.log(`กล่อง ${device.serial_no} ยังไม่ผูกฟาร์ม: server ไม่รับภาพจากกล่องนี้`)
            process.exitCode = 1
            return
        }

        // ช่วงเวลา
        let from = parseTime(args.from, now)
        let to = parseTime(args.to, now)
        if ((args.from && !from) || (args.to && !to)) throw new Error('อ่านเวลา --from/--to ไม่ได้ (ตัวอย่าง "2026-11-22 10:00" หรือ "10:00")')
        const cs = device.collect_started_at ? new Date(device.collect_started_at) : null
        const cu = device.collect_until ? new Date(device.collect_until) : null
        let windowSource = 'กำหนดเอง'
        if (!from) {
            if (cs && cu && !args.to) {
                from = cs
                to = cu
                windowSource = cu > now ? 'รอบเก็บภาพทุกภาพที่กำลังเปิดอยู่ (ถึงตอนนี้)' : 'รอบเก็บภาพทุกภาพล่าสุด'
            } else {
                to = to || now
                from = new Date(to.getTime() - 60 * 60e3)
                windowSource = '60 นาทีก่อนเวลาสิ้นสุด'
            }
        }
        if (!to || to > now) to = now  // อนาคตยังไม่มีข้อมูล ไม่นับเป็นภาพที่หาย
        if (from >= to) throw new Error('ช่วงเวลาไม่ถูกต้อง: เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด')

        const intervalArg = args.interval && args.interval !== true ? Number(args.interval) : null
        if (intervalArg != null && !(Number.isInteger(intervalArg) && intervalArg >= 15 && intervalArg <= 3600)) throw new Error('--interval ต้องเป็นจำนวนเต็ม 15–3600 วินาที')
        const intervalSec = intervalArg || device.camera_interval_sec || FIRMWARE_DEFAULT_INTERVAL_SEC
        const intervalSource = intervalArg ? 'จาก --interval' : device.camera_interval_sec ? 'ตั้งจากหน้าเว็บ' : 'ค่าในเฟิร์มแวร์'

        // เซ็นเซอร์
        const sensorRows = await client.query(
            `SELECT recorded_at FROM tb_sensor_readings WHERE id_devices = $1 AND recorded_at >= $2 AND recorded_at < $3 ORDER BY recorded_at`,
            [device.id_devices, from, to])
        const sensor = coverage(sensorRows.rows.map(r => r.recorded_at), from, to, SENSOR_INTERVAL_SEC)

        // กล้อง: ภาพที่ประมวลผลแล้ว (cctv_behavior_telemetry มีทุกภาพที่ประมวลผลสำเร็จ)
        let tel = await tryQuery(
            `SELECT timestamp, total_cows_detected, ai_confidence_avg, detections->'timing_ms' AS timing
             FROM cctv_behavior_telemetry WHERE farm_id = $1 AND is_simulation = false AND timestamp >= $2 AND timestamp < $3 ORDER BY timestamp`,
            [device.id_farms, from, to])
        if (tel.error) {
            // ยังไม่มีคอลัมน์ detections (migration 20261106)
            tel = await tryQuery(
                `SELECT timestamp, total_cows_detected, ai_confidence_avg, NULL::jsonb AS timing
                 FROM cctv_behavior_telemetry WHERE farm_id = $1 AND is_simulation = false AND timestamp >= $2 AND timestamp < $3 ORDER BY timestamp`,
                [device.id_farms, from, to])
            if (tel.error) throw tel.error
        }
        const camera = coverage(tel.map(r => r.timestamp), from, to, intervalSec)

        // ภาพที่ถึง server (เฉพาะช่วงที่เปิดโหมดเก็บภาพทุกภาพ)
        const collectedNames = []
        let storageReadable = true
        for (const day of thaiDaysBetween(from, to)) {
            const rows = await tryQuery(`SELECT name FROM storage.objects WHERE bucket_id = $1 AND name LIKE $2`, [BUCKET, `${COLLECT_PREFIX}/${device.id_farms}/${day}/%`])
            if (rows.error) { storageReadable = false; break }
            collectedNames.push(...rows.map(r => r.name))
        }
        const collectedTimes = collectedNames.filter(n => n.endsWith('.jpg')).map(collectNameToDate).filter(d => d && d >= from && d < to)
        const slack = 2 * 60e3
        const collectCovers = Boolean(cs && cu && cs.getTime() <= from.getTime() + slack && cu.getTime() >= to.getTime() - slack)
        const breakdown = cameraBreakdown({ expected: camera.expected, processed: camera.count, received: collectCovers && storageReadable ? collectedTimes.length : null })

        // เวลาประมวลผล (เฉพาะภาพหลัง deploy ที่บันทึก timing_ms)
        const processing = {
            model: summarizeSeconds(tel.map(r => r.timing?.total)),
            end_to_end: summarizeSeconds(tel.map(r => r.timing?.end_to_end))
        }

        // จำนวนวัวที่โมเดลเห็นต่อภาพ
        const counts = tel.map(r => Number(r.total_cows_detected)).filter(Number.isFinite)
        const confs = tel.map(r => Number(r.ai_confidence_avg)).filter(x => Number.isFinite(x) && x > 0)
        const detection = counts.length ? {
            mean: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length * 10) / 10,
            min: Math.min(...counts),
            max: Math.max(...counts),
            conf_mean: confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length * 100) / 100 : null
        } : null

        // วัวเป้าหมาย (ตารางจาก migration 20261112 / 20261117)
        const obs = await tryQuery(
            `SELECT c.tag_id, c.name_cows, o.behavior, count(*)::int AS n
             FROM tb_cow_behavior_observations o JOIN tb_cows c ON c.id_cows = o.id_cows
             WHERE o.id_farms = $1 AND o.observed_at >= $2 AND o.observed_at < $3
             GROUP BY c.tag_id, c.name_cows, o.behavior ORDER BY c.tag_id, o.behavior`,
            [device.id_farms, from, to])
        const cows = {}
        if (!obs.error) {
            for (const r of obs) {
                const key = r.tag_id || r.name_cows || '?'
                cows[key] = cows[key] || { tag_id: r.tag_id, name: r.name_cows, by_behavior: {}, total: 0 }
                cows[key].by_behavior[r.behavior] = r.n
                cows[key].total += r.n
            }
        }

        const windowMin = Math.round((to - from) / 60e3 * 10) / 10
        const checks = judge({ window_min: windowMin, sensor, camera, breakdown, processing })

        const report = {
            generated_at: now.toISOString(),
            farm: { id: device.id_farms, name: device.name_farms },
            device: { serial: device.serial_no, fw_version: device.fw_version },
            window: { from: from.toISOString(), to: to.toISOString(), minutes: windowMin, source: windowSource },
            camera_interval_sec: intervalSec,
            camera_interval_source: intervalSource,
            sensor, camera, breakdown,
            collect: { covers_window: collectCovers, storage_readable: storageReadable, images_in_window: collectedTimes.length },
            processing, detection,
            target_cows: Object.values(cows),
            criteria: CRITERIA,
            checks
        }

        if (args.json) {
            console.log(JSON.stringify(report, null, 2))
            return
        }
        printReport(report)
    } finally {
        await client.query('ROLLBACK').catch(() => {})
        client.release()
        await db.pool.end()
    }
}

const gapText = (g) => `${fmtTime(g.from)}–${fmtTime(g.to)} (ขาด ${g.missing})`

const printReport = (r) => {
    const L = (s = '') => console.log(s)
    L('รายงานซ้อม CowCare AI (อ่านอย่างเดียว)')
    L(`ฟาร์ม: ${r.farm.name || r.farm.id} · กล่อง ${r.device.serial}${r.device.fw_version ? ` (fw ${r.device.fw_version})` : ''}`)
    L(`ช่วงเวลา: ${fmtDate(r.window.from)} ${fmtTime(r.window.from)}–${fmtTime(r.window.to)} น. (${r.window.minutes} นาที) · ${r.window.source}`)
    L(`รอบถ่ายภาพ: ${r.camera_interval_sec} วินาที (${r.camera_interval_source})`)
    L()
    L(`เซ็นเซอร์ (ควรมาทุก ${SENSOR_INTERVAL_SEC} วินาที)`)
    L(`  ได้ ${r.sensor.count}/${r.sensor.expected} ค่า (${r.sensor.pct ?? '-'}%) · หลุดนานสุด ${r.sensor.longest_gap.min} นาที${r.sensor.longest_gap.from ? ` (${fmtTime(r.sensor.longest_gap.from)}–${fmtTime(r.sensor.longest_gap.to)})` : ''}`)
    L('กล้อง')
    L(`  ประมวลผลแล้ว ${r.camera.count}/${r.camera.expected} ภาพ (${r.camera.pct ?? '-'}%)`)
    if (r.breakdown.received != null) {
        L(`  ถึง server ${r.breakdown.received} ภาพ → ยุ่ง/ผิดพลาด ${r.breakdown.busy_or_error} (${r.breakdown.busy_pct ?? '-'}%) · หายก่อนถึง server ${r.breakdown.lost}`)
    } else {
        L(`  ไม่ได้ประมวลผล ${r.breakdown.lost_or_busy} ภาพ (แยกไม่ได้ว่า server ยุ่งหรือภาพหายระหว่างทาง: ${r.collect.storage_readable ? 'โหมดเก็บภาพทุกภาพไม่ได้เปิดตลอดช่วงนี้' : 'อ่าน storage.objects ไม่ได้'})`)
        if (r.collect.images_in_window) L(`  ภาพที่เก็บไว้ในช่วงนี้ ${r.collect.images_in_window} ภาพ`)
    }
    if (r.camera.missing_gaps.length) {
        const shown = r.camera.missing_gaps.slice(0, 8).map(gapText).join(', ')
        L(`  ช่วงที่ขาด: ${shown}${r.camera.missing_gaps.length > 8 ? ` และอีก ${r.camera.missing_gaps.length - 8} ช่วง` : ''}`)
    }
    L('เวลาประมวลผลต่อภาพ (บน server)')
    const t = (s) => s.n ? `มัธยฐาน ${s.median} วิ · p90 ${s.p90} วิ · สูงสุด ${s.max} วิ (${s.n} ภาพ)` : 'ไม่มีข้อมูล (ภาพก่อน deploy เวอร์ชันนี้ไม่ได้บันทึกเวลา)'
    L(`  ในโมเดล: ${t(r.processing.model)}`)
    L(`  ตั้งแต่รับภาพจนได้ผล (รวมรอคิว): ${t(r.processing.end_to_end)}`)
    if (r.detection) {
        L(`วัวที่โมเดลเห็นต่อภาพ: เฉลี่ย ${r.detection.mean} ตัว (${r.detection.min}–${r.detection.max})${r.detection.conf_mean != null ? ` · ความมั่นใจเฉลี่ย ${r.detection.conf_mean}` : ''}`)
    }
    if (r.target_cows.length) {
        L('วัวเป้าหมาย (ผลของระบบ ความถูกตัวต้องสุ่มตรวจด้วยตา)')
        for (const c of r.target_cows) {
            const parts = Object.entries(c.by_behavior).map(([b, n]) => `${BEHAVIOR_TH[b] || b} ${n}`).join(' · ')
            const seen = c.total - (c.by_behavior.not_visible || 0)
            L(`  ${c.tag_id ? `#${c.tag_id}` : ''}${c.name ? ` ${c.name}` : ''}: ${parts} → ติดตามได้ ${seen}/${c.total} ภาพ`)
        }
    }
    L()
    L('เกณฑ์ (docs/PROJECT_PLAN.md)')
    for (const c of r.checks) L(`  ${c.ok === true ? '✅' : c.ok === false ? '❌' : '⚪'} ${c.label} — ${c.detail}`)
    const pass = r.checks.filter(c => c.ok === true).length
    const fail = r.checks.filter(c => c.ok === false)
    const unknown = r.checks.filter(c => c.ok === null).length
    L(`สรุป: ผ่าน ${pass}/${r.checks.length}${fail.length ? ` · ไม่ผ่าน ${fail.length}` : ''}${unknown ? ` · ตัดสินไม่ได้ ${unknown}` : ''}`)
    const failed = new Set(fail.map(c => c.key))
    if (failed.has('processing') || failed.has('busy')) L('→ server ฟรีไม่ทัน: อัปเกรด Render เฉพาะเดือนที่เก็บข้อมูล หรือรัน backend บน laptop ที่ฟาร์ม (PROJECT_PLAN หัวข้อ 5)')
    if (failed.has('camera') && !failed.has('busy')) L('→ ภาพหายก่อนถึง server: ตรวจ Wi-Fi/เน็ตของกล่องและการเชื่อมต่อกล้อง (Serial Monitor บรรทัด [CAM])')
    if (failed.has('sensor')) L('→ เซ็นเซอร์ขาดช่วง: ตรวจไฟเลี้ยงกล่อง สายเซ็นเซอร์ SHT40 (3.3V, SDA 8, SCL 9) และ Wi-Fi')
}

main().catch(async (err) => {
    console.error('ผิดพลาด:', err.message)
    process.exitCode = 1
})
