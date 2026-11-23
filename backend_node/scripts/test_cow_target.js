// ทดสอบการคลิกเลือกวัวเป้าหมาย + คำนวณย้อนหลัง + ติดตามภาพใหม่ (ฐานข้อมูลจำลองในหน่วยความจำ): node backend_node/scripts/test_cow_target.js
const assert = require('assert')
const path = require('path')
process.env.SECRET_KEY = 'test-secret-cow-target'

const FARM = '11111111-1111-4111-8111-111111111111'
const OTHER_FARM = '22222222-2222-4222-8222-222222222222'
const T0 = Date.parse('2026-11-15T01:00:00Z')
const at = (m) => new Date(T0 + m * 60e3)
const lie = (cx) => ({ cls: 'lying down', score: 0.9, x1: cx - 0.09, y1: 0.55, x2: cx + 0.09, y2: 0.70 })
const stand = (cx) => ({ cls: 'standing', score: 0.9, x1: cx - 0.06, y1: 0.40, x2: cx + 0.06, y2: 0.70 })
const NEIGHBOUR = lie(0.70)

// ---- ฐานข้อมูลจำลอง ----
const db = { tableReady: true, cows: [], targets: [], obs: [], telemetry: [] }
// ภาพทุก 1 นาที 30 ภาพ: วัวเป้าหมายนอนที่ 0.49 แล้วลุกยืนนาทีที่ 20 วัวข้าง ๆ นอนตลอด
for (let m = 0; m < 30; m++) {
    db.telemetry.push({ id: 100 + m, farm_id: FARM, camera_id: null, timestamp: at(m), detections: { boxes: [m < 20 ? lie(0.49) : stand(0.49), NEIGHBOUR] } })
}
const latestMeta = () => ({ captured_at: at(0).toISOString(), boxes: [NEIGHBOUR, lie(0.49)] })

const query = async (sql, p = []) => {
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] }
    if (sql.includes('tb_cow_tracking_targets') && !db.tableReady) throw Object.assign(new Error('relation does not exist'), { code: '42P01' })
    if (sql.includes('FROM tb_farms')) return { rows: p[0] === FARM ? [{ id_farms: FARM }] : [] }
    if (sql.includes('INSERT INTO tb_cows')) {
        let cow = db.cows.find(c => c.id_farms === p[0] && c.tag_id === p[1])
        if (!cow) db.cows.push(cow = { id_cows: `cow-${db.cows.length + 1}`, id_farms: p[0], tag_id: p[1], name_cows: p[2] })
        else cow.name_cows = p[2] ?? cow.name_cows
        return { rows: [cow] }
    }
    if (sql.includes('SET active = false, ended_at = NOW() WHERE id_farms = $1 AND active')) {
        const hit = db.targets.filter(t => t.id_farms === p[0] && t.active)
        hit.forEach(t => { t.active = false; t.ended_at = new Date() })
        return { rows: [], rowCount: hit.length }
    }
    if (sql.includes('DELETE FROM tb_cow_behavior_observations')) {
        db.obs = db.obs.filter(o => !(o.id_cows === p[0] && o.method === p[1] && new Date(o.observed_at) >= new Date(p[2])))
        return { rows: [] }
    }
    if (sql.includes('INSERT INTO tb_cow_tracking_targets')) {
        const t = { id: db.targets.length + 1, id_farms: p[0], id_cows: p[1], method: p[2], seed_at: new Date(p[3]), seed_box: JSON.parse(p[4]), seed_source: p[5], state: null, processed_until: null, lost_at: null, active: true, created_at: new Date(Date.now() + db.targets.length) }
        db.targets.push(t)
        return { rows: [t] }
    }
    if (sql.includes('FROM cctv_behavior_telemetry')) {
        return { rows: db.telemetry.filter(r => r.farm_id === p[0] && r.timestamp >= new Date(p[1])).sort((a, b) => a.timestamp - b.timestamp) }
    }
    if (sql.includes('INSERT INTO tb_cow_behavior_observations')) {
        for (let i = 0; i < p.length; i += 12) {
            const [idF, idC, cam, tel, obsAt, beh, x1, y1, x2, y2, score, method] = p.slice(i, i + 12)
            if (db.obs.some(o => o.id_cows === idC && o.observed_at === obsAt && o.method === method)) continue
            db.obs.push({ id_farms: idF, id_cows: idC, telemetry_id: tel, observed_at: obsAt, behavior: beh, box_x1: x1, box_y1: y1, box_x2: x2, box_y2: y2, match_score: score, method })
        }
        return { rows: [] }
    }
    if (sql.includes('WHERE id_cows = $1 AND observed_at = $2 LIMIT 1')) {
        return { rows: db.obs.filter(o => o.id_cows === p[0] && new Date(o.observed_at).getTime() === new Date(p[1]).getTime()).slice(0, 1) }
    }
    if (sql.includes('SET state = $2::jsonb')) {
        const t = db.targets.find(x => x.id === p[0])
        Object.assign(t, { state: JSON.parse(p[1]), processed_until: p[2] ? new Date(p[2]) : null, lost_at: p[3], active: p[3] == null, ended_at: p[3] ? new Date() : null })
        return { rows: [] }
    }
    if (sql.includes('WHERE t.id_farms = $1 AND t.active')) {
        const t = db.targets.find(x => x.id_farms === p[0] && x.active)
        if (!t) return { rows: [] }
        const c = db.cows.find(x => x.id_cows === t.id_cows)
        return { rows: [{ ...t, tag_id: c.tag_id, name_cows: c.name_cows }] }
    }
    if (sql.includes('ORDER BY t.active DESC, t.created_at DESC')) {
        const t = [...db.targets].filter(x => x.id_farms === p[0]).sort((a, b) => (b.active - a.active) || (b.created_at - a.created_at))[0]
        if (!t) return { rows: [] }
        const c = db.cows.find(x => x.id_cows === t.id_cows)
        return { rows: [{ ...t, last_seen_ms: t.state?.at ?? null, id_cows: c.id_cows, tag_id: c.tag_id, name_cows: c.name_cows }] }
    }
    throw new Error('unexpected query: ' + sql.slice(0, 90))
}
const stub = (rel, exports) => {
    const f = require.resolve(path.resolve(__dirname, rel))
    require.cache[f] = { id: f, filename: f, loaded: true, exports }
}
stub('../app/config/db', { query, pool: { on() {}, connect: async () => ({ query, release() {} }) } })
stub('../app/services/cameraSamples', {
    getLatestImage: async () => ({ source: 'latest', ...latestMeta(), image_url: 'https://img/latest.jpg' }),
    listDaySamples: async () => [],
    readLatestResult: async () => latestMeta(),
    readSampleResult: async (p) => (p === `${FARM}/2026-11-15/08.jpg` ? latestMeta() : null)
})

