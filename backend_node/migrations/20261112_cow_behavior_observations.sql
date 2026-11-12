-- CowCare AI - พฤติกรรมของวัวเป้าหมายจากภาพกล้องทีละภาพ (2026-11-12)
-- ระยะแรกติดตามวัว 1 ตัว (ทำเครื่องหมายบนหลัง หรือลายเด่น) ท่า นอน / ยืน / กิน
-- 1 แถว = ภาพ 1 ภาพของวัว 1 ตัว: ระบบหาวัวเป้าหมายในภาพนั้นได้ไหม อยู่ท่าไหน อยู่ตรงไหน
-- ช่วงพฤติกรรม (เช่น นอน 08:14–09:37) คำนวณจากแถวที่เรียงตามเวลาตอนดึงข้อมูล ไม่เก็บซ้ำ
-- ต้องมีคอลัมน์ cctv_behavior_telemetry.detections ก่อน (migrations/20261106_telemetry_detection_boxes.sql)
-- รันซ้ำได้ปลอดภัย

CREATE TABLE IF NOT EXISTS tb_cow_behavior_observations (
    id BIGSERIAL PRIMARY KEY,
    id_farms UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    id_cows UUID NOT NULL REFERENCES tb_cows(id_cows) ON DELETE CASCADE,
    camera_id UUID REFERENCES cctv_cameras(id) ON DELETE SET NULL,
    -- ภาพต้นทาง (ผลโมเดลทั้งภาพอยู่ใน detections ของแถวนั้น)
    telemetry_id BIGINT REFERENCES cctv_behavior_telemetry(id) ON DELETE SET NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    -- เก็บท่าตามที่โมเดลตรวจได้ (รวม drinking) การรวม "ดื่ม" เข้ากับ "ยืน" ทำตอนแสดงผล
    -- not_visible = หาวัวเป้าหมายในภาพนี้ไม่เจอ (ถูกบัง ออกนอกภาพ หรือโมเดลตรวจไม่พบ)
    behavior TEXT NOT NULL CHECK (behavior IN ('lying', 'standing', 'feeding', 'drinking', 'not_visible')),
    -- กรอบของวัวเป้าหมาย เป็นสัดส่วน 0–1 ของภาพ (ว่างเมื่อ not_visible)
    box_x1 REAL,
    box_y1 REAL,
    box_x2 REAL,
    box_y2 REAL,
    -- ความมั่นใจว่ากรอบนี้คือวัวเป้าหมาย 0–1 (ว่างเมื่อ not_visible)
    match_score REAL CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 1)),
    -- วิธีที่ใช้หาวัว พร้อมรุ่น เช่น 'position-v1' ถ้าปรับวิธีแล้วคำนวณใหม่ แถวเก่ายังอยู่แยกกัน
    method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((behavior = 'not_visible') = (box_x1 IS NULL)),
    UNIQUE (id_cows, observed_at, method)
);

CREATE INDEX IF NOT EXISTS idx_cow_behavior_obs_farm_time
    ON tb_cow_behavior_observations (id_farms, observed_at DESC);

-- เหมือนตารางอื่น: ปิดการเข้าถึงผ่าน Supabase API สาธารณะ (backend ต่อฐานข้อมูลตรง ไม่ได้รับผลกระทบ)
ALTER TABLE tb_cow_behavior_observations ENABLE ROW LEVEL SECURITY;
