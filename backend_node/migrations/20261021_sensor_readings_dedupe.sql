-- CowCare AI - Store-and-forward dedupe (2026-10-21)
-- บอร์ดอาจส่งค่าเดิมซ้ำเมื่อไม่ได้รับคำตอบจาก server (เน็ตหลุดกลางทาง)
-- unique index นี้ทำให้ INSERT ... ON CONFLICT DO NOTHING ข้ามค่าที่มีอยู่แล้ว
-- รันใน Supabase SQL Editor ก่อน deploy backend_node เวอร์ชันที่มี /api/sensors/batch
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS)

-- ถ้าคำสั่งด้านล่าง error เพราะมีข้อมูลซ้ำอยู่แล้ว ให้ดูรายการซ้ำด้วย query นี้ก่อน (ห้ามลบโดยไม่ตรวจ):
-- SELECT id_devices, recorded_at, COUNT(*) FROM tb_sensor_readings
-- GROUP BY 1, 2 HAVING COUNT(*) > 1 ORDER BY 3 DESC LIMIT 50;

CREATE UNIQUE INDEX IF NOT EXISTS tb_sensor_readings_device_time_uniq
    ON tb_sensor_readings (id_devices, recorded_at);
