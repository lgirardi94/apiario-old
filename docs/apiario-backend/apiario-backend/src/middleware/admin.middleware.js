// =========================================================
//  middleware/admin.middleware.js
//  Secondo guardiano, per le rotte admin. Va usato DOPO
//  richiediAuth: presuppone che req.userId sia già impostato.
//  Verifica che l'utente abbia ruolo 'admin'; altrimenti 403.
// =========================================================

import { trovaUtentePerId } from '../db/queries/users.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export async function richiediAdmin(req, _res, next) {
  try {
    // req.userId arriva da richiediAuth (deve essere montato prima).
    if (!req.userId) {
      return next(new UnauthorizedError('Autenticazione richiesta', 'TOKEN_MISSING'));
    }

    const utente = await trovaUtentePerId(req.userId);
    if (!utente) {
      return next(new UnauthorizedError('Utente non trovato', 'USER_NOT_FOUND'));
    }

    if (utente.role !== 'admin') {
      // 403: autenticato ma non autorizzato. Messaggio volutamente sobrio.
      return next(new ForbiddenError('Accesso riservato', 'NOT_ADMIN'));
    }

    // Rende disponibile l'utente admin a valle, se servisse.
    req.adminUser = utente;
    next();
  } catch (err) {
    next(err);
  }
}
