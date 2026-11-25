// ทดสอบ free_collected.js กับ Storage จำลองและโฟลเดอร์ชั่วคราว: node backend_node/scripts/test_free_collected.js
// ลบได้เฉพาะเมื่อทุกไฟล์มีสำเนาตรง (ขนาด md5 JPEG JSON) ทั้งเครื่องและ backup และพิมพ์ยืนยันถูก
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { md5 } = require('./lib/collectedStorage')
const { run } = require('./free_collected')

const FARM = '99999999-9999-4999-8999-999999999999'
const DAY = '2026-12-06'
const jpg = (n) => Buffer.concat([Buffer.from([0xff, 0xd8, n]), Buffer.alloc(50, n), Buffer.from([0xff, 0xd9])])
const json = (n) => Buffer.from(JSON.stringify({ status: 'ok', total: n }))

// Storage จำลอง: 3 ภาพ + 3 json
const remote = new Map()
for (const [i, t] of ['080000', '080015', '080030'].entries()) {
    remote.set(`${t}.jpg`, jpg(i + 1))
    remote.set(`${t}.json`, json(i + 1))
}
const removed = []
const storage = {
    list: async (dir, { offset }) => {
        assert.strictEqual(dir, `collect/${FARM}/${DAY}`)
        if (offset) return { data: [] }
        return { data: [...remote].map(([name, buf]) => ({ name, id: name, metadata: { size: buf.length, eTag: `"${md5(buf)}"` } })) }
    },
    remove: async (paths) => {
        for (const p of paths) { assert.ok(p.startsWith(`collect/${FARM}/${DAY}/`), 'only this farm/day'); removed.push(p); remote.delete(path.basename(p)) }
        return { data: paths.map(name => ({ name })) }
    }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'free-collected-'))
const out = path.join(tmp, 'out'), backup = path.join(tmp, 'backup')
const copyTo = (root, skip = []) => {
    const d = path.join(root, FARM, DAY)
    fs.mkdirSync(d, { recursive: true })
    for (const [name, buf] of remote) if (!skip.includes(name)) fs.writeFileSync(path.join(d, name), buf)
    return d
}
const quiet = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn() } finally { console.log = log } }
const base = { farm: FARM, date: DAY, out }

;(async () => {
    try {
        // ไฟล์หาย 1 ไฟล์: ตรวจเจอ และ --delete ไม่ลบอะไร
        copyTo(out, ['080030.jpg'])
        let r = await quiet(() => run({ ...base, delete: true }, storage, async () => DAY))
        assert.strictEqual(r.deleted, 0); assert.strictEqual(r.problems.length, 1); assert.strictEqual(r.problems[0].name, '080030.jpg')
        assert.strictEqual(removed.length, 0)
        process.exitCode = 0

        // ไฟล์ครบแต่ JPEG เสีย (ขนาดเท่าเดิม) = md5 ไม่ตรง ไม่ลบ
        const d = copyTo(out)
        const bad = Buffer.from(remote.get('080015.jpg')); bad[5] ^= 0xff
        fs.writeFileSync(path.join(d, '080015.jpg'), bad)
        r = await quiet(() => run({ ...base, delete: true }, storage, async () => DAY))
        assert.strictEqual(r.deleted, 0); assert.ok(r.problems[0].reason.includes('md5'))
        process.exitCode = 0
        copyTo(out)

        // ตรวจอย่างเดียว (ไม่มี --delete): ไม่ลบ
        r = await quiet(() => run(base, storage))
        assert.strictEqual(r.deleted, 0); assert.strictEqual(r.problems.length, 0); assert.strictEqual(removed.length, 0)

        // backup ไม่ครบ = ไม่ลบ
        copyTo(backup, ['080000.json'])
        r = await quiet(() => run({ ...base, backup, delete: true }, storage, async () => DAY))
        assert.strictEqual(r.deleted, 0); assert.ok(r.problems[0].reason.includes(path.join(backup, FARM, DAY)))
        process.exitCode = 0
        copyTo(backup)

        // พิมพ์ยืนยันผิด = ยกเลิก
        r = await quiet(() => run({ ...base, backup, delete: true }, storage, async () => 'yes'))
        assert.strictEqual(r.deleted, 0); assert.strictEqual(removed.length, 0)

        // ครบทั้ง 2 ที่ + ยืนยันถูก = ลบทั้ง 6 ไฟล์ของวันนั้น
        r = await quiet(() => run({ ...base, backup, delete: true }, storage, async () => DAY))
        assert.strictEqual(r.deleted, 6); assert.strictEqual(remote.size, 0); assert.strictEqual(removed.length, 6)

        // รันซ้ำหลังลบแล้ว: ไม่มีไฟล์ ไม่พัง
        r = await quiet(() => run({ ...base, delete: true }, storage, async () => DAY))
        assert.strictEqual(r.total, 0)

        // ป้องกันพิมพ์ผิด
        await assert.rejects(run({ farm: 'abc', date: DAY }, storage), /UUID/)
        await assert.rejects(run({ farm: FARM }, storage), /YYYY-MM-DD/)

        console.log('test_free_collected: all passed')
    } catch (err) {
        console.error('FAILED:', err.message); process.exitCode = 1
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true })
    }
})()
