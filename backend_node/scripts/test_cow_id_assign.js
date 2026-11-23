// เลขวัวทุกตัวตอนรับภาพจากกล้องจริง (services/cowIdAssign.js ผ่าน routes/camera.js): node backend_node/scripts/test_cow_id_assign.js
// ใช้ตาราง telemetry จำลองในหน่วยความจำ: เลขคงที่ข้ามภาพ, เก็บใน detections, เดินต่อหลังกล้องหลุดนาน, DB ล้มก็ยังบันทึกภาพ
const assert = require('assert')
const path = require('path')

const FARM = '88888888-8888-4888-8888-888888888888'
const telemetry = []   // { timestamp: Date, detections }
let failIds = false
const stub = (rel, exports) => {
    const p = require.resolve(path.resolve(__dirname, rel))
    require.cache[p] = { id: p, filename: p, loaded: true, exports }
}
stub('../app/config/db', {
    pool: { on() {} },
    query: async (sql, p = []) => {
        if (sql.includes("detections->'boxes' AS boxes")) {
            if (failIds) throw new Error('db hiccup')
            const [, from, to] = p
            return { rows: telemetry.filter(r => r.timestamp >= new Date(from) && r.timestamp < new Date(to)).map(r => ({ timestamp: r.timestamp, boxes: r.detections.boxes })) }
        }
        if (sql.includes("(detections->>'next_cow_id')::int AS next_id")) {
            const rows = telemetry.filter(r => r.timestamp < new Date(p[1]) && r.detections.next_cow_id).sort((a, b) => b.timestamp - a.timestamp)
            return { rows: rows.slice(0, 1).map(r => ({ next_id: r.detections.next_cow_id })) }
        }
        if (sql.includes('INSERT INTO cctv_behavior_telemetry')) {
            telemetry.push({ timestamp: new Date(p[2]), detections: JSON.parse(p[14]) })
            return { rows: [{ id: telemetry.length }] }
        }
        if (sql.includes('FROM cctv_cameras')) return { rows: [] }
        throw new Error('unexpected query ' + sql.slice(0, 60))
    }
})
let nextBoxes = []
stub('../app/services/visionService', {
    detect: async () => ({ boxes: nextBoxes.map(b => ({ ...b })), counts: { standing: 0, lying: nextBoxes.length, feeding: 0, drinking: 0 }, pct: { standing: 0, lying: 100, feeding: 0, drinking: 0 }, total: nextBoxes.length, cci: null, confidence_avg: 0.6, timing_ms: { total: 1 } }),
    IMGSZ: 480, VisionBusyError: class extends Error {}, canAccept: () => true, status: () => ({})
})
stub('../app/services/cowTargetTracker', { onSnapshot: async () => {} })
stub('../app/services/cameraSamples', {
    ...require('../app/services/cameraSamples'),
    maybeSaveSample: async () => {}, saveLatest: async () => {}, saveCollectedImage: async () => {}, saveCollectedResult: async () => {}
})

const { _processSnapshot } = require('../app/routes/camera')
const box = (cx, cy) => ({ cls: 'lying down', score: 0.6, x1: cx - 0.07, y1: cy - 0.06, x2: cx + 0.07, y2: cy + 0.06 })
const T0 = Date.parse('2026-11-25T03:00:00Z')
const shot = async (min, boxes) => { nextBoxes = boxes; await _processSnapshot({ id: 'dev', farmId: FARM, serial: 'BOX' }, new Date(T0 + min * 60e3), Buffer.from([0xff, 0xd8])) }
const idsAt = (i) => telemetry[i].detections.boxes.map(b => b.id)

;(async () => {
    const A = box(0.2, 0.5), Bx = box(0.6, 0.5)
    await shot(0, [A, Bx])
    assert.deepStrictEqual(idsAt(0), [1, 2], 'ภาพแรก เรียงซ้ายไปขวา')
    assert.strictEqual(telemetry[0].detections.next_cow_id, 3)

    await shot(1, [Bx, A])                       // ลำดับกรอบสลับ
    assert.deepStrictEqual(idsAt(1), [2, 1])

    await shot(2, [A])                           // B ถูกบัง
    await shot(3, [A, Bx, box(0.4, 0.85)])       // B กลับมา + วัวใหม่
    assert.deepStrictEqual(idsAt(3), [1, 2, 3])
    assert.strictEqual(telemetry[3].detections.next_cow_id, 4)

    await shot(60, [A])                          // กล้องหลุด 57 นาที: เลขใหม่ ไม่ใช้ 1 ซ้ำ
    assert.deepStrictEqual(idsAt(4), [4])

    failIds = true                               // อ่านสถานะไม่ได้: บันทึกภาพได้ แต่ไม่มีเลข
    await shot(61, [A])
    assert.strictEqual(telemetry.length, 6)
    assert.deepStrictEqual(idsAt(5), [undefined])
    assert.ok(!('next_cow_id' in telemetry[5].detections))

    console.log('cow_id_assign_test: all passed')
})().catch(e => { console.error(e); process.exit(1) })
