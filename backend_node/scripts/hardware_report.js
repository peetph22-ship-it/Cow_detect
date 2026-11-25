#!/usr/bin/env node
/**
 * ตัวเลขฝั่งฮาร์ดแวร์สำหรับเปเปอร์ (อ่านอย่างเดียว ไม่แก้ข้อมูล)
 *
 *   node backend_node/scripts/hardware_report.js --device ESP32-S3-01 --from "2026-12-07 08:00" --to "2026-12-07 16:00"
 *   ... --json out.json     เก็บตัวเลขทั้งหมดเป็นไฟล์ (ใช้ทำตารางในเปเปอร์)
 *   ไม่ใส่ --from/--to = 24 ชม. ล่าสุด
 *
 * ความต่อเนื่องของกล่อง การรีบูตและสาเหตุ สัญญาณ Wi-Fi หน่วยความจำ (tb_device_heartbeats)
 * ความครบและความหน่วงของค่าเซ็นเซอร์ ค่าที่ส่งย้อนหลังจากคิว (tb_sensor_readings.received_at)
 * ความครบของภาพ ภาพที่ server ยุ่ง ขนาดภาพ ปริมาณเน็ตต่อวัน ความหน่วงภาพ (tb_camera_frames)
 * เวลาประมวลผลภาพบน server (cctv_behavior_telemetry.detections.timing_ms)
 * ต้องรัน migrations/20261125_hardware_evidence_log.sql ก่อนเก็บข้อมูล (ข้อมูลก่อนหน้านั้นไม่มีตัวเลขเหล่านี้)
 */
const fs = require('fs')
const { parseArgs, parseTime, fmtTime, fmtDate, readOnly } = require('./lib/reportCommon')
const { heartbeatStats, sensorStats, frameStats, bandwidthPerDay } = require('../app/services/hardwareStats')
const { summarizeSeconds } = require('../app/services/rehearsalStats')

const FIRMWARE_DEFAULT_INTERVAL_SEC = 600
const REASON_TH = { power_on: 'เปิดเครื่อง/ไฟดับ', software: 'สั่งรีบูต (เน็ตค้าง 30 นาที)', watchdog: 'watchdog (โปรแกรมค้าง)', crash: 'โปรแกรมล่ม', brownout: 'ไฟตก', reset_button: 'กดปุ่ม reset', unknown: 'ไม่ทราบ' }

