// =========================================================
//  controllers/auth.controller.js
//  Orchestra le richieste di autenticazione: legge l'input
//  (già validato dal middleware Zod), chiama auth.service,
//  formula la risposta HTTP. Nessuna logica di dominio qui.
// =========================================================

import * as authService from '../services/auth.service.js';

// POST /api/auth/register
export async function register(req, res) {
  const { email, password, nome } = req.body;
  const risultato = await authService.registra({ email, password, nome });
  res.status(201).json(risultato); // { token, user }
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;
  const risultato = await authService.login({ email, password });
  res.status(200).json(risultato); // { token, user }
}

// GET /api/auth/me  (rotta protetta: req.userId iniettato dal middleware)
export async function me(req, res) {
  const user = await authService.utenteCorrente(req.userId);
  res.status(200).json({ user });
}

// POST /api/auth/logout
// Con JWT stateless, il logout è lato client (scarta il token).
// L'endpoint esiste per simmetria e per eventuali estensioni future.
export async function logout(_req, res) {
  res.status(200).json({ ok: true });
}

// GET /api/auth/verify-email?token=...
export async function verifyEmail(req, res) {
  await authService.verificaEmail(req.query.token);
  res.status(200).json({ ok: true, message: 'Email verificata' });
}

// POST /api/auth/resend-verification  (rotta protetta)
export async function resendVerification(req, res) {
  const risultato = await authService.rinviaVerifica(req.userId);
  res.status(200).json({ ok: true, ...risultato });
}

// POST /api/auth/forgot-password
// Risposta SEMPRE neutra (anti-enumerazione): non rivela se l'email esiste.
export async function forgotPassword(req, res) {
  await authService.richiediResetPassword(req.body.email);
  res.status(200).json({
    ok: true,
    message: 'Se l\'indirizzo è registrato, riceverai un link per reimpostare la password.',
  });
}

// POST /api/auth/reset-password
export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  await authService.reimpostaPassword({ tokenGrezzo: token, nuovaPassword: newPassword });
  res.status(200).json({ ok: true, message: 'Password reimpostata. Ora puoi accedere.' });
}
