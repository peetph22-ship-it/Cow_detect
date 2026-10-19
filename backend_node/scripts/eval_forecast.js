/**
 * Run the deployed farm_lstm.onnx on samples written by backend/ml_lstm/eval_baselines.py
 * and compare with and without camera behaviour features (no camera = 45/55/85 placeholders
 * that the old inference code used).
 *
 * Usage: node backend_node/scripts/eval_forecast.js <DIR_WITH_BINS>
 */
const fs = require('fs')
const path = require('path')
const ort = require('onnxruntime-node')

const dir = process.argv[2]
if (!dir) {
    console.error('Usage: node scripts/eval_forecast.js <DIR_WITH_BINS>')
    process.exit(1)
}

const read = (f) => {
    const b = fs.readFileSync(path.join(dir, f))
    return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length))
}
const X = read('X.bin')
const S = read('S.bin')
const Y = read('Y.bin')
const N = Y.length / 3

// เกณฑ์เดียวกับตอนเทรน (synthetic_pretrain.classify_thai_risk)
const cls = t => (t < 76 ? 0 : t < 80 ? 1 : t < 84 ? 2 : 3)

;(async () => {
    const session = await ort.InferenceSession.create(path.resolve(__dirname, '../app/weights/farm_lstm.onnx'))
    console.log(`Samples: n=${N}`)
    for (const [name, noCam] of [['Bi-LSTM ONNX (deployed)', false], ['Bi-LSTM, no camera (45/55/85)', true]]) {
        const x = Float32Array.from(X)
        if (noCam) {
            for (let i = 0; i < N * 72; i++) {
                x[i * 11 + 8] = 45
                x[i * 11 + 9] = 55
                x[i * 11 + 10] = 85
            }
        }
        const out = await session.run({
            x_temporal: new ort.Tensor('float32', x, [N, 72, 11]),
            x_static: new ort.Tensor('float32', S, [N, 3])
        })
        const p = out.predicted_thi.data
        const mae = [0, 0, 0]
        const acc = [0, 0, 0]
        let bias = 0
        for (let i = 0; i < N; i++) {
            for (let d = 0; d < 3; d++) {
                const k = i * 3 + d
                mae[d] += Math.abs(p[k] - Y[k]) / N
                acc[d] += (cls(p[k]) === cls(Y[k]) ? 100 : 0) / N
                bias += (p[k] - Y[k]) / (N * 3)
            }
        }
        console.log(`${name.padEnd(34)} MAE d1/d2/d3 = ${mae.map(v => v.toFixed(2)).join('/')} | risk acc = ${acc.map(v => v.toFixed(1)).join('/')}% | bias = ${bias.toFixed(2)}`)
    }
})()
