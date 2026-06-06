// =========================================================
//  services/auth.service.js
//  Logica di dominio dell'autenticazione: hashing/confronto
//  password (bcrypt) e orchestrazione di registrazione, login,
//  verifica email e reset password.
//  Non sa nulla di HTTP: riceve dati, lavora, ritorna risultati.
// =========================================================

import bcrypt from 'bcrypt';
import { config } from '../config/env.js';
import {
  creaUtente,
  trovaUtentePerEmail,
  trovaUtentePerId,
  aggiornaUltimoLogin,
  impostaEmailVerificata,
  aggiornaPasswordHash,
} from '../db/queries/users.js';
import { impostaRuolo } from '../db/queries/admin.js';
import {
  firmaJwt,
  creaTokenEmail,
  consumaTokenEmail,
} from './token.service.js';
import {
  inviaEmailVerifica,
  inviaEmailReset,
} from './email.service.js';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
} from '../utils/errors.js';

// Normalizza l'email (minuscole + trim) per confronti coerenti.
function normalizzaEmail(email) {
  return String(email).trim().toLowerCase();
}

// Restituisce la "vista pubblica" di un utente (mai il password_hash).
function utentePubblico(u) {
  return {
    id: u.id,
    email: u.email,
    nome: u.nome ?? null,
    email_verified: u.email_verified,
    role: u.role ?? 'user',
  };
}

// ---------- Registrazione ----------
export async function registra({ email, password, nome }) {
  const emailNorm = normalizzaEmail(email);

  // Email già in uso?
  const esistente = await trovaUtentePerEmail(emailNorm);
  if (esistente) {
    throw new ConflictError('Email già registrata', 'EMAIL_IN_USE');
  }

  // Hash della password.
  const passwordHash = await bcrypt.hash(password, config.bcryptCost);

  // Crea l'utente (email_verified = false di default).
  const utente = await creaUtente({ email: emailNorm, passwordHash, nome });

  // Auto-promozione del primo admin: se l'email combacia con FIRST_ADMIN_EMAIL
  // (impostata dal proprietario nell'ambiente), l'account nasce già admin.
  // Comodo al primo avvio: niente passaggi manuali. Resta comunque disponibile
  // lo script ./scripts/create-admin.sh come metodo manuale.
  if (config.firstAdminEmail && emailNorm === config.firstAdminEmail) {
    await impostaRuolo(utente.id, 'admin');
    utente.role = 'admin';
  }

  // Genera token di verifica e invia l'email (non blocca se Brevo è assente).
  const tokenGrezzo = await creaTokenEmail({ userId: utente.id, tipo: 'verify_email' });
  await inviaEmailVerifica({
    destinatario: utente.email,
    nome: utente.nome,
    tokenGrezzo,
  });

  // Poiché l'utente non verificato PUÒ accedere (scelta di prodotto),
  // emettiamo subito un JWT: entra e vede il banner "verifica email".
  const token = firmaJwt(utente.id);
  return { token, user: utentePubblico(utente) };
}

// ---------- Login ----------
export async function login({ email, password }) {
  const emailNorm = normalizzaEmail(email);
  const utente = await trovaUtentePerEmail(emailNorm);

  // Messaggio generico in entrambi i casi (anti-enumerazione):
  // non riveliamo se l'email esiste o se è la password a essere errata.
  if (!utente) {
    throw new UnauthorizedError('Credenziali non valide', 'INVALID_CREDENTIALS');
  }

  const ok = await bcrypt.compare(password, utente.password_hash);
  if (!ok) {
    throw new UnauthorizedError('Credenziali non valide', 'INVALID_CREDENTIALS');
  }

  await aggiornaUltimoLogin(utente.id);
  const token = firmaJwt(utente.id);
  return { token, user: utentePubblico(utente) };
}

// ---------- Dati dell'utente corrente (GET /me) ----------
export async function utenteCorrente(userId) {
  const utente = await trovaUtentePerId(userId);
  if (!utente) {
    throw new UnauthorizedError('Utente non trovato', 'USER_NOT_FOUND');
  }
  return utentePubblico(utente);
}

// ---------- Verifica email ----------
export async function verificaEmail(tokenGrezzo) {
  const userId = await consumaTokenEmail({ tokenGrezzo, tipo: 'verify_email' });
  if (!userId) {
    throw new BadRequestError('Token di verifica non valido o scaduto', 'INVALID_TOKEN');
  }
  await impostaEmailVerificata(userId);
  return { verificata: true };
}

// ---------- Rinvio email di verifica ----------
export async function rinviaVerifica(userId) {
  const utente = await trovaUtentePerId(userId);
  if (!utente) {
    throw new UnauthorizedError('Utente non trovato', 'USER_NOT_FOUND');
  }
  // Se già verificata, non c'è nulla da fare.
  if (utente.email_verified) {
    return { giaVerificata: true };
  }
  const tokenGrezzo = await creaTokenEmail({ userId, tipo: 'verify_email' });
  await inviaEmailVerifica({
    destinatario: utente.email,
    nome: utente.nome,
    tokenGrezzo,
  });
  return { inviata: true };
}

// ---------- Password dimenticata (richiesta link) ----------
// IMPORTANTE: risponde sempre allo stesso modo, esista o no l'email
// (anti-enumerazione). Il controller restituirà un messaggio neutro.
export async function richiediResetPassword(email) {
  const emailNorm = normalizzaEmail(email);
  const utente = await trovaUtentePerEmail(emailNorm);

  if (utente) {
    const tokenGrezzo = await creaTokenEmail({ userId: utente.id, tipo: 'reset_password' });
    await inviaEmailReset({
      destinatario: utente.email,
      nome: utente.nome,
      tokenGrezzo,
    });
  }
  // Nessuna informazione sul fatto che l'utente esista o meno.
  return { ok: true };
}

// ---------- Reset password (con token dal link) ----------
export async function reimpostaPassword({ tokenGrezzo, nuovaPassword }) {
  const userId = await consumaTokenEmail({ tokenGrezzo, tipo: 'reset_password' });
  if (!userId) {
    throw new BadRequestError('Token di reset non valido o scaduto', 'INVALID_TOKEN');
  }
  const passwordHash = await bcrypt.hash(nuovaPassword, config.bcryptCost);
  await aggiornaPasswordHash(userId, passwordHash);
  return { reimpostata: true };
}
