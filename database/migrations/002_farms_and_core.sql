-- ============================================================
-- CowCare AI — Migration 002: Farms, Auth support & Core domain
-- ต้องรัน 001_users_and_roles.sql ก่อน
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- ENUM types
-- ------------------------------------------------------------
CREATE TYPE farm_member_role AS ENUM ('owner', 'worker', 'viewer');
CREATE TYPE device_type      AS ENUM ('env_sensor', 'camera');
CREATE TYPE device_status    AS ENUM ('online', 'offline', 'maintenance');
CREATE TYPE cow_status       AS ENUM ('lactating', 'dry', 'heifer', 'calf', 'sold', 'dead');
CREATE TYPE alert_level      AS ENUM ('normal', 'mild', 'moderate', 'severe');
CREATE TYPE alert_channel    AS ENUM ('line', 'dashboard', 'email');

-- ============================================================
-- PART A — สมาชิก / สิทธิ์ / Session
-- ============================================================

-- A1. farms — ข้อมูลฟาร์ม
CREATE TABLE farms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    province        VARCHAR(100),
    district        VARCHAR(100),
    address         TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    barn_height_m   NUMERIC(4,2),                         -- ความสูงโรงเรือน (งานวิจัย: เฉลี่ย 2.7 m)
    roof_type       VARCHAR(50),                          -- 'zinc', 'tile', 'insulated', ...
    has_ceiling     BOOLEAN DEFAULT FALSE,
    cooling_system  VARCHAR(100),                         -- 'fan', 'sprinkler', 'fan+sprinkler', 'none'
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER trg_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A2. farm_members — ผู้ใช้ ↔ ฟาร์ม (Many-to-Many)
CREATE TABLE farm_members (
    farm_id     UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        farm_member_role NOT NULL DEFAULT 'viewer',
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (farm_id, user_id)
);

CREATE INDEX idx_farm_members_user ON farm_members (user_id);

-- A3. refresh_tokens — Session / Logout / Revoke
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,                     -- SHA-256 ของ token
    user_agent  TEXT,
    ip_address  INET,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- A4. audit_logs — บันทึกการกระทำสำคัญ
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,                    -- 'auth.login', 'user.create', 'user.suspend'
    target_type VARCHAR(50),
    target_id   UUID,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);

-- ============================================================
-- PART B — ฟาร์ม / โค / อุปกรณ์
-- ============================================================

-- B1. cows — ข้อมูลโครายตัว
CREATE TABLE cows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    tag_id          VARCHAR(50),                          -- เบอร์หู
    name            VARCHAR(100),
    breed           VARCHAR(100),                         -- 'Holstein Friesian', 'HF 75%', ...
    birth_date      DATE,
    status          cow_status NOT NULL DEFAULT 'lactating',
    parity          SMALLINT DEFAULT 0,                   -- จำนวนครั้งที่คลอด
    last_calving_at DATE,
    avg_milk_kg_day NUMERIC(5,2),                         -- baseline สำหรับคำนวณน้ำนมที่หายไป
    photo_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (farm_id, tag_id)
);

CREATE TRIGGER trg_cows_updated_at
    BEFORE UPDATE ON cows
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- B2. devices — ESP32 sensor และกล้อง
CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    type            device_type NOT NULL,
    name            VARCHAR(100) NOT NULL,                -- 'ESP32 โรงเรือน 1', 'กล้องคอก A'
    serial_no       VARCHAR(100) UNIQUE,                  -- MAC address / serial
    api_key_hash    TEXT,                                 -- ให้ ESP32 ยืนยันตัวตนตอนส่งข้อมูล
    stream_url      TEXT,                                 -- RTSP URL (กล้อง)
    location_note   VARCHAR(255),
    status          device_status NOT NULL DEFAULT 'offline',
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_farm ON devices (farm_id);

CREATE TRIGGER trg_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PART C — Time-series (Sensor / Behavior / Milk)
-- ============================================================

-- C1. sensor_readings — ค่าจาก ESP32 (AHT20 + BMP280)
--   THI (NRC 1971) = (1.8T+32) − (0.55 − 0.0055·RH)·(1.8T − 26)
CREATE TABLE sensor_readings (
    id              BIGSERIAL PRIMARY KEY,
    device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    temperature_c   NUMERIC(5,2) NOT NULL,
    humidity_pct    NUMERIC(5,2) NOT NULL CHECK (humidity_pct BETWEEN 0 AND 100),
    pressure_hpa    NUMERIC(7,2),
    thi             NUMERIC(5,2) GENERATED ALWAYS AS (
                        (1.8 * temperature_c + 32)
                        - (0.55 - 0.0055 * humidity_pct) * (1.8 * temperature_c - 26)
                    ) STORED
);

