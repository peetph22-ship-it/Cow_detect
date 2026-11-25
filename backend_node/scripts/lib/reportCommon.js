/**
 * ตัวช่วยร่วมของสคริปต์รายงานที่อ่านฐานข้อมูล (อ่านอย่างเดียว)
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })
process.env.DB_CONNECT_TIMEOUT_MS = process.env.DB_CONNECT_TIMEOUT_MS || '30000'
const db = require('../../app/config/db')

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

// เน็ตบางที่ต่อ pooler ของ Supabase ช้า 5–30 วิ: รอนานขึ้นและลองใหม่
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

// transaction อ่านอย่างเดียว + query ที่อาจไม่มีตาราง (ยังไม่รัน migration) ห่อ savepoint ไม่ให้ทั้งก้อนล้ม
const readOnly = async (fn) => {
    const client = await connectWithRetry()
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
        return await fn(client, tryQuery)
    } finally {
        await client.query('ROLLBACK').catch(() => {})
        client.release()
        await db.pool.end().catch(() => {})
    }
}

module.exports = { db, parseArgs, parseTime, fmtTime, fmtDate, thaiDay, connectWithRetry, readOnly }
