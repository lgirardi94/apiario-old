// =========================================================
//  middleware/validate.middleware.js
//  Applica uno schema Zod a una parte della richiesta (body o query).
//  Se i dati non rispettano lo schema, risponde 400 con i dettagli.
//  In caso di successo, sostituisce i dati con la versione validata
//  (con trim, tipi corretti, ecc.).
// =========================================================

import { BadRequestError } from '../utils/errors.js';

// `sorgente` può essere 'body' (default) o 'query'.
export function valida(schema, sorgente = 'body') {
  return (req, _res, next) => {
    const risultato = schema.safeParse(req[sorgente]);

    if (!risultato.success) {
      // Estrae messaggi leggibili dagli errori Zod.
      const dettagli = risultato.error.issues.map((i) => ({
        campo: i.path.join('.'),
        messaggio: i.message,
      }));
      return next(
        new BadRequestError('Dati non validi', 'VALIDATION_ERROR', dettagli)
      );
    }

    // Dati validati e normalizzati.
    req[sorgente] = risultato.data;
    next();
  };
}
