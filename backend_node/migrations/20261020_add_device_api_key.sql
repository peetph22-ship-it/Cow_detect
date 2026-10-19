-- CowCare AI - Device API Key (2026-10-20)
-- รันใน Supabase SQL Editor ก่อน deploy backend_node เวอร์ชันที่มี verifyDeviceKey
-- เก็บเฉพาะ SHA-256 hash ของ key เท่านั้น ตัว key จริงแสดงครั้งเดียวตอน rotate-key
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS)

ALTER TABLE tb_devices ADD COLUMN IF NOT EXISTS api_key_hash TEXT;
ALTER TABLE tb_devices ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ;
