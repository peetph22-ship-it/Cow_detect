/**
 * ข้อมูลกราฟสำหรับหน้าแดชบอร์ดเกษตรกร (ใช้ค่าเฉลี่ย 5 นาทีชุดเดียวกับตัวเลขสรุป ไม่คำนวณแยก)
 * ค่าเป็นของทั้งฟาร์ม: ทุกกล่องในฟาร์มถูกเฉลี่ยรวมกันตั้งแต่ใน loadBuckets แล้ว
 */
const { getRiskLevel } = require('./heatStress')
const { round1 } = require('./heatMetrics')

const HOUR_MS = 3600e3

/**
 * THI เฉลี่ยรายชั่วโมง 24 ช่อง (ชั่วโมงเต็มตามนาฬิกา) ช่องสุดท้ายคือชั่วโมงของค่าล่าสุด
 * ชั่วโมงที่ไม่มีข้อมูลเป็น null (กราฟจะเว้นว่าง ไม่ลากเส้นต่อ)
 * @param buckets ค่าเฉลี่ย 5 นาที [{ t: Date, thi, temp, hum }]
 * @param windowEnd เวลาสิ้นสุดช่วง 24 ชม. (Date) ไม่มีข้อมูลเลย = []
 */
const hourlyThi = (buckets, windowEnd, profile) => {
    if (!windowEnd || !buckets.length) return []
    // ชั่วโมงของไทยตรงกับชั่วโมงของ UTC (ต่างกัน 7 ชม. พอดี) ปัดลงเป็นชั่วโมงด้วย ms ได้เลย
    const lastHour = Math.floor((new Date(windowEnd).getTime() - 1) / HOUR_MS) * HOUR_MS
    const firstHour = lastHour - 23 * HOUR_MS
    const slots = Array.from({ length: 24 }, (_, i) => ({ t: firstHour + i * HOUR_MS, thi: 0, temp: 0, hum: 0, n: 0 }))
    for (const b of buckets) {
        const i = Math.floor((b.t.getTime() - firstHour) / HOUR_MS)
        if (i < 0 || i > 23) continue
        const s = slots[i]
        s.thi += b.thi; s.temp += b.temp; s.hum += b.hum; s.n++
    }
    return slots.map(s => {
        const thi = s.n ? round1(s.thi / s.n) : null
        return {
            t: new Date(s.t).toISOString(),
            thi,
            temp: s.n ? round1(s.temp / s.n) : null,
            hum: s.n ? round1(s.hum / s.n) : null,
            level: thi != null ? getRiskLevel(thi, profile) : null,
            // จำนวนช่วง 5 นาทีที่มีข้อมูล (เต็มชั่วโมง = 12)
            samples: s.n
        }
    })
}

/**
 * สรุป 7 วันล่าสุดสำหรับกราฟแท่ง (ชั่วโมงแต่ละระดับไม่ซ้อนกัน รวมกันไม่เกินชั่วโมงที่มีข้อมูล)
 * @param series ผลจาก dailySeries (เรียงเก่า -> ใหม่)
 */
const weekBars = (series) => series.slice(-7).map(d => {
    if (!d.has_data) return { date: d.date, is_today: d.is_today, has_data: false }
    const severe = d.severe_hours || 0
    const stress = d.stress_hours || 0
    const watch = d.watch_hours || 0
    return {
        date: d.date,
        is_today: d.is_today,
        has_data: true,
        // เริ่มอุ่น = ถึงระดับ mild แต่ไม่ถึง moderate, อากาศร้อน = moderate แต่ไม่ถึง severe
        mild_hours: round1(Math.max(0, watch - stress)),
        moderate_hours: round1(Math.max(0, stress - severe)),
        severe_hours: round1(severe),
        data_hours: d.data_hours,
        coverage_pct: d.coverage_pct,
        avg_thi: d.avg_thi,
        max_thi: d.max_thi,
        risk_level: d.daily_mean_level
    }
})

module.exports = { hourlyThi, weekBars }
