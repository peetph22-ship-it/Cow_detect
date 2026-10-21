/*
 * CowCare AI - ESP32-S3 Barn Sensor (SHT40 RS485 Modbus + ST7789 display)
 *
 * Store-and-forward:
 *  - ทุกค่าประทับเวลาจริง (Unix epoch UTC จาก NTP)
 *  - ส่งไม่สำเร็จ -> เก็บลงคิวใน flash (LittleFS) ไฟดับไม่หาย แล้วทยอยส่งเป็นชุดเมื่อเน็ตกลับมา
 *  - ก่อนซิงก์เวลาได้ เก็บค่าไว้ใน RAM พร้อม millis() แล้วคำนวณเวลาย้อนหลังเมื่อซิงก์สำเร็จ
 *
 * THI: NRC (1971) เกณฑ์ค่าเริ่มต้นโคนมลูกผสมไทย 74 / 76 / 82 (ตรงกับ backend heatStress.js)
 *
 * ⚠️ Arduino IDE: Tools > Partition Scheme ต้องเลือกแบบที่มีพื้นที่ไฟล์ (SPIFFS/LittleFS/FATFS)
 *    เช่น "16M Flash (3MB APP/9.9MB FATFS)" (firmware ลองทั้งพื้นที่ชื่อ spiffs และ ffat)
 * ⚠️ คัดลอก secrets.h.example เป็น secrets.h แล้วใส่ค่าจริงก่อนคอมไพล์
 */

#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <time.h>
#include <math.h>
#include "secrets.h"

// ==========================================
// 1. ตั้งค่า
// ==========================================
const char* WIFI_SSID     = WIFI_SSID_VAL;
const char* WIFI_PASSWORD = WIFI_PASSWORD_VAL;
const char* DEVICE_SERIAL = DEVICE_SERIAL_VAL;
const char* DEVICE_KEY    = DEVICE_KEY_VAL;
const char* SERVER_BASE   = SERVER_BASE_VAL;

const unsigned long readInterval   = 2000;   // อ่านเซ็นเซอร์ทุก 2 วินาที
const unsigned long sampleInterval = 15000;  // บันทึก/ส่งทุก 15 วินาที

// เวลา: กองทัพเรือ (มาตรฐานเวลาไทย) เป็นหลัก, pool.ntp.org สำรอง
const char* NTP_PRIMARY   = "time.navy.mi.th";
const char* NTP_SECONDARY = "pool.ntp.org";
const time_t MIN_VALID_EPOCH = 1700000000;   // ก่อนหน้านี้ถือว่ายังไม่ได้ซิงก์
const unsigned long NTP_RESYNC_MS = 6UL * 3600UL * 1000UL;

// คิว
const char* Q_FILE = "/q.bin";
const char* Q_HEAD = "/q.head";
const uint32_t Q_MAX_BYTES  = 2UL * 1024UL * 1024UL;  // ~3 สัปดาห์ (8 bytes/ค่า, ทุก 15 วิ)
const uint32_t Q_COMPACT_AT = 512UL * 1024UL;
const int BATCH_MAX = 100;                   // ต้องไม่เกิน MAX_BATCH ฝั่ง backend
const int BATCHES_PER_TICK = 3;              // ระบายคิวได้เร็วขึ้นหลังเน็ตกลับมา
const int PENDING_MAX = 240;                 // ค่าก่อนซิงก์เวลา (RAM) ~1 ชม.

// เกณฑ์ THI (ค่าเริ่มต้นโคนมลูกผสมไทย) - ต้องตรงกับ backend_node/app/services/heatStress.js
const float THI_MILD = 74.0f;
const float THI_MODERATE = 76.0f;
const float THI_SEVERE = 82.0f;

// --- ขาจอ TFT ST7789 (SPI) ---
#define TFT_CS    40
#define TFT_DC    42
#define TFT_RST   41
#define TFT_MOSI  2
#define TFT_SCLK  1
Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCLK, TFT_RST);

// --- ขาเซ็นเซอร์ RS485 ---
#define RX_PIN 18
#define TX_PIN 17

