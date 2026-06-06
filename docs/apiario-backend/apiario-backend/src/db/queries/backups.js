// =========================================================
//  db/queries/backups.js
//  Query SQL sulla tabella `user_backups`.
//  Anche qui ogni query filtra per user_id.
// =========================================================

import { query } from '../pool.js';

// Lista dei backup di un utente, dal più recente.
// (Correzione 1: l'adapter si aspetta { id, name, modifiedTime }.
//  Qui restituiamo i campi grezzi; il service li mappa in quella forma.)
export async function listaBackup(userId) {
  const sql = `
    SELECT id, backup_name, created_at
    FROM user_backups
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await query(sql, [userId]);
  return rows; // [{ id, backup_name, created_at }, ...]
}

// Inserisce un nuovo backup datato.
export async function creaBackup(userId, backupName, content) {
  const sql = `
    INSERT INTO user_backups (user_id, backup_name, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, backup_name)
    DO UPDATE SET content = EXCLUDED.content, created_at = now()
    RETURNING id, backup_name, created_at
  `;
  const { rows } = await query(sql, [userId, backupName, content]);
  return rows[0];
}

// Mantiene solo i `max` backup più recenti dell'utente, elimina gli altri.
// Implementa la logica creaBackup(dati, max) del frontend.
export async function eliminaBackupVecchi(userId, max) {
  const sql = `
    DELETE FROM user_backups
    WHERE user_id = $1
      AND id NOT IN (
        SELECT id FROM user_backups
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      )
  `;
  await query(sql, [userId, max]);
}

// Elimina un backup per UUID, solo se appartiene all'utente.
// Ritorna true se ha eliminato qualcosa.
export async function eliminaBackupPerId(userId, id) {
  const sql = `
    DELETE FROM user_backups
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const { rows } = await query(sql, [id, userId]);
  return rows.length > 0;
}
