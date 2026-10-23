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
#include <MD5Builder.h>
#include <time.h>
#include <math.h>
#include "secrets.h"
#include "root_ca.h"

// HTTPS ตรวจใบรับรอง server ด้วย Root CA ใน root_ca.h
// ฉุกเฉินเท่านั้น (เช่น server เปลี่ยนใบรับรองแล้วบอร์ดส่งไม่ได้): #define TLS_INSECURE_VAL 1 ใน secrets.h แล้วแฟลช
#ifndef TLS_INSECURE_VAL
#define TLS_INSECURE_VAL 0
#endif

// ค่ากล้องใน secrets.h ไม่บังคับ: ไม่ใส่ = ปิดส่วนกล้อง (secrets.h เดิมคอมไพล์ได้เหมือนเดิม)
#ifndef CAMERA_ENABLED_VAL
#define CAMERA_ENABLED_VAL 0
#endif
#ifndef CAMERA_HOST_VAL
#define CAMERA_HOST_VAL "192.168.1.108"
#endif
#ifndef CAMERA_PORT_VAL
#define CAMERA_PORT_VAL 80
#endif
#ifndef CAMERA_USER_VAL
#define CAMERA_USER_VAL ""
#endif
#ifndef CAMERA_PASS_VAL
#define CAMERA_PASS_VAL ""
#endif
#ifndef CAMERA_INTERVAL_MIN_VAL
#define CAMERA_INTERVAL_MIN_VAL 10  // นาทีต่อภาพ (10 นาที ~1.3GB/เดือน ที่ภาพละ 300KB)
#endif
#ifndef CAMERA_SNAPSHOT_PATH_VAL
#define CAMERA_SNAPSHOT_PATH_VAL "/cgi-bin/snapshot.cgi?channel=1"  // Dahua
#endif

// ==========================================
// 1. ตั้งค่า
// ==========================================
const char* WIFI_SSID     = WIFI_SSID_VAL;
const char* WIFI_PASSWORD = WIFI_PASSWORD_VAL;
const char* DEVICE_SERIAL = DEVICE_SERIAL_VAL;
const char* DEVICE_KEY    = DEVICE_KEY_VAL;
const char* SERVER_BASE   = SERVER_BASE_VAL;

const bool  CAMERA_ENABLED       = CAMERA_ENABLED_VAL;
const char* CAMERA_HOST          = CAMERA_HOST_VAL;
const int   CAMERA_PORT          = CAMERA_PORT_VAL;
const char* CAMERA_USER          = CAMERA_USER_VAL;
const char* CAMERA_PASS          = CAMERA_PASS_VAL;
const char* CAMERA_SNAPSHOT_PATH = CAMERA_SNAPSHOT_PATH_VAL;
const unsigned long CAM_INTERVAL_MS = (unsigned long)max(1, CAMERA_INTERVAL_MIN_VAL) * 60UL * 1000UL;
const size_t CAM_BUF_PSRAM = 1536UL * 1024UL;  // server รับไม่เกิน 2MB
const size_t CAM_BUF_HEAP  = 200UL * 1024UL;   // บอร์ดที่ไม่ได้เปิด PSRAM

const unsigned long readInterval   = 2000;   // อ่านเซ็นเซอร์ทุก 2 วินาที
const unsigned long sampleInterval = 15000;  // บันทึก/ส่งทุก 15 วินาที
const unsigned long HEARTBEAT_MS = 5UL * 60UL * 1000UL;  // รายงานสถานะกล่องทุก 5 นาที
const char* FW_VERSION = "1.4.0";

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
bool lastWifiUp = false;

// สถานะกล่องสำหรับ heartbeat (นับตั้งแต่ heartbeat ครั้งก่อน ยกเว้น wifiReconnects นับตั้งแต่เปิดเครื่อง)
uint32_t sensorOkReads = 0;
uint32_t sensorFailReads = 0;
unsigned long lastSensorOkMs = 0;
bool everSensorOk = false;
uint32_t wifiReconnects = 0;
unsigned long lastHeartbeat = 0;
bool firstHeartbeatDone = false;
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

