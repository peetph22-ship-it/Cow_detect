/**
 * ติดตามวัวเป้าหมายที่ผู้ดูแลคลิกเลือก ต่อจาก cowTracking (pure) เข้ากับฐานข้อมูล
 *
 * - selectTarget: คลิกเลือกวัวจากภาพ (ล่าสุดหรือย้อนหลัง) -> บันทึกวัว + เป้าหมาย
 *   แล้วคำนวณย้อนหลังจากกรอบที่เก็บไว้ทุกภาพ (cctv_behavior_telemetry.detections) ตั้งแต่ภาพที่คลิกจนถึงปัจจุบัน
 * - onSnapshot: ภาพใหม่เข้ามา -> ติดตามต่อ 1 ภาพ -> บันทึกลง tb_cow_behavior_observations
 * - stopTarget: เลิกติดตาม
 * งานของฟาร์มเดียวกันทำทีละงาน (คิวในหน่วยความจำ: Render มี instance เดียว) ภาพสดกับการคำนวณย้อนหลังจึงไม่ชนกัน
 * ยังไม่ได้รัน migration 20261117 = ไม่มีเป้าหมาย (ภาพใหม่ไม่ถูกติดตาม แต่การรับภาพทำงานปกติ)
 */
const db = require('../config/db')
const { METHOD, seedState, stepTarget } = require('./cowTracking')

const MIGRATION = 'migrations/20261117_cow_tracking_targets.sql'
const CHUNK = 500

const queues = new Map()
const withFarmLock = (farmId, fn) => {
    const run = (queues.get(farmId) || Promise.resolve()).then(fn, fn)
    queues.set(farmId, run.catch(() => {}))
    return run
}

const missingTable = (err) => err && err.code === '42P01'

const getActiveTarget = async (farmId) => {
    try {
        const { rows } = await db.query(`
            SELECT t.*, c.tag_id, c.name_cows
            FROM tb_cow_tracking_targets t
            JOIN tb_cows c ON c.id_cows = t.id_cows
            WHERE t.id_farms = $1 AND t.active
            LIMIT 1
        `, [farmId])
        return rows[0] || null
    } catch (err) {
        if (missingTable(err)) return null
        throw err
    }
}

// เป้าหมายล่าสุด (กำลังติดตาม หรือหลุดไปแล้ว) สำหรับแสดงสถานะในหน้าเว็บ
const getLatestTarget = async (farmId) => {
    try {
        const { rows } = await db.query(`
            SELECT t.id, t.active, t.seed_at, t.seed_source, t.processed_until, t.lost_at, t.created_at, t.ended_at,
                   (t.state->>'at')::bigint AS last_seen_ms, c.id_cows, c.tag_id, c.name_cows
            FROM tb_cow_tracking_targets t
            JOIN tb_cows c ON c.id_cows = t.id_cows
            WHERE t.id_farms = $1
            ORDER BY t.active DESC, t.created_at DESC
            LIMIT 1
        `, [farmId])
        const r = rows[0]
        if (!r) return { ready: true, target: null }
        return {
            ready: true,
            target: {
                id: r.id, active: r.active, seed_at: r.seed_at, seed_source: r.seed_source,
                processed_until: r.processed_until, lost_at: r.lost_at, ended_at: r.ended_at,
                last_seen_at: r.last_seen_ms ? new Date(Number(r.last_seen_ms)).toISOString() : null,
                cow: { id: r.id_cows, tag_id: r.tag_id, name: r.name_cows }
            }
        }
    } catch (err) {
        if (missingTable(err)) return { ready: false, target: null, migration: MIGRATION }
        throw err
    }
}

const insertObservations = async (client, target, observations) => {
    for (let i = 0; i < observations.length; i += CHUNK) {
        const part = observations.slice(i, i + CHUNK)
        const values = []
        const params = []
        part.forEach((o, k) => {
            const b = o.box || {}
            values.push(`(${Array.from({ length: 12 }, (_, j) => `$${k * 12 + j + 1}`).join(', ')})`)
            params.push(target.id_farms, target.id_cows, o.cameraId, o.telemetryId, o.observedAt, o.behavior,
                b.x1 ?? null, b.y1 ?? null, b.x2 ?? null, b.y2 ?? null, o.matchScore, o.method)
        })
        await client.query(`
            INSERT INTO tb_cow_behavior_observations
                (id_farms, id_cows, camera_id, telemetry_id, observed_at, behavior, box_x1, box_y1, box_x2, box_y2, match_score, method)
            VALUES ${values.join(', ')}
            ON CONFLICT (id_cows, observed_at, method) DO NOTHING
        `, params)
    }
}

/**
 * ติดตามต่อจาก state ของเป้าหมายด้วยภาพที่เรียงตามเวลา แล้วบันทึกผลและ state ใหม่ (ใน transaction เดียว)
 * @returns {{processed: number, lostAt: string|null}}
 */
