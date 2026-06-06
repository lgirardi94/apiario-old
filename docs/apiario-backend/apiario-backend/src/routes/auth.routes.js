// =========================================================
//  routes/auth.routes.js
//  Definisce gli endpoint /api/auth/*, collegando ciascuno al
//  controller e applicando i middleware (validazione, auth).
// =========================================================

import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { valida } from '../middleware/validate.middleware.js';
import { richiediAuth } from '../middleware/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../schemas/auth.schema.js';

const router = Router();

// Pubbliche
router.post('/register', valida(registerSchema), asyncHandler(auth.register));
router.post('/login', valida(loginSchema), asyncHandler(auth.login));
router.post('/logout', asyncHandler(auth.logout));
router.get('/verify-email', valida(verifyEmailSchema, 'query'), asyncHandler(auth.verifyEmail));
router.post('/forgot-password', valida(forgotPasswordSchema), asyncHandler(auth.forgotPassword));
router.post('/reset-password', valida(resetPasswordSchema), asyncHandler(auth.resetPassword));

// Protette (richiedono token valido)
router.get('/me', richiediAuth, asyncHandler(auth.me));
router.post('/resend-verification', richiediAuth, asyncHandler(auth.resendVerification));

export default router;
