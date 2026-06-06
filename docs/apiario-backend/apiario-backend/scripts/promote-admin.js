// =========================================================
//  scripts/promote-admin.js
//  Promuove ad admin un account GIÀ registrato, usando Node/pg
//  (nessun bisogno di psql). Utile come "backfill" quando l'account
//  esisteva già prima di impostare FIRST_ADMIN_EMAIL.
//
//  Uso:
//    node scripts/promote-admin.js                 (usa FIRST_ADMIN_EMAIL)
//    node scripts/promote-admin.js email@dominio.ch
//    npm run admin:promote -- email@dominio.ch
//
//  Nota: l'auto-promozione avviene già alla REGISTRAZIONE se l'email
//  combacia con FIRST_ADMIN_EMAIL. Questo script copre il caso in cui
//  l'utente si era registrato PRIMA. Lo script bash create-admin.sh
//  (via psql) resta come metodo manuale alternativo.
// =========================================================

import { pool, chiudiPool } from '../src/db/pool.js';
import { config } from '../src/config/env.js';

const email = (process.argv[2] || config.firstAdminEmail || '').trim().toLowerCase();

async function main() {
  if (!email) {
    console.error('[admin:promote] Nessuna email fornita e FIRST_ADMIN_EMAIL non impostata.');
    console.error('[admin:promote] Uso: npm run admin:promote -- email@dominio.ch');
    process.exitCode = 1;
    return;
  }
  try {
    const { rows } = await pool.query(
      "UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id",
      [email]
    );
    if (rows.length > 0) {
      console.log(`[admin:promote] ✓ ${email} ora è admin.`);
    } else {
      console.log(`[admin:promote] Nessun account con email ${email}.`);
      console.log('[admin:promote] Registrati dall\'app con questa email, poi rilancia.');
    }
  } catch (err) {
    console.error('[admin:promote] ✗ Errore:', err.message);
    process.exitCode = 1;
  } finally {
    await chiudiPool();
  }
}

main();