// กล้อง: task บนคอร์ 0 เขียนสถานะ, loop (คอร์ 1) วาดจอ
enum CamStatus : uint8_t { CAM_WAIT = 0, CAM_OK, CAM_ERR, CAM_NET };
volatile uint8_t camStatus = CAM_WAIT;
uint8_t prevCamStatus = 255;
// ส่ง HTTPS ทีละงาน (เซ็นเซอร์กับกล้องไม่ใช้ TLS พร้อมกัน ประหยัด RAM)
SemaphoreHandle_t netMutex = nullptr;

// รับ body ของ HTTP ลง buffer ที่จองไว้ (ใช้กับ HTTPClient::writeToStream ซึ่งรองรับ chunked ด้วย)
class BufStream : public Stream {
 public:
  BufStream(uint8_t* b, size_t c) : buf(b), cap(c), len(0) {}
  void reset() { len = 0; }
  size_t write(uint8_t c) override {
    if (len >= cap) return 0;
    buf[len++] = c;
    return 1;
  }
  size_t write(const uint8_t* d, size_t n) override {
    if (len + n > cap) n = cap - len;  // เต็ม -> writeToStream คืน error
    memcpy(buf + len, d, n);
    len += n;
    return n;
  }
  int available() override { return 0; }
  int read() override { return -1; }
  int peek() override { return -1; }
  void flush() override {}
  uint8_t* buf;
  size_t cap;
  size_t len;
};

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
void secureClient(WiFiClientSecure& client) {
  if (TLS_INSECURE_VAL) client.setInsecure();  // โหมดฉุกเฉินเท่านั้น
  else client.setCACert(SERVER_ROOT_CA);       // ต้องซิงก์เวลาแล้ว (ใบรับรองตรวจวันหมดอายุ)
}

