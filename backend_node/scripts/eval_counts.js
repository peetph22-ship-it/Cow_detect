/**
 * วัดความแม่นการ "นับวัว" ของโมเดลที่ใช้จริง (yolo26m_480.onnx) กับชุดทดสอบที่มีเฉลย
 * เทียบวิธีตัดกรอบซ้อน (NMS): แยกตามท่า (ค่าเดิม) กับไม่ดูท่า (agnostic)
 * ใช้การเตรียมภาพแบบเดียวกับ visionWorker และการอ่านผลจาก visionPostprocess
 *
 * Usage: node backend_node/scripts/eval_counts.js <DATASET_SPLIT_DIR> [MODEL_PATH]
 *   DATASET_SPLIT_DIR มี images/ และ labels/ (YOLO format: cls cx cy w h, สัดส่วน 0-1)
 */
const fs = require('fs')
const path = require('path')
const ort = require('onnxruntime-node')
const sharp = require('sharp')
const { CLASS_NAMES, iou, decodeDetections, toImageBoxes } = require('../app/services/visionPostprocess')

const dir = process.argv[2]
const modelPath = process.argv[3] || path.resolve(__dirname, '../app/weights/yolo26m_480.onnx')
if (!dir) {
    console.error('Usage: node scripts/eval_counts.js <DATASET_SPLIT_DIR> [MODEL_PATH]')
    process.exit(1)
}
const IMG = 480
const LYING = CLASS_NAMES.indexOf('lying down')

const VARIANTS = [
    { name: 'แยกตามท่า IoU 0.7 (ค่าเดิม)', opts: { iouThr: 0.7, agnostic: false } },
    { name: 'ไม่ดูท่า IoU 0.7', opts: { iouThr: 0.7, agnostic: true } },
    { name: 'ไม่ดูท่า IoU 0.5', opts: { iouThr: 0.5, agnostic: true } }
]

// เหมือน visionWorker.preprocess (ยืดเต็มกรอบตาม RESIZE_MODE) และคืนขนาดภาพจริง
const preprocess = async (file) => {
    const img = sharp(file).rotate()
    const { data, info } = await img
        .resize(IMG, IMG, { fit: 'fill', kernel: 'linear' })
        .removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const meta = await sharp(file).rotate().toBuffer({ resolveWithObject: true }).then(r => r.info)
    const plane = IMG * IMG
    const chw = new Float32Array(3 * plane)
    for (let i = 0; i < plane; i++) {
        chw[i] = data[i * 3] / 255
        chw[plane + i] = data[i * 3 + 1] / 255
        chw[2 * plane + i] = data[i * 3 + 2] / 255
    }
    if (info.channels !== 3) throw new Error(`unexpected channels ${info.channels}`)
    return { chw, W: meta.width, H: meta.height }
}

// พิกัดภาพเข้าโมเดล 480 -> สัดส่วนบนภาพจริง (ใช้ฟังก์ชันเดียวกับ server) คงเลขคลาสไว้เทียบกับเฉลย
const toNorm = (d) => ({ ...toImageBoxes([d], IMG)[0], cls: d.cls, score: d.score })

const readLabels = (file) => {
    if (!fs.existsSync(file)) return []
    return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => {
        const [c, cx, cy, w, h] = l.trim().split(/\s+/).map(Number)
        return { cls: c, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 }
    })
}

// จับคู่กรอบกับเฉลยแบบไม่ดูท่า (IoU >= 0.5 เรียงจากคู่ที่ซ้อนกันมากสุด)
const match = (preds, gts) => {
    const pairs = []
    preds.forEach((p, i) => gts.forEach((g, j) => { const v = iou(p, g); if (v >= 0.5) pairs.push([v, i, j]) }))
    pairs.sort((a, b) => b[0] - a[0])
    const usedP = new Set(), usedG = new Set()
    let wrongPose = 0
    for (const [, i, j] of pairs) {
        if (usedP.has(i) || usedG.has(j)) continue
        usedP.add(i); usedG.add(j)
        if (preds[i].cls !== gts[j].cls) wrongPose++
    }
    return { matched: usedP.size, extra: preds.length - usedP.size, missed: gts.length - usedG.size, wrongPose }
}

