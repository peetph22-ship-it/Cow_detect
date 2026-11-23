// เลขวัวคงที่ทั้งวิดีโอในหน้า simulator (frontend/app/utils/cowIds.js): node backend_node/scripts/test_cow_ids.js
const assert = require('assert')
const path = require('path')
const { pathToFileURL } = require('url')

const B = (cx, cy, w = 0.14, h = 0.12) => ({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 })

;(async () => {
    const { assignCowIds } = await import(pathToFileURL(path.resolve(__dirname, '../../frontend/app/utils/cowIds.js')).href)

    // วัว A (ซ้าย) นอนนิ่ง, วัว B (ขวา) เดินช้า ๆ, ลำดับกรอบในแต่ละเฟรมสลับไปมา
    const A = B(0.2, 0.5)
    const frames = []
    for (let i = 0; i < 10; i++) {
        const b = B(0.6 + i * 0.01, 0.5)
        frames.push({ t: i * 10, boxes: i % 2 ? [b, A] : [A, b] })
    }
    // A ถูกบัง 2 เฟรม แล้วกลับมาที่เดิม, วัวใหม่ C เดินเข้าภาพ
    frames.push({ t: 100, boxes: [B(0.7, 0.5)] })
    frames.push({ t: 110, boxes: [B(0.71, 0.5)] })
    frames.push({ t: 120, boxes: [B(0.71, 0.5), A, B(0.4, 0.85)] })

    const ids = assignCowIds(frames)
    assert.deepStrictEqual(ids[0], [1, 2], 'เฟรมแรกเรียงเลขซ้ายไปขวา')
    for (let i = 0; i < 10; i++) {
        const idOfA = ids[i][frames[i].boxes.indexOf(A)]
        assert.strictEqual(idOfA, 1, `A ได้เลข 1 ทุกเฟรม (เฟรม ${i})`)
        assert.strictEqual(ids[i].filter(x => x === 2).length, 1, 'B ได้เลข 2')
    }
    assert.deepStrictEqual(ids[10], [2])
    assert.deepStrictEqual(ids[12], [2, 1, 3], 'A กลับมาได้เลขเดิม วัวใหม่ได้เลข 3')
    for (const row of ids) assert.strictEqual(new Set(row).size, row.length, 'ไม่มีเลขซ้ำในเฟรมเดียว')

    // หายนานเกิน maxLostSec (15 นาที) = นับเป็นตัวใหม่
    const late = assignCowIds([{ t: 0, boxes: [A] }, { t: 2000, boxes: [A] }])
    assert.deepStrictEqual(late, [[1], [2]])

    // วัว 2 ตัวนอนชิดกันในซองติดกัน: ต้องไม่สลับเลข
    const L = B(0.40, 0.5), R = B(0.55, 0.5)
    const side = assignCowIds([{ t: 0, boxes: [L, R] }, { t: 10, boxes: [R, L] }, { t: 20, boxes: [L, R] }])
    assert.deepStrictEqual(side, [[1, 2], [2, 1], [1, 2]])

    console.log('cow_ids_test: all passed')
})().catch(e => { console.error(e); process.exit(1) })