int httpPost(const String& path, const String& body, String& response, uint16_t timeoutMs) {
  // กล้องกำลังส่งภาพอยู่: รอได้ไม่เกิน 30 วินาที ไม่งั้นนับเป็นส่งไม่สำเร็จ (ค่าเข้าคิวตามปกติ)
  if (netMutex && xSemaphoreTake(netMutex, pdMS_TO_TICKS(30000)) != pdTRUE) {
    lastHttpCode = -1;
    return -1;
  }
  WiFiClientSecure client;
  secureClient(client);
  HTTPClient http;
  http.begin(client, String(SERVER_BASE) + path);
  http.setTimeout(timeoutMs);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int code = http.POST(body);
  if (code > 0) response = http.getString();
  http.end();
  if (netMutex) xSemaphoreGive(netMutex);
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
// กล้อง: ดึงภาพนิ่งจากกล้อง IP ใน LAN ทุก CAMERA_INTERVAL_MIN_VAL นาที แล้วส่งขึ้น cloud (YOLO ประมวลผลฝั่ง server)
// ส่งไม่สำเร็จ = ข้ามรอบนั้น (ไม่เก็บภาพเข้าคิว)
// -----------------------------------------------------

String md5hex(const String& s) {
  MD5Builder m;
  m.begin();
  m.add(s);
  m.calculate();
  return m.toString();
}

// อ่านค่าจาก WWW-Authenticate เช่น realm="Login to xxx", qop="auth", algorithm=MD5
String authParam(const String& h, const char* key) {
  String k = String(key) + "=";
  int i = 0;
  while ((i = h.indexOf(k, i)) >= 0) {
    if (i == 0 || h[i - 1] == ' ' || h[i - 1] == ',') break;  // กัน "nonce" ไปเจอ "cnonce"
    i += k.length();
  }
  if (i < 0) return "";
  i += k.length();
  if (i < (int)h.length() && h[i] == '"') {
    int e = h.indexOf('"', i + 1);
    return e < 0 ? "" : h.substring(i + 1, e);
  }
  int e = h.indexOf(',', i);
  String v = h.substring(i, e < 0 ? h.length() : e);
  v.trim();
  return v;
}

// HTTP Digest (RFC 2617, MD5) แบบที่กล้อง Dahua/Hikvision ใช้
String digestHeader(const String& ch, const char* method, const char* uri) {
  String realm = authParam(ch, "realm");
  String nonce = authParam(ch, "nonce");
  String opaque = authParam(ch, "opaque");
  String qop = authParam(ch, "qop");
  String algo = authParam(ch, "algorithm");
  if (nonce.length() == 0) return "";
  if (algo.length() && !algo.equalsIgnoreCase("MD5")) {
    Serial.println("[CAM] digest algorithm not supported: " + algo);
    return "";
  }
  bool useQop = qop.indexOf("auth") >= 0;
  const char* nc = "00000001";
  char cnonce[17];
  snprintf(cnonce, sizeof(cnonce), "%08lx%08lx", (unsigned long)esp_random(), (unsigned long)esp_random());

  String ha1 = md5hex(String(CAMERA_USER) + ":" + realm + ":" + CAMERA_PASS);
  String ha2 = md5hex(String(method) + ":" + uri);
  String resp = useQop ? md5hex(ha1 + ":" + nonce + ":" + nc + ":" + cnonce + ":auth:" + ha2)
                       : md5hex(ha1 + ":" + nonce + ":" + ha2);

  String h = String("Digest username=\"") + CAMERA_USER + "\", realm=\"" + realm + "\", nonce=\"" + nonce +
             "\", uri=\"" + uri + "\", algorithm=MD5, response=\"" + resp + "\"";
  if (opaque.length()) h += ", opaque=\"" + opaque + "\"";
  if (useQop) h += String(", qop=auth, nc=") + nc + ", cnonce=\"" + cnonce + "\"";
  return h;
}

// GET ภาพจากกล้อง: auth = header Digest ที่คำนวณแล้ว, basic = ใช้ Basic auth
int camGet(const String& auth, bool basic, String* challenge, BufStream& out) {
  static const char* hdrs[] = { "WWW-Authenticate" };
  WiFiClient client;
  HTTPClient http;
  String url = String("http://") + CAMERA_HOST + ":" + CAMERA_PORT + CAMERA_SNAPSHOT_PATH;
  if (!http.begin(client, url)) return -1;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  http.collectHeaders(hdrs, 1);
  if (basic) http.setAuthorization(CAMERA_USER, CAMERA_PASS);
  else if (auth.length()) http.addHeader("Authorization", auth);
  int code = http.GET();
  if (code == 401 && challenge) *challenge = http.header("WWW-Authenticate");
  if (code == 200) {
    out.reset();
    int n = http.writeToStream(&out);
    if (n < 0) {
      Serial.printf("[CAM] read body failed %d (image > %u KB?)\n", n, (unsigned)(out.cap / 1024));
      code = n;
    }
  }
  http.end();
  return code;
}

String camUploadUrl() {
  String base = SERVER_BASE;  // ".../api/sensors" -> ".../api/camera/snapshot"
  if (base.endsWith("/sensors")) base = base.substring(0, base.length() - 8);
  return base + "/camera/snapshot";
}

int camUpload(const uint8_t* buf, size_t len, uint32_t capturedAt) {
  WiFiClientSecure client;
  secureClient(client);
  HTTPClient http;
  if (!http.begin(client, camUploadUrl())) return -1;
  http.setTimeout(30000);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Device-Serial", DEVICE_SERIAL);
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.addHeader("X-Captured-At", String((unsigned long)capturedAt));
  int code = http.POST((uint8_t*)buf, len);
  if (code > 0 && code != 202) Serial.println("[CAM] server: " + http.getString());
  http.end();
  return code;
}

void cameraRound(BufStream& bs) {
  uint32_t capturedAt = (uint32_t)time(nullptr);
  String challenge;
  int code = camGet("", false, &challenge, bs);
  if (code == 401) {
    challenge.trim();
    if (challenge.length() >= 6 && challenge.substring(0, 6).equalsIgnoreCase("Digest")) {
      String auth = digestHeader(challenge, "GET", CAMERA_SNAPSHOT_PATH);
      code = auth.length() ? camGet(auth, false, nullptr, bs) : 401;
    } else {
      code = camGet("", true, nullptr, bs);
    }
    if (code == 401) Serial.println("[CAM] camera login failed - check CAMERA_USER/CAMERA_PASS");
  }
  bool jpeg = bs.len > 4 && bs.buf[0] == 0xFF && bs.buf[1] == 0xD8;
  if (code != 200 || !jpeg) {
    Serial.printf("[CAM] snapshot failed: code %d, %u bytes%s\n", code, (unsigned)bs.len,
                  (code == 200 && !jpeg) ? " (not JPEG)" : "");
    camStatus = CAM_ERR;
    return;
  }

  if (!netMutex || xSemaphoreTake(netMutex, pdMS_TO_TICKS(60000)) != pdTRUE) {
    Serial.println("[CAM] network busy, skip this round");
    camStatus = CAM_NET;
    return;
  }
  unsigned long t0 = millis();
  int up = camUpload(bs.buf, bs.len, capturedAt);
  xSemaphoreGive(netMutex);
  Serial.printf("[CAM] snapshot %u KB -> upload %d (%lu ms)\n", (unsigned)(bs.len / 1024), up, millis() - t0);
  camStatus = (up == 202) ? CAM_OK : CAM_NET;
}

void cameraTask(void*) {
  bool ps = psramFound();
  size_t cap = ps ? CAM_BUF_PSRAM : CAM_BUF_HEAP;
  uint8_t* mem = ps ? (uint8_t*)ps_malloc(cap) : (uint8_t*)malloc(cap);
  if (!mem) {
    Serial.println("[CAM] cannot allocate image buffer - camera disabled");
    camStatus = CAM_ERR;
    vTaskDelete(nullptr);
    return;
  }
  Serial.printf("[CAM] buffer %u KB in %s, snapshot every %lu min\n", (unsigned)(cap / 1024),
                ps ? "PSRAM" : "heap (enable PSRAM for big images)", CAM_INTERVAL_MS / 60000UL);
  BufStream bs(mem, cap);
  bool first = true;
  unsigned long lastShot = 0;
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(1000));
    if (WiFi.status() != WL_CONNECTED || !timeSynced()) continue;
    if (!first && millis() - lastShot < CAM_INTERVAL_MS) continue;
    first = false;
    lastShot = millis();
    cameraRound(bs);
  }
}

