// =========================================================
//  db/init.js
//  Esegue sql/schema.sql per creare le tabelle.
//  Uso:  npm run db:init
//  È sicuro rieseguirlo: lo schema usa "CREATE TABLE IF NOT EXISTS".
// =========================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, chiudiPool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '..', '..', 'sql', 'schema.sql');

async function init() {
  try {
    console.log('[db:init] Lettura schema da', schemaPath);
    const sql = await readFile(schemaPath, 'utf8');

    console.log('[db:init] Esecuzione dello schema...');
    await pool.query(sql);

    console.log('[db:init] ✓ Schema creato/aggiornato con successo.');
  } catch (err) {
    console.error('[db:init] ✗ Errore durante l\'inizializzazione:', err.message);
    process.exitCode = 1;
  } finally {
    await chiudiPool();
  }
}

init();
