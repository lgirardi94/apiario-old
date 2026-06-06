// =========================================================
//  services/token.service.js
//  Due famiglie di token:
//   1) JWT di sessione (firmati, contengono user_id e scadenza)
//   2) token email (verifica/reset): stringa casuale; nel DB se ne
//      salva solo l'HASH (SHA-256). Usa-e-getta, a scadenza.
// =========================================================

import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config/env.js';
import {
  creaToken,
  trovaTokenValido,
  marcaTokenUsato,
  invalidaTokenPendenti,
} from '../db/queries/authTokens.js';

// ---------- JWT di sessione ----------

// Firma un JWT con dentro l'id utente. Scadenza da config (es. 7 giorni).
export function firmaJwt(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Verifica un JWT. Ritorna l'id utente (campo "sub") se valido.
// Lancia un errore se il token è invalido o scaduto (gestito dal middleware).
export function verificaJwt(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  return payload.sub;
}

// ---------- Token email (verifica / reset) ----------

// Genera una stringa casuale (il token "in chiaro" che va nel link email)
// e ne calcola l'hash (ciò che si salva nel DB).
function generaTokenEmailGrezzo() {
  const grezzo = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(grezzo).digest('hex');
  return { grezzo, hash };
}

// Crea un token email di un certo tipo per un utente.
// Invalida prima eventuali token pendenti dello stesso tipo (uno alla volta).
// Ritorna il token GREZZO (da mettere nel link); nel DB resta solo l'hash.
export async function creaTokenEmail({ userId, tipo }) {
  await invalidaTokenPendenti({ userId, tipo });

  const { grezzo, hash } = generaTokenEmailGrezzo();

  const ttlOre =
    tipo === 'reset_password'
      ? config.resetTokenTtlHours
      : config.verifyTokenTtlHours;
  const expiresAt = new Date(Date.now() + ttlOre * 60 * 60 * 1000);

  await creaToken({ userId, tokenHash: hash, tipo, expiresAt });
  return grezzo;
}

// Verifica un token email grezzo (quello arrivato dal link).
// Se valido: lo marca come usato e ritorna l'id utente. Altrimenti null.
export async function consumaTokenEmail({ tokenGrezzo, tipo }) {
  const hash = crypto.createHash('sha256').update(tokenGrezzo).digest('hex');
  const record = await trovaTokenValido({ tokenHash: hash, tipo });
  if (!record) return null;

  await marcaTokenUsato(record.id);
  return record.user_id;
}
