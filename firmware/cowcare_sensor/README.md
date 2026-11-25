# CowCare Sensor Firmware (ESP32-S3)

กล่องเซ็นเซอร์ SHT40 (I2C) + จอ ST7789 ส่งข้อมูลขึ้น `backend_node` แบบ store-and-forward (firmware 1.6.0)

> 1.6.0 เปลี่ยนจากหัววัด XY-MD02 (SHT20 ผ่าน RS485 + บอร์ด HW-726) ซึ่งเสียแล้ว มาใช้ SHT40 ต่อตรงเข้า ESP32 ไม่ต้องใช้ HW-726 อีก

## ต่อสาย SHT40

| สายหัววัด SHT40 | ต่อเข้า ESP32-S3 | หมายเหตุ |
|---|---|---|
| แดง (VCC) | **3V3** | **ห้ามต่อ 5V** (SHT40 รับ 1.8–3.6 V) |
| ดำ (GND) | GND | |
| เขียว (SDA) | GPIO **11** | |
| เหลือง (SCL) | GPIO **12** | |

- ขาที่ใช้แล้ว: จอ 1, 2, 40, 41, 42 ส่วนขา 17/18 (RS485 เดิม) ว่างแล้ว
- เปลี่ยนขาได้ใน `secrets.h`: `#define SHT_SDA_PIN_VAL 11` / `#define SHT_SCL_PIN_VAL 12`
- สายยาวไม่เกินประมาณ 1 ม.
- **ไม่มีตัวต้านทานก็ลองได้:** firmware เปิด pull-up ในชิป ESP32 และใช้ I2C 50 kHz (ช้าแต่ทน) ถ้าอ่านค่าได้ต่อเนื่องก็ใช้ได้เลย
  ถ้าอ่านพลาดบ่อย (Serial ขึ้น `failed reads in a row` บ่อย หรือหาเซ็นเซอร์ไม่เจอ) ให้ใส่ 4.7 kΩ จาก SDA และ SCL ขึ้น 3V3
  ใส่แล้วตั้ง `#define SHT_I2C_HZ_VAL 100000` ใน `secrets.h` ได้
- ตั้งหัววัดให้พ้นแดด ฝน และไอน้ำโดยตรง แต่อากาศผ่านได้ (เช่น ใต้หลังคาคอก ในกล่องกันแดดที่มีรูระบาย)
- เปิดเครื่องแล้ว Serial ต้องขึ้น `[SENSOR] found sht4x at 0x44, serial xxxxxxxx`
  ถ้าขึ้น `[SENSOR] no temperature/humidity sensor found` ให้เช็กสาย ไฟ 3V3 และสลับ SDA/SCL

**หัววัดอาจไม่ใช่รุ่นตามชื่อที่ขาย** firmware ตรวจรุ่นจริงตอนเปิดเครื่องแล้วอ่านด้วยคำสั่งของรุ่นนั้น:

| Serial ขึ้นว่า | ชิปจริง | ที่อยู่ I2C | อ่านค่าได้ |
|---|---|---|---|
| `found sht4x` | SHT40 / SHT41 / SHT45 | 0x44 / 0x45 | ✅ (ตรงตามที่สั่ง) |
| `found sht3x ... NOT the SHT40` | SHT30 / SHT31 / SHT35 | 0x44 / 0x45 | ✅ ความแม่นตามสเปกของ SHT3x |
| `found aht2x ... NOT the SHT40` | AHT10 / AHT20 / AHT21 | 0x38 | ✅ ความแม่นตามสเปกของ AHT |
| `found htu21 ... NOT the SHT40` | HTU21D / SHT20 / Si7021 | 0x40 | ✅ ความแม่นตามสเปกของรุ่นนั้น |

ถ้าไม่ใช่ SHT40 หน้า Admin > อุปกรณ์ จะขึ้นคำเตือน (heartbeat ส่ง `sensor_model` ที่ตรวจเจอจริง) เก็บภาพหน้าจอ Serial ไว้เป็นหลักฐานขอคืนเงิน
และในเปเปอร์ต้องระบุรุ่นที่ได้จริง ไม่ใช่รุ่นที่สั่ง
ถอดเสียบหัววัดระหว่างเปิดเครื่องได้: อ่านพลาด 5 ครั้งติดกัน firmware จะล้างบัสแล้วตรวจรุ่นใหม่เอง

## เตรียมก่อนแฟลช

1. **Library** (Arduino Library Manager): Adafruit GFX, Adafruit ST7735 and ST7789
   (Wire, WiFi, HTTPClient, WiFiClientSecure, LittleFS มากับ ESP32 core อยู่แล้ว ไม่ต้องลง library ของ SHT40)
   ทดสอบคอมไพล์แล้วกับ ESP32 core 3.3.12, บอร์ด ESP32S3 Dev Module, Flash 16MB, PSRAM OPI
