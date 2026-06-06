// =========================================================
//  db/queries/files.js
//  Query SQL sulla tabella `user_files`.
//  Ogni query filtra SEMPRE per user_id: è il recinto che
//  isola i dati di ogni utente.
// =========================================================

import { query } from '../pool.js';

// Tutti i file di un utente (file_name + contenuto).
// Usato da carica() per ricomporre l'oggetto aggregato.
export async function listaFile(userId) {
  const sql = `
    SELECT file_name, content
    FROM user_files
    WHERE user_id = $1
  `;
  const { rows } = await query(sql, [userId]);
  return rows; // [{ file_name, content }, ...]
}

// Contenuto di un singolo file per nome. Null se non esiste.
// (Correzione 3: "file assente" non è un errore.)
export async function leggiFile(userId, fileName) {
  const sql = `
    SELECT content
    FROM user_files
    WHERE user_id = $1 AND file_name = $2
  `;
  const { rows } = await query(sql, [userId, fileName]);
  return rows[0] ? rows[0].content : null;
}

// Upsert di un singolo file: crea o aggiorna.
// Il vincolo UNIQUE (user_id, file_name) rende l'operazione atomica.
export async function salvaFile(userId, fileName, content) {
  const sql = `
    INSERT INTO user_files (user_id, file_name, content)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, file_name)
    DO UPDATE SET content = EXCLUDED.content
    RETURNING file_name, updated_at
  `;
  const { rows } = await query(sql, [userId, fileName, content]);
  return rows[0];
}

// Elimina un file per UUID, ma solo se appartiene all'utente.
// Ritorna true se ha eliminato qualcosa, false altrimenti.
// (Correzione 5: eliminaFile lavora per id su due tabelle possibili.)
export async function eliminaFilePerId(userId, id) {
  const sql = `
    DELETE FROM user_files
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const { rows } = await query(sql, [id, userId]);
  return rows.length > 0;
}
