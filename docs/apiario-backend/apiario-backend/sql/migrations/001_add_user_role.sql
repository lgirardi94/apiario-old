-- =========================================================
--  Migration 001 — aggiunge il ruolo agli utenti
--  Esegui SOLO se hai già creato il database PRIMA dell'aggiunta
--  del pannello admin. Su un database nuovo, schema.sql include già
--  la colonna 'role'.
--
--  Uso:
--    psql "$DATABASE_URL" -f sql/migrations/001_add_user_role.sql
-- =========================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Vincolo sui valori ammessi (aggiunto separatamente per compatibilità).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;
