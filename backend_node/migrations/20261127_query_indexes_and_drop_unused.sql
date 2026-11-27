-- 20261127: index ให้ query ค่าเซ็นเซอร์ + ลบตารางที่ไม่มีโค้ดใช้แล้ว
-- รันใน Supabase SQL Editor ทั้งไฟล์ (อยู่ใน BEGIN/COMMIT: พังตรงไหน = ไม่มีอะไรเปลี่ยน)
--
-- 1) เติม tb_sensor_readings.id_farms ที่ยังว่าง จากฟาร์มที่กล่องผูกอยู่
--    โค้ดใหม่อ่านค่าของฟาร์มด้วย sr.id_farms อย่างเดียว (ใช้ index ได้) ตรวจ 27 พ.ย.: ว่าง 0 แถว ข้อนี้กันไว้เผื่อ
-- 2) index recorded_at สำหรับ "ค่าล่าสุดของทั้งระบบ" (หน้า Dashboard / sensors/latest) และ index ของ tb_camera_frames
-- 3) ลบตารางที่ไม่มีโค้ดใน repo อ่าน/เขียนแล้ว (ตรวจ 27 พ.ย. แบบอ่านอย่างเดียว):
--      tb_alerts (0 แถว) · tb_ai_advices (0) · tb_thi_forecasts (0) · tb_behavior_logs (0) · behavior_logs (0)
--      tb_farmer_daily_actions (4 แถว = เช็กลิสต์ทดสอบวันที่ 24 ต.ค. จากหน้าเกษตรกรเดิมที่ถูกตัดออก ทุกแถว is_done = false)
--    ไม่ใช้ CASCADE: ถ้ามีอะไรอ้างถึงตารางเหล่านี้นอกเหนือที่ตรวจไว้ คำสั่งจะ error และไม่ลบอะไรเลย
--    ลบแล้วกู้คืนไม่ได้ (นอกจากจาก backup ของ Supabase)

BEGIN;

UPDATE tb_sensor_readings sr
SET id_farms = d.id_farms
FROM tb_devices d
WHERE sr.id_devices = d.id_devices
  AND sr.id_farms IS NULL
  AND d.id_farms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON tb_sensor_readings (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_camera_frames_farm_received ON tb_camera_frames (id_farms, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_camera_frames_received ON tb_camera_frames (received_at);

-- ลำดับตาม foreign key: tb_alerts -> tb_ai_advices -> tb_thi_forecasts
DROP TABLE IF EXISTS tb_alerts;
DROP TABLE IF EXISTS tb_ai_advices;
DROP TABLE IF EXISTS tb_thi_forecasts;
DROP TABLE IF EXISTS tb_behavior_logs;
DROP TABLE IF EXISTS behavior_logs;
DROP TABLE IF EXISTS tb_farmer_daily_actions;

COMMIT;

-- ตรวจหลังรัน (ควรได้ 0 แถว และเห็น index ใหม่ 3 ตัว)
-- SELECT count(*) FROM tb_sensor_readings WHERE id_farms IS NULL;
-- SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_sensor_readings_recorded_at','idx_camera_frames_farm_received','idx_camera_frames_received');
