/**
 * ใส่เลขวัว (id) ให้กรอบทุกตัวตอนรับภาพจากกล้องจริง ด้วย stepCowIds ตัวเดียวกับหน้า simulator
 * สถานะไม่ต้องเก็บแยก: อ่านกรอบที่มีเลขแล้วจาก cctv_behavior_telemetry.detections ใน 15 นาทีก่อนหน้า
 * และ next_cow_id ของภาพล่าสุด (เลขเดินต่อ ไม่วนกลับมาใช้ซ้ำแม้กล้องหลุดนาน) จึงไม่ต้องรัน migration
 * ล้มเหลว = ไม่ใส่เลข (ภาพยังบันทึกตามปกติ)
 */
const db = require('../config/db')
const { stepCowIds, TRACK_DEFAULTS } = require('./cowTracking')

// สถานะจากภาพก่อนหน้า: ตำแหน่งล่าสุดของแต่ละเลขที่เห็นใน maxLostSec
const loadState = async (farmId, capturedAt) => {
    const before = new Date(capturedAt.getTime() - TRACK_DEFAULTS.maxLostSec * 1000)
    const [recent, last] = await Promise.all([
        db.query(`
            SELECT timestamp, detections->'boxes' AS boxes
            FROM cctv_behavior_telemetry
            WHERE farm_id = $1 AND is_simulation = false AND timestamp >= $2 AND timestamp < $3 AND detections IS NOT NULL
            ORDER BY timestamp`, [farmId, before.toISOString(), capturedAt.toISOString()]),
        db.query(`
            SELECT (detections->>'next_cow_id')::int AS next_id
            FROM cctv_behavior_telemetry
            WHERE farm_id = $1 AND is_simulation = false AND timestamp < $2 AND detections->>'next_cow_id' IS NOT NULL
            ORDER BY timestamp DESC LIMIT 1`, [farmId, capturedAt.toISOString()])
    ])
    const byId = new Map()
    let maxId = 0
    for (const r of recent.rows) {
        for (const b of Array.isArray(r.boxes) ? r.boxes : []) {
            if (!Number.isInteger(b.id)) continue
            byId.set(b.id, { id: b.id, box: { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 }, at: new Date(r.timestamp).getTime() })
            maxId = Math.max(maxId, b.id)
        }
    }
    return { tracks: [...byId.values()], nextId: Math.max(last.rows[0]?.next_id || 1, maxId + 1) }
}

/**
 * ใส่ id ลงในกรอบของ result.boxes และ result.next_cow_id (ใช้ต่อในภาพถัดไป)
 * @returns {boolean} ใส่เลขได้หรือไม่
 */
const assignBoxIds = async (farmId, capturedAt, result) => {
    try {
        const state = await loadState(farmId, capturedAt)
        const r = stepCowIds(state, { observedAt: capturedAt, boxes: result.boxes || [] })
        ;(result.boxes || []).forEach((b, i) => { b.id = r.ids[i] })
        result.next_cow_id = r.state.nextId
        return true
    } catch (err) {
        console.warn('[CowIds] assign failed, saving boxes without ids:', err.message)
        return false
    }
}

module.exports = { assignBoxIds, loadState }
