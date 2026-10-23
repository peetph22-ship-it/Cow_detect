# CowCare Sensor Firmware (ESP32-S3)

กล่องเซ็นเซอร์ SHT40 (RS485 Modbus) + จอ ST7789 ส่งข้อมูลขึ้น `backend_node` แบบ store-and-forward

## เตรียมก่อนแฟลช

1. **Library** (Arduino Library Manager): Adafruit GFX, Adafruit ST7735 and ST7789
   (WiFi, HTTPClient, WiFiClientSecure, LittleFS มากับ ESP32 core อยู่แล้ว ไม่ต้องใช้ ArduinoJson)
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
- Serial: `[HB] heartbeat -> 200 (sensor ok, ok 150 / fail 0, rssi -61)`
  ถ้า Serial Monitor ไม่แสดงข้อความ: Tools > **USB CDC On Boot = Enabled** แล้วแฟลชใหม่

## หมายเหตุ

- เกณฑ์ THI บนจอใช้ค่าเริ่มต้น 74/76/82 (โคนมลูกผสมไทย) ระดับรายฟาร์มตาม `hf_profile` ดูที่หน้าเว็บ