// ==========================================
// 2. สี RGB565
// ==========================================
#define C_BLACK       0x0000
#define C_BG_DARK     0x0861
#define C_CARD_BG     0x10A2
#define C_CARD_INNER  0x18E3
#define C_BORDER      0x3186
#define C_TEXT_MUTED  0x8410
#define C_WHITE       0xFFFF
#define C_CYAN        0x07FF
#define C_GREEN       0x2668
#define C_YELLOW      0xFFE0
#define C_ORANGE      0xFD20
#define C_RED         0xF800

// ==========================================
// 3. สถานะ
// ==========================================
float currentTemp = 0.0;
float currentHum  = 0.0;
float currentThi  = 0.0;

float prevTemp = -999.0;
float prevHum  = -999.0;
float prevThi  = -999.0;
bool  prevReadOk  = false;
bool  firstFilter = true;
bool  lastReadOk  = false;
int   lastHttpCode = 0;
bool  fsOk = false;

unsigned long lastReadTime   = 0;
unsigned long lastSampleTime = 0;
unsigned long lastNtpSync    = 0;
unsigned long lastReconnect  = 0;
unsigned long nextSendAllowed = 0;
unsigned long backoffMs = 0;

// ค่าแบบอัดขนาด 8 bytes (เก็บในคิว)
struct __attribute__((packed)) QRec {
  uint32_t epoch;
  int16_t  t100;   // อุณหภูมิ x100
  uint16_t h100;   // ความชื้น x100
};

struct PendRec {
  uint32_t ms;
  int16_t  t100;
  uint16_t h100;
};
PendRec pending[PENDING_MAX];
int pendingCount = 0;

uint32_t qHead = 0;

// -----------------------------------------------------
// CRC16 Modbus RTU
// -----------------------------------------------------
uint16_t crc16(const uint8_t *d, size_t n) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < n; i++) {
    crc ^= d[i];
    for (int b = 0; b < 8; b++) {
      crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : (crc >> 1);
    }
  }
  return crc;
}

// -----------------------------------------------------
// THI (NRC 1971) และระดับความเสี่ยง
// -----------------------------------------------------
float calcThi(float t, float rh) {
  return (1.8f * t + 32.0f) - (0.55f - 0.0055f * rh) * (1.8f * t - 26.0f);
}

int riskLevel(float thi) {  // 0 ปกติ, 1 เฝ้าระวัง, 2 เครียด, 3 วิกฤต
  if (thi >= THI_SEVERE) return 3;
  if (thi >= THI_MODERATE) return 2;
  if (thi >= THI_MILD) return 1;
  return 0;
}

// -----------------------------------------------------
// เวลา
// -----------------------------------------------------
bool timeSynced() {
  return time(nullptr) > MIN_VALID_EPOCH;
}

void startNtp() {
  configTime(0, 0, NTP_PRIMARY, NTP_SECONDARY);  // UTC, แสดงผลเป็นเวลาไทยที่เว็บ
  lastNtpSync = millis();
}

// -----------------------------------------------------
// คิวใน LittleFS
// -----------------------------------------------------
uint32_t qFileSize() {
  if (!LittleFS.exists(Q_FILE)) return 0;
  File f = LittleFS.open(Q_FILE, FILE_READ);
  uint32_t s = f ? f.size() : 0;
  if (f) f.close();
  return s;
}

void qSaveHead() {
  File f = LittleFS.open(Q_HEAD, FILE_WRITE);
  if (f) { f.write((uint8_t*)&qHead, sizeof(qHead)); f.close(); }
}

void qLoadHead() {
  qHead = 0;
  if (LittleFS.exists(Q_HEAD)) {
    File f = LittleFS.open(Q_HEAD, FILE_READ);
    if (f && f.size() == sizeof(qHead)) f.read((uint8_t*)&qHead, sizeof(qHead));
    if (f) f.close();
  }
  uint32_t size = qFileSize();
  if (qHead > size || (qHead % sizeof(QRec)) != 0) qHead = 0;
}

uint32_t qCount() {
  if (!fsOk) return 0;
  uint32_t size = qFileSize();
  return size > qHead ? (size - qHead) / sizeof(QRec) : 0;
}

void qClear() {
  LittleFS.remove(Q_FILE);
  LittleFS.remove(Q_HEAD);
  qHead = 0;
}

