/**
 * Worker thread สำหรับ YOLO: แยกจาก thread หลักของ API
 * onnxruntime-node รันบน thread ที่เรียก ถ้ารันบน thread หลัก API จะค้างทั้งหมดระหว่าง inference
 * (วัดแล้วบน CPU 0.1: ค้าง ~24 วินาที, แยก worker แล้ว API ตอบ ~0.1 วินาที)
 */
const { parentPort, workerData } = require('worker_threads')
const ort = require('onnxruntime-node')
const sharp = require('sharp')
const { DETECT_OPTS, decodeDetections, summarize, toImageBoxes } = require('./visionPostprocess')

const IMG = workerData.imgsz || 480

// ภาพ letterbox แบบเดียวกับ Ultralytics: ย่อคงสัดส่วน วางกลาง เติมสีเทา 114
// คืนขนาดภาพจริง (หลังหมุนตาม EXIF) ไว้แปลงพิกัดกรอบกลับ
const preprocess = async (jpeg) => {
    const meta = await sharp(jpeg).metadata()
    const swap = (meta.orientation || 1) >= 5
    const width = swap ? meta.height : meta.width
    const height = swap ? meta.width : meta.height
    const { data, info } = await sharp(jpeg)
        .rotate()  // หมุนตาม EXIF
        .resize(IMG, IMG, { fit: 'contain', background: { r: 114, g: 114, b: 114 }, kernel: 'linear' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
    if (info.channels !== 3) throw new Error(`unexpected channels ${info.channels}`)
    const plane = IMG * IMG
    const chw = new Float32Array(3 * plane)
    for (let i = 0; i < plane; i++) {  // HWC uint8 RGB -> CHW float [0,1]
        chw[i] = data[i * 3] / 255
        chw[plane + i] = data[i * 3 + 1] / 255
        chw[2 * plane + i] = data[i * 3 + 2] / 255
    }
    return { chw, width, height }
}

;(async () => {
    let session
    try {
        session = await ort.InferenceSession.create(workerData.modelPath, {
            intraOpNumThreads: 1,
            enableCpuMemArena: false,   // ลด RAM สูงสุด ~57MB โดยความเร็วเท่าเดิม (วัดแล้ว)
            enableMemPattern: false
        })
        parentPort.postMessage({ type: 'ready' })
    } catch (err) {
        parentPort.postMessage({ type: 'fatal', error: err.message })
        return
    }

    parentPort.on('message', async ({ id, jpeg }) => {
        const t0 = Date.now()
        try {
            const { chw, width, height } = await preprocess(Buffer.from(jpeg))
            const t1 = Date.now()
            const out = await session.run({ images: new ort.Tensor('float32', chw, [1, 3, IMG, IMG]) })
            const t2 = Date.now()
            const o = out.output0
            const opts = { ...DETECT_OPTS, ...(workerData.thresholds || {}) }
            const detections = decodeDetections(o.data, o.dims, opts)
            parentPort.postMessage({
                type: 'result',
                id,
                result: {
                    ...summarize(detections),
                    detections,
                    boxes: toImageBoxes(detections, width, height, IMG),
                    image: { width, height },
                    detect_opts: opts,
                    timing_ms: { preprocess: t1 - t0, inference: t2 - t1, total: Date.now() - t0 }
                }
            })
        } catch (err) {
            parentPort.postMessage({ type: 'error', id, error: err.message })
        }
    })
})()
