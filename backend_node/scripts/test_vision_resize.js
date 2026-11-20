// ทดสอบการย่อภาพแบบยืดเต็มกรอบ (RESIZE_MODE = 'stretch'): node backend_node/scripts/test_vision_resize.js
// 1) toImageBoxes: พิกัดในภาพเข้าโมเดล 0..imgsz -> สัดส่วน 0..1 ของภาพจริงทั้งสองแกน
// 2) ถ้ามีไฟล์โมเดลในเครื่อง: ผ่าน visionService จริง (worker + sharp) ภาพทดสอบแบบจัตุรัสกับแบบ 16:9 (ภาพเดียวกันที่ไม่ถูกยืด)
//    ต้องได้กรอบตำแหน่งเดียวกัน และกรอบบนภาพ 16:9 ต้องตรงกับเฉลย (ถ้าแปลงพิกัดผิด IoU กับเฉลยจะต่ำ)
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { toImageBoxes, RESIZE_MODE, CLASS_NAMES, iou } = require('../app/services/visionPostprocess')

assert.strictEqual(RESIZE_MODE, 'stretch')
assert.deepStrictEqual(
    toImageBoxes([{ cls: 3, score: 0.91234, x1: 120, y1: 240, x2: 360, y2: 480 }], 480)[0],
    { cls: 'standing', score: 0.912, x1: 0.25, y1: 0.5, x2: 0.75, y2: 1 }
)
const clamped = toImageBoxes([{ cls: 2, score: 0.5, x1: -10, y1: -5, x2: 500, y2: 490 }], 480)[0]
assert.deepStrictEqual([clamped.cls, clamped.x1, clamped.y1, clamped.x2, clamped.y2], ['lying down', 0, 0, 1, 1])

const MODEL = path.resolve(__dirname, '../app/weights/yolo26m_480.onnx')
const TEST_DIR = path.resolve(__dirname, '../../backend/training_archive/cow-behavior-analysiws--2/test')
// ภาพกลางวันที่ไม่ซ้ำกับภาพฝึก มีวัว 4-8 ตัว (2 ภาพหลังเป็นภาพที่แบบ letterbox เดิมหาวัวไม่ครบ)
const IMAGES = [
    '36_00006_jpg.rf.81e76335d8f1adc98fc75db16bfa5691.jpg',
    '316_00005_jpg.rf.24c0cf0285427b3902979495e4528609.jpg',
    '646_00007_jpg.rf.c3caba87cfea6de6c32fc85bd9bb76fd.jpg'
]

const readGT = (img) => fs.readFileSync(path.join(TEST_DIR, 'labels', img.replace(/\.jpg$/, '.txt')), 'utf8')
    .trim().split('\n').filter(Boolean).map(l => {
        const [c, x, y, w, h] = l.split(/\s+/).map(Number)
        return { cls: CLASS_NAMES[c], x1: x - w / 2, y1: y - h / 2, x2: x + w / 2, y2: y + h / 2 }
    })

;(async () => {
    if (!fs.existsSync(MODEL) || !fs.existsSync(TEST_DIR)) {
        console.log('vision resize: unit ok (model check skipped: no local model or test images)')
        return
    }
    const vision = require('../app/services/visionService')
    try {
        for (const img of IMAGES) {
            const square = fs.readFileSync(path.join(TEST_DIR, 'images', img))
            const wide = await sharp(square).resize(1138, 640, { fit: 'fill' }).jpeg({ quality: 92 }).toBuffer()
            const a = await vision.detect(square)
            const b = await vision.detect(wide)
            assert.strictEqual(b.resize, 'stretch')
            assert.deepStrictEqual(b.image, { width: 1138, height: 640 })
            // สัดส่วนภาพไม่ควรเปลี่ยนตำแหน่งกรอบ (ภาพเข้าโมเดลเหมือนกันเกือบทุกพิกเซล)
            const same = a.boxes.filter(p => b.boxes.some(q => iou(p, q) >= 0.8)).length
            assert.ok(same >= Math.ceil(a.boxes.length * 0.8), `${img}: square/16:9 boxes differ (${same}/${a.boxes.length})`)
            // กรอบบนภาพ 16:9 ตรงกับเฉลย
            const gt = readGT(img)
            const hit = gt.filter(g => b.boxes.some(p => iou(g, p) >= 0.5)).length
            assert.ok(hit >= Math.ceil(gt.length * 0.75), `${img}: only ${hit}/${gt.length} cows found on the 16:9 frame`)
        }
        console.log('vision resize: ok (unit + model on 3 test images)')
    } finally {
        await vision.shutdown?.()
    }
})().catch(err => { console.error(err); process.exit(1) })
