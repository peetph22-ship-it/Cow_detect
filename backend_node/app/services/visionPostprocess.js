/**
 * YOLO26m (Ultralytics, end2end=False) post-processing - pure functions, ทดสอบได้โดยไม่ต้องมีโมเดล
 *
 * output0 shape [1, 4 + nc, N]: แถว 0..3 = cx, cy, w, h (พิกเซลในภาพ letterbox), แถว 4.. = คะแนนแต่ละคลาส
 * โมเดลนี้ export แบบไม่ใช่ NMS-free จึงต้องทำ NMS เอง (class-wise เหมือน Ultralytics ค่าเริ่มต้น)
 */

// ต้องตรงกับ names ใน metadata ของโมเดล (data.yaml ของ dataset)
const CLASS_NAMES = ['drinking', 'feeding', 'lying down', 'standing']

const iou = (a, b) => {
    const x1 = Math.max(a.x1, b.x1)
    const y1 = Math.max(a.y1, b.y1)
    const x2 = Math.min(a.x2, b.x2)
    const y2 = Math.min(a.y2, b.y2)
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
    const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter
    return union > 0 ? inter / union : 0
}

/**
 * @param {Float32Array} data  output0 flat
 * @param {number[]} dims      [1, 4+nc, N]
 */
const decodeDetections = (data, dims, { conf = 0.25, iouThr = 0.7, maxDet = 300 } = {}) => {
    const nc = dims[1] - 4
    const n = dims[2]
    const candidates = []
    for (let i = 0; i < n; i++) {
        let best = -1
        let score = 0
        for (let c = 0; c < nc; c++) {
            const s = data[(4 + c) * n + i]
            if (s > score) { score = s; best = c }
        }
        if (score < conf) continue
        const cx = data[i]
        const cy = data[n + i]
        const w = data[2 * n + i]
        const h = data[3 * n + i]
        candidates.push({ cls: best, score, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 })
    }
    candidates.sort((a, b) => b.score - a.score)

    const kept = []
    for (const d of candidates) {
        if (kept.length >= maxDet) break
        if (kept.some(k => k.cls === d.cls && iou(k, d) > iouThr)) continue
        kept.push(d)
    }
    return kept
}

/**
 * สรุปจำนวนวัวต่อพฤติกรรม + CCI
 * CCI = นอน / (นอน + ยืน) x 100 (สูตรเดียวกับหน้าเว็บ) ไม่มีวัวที่ยืนหรือนอนเลย = null
 */
const summarize = (detections) => {
    const counts = { drinking: 0, feeding: 0, lying: 0, standing: 0 }
    const key = { drinking: 'drinking', feeding: 'feeding', 'lying down': 'lying', standing: 'standing' }
    let scoreSum = 0
    for (const d of detections) {
        counts[key[CLASS_NAMES[d.cls]]]++
        scoreSum += d.score
    }
    const total = detections.length
    const pct = (n) => (total ? parseFloat(((n / total) * 100).toFixed(1)) : 0)
    const restBase = counts.lying + counts.standing
    return {
        total,
        counts,
        pct: { drinking: pct(counts.drinking), feeding: pct(counts.feeding), lying: pct(counts.lying), standing: pct(counts.standing) },
        cci: restBase ? parseFloat(((counts.lying / restBase) * 100).toFixed(1)) : null,
        confidence_avg: total ? parseFloat((scoreSum / total).toFixed(3)) : null
    }
}

module.exports = { CLASS_NAMES, iou, decodeDetections, summarize }
