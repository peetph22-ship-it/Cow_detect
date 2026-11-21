-- CowCare AI - โหมดเก็บภาพทุกภาพ (2026-11-21)
-- ปกติระบบเก็บภาพไว้ชั่วโมงละ 1 ภาพ (camera-samples/<farm>/<date>/<HH>.jpg) ภาพอื่นทิ้งหลังประมวลผล
-- ระหว่าง collect_started_at ถึง collect_until จะเก็บ "ทุกภาพ" ที่กล่องส่งมา พร้อมผลของโมเดลข้างกัน
--   camera-samples/collect/<farm_id>/<YYYY-MM-DD>/<HHMMSS>.jpg (+ .json) เวลาไทย
--   ภาพที่ server ประมวลผลไม่ทัน (ตอบ 429) ก็ยังเก็บ (.json มี status = busy)
-- ใช้วันดูหน้างานและวันเก็บข้อมูล: ภาพคอกไทยไว้วัดความแม่นยำ/ฝึกโมเดล และตรวจผลติดตามวัวย้อนหลัง
-- เปิด/หยุดจากหน้า Admin > อุปกรณ์ > ปุ่มเก็บภาพทุกภาพ (หยุด = ตั้ง collect_until เป็นเวลาที่กด)
-- NULL = ไม่เคยเปิด · รันซ้ำได้ปลอดภัย (ผู้ใช้นำไปรันใน Supabase SQL Editor เอง)

ALTER TABLE tb_devices ADD COLUMN IF NOT EXISTS collect_started_at TIMESTAMPTZ;
ALTER TABLE tb_devices ADD COLUMN IF NOT EXISTS collect_until TIMESTAMPTZ;
