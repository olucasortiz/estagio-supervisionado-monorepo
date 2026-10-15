-- ==============================================================================
-- SCRIPT DE MIGRAÇÃO SEGURO E IDEMPOTENTE: BUG-16 (Histórico de Fichas de Treino)
-- Data: 2026-10-15
-- Alvo: PostgreSQL 15+ / Supabase (Lion Fitness)
-- Responsável: Equipe de Engenharia / Fase 4 - Sprint 1
-- ATENÇÃO: NÃO EXECUTAR EM PRODUÇÃO / SUPABASE SEM AUTORIZAÇÃO EXPRESSA PRÉVIA.
-- ==============================================================================

-- ==============================================================================
-- ETAPA 0: DIAGNÓSTICO E PRÉ-VERIFICAÇÕES (PRE-CHECKS)
-- Execute estas consultas antes de rodar a migração para inspecionar o estado atual.
-- ==============================================================================
/*
-- 0.1 Verificar se a tabela workout_sheet_history existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'workout_sheet_history'
) AS table_exists;

-- 0.2 Verificar colunas existentes em workout_sheet_history
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workout_sheet_history'
ORDER BY ordinal_position;

-- 0.3 Verificar colunas em workout_sheets e workout_exercises
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('workout_sheets', 'workout_exercises')
  AND column_name IN ('version', 'is_active', 'sort_order');
*/

-- ==============================================================================
-- ETAPA 1: PLANO DE BACKUP E SALVAGUARDA (BACKUP PLAN)
-- ==============================================================================
/*
1.1 Backup via pg_dump (Recomendado via CLI antes de qualquer alteração de schema):
    pg_dump -h <host-supabase> -p 5432 -U <user> -d postgres \
      -t workout_sheets -t workout_exercises -t workout_sheet_history \
      --data-only --inserts -f backup_workout_tables_$(date +%Y%m%d_%H%M%S).sql

1.2 Backup de segurança in-database (caso a tabela já exista com dados legados):
    CREATE TABLE IF NOT EXISTS workout_sheet_history_backup_20261015 AS 
    SELECT * FROM workout_sheet_history;
*/

-- ==============================================================================
-- ETAPA 2: MIGRAÇÃO DDL TRANSACIONAL E IDEMPOTENTE
-- ==============================================================================

BEGIN;
-- Compatibilidade com o histórico legado
ALTER TABLE public.workout_sheet_history
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE public.workout_sheet_history
SET created_at = changed_at
WHERE created_at IS NULL;
-- 2.1 Criar a tabela workout_sheet_history caso não exista na base Supabase
CREATE TABLE IF NOT EXISTS workout_sheet_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_sheet_id UUID NOT NULL,
    change_reason TEXT,
    snapshot JSONB,
    changed_by_user_id UUID,
    changed_by_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_wsh_workout_sheet FOREIGN KEY (workout_sheet_id) 
        REFERENCES workout_sheets(id) ON DELETE CASCADE,
    CONSTRAINT fk_wsh_changed_by_user FOREIGN KEY (changed_by_user_id) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- 2.2 Garantir que a tabela workout_sheets possui a coluna 'version' para lock otimista
ALTER TABLE workout_sheets 
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 2.3 Garantir que workout_exercises possui 'is_active' e 'sort_order'
ALTER TABLE workout_exercises 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE workout_exercises 
    ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 2.4 Caso workout_sheet_history já existisse com schema parcial antigo, adicionar colunas que faltavam
ALTER TABLE workout_sheet_history 
    ADD COLUMN IF NOT EXISTS snapshot JSONB;

ALTER TABLE workout_sheet_history 
    ADD COLUMN IF NOT EXISTS changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE workout_sheet_history 
    ADD COLUMN IF NOT EXISTS changed_by_name VARCHAR(150);

-- 2.5 Criação idempotente de índices para alta performance em consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_workout_sheet_history_sheet_created
    ON workout_sheet_history(workout_sheet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sheet_history_actor
    ON workout_sheet_history(changed_by_user_id);

COMMIT;

-- ==============================================================================
-- ETAPA 3: VALIDAÇÃO POSTERIOR (POST-VALIDATION CHECKS)
-- Execute após o COMMIT para certificar conformidade completa com WorkoutSheetHistoryRepository.
-- ==============================================================================
/*
-- 3.1 Conferência de colunas e tipos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workout_sheet_history'
ORDER BY ordinal_position;

-- Esperado:
-- id                 | uuid                     | NO
-- workout_sheet_id   | uuid                     | NO
-- change_reason      | text                     | YES
-- snapshot           | jsonb                    | YES
-- changed_by_user_id | uuid                     | YES
-- changed_by_name    | character varying        | YES
-- created_at         | timestamp with time zone | YES

-- 3.2 Teste de validação sintática da consulta do repositório Java
SELECT id, workout_sheet_id, change_reason, created_at, snapshot::text AS snapshot,
       changed_by_user_id, changed_by_name
FROM workout_sheet_history
LIMIT 5;

-- 3.3 Conferência dos índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'workout_sheet_history';
*/

-- ==============================================================================
-- ETAPA 4: ESTRATÉGIA DE RECUPERAÇÃO E ROLLBACK (ROLLBACK SCRIPT)
-- Utilizar somente em caso de necessidade técnica de reversão.
-- ==============================================================================
/*
BEGIN;

-- Se necessário desfazer colunas mantendo a tabela:
DROP INDEX IF EXISTS idx_workout_sheet_history_sheet_created;
DROP INDEX IF EXISTS idx_workout_sheet_history_actor;
ALTER TABLE workout_sheet_history DROP COLUMN IF EXISTS snapshot;
ALTER TABLE workout_sheet_history DROP COLUMN IF EXISTS changed_by_user_id;
ALTER TABLE workout_sheet_history DROP COLUMN IF EXISTS changed_by_name;

-- Se a tabela inteira foi criada nesta migração e não existia antes:
-- DROP TABLE IF EXISTS workout_sheet_history;

-- Se houver tabela de backup restaurar:
-- INSERT INTO workout_sheet_history SELECT * FROM workout_sheet_history_backup_20261015;

COMMIT;
*/
