#!/usr/bin/env node
/**
 * เทียบผลของระบบกับคำตอบที่จดจากวิดีโอ (ไม่แตะฐานข้อมูล อ่านไฟล์ CSV อย่างเดียว)
 *
 *   node backend_node/scripts/compare_video.js --system cow_1023_2026-12-07_snapshots.csv --video video_2026-12-07.csv
 *   node backend_node/scripts/compare_video.js --system sim.csv --video sim_video.csv          (ไฟล์จากหน้า simulator)
 *   ... --video-start "2026-12-07 08:03:12"   ใช้เมื่อไฟล์จดเวลาเป็นเวลาในวิดีโอ (0:00) แต่ไฟล์ระบบเป็นเวลานาฬิกา
 *   ... --intervals 15,30,60,120,300           รอบถ่ายภาพที่จะลอง (ตัวแรก = รอบจริง)
 *   ... --json out.json                        เก็บตัวเลขทั้งหมด (ทำตารางในเปเปอร์)
 *
 * ไฟล์ระบบ: CSV "รายภาพ" จากหน้า farm_detail (observed_at_th, behavior) หรือจากหน้า simulator (t_sec, system_behavior)
 * ไฟล์จดเวลาจากวิดีโอ: docs/templates/video_annotation_template.csv (start, behavior, note) วิธีจดดู docs/VIDEO_ANNOTATION.md
 */
const fs = require('fs')
const { toIntervals, compare } = require('../app/services/videoValidation')

const parseArgs = (argv) => {
    const out = {}
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) continue
        const next = argv[i + 1]
        if (next !== undefined && !next.startsWith('--')) { out[argv[i].slice(2)] = next; i++ } else out[argv[i].slice(2)] = true
    }
    return out
}

// CSV แบบง่าย (รองรับ "..." และ "" ในช่อง) ข้ามบรรทัด # และบรรทัดว่าง
const readCsv = (file) => {
    const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '')
    const lines = text.split(/\r?\n/).map((l, i) => ({ l, line: i + 1 })).filter(x => x.l.trim() && !x.l.trim().startsWith('#'))
    const split = (l) => {
        const out = []; let cur = ''; let q = false
        for (let i = 0; i < l.length; i++) {
            const c = l[i]
            if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
            else if (c === '"') q = true
            else if (c === ',') { out.push(cur); cur = '' }
            else cur += c
        }
        out.push(cur)
        return out.map(x => x.trim())
    }
    if (!lines.length) throw new Error(`${file}: ไม่มีข้อมูล`)
    const header = split(lines[0].l).map(h => h.toLowerCase())
    return lines.slice(1).map(x => ({ ...Object.fromEntries(header.map((h, i) => [h, split(x.l)[i]])), _line: x.line }))
}

// "2026-12-07 08:00:00" = เวลาไทย (ms จริง) · "1:23:45" / "23:45" / "83.5" = วินาทีจากต้นวิดีโอ
const parseClock = (s) => {
    const m = String(s || '').trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/)
    if (!m) return null
    return Date.parse(`${m[1]}T${m[2].padStart(2, '0')}:${m[3]}:${String(m[4] || '00').padStart(2, '0')}+07:00`)
}
const parseRelative = (s) => {
    const v = String(s || '').trim()
    if (/^\d+(\.\d+)?$/.test(v)) return Number(v) * 1000
    const p = v.split(':').map(Number)
    if (p.some(x => !Number.isFinite(x)) || p.length < 2 || p.length > 3) return null
    const [h, m, sec] = p.length === 3 ? p : [0, p[0], p[1]]
    return ((h * 60 + m) * 60 + sec) * 1000
}

