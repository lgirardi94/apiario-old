// =========================================================
//  middleware/auth.middleware.js
//  Il guardiano delle rotte protette. Verifica il JWT presente
//  nell'header Authorization e, se valido, inietta req.userId.
//  È ciò che garantisce l'isolamento multi-utente: il user_id
//  proviene SEMPRE dal token verificato, mai dal client.
// =========================================================

import { verificaJwt } from '../services/token.service.js';
import { UnauthorizedError } from '../utils/errors.js';

export function richiediAuth(req, _res, next) {
  const header = req.headers['authorization'] || '';

  // Formato atteso: "Bearer <token>"
  const [schema, token] = header.split(' ');
  if (schema !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Token mancante', 'TOKEN_MISSING'));
  }

  try {
    const userId = verificaJwt(token);
    req.userId = userId;
    next();
  } catch (err) {
    // jsonwebtoken lancia TokenExpiredError se il token è scaduto:
    // distinguiamo questo caso così il frontend può riconoscerlo
    // (code AUTH_EXPIRED) e riportare al login.
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Sessione scaduta', 'AUTH_EXPIRED'));
    }
    return next(new UnauthorizedError('Token non valido', 'TOKEN_INVALID'));
  }
}
