-- ============================================================
-- CowCare AI — Migration 005: Alerts Feedback & System Calibration
-- Adds human-in-the-loop validation feedback columns to animal_behavior_alerts
-- ============================================================

BEGIN;

-- Add human-in-the-loop feedback columns to animal_behavior_alerts if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'animal_behavior_alerts' AND column_name = 'is_accurate'
    ) THEN
        ALTER TABLE animal_behavior_alerts 
        ADD COLUMN is_accurate BOOLEAN DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'animal_behavior_alerts' AND column_name = 'feedback_note'
    ) THEN
        ALTER TABLE animal_behavior_alerts 
        ADD COLUMN feedback_note TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'animal_behavior_alerts' AND column_name = 'feedback_at'
    ) THEN
        ALTER TABLE animal_behavior_alerts 
        ADD COLUMN feedback_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_animal_alerts_feedback ON animal_behavior_alerts(is_accurate) WHERE is_accurate IS NOT NULL;

COMMIT;
