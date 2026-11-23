// ติดตามบนเบราว์เซอร์ (หน้า simulator) = server: node backend_node/scripts/test_tracking_parity.js
// 1) frontend/app/utils/cowTracking.js สร้างจากโค้ด server ล่าสุด (ไม่มีใครแก้แยก)
// 2) ผลของทั้ง 2 ชุดเหมือนกันทุกค่า บนข้อมูลจำลองที่มีวัวเดิน ถูกบัง วัวข้างตัวติดกัน และหลุดการติดตาม
const assert = require('assert')
const fs = require('fs')
const { pathToFileURL } = require('url')
const server = require('../app/services/cowTracking')
const { build, OUT } = require('./sync_browser_tracking')

assert.strictEqual(fs.readFileSync(OUT, 'utf8'), build(), 'frontend/app/utils/cowTracking.js ไม่ตรงกับ server: รัน node backend_node/scripts/sync_browser_tracking.js')

let seed = 7
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
const box = (cls, cx, cy, w, h) => ({ cls, x1: cx - w / 2 + (rnd() - 0.5) * 0.01, y1: cy - h / 2 + (rnd() - 0.5) * 0.01, x2: cx + w / 2 + (rnd() - 0.5) * 0.01, y2: cy + h / 2 + (rnd() - 0.5) * 0.01, score: 0.5 + rnd() * 0.4 })
const T0 = Date.parse('2026-11-25T03:00:00Z')

// สถานการณ์: ทุก stepSec วินาที (แบบวิดีโอใน simulator และแบบกล้องจริงทุก 60 วิ)
const scene = (stepSec, n) => {
    const frames = []
    for (let i = 0; i < n; i++) {
        const f = i / n
        const boxes = [box('lying down', 0.70, 0.62, 0.18, 0.15), box('standing', 0.85, 0.2, 0.12, 0.3)]
        let target
        if (f < 0.3) target = box('lying down', 0.50, 0.62, 0.18, 0.15)
        else if (f < 0.5) target = box('standing', 0.50 - (f - 0.3) * 1.5, 0.55 - (f - 0.3), 0.12, 0.3)
        else if (f < 0.7) target = box(rnd() < 0.8 ? 'feeding' : 'drinking', 0.2, 0.35, 0.12, 0.3)
        else target = box('standing', 0.22, 0.36, 0.12, 0.3)
        if (i % 17 === 5) target = null   // ถูกบัง
        if (target) boxes.splice(i % 3, 0, target)
        frames.push({ observedAt: new Date(T0 + i * stepSec * 1000).toISOString(), boxes })
    }
    return frames
}

;(async () => {
    const browser = await import(pathToFileURL(OUT).href)
    for (const k of ['METHOD', 'TRACK_DEFAULTS', 'BOUT_DEFAULTS', 'MOVE_DEFAULTS']) assert.deepStrictEqual(browser[k], server[k], k)

    const cases = [
        { stepSec: 1, n: 120 },
        { stepSec: 5, n: 200 },
        { stepSec: 60, n: 360 },
        { stepSec: 60, n: 40, gapAfter: 20 }   // กล้องหลุด 20 นาที = หลุดการติดตาม
    ]
    for (const c of cases) {
        let frames = scene(c.stepSec, c.n)
        if (c.gapAfter) frames = frames.map((f, i) => i < c.gapAfter ? f : { ...f, observedAt: new Date(Date.parse(f.observedAt) + 20 * 60e3).toISOString() })
        const seedBox = frames[0].boxes.find(b => Math.abs((b.x1 + b.x2) / 2 - 0.5) < 0.03)
        const seedArg = { box: seedBox, at: frames[0].observedAt }
        const s = server.trackTarget(frames, seedArg)
        const b = browser.trackTarget(frames, seedArg)
        assert.deepStrictEqual(b, s, `trackTarget step ${c.stepSec}s`)
        assert.ok(s.observations.length > 0)
        if (c.gapAfter) assert.ok(s.lostAt, 'กล้องหลุดนานต้องหลุดการติดตาม')
        const opts = { intervalSec: c.stepSec }
        const sb = server.buildBouts(s.observations, opts)
        assert.deepStrictEqual(browser.buildBouts(b.observations, opts), sb, 'buildBouts')
        const from = frames[0].observedAt
        const to = new Date(Date.parse(frames[frames.length - 1].observedAt) + c.stepSec * 1000).toISOString()
        assert.deepStrictEqual(browser.summarizeBouts(sb.bouts, from, to), server.summarizeBouts(sb.bouts, from, to), 'summarizeBouts')
        assert.deepStrictEqual(browser.buildMovement(b.observations, opts), server.buildMovement(s.observations, opts), 'buildMovement')
    }
    // ตำแหน่งอ่านง่ายใน CSV (ค่าจากไฟล์ CSV จริงของคลิปโรงเรือน)
    const A = { x1: 0.63, y1: 0.2545, x2: 0.803, y2: 0.5088 }
    assert.deepStrictEqual(server.describePosition(A), { zone: 'middle-right', centerXPct: 71.7, centerYPct: 38.2, widthPct: 17.3, heightPct: 25.4 })
    assert.strictEqual(server.describePosition({ x1: 0.4, y1: 0.4, x2: 0.6, y2: 0.6 }).zone, 'center')
    assert.strictEqual(server.describePosition({ x1: 0, y1: 0.8, x2: 0.1, y2: 1 }).zone, 'bottom-left')
    assert.strictEqual(server.describePosition(null), null)
    assert.deepStrictEqual(server.describeMove(A, { x1: 0.6287, y1: 0.2434, x2: 0.8032, y2: 0.5136 }), { movedBody: 0.02, movement: 'still' })
    assert.strictEqual(server.describeMove(A, { x1: 0.3, y1: 0.2, x2: 0.45, y2: 0.5 }).movement, 'moving')
    assert.deepStrictEqual(server.describeMove(null, A), { movedBody: null, movement: null })
    assert.deepStrictEqual(browser.describePosition(A), server.describePosition(A))

    console.log('tracking_parity_test: all passed')
})().catch(e => { console.error(e); process.exit(1) })