// ย้ายค่าที่ยังไม่ส่งไปไฟล์ใหม่ เพื่อไม่ให้ไฟล์โตเรื่อยๆ
void qCompact() {
  File src = LittleFS.open(Q_FILE, FILE_READ);
  File dst = LittleFS.open("/q.tmp", FILE_WRITE);
  if (!src || !dst) { if (src) src.close(); if (dst) dst.close(); return; }
  src.seek(qHead);
  uint8_t buf[256];
  while (src.available()) {
    size_t n = src.read(buf, sizeof(buf));
    dst.write(buf, n);
  }
  src.close();
  dst.close();
  LittleFS.remove(Q_FILE);
  LittleFS.rename("/q.tmp", Q_FILE);
  qHead = 0;
  qSaveHead();
}

void qAppend(const QRec& r) {
  if (!fsOk) return;
  File f = LittleFS.open(Q_FILE, FILE_APPEND);
  if (!f) return;
  f.write((const uint8_t*)&r, sizeof(r));
  f.close();
  // เต็ม -> ทิ้งค่าที่เก่าที่สุด
  uint32_t size = qFileSize();
  if (size - qHead > Q_MAX_BYTES) {
    uint32_t excess = (size - qHead) - Q_MAX_BYTES;
    excess = ((excess + sizeof(QRec) - 1) / sizeof(QRec)) * sizeof(QRec);
    qHead += excess;
    qSaveHead();
  }
  if (qHead > Q_COMPACT_AT) qCompact();
}

int qPeek(QRec* out, int maxN) {
  File f = LittleFS.open(Q_FILE, FILE_READ);
  if (!f) return 0;
  f.seek(qHead);
  int n = f.read((uint8_t*)out, sizeof(QRec) * maxN) / sizeof(QRec);
  f.close();
  return n;
}

void qPop(int n) {
  qHead += n * sizeof(QRec);
  if (qHead >= qFileSize()) qClear();
  else qSaveHead();
}

// ค่าที่วัดก่อนซิงก์เวลา: แปลงเป็นเวลาจริงย้อนหลังแล้วย้ายเข้าคิว
void flushPending() {
  if (pendingCount == 0 || !timeSynced()) return;
  time_t now = time(nullptr);
  unsigned long nowMs = millis();
  for (int i = 0; i < pendingCount; i++) {
    QRec r;
    r.epoch = (uint32_t)(now - (time_t)((nowMs - pending[i].ms) / 1000UL));
    r.t100 = pending[i].t100;
    r.h100 = pending[i].h100;
    qAppend(r);
  }
  Serial.printf("[TIME] moved %d pre-sync readings to queue\n", pendingCount);
  pendingCount = 0;
}

void pendingPush(int16_t t100, uint16_t h100) {
  if (pendingCount >= PENDING_MAX) {  // ทิ้งค่าเก่าสุด
    memmove(&pending[0], &pending[1], sizeof(PendRec) * (PENDING_MAX - 1));
    pendingCount = PENDING_MAX - 1;
  }
  pending[pendingCount++] = { millis(), t100, h100 };
}

// -----------------------------------------------------
// HTTP
// -----------------------------------------------------
int httpPost(const String& path, const String& body, String& response, uint16_t timeoutMs) {
  WiFiClientSecure client;
  client.setInsecure();  // TODO ก่อนใช้งานจริง: ฝัง Root CA ของ server แทน
  HTTPClient http;
  http.begin(client, String(SERVER_BASE) + path);
  http.setTimeout(timeoutMs);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int code = http.POST(body);
  if (code > 0) response = http.getString();
  http.end();
  lastHttpCode = code;
  return code;
}

String recJson(const QRec& r) {
  char buf[96];
  snprintf(buf, sizeof(buf), "{\"recorded_at\":%lu,\"temperature_c\":%.2f,\"humidity_pct\":%.2f}",
           (unsigned long)r.epoch, r.t100 / 100.0f, r.h100 / 100.0f);
  return String(buf);
}

// true = server รับแล้ว หรือข้อมูลผิดถาวร (ไม่ต้องส่งซ้ำ)
bool sendSingle(const QRec& r) {
  String body = String("{\"serial_no\":\"") + DEVICE_SERIAL + "\"," + recJson(r).substring(1);
  String resp;
  int code = httpPost("/data", body, resp, 8000);
  Serial.printf("[CLOUD] single %d\n", code);
  if (code == 200) return true;
  if (code == 400) { Serial.println("[CLOUD] rejected as invalid: " + resp); return true; }
  return false;  // 401/5xx/timeout -> เก็บไว้ส่งใหม่
}

