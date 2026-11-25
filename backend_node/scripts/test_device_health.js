// ทดสอบ sanitizeHeartbeat: field ใหม่ของ firmware 1.6.0 (SHT40 + watchdog) ผ่าน และค่าแปลกถูกกรอง
const assert = require('assert')
const { sanitizeHeartbeat } = require('../app/services/deviceHealth')

const hb = sanitizeHeartbeat({
    fw_version: '1.6.0', sensor_model: 'sht40', sensor_serial: '0a1b2c3d', i2c_recoveries: 2,
    last_server_ok_s: 14, camera_last_round_s: -1, reset_reason: 'watchdog', rssi: -67
})
assert.strictEqual(hb.fw_version, '1.6.0')
assert.strictEqual(hb.sensor_model, 'sht40')
assert.strictEqual(hb.sensor_serial, '0a1b2c3d')
assert.strictEqual(hb.i2c_recoveries, 2)
assert.strictEqual(hb.last_server_ok_s, 14)
assert.strictEqual(hb.camera_last_round_s, -1)
assert.strictEqual(hb.reset_reason, 'watchdog')

// firmware เก่า (1.5.0) ไม่มี field ใหม่ = null ไม่พัง
const old = sanitizeHeartbeat({ fw_version: '1.5.0' })
assert.strictEqual(old.sensor_model, null)
assert.strictEqual(old.i2c_recoveries, null)

// ค่าแปลก: ตัดอักขระพิเศษ จำกัดช่วงตัวเลข ไม่รับ field ที่ไม่รู้จัก
const odd = sanitizeHeartbeat({ sensor_model: '<script>sht40', i2c_recoveries: 1e12, last_server_ok_s: -50, extra: 'x' })
assert.strictEqual(odd.sensor_model, 'scriptsht40')
assert.strictEqual(odd.i2c_recoveries, 1e7)
assert.strictEqual(odd.last_server_ok_s, -1)
assert.ok(!('extra' in odd))

console.log('test_device_health: all passed')