2. **Tools > Partition Scheme**: เลือกแบบที่มีพื้นที่ไฟล์ เช่น `16M Flash (3MB APP/9.9MB FATFS)`
   firmware จะ mount LittleFS บนพื้นที่ชื่อ `spiffs` หรือ `ffat` อย่างใดอย่างหนึ่ง
   ถ้าเลือกแบบไม่มีพื้นที่ไฟล์ Serial Monitor จะขึ้น `LittleFS mount failed` และบอร์ดจะเก็บคิวไม่ได้
3. คัดลอก `secrets.h.example` เป็น `secrets.h` แล้วใส่ Wi-Fi, serial และ device key
   (`secrets.h` ถูก `.gitignore` ไว้ ห้าม commit)

## ฝั่ง server ที่ต้องพร้อม

- รัน `backend_node/migrations/20261021_sensor_readings_dedupe.sql` ใน Supabase
- deploy `backend_node` เวอร์ชันที่มี `POST /api/sensors/batch`

## การทำงาน

| สถานการณ์ | บอร์ดทำอะไร |
|---|---|
| เน็ตปกติ | ส่งทุก 15 วินาทีพร้อมเวลาจริง (`recorded_at` = Unix epoch UTC) |
| ส่งไม่สำเร็จ | เก็บลง `/q.bin` ใน flash (8 bytes/ค่า, สูงสุด 2MB ≈ 3 สัปดาห์) |
| เน็ตกลับมา | ส่งค่าที่ค้างเป็นชุด ชุดละ 100 ค่า รอบละไม่เกิน 3 ชุด (เก่าสุดก่อน) |
| ยังไม่ได้เวลาจาก NTP | เก็บใน RAM (สูงสุด 240 ค่า) แล้วคำนวณเวลาย้อนหลังเมื่อซิงก์ได้ |
| ส่งพลาดติดกัน | เว้นระยะ 15 วินาที → 1 นาที → 5 นาที |
| ไฟดับ | คิวใน flash ยังอยู่ ค่าใน RAM ก่อนซิงก์เวลาจะหาย |
| SHT40 อ่านพลาด | ไม่ส่งค่านั้น (จอขึ้น `CHECK SENSOR`) พลาด 5 ครั้งติดกัน = ล้างบัส I2C + soft reset เซ็นเซอร์เอง |
| ความชื้น ≥ 95% ค้างนาน 10 นาที (SHT4x เท่านั้น) | เปิด heater ในชิป 200 mW 1 วินาที ไล่ไอน้ำที่เกาะผิวเซ็นเซอร์ แล้วพัก 30 วินาทีไม่ส่งค่า (ค่าตอนร้อนไม่ใช่อากาศในคอก) เปิดซ้ำได้ทุก 10 นาทีถ้ายังชื้น · Serial ขึ้น `heater pulse` และ heartbeat นับ `heater_pulses` |
| server ไม่ตอบ 15 นาที | ต่อ Wi-Fi ใหม่ (เน็ต 4G ค้างทั้งที่ Wi-Fi ยังต่ออยู่) |
| server ไม่ตอบ 30 นาที | รีบูตบอร์ด (คิวใน flash ไม่หาย) |
| loop หรืองานกล้องค้างเกิน 3 นาที | watchdog รีบูตบอร์ด (heartbeat ถัดไปจะรายงาน `reset_reason: watchdog`) |

จอมุมขวาบนแสดง `Q:<จำนวน>` เมื่อมีค่ารอส่ง และสถานะ `CLOUD OK` / `NO SERVER` / `WIFI OFFLINE` / `TIME SYNC...`

## ทดสอบหลังแฟลช

1. เปิด Serial Monitor (115200) ต้องเห็น `[QUEUE] LittleFS on 'ffat' (... KB) - 0 readings waiting` และ `[CLOUD] single 200`
2. **ถอดปลั๊ก router 10 นาที** จอต้องขึ้น `WIFI OFFLINE` และ `Q:` เพิ่มทีละ 1 ทุก 15 วินาที (~40 ค่า)
3. **เสียบ router กลับ** ต้องเห็น `[CLOUD] batch n=... -> 200` และ `Q:` หายไป
4. เปิดกราฟในหน้าฟาร์ม ช่วง 10 นาทีที่ถอด router ต้อง**ต่อเนื่อง ไม่มีช่องว่าง**
5. ทดสอบไฟดับ: ถอด router → รอให้ `Q:` ขึ้น → ถอดไฟบอร์ด → เสียบไฟบอร์ด → เสียบ router → คิวต้องถูกส่งครบ

## กล้อง (ภาพนิ่งทุก 10 นาที, ไม่บังคับ)

