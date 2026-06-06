// =========================================================
//  db/migrate.js
//  Inizializza/aggiorna il database SENZA bisogno di psql: usa il
//  driver pg, quindi funziona ovunque giri Node (incluso il
//  "pre-deploy" / console dei provider come App Platform o Render).
//
//   1. esegue sql/schema.sql (idempotente: CREATE ... IF NOT EXISTS)
//   2. assicura la tabella schema_migrations (storico applicato)
//   3. applica le migration in sql/migrations/*.sql NON ancora registrate,
//      ognuna in una transazione. Se una fallisce → ROLLBACK e stop
//      (nessun errore mascherato, a differenza del vecchio approccio).
//
//  Uso:  npm run db:migrate
//  È sicuro rieseguirlo: applica solo ciò che manca.
// =========================================================

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, chiudiPool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, '..', '..', 'sql');
const schemaPath = join(sqlDir, 'schema.sql');
const migrationsDir = join(sqlDir, 'migrations');

// 1) Schema base (idempotente).
async function applicaSchema() {
  console.log('[db:migrate] Applico schema.sql...');
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('[db:migrate] ✓ schema.sql applicato.');
}

// 2) Tabella che tiene traccia delle migration già applicate.
async function assicuraTabellaMigrazioni() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

// Elenco (ordinato) delle migration non ancora applicate.
async function migrazioniDaApplicare() {
  let files = [];
  try {
    files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort(); // ordine lessicografico: 001_, 002_, ...
  } catch {
    return []; // cartella assente: nessuna migration
  }
  const { rows } = await pool.query('SELECT version FROM schema_migrations');
  const applicate = new Set(rows.map((r) => r.version));
  return files.filter((f) => !applicate.has(f));
}

// 3) Applica UNA migration dentro una transazione e la registra.
async function applicaMigrazione(file) {
  const sql = await readFile(join(migrationsDir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`[db:migrate] ✓ migration applicata: ${file}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`Migration ${file} fallita (ROLLBACK eseguito): ${err.message}`);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await applicaSchema();
    await assicuraTabellaMigrazioni();

    const pendenti = await migrazioniDaApplicare();
    if (pendenti.length === 0) {
      console.log('[db:migrate] Nessuna migration da applicare (tutto aggiornato).');
    } else {
      console.log(`[db:migrate] ${pendenti.length} migration da applicare: ${pendenti.join(', ')}`);
      for (const f of pendenti) {
        await applicaMigrazione(f);
      }
    }

    console.log('[db:migrate] ✓ Database aggiornato con successo.');
  } catch (err) {
    console.error('[db:migrate] ✗ Errore:', err.message);
    process.exitCode = 1;
  } finally {
    await chiudiPool();
  }
}

main();
