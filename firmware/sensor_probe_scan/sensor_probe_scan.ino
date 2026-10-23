/*
 * CowCare AI - ตรวจรุ่นโมดูลเซ็นเซอร์ RS485 (อ่านอย่างเดียว)
 *
 * ถามค่าจาก register ต่างๆ ผ่าน Modbus แล้วพิมพ์ว่าโมดูลตอบอะไร เพื่อเดาตระกูลของโมดูล
 * - ใช้เฉพาะคำสั่งอ่าน (function 03 / 04) ไม่มีคำสั่งเขียน จึงไม่เปลี่ยน address/baud/ค่าชดเชยของโมดูล
 * - บอกชนิดชิปข้างใน (SHT20/SHT30/SHT40) ไม่ได้โดยตรง เพราะมี MCU ของโมดูลคั่นอยู่
 *
 * ใช้: แฟลชไฟล์นี้ชั่วคราว -> เปิด Serial Monitor 115200 -> คัดลอกผลทั้งหมด -> แฟลช cowcare_sensor กลับ
 * ระหว่างนี้กล่องไม่ส่งข้อมูลขึ้นระบบ (ข้อมูลช่วงนี้จะขาด)
 * ขาเดียวกับ cowcare_sensor: RX 18, TX 17 (โมดูล RS485 แบบสลับทิศทางอัตโนมัติ)
 */
#include <Arduino.h>

#define RX_PIN 18
#define TX_PIN 17

const uint32_t BAUDS[] = { 9600, 4800, 19200, 2400 };
uint8_t addr = 1;
uint32_t baud = 0;

uint16_t crc16(const uint8_t* d, size_t n) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < n; i++) {
    crc ^= d[i];
    for (int b = 0; b < 8; b++) crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : (crc >> 1);
  }
  return crc;
}

// ส่งคำขออ่าน แล้วรับคำตอบจนเงียบ 30 ms คืนจำนวน byte (0 = ไม่ตอบ)
int query(uint8_t fn, uint16_t reg, uint16_t count, uint8_t* out, int maxLen) {
  uint8_t req[8] = { addr, fn, (uint8_t)(reg >> 8), (uint8_t)reg, (uint8_t)(count >> 8), (uint8_t)count, 0, 0 };
  uint16_t c = crc16(req, 6);
  req[6] = c & 0xFF;
  req[7] = c >> 8;
  while (Serial1.available()) Serial1.read();
  Serial1.write(req, 8);
  Serial1.flush();
  int n = 0;
  unsigned long start = millis(), last = 0;
  while (millis() - start < 400) {
    while (Serial1.available() && n < maxLen) { out[n++] = Serial1.read(); last = millis(); }
    if (n > 0 && millis() - last > 30) break;
  }
  return n;
}

bool validFrame(const uint8_t* r, int n) {
  if (n < 5) return false;
  uint16_t got = (r[n - 1] << 8) | r[n - 2];
  return crc16(r, n - 2) == got && r[0] == addr;
}

// อ่านทีละ register คืน: 1 = ได้ค่า, 0 = ไม่ตอบ/เสีย, -N = exception code N
int readOne(uint8_t fn, uint16_t reg, uint16_t& value) {
  uint8_t r[32];
  int n = query(fn, reg, 1, r, sizeof(r));
  if (!validFrame(r, n)) return 0;
  if (r[1] == (fn | 0x80)) return -(int)r[2];
  if (r[1] != fn || r[2] != 2) return 0;
  value = (r[3] << 8) | r[4];
  return 1;
}

const char* exText(int code) {
  switch (code) {
    case 1: return "illegal function";
    case 2: return "illegal address (ไม่มี register นี้)";
    case 3: return "illegal value";
    default: return "exception";
  }
}

// เก็บค่าที่ตอบได้ไว้ใช้สรุปท้าย
struct Hit { uint8_t fn; uint16_t reg; uint16_t val; };
Hit hits[96];
int hitCount = 0;

void scanRange(uint8_t fn, uint16_t from, uint16_t to) {
  Serial.printf("\n-- function %02X, register 0x%04X-0x%04X --\n", fn, from, to);
  int silent = 0;
  for (uint16_t reg = from; reg <= to; reg++) {
    uint16_t v = 0;
    int r = readOne(fn, reg, v);
    if (r == 1) {
      Serial.printf("  0x%04X = %5u  (0x%04X, signed %d)\n", reg, v, v, (int16_t)v);
      if (hitCount < 96) hits[hitCount++] = { fn, reg, v };
      silent = 0;
    } else if (r < 0) {
      Serial.printf("  0x%04X : %s\n", reg, exText(-r));
      silent = 0;
    } else {
      Serial.printf("  0x%04X : ไม่ตอบ\n", reg);
      if (++silent >= 4) { Serial.println("  (ไม่ตอบติดกัน หยุดช่วงนี้)"); break; }
    }
    delay(60);
  }
}