ESP32 ตัวเดียวกันดึงภาพนิ่งจากกล้อง IP ในวง LAN เดียวกัน แล้วส่งขึ้น `<server>/api/camera/snapshot`
server ตอบ `202` ทันที แล้วนับวัวด้วย YOLO เบื้องหลัง (บันทึกจำนวนวัวตามพฤติกรรม ไม่เก็บภาพ ยกเว้นตัวอย่างชั่วโมงละ 1 รูป)

1. Arduino IDE: **Tools > PSRAM = OPI PSRAM** (ภาพ 4MP อาจใหญ่ 300KB–1MB ถ้าไม่เปิด PSRAM รับได้แค่ 200KB)
2. ใน `secrets.h` เพิ่มบรรทัด `CAMERA_*` ตาม `secrets.h.example` แล้วตั้ง `CAMERA_ENABLED_VAL 1`
3. ทดสอบ path ภาพนิ่งจากคอมในวงเดียวกันก่อน (ต้องได้ไฟล์ JPEG):
   - Dahua: `http://<ip>/cgi-bin/snapshot.cgi?channel=1`
   - Hikvision: `http://<ip>/ISAPI/Streaming/channels/101/picture`
4. รองรับ Digest auth (Dahua/Hikvision ใช้) และ Basic auth อัตโนมัติ

Serial ต้องเห็น `[CAM] snapshot 245 KB -> upload 202 (3100 ms)` ทุก `CAMERA_INTERVAL_MIN_VAL` นาที (ค่าเริ่มต้น 10)
ค่าเน็ตต่อเดือนที่ภาพละ 300KB: ทุก 5 นาที ~2.6GB, ทุก 10 นาที ~1.3GB (ลดความละเอียดภาพนิ่งในกล้องได้อีก)
จอมุมล่างการ์ดอุณหภูมิแสดง `CAM OK` (ส่งสำเร็จ) / `CAM ERR` (ดึงภาพจากกล้องไม่ได้ ดู Serial) / `CAM NET` (ส่งขึ้น server ไม่สำเร็จ) / `CAM --` (ยังไม่ถึงรอบแรก)
รอบที่ล้มเหลวจะถูกข้าม ไม่เก็บภาพเข้าคิว (คิวใน flash ใช้กับค่าเซ็นเซอร์เท่านั้น)
งานกล้องรันบนคอร์ 0 และไม่ส่ง HTTPS พร้อมกับงานเซ็นเซอร์ การอ่านเซ็นเซอร์และจอจึงไม่ค้างระหว่างส่งภาพ

## HTTPS และสถานะกล่อง (firmware 1.4.0)

- **ตรวจใบรับรอง server แล้ว** (ไม่ใช้ `setInsecure` อีก) ด้วย Root CA ใน `root_ca.h` ต้องซิงก์เวลาก่อนส่ง
  ถ้าวันหนึ่ง Render เปลี่ยนใบรับรองแล้วบอร์ดส่งไม่ได้ (จอขึ้น `NO SERVER`) ข้อมูลยังเก็บในคิว
  ฉุกเฉินเท่านั้น: เพิ่ม `#define TLS_INSECURE_VAL 1` ใน `secrets.h` แล้วแฟลช จากนั้นอัปเดต `root_ca.h`
- **Heartbeat ทุก 5 นาที** (`POST /api/sensors/heartbeat`) ส่งแม้เซ็นเซอร์อ่านค่าไม่ได้:
  สัญญาณ Wi-Fi, เซ็นเซอร์ ok/fail, คิวค้าง, เวลาที่เปิดเครื่อง, สาเหตุรีสตาร์ต (เช่น `brownout` = ไฟตก), เวอร์ชัน firmware
  ต้องรัน `backend_node/migrations/20261025_device_heartbeat.sql` ดูผลที่หน้า Admin > Devices
- อุปกรณ์ที่ยังไม่ลงทะเบียน server ตอบ `404` (ไม่สร้างให้อัตโนมัติแล้ว) บอร์ดเก็บข้อมูลไว้ในคิวจนกว่าจะลงทะเบียน
- 1.6.0 ส่งเพิ่ม: `sensor_model` (รุ่นที่ตรวจเจอจริง: sht4x / sht3x / aht2x / htu21 / none), `sensor_addr`, `sensor_serial`, `heater_pulses`, `i2c_recoveries` (ล้างบัสไปกี่ครั้ง), `last_server_ok_s`, `camera_last_round_s`
- Serial: `[HB] heartbeat -> 200 (sensor ok, ok 150 / fail 0, rssi -61)`
  ถ้า Serial Monitor ไม่แสดงข้อความ: Tools > **USB CDC On Boot = Enabled** แล้วแฟลชใหม่

## หมายเหตุ

- เกณฑ์ THI บนจอใช้ค่าเริ่มต้น 74/76/82 (โคนมลูกผสมไทย) ระดับรายฟาร์มตาม `hf_profile` ดูที่หน้าเว็บ
