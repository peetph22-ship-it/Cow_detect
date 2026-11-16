-- CowCare AI - ตั้งรอบถ่ายภาพกล้องของกล่องเซ็นเซอร์จากหน้าเว็บ (2026-11-16)
-- server ส่งค่านี้กลับไปในคำตอบทุกครั้งที่กล่องส่งภาพ (next_interval_sec) กล่องจะใช้รอบใหม่ทันทีโดยไม่ต้องแฟลชเฟิร์มแวร์
-- NULL = ใช้ค่าที่ตั้งในเฟิร์มแวร์ (CAMERA_INTERVAL_MIN_VAL)
-- ต่ำสุด 15 วินาที: เร็วกว่านี้ server บน Render ฟรีประมวลผลไม่ทัน (YOLO ~30 วินาที/ภาพ) จะตอบ 429 แล้วภาพหาย
-- รันซ้ำได้ปลอดภัย (ผู้ใช้นำไปรันใน Supabase SQL Editor เอง)

ALTER TABLE tb_devices ADD COLUMN IF NOT EXISTS camera_interval_sec INTEGER
    CHECK (camera_interval_sec IS NULL OR camera_interval_sec BETWEEN 15 AND 3600);
