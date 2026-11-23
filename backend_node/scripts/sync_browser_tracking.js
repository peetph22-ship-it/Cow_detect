#!/usr/bin/env node
/**
 * สร้าง frontend/app/utils/cowTracking.js จาก backend_node/app/services/cowTracking.js (โค้ดเดียวกันทุกบรรทัด)
 * หน้า simulator ติดตามวัวบนวิดีโอด้วยวิธีเดียวกับ server โดยไม่ต้องดูแลโค้ด 2 ชุด
 *
 *   node backend_node/scripts/sync_browser_tracking.js          เขียนไฟล์ใหม่ (รันทุกครั้งที่แก้ cowTracking.js)
 *   node backend_node/scripts/sync_browser_tracking.js --check  ตรวจว่าไฟล์ในฝั่งเว็บตรงกับ server (ใช้ในเทสต์)
 *
 * แปลงแค่ 2 จุด: require iou -> ฝังฟังก์ชัน iou จาก visionPostprocess.js, module.exports -> export
 */
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../app/services/cowTracking.js')
const IOU_SRC = path.resolve(__dirname, '../app/services/visionPostprocess.js')
const OUT = path.resolve(__dirname, '../../frontend/app/utils/cowTracking.js')

const build = () => {
    const src = fs.readFileSync(SRC, 'utf8')
    const iouSrc = fs.readFileSync(IOU_SRC, 'utf8')
    const iouFn = iouSrc.match(/const iou = \(a, b\) => \{[\s\S]*?\n\}\n/)
    if (!iouFn) throw new Error('หาฟังก์ชัน iou ใน visionPostprocess.js ไม่เจอ')
    const requireLine = "const { iou } = require('./visionPostprocess')\n"
    if (!src.includes(requireLine)) throw new Error('รูปแบบ require ใน cowTracking.js เปลี่ยน ต้องแก้สคริปต์นี้')
    const exp = src.match(/module\.exports = \{([\s\S]*?)\}\s*$/)
    if (!exp) throw new Error('หา module.exports ใน cowTracking.js ไม่เจอ')
    const body = src
        .replace(requireLine, `// iou จาก backend_node/app/services/visionPostprocess.js\n${iouFn[0]}`)
        .replace(exp[0], `export {${exp[1]}}\n`)
    return '// สร้างอัตโนมัติจาก backend_node/app/services/cowTracking.js ห้ามแก้ไฟล์นี้โดยตรง\n'
        + '// แก้ที่ server แล้วรัน: node backend_node/scripts/sync_browser_tracking.js\n'
        + body
}

if (require.main === module) {
    const out = build()
    if (process.argv.includes('--check')) {
        const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''
        if (cur !== out) { console.error('frontend/app/utils/cowTracking.js ไม่ตรงกับ server: รัน node backend_node/scripts/sync_browser_tracking.js'); process.exit(1) }
        console.log('browser tracking code in sync')
    } else {
        fs.writeFileSync(OUT, out)
        console.log('wrote', path.relative(process.cwd(), OUT))
    }
}

module.exports = { build, OUT }
