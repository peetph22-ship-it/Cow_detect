-- CowCare AI - เวลารีดนมและเวลาให้อาหารของฟาร์ม (2026-10-26)
-- admin กรอกครั้งเดียวตอนติดตั้ง (หน้าแก้ไขฟาร์ม) เก็บเป็น 'HH:MM' เวลาไทย
-- ใช้ตัดช่วงที่วัวยืนเพราะรีดนม/กินอาหารออก ตอนวิเคราะห์ % วัวนอนเทียบกับ THI รันซ้ำได้ปลอดภัย
ALTER TABLE tb_farms ADD COLUMN IF NOT EXISTS milking_times TEXT[];
ALTER TABLE tb_farms ADD COLUMN IF NOT EXISTS feeding_times TEXT[];