const main = () => {
    const a = parseArgs(process.argv.slice(2))
    if (!a.system || !a.video || a.system === true || a.video === true) {
        console.log('ใช้: node backend_node/scripts/compare_video.js --system <CSV ระบบ> --video <CSV จดจากวิดีโอ> [--video-start "YYYY-MM-DD HH:MM:SS"] [--intervals 15,30,60,120,300] [--json out.json]')
        process.exitCode = 1
        return
    }
    const videoStart = a['video-start'] && a['video-start'] !== true ? parseClock(a['video-start']) : null
    if (a['video-start'] && videoStart == null) throw new Error('--video-start ต้องเป็น "YYYY-MM-DD HH:MM:SS" (เวลาไทย)')

    // ผลของระบบ
    const sysRows = readCsv(a.system)
    const sysAbs = 'observed_at_th' in sysRows[0]
    const sysRel = 't_sec' in sysRows[0]
    if (!sysAbs && !sysRel) throw new Error(`${a.system}: ต้องมีคอลัมน์ observed_at_th (farm_detail) หรือ t_sec (simulator)`)
    const obs = sysRows.map(r => ({
        t: sysAbs ? parseClock(r.observed_at_th) : Number(r.t_sec) * 1000,
        behavior: r.behavior ?? r.system_behavior
    })).filter(o => Number.isFinite(o.t))

    // คำตอบจากวิดีโอ
    const vidRows = readCsv(a.video)
    if (!('start' in vidRows[0]) || !('behavior' in vidRows[0])) throw new Error(`${a.video}: ต้องมีคอลัมน์ start, behavior (ดู docs/templates/video_annotation_template.csv)`)
    const marks = vidRows.map(r => {
        const abs = parseClock(r.start)
        const rel = abs == null ? parseRelative(r.start) : null
        if (abs == null && rel == null) throw new Error(`${a.video} บรรทัด ${r._line}: อ่านเวลา "${r.start}" ไม่ได้`)
        let t
        if (abs != null) {
            if (!sysAbs) throw new Error('ไฟล์จดเวลาเป็นเวลานาฬิกา แต่ไฟล์ระบบเป็นเวลาในวิดีโอ (t_sec) ให้จดเป็นเวลาในวิดีโอแทน')
            t = abs
        } else if (sysAbs) {
            if (videoStart == null) throw new Error('ไฟล์จดเวลาเป็นเวลาในวิดีโอ ต้องใส่ --video-start "YYYY-MM-DD HH:MM:SS" (เวลานาฬิกาตอนวิดีโอ 0:00)')
            t = videoStart + rel
        } else t = rel
        return { t, behavior: r.behavior, line: r._line }
    })
    const { intervals, errors } = toIntervals(marks)
    if (errors.length) throw new Error(`${a.video}:\n  ${errors.join('\n  ')}`)

    const steps = String(a.intervals && a.intervals !== true ? a.intervals : '15,30,60,120,300').split(',').map(Number).filter(n => n > 0)
    const r = compare(obs, intervals, steps)
    if (r.error) throw new Error(r.error)
    print(r, sysAbs)
    if (a.json && a.json !== true) { fs.writeFileSync(String(a.json), JSON.stringify(r, null, 2)); console.log(`\nบันทึกตัวเลขทั้งหมดที่ ${a.json}`) }
}

const TH = { lying: 'นอน', standing: 'ยืน', feeding: 'กิน', not_visible: 'ไม่เห็น' }
const print = (r, abs) => {
    const L = (s = '') => console.log(s)
    const clock = (iso) => new Date(Date.parse(iso) + (abs ? 7 * 3600e3 : 0)).toISOString().slice(abs ? 11 : 11, 19)
    L('เทียบผลระบบกับคำตอบจากวิดีโอ')
    L(`ช่วงที่เทียบ: ${clock(r.window.from)}–${clock(r.window.to)}${abs ? ' น.' : ' (เวลาในวิดีโอ)'} (${r.window.minutes} นาที, วิดีโอเห็นวัว ${r.window.video_visible_minutes} นาที)`)
    L(`คำตอบจากวิดีโอ: นอน ${r.truth.minutes.lying} · ยืน ${r.truth.minutes.standing} · กิน ${r.truth.minutes.feeding} นาที (นอน ${r.truth.bouts.lying} ครั้ง, ยืน ${r.truth.bouts.standing}, กิน ${r.truth.bouts.feeding})`)
    const g = r.agreement
    L(`\nทายท่าถูกต่อภาพ: ${g.accuracy_pct ?? '-'}% จาก ${g.n} ภาพ · kappa ${g.kappa ?? '-'} · ระบบหาวัวไม่เจอ ${g.system_not_visible_pct ?? '-'}%`)
    L('  ตาราง (แถว = วิดีโอ, คอลัมน์ = ระบบ): ' + ['lying', 'standing', 'feeding', 'not_visible'].map(c => TH[c]).join(' / '))
    for (const k of ['lying', 'standing', 'feeding']) L(`    ${TH[k].padEnd(4)} ${['lying', 'standing', 'feeding', 'not_visible'].map(c => String(g.confusion[k][c]).padStart(5)).join('')}`)
    L('\nความคลาดของเวลารวม (นาที, ระบบ − วิดีโอ) และจำนวนครั้ง ตามรอบถ่ายภาพ')
    L('  รอบ   ภาพ | ระบบจริง: นอน      ยืน       กิน      ครั้งนอน/ยืน | รอบถ่ายอย่างเดียว: นอน    ยืน     กิน')
    const d = (x) => `${x.diff >= 0 ? '+' : ''}${x.diff}${x.pct != null ? ` (${x.pct >= 0 ? '+' : ''}${x.pct}%)` : ''}`.padEnd(15)
    for (const s of r.sensitivity) {
        L(`  ${String(s.interval_sec).padStart(3)}s ${String(s.snapshots).padStart(5)} | ${d(s.system.lying)}${d(s.system.standing)}${d(s.system.feeding)} ${s.system.bouts.lying}/${s.system.bouts.standing}`.padEnd(88)
            + `| ${d(s.sampling_only.lying)}${d(s.sampling_only.standing)}${d(s.sampling_only.feeding)}`)
    }
    L('\n"รอบถ่ายอย่างเดียว" = สุ่มคำตอบจากวิดีโอทุกรอบนั้น (เหมือนโมเดลไม่ผิดเลย) ส่วนต่างกับ "ระบบจริง" = ความคลาดจากโมเดลและการติดตาม')
}

try { main() } catch (err) { console.error('ผิดพลาด:', err.message); process.exitCode = 1 }
