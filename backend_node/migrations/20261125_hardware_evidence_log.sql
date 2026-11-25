-- CowCare AI - หลักฐานฝั่งฮาร์ดแวร์สำหรับเปเปอร์ (2026-11-25)
-- เดิม heartbeat เขียนทับ tb_devices.health ทุก 5 นาที และขนาด/เวลาส่งของภาพไม่ถูกเก็บ
-- จึงคำนวณ uptime, การรีบูต, สัญญาณ Wi-Fi, ปริมาณเน็ต และความหน่วงย้อนหลังไม่ได้
--
-- 1) tb_device_heartbeats: เก็บ heartbeat ทุกครั้ง (ทุก 5 นาที ≈ 288 แถว/วัน/กล่อง)
-- 2) tb_camera_frames: ทุกภาพที่กล่องส่งมา (รวมภาพที่ server ตอบ 429) ขนาดไฟล์ เวลาถ่าย เวลาที่ server ได้รับ
--    (ทุก 15 วิ ≈ 5,760 แถว/วัน/กล่อง)
-- 3) tb_sensor_readings.received_at: เวลาที่ server ได้รับค่า (ค่าเริ่มต้น NOW() ไม่ต้องแก้โค้ดส่วนบันทึก)
--    เทียบกับ recorded_at (เวลาที่กล่องวัด) = ค่าที่ค้างในคิวตอนเน็ตหลุดใช้เวลากี่นาทีกว่าจะถึง
--    แถวเก่าก่อน migration นี้จะได้ received_at = เวลาที่รัน migration (อย่าใช้วัดย้อนหลัง)
--
-- ชนิดของ id อุปกรณ์/ฟาร์มอ่านจากตารางจริง (ไม่เดา) · รันซ้ำได้ปลอดภัย (ผู้ใช้นำไปรันใน Supabase SQL Editor เอง)

DO $$
DECLARE
    dev_t  TEXT;
    farm_t TEXT;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod) INTO dev_t
      FROM pg_attribute a WHERE a.attrelid = 'tb_devices'::regclass AND a.attname = 'id_devices';
    SELECT format_type(a.atttypid, a.atttypmod) INTO farm_t
      FROM pg_attribute a WHERE a.attrelid = 'tb_farms'::regclass AND a.attname = 'id_farms';

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS tb_device_heartbeats (
            id          BIGSERIAL PRIMARY KEY,
            id_devices  %s NOT NULL REFERENCES tb_devices(id_devices) ON DELETE CASCADE,
            received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            health      JSONB NOT NULL
        )$sql$, dev_t);

    EXECUTE format($sql$
        CREATE TABLE IF NOT EXISTS tb_camera_frames (
            id          BIGSERIAL PRIMARY KEY,
            id_devices  %s NOT NULL REFERENCES tb_devices(id_devices) ON DELETE CASCADE,
            id_farms    %s,
            captured_at TIMESTAMPTZ NOT NULL,
            received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            bytes       INTEGER NOT NULL,
            status      TEXT NOT NULL CHECK (status IN ('accepted', 'busy'))
        )$sql$, dev_t, farm_t);
END $$;

CREATE INDEX IF NOT EXISTS idx_device_heartbeats_device_time ON tb_device_heartbeats (id_devices, received_at);
CREATE INDEX IF NOT EXISTS idx_camera_frames_device_time ON tb_camera_frames (id_devices, captured_at);

-- เปิด RLS แบบไม่มี policy: อ่าน/เขียนได้เฉพาะ backend (ไม่เปิดผ่าน Supabase REST)
ALTER TABLE tb_device_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_camera_frames ENABLE ROW LEVEL SECURITY;

ALTER TABLE tb_sensor_readings ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW();