const express = require('express')
const jwt = require('jsonwebtoken')
const tracker = require('../app/services/cowTargetTracker')
const app = express()
app.use(express.json())
app.use('/api/Admin/farms/:farmId/cow-target', require('../app/routes/Admin/cowTarget'))
const admin = jwt.sign({ id: 'u1', role: 'admin' }, process.env.SECRET_KEY)

const server = app.listen(0, async () => {
    const base = `http://127.0.0.1:${server.address().port}/api/Admin/farms`
    const call = async (method, url, body) => {
        const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` }, body: body && JSON.stringify(body) })
        return { status: r.status, body: await r.json() }
    }
    const pick = (extra = {}) => ({ source: 'latest', captured_at: at(0).toISOString(), box_index: 1, tag_id: 'TH-012', name: 'มะลิ', ...extra })
    try {
        // ยังไม่ได้รัน migration: บอกให้รัน และเลือกไม่ได้
        db.tableReady = false
        let r = await call('GET', `/${FARM}/cow-target`)
        assert.strictEqual(r.status, 200); assert.strictEqual(r.body.ready, false); assert.ok(r.body.migration.includes('20261117'))
        r = await call('POST', `/${FARM}/cow-target`, pick())
        assert.strictEqual(r.status, 409); assert.ok(r.body.message.includes('20261117'))
        db.tableReady = true

        // ตรวจข้อมูลที่ส่งมา
        assert.strictEqual((await call('POST', `/${FARM}/cow-target`, pick({ tag_id: ' ' }))).status, 400)
        assert.strictEqual((await call('POST', `/${FARM}/cow-target`, pick({ box_index: 5 }))).status, 400)
        assert.strictEqual((await call('POST', `/${FARM}/cow-target`, pick({ source: `${OTHER_FARM}/2026-11-15/08.jpg` }))).status, 400, 'other farm image')
        assert.strictEqual((await call('POST', `/${FARM}/cow-target`, pick({ captured_at: at(5).toISOString() }))).status, 409, 'latest image changed')
        assert.strictEqual((await call('POST', `/${OTHER_FARM}/cow-target`, pick())).status, 404)

        // คลิกวัวตัวที่ 2 ในภาพล่าสุด: คำนวณย้อนหลัง 30 ภาพ ไม่สลับไปตัวข้าง ๆ
        r = await call('POST', `/${FARM}/cow-target`, pick())
        assert.strictEqual(r.status, 200, JSON.stringify(r.body))
        assert.deepStrictEqual([r.body.cow.tag_id, r.body.cow.name, r.body.images, r.body.processed, r.body.lostAt], ['TH-012', 'มะลิ', 30, 30, null])
        assert.strictEqual(db.obs.length, 30)
        assert.deepStrictEqual([...new Set(db.obs.map(o => o.behavior))], ['lying', 'standing'])
        assert.ok(db.obs.every(o => o.box_x1 < 0.6), 'never matched the neighbour')

        r = await call('GET', `/${FARM}/cow-target`)
        assert.strictEqual(r.body.target.active, true); assert.strictEqual(r.body.target.cow.tag_id, 'TH-012')
        assert.strictEqual(r.body.target.last_seen_at, at(29).toISOString()); assert.strictEqual(r.body.latest.image_url, 'https://img/latest.jpg')
        // วัวเป้าหมายในภาพล่าสุด (ภาพเวลาเดียวกับผลติดตาม) ไว้ไฮไลต์บนจอภาพล่าสุด
        assert.strictEqual(r.body.target_in_latest.behavior, 'lying')
        assert.ok(r.body.target_in_latest.box.x1 < 0.6, 'the target, not the neighbour')

        // ภาพใหม่เข้ามา: ติดตามต่อ 1 ภาพ / ภาพเก่าที่ประมวลผลแล้วไม่ซ้ำ
        const row = { id: 200, farm_id: FARM, camera_id: null, timestamp: at(30), detections: { boxes: [stand(0.50), NEIGHBOUR] } }
        db.telemetry.push(row)
        assert.strictEqual((await tracker.onSnapshot(FARM, row)).processed, 1)
        assert.strictEqual(await tracker.onSnapshot(FARM, db.telemetry[5]), null)
        assert.strictEqual(db.obs.length, 31)

        // เลือกวัวตัวเดิมใหม่จากภาพย้อนหลัง: ผลเดิมตั้งแต่ภาพนั้นถูกแทน ไม่ซ้ำ
        r = await call('POST', `/${FARM}/cow-target`, pick({ source: `${FARM}/2026-11-15/08.jpg`, captured_at: undefined }))
        assert.strictEqual(r.status, 200); assert.strictEqual(r.body.images, 31); assert.strictEqual(db.obs.length, 31)
        assert.strictEqual(db.targets.filter(t => t.active).length, 1, 'only one active target per farm')
        assert.strictEqual(db.cows.length, 1, 'same tag = same cow')

        // วัวหายจากภาพนานเกิน 15 นาที: หลุดการติดตาม เลิก active
        const gone = { id: 201, farm_id: FARM, camera_id: null, timestamp: at(50), detections: { boxes: [NEIGHBOUR] } }
        db.telemetry.push(gone)
        assert.strictEqual((await tracker.onSnapshot(FARM, gone)).lostAt, at(50).toISOString())
        r = await call('GET', `/${FARM}/cow-target`)
        assert.strictEqual(r.body.target.active, false); assert.strictEqual(r.body.target.lost_at, at(50).toISOString())
        assert.strictEqual(await tracker.onSnapshot(FARM, { ...gone, id: 202, timestamp: at(51) }), null, 'no active target after lost')

        // เลือกใหม่จากภาพแรก: การคำนวณย้อนหลังเจอช่วงที่วัวหายเกิน 15 นาทีเอง จึงหลุดตั้งแต่ตอนคำนวณ
        r = await call('POST', `/${FARM}/cow-target`, pick())
        assert.strictEqual(r.body.lostAt, at(50).toISOString())
        assert.strictEqual((await call('POST', `/${FARM}/cow-target/stop`)).body.stopped, false, 'nothing active to stop')

        // เลือกใหม่ (ไม่มีช่วงที่หาย) แล้วกดเลิกติดตาม
        db.telemetry = db.telemetry.filter(t => t.id !== 201)
        await call('POST', `/${FARM}/cow-target`, pick())
        r = await call('POST', `/${FARM}/cow-target/stop`)
        assert.strictEqual(r.body.stopped, true)
        assert.strictEqual(db.targets.filter(t => t.active).length, 0)

        console.log('cow_target_test: all passed')
    } catch (e) {
        console.error(e); process.exitCode = 1
    } finally {
        server.close()
    }
})