// คืนจำนวนค่าที่ลบออกจากคิวได้ หรือ -1 ถ้าต้องลองใหม่
int sendBatch() {
  static QRec buf[BATCH_MAX];
  int n = qPeek(buf, BATCH_MAX);
  if (n <= 0) return 0;
  String body;
  body.reserve(32 + n * 80);
  body = String("{\"serial_no\":\"") + DEVICE_SERIAL + "\",\"readings\":[";
  for (int i = 0; i < n; i++) {
    if (i) body += ",";
    body += recJson(buf[i]);
  }
  body += "]}";

  String resp;
  int code = httpPost("/batch", body, resp, 15000);
  Serial.printf("[CLOUD] batch n=%d -> %d\n", n, code);
  if (code == 200) {
    int idx = resp.indexOf("\"processed\":");
    int processed = idx >= 0 ? resp.substring(idx + 12).toInt() : n;
    if (processed <= 0 || processed > n) processed = n;
    return processed;
  }
  if (code == 400 || code == 413) {
    Serial.println("[CLOUD] batch rejected, dropping: " + resp);
    return n;
  }
  return -1;
}

void onSendFailure() {
  backoffMs = backoffMs == 0 ? 15000UL : min(backoffMs * 4UL, 300000UL);  // 15s -> 60s -> 5m
  nextSendAllowed = millis() + backoffMs;
}

void onSendSuccess() {
  backoffMs = 0;
  nextSendAllowed = 0;
}

bool canSendNow() {
  return WiFi.status() == WL_CONNECTED && timeSynced() && (long)(millis() - nextSendAllowed) >= 0;
}

// -----------------------------------------------------
// รอบละ 15 วินาที: บันทึกค่าปัจจุบัน แล้วส่ง/ระบายคิว
// -----------------------------------------------------
void handleSample() {
  int16_t t100 = (int16_t)lroundf(currentTemp * 100.0f);
  uint16_t h100 = (uint16_t)lroundf(currentHum * 100.0f);

  if (!timeSynced()) {
    pendingPush(t100, h100);
    return;
  }
  flushPending();

  QRec r = { (uint32_t)time(nullptr), t100, h100 };
  bool queued = false;
  if (qCount() > 0 || !canSendNow() || !fsOk) {
    if (fsOk) { qAppend(r); queued = true; }
  }
  if (!queued && canSendNow()) {
    if (sendSingle(r)) onSendSuccess();
    else { qAppend(r); onSendFailure(); }
  }

  for (int i = 0; i < BATCHES_PER_TICK && qCount() > 0 && canSendNow(); i++) {
    int done = sendBatch();
    if (done < 0) { onSendFailure(); break; }
    qPop(done);
    onSendSuccess();
  }
}

// -----------------------------------------------------
// จอ
// -----------------------------------------------------
void drawBaseUI() {
  tft.fillScreen(C_BG_DARK);
  tft.fillRoundRect(4, 3, 312, 24, 4, C_CARD_INNER);
  tft.drawRoundRect(4, 3, 312, 24, 4, C_BORDER);
  tft.fillCircle(14, 15, 4, C_CYAN);
  tft.setTextSize(1);
  tft.setTextColor(C_WHITE);
  tft.setCursor(24, 11);
  tft.print("COWCARE AI");
  tft.setTextColor(C_TEXT_MUTED);
  tft.setCursor(90, 11);
  tft.print("| BARN MONITOR");

  tft.fillRoundRect(4, 31, 154, 96, 6, C_CARD_BG);
  tft.drawRoundRect(4, 31, 154, 96, 6, C_BORDER);
  tft.setTextColor(C_TEXT_MUTED);
  tft.setCursor(12, 39);
  tft.print("TEMPERATURE");
  tft.drawFastHLine(12, 52, 138, C_BORDER);

  tft.fillRoundRect(162, 31, 154, 96, 6, C_CARD_BG);
  tft.drawRoundRect(162, 31, 154, 96, 6, C_BORDER);
  tft.setCursor(170, 39);
  tft.print("HUMIDITY");
  tft.drawFastHLine(170, 52, 138, C_BORDER);

  tft.fillRoundRect(4, 131, 312, 105, 6, C_CARD_BG);
  tft.drawRoundRect(4, 131, 312, 105, 6, C_BORDER);
  tft.setCursor(12, 139);
  tft.print("HEAT STRESS INDEX (THI)");
  tft.drawFastHLine(12, 152, 296, C_BORDER);
  tft.drawFastVLine(124, 156, 74, C_BORDER);
  tft.drawRoundRect(132, 214, 174, 12, 3, C_BORDER);
}

