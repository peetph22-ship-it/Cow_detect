/**
 * สรุปพฤติกรรมวัวจากกล้องของฟาร์ม (ผล YOLO ที่ ESP32 ส่งภาพมา) สำหรับหน้าฟาร์มและหน้าเกษตรกร
 * ใช้เฉพาะข้อมูลจริง (is_simulation = false)
 *
 * สถานะออนไลน์/ขาดการติดต่อตัดสินจากรอบถ่ายภาพจริงของกล่อง (services/cameraStatus.js)
 */
const db = require('../config/db')
const { cameraStatus, latestOf, lastFrameByFarm, DEFAULT_INTERVAL_SEC } = require('./cameraStatus')

const INTERVAL_MIN = DEFAULT_INTERVAL_SEC / 60   // ค่าเดิม (export ไว้ให้โค้ดเก่า)

// รอบถ่ายภาพที่ตั้งไว้ของกล่องที่ผูกกับฟาร์มนี้ (null = ใช้ค่าในเฟิร์มแวร์)
const farmIntervalSec = async (farmId) => {
    try {
        const { rows } = await db.query(
            `SELECT (to_jsonb(d)->>'camera_interval_sec')::int AS s FROM tb_devices d
             WHERE d.id_farms = $1 ORDER BY d.last_seen_at DESC NULLS LAST LIMIT 1`, [farmId])
        return rows[0]?.s || null
    } catch (err) {
        return null
    }
}

const num = (v, d = 1) => (v == null ? null : Number(Number(v).toFixed(d)))

const getCameraBehavior = async (farmId) => {
    const [latestRes, hourlyRes, intervalSec, frames] = await Promise.all([
        db.query(`
            SELECT timestamp, total_cows_detected, standing_count, lying_count, feeding_count, drinking_count,
                   standing_pct, lying_pct, feeding_pct, drinking_pct, cow_comfort_index, ai_confidence_avg
            FROM cctv_behavior_telemetry
            WHERE farm_id = $1 AND is_simulation = false
            ORDER BY timestamp DESC
            LIMIT 1
        `, [farmId]),
        db.query(`
            SELECT date_trunc('hour', timestamp) AS hour,
                   AVG(total_cows_detected) AS avg_cows,
                   AVG(lying_pct) AS lying_pct, AVG(standing_pct) AS standing_pct,
                   AVG(feeding_pct) AS feeding_pct, AVG(drinking_pct) AS drinking_pct,
                   AVG(cow_comfort_index) AS cci, COUNT(*)::int AS images
            FROM cctv_behavior_telemetry
            WHERE farm_id = $1 AND is_simulation = false AND timestamp > NOW() - INTERVAL '24 hours'
            GROUP BY 1 ORDER BY 1
        `, [farmId]),
        farmIntervalSec(farmId),
        lastFrameByFarm(db, farmId)
    ])

    const r = latestRes.rows[0]
    // ภาพที่ถึง server ล่าสุด (รวมภาพที่ server ยุ่ง) หรือผลโมเดลล่าสุด แล้วแต่อันไหนใหม่กว่า
    const lastImageAt = latestOf(r?.timestamp, frames[String(farmId)])
    const cam = cameraStatus(lastImageAt, intervalSec)
    const minutesAgo = cam.seconds_ago == null ? null : Math.round(cam.seconds_ago / 60)
    return {
        interval_sec: cam.interval_sec,
        interval_min: Math.round((cam.interval_sec / 60) * 100) / 100,
        offline_after_sec: cam.offline_after_sec,
        status: cam.status,
        seconds_ago: cam.seconds_ago,
        last_image_at: lastImageAt ? lastImageAt.toISOString() : null,
        minutes_ago: minutesAgo,
        latest: r ? {
            timestamp: r.timestamp,
            total: r.total_cows_detected,
            counts: { standing: r.standing_count, lying: r.lying_count, feeding: r.feeding_count, drinking: r.drinking_count },
            pct: { standing: num(r.standing_pct), lying: num(r.lying_pct), feeding: num(r.feeding_pct), drinking: num(r.drinking_pct) },
            cci: num(r.cow_comfort_index),
            confidence_avg: num(r.ai_confidence_avg, 3)
        } : null,
        hourly: hourlyRes.rows.map(h => ({
            hour: h.hour,
            avg_cows: num(h.avg_cows),
            lying_pct: num(h.lying_pct),
            standing_pct: num(h.standing_pct),
            feeding_pct: num(h.feeding_pct),
            drinking_pct: num(h.drinking_pct),
            cci: num(h.cci),
            images: h.images
        }))
    }
}

module.exports = { getCameraBehavior, INTERVAL_MIN }
