-- CowCare AI - พิกัดฟาร์ม (2026-10-27)
-- admin กรอกครั้งเดียวตอนติดตั้ง (วางจาก Google Maps ในหน้าแก้ไขฟาร์ม)
-- ใช้ดึงอากาศภายนอกจาก Open-Meteo ให้ตรงจุดฟาร์ม (ไม่มีพิกัด = ใช้จุดกลางอำเภอโดยประมาณ) รันซ้ำได้ปลอดภัย
ALTER TABLE tb_farms ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE tb_farms ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