void updateHeaderStatus() {
  tft.fillRect(176, 5, 136, 20, C_CARD_INNER);
  tft.setTextSize(1);

  uint32_t q = qCount() + pendingCount;
  if (q > 0) {  // จำนวนค่าที่รอส่ง
    tft.setTextColor(C_YELLOW);
    tft.setCursor(178, 11);
    tft.print("Q:");
    tft.print(q);
  }

  uint16_t color;
  const char* text;
  if (WiFi.status() != WL_CONNECTED) { color = C_RED; text = "WIFI OFFLINE"; }
  else if (!timeSynced())            { color = C_YELLOW; text = "TIME SYNC..."; }
  else if (lastHttpCode == 200)      { color = C_GREEN; text = "CLOUD OK"; }
  else if (lastHttpCode > 0)         { color = C_YELLOW; text = "HTTP ERR"; }
  else if (lastHttpCode < 0)         { color = C_YELLOW; text = "NO SERVER"; }
  else                               { color = C_CYAN; text = "WIFI ONLINE"; }
  tft.fillCircle(232, 15, 3, color);
  tft.setTextColor(color);
  tft.setCursor(240, 11);
  tft.print(text);
}

void updateDashboard(bool success) {
  updateHeaderStatus();

  if (!success) {
    if (prevReadOk || prevTemp == -999.0) {
      tft.fillRect(10, 55, 142, 68, C_CARD_BG);
      tft.fillRect(168, 55, 142, 68, C_CARD_BG);
      tft.fillRect(10, 155, 110, 76, C_CARD_BG);
      tft.fillRect(130, 155, 180, 76, C_CARD_BG);
      tft.setTextColor(C_RED);
      tft.setTextSize(2);
      tft.setCursor(28, 78);
      tft.print("NO DATA");
      tft.setCursor(186, 78);
      tft.print("NO DATA");
      tft.setCursor(142, 182);
      tft.print("CHECK SENSOR");
      prevReadOk = false;
    }
    return;
  }

  currentThi = calcThi(currentTemp, currentHum);

  bool needRedraw = (!prevReadOk) ||
                    (fabs(currentTemp - prevTemp) >= 0.1f) ||
                    (fabs(currentHum - prevHum) >= 0.1f) ||
                    (fabs(currentThi - prevThi) >= 0.1f);
  if (!needRedraw) return;

  prevReadOk = true;
  prevTemp = currentTemp;
  prevHum = currentHum;
  prevThi = currentThi;

  // --- อุณหภูมิ ---
  tft.fillRect(92, 35, 60, 15, C_CARD_BG);
  tft.fillRect(10, 56, 142, 66, C_CARD_BG);
  uint16_t tempColor = C_WHITE;
  const char* tempTag = "COMFORT";
  uint16_t tempTagColor = C_GREEN;
  if (currentTemp >= 33.0f)      { tempColor = C_RED;    tempTag = "HOT!"; tempTagColor = C_RED; }
  else if (currentTemp >= 29.0f) { tempColor = C_YELLOW; tempTag = "WARM"; tempTagColor = C_YELLOW; }
  tft.fillRoundRect(94, 35, 56, 14, 3, C_CARD_INNER);
  tft.setTextSize(1);
  tft.setTextColor(tempTagColor);
  tft.setCursor(101, 38);
  tft.print(tempTag);
  tft.setTextColor(tempColor);
  tft.setTextSize(4);
  tft.setCursor(14, 64);
  tft.print(currentTemp, 1);
  tft.drawCircle(116, 68, 3, tempColor);
  tft.drawCircle(116, 68, 2, tempColor);
  tft.setTextSize(2);
  tft.setCursor(123, 66);
  tft.print("C");
  tft.setTextSize(1);
  tft.setTextColor(C_TEXT_MUTED);
  tft.setCursor(14, 108);
  if (timeSynced()) {  // เวลาไทยที่ใช้ประทับค่า
    time_t now = time(nullptr) + 7 * 3600;
    struct tm tmv;
    gmtime_r(&now, &tmv);
    char buf[24];
    snprintf(buf, sizeof(buf), "TIME %02d:%02d (TH)", tmv.tm_hour, tmv.tm_min);
    tft.print(buf);
  } else {
    tft.print("TIME NOT SYNCED");
  }

  // --- ความชื้น ---
  tft.fillRect(250, 35, 60, 15, C_CARD_BG);
  tft.fillRect(168, 56, 142, 66, C_CARD_BG);
  const char* humTag = "OPTIMAL";
  uint16_t humTagColor = C_GREEN;
  if (currentHum >= 75.0f)      { humTag = "HUMID!"; humTagColor = C_YELLOW; }
  else if (currentHum < 45.0f)  { humTag = "DRY";    humTagColor = C_YELLOW; }
  tft.fillRoundRect(252, 35, 56, 14, 3, C_CARD_INNER);
  tft.setTextSize(1);
  tft.setTextColor(humTagColor);
  tft.setCursor(259, 38);
  tft.print(humTag);
  tft.setTextColor(C_CYAN);
  tft.setTextSize(4);
  tft.setCursor(172, 64);
  tft.print(currentHum, 1);
  tft.setTextSize(2);
  tft.setCursor(274, 64);
  tft.print("%");
  tft.setTextSize(1);
  tft.setTextColor(C_TEXT_MUTED);
  tft.setCursor(274, 84);
  tft.print("RH");
  tft.setCursor(172, 108);
  tft.print(currentHum >= 75.0f ? "No Misting (RH>=75%)" : "Evap Cooling Ready");

  // --- THI + คำแนะนำ ---
  tft.fillRect(195, 135, 115, 15, C_CARD_BG);
  tft.fillRect(10, 155, 110, 76, C_CARD_BG);
  tft.fillRect(130, 155, 180, 56, C_CARD_BG);

  uint16_t thiColor;
  const char* thiStatus;
  const char* thiAction1;
  const char* thiAction2;
  switch (riskLevel(currentThi)) {
    case 0:
      thiColor = C_GREEN;  thiStatus = "NORMAL (<74)";
      thiAction1 = "COWS COMFORTABLE";  thiAction2 = "Keep normal airflow";
      break;
    case 1:
      thiColor = C_YELLOW; thiStatus = "WATCH (74+)";
      thiAction1 = "TURN ON BARN FANS"; thiAction2 = "Check clean water trough";
      break;
    case 2:
      thiColor = C_ORANGE; thiStatus = "STRESS (76+)";
      if (currentHum >= 75.0f) { thiAction1 = "MAX FANS (NO MIST)"; thiAction2 = "High RH blocks sweating"; }
      else                     { thiAction1 = "FANS + MISTING ON";  thiAction2 = "Shift feeding to evening"; }
      break;
    default:
      thiColor = C_RED;    thiStatus = "SEVERE (82+)";
      thiAction1 = "EMERGENCY COOLING!"; thiAction2 = "Max airflow, call vet";
      break;
  }

  tft.setTextSize(1);
  tft.setTextColor(C_TEXT_MUTED);
  tft.setCursor(200, 139);
  tft.print("Thai crossbred");

  tft.setTextColor(thiColor);
  tft.setTextSize(4);
  tft.setCursor(14, 168);
  tft.print(currentThi, 1);
  tft.setTextSize(1);
  tft.setTextColor(C_TEXT_MUTED);
  tft.setCursor(16, 212);
  tft.print("THI (NRC 1971)");

  tft.fillRoundRect(132, 156, 174, 21, 4, thiColor);
  tft.setTextColor((thiColor == C_YELLOW || thiColor == C_GREEN) ? C_BLACK : C_WHITE);
  tft.setTextSize(2);
  tft.setCursor(140, 159);
  tft.print(thiStatus);

  tft.setTextSize(1);
  tft.setTextColor(C_WHITE);
  tft.setCursor(132, 184);
  tft.print(thiAction1);
  tft.setTextColor(C_TEXT_MUTED);
  tft.setCursor(132, 198);
  tft.print(thiAction2);

  // เกจ 64..88 พร้อมขีดที่ 74 / 76 / 82
  tft.fillRect(134, 216, 170, 8, C_BLACK);
  float norm = (currentThi - 64.0f) / (88.0f - 64.0f);
  if (norm < 0.05f) norm = 0.05f;
  if (norm > 1.0f) norm = 1.0f;
  tft.fillRect(134, 216, (int)(norm * 170.0f), 8, thiColor);
  const float marks[3] = { THI_MILD, THI_MODERATE, THI_SEVERE };
  for (int i = 0; i < 3; i++) {
    int x = 134 + (int)((marks[i] - 64.0f) / 24.0f * 170.0f);
    tft.drawFastVLine(x, 215, 10, C_BG_DARK);
  }
}

