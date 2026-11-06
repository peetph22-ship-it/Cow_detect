-- เก็บตำแหน่งกรอบที่โมเดลตรวจพบ (JSON) ทุกภาพจากกล้อง ไม่ใช่แค่ภาพตัวอย่างรายชั่วโมง
-- ใช้แทนการเก็บวิดีโอ: ขนาดประมาณ 1–2 KB ต่อภาพ (ภาพทุก 10 นาที ≈ 0.2–0.3 MB/วัน/กล้อง)
-- รูปแบบเดียวกับไฟล์ HH.json ของภาพตัวอย่าง:
--   { version, captured_at, model, imgsz, detect_opts, image: {width, height}, total, counts,
--     boxes: [{ cls, score, x1, y1, x2, y2 }] }   (พิกัด x/y เป็นสัดส่วน 0–1 ของภาพจริง)
-- คอลัมน์ว่างได้ (แถวเก่าและข้อมูลจากเครื่องมือภาพสดไม่มีค่านี้)
ALTER TABLE cctv_behavior_telemetry ADD COLUMN IF NOT EXISTS detections jsonb;