const main = async () => {
    const args = parseArgs(process.argv.slice(2))
    const now = new Date()
    for (const k of ['from', 'to']) {
        if (args[k] && !parseTime(args[k], now)) throw new Error(`อ่านเวลา --${k} "${args[k]}" ไม่ได้ ใส่เวลาจริง เช่น "2026-12-07 08:00"`)
    }
    const to = parseTime(args.to, now) || now
    const from = parseTime(args.from, now) || new Date(to.getTime() - 24 * 3600e3)
    if (from >= to) throw new Error('--from ต้องมาก่อน --to')

    const report = await readOnly(async (client, tryQuery) => {
        const devices = (await client.query(`
            SELECT d.id_devices, d.serial_no, d.id_farms, f.name_farms, (to_jsonb(d)->>'camera_interval_sec')::int AS interval_sec
            FROM tb_devices d LEFT JOIN tb_farms f ON f.id_farms = d.id_farms ORDER BY d.created_at`)).rows
        const wanted = args.device && args.device !== true ? String(args.device).trim().toUpperCase() : null
        const device = wanted
            ? devices.find(d => String(d.serial_no || '').toUpperCase() === wanted)
            : (devices.filter(d => d.id_farms).length === 1 ? devices.find(d => d.id_farms) : null)
        if (!device) {
            console.log(wanted ? `ไม่พบกล่อง ${wanted}` : 'ระบุกล่องด้วย --device <serial>')
            for (const d of devices) console.log(`  ${d.serial_no}  ฟาร์ม: ${d.name_farms || '(ยังไม่ผูก)'}`)
            process.exitCode = 1
            return null
        }
        const win = [device.id_devices, from.toISOString(), to.toISOString()]
        const hb = await tryQuery(`SELECT received_at, health FROM tb_device_heartbeats WHERE id_devices = $1 AND received_at >= $2 AND received_at < $3 ORDER BY received_at`, win)
        const sensor = await tryQuery(`SELECT recorded_at, to_jsonb(s)->>'received_at' AS received_at FROM tb_sensor_readings s WHERE id_devices = $1 AND recorded_at >= $2 AND recorded_at < $3`, win)
        const frames = await tryQuery(`SELECT captured_at, received_at, bytes, status FROM tb_camera_frames WHERE id_devices = $1 AND captured_at >= $2 AND captured_at < $3`, win)
        const timing = device.id_farms ? await tryQuery(`
            SELECT (detections->'timing_ms'->>'total')::float AS model_ms, (detections->'timing_ms'->>'end_to_end')::float AS e2e_ms
            FROM cctv_behavior_telemetry WHERE farm_id = $1 AND is_simulation = false AND timestamp >= $2 AND timestamp < $3`, [device.id_farms, win[1], win[2]]) : []

        const missing = [hb, sensor, frames].some(x => x.error && x.error.code === '42P01')
        const intervalSec = device.interval_sec || FIRMWARE_DEFAULT_INTERVAL_SEC
        const H = hb.error ? null : heartbeatStats(hb, from, to)
        const S = sensor.error ? null : sensorStats(sensor, from, to)
        const F = frames.error ? null : frameStats(frames, from, to, intervalSec)
        const T = timing.error ? null : { model_sec: summarizeSeconds(timing.map(r => r.model_ms)), end_to_end_sec: summarizeSeconds(timing.map(r => r.e2e_ms)) }
        return {
            device: { serial: device.serial_no, farm: device.name_farms, interval_sec: intervalSec, interval_from_web: Boolean(device.interval_sec) },
            window: { from: from.toISOString(), to: to.toISOString(), hours: Math.round(((to - from) / 3600e3) * 10) / 10 },
            migration_missing: missing,
            heartbeats: H, sensor: S, frames: F, processing: T,
            bandwidth_per_day: bandwidthPerDay({ frames: F, sensor: S, heartbeats: H }, from, to)
        }
    })
    if (!report) return
    print(report, from, to)
    if (args.json && args.json !== true) {
        fs.writeFileSync(String(args.json), JSON.stringify(report, null, 2))
        console.log(`\nบันทึกตัวเลขทั้งหมดที่ ${args.json}`)
    }
}

