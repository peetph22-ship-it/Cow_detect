-- CowCare AI - สถานะกล่องเซ็นเซอร์จาก heartbeat (2026-10-25)
-- firmware 1.4.0 ขึ้นไปส่ง POST /api/sensors/heartbeat ทุก 5 นาที รันซ้ำได้ปลอดภัย
ALTER TABLE tb_devices ADD COLUMN IF NOT EXISTS fw_version TEXT;
ALTER TABLE tb_devices ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
ALTER TABLE tb_devices ADD COLUMN IF NOT EXISTS health JSONB;
