#!/usr/bin/env node
/**
 * เทียบค่าเซ็นเซอร์ของกล่องกับเครื่องวัดอ้างอิง (อ่านฐานข้อมูลอย่างเดียว)
 *
 *   node backend_node/scripts/compare_sensor.js --device ESP32-S3-01 --reference reference_2026-11-30.csv
 *   ... --tolerance 60     จับคู่ค่ากล่องภายใน ±60 วิ จากเวลาที่จดค่าอ้างอิง (ค่าเริ่มต้น 60)
 *   ... --profile high_hf  ระดับความเสี่ยงของฟาร์ม (ค่าเริ่มต้น default)
 *   ... --json out.json    เก็บตัวเลขทั้งหมด + ทุกคู่ค่า (ทำตาราง/กราฟในเปเปอร์)
 *
 * ไฟล์อ้างอิง: docs/templates/reference_readings_template.csv (time, temperature_c, humidity_pct, note)
 * time = เวลาไทย "YYYY-MM-DD HH:MM" หรือ "YYYY-MM-DD HH:MM:SS" · วิธีวัดดู docs/HARDWARE_TEST.md
 */
const fs = require('fs')
const { parseArgs, parseTime, fmtTime, fmtDate, readOnly } = require('./lib/reportCommon')
const { compareSensor } = require('../app/services/sensorValidation')

const readReference = (file) => {
    const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)
        .map((l, i) => ({ l: l.trim(), line: i + 1 })).filter(x => x.l && !x.l.startsWith('#'))
    if (!lines.length) throw new Error(`${file}: ไม่มีข้อมูล`)
    const head = lines[0].l.split(',').map(h => h.trim().toLowerCase())
    const col = (n) => head.indexOf(n)
    if (col('time') < 0 || col('temperature_c') < 0 || col('humidity_pct') < 0) throw new Error(`${file}: ต้องมีคอลัมน์ time, temperature_c, humidity_pct`)
    const now = new Date()
    return lines.slice(1).map(({ l, line }) => {
        const c = l.split(',').map(x => x.trim())
        const t = parseTime(c[col('time')], now)
        const T = Number(c[col('temperature_c')]), RH = Number(c[col('humidity_pct')])
        if (!t || !/\d{4}-\d{2}-\d{2}/.test(c[col('time')])) throw new Error(`${file} บรรทัด ${line}: เวลาต้องเป็น "YYYY-MM-DD HH:MM" (เวลาไทย)`)
        if (!Number.isFinite(T) || !Number.isFinite(RH) || RH < 0 || RH > 100) throw new Error(`${file} บรรทัด ${line}: ค่าอุณหภูมิ/ความชื้นไม่ถูกต้อง`)
        return { t: t.getTime(), temperature_c: T, humidity_pct: RH }
    }).sort((a, b) => a.t - b.t)
}

const main = async () => {
    const a = parseArgs(process.argv.slice(2))
    if (!a.reference || a.reference === true) {
        console.log('ใช้: node backend_node/scripts/compare_sensor.js --device <serial> --reference <CSV ค่าอ้างอิง> [--tolerance 60] [--profile default|high_hf] [--json out.json]')
        process.exitCode = 1
        return
    }
    const ref = readReference(String(a.reference))
    if (!ref.length) throw new Error('ไฟล์อ้างอิงไม่มีค่า')
    const tol = a.tolerance && a.tolerance !== true ? Number(a.tolerance) : 60
    const from = new Date(ref[0].t - tol * 1000), to = new Date(ref[ref.length - 1].t + tol * 1000)

    const result = await readOnly(async (client) => {
        const devs = (await client.query(`SELECT d.id_devices, d.serial_no, f.name_farms, f.hf_profile FROM tb_devices d LEFT JOIN tb_farms f ON f.id_farms = d.id_farms`)).rows
        const wanted = a.device && a.device !== true ? String(a.device).trim().toUpperCase() : null
        const dev = wanted ? devs.find(d => String(d.serial_no || '').toUpperCase() === wanted) : (devs.length === 1 ? devs[0] : null)
        if (!dev) {
            console.log(wanted ? `ไม่พบกล่อง ${wanted}` : 'ระบุกล่องด้วย --device <serial>')
            process.exitCode = 1
            return null
        }
        const rows = (await client.query(
            `SELECT recorded_at, temperature_c, humidity_pct FROM tb_sensor_readings WHERE id_devices = $1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at`,
            [dev.id_devices, from.toISOString(), to.toISOString()])).rows
        const sys = rows.map(r => ({ t: new Date(r.recorded_at).getTime(), temperature_c: Number(r.temperature_c), humidity_pct: Number(r.humidity_pct) }))
        const profile = a.profile && a.profile !== true ? String(a.profile) : (dev.hf_profile || 'default')
        return { device: dev.serial_no, profile, box_readings: sys.length, ...compareSensor(ref, sys, { toleranceSec: tol, profile }) }
    })
    if (!result) return
    print(result, from, to)
    if (a.json && a.json !== true) { fs.writeFileSync(String(a.json), JSON.stringify(result, null, 2)); console.log(`\nบันทึกตัวเลขทั้งหมดที่ ${a.json}`) }
}

const print = (r, from, to) => {
    const L = (s = '') => console.log(s)
    L('เทียบเซ็นเซอร์ของกล่องกับเครื่องวัดอ้างอิง (อ่านอย่างเดียว)')
    L(`กล่อง ${r.device} · ${fmtDate(from)} ${fmtTime(from)} – ${fmtDate(to)} ${fmtTime(to)} น. · ค่ากล่องในช่วงนี้ ${r.box_readings} ค่า`)
    L(`จับคู่ได้ ${r.pairs} คู่ (ค่ากล่องเฉลี่ยภายใน ±${r.tolerance_sec} วิ ของเวลาที่จด)${r.unmatched ? ` · ไม่มีค่ากล่องใกล้ ๆ ${r.unmatched} ค่า (${r.unmatched_times.slice(0, 5).map(t => fmtTime(t)).join(', ')})` : ''}`)
    if (!r.pairs) { L('ไม่มีคู่ค่าให้เทียบ: ตรวจว่ากล่องส่งค่าในช่วงเวลาที่จด และเวลาในไฟล์เป็นเวลาไทย'); return }
    const row = (name, unit, s) => L(`  ${name.padEnd(11)} bias ${s.bias >= 0 ? '+' : ''}${s.bias} ${unit} · MAE ${s.mae} · RMSE ${s.rmse} · คลาดมากสุด ${s.max_abs} · r ${s.r ?? '-'} · กล่อง = ${s.slope ?? '-'} × อ้างอิง ${s.intercept != null ? (s.intercept >= 0 ? '+ ' : '− ') + Math.abs(s.intercept) : ''} · ช่วงอ้างอิง ${s.ref_range[0]}–${s.ref_range[1]}`)
    L('\nความคลาด (กล่อง − อ้างอิง)')
    row('อุณหภูมิ', '°C', r.temperature_c)
    row('ความชื้น', '%RH', r.humidity_pct)
    row('THI', '', r.thi)
    L(`  ระดับความเสี่ยง THI ตรงกัน ${r.risk_level_agreement_pct}% (เกณฑ์ ${r.profile})`)
    L('\nหมายเหตุ: ตัวเลขนี้รวมความคลาดของเครื่องอ้างอิงเองด้วย ระบุรุ่นและสเปกความแม่นของเครื่องอ้างอิงในเปเปอร์')
}

main().catch((err) => { console.error('ผิดพลาด:', err.message); process.exitCode = 1 })
