-- CowCare AI - Farm heat-tolerance profile (2026-10-21)
-- เลือกชุดเกณฑ์ THI ต่อฟาร์ม (ดู backend_node/app/services/heatStress.js)
--   default : โคนมลูกผสมไทยทั่วไป (Boonkum et al., 2024)
--   high_hf : สายเลือดโฮลสไตน์ >= 87.5% หรือแม่โคหลายท้อง (Boonkum et al., 2011)
-- รันซ้ำได้ปลอดภัย

ALTER TABLE tb_farms ADD COLUMN IF NOT EXISTS hf_profile TEXT NOT NULL DEFAULT 'default';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tb_farms_hf_profile_check') THEN
        ALTER TABLE tb_farms ADD CONSTRAINT tb_farms_hf_profile_check CHECK (hf_profile IN ('default', 'high_hf'));
    END IF;
END $$;
