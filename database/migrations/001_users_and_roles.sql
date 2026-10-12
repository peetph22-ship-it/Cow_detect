-- ============================================================
-- CowCare AI — Migration 001: users
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email

CREATE TYPE user_role   AS ENUM ('admin', 'farmer', 'expert');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE,                        -- เอา NOT NULL ออก (เกษตรกรไม่มีอีเมล)
    password   TEXT NOT NULL,                        -- bcrypt hash
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) UNIQUE NOT NULL,          -- ใช้เป็น Username ห้ามซ้ำ
    organization    VARCHAR(255),                         -- สำหรับเก็บชื่อสังกัด (แอดมิน, หมอ)
    avatar_url      TEXT,
    role            user_role   NOT NULL DEFAULT 'farmer',
    status          user_status NOT NULL DEFAULT 'pending',
    line_user_id    VARCHAR(64) UNIQUE,                   -- สำหรับแจ้งเตือน LINE
    last_login_at   TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ                           -- soft delete
);

CREATE INDEX idx_users_role   ON users (role)   WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Seed: Admin คนแรก (⚠️ เปลี่ยน email/รหัสผ่านก่อนรัน)
INSERT INTO users (phone, email, password, full_name, role, status, organization)
VALUES (
    '0800000000',
    'admin@cowcare.ai',
    crypt('ChangeMe_123!', gen_salt('bf', 10)),
    'System Administrator',
    'admin',
    'active',
    'ศูนย์ควบคุม CowCare AI'
);
