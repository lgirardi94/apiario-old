// =========================================================
//  db/queries/authTokens.js
//  Query SQL sulla tabella `auth_tokens` (verifica email e reset password).
//  Nel DB si salva solo l'HASH del token, mai il token in chiaro.
// =========================================================

import { query } from '../pool.js';

// Inserisce un nuovo token (già hashato) con la sua scadenza.
export async function creaToken({ userId, tokenHash, tipo, expiresAt }) {
  const sql = `
    INSERT INTO auth_tokens (user_id, token_hash, tipo, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const { rows } = await query(sql, [userId, tokenHash, tipo, expiresAt]);
  return rows[0];
}

// Cerca un token valido a partire dal suo hash e tipo.
// "Valido" = non scaduto e non ancora usato. Null altrimenti.
export async function trovaTokenValido({ tokenHash, tipo }) {
  const sql = `
    SELECT id, user_id, tipo, expires_at, used_at
    FROM auth_tokens
    WHERE token_hash = $1
      AND tipo = $2
      AND used_at IS NULL
      AND expires_at > now()
  `;
  const { rows } = await query(sql, [tokenHash, tipo]);
  return rows[0] ?? null;
}

// Marca un token come usato (usa-e-getta).
export async function marcaTokenUsato(id) {
  await query('UPDATE auth_tokens SET used_at = now() WHERE id = $1', [id]);
}

// Invalida tutti i token pendenti di un certo tipo per un utente.
// Utile prima di emetterne uno nuovo, o dopo un reset riuscito.
export async function invalidaTokenPendenti({ userId, tipo }) {
  const sql = `
    UPDATE auth_tokens
    SET used_at = now()
    WHERE user_id = $1
      AND tipo = $2
      AND used_at IS NULL
  `;
  await query(sql, [userId, tipo]);
}
