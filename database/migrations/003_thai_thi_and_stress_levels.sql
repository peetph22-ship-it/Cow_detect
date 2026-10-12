-- ============================================================
-- CowCare AI — Migration 003: Thai-Holstein THI & Stress Levels
-- อิงตามงานวิจัยโคนมไทย:
--   1. Boonkum et al. (Animals 2024) DOI: 10.3390/ani14203026
--   2. Sungkhapreecha et al. (Vet. Sci. 2022) DOI: 10.3390/vetsci9020066
--
-- วิธีรัน: คัดลอกโค้ดนี้ไปรันใน Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. เพิ่มคอลัมน์ stress_level คำนวณระดับความเครียดอัตโนมัติใน sensor_readings
ALTER TABLE sensor_readings 
ADD COLUMN IF NOT EXISTS stress_level alert_level GENERATED ALWAYS AS (
    CASE
        WHEN ((1.8 * temperature_c + 32) - (0.55 - 0.0055 * humidity_pct) * (1.8 * temperature_c - 26)) < 76.0 THEN 'normal'::alert_level
        WHEN ((1.8 * temperature_c + 32) - (0.55 - 0.0055 * humidity_pct) * (1.8 * temperature_c - 26)) < 80.0 THEN 'mild'::alert_level
        WHEN ((1.8 * temperature_c + 32) - (0.55 - 0.0055 * humidity_pct) * (1.8 * temperature_c - 26)) < 84.0 THEN 'moderate'::alert_level
        ELSE 'severe'::alert_level
    END
) STORED;

-- สร้าง Index เพื่อให้การดึงข้อมูลตามระดับความเสี่ยงเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_sensor_readings_stress 
ON sensor_readings (farm_id, stress_level, recorded_at DESC);

-- 2. ฟังก์ชันคำนวณ THI (NRC 1971 / NOAA 1976)
CREATE OR REPLACE FUNCTION fn_calculate_thi(temp NUMERIC, rh NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    RETURN ROUND(
        (1.8 * temp + 32) - (0.55 - 0.0055 * rh) * (1.8 * temp - 26), 
        2
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. ฟังก์ชันประเมินระดับความเสี่ยงตามเกณฑ์โคนมไทย (Thai-Holstein Norm)
CREATE OR REPLACE FUNCTION fn_thi_to_stress_level(thi_val NUMERIC)
RETURNS alert_level AS $$
BEGIN
    IF thi_val < 76.0 THEN
        RETURN 'normal'::alert_level;
    ELSIF thi_val < 80.0 THEN
        RETURN 'mild'::alert_level;
    ELSIF thi_val < 84.0 THEN
        RETURN 'moderate'::alert_level;
    ELSE
        RETURN 'severe'::alert_level;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. ฟังก์ชันประเมินปริมาณน้ำนมที่สูญเสีย (Milk Loss Estimate - kg/day)
-- อิงตามงานวิจัย Boonkum et al. (2024):
--   - THI < 76: สูญเสีย 0.00 กก.
--   - THI >= 76: เฉลี่ยลดลง 0.284 กก./วัน ต่อหน่วย THI ที่เกิน 76
CREATE OR REPLACE FUNCTION fn_estimate_milk_loss_kg(thi_val NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    IF thi_val < 76.0 THEN
        RETURN 0.00;
    ELSE
        RETURN ROUND((thi_val - 76.0) * 0.284, 2);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. VIEW แสดงสถานะเซ็นเซอร์ล่าสุดพร้อมคำแนะนำการจัดการเชิงรุก
CREATE OR REPLACE VIEW v_latest_sensor_readings AS
SELECT 
    sr.id,
    sr.farm_id,
    f.name AS farm_name,
    sr.device_id,
    d.name AS device_name,
    d.serial_no,
    sr.temperature_c,
    sr.humidity_pct,
    sr.thi,
    sr.stress_level,
    CASE sr.stress_level
        WHEN 'normal'   THEN 'สบายดี สภาพแวดล้อมเหมาะสม'
        WHEN 'mild'     THEN 'เริ่มได้รับผลกระทบ ควรเปิดพัดลมระบายอากาศ'
        WHEN 'moderate' THEN 'เสี่ยงปานกลาง ควรเปิดพัดลมและสเปรย์น้ำ เลี่ยงการผสมเทียมช่วงบ่าย'
        WHEN 'severe'   THEN 'วิกฤตรุนแรง ลดความร้อนฉุกเฉินและเสริมสารบัฟเฟอร์ในอาหารป้องกันกรดในกระเพาะ'
    END AS action_recommendation,
    fn_estimate_milk_loss_kg(sr.thi) AS estimated_milk_loss_kg_day,
    sr.recorded_at
FROM sensor_readings sr
JOIN farms f ON f.id = sr.farm_id
JOIN devices d ON d.id = sr.device_id
ORDER BY sr.recorded_at DESC;
