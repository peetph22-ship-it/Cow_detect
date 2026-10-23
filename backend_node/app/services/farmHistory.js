/**
 * ข้อมูล 24 ชม. ล่าสุดของฟาร์ม (ใช้ทั้งหน้า admin และหน้าเกษตรกร ให้ตัวเลขตรงกัน)
 * - history: ค่าเฉลี่ยทุก 5 นาที (ไม่เกิน 288 จุด) สำหรับกราฟและตาราง
 * - daily_summary: สรุปจากค่าดิบทุกค่าในช่วงเดียวกัน
 * ช่วง 24 ชม. นับย้อนจากค่าล่าสุดของฟาร์ม: อุปกรณ์ออฟไลน์ก็ยังเห็นวันสุดท้ายที่มีข้อมูล
 */
const db = require('../config/db')
const { thiSql, getRiskLevel, getThresholds } = require('./heatStress')

const getFarm24h = async (farmId, profile = 'default') => {
    const windowCte = `
        WITH farm_readings AS (
            SELECT sr.recorded_at, sr.temperature_c, sr.humidity_pct, d.serial_no,
                   ${thiSql('sr')} AS thi
            FROM tb_sensor_readings sr
            LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
            WHERE (d.id_farms = $1 OR sr.id_farms = $1)
              AND sr.temperature_c IS NOT NULL AND sr.humidity_pct IS NOT NULL
        ),
        win AS (
            SELECT * FROM farm_readings
            WHERE recorded_at > (SELECT MAX(recorded_at) FROM farm_readings) - INTERVAL '24 hours'
        )`
    const [bucketRes, summaryRes] = await Promise.all([
        db.query(`${windowCte}
            SELECT to_timestamp(floor(extract(epoch FROM recorded_at) / 300) * 300) AS recorded_at,
                   AVG(temperature_c) AS temperature_c, AVG(humidity_pct) AS humidity_pct,
                   AVG(thi) AS thi, COUNT(*)::int AS sample_count, MAX(serial_no) AS serial_no
            FROM win GROUP BY 1 ORDER BY 1
        `, [farmId]),
        db.query(`${windowCte}
            SELECT AVG(thi) AS avg_thi,
                   MIN(temperature_c) AS min_temp, MAX(temperature_c) AS max_temp,
                   MIN(humidity_pct) AS min_hum, MAX(humidity_pct) AS max_hum,
                   COUNT(*)::int AS total_readings,
                   COUNT(*) FILTER (WHERE thi >= $2)::int AS stress_readings,
                   MIN(recorded_at) AS window_start, MAX(recorded_at) AS window_end
            FROM win
        `, [farmId, getThresholds(profile).moderate])
    ])

    const history = bucketRes.rows.map(r => {
        const thi = r.thi != null ? parseFloat(r.thi) : null
        return {
            id: `b-${new Date(r.recorded_at).getTime()}`,
            recorded_at: r.recorded_at,
            temperature_c: r.temperature_c != null ? parseFloat(r.temperature_c) : null,
            humidity_pct: r.humidity_pct != null ? parseFloat(r.humidity_pct) : null,
            thi,
            stress_level: getRiskLevel(thi, profile),
            sample_count: r.sample_count,
            serial_no: r.serial_no
        }
    })

    let daily_summary = null
    const sm = summaryRes.rows[0]
    if (sm && sm.total_readings > 0) {
        const fix1 = (v) => v != null ? Number(v).toFixed(1) : null
        daily_summary = {
            avg_thi: fix1(sm.avg_thi),
            min_temp: fix1(sm.min_temp),
            max_temp: fix1(sm.max_temp),
            min_hum: fix1(sm.min_hum),
            max_hum: fix1(sm.max_hum),
            count_stress_readings: sm.stress_readings,
            total_readings: sm.total_readings,
            stress_percentage: Math.round((sm.stress_readings / sm.total_readings) * 100),
            // ชั่วโมงที่ THI ถึงระดับเครียด (สัดส่วนค่าที่เครียด x ความยาวช่วงข้อมูล) อ่านง่ายกว่าจำนวนค่า
            stress_hours: Number(((sm.stress_readings / sm.total_readings) *
                ((new Date(sm.window_end) - new Date(sm.window_start)) / 3600000)).toFixed(1)),
            window_start: sm.window_start,
            window_end: sm.window_end
        }
    }
    return { history, daily_summary }
}

module.exports = { getFarm24h }