const advance = async (client, target, frames) => {
    let state = target.state || seedState({ box: target.seed_box, at: target.seed_at })
    const observations = []
    let lostAt = null
    let lastFrameAt = target.processed_until
    for (const f of frames) {
        const r = stepTarget(state, f)
        if (r.lost) { lostAt = new Date(f.observedAt).toISOString(); break }
        observations.push(r.observation)
        state = r.state
        lastFrameAt = f.observedAt
    }
    await insertObservations(client, target, observations)
    await client.query(`
        UPDATE tb_cow_tracking_targets
        SET state = $2::jsonb, processed_until = $3, lost_at = $4, active = ($4::timestamptz IS NULL), ended_at = CASE WHEN $4::timestamptz IS NULL THEN NULL ELSE NOW() END
        WHERE id = $1
    `, [target.id, JSON.stringify(state), lastFrameAt, lostAt])
    return { processed: observations.length, lostAt }
}

const toFrame = (row) => ({
    observedAt: new Date(row.timestamp).toISOString(),
    telemetryId: row.id,
    cameraId: row.camera_id,
    boxes: Array.isArray(row.detections?.boxes) ? row.detections.boxes : []
})

const inTransaction = async (fn) => {
    const client = await db.pool.connect()
    try {
        await client.query('BEGIN')
        const out = await fn(client)
        await client.query('COMMIT')
        return out
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
    } finally {
        client.release()
    }
}

/**
 * ภาพใหม่เข้ามา (เรียกหลังบันทึก telemetry แล้ว) ไม่ throw ให้การรับภาพกระทบ
 */
const onSnapshot = (farmId, row) => withFarmLock(farmId, async () => {
    try {
        const target = await getActiveTarget(farmId)
        if (!target) return null
        if (target.processed_until && new Date(row.timestamp) <= new Date(target.processed_until)) return null
        return await inTransaction(client => advance(client, target, [toFrame(row)]))
    } catch (err) {
        console.warn('[CowTarget] tracking failed:', err.message)
        return null
    }
})

/**
 * เลือกวัวเป้าหมายจากกรอบในภาพ แล้วคำนวณย้อนหลังจนถึงปัจจุบัน
 * @param {{seedAt: string, box: {x1,y1,x2,y2}, source: string, tagId: string, name?: string, createdBy?: string}} sel
 */
const selectTarget = (farmId, sel) => withFarmLock(farmId, () => inTransaction(async (client) => {
    const cow = (await client.query(`
        INSERT INTO tb_cows (id_farms, tag_id, name_cows)
        VALUES ($1, $2, $3)
        ON CONFLICT (id_farms, tag_id) DO UPDATE
            SET name_cows = COALESCE(EXCLUDED.name_cows, tb_cows.name_cows), deleted_at = NULL, updated_at = NOW()
        RETURNING id_cows, tag_id, name_cows
    `, [farmId, sel.tagId, sel.name || null])).rows[0]

    await client.query(`UPDATE tb_cow_tracking_targets SET active = false, ended_at = NOW() WHERE id_farms = $1 AND active`, [farmId])
    // เลือกวัวตัวเดิมใหม่จากเวลาก่อนหน้า: ผลเดิมตั้งแต่ภาพนั้นถูกแทนด้วยผลจากการเลือกครั้งนี้
    await client.query(`DELETE FROM tb_cow_behavior_observations WHERE id_cows = $1 AND method = $2 AND observed_at >= $3`, [cow.id_cows, METHOD, sel.seedAt])

    const target = (await client.query(`
        INSERT INTO tb_cow_tracking_targets (id_farms, id_cows, method, seed_at, seed_box, seed_source, created_by)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
        RETURNING *
    `, [farmId, cow.id_cows, METHOD, sel.seedAt, JSON.stringify(sel.box), sel.source, sel.createdBy || null])).rows[0]

    const { rows } = await client.query(`
        SELECT id, camera_id, timestamp, detections
        FROM cctv_behavior_telemetry
        WHERE farm_id = $1 AND is_simulation = false AND detections IS NOT NULL AND timestamp >= $2
        ORDER BY timestamp
    `, [farmId, sel.seedAt])
    const result = await advance(client, target, rows.map(toFrame))
    return { cow: { id: cow.id_cows, tag_id: cow.tag_id, name: cow.name_cows }, images: rows.length, ...result }
}).catch(err => {
    if (missingTable(err)) throw Object.assign(new Error(`ต้องรัน ${MIGRATION} ก่อน`), { status: 409 })
    throw err
}))

const stopTarget = (farmId) => withFarmLock(farmId, async () => {
    try {
        const { rowCount } = await db.query(`UPDATE tb_cow_tracking_targets SET active = false, ended_at = NOW() WHERE id_farms = $1 AND active`, [farmId])
        return rowCount > 0
    } catch (err) {
        if (missingTable(err)) return false
        throw err
    }
})

module.exports = { onSnapshot, selectTarget, stopTarget, getLatestTarget, MIGRATION }
