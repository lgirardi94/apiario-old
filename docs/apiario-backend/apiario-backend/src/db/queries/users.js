// =========================================================
//  db/queries/users.js
//  Tutte le query SQL sulla tabella `users`.
//  Nessuna logica di dominio qui: solo accesso ai dati.
// =========================================================

import { query } from '../pool.js';

// Crea un nuovo utente. Ritorna i campi pubblici (mai il password_hash).
export async function creaUtente({ email, passwordHash, nome }) {
  const sql = `
    INSERT INTO users (email, password_hash, nome)
    VALUES ($1, $2, $3)
    RETURNING id, email, nome, email_verified, created_at
  `;
  const { rows } = await query(sql, [email, passwordHash, nome ?? null]);
  return rows[0];
}

// Cerca un utente per email. Ritorna ANCHE il password_hash
// (serve al login per il confronto). Null se non esiste.
export async function trovaUtentePerEmail(email) {
  const sql = `
    SELECT id, email, password_hash, nome, email_verified, role, created_at, last_login_at
    FROM users
    WHERE email = $1
  `;
  const { rows } = await query(sql, [email]);
  return rows[0] ?? null;
}

// Cerca un utente per id. Campi pubblici (senza password_hash). Null se assente.
export async function trovaUtentePerId(id) {
  const sql = `
    SELECT id, email, nome, email_verified, role, created_at, last_login_at
    FROM users
    WHERE id = $1
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] ?? null;
}

// Aggiorna il timestamp dell'ultimo login.
export async function aggiornaUltimoLogin(id) {
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
}

// Marca l'email come verificata.
export async function impostaEmailVerificata(id) {
  await query('UPDATE users SET email_verified = true WHERE id = $1', [id]);
}

// Aggiorna l'hash della password (usato dal reset password).
export async function aggiornaPasswordHash(id, passwordHash) {
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
}
