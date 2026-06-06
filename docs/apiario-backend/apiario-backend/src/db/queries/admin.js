// =========================================================
//  db/queries/admin.js
//  Query SQL per il pannello admin: lista utenti con conteggi,
//  dettaglio, eliminazione, statistiche.
//  Usate SOLO da rotte protette dal middleware admin.
// =========================================================

import { query } from '../pool.js';

// Lista utenti con ricerca e paginazione opzionali.
// Include un conteggio di file e backup per ciascuno (panoramica rapida).
export async function listaUtenti({ cerca, limit = 50, offset = 0 } = {}) {
  const condizioni = [];
  const params = [];

  if (cerca) {
    params.push(`%${cerca}%`);
    // ricerca su email o nome (case-insensitive)
    condizioni.push(`(u.email ILIKE $${params.length} OR u.nome ILIKE $${params.length})`);
  }

  const where = condizioni.length ? `WHERE ${condizioni.join(' AND ')}` : '';

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const sql = `
    SELECT
      u.id, u.email, u.nome, u.email_verified, u.role,
      u.created_at, u.last_login_at,
      (SELECT COUNT(*) FROM user_files   f WHERE f.user_id = u.id) AS num_file,
      (SELECT COUNT(*) FROM user_backups b WHERE b.user_id = u.id) AS num_backup
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const { rows } = await query(sql, params);
  return rows;
}

// Conteggio totale utenti (per la paginazione), con stessa ricerca.
export async function contaUtenti({ cerca } = {}) {
  const params = [];
  let where = '';
  if (cerca) {
    params.push(`%${cerca}%`);
    where = `WHERE email ILIKE $1 OR nome ILIKE $1`;
  }
  const { rows } = await query(`SELECT COUNT(*)::int AS totale FROM users ${where}`, params);
  return rows[0].totale;
}

// Dettaglio di un utente: dati anagrafici + quanti dati possiede.
// Sbircia dentro il JSONB del file 'db' per contare arnie e visite.
export async function dettaglioUtente(userId) {
  const sql = `
    SELECT
      u.id, u.email, u.nome, u.email_verified, u.role,
      u.created_at, u.last_login_at,
      (SELECT COUNT(*) FROM user_files   f WHERE f.user_id = u.id) AS num_file,
      (SELECT COUNT(*) FROM user_backups b WHERE b.user_id = u.id) AS num_backup,
      COALESCE((
        SELECT jsonb_array_length(content->'arnie')
        FROM user_files
        WHERE user_id = u.id AND file_name = 'db'
          AND jsonb_typeof(content->'arnie') = 'array'
      ), 0) AS num_arnie,
      COALESCE((
        SELECT jsonb_array_length(content->'logBook')
        FROM user_files
        WHERE user_id = u.id AND file_name = 'db'
          AND jsonb_typeof(content->'logBook') = 'array'
      ), 0) AS num_visite
    FROM users u
    WHERE u.id = $1
  `;
  const { rows } = await query(sql, [userId]);
  return rows[0] ?? null;
}

// Elimina un utente. Grazie a ON DELETE CASCADE, spariscono anche
// tutti i suoi file, backup e token.
export async function eliminaUtente(userId) {
  const { rows } = await query(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [userId]
  );
  return rows.length > 0;
}

// Forza la verifica email di un utente (scorciatoia amministrativa).
export async function forzaVerificaEmail(userId) {
  const { rows } = await query(
    'UPDATE users SET email_verified = true WHERE id = $1 RETURNING id',
    [userId]
  );
  return rows.length > 0;
}

// Cambia il ruolo di un utente (es. promuovere/declassare admin).
export async function impostaRuolo(userId, role) {
  const { rows } = await query(
    'UPDATE users SET role = $1 WHERE id = $2 RETURNING id',
    [role, userId]
  );
  return rows.length > 0;
}

// Statistiche generali per la dashboard admin.
export async function statistiche() {
  const sql = `
    SELECT
      (SELECT COUNT(*)::int FROM users) AS totale_utenti,
      (SELECT COUNT(*)::int FROM users WHERE email_verified) AS utenti_verificati,
      (SELECT COUNT(*)::int FROM users WHERE created_at > now() - interval '7 days') AS nuovi_7_giorni,
      (SELECT COUNT(*)::int FROM users WHERE created_at > now() - interval '30 days') AS nuovi_30_giorni,
      (SELECT COUNT(*)::int FROM user_files) AS totale_file,
      (SELECT COUNT(*)::int FROM user_backups) AS totale_backup
  `;
  const { rows } = await query(sql);
  return rows[0];
}
