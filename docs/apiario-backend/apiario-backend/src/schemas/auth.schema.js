// =========================================================
//  schemas/auth.schema.js
//  Schemi Zod per validare l'input degli endpoint di autenticazione.
//  Bloccano i dati malformati prima che raggiungano la logica.
// =========================================================

import { z } from 'zod';

const email = z
  .string({ required_error: 'Email obbligatoria' })
  .trim()
  .email('Email non valida');

// Password: almeno 8 caratteri. (Regola minima; si può irrobustire.)
const password = z
  .string({ required_error: 'Password obbligatoria' })
  .min(8, 'La password deve avere almeno 8 caratteri')
  .max(200, 'Password troppo lunga');

export const registerSchema = z.object({
  email,
  password,
  nome: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password obbligatoria' }).min(1, 'Password obbligatoria'),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Token obbligatorio' }).min(1, 'Token obbligatorio'),
  newPassword: password,
});

// La verifica email arriva via querystring (?token=...).
export const verifyEmailSchema = z.object({
  token: z.string({ required_error: 'Token obbligatorio' }).min(1, 'Token obbligatorio'),
});