// -----------------------------------------------------
// SETUP & LOOP
// -----------------------------------------------------
void setup() {
  Serial.begin(115200);

  tft.init(240, 320);
  tft.setRotation(1);
  drawBaseUI();

  // Partition Scheme แบบ SPIFFS ตั้งชื่อพื้นที่ว่า "spiffs" ส่วนแบบ FATFS ตั้งชื่อว่า "ffat"
  // ลองทั้งสองชื่อ (format เป็น LittleFS ถ้ายังไม่มีระบบไฟล์)
  const char* fsLabel = "spiffs";
  fsOk = LittleFS.begin(true, "/littlefs", 10, "spiffs");
  if (!fsOk) {
    fsLabel = "ffat";
    fsOk = LittleFS.begin(true, "/littlefs", 10, "ffat");
  }
  if (fsOk) {
    qLoadHead();
    Serial.printf("[QUEUE] LittleFS on '%s' (%lu KB) - %lu readings waiting\n", fsLabel,
                  (unsigned long)(LittleFS.totalBytes() / 1024), (unsigned long)qCount());
  } else {
    Serial.println("[QUEUE] LittleFS mount failed - check Partition Scheme (needs SPIFFS/FATFS/LittleFS)");
  }

  Serial1.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  startNtp();
  updateHeaderStatus();
}

