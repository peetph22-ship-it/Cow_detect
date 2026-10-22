/**
 * แบ่งไฟล์โมเดลเป็นส่วนละไม่เกิน 45MB เพื่ออัปโหลดเข้า Supabase Storage แผนฟรี (จำกัด 50MB/ไฟล์)
 * ใช้: node scripts/split_model.js [path ของโมเดล]   (ค่าเริ่มต้น app/weights/yolo26m_480.onnx)
 * แล้วตั้ง YOLO_MODEL_PARTS และ YOLO_MODEL_SHA256 ตามที่สคริปต์พิมพ์ออกมา
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const MAX_PART = 45 * 1024 * 1024
const file = path.resolve(process.argv[2] || path.join(__dirname, '../app/weights/yolo26m_480.onnx'))
const buf = fs.readFileSync(file)
const parts = Math.ceil(buf.length / MAX_PART)
const size = Math.ceil(buf.length / parts)

for (let i = 0; i < parts; i++) {
    const out = `${file}.part${i + 1}`
    fs.writeFileSync(out, buf.subarray(i * size, (i + 1) * size))
    console.log(`${path.basename(out)}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`)
}
console.log(`\nYOLO_MODEL_PARTS=${parts}`)
console.log(`YOLO_MODEL_SHA256=${crypto.createHash('sha256').update(buf).digest('hex')}`)
