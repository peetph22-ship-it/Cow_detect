/**
 * ข้อมูล 24 ชม. ล่าสุดของฟาร์ม (ใช้ทั้งหน้า admin และหน้าเกษตรกร ให้ตัวเลขตรงกัน)
 * - history: ค่าเฉลี่ยทุก 5 นาที (ไม่เกิน 288 จุด) สำหรับกราฟและตาราง
 * - daily_summary: สรุปจากชุดเดียวกันด้วย heatMetrics (วิธีเดียวทั้งระบบ)
 * ช่วง 24 ชม. นับย้อนจากค่าล่าสุดของฟาร์ม: อุปกรณ์ออฟไลน์ก็ยังเห็นวันสุดท้ายที่มีข้อมูล
 */
const { getRiskLevel } = require('./heatStress')
const { rolling24h } = require('./heatMetrics')

const getFarm24h = async (farmId, profile = 'default') => {
    const { buckets, summary, window_start, window_end } = await rolling24h(farmId, profile)

    const history = buckets.map(b => ({
        id: `b-${b.t.getTime()}`,
        recorded_at: b.t,
        temperature_c: b.temp,
        humidity_pct: b.hum,
        thi: b.thi,
        stress_level: getRiskLevel(b.thi, profile),
        sample_count: b.n,
        serial_no: b.serial_no
    }))

    const daily_summary = summary.has_data ? {
        ...summary,
        stress_percentage: summary.stress_pct_of_data,
        total_readings: buckets.reduce((s, b) => s + b.n, 0),
        window_start,
        window_end
    } : null

    return { history, daily_summary }
}

module.exports = { getFarm24h }
