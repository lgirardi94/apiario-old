// =========================================================
//  config/env.js
//  Legge le variabili d'ambiente UNA volta all'avvio e le valida.
//  Tutto il resto del codice importa la config da qui, invece di
//  leggere process.env sparso ovunque.
// =========================================================

import dotenv from 'dotenv';
dotenv.config();

// Helper: legge una variabile obbligatoria, ferma l'app se manca.
function richiesta(nome) {
  const valore = process.env[nome];
  if (valore === undefined || valore === '') {
    console.error(`[config] Variabile d'ambiente mancante: ${nome}`);
    console.error('[config] Controlla il file .env (vedi .env.example).');
    process.exit(1);
  }
  return valore;
}

// Helper: legge una variabile opzionale con valore di default.
function opzionale(nome, predefinito) {
  const valore = process.env[nome];
  return valore === undefined || valore === '' ? predefinito : valore;
}

export const config = {
  // Server
  port: parseInt(opzionale('PORT', '3000'), 10),
  nodeEnv: opzionale('NODE_ENV', 'development'),
  isProduction: opzionale('NODE_ENV', 'development') === 'production',

  // Database
  databaseUrl: richiesta('DATABASE_URL'),
  databaseSsl: opzionale('DATABASE_SSL', 'false') === 'true',

  // JWT
  jwtSecret: richiesta('JWT_SECRET'),
  jwtExpiresIn: opzionale('JWT_EXPIRES_IN', '7d'),

  // bcrypt
  bcryptCost: parseInt(opzionale('BCRYPT_COST', '12'), 10),

  // Token email
  verifyTokenTtlHours: parseInt(opzionale('VERIFY_TOKEN_TTL_HOURS', '24'), 10),
  resetTokenTtlHours: parseInt(opzionale('RESET_TOKEN_TTL_HOURS', '1'), 10),

  // Email (Brevo)
  brevoApiKey: opzionale('BREVO_API_KEY', ''),
  emailFrom: opzionale('EMAIL_FROM', 'noreply@example.com'),
  emailFromName: opzionale('EMAIL_FROM_NAME', 'Il Mio Apiario'),

  // Frontend
  frontendUrl: richiesta('FRONTEND_URL'),

  // Primo admin (opzionale): se un utente si registra con QUESTA email,
  // viene promosso automaticamente ad admin al momento della registrazione.
  // Lasciare vuoto per disattivare. Normalizzata in minuscolo per il confronto.
  firstAdminEmail: opzionale('FIRST_ADMIN_EMAIL', '').trim().toLowerCase(),
};

// Avviso (non bloccante) se l'email non è configurata: l'app parte comunque,
// ma verifica email e reset password non potranno inviare messaggi.
if (!config.brevoApiKey) {
  console.warn('[config] BREVO_API_KEY non impostata: l\'invio email è disattivato.');
  console.warn('[config] Verifica email e reset password non funzioneranno finché non la configuri.');
}
