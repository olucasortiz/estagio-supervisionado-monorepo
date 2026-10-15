-- ==============================================================================
-- SCRIPT DE MIGRAÇÃO MANUAL SEGURO — BUG-11 (HARDENING DE SENHAS INICIAIS)
-- Data: 2026-10-15
-- Módulo: Autenticação e Usuários (users)
-- Objetivo: Adicionar coluna 'must_change_password' para suporte a primeiro acesso
--           e expiração de senha inicial sem invalidar contas legadas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PRÉ-VERIFICAÇÃO (Executar antes para conferir a existência da tabela e coluna)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Abortando: A tabela users não existe no banco de dados.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. MIGRAÇÃO TRANSACIONAL IDEMPOTENTE
-- ------------------------------------------------------------------------------
BEGIN;

-- Adiciona a coluna com valor default FALSE para garantir que NENHUM usuário existente
-- seja bloqueado ou forçado a redefinir senha sem transição coordenada.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.must_change_password IS
'Flag indicadora de necessidade de redefinição de senha no próximo login (primeiro acesso ou reset administrativo).';

COMMIT;

-- ------------------------------------------------------------------------------
-- 3. PÓS-VERIFICAÇÃO (Validar o sucesso da migração)
-- ------------------------------------------------------------------------------
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'must_change_password';

-- ------------------------------------------------------------------------------
-- 4. SCRIPT DE ROLLBACK (Em caso de necessidade de reversão)
-- ------------------------------------------------------------------------------
/*
BEGIN;
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
COMMIT;
*/
