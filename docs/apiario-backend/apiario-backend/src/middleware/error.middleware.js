// =========================================================
//  middleware/error.middleware.js
//  Cattura ogni errore sollevato a valle e produce una risposta
//  JSON coerente. Gli AppError portano già status e code; gli
//  errori imprevisti diventano 500 generici (senza far trapelare
//  dettagli interni).
// =========================================================

import { AppError } from '../utils/errors.js';
import { config } from '../config/env.js';

// 404 per rotte non esistenti (montato dopo tutte le rotte).
export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Endpoint non trovato', code: 'NOT_FOUND' });
}

// Gestore errori finale (4 argomenti: Express lo riconosce come error handler).
export function errorHandler(err, _req, res, _next) {
  // Errori applicativi previsti.
  if (err instanceof AppError) {
    const corpo = { error: err.message };
    if (err.code) corpo.code = err.code;
    if (err.details) corpo.details = err.details;
    return res.status(err.status).json(corpo);
  }

  // Errori imprevisti: log completo lato server, risposta generica al client.
  console.error('[error] Errore non gestito:', err);
  const corpo = { error: 'Errore interno del server', code: 'INTERNAL_ERROR' };
  // In sviluppo, aggiungiamo il messaggio per facilitare il debug.
  if (!config.isProduction) corpo.dettaglio = err.message;
  res.status(500).json(corpo);
}
