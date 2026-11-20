-- Estórias "Registrar avaliação física" e "Registrar carga/peso por aparelho".
-- Migração aditiva e idempotente, executada na inicialização do backend.
-- A avaliação física é opcional: nenhum aluno precisa ter avaliação, e só data, peso e altura são exigidos nela.

CREATE TABLE IF NOT EXISTS physical_assessments (
    id UUID PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id),
    assessment_date DATE NOT NULL,
    sex VARCHAR(1),
    age_years INTEGER,
    objective VARCHAR(255),
    parq_answers VARCHAR(7),
    health_notes TEXT,
    resting_heart_rate INTEGER,
    systolic_pressure INTEGER,
    diastolic_pressure INTEGER,
    weight_kg NUMERIC(5,2) NOT NULL,
    height_cm NUMERIC(5,1) NOT NULL,
    chest_cm NUMERIC(5,1),
    waist_cm NUMERIC(5,1),
    abdomen_cm NUMERIC(5,1),
    hip_cm NUMERIC(5,1),
    right_arm_cm NUMERIC(5,1),
    left_arm_cm NUMERIC(5,1),
    right_thigh_cm NUMERIC(5,1),
    left_thigh_cm NUMERIC(5,1),
    right_calf_cm NUMERIC(5,1),
    left_calf_cm NUMERIC(5,1),
    body_fat_method VARCHAR(20) NOT NULL,
    skinfold_chest_mm NUMERIC(4,1),
    skinfold_midaxillary_mm NUMERIC(4,1),
    skinfold_triceps_mm NUMERIC(4,1),
    skinfold_subscapular_mm NUMERIC(4,1),
    skinfold_abdominal_mm NUMERIC(4,1),
    skinfold_suprailiac_mm NUMERIC(4,1),
    skinfold_thigh_mm NUMERIC(4,1),
    informed_body_fat_percent NUMERIC(4,1),
    notes TEXT,
    assessed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assessed_by_name VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_physical_assessments_member_date
    ON physical_assessments(member_id, assessment_date DESC);

CREATE TABLE IF NOT EXISTS exercise_load_logs (
    id UUID PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id),
    workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE SET NULL,
    exercise_name VARCHAR(150) NOT NULL,
    equipment VARCHAR(100),
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    load_kg NUMERIC(6,2) NOT NULL,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exercise_load_logs_member_logged
    ON exercise_load_logs(member_id, logged_at DESC);
