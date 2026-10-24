-- CowCare AI - ตารางเก็บผลการนับเทียบภาพตัวอย่างจากกล้องโดย Admin (2026-10-28)
-- ใช้เปรียบเทียบจำนวนวัวแต่ละท่าที่โมเดล YOLO26m นับได้ กับจำนวนที่ผู้ตรวจนับเห็นจริงจากภาพตัวอย่างรายชั่วโมงใน bucket camera-samples
-- รันซ้ำได้ปลอดภัย (ผู้ใช้นำไปรันใน Supabase SQL Editor เอง ห้ามรันอัตโนมัติตอนเปิดเซิร์ฟเวอร์)

CREATE TABLE IF NOT EXISTS tb_camera_sample_audits (
    id BIGSERIAL PRIMARY KEY,
    id_farms UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    sample_path TEXT NOT NULL UNIQUE,
    captured_at TIMESTAMPTZ,
    model_lying INTEGER NOT NULL DEFAULT 0,
    model_standing INTEGER NOT NULL DEFAULT 0,
    model_feeding INTEGER NOT NULL DEFAULT 0,
    model_drinking INTEGER NOT NULL DEFAULT 0,
    model_total INTEGER NOT NULL DEFAULT 0,
    human_lying INTEGER NOT NULL CHECK (human_lying >= 0),
    human_standing INTEGER NOT NULL CHECK (human_standing >= 0),
    human_feeding INTEGER CHECK (human_feeding IS NULL OR human_feeding >= 0),
    human_drinking INTEGER CHECK (human_drinking IS NULL OR human_drinking >= 0),
    human_total INTEGER NOT NULL CHECK (human_total >= 0),
    note TEXT,
    audited_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camera_sample_audits_farm
    ON tb_camera_sample_audits (id_farms, captured_at DESC);
