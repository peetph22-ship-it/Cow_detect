/**
 * สรุปพฤติกรรมวัวจากกล้องของฟาร์ม (ผล YOLO ที่ ESP32 ส่งภาพมา) สำหรับหน้าฟาร์มและหน้าเกษตรกร
 * ใช้เฉพาะข้อมูลจริง (is_simulation = false)
 *
 * env: CAMERA_INTERVAL_MIN ความถี่ภาพของ firmware (ค่าเริ่มต้น 10) ใช้ตัดสินว่ากล้องขาดการติดต่อ
 */
const db = require('../config/db')

const INTERVAL_MIN = Math.max(1, Number(process.env.CAMERA_INTERVAL_MIN) || 10)
const OFFLINE_AFTER_MIN = INTERVAL_MIN * 3  // พลาด 3 รอบติดกัน = ขาดการติดต่อ

const num = (v, d = 1) => (v == null ? null : Number(Number(v).toFixed(d)))

const getCameraBehavior = async (farmId) => {
    const [latestRes, hourlyRes] = await Promise.all([
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
        `, [farmId])
    ])

    const r = latestRes.rows[0]
    const minutesAgo = r ? Math.max(0, Math.round((Date.now() - new Date(r.timestamp).getTime()) / 60000)) : null
    return {
        interval_min: INTERVAL_MIN,
        status: !r ? 'no_data' : minutesAgo <= OFFLINE_AFTER_MIN ? 'online' : 'offline',
        last_image_at: r ? r.timestamp : null,
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