const print = (r, from, to) => {
    const L = (s = '') => console.log(s)
    const sec = (x) => (x.n ? `มัธยฐาน ${x.median} วิ · p90 ${x.p90} วิ · สูงสุด ${x.max} วิ (n=${x.n})` : 'ไม่มีข้อมูล')
    L('ตัวเลขฮาร์ดแวร์ CowCare AI (อ่านอย่างเดียว)')
    L(`กล่อง ${r.device.serial} · ฟาร์ม ${r.device.farm || '-'} · รอบถ่ายภาพ ${r.device.interval_sec} วิ${r.device.interval_from_web ? '' : ' (ค่าในเฟิร์มแวร์)'}`)
    L(`ช่วงเวลา: ${fmtDate(from)} ${fmtTime(from)} – ${fmtDate(to)} ${fmtTime(to)} น. (${r.window.hours} ชม.)`)
    if (r.migration_missing) L('⚠️ ยังไม่ได้รัน migrations/20261125_hardware_evidence_log.sql ตัวเลขบางส่วนจึงไม่มี')

    const H = r.heartbeats
    L('\n1) ความต่อเนื่องของกล่อง (heartbeat ทุก 5 นาที)')
    if (!H || !H.count) L('  ไม่มี heartbeat ในช่วงนี้ (กล่องปิด หรือยังไม่ได้รัน migration)')
    else {
        L(`  ความพร้อมใช้งาน ${H.availability.pct}% · ขาดการติดต่อรวม ${H.availability.offline_min} นาที · heartbeat ${H.count}/${H.expected}`)
        for (const o of H.availability.outages.slice(0, 10)) L(`    ขาดการติดต่อ ${fmtTime(o.from)}–${fmtTime(o.to)} (${o.min} นาที)`)
        const reasons = Object.entries(H.reboots.by_reason).map(([k, v]) => `${REASON_TH[k] || k} ${v}`).join(', ')
        L(`  รีบูต ${H.reboots.count} ครั้ง${reasons ? ` (${reasons})` : ''}`)
        L(`  สัญญาณ Wi-Fi ${H.rssi.min} ถึง ${H.rssi.max} dBm (มัธยฐาน ${H.rssi.median}) · หน่วยความจำว่างต่ำสุด ${H.min_free_heap ?? '-'} ไบต์ · คิวค้างสูงสุด ${H.queue_max ?? '-'} ค่า`)
        L(`  firmware ${H.fw_versions.join(', ') || '-'} · เซ็นเซอร์ ${H.sensor_models.join(', ') || '-'}${H.i2c_recoveries_max ? ` · ล้างบัส I2C ${H.i2c_recoveries_max} ครั้ง` : ''}${H.heater_pulses_max ? ` · เปิด heater ไล่ความชื้น ${H.heater_pulses_max} ครั้ง (ค่าช่วงพักหลัง heater ไม่ถูกส่ง)` : ''}`)
    }

    const S = r.sensor
    L('\n2) ค่าเซ็นเซอร์ (ควรมาทุก 15 วิ)')
    if (!S) L('  อ่านไม่ได้')
    else {
        L(`  ครบ ${S.count}/${S.expected} ค่า (${S.pct ?? '-'}%) · ช่วงที่ขาดนานสุด ${S.longest_gap_min} นาที`)
        L(`  จากกล่องวัดถึง server ได้รับ: ${sec(S.delay_sec)}`)
        L(`  ส่งย้อนหลังจากคิว (ช้ากว่า 60 วิ): ${S.late.count} ค่า${S.late.pct != null ? ` (${S.late.pct}%)` : ''}`)
    }

    const F = r.frames
    L(`\n3) ภาพจากกล้อง (ควรมาทุก ${r.device.interval_sec} วิ)`)
    if (!F) L('  อ่านไม่ได้')
    else {
        L(`  ถึง server ${F.count}/${F.expected} ภาพ (${F.pct ?? '-'}%) · ช่วงที่ขาดนานสุด ${F.longest_gap_min} นาที`)
        L(`  รับไปประมวลผล ${F.accepted} · server ยุ่ง ${F.busy}${F.busy_pct != null ? ` (${F.busy_pct}%)` : ''}`)
        L(`  ขนาดภาพ ${F.image_kb.median ?? '-'} KB (${F.image_kb.min ?? '-'}–${F.image_kb.max ?? '-'}) · รวม ${F.total_mb} MB`)
        L(`  จากถ่ายภาพถึง server ได้รับ: ${sec(F.delay_sec)}`)
    }
    if (r.processing) {
        L('\n4) เวลาประมวลผลภาพบน server')
        L(`  ในโมเดล: ${sec(r.processing.model_sec)}`)
        L(`  ตั้งแต่รับภาพจนได้ผล (รวมรอคิว): ${sec(r.processing.end_to_end_sec)}`)
    }
    const B = r.bandwidth_per_day
    L('\n5) ปริมาณเน็ตของกล่องต่อวัน')
    L(`  ภาพ ${B.images_mb} MB/วัน (วัดจริง) + ค่าเซ็นเซอร์/heartbeat ประมาณ ${B.other_mb_estimate} MB/วัน (ประมาณ 1 KB ต่อคำขอ)`)
    L(`  รวมประมาณ ${B.total_mb} MB/วัน ≈ ${B.month_gb} GB/เดือน`)
}

main().catch((err) => { console.error('ผิดพลาด:', err.message); process.exitCode = 1 })
