# CowCare Sensor Firmware (ESP32-S3)

กล่องเซ็นเซอร์ SHT40 (RS485 Modbus) + จอ ST7789 ส่งข้อมูลขึ้น `backend_node` แบบ store-and-forward

## เตรียมก่อนแฟลช

1. **Library** (Arduino Library Manager): Adafruit GFX, Adafruit ST7735 and ST7789
   (WiFi, HTTPClient, WiFiClientSecure, LittleFS มากับ ESP32 core อยู่แล้ว ไม่ต้องใช้ ArduinoJson)
2. **Tools > Partition Scheme**: เลือกแบบที่มีพื้นที่ไฟล์ เช่น `16M Flash (3MB APP/9.9MB FATFS)`
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

1. เปิด Serial Monitor (115200) ต้องเห็น `[QUEUE] 0 readings waiting` และ `[CLOUD] single 200`
2. **ถอดปลั๊ก router 10 นาที** จอต้องขึ้น `WIFI OFFLINE` และ `Q:` เพิ่มทีละ 1 ทุก 15 วินาที (~40 ค่า)
3. **เสียบ router กลับ** ต้องเห็น `[CLOUD] batch n=... -> 200` และ `Q:` หายไป
4. เปิดกราฟในหน้าฟาร์ม ช่วง 10 นาทีที่ถอด router ต้อง**ต่อเนื่อง ไม่มีช่องว่าง**
5. ทดสอบไฟดับ: ถอด router → รอให้ `Q:` ขึ้น → ถอดไฟบอร์ด → เสียบไฟบอร์ด → เสียบ router → คิวต้องถูกส่งครบ

## หมายเหตุ

- เกณฑ์ THI บนจอใช้ค่าเริ่มต้น 74/76/82 (โคนมลูกผสมไทย) ระดับรายฟาร์มตาม `hf_profile` ดูที่หน้าเว็บ
- `client.setInsecure()` ยังไม่ตรวจใบรับรอง server ควรฝัง Root CA ก่อนใช้งานจริง
