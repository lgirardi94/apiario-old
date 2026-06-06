// =========================================================
//  utils/errors.js
//  Classi di errore applicative. Il gestore errori centrale
//  (middleware/error.middleware.js) le traduce nei giusti
//  status HTTP e in risposte JSON coerenti.
// =========================================================

// Errore applicativo generico con uno status HTTP associato.
// `details` è opzionale: usato ad es. per i dettagli di validazione.
export class AppError extends Error {
  constructor(message, status = 500, code = undefined, details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    if (code) this.code = code;
    if (details) this.details = details;
  }
}

// 400 — input non valido.
export class BadRequestError extends AppError {
  constructor(message = 'Richiesta non valida', code, details) {
    super(message, 400, code, details);
  }
}

// 401 — non autenticato (token mancante, invalido o scaduto).
export class UnauthorizedError extends AppError {
  constructor(message = 'Non autorizzato', code) {
    super(message, 401, code);
  }
}

// 403 — autenticato ma non autorizzato a compiere l'azione.
export class ForbiddenError extends AppError {
  constructor(message = 'Operazione non consentita', code) {
    super(message, 403, code);
  }
}

// 404 — risorsa non trovata.
export class NotFoundError extends AppError {
  constructor(message = 'Risorsa non trovata', code) {
    super(message, 404, code);
  }
}

// 409 — conflitto (es. email già registrata).
export class ConflictError extends AppError {
  constructor(message = 'Conflitto', code) {
    super(message, 409, code);
  }
}