// คู่กรอบต่างท่าที่ซ้อนกันมาก = วัวตัวเดียวถูกนับ 2 ครั้ง
const crossClassDup = (preds, thr = 0.7) => {
    let n = 0
    for (let i = 0; i < preds.length; i++) for (let j = i + 1; j < preds.length; j++) {
        if (preds[i].cls !== preds[j].cls && iou(preds[i], preds[j]) > thr) n++
    }
    return n
}

;(async () => {
    const session = await ort.InferenceSession.create(modelPath, { intraOpNumThreads: 4 })
    const files = fs.readdirSync(path.join(dir, 'images')).filter(f => /\.(jpe?g|png)$/i.test(f)).sort()
    const stats = VARIANTS.map(() => ({ absTotal: 0, signTotal: 0, absLying: 0, signLying: 0, absLyingPct: 0, pctImages: 0, matched: 0, extra: 0, missed: 0, wrongPose: 0, dup: 0, exact: 0 }))
    let gtCows = 0, gtLying = 0

    for (const f of files) {
        const { chw, W, H } = await preprocess(path.join(dir, 'images', f))
        const out = (await session.run({ images: new ort.Tensor('float32', chw, [1, 3, IMG, IMG]) })).output0
        const gts = readLabels(path.join(dir, 'labels', f.replace(/\.[^.]+$/, '.txt')))
        const gL = gts.filter(g => g.cls === LYING).length
        gtCows += gts.length; gtLying += gL

        VARIANTS.forEach((v, k) => {
            const preds = decodeDetections(out.data, out.dims, v.opts).map(toNorm)
            const pL = preds.filter(p => p.cls === LYING).length
            const s = stats[k]
            s.absTotal += Math.abs(preds.length - gts.length)
            s.signTotal += preds.length - gts.length
            s.absLying += Math.abs(pL - gL)
            s.signLying += pL - gL
            if (preds.length === gts.length) s.exact++
            if (gts.length && preds.length) {
                s.absLyingPct += Math.abs(pL / preds.length - gL / gts.length) * 100
                s.pctImages++
            }
            const m = match(preds, gts)
            s.matched += m.matched; s.extra += m.extra; s.missed += m.missed; s.wrongPose += m.wrongPose
            s.dup += crossClassDup(preds)
        })
    }

    const n = files.length
    const r2 = (x) => x.toFixed(2)
    console.log(`ภาพ ${n} ภาพ, วัวตามเฉลย ${gtCows} ตัว (นอน ${gtLying} ตัว), โมเดล ${path.basename(modelPath)}, conf 0.25\n`)
    VARIANTS.forEach((v, k) => {
        const s = stats[k]
        console.log(`== ${v.name} ==`)
        console.log(`  จำนวนวัวรวมคลาดเฉลี่ย ${r2(s.absTotal / n)} ตัว/ภาพ (เกิน(+)/ขาด(-) เฉลี่ย ${r2(s.signTotal / n)}), นับตรงเป๊ะ ${s.exact}/${n} ภาพ`)
        console.log(`  จำนวนวัวนอนคลาดเฉลี่ย ${r2(s.absLying / n)} ตัว/ภาพ (เกิน(+)/ขาด(-) เฉลี่ย ${r2(s.signLying / n)})`)
        console.log(`  % วัวนอนคลาดเฉลี่ย ${r2(s.absLyingPct / Math.max(1, s.pctImages))} จุด %`)
        console.log(`  จับคู่ได้ ${s.matched}, เกิน ${s.extra}, พลาด ${s.missed}, จับคู่ได้แต่ท่าผิด ${s.wrongPose}`)
        console.log(`  กรอบต่างท่าซ้อนกัน (นับซ้ำ) ${s.dup} คู่\n`)
    })
})().catch(err => { console.error(err); process.exit(1) })
