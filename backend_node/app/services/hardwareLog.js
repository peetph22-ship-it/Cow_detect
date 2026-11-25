/**
 * หลักฐานฝั่งฮาร์ดแวร์สำหรับเปเปอร์: เก็บ heartbeat ทุกครั้ง และทุกภาพที่กล่องส่งมา (ขนาด เวลาถ่าย เวลาที่ได้รับ)
 * ต้องรัน migrations/20261125_hardware_evidence_log.sql
 * ยังไม่รัน = ข้ามเงียบๆ (เตือนครั้งเดียว) ไม่ให้การรับ heartbeat/ภาพล้มตาม
 * ทั้งสองฟังก์ชันไม่ throw: บันทึกพลาดแค่ log ไว้
 */
const db = require('../config/db')

const ready = { heartbeats: true, frames: true }
const MIGRATION = 'migrations/20261125_hardware_evidence_log.sql'

const run = async (key, table, sql, params) => {
    if (!ready[key]) return false
    try {
        await db.query(sql, params)
        return true
    } catch (err) {
        if (err.code === '42P01') {  // ยังไม่มีตาราง
            ready[key] = false
            console.warn(`[HardwareLog] ${table} missing - run ${MIGRATION} (not recording until restart)`)
        } else {
            console.warn(`[HardwareLog] ${table} insert failed:`, err.message)
        }
        return false
    }
}

// health = ผลของ sanitizeHeartbeat (field ที่รู้จักเท่านั้น)
const recordHeartbeat = (deviceId, health) => run('heartbeats', 'tb_device_heartbeats',
    `INSERT INTO tb_device_heartbeats (id_devices, health) VALUES ($1, $2::jsonb)`,
    [deviceId, JSON.stringify(health)])

// status: accepted (รับไปประมวลผล) | busy (ตอบ 429 กล่องข้ามภาพนี้)
const recordFrame = ({ deviceId, farmId, capturedAt, receivedAt, bytes, status }) => run('frames', 'tb_camera_frames',
    `INSERT INTO tb_camera_frames (id_devices, id_farms, captured_at, received_at, bytes, status) VALUES ($1, $2, $3, $4, $5, $6)`,
    [deviceId, farmId || null, capturedAt.toISOString(), receivedAt.toISOString(), bytes, status])

module.exports = { recordHeartbeat, recordFrame, _ready: ready }
