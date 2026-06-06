// =========================================================
//  db/pool.js
//  Crea il pool di connessioni a PostgreSQL (driver pg).
//  Un pool riusa un insieme di connessioni invece di aprirne
//  una nuova a ogni query: più efficiente e standard.
// =========================================================

import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Molti hosting gestiti (DigitalOcean, Render, ...) richiedono SSL.
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
});

// Log di un eventuale errore imprevisto su una connessione inattiva.
pool.on('error', (err) => {
  console.error('[db] Errore imprevisto sul pool di connessioni:', err.message);
});

// Helper comodo per eseguire una query. Restituisce il result di pg.
//   const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
export function query(text, params) {
  return pool.query(text, params);
}

// Chiude il pool in modo pulito (usato allo spegnimento del server).
export async function chiudiPool() {
  await pool.end();
}