bool has(uint8_t fn, uint16_t reg, uint16_t* out = nullptr) {
  for (int i = 0; i < hitCount; i++) if (hits[i].fn == fn && hits[i].reg == reg) { if (out) *out = hits[i].val; return true; }
  return false;
}

void setup() {
  Serial.begin(115200);
  unsigned long t0 = millis();
  while (!Serial && millis() - t0 < 6000) delay(10);
  delay(500);
  Serial.println("\n===== CowCare: ตรวจโมดูลเซ็นเซอร์ RS485 (อ่านอย่างเดียว) =====");

  // 1. หา baud ที่โมดูลตอบ (ถามค่าอุณหภูมิ/ความชื้นแบบเดียวกับ firmware หลัก)
  for (uint32_t b : BAUDS) {
    Serial1.begin(b, SERIAL_8N1, RX_PIN, TX_PIN);
    delay(50);
    uint8_t r[32];
    int n = query(0x04, 0x0001, 2, r, sizeof(r));
    if (validFrame(r, n) && r[1] == 0x04) {
      baud = b;
      Serial.printf("พบโมดูลที่ address %u, baud %lu\n", addr, (unsigned long)b);
      Serial.printf("อุณหภูมิดิบ %d (= %.1f C), ความชื้นดิบ %u (= %.1f %%)\n",
                    (int16_t)((r[3] << 8) | r[4]), (int16_t)((r[3] << 8) | r[4]) / 10.0,
                    (r[5] << 8) | r[6], ((r[5] << 8) | r[6]) / 10.0);
      break;
    }
    Serial1.end();
  }
  if (!baud) {
    Serial.println("ไม่พบโมดูลที่ address 1 (ลอง 9600/4800/19200/2400 แล้ว) ตรวจสาย A/B และไฟเลี้ยงเซ็นเซอร์");
    return;
  }

  // 2. สแกน register ช่วงที่ผู้ผลิตโมดูลนิยมใช้
  scanRange(0x04, 0x0000, 0x000F);  // input: ค่าวัด
  scanRange(0x03, 0x0000, 0x000F);  // holding: บางรุ่นเก็บค่าวัด/รุ่นไว้ที่นี่
  scanRange(0x03, 0x0100, 0x010F);  // holding: XY-MD02 = address, baud, ค่าชดเชย
  scanRange(0x03, 0x07D0, 0x07D7);  // holding: transmitter บางยี่ห้อ (address/baud ที่ 2000)

  // 3. สรุป
  Serial.println("\n===== สรุป =====");
  uint16_t a = 0, br = 0, tc = 0, hc = 0;
  bool xy = has(0x03, 0x0101, &a) && has(0x03, 0x0102, &br) && a == addr;
  if (xy) {
    has(0x03, 0x0103, &tc);
    has(0x03, 0x0104, &hc);
    Serial.println("รูปแบบ register ตรงกับโมดูลตระกูล XY-MD02 (ส่วนใหญ่ใช้ชิป SHT20 ข้างใน)");
    Serial.printf("  0x0101 address = %u, 0x0102 baud code = %u, 0x0103 ค่าชดเชยอุณหภูมิ = %d, 0x0104 ค่าชดเชยความชื้น = %d\n",
                  a, br, (int16_t)tc, (int16_t)hc);
  } else if (has(0x03, 0x07D0, &a) && a == addr) {
    Serial.println("มี address ที่ register 0x07D0: รูปแบบ transmitter อุตสาหกรรมทั่วไป (ต้องดูรุ่นจากฉลาก)");
  } else {
    Serial.println("ไม่ตรงกับรูปแบบที่รู้จัก ส่งผลทั้งหมดนี้ให้ตรวจต่อ");
  }
  Serial.println("หมายเหตุ: ผลนี้บอกตระกูลโมดูล ยืนยันชิปข้างในต้องดูฉลาก/ขนาดชิป");

  // 4. ค่าดิบ 10 ครั้ง (ไม่ผ่านตัวกรอง) ดูความละเอียดและความนิ่ง
  Serial.println("\n-- ค่าดิบ 10 ครั้ง ห่างกัน 2 วินาที --");
  for (int i = 0; i < 10; i++) {
    uint8_t r[32];
    int n = query(0x04, 0x0001, 2, r, sizeof(r));
    if (validFrame(r, n) && r[1] == 0x04) {
      Serial.printf("  %2d: %.1f C  %.1f %%\n", i + 1, (int16_t)((r[3] << 8) | r[4]) / 10.0, ((r[5] << 8) | r[6]) / 10.0);
    } else {
      Serial.printf("  %2d: อ่านไม่ได้\n", i + 1);
    }
    delay(2000);
  }
  Serial.println("\n===== จบ: คัดลอกข้อความทั้งหมดนี้ แล้วแฟลช cowcare_sensor กลับ =====");
}

void loop() {}