void loop() {
  unsigned long now = millis();

  if (WiFi.status() == WL_CONNECTED && (!timeSynced() || now - lastNtpSync > NTP_RESYNC_MS)) {
    if (now - lastNtpSync > 30000UL || now - lastNtpSync > NTP_RESYNC_MS) startNtp();
  }

  if (now - lastReadTime >= readInterval) {
    lastReadTime = now;

    uint8_t req[8] = { 0x01, 0x04, 0x00, 0x01, 0x00, 0x02, 0, 0 };
    uint16_t crc = crc16(req, 6);
    req[6] = crc & 0xFF;
    req[7] = crc >> 8;
    while (Serial1.available()) Serial1.read();
    Serial1.write(req, 8);
    Serial1.flush();
    delay(80);

    bool readSuccess = false;
    if (Serial1.available() >= 9) {
      uint8_t res[9];
      Serial1.readBytes(res, 9);
      uint16_t recvCrc = (res[8] << 8) | res[7];
      if (res[0] == 0x01 && res[1] == 0x04 && res[2] == 0x04 && crc16(res, 7) == recvCrc) {
        int16_t temp_raw = (res[3] << 8) | res[4];
        uint16_t hum_raw = (res[5] << 8) | res[6];
        float newTemp = temp_raw / 10.0f;
        float newHum = hum_raw / 10.0f;
        if (newTemp >= -10.0f && newTemp <= 65.0f && newHum >= 0.0f && newHum <= 100.0f) {
          if (firstFilter) {
            currentTemp = newTemp;
            currentHum = newHum;
            firstFilter = false;
          } else {  // EMA alpha 0.7
            currentTemp = (0.7f * newTemp) + (0.3f * currentTemp);
            currentHum = (0.7f * newHum) + (0.3f * currentHum);
          }
          readSuccess = true;
        }
      }
    }
    lastReadOk = readSuccess;
    updateDashboard(readSuccess);

    // พยายามต่อ Wi-Fi ใหม่ทุก 30 วินาที (ถี่กว่านี้จะขัดจังหวะการเชื่อมต่อที่กำลังทำอยู่)
    if (WiFi.status() != WL_CONNECTED && now - lastReconnect > 30000UL) {
      lastReconnect = now;
      WiFi.reconnect();
    }

    if (readSuccess && (now - lastSampleTime >= sampleInterval)) {
      lastSampleTime = now;
      handleSample();
      updateHeaderStatus();
    }
  }
}
