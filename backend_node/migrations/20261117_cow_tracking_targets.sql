-- CowCare AI - วัวเป้าหมายที่ผู้ดูแลคลิกเลือกจากภาพ (2026-11-17)
-- 1 แถว = การติดตามวัว 1 ตัว 1 ครั้ง: เริ่มจากกรอบที่คลิกในภาพ (ภาพล่าสุดหรือภาพย้อนหลัง)
-- ภาพที่เข้ามาทุกภาพจะอัปเดต state (ตำแหน่งล่าสุด + ความเร็ว) จนหลุดการติดตามหรือผู้ดูแลเลือกวัวตัวใหม่
-- 1 ฟาร์มติดตามได้ทีละ 1 ตัว (active) ประวัติการเลือกครั้งก่อนเก็บไว้
-- ต้องมี tb_cow_behavior_observations ก่อน (migrations/20261112_cow_behavior_observations.sql)
-- รันซ้ำได้ปลอดภัย (ผู้ใช้นำไปรันใน Supabase SQL Editor เอง)

CREATE TABLE IF NOT EXISTS tb_cow_tracking_targets (
    id BIGSERIAL PRIMARY KEY,
    id_farms UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    id_cows UUID NOT NULL REFERENCES tb_cows(id_cows) ON DELETE CASCADE,
    method TEXT NOT NULL,
    -- ภาพที่คลิกเลือก: เวลา กรอบ (สัดส่วน 0–1) และที่มา ('latest' หรือ path ของภาพตัวอย่าง)
    seed_at TIMESTAMPTZ NOT NULL,
    seed_box JSONB NOT NULL,
    seed_source TEXT,
    -- สถานะล่าสุด { box, at, velocity } และภาพล่าสุดที่ประมวลผลแล้ว (กันประมวลผลซ้ำ)
    state JSONB,
    processed_until TIMESTAMPTZ,
    lost_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cow_tracking_one_active_per_farm
    ON tb_cow_tracking_targets (id_farms) WHERE active;

ALTER TABLE tb_cow_tracking_targets ENABLE ROW LEVEL SECURITY;
