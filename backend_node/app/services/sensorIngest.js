/**
 * CowCare AI - Sensor ingest (single + store-and-forward batch)
 *
 * เวลา: บอร์ดส่ง recorded_at เป็น Unix epoch (UTC) หน่วยวินาที (รับ ms หรือ ISO string ได้ด้วย)
 * ไม่ส่งมา = ใช้เวลา server (NOW()) เหมือนเดิม
 * กันข้อมูลซ้ำด้วย unique index (id_devices, recorded_at) - migrations/20261021_sensor_readings_dedupe.sql
 */

const db = require('../config/db')

const MAX_FUTURE_MS = 5 * 60 * 1000          // นาฬิกาบอร์ดเพี้ยนได้เล็กน้อย
const MAX_AGE_MS = 30 * 24 * 3600 * 1000     // บอร์ดเก็บคิวได้ ~3 สัปดาห์
const MAX_BATCH = 100

// แปลง recorded_at เป็น Date (null = ไม่ได้ส่งมา)
const parseRecordedAt = (raw) => {
    if (raw === undefined || raw === null || raw === '') return { date: null }
    let ms
    if (typeof raw === 'number' || /^\d+(\.\d+)?$/.test(String(raw))) {
        const n = Number(raw)
        ms = n > 1e12 ? n : n * 1000 // > 1e12 ถือว่าเป็น ms
    } else {
        ms = Date.parse(String(raw))
    }
    if (!Number.isFinite(ms)) return { error: 'invalid_time' }
    return { date: new Date(ms) }
}

// ใช้กติกาเวลาเดียวกันทุก endpoint ที่รับเวลาจากอุปกรณ์
const checkTimeWindow = (date, nowMs = Date.now()) => {
    const ms = date.getTime()
    if (ms > nowMs + MAX_FUTURE_MS) return 'time_in_future'
    if (ms < nowMs - MAX_AGE_MS) return 'time_too_old'
    return null
}

/**
 * ตรวจค่าหนึ่งค่า คืน { reading } หรือ { error }
 */
const parseReading = (raw, nowMs = Date.now()) => {
    if (!raw || typeof raw !== 'object') return { error: 'invalid_reading' }
    const temp = parseFloat(raw.temperature_c)
    const hum = parseFloat(raw.humidity_pct)
    // ช่วงเดียวกับที่ firmware กรองไว้ (-10..65 °C, 0..100 %RH)
    if (!Number.isFinite(temp) || !Number.isFinite(hum) || temp < -10 || temp > 65 || hum < 0 || hum > 100) {
        return { error: 'out_of_range' }
    }
    const pressure = raw.pressure_hpa != null && raw.pressure_hpa !== '' ? parseFloat(raw.pressure_hpa) : null

    const t = parseRecordedAt(raw.recorded_at)
    if (t.error) return { error: t.error }
    if (t.date) {
        const timeError = checkTimeWindow(t.date, nowMs)
        if (timeError) return { error: timeError }
    }
    return {
        reading: {
            temperature_c: temp,
            humidity_pct: hum,
            pressure_hpa: Number.isFinite(pressure) ? pressure : null,
            recorded_at: t.date
        }
    }
}

/**
 * หา device ของ request: ถ้าผ่าน verifyDeviceKey ใช้ device ที่ยืนยันแล้ว
 * ถ้าไม่ผ่าน (เกิดได้เฉพาะ DEVICE_AUTH_MODE=warn) หาจาก serial
 * ไม่สร้างอุปกรณ์อัตโนมัติ (เดิมสร้างแล้วผูกกับฟาร์มแรกในระบบ ข้อมูลจากอุปกรณ์แปลกปลอมจึงปนเข้าฟาร์มจริงได้)
 * คืน null = ไม่รู้จักอุปกรณ์ ให้ลงทะเบียนในหน้า Admin > Devices ก่อน
 */
const resolveDevice = async (req, serial) => {
    if (req.device) return { deviceId: req.device.id, farmId: req.device.farmId }
    if (!serial) return null
    const devRes = await db.query(
        `SELECT id_devices, id_farms FROM tb_devices WHERE UPPER(serial_no) = UPPER($1) LIMIT 1`,
        [serial]
    )
    return devRes.rows[0] ? { deviceId: devRes.rows[0].id_devices, farmId: devRes.rows[0].id_farms } : null
}

// ใช้ INSERT ... VALUES (ไม่ใช่ INSERT ... SELECT) เพื่อให้ Postgres อนุมานชนิดพารามิเตอร์จากคอลัมน์ปลายทาง (เช่น uuid)
const buildInsert = (deviceId, farmId, readings, onConflict) => {
    const params = [deviceId, farmId]
    const values = readings.map(r => {
        params.push(r.temperature_c, r.humidity_pct, r.pressure_hpa, r.recorded_at ? r.recorded_at.toISOString() : null)
        const n = params.length
        return `($1, $2, $${n - 3}, $${n - 2}, $${n - 1}, COALESCE($${n}::timestamptz, NOW()))`
    })
    const text = `
        INSERT INTO tb_sensor_readings (id_devices, id_farms, temperature_c, humidity_pct, pressure_hpa, recorded_at)
        VALUES ${values.join(', ')}
        ${onConflict ? 'ON CONFLICT (id_devices, recorded_at) DO NOTHING' : ''}
        RETURNING id_sensor_readings, recorded_at`
    return { text, params }
}

/**
 * บันทึกหลายค่าในคำสั่งเดียว คืน { inserted: rows[], duplicates }
 * DB error จะถูก throw ให้ route ตอบ 5xx (บอร์ดจะเก็บข้อมูลไว้ส่งใหม่)
 */
const insertReadings = async (deviceId, farmId, readings) => {
    if (readings.length === 0) return { inserted: [], duplicates: 0 }
    let res
    try {
        const q = buildInsert(deviceId, farmId, readings, true)
        res = await db.query(q.text, q.params)
    } catch (err) {
        // 42P10 = ยังไม่ได้รัน migration (ไม่มี unique index) -> บันทึกได้แต่ยังไม่กันซ้ำ
        if (err.code !== '42P10') throw err
        console.warn('[Sensor Ingest] dedupe index missing - run migrations/20261021_sensor_readings_dedupe.sql')
        const q = buildInsert(deviceId, farmId, readings, false)
        res = await db.query(q.text, q.params)
    }
    await db.query(`UPDATE tb_devices SET status = 'online', last_seen_at = NOW() WHERE id_devices = $1`, [deviceId])
    return { inserted: res.rows, duplicates: readings.length - res.rows.length }
}

module.exports = {
    MAX_BATCH,
    parseRecordedAt,
    checkTimeWindow,
    parseReading,
    resolveDevice,
    insertReadings
}
