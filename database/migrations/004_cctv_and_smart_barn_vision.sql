-- ============================================================
-- CowCare AI — Migration 004: Smart Barn Vision & CCTV Ingestion
-- Links Hikvision IP cameras, rolling behavior telemetry, and welfare alerts to tb_farms
-- ============================================================

BEGIN;

-- 1. cctv_cameras: Registered Hikvision & IP CCTV Cameras
CREATE TABLE IF NOT EXISTS cctv_cameras (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id             UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    camera_name         VARCHAR(100) NOT NULL,
    barn_unit           VARCHAR(50) DEFAULT 'Main Barn Unit 1',
    brand               VARCHAR(50) DEFAULT 'Hikvision',
    model               VARCHAR(100),
    ip_address          VARCHAR(45) NOT NULL,
    rtsp_port           INT DEFAULT 554,
    http_port           INT DEFAULT 80,
    username            VARCHAR(100) NOT NULL,
    password_encrypted  TEXT NOT NULL,
    channel_no          INT DEFAULT 1,
    main_stream_url     TEXT,
    sub_stream_url      TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    is_simulation       BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cctv_cameras_farm ON cctv_cameras(farm_id);

-- 2. cctv_behavior_telemetry: 5-Minute Rollup Telemetry
CREATE TABLE IF NOT EXISTS cctv_behavior_telemetry (
    id                  BIGSERIAL PRIMARY KEY,
    camera_id           UUID REFERENCES cctv_cameras(id) ON DELETE CASCADE,
    farm_id             UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_cows_detected INT NOT NULL DEFAULT 0,
    standing_count      INT DEFAULT 0,
    lying_count         INT DEFAULT 0,
    feeding_count       INT DEFAULT 0,
    drinking_count      INT DEFAULT 0,
    standing_pct        NUMERIC(5, 2) DEFAULT 0.00,
    lying_pct           NUMERIC(5, 2) DEFAULT 0.00,
    feeding_pct         NUMERIC(5, 2) DEFAULT 0.00,
    drinking_pct        NUMERIC(5, 2) DEFAULT 0.00,
    cow_comfort_index   NUMERIC(5, 2) DEFAULT 85.00,
    ai_confidence_avg   NUMERIC(4, 3) DEFAULT 0.000,
    active_track_ids    INT[] DEFAULT '{}',
    is_simulation       BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_cctv_telemetry_farm_time ON cctv_behavior_telemetry(farm_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cctv_telemetry_sim ON cctv_behavior_telemetry(is_simulation);

-- 3. animal_behavior_alerts: Real-time Animal Welfare Anomaly Alarms
CREATE TABLE IF NOT EXISTS animal_behavior_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id             UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    camera_id           UUID REFERENCES cctv_cameras(id) ON DELETE SET NULL,
    track_id            INT,
    alert_type          VARCHAR(50) NOT NULL,
    severity            VARCHAR(20) NOT NULL,
    duration_minutes    INT,
    message_th          TEXT NOT NULL,
    thi_at_event        NUMERIC(4, 1),
    snapshot_url        TEXT,
    is_resolved         BOOLEAN DEFAULT FALSE,
    is_simulation       BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_animal_alerts_farm ON animal_behavior_alerts(farm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animal_alerts_unresolved ON animal_behavior_alerts(farm_id, is_resolved) WHERE is_resolved = FALSE;

-- 4. behavior_logs: Legacy / Compatibility rollup table
CREATE TABLE IF NOT EXISTS behavior_logs (
    id                  BIGSERIAL PRIMARY KEY,
    farm_id             UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    standing_pct        NUMERIC(5, 2) DEFAULT 0.00,
    lying_pct           NUMERIC(5, 2) DEFAULT 0.00,
    feeding_pct         NUMERIC(5, 2) DEFAULT 0.00,
    drinking_pct        NUMERIC(5, 2) DEFAULT 0.00,
    cow_comfort_index   NUMERIC(5, 2) DEFAULT 85.00,
    total_cows          INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_behavior_logs_farm ON behavior_logs(farm_id, recorded_at DESC);

COMMIT;
