// =========================================================
//  app.js
//  Costruisce e configura l'applicazione Express: middleware
//  globali (sicurezza, CORS, parsing JSON, rate limiting),
//  montaggio delle rotte e gestore errori. NON avvia il server
//  (lo fa server.js): espone solo l'app configurata.
// =========================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

const app = express();

// --- Proxy / hosting gestito ---
// In produzione l'app gira dietro un reverse proxy (DigitalOcean App
// Platform, Render, ...). Senza questo, req.ip è l'IP del proxy: il rate
// limiter metterebbe TUTTI gli utenti nello stesso secchiello e
// express-rate-limit segnalerebbe un errore X-Forwarded-For.
// "1" = ci fidiamo del primo proxy davanti a noi.
app.set('trust proxy', 1);

// --- Sicurezza: header HTTP protettivi ---
app.use(helmet());

// --- CORS: accetta richieste solo dal frontend configurato ---
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// --- Parsing del body JSON ---
app.use(express.json({ limit: '5mb' })); // i file dati possono essere grandi

// --- Rate limiting sugli endpoint sensibili ---
// Frena brute-force e abusi. Applicato SOLO agli endpoint bersaglio di
// attacchi (login/registrazione/recupero password): NON a /me, /logout o
// /resend-verification, che il client può chiamare di frequente in modo
// legittimo (es. /me a ogni apertura dell'app).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 30, // max 30 richieste per IP in 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi, riprova più tardi', code: 'RATE_LIMITED' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// --- Healthcheck (utile per l'hosting) ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// --- Rotte API ---
app.use('/api', apiRoutes);

// --- 404 e gestore errori (sempre per ultimi) ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
