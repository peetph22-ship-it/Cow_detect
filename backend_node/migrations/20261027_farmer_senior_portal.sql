-- CowCare AI - Senior Farmer Portal (2026-10-27)
-- ตารางสำหรับระบบเกษตรกร (มินิมอล/ใช้งานง่ายสำหรับผู้สูงอายุ)
-- 1. บันทึกผลผลิตน้ำนมและตรวจสุขภาพวัวประจำวัน (tb_farmer_daily_logs)
-- 2. รายการเช็คลิสต์สิ่งที่ทำแล้วในแต่ละวัน (tb_farmer_daily_actions)
-- 3. การแจ้งเตือนเหตุฉุกเฉินจากเกษตรกร (tb_farmer_sos_alerts)

CREATE TABLE IF NOT EXISTS tb_farmer_daily_logs (
    id BIGSERIAL PRIMARY KEY,
    id_farms UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    id_users UUID REFERENCES tb_users(id_users) ON DELETE SET NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    milk_kg NUMERIC(8, 2) DEFAULT 0,
    cow_health VARCHAR(50) DEFAULT 'normal', -- normal, mild_concern, severe_concern
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tb_farmer_daily_logs_farm_date_uniq UNIQUE (id_farms, log_date)
);

CREATE TABLE IF NOT EXISTS tb_farmer_daily_actions (
    id BIGSERIAL PRIMARY KEY,
    id_farms UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    action_date DATE NOT NULL DEFAULT CURRENT_DATE,
    action_key VARCHAR(50) NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tb_farmer_daily_actions_farm_date_key_uniq UNIQUE (id_farms, action_date, action_key)
);

CREATE TABLE IF NOT EXISTS tb_farmer_sos_alerts (
    id BIGSERIAL PRIMARY KEY,
    id_farms UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    id_users UUID REFERENCES tb_users(id_users) ON DELETE SET NULL,
    sos_type VARCHAR(100) NOT NULL,
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_daily_logs_farm_date ON tb_farmer_daily_logs(id_farms, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_farmer_daily_actions_farm_date ON tb_farmer_daily_actions(id_farms, action_date);
