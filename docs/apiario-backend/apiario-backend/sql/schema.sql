-- =========================================================
--  Schema database — "Il Mio Apiario" (Passo 2)
--  Approccio: JSONB disciplinato. Account isolati per utente.
--
--  Esegui questo file una volta per creare lo schema:
--    psql "$DATABASE_URL" -f sql/schema.sql
--  Oppure usa lo script: npm run db:init
-- =========================================================

-- Estensione per gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- Tabella: users
-- Un record per ogni apicoltore registrato.
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    nome            TEXT,
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMPTZ
);

-- =========================================================
-- Tabella: user_files
-- I dati attivi: un JSON per ogni "file" dell'app, per utente.
-- Equivale a un file su Google Drive.
-- =========================================================
CREATE TABLE IF NOT EXISTS user_files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name   TEXT NOT NULL,
    content     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_file UNIQUE (user_id, file_name)
);

-- =========================================================
-- Tabella: user_backups
-- Snapshot datati dei dati di un utente.
-- =========================================================
CREATE TABLE IF NOT EXISTS user_backups (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    backup_name  TEXT NOT NULL,
    content      JSONB NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_backup UNIQUE (user_id, backup_name)
);

CREATE INDEX IF NOT EXISTS idx_backups_user_date
    ON user_backups (user_id, created_at DESC);

-- =========================================================
-- Tabella: auth_tokens
-- Token per verifica email e reset password.
-- Si salva l'HASH del token, mai il token in chiaro.
-- =========================================================
CREATE TABLE IF NOT EXISTS auth_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    tipo        TEXT NOT NULL CHECK (tipo IN ('verify_email', 'reset_password')),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens (user_id, tipo);

-- =========================================================
-- Trigger: aggiorna updated_at automaticamente su user_files
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_files_updated_at ON user_files;
CREATE TRIGGER trg_user_files_updated_at
    BEFORE UPDATE ON user_files
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
