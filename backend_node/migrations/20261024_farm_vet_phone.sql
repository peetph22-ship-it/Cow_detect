-- CowCare AI - เบอร์สัตวแพทย์/สหกรณ์ประจำฟาร์ม (2026-10-24)
-- หน้าเกษตรกรใช้แสดงปุ่มโทร (admin กรอกในหน้าแก้ไขฟาร์ม) รันซ้ำได้ปลอดภัย
ALTER TABLE tb_farms ADD COLUMN IF NOT EXISTS vet_phone TEXT;
