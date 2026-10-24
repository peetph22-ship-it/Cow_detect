-- CowCare AI - เช็คลิสต์สิ่งที่ทำแล้วในแต่ละวันของหน้าเกษตรกร (2026-10-27)
-- เกษตรกรแค่แตะติ๊ก (ไม่ต้องกรอกตัวเลข) รันซ้ำได้ปลอดภัย
-- เดิมไฟล์นี้มีตารางบันทึกน้ำนม/สุขภาพรายวัน และ SOS ด้วย ตัดออกแล้ว:
--   บันทึกรายวันขัดกับหลัก "เกษตรกรไม่ต้องกรอกข้อมูลรายวัน" และ SOS ไม่มีใครรับเรื่องจริง
CREATE TABLE IF NOT EXISTS tb_farmer_daily_actions (
    id BIGSERIAL PRIMARY KEY,
    id_farms UUID NOT NULL REFERENCES tb_farms(id_farms) ON DELETE CASCADE,
    action_date DATE NOT NULL DEFAULT CURRENT_DATE,
    action_key VARCHAR(50) NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tb_farmer_daily_actions_farm_date_key_uniq UNIQUE (id_farms, action_date, action_key)
);

CREATE INDEX IF NOT EXISTS idx_farmer_daily_actions_farm_date ON tb_farmer_daily_actions(id_farms, action_date);