CREATE INDEX idx_sensor_readings_farm_time ON sensor_readings (farm_id, recorded_at DESC);

-- C2. behavior_logs — ผลตรวจจับพฤติกรรมจาก YOLO
CREATE TABLE behavior_logs (
    id              BIGSERIAL PRIMARY KEY,
    farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    device_id       UUID REFERENCES devices(id) ON DELETE SET NULL,
    cow_id          UUID REFERENCES cows(id) ON DELETE SET NULL,   -- NULL ถ้ายังระบุตัวไม่ได้
    track_id        INT,                                           -- ID จาก YOLO tracker
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    behavior        VARCHAR(50) NOT NULL,                          -- 'standing','lying','eating','drinking','panting'
    confidence      NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    bbox            JSONB,                                         -- {"x1":..,"y1":..,"x2":..,"y2":..}
    snapshot_url    TEXT
);

CREATE INDEX idx_behavior_logs_farm_time ON behavior_logs (farm_id, recorded_at DESC);
CREATE INDEX idx_behavior_logs_cow_time  ON behavior_logs (cow_id, recorded_at DESC);

-- C3. milk_records — ผลผลิตน้ำนมรายวัน (ใช้เป็น target ของ LSTM)
CREATE TABLE milk_records (
    id              BIGSERIAL PRIMARY KEY,
    farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    cow_id          UUID REFERENCES cows(id) ON DELETE CASCADE,    -- NULL = ยอดรวมทั้งฟาร์ม
    record_date     DATE NOT NULL,
    milk_kg         NUMERIC(6,2) NOT NULL CHECK (milk_kg >= 0),
    recorded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (farm_id, cow_id, record_date)
);

CREATE INDEX idx_milk_records_farm_date ON milk_records (farm_id, record_date DESC);

-- ============================================================
-- PART D — AI (Forecast / Advice / Alerts)
-- ============================================================

-- D1. thi_forecasts — ผลพยากรณ์จาก LSTM
CREATE TABLE thi_forecasts (
    id                  BIGSERIAL PRIMARY KEY,
    farm_id             UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_date         DATE NOT NULL,                    -- วันที่ถูกพยากรณ์
    horizon_days        SMALLINT NOT NULL,                -- 1–7 วันล่วงหน้า
    predicted_thi       NUMERIC(5,2) NOT NULL,
    predicted_milk_loss_kg NUMERIC(6,2),
    risk_level          alert_level NOT NULL,
    model_version       VARCHAR(50) NOT NULL,             -- 'lstm-v1-lookback14'
    lookback_days       SMALLINT DEFAULT 14
);

CREATE INDEX idx_thi_forecasts_farm ON thi_forecasts (farm_id, target_date DESC);

-- D2. ai_advices — คำแนะนำจาก Gemini
CREATE TABLE ai_advices (
    id              BIGSERIAL PRIMARY KEY,
    farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    forecast_id     BIGINT REFERENCES thi_forecasts(id) ON DELETE SET NULL,
    category        VARCHAR(50),                          -- 'cooling','feed','water','schedule'
    advice_text     TEXT NOT NULL,                        -- ภาษาไทย
    prompt_context  JSONB,                                -- ข้อมูลที่ส่งเข้า LLM (ไว้ debug/ตรวจสอบ)
    model_name      VARCHAR(50),                          -- 'gemini-x'
    feedback_score  SMALLINT CHECK (feedback_score BETWEEN 1 AND 5),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_advices_farm ON ai_advices (farm_id, created_at DESC);

-- D3. alerts — การแจ้งเตือนที่ส่งให้ผู้ใช้
CREATE TABLE alerts (
    id              BIGSERIAL PRIMARY KEY,
    farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    level           alert_level NOT NULL,
    channel         alert_channel NOT NULL DEFAULT 'line',
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    source_type     VARCHAR(50),                          -- 'sensor','forecast','behavior'
    source_id       BIGINT,
    advice_id       BIGINT REFERENCES ai_advices(id) ON DELETE SET NULL,
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_unread ON alerts (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_alerts_farm        ON alerts (farm_id, created_at DESC);

-- ============================================================
-- SECURITY: เปิด RLS ทุกตาราง (backend ใช้ SERVICE_ROLE key)
-- ============================================================
ALTER TABLE farms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE milk_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE thi_forecasts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_advices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
