# CowCare AI — คำแนะนำสำหรับ Claude (อ่านทุกครั้งที่เริ่ม session)

**อ่าน [`docs/HANDOFF.md`](docs/HANDOFF.md) ก่อนเริ่มงาน** (สถานะล่าสุด สิ่งที่ค้าง และการตัดสินใจที่ล็อกแล้ว) แผนงานละเอียดอยู่ที่ [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md)

## ระบบโดยย่อ
- กล่อง ESP32-S3 (firmware ใน `firmware/cowcare_sensor/`) อ่าน SHT40 (I2C, SDA GPIO11 / SCL GPIO12) ส่งค่าทุก 15 วิ + ดึงภาพนิ่งจากกล้อง Dahua ในวงแลนส่งขึ้น server
- หลังบ้าน `backend_node/` (Node.js Express) บน Render แพ็ก 0.5 CPU · ฐานข้อมูล + Storage บน Supabase · หน้าเว็บ `frontend/` (Nuxt) บน Cloudflare Pages
- YOLO26m ONNX (480) ตรวจท่าวัว + ติดตามวัวเป้าหมาย 1 ตัว (นอน / ยืน / กิน)

## กติกาที่ต้องทำตามเสมอ
- **ฐานข้อมูลจริง: อ่านอย่างเดียว** (`BEGIN TRANSACTION READ ONLY`) แก้ schema = เขียนไฟล์ใน `backend_node/migrations/` แล้วให้ผู้ใช้รันใน Supabase SQL Editor เอง จากนั้นตรวจแบบอ่านอย่างเดียว
- **ผู้ใช้เป็นคน push / merge / รัน migration / สมัครหรือเปลี่ยนแพ็ก** Claude ทำงานบน branch แยกจาก `main` ล่าสุด แล้วให้คำสั่งกับผู้ใช้
- **ห้ามส่ง token ที่ Claude สร้างเองไปที่ server จริง** ทดสอบหน้าเว็บด้วย stub API บน localhost (`.claude/launch.json` มี `frontend-test` = พอร์ต 3002 ชี้ `localhost:5099`)
- ห้าม commit `.env` / `secrets.h` / คีย์ใด ๆ · ห้ามพิมพ์ค่าคีย์ออกมา (บอกแค่ว่ามี/ไม่มี)
- ทุกตัวเลขในเปเปอร์ต้องมาจากสคริปต์ใน repo (`backend_node/scripts/`) ที่รันซ้ำได้ · ไม่อ้างว่า LSTM/Gemini/LINE ใช้งานจริง
- ก่อน commit: `for f in backend_node/scripts/test_*.js; do node "$f" || echo "FAIL $f"; done` ต้องผ่านทั้งหมด · แก้หน้าเว็บให้ build ผ่าน (`cd frontend && npx nuxi generate`)
- แก้ `backend_node/app/services/cowTracking.js` แล้วต้องรัน `node backend_node/scripts/sync_browser_tracking.js` (สำเนาฝั่งหน้าเว็บ)
- รันสคริปต์ที่ต่อฐานข้อมูลบนโน้ตบุ๊กแล้วช้า/timeout: ให้ผู้ใช้ใช้ hotspot มือถือ
- **อัปเดตเอกสารไปพร้อมงานเสมอ:** ทุกครั้งที่งานเปลี่ยนสถานะระบบ (firmware, ฮาร์ดแวร์, ฟีเจอร์, ตัวเลข, การตัดสินใจ) ให้แก้ `README.md`, `docs/COWCARE_PROJECT_MASTER_OVERVIEW.md`, `docs/PROJECT_PLAN.md` (ตารางสถานะ) และ `docs/HANDOFF.md` ใน commit เดียวกัน · ไม่ต้องถามซ้ำ
- ภาษาที่ใช้คุยกับผู้ใช้: ไทย

## แฟลช firmware (บอร์ดเสียบ USB ที่ `/dev/cu.usbmodem*`)
```bash
CLI="/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli"
FQBN="esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi,CDCOnBoot=cdc"
"$CLI" compile -b "$FQBN" --build-path /tmp/fwbuild firmware/cowcare_sensor && "$CLI" upload -p /dev/cu.usbmodem101 -b "$FQBN" --input-dir /tmp/fwbuild
```
ต้องปิด Serial Monitor ใน Arduino IDE ก่อน (พอร์ตจะ busy) · `CDCOnBoot=cdc` ทำให้ Serial ออกทาง USB