// -----------------------------------------------------
// Heartbeat: สถานะกล่องทุก 5 นาที (POST /heartbeat)
// -----------------------------------------------------
const char* resetReasonText() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON: return "power_on";
    case ESP_RST_SW: return "software";
    case ESP_RST_PANIC: return "crash";
    case ESP_RST_INT_WDT:
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT: return "watchdog";
    case ESP_RST_BROWNOUT: return "brownout";  // ไฟตก: อะแดปเตอร์/สายไฟไม่พอ
    case ESP_RST_EXT: return "reset_button";
    case ESP_RST_DEEPSLEEP: return "deep_sleep";
    default: return "other";
  }
}

void sendHeartbeat() {
  unsigned long nowMs = millis();
  long sensorLastOkS = everSensorOk ? (long)((nowMs - lastSensorOkMs) / 1000UL) : -1;
  char body[640];
  snprintf(body, sizeof(body),
    "{\"serial_no\":\"%s\",\"fw_version\":\"%s\",\"uptime_s\":%lu,\"rssi\":%d,"
    "\"free_heap\":%lu,\"min_free_heap\":%lu,\"psram_free\":%lu,"
    "\"queue\":%lu,\"pending\":%d,\"fs_ok\":%s,"
    "\"sensor_ok\":%s,\"sensor_ok_reads\":%lu,\"sensor_fail_reads\":%lu,\"sensor_last_ok_s\":%ld,"
    "\"last_http_code\":%d,\"wifi_reconnects\":%lu,\"reset_reason\":\"%s\","
    "\"camera_enabled\":%s,\"camera_status\":%u,\"tls\":\"%s\"}",
    DEVICE_SERIAL, FW_VERSION, nowMs / 1000UL, (int)WiFi.RSSI(),
    (unsigned long)ESP.getFreeHeap(), (unsigned long)ESP.getMinFreeHeap(), (unsigned long)ESP.getFreePsram(),
    (unsigned long)qCount(), pendingCount, fsOk ? "true" : "false",
    lastReadOk ? "true" : "false", (unsigned long)sensorOkReads, (unsigned long)sensorFailReads, sensorLastOkS,
    lastHttpCode, (unsigned long)wifiReconnects, resetReasonText(),
    CAMERA_ENABLED ? "true" : "false", (unsigned)camStatus, TLS_INSECURE_VAL ? "insecure" : "verified");
  String resp;
  int code = httpPost("/heartbeat", body, resp, 8000);
  Serial.printf("[HB] heartbeat -> %d (sensor %s, ok %lu / fail %lu, rssi %d)\n", code,
                lastReadOk ? "ok" : "FAIL", (unsigned long)sensorOkReads, (unsigned long)sensorFailReads, (int)WiFi.RSSI());
  if (code == 200) { sensorOkReads = 0; sensorFailReads = 0; }
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
                    (fabs(currentThi - prevThi) >= 0.1f) ||
                    (CAMERA_ENABLED && camStatus != prevCamStatus);
  if (!needRedraw) return;

  prevReadOk = true;
  prevTemp = currentTemp;
  prevHum = currentHum;
  prevThi = currentThi;
  prevCamStatus = camStatus;

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
  if (CAMERA_ENABLED) {  // สถานะภาพนิ่งรอบล่าสุด (รายละเอียดดูใน Serial)
    uint8_t cs = prevCamStatus;
    tft.setCursor(110, 108);
    tft.setTextColor(cs == CAM_OK ? C_GREEN : cs == CAM_ERR ? C_RED : cs == CAM_NET ? C_YELLOW : C_TEXT_MUTED);
    tft.print(cs == CAM_OK ? "CAM OK" : cs == CAM_ERR ? "CAM ERR" : cs == CAM_NET ? "CAM NET" : "CAM --");
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
  tft.invertDisplay(false);  // จอรุ่นนี้กลับสีเมื่อใช้ค่าเริ่มต้นของ library
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

  netMutex = xSemaphoreCreateMutex();
  if (CAMERA_ENABLED) {
    // คอร์ 0 (loop อยู่คอร์ 1) จอและการอ่านเซ็นเซอร์ไม่ค้างระหว่างดึง/ส่งภาพ
    xTaskCreatePinnedToCore(cameraTask, "camera", 16384, nullptr, 1, nullptr, 0);
  }
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
    if (readSuccess) { sensorOkReads++; lastSensorOkMs = now; everSensorOk = true; }
    else sensorFailReads++;
    updateDashboard(readSuccess);

    // ต่อ Wi-Fi ใหม่ทุก 30 วินาที (ถี่กว่านี้จะขัดจังหวะการเชื่อมต่อที่กำลังทำอยู่)
    // ใช้ disconnect + begin แทน WiFi.reconnect() ซึ่งบางครั้งต่อไม่ติดเมื่อ AP หายไปนาน
    bool wifiUp = WiFi.status() == WL_CONNECTED;
    if (wifiUp != lastWifiUp) {
      lastWifiUp = wifiUp;
      if (wifiUp) Serial.printf("[WiFi] connected, IP %s\n", WiFi.localIP().toString().c_str());
      else Serial.println("[WiFi] disconnected");
    }
    if (!wifiUp && now - lastReconnect > 30000UL) {
      lastReconnect = now;
      Serial.println("[WiFi] reconnecting...");
      wifiReconnects++;
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }

    if (readSuccess && (now - lastSampleTime >= sampleInterval)) {
      lastSampleTime = now;
      handleSample();
      updateHeaderStatus();
    }
  }

  // ส่งสถานะกล่องแม้เซ็นเซอร์อ่านค่าไม่ได้ เพื่อให้ server แยกได้ว่าเสียที่เน็ต ไฟ หรือเซ็นเซอร์
  if (WiFi.status() == WL_CONNECTED && timeSynced() &&
      (!firstHeartbeatDone || now - lastHeartbeat >= HEARTBEAT_MS)) {
    lastHeartbeat = now;
    firstHeartbeatDone = true;
    sendHeartbeat();
  }
}
