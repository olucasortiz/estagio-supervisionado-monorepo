-- História 16: migração aditiva e idempotente. Nenhum histórico legado é reconstruído.
CREATE TABLE IF NOT EXISTS workout_sheet_history (
    id UUID PRIMARY KEY,
    workout_sheet_id UUID NOT NULL REFERENCES workout_sheets(id) ON DELETE CASCADE,
    change_reason TEXT,
    snapshot JSONB,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE workout_sheets ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE workout_sheet_history ADD COLUMN IF NOT EXISTS snapshot JSONB;
ALTER TABLE workout_sheet_history ADD COLUMN IF NOT EXISTS changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE workout_sheet_history ADD COLUMN IF NOT EXISTS changed_by_name VARCHAR(150);
CREATE INDEX IF NOT EXISTS idx_workout_sheet_history_sheet_created
    ON workout_sheet_history(workout_sheet_id, created_at DESC);
