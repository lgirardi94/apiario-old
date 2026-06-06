// =========================================================
//  services/admin.service.js
//  Logica di dominio del pannello admin. Include protezioni
//  contro errori pericolosi (es. l'admin che elimina sé stesso).
// =========================================================

import {
  listaUtenti,
  contaUtenti,
  dettaglioUtente,
  eliminaUtente,
  forzaVerificaEmail,
  impostaRuolo,
  statistiche,
} from '../db/queries/admin.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

// Lista utenti con ricerca/paginazione + totale per la UI.
export async function elencaUtenti({ cerca, limit, offset } = {}) {
  const [utenti, totale] = await Promise.all([
    listaUtenti({ cerca, limit, offset }),
    contaUtenti({ cerca }),
  ]);
  return { utenti, totale };
}

// Dettaglio di un singolo utente.
export async function dettaglio(userId) {
  const u = await dettaglioUtente(userId);
  if (!u) throw new NotFoundError('Utente non trovato', 'USER_NOT_FOUND');
  return u;
}

// Elimina un utente. Protezione: l'admin non può eliminare sé stesso
// (eviterebbe di restare senza alcun admin per errore).
export async function rimuoviUtente({ targetUserId, adminUserId }) {
  if (targetUserId === adminUserId) {
    throw new ForbiddenError('Non puoi eliminare il tuo stesso account admin', 'CANNOT_DELETE_SELF');
  }
  const ok = await eliminaUtente(targetUserId);
  if (!ok) throw new NotFoundError('Utente non trovato', 'USER_NOT_FOUND');
  return { eliminato: true };
}

// Forza la verifica email di un utente.
export async function verificaEmailUtente(userId) {
  const ok = await forzaVerificaEmail(userId);
  if (!ok) throw new NotFoundError('Utente non trovato', 'USER_NOT_FOUND');
  return { verificato: true };
}

// Cambia ruolo. Protezione: l'admin non può declassare sé stesso
// (stesso motivo: evitare di rimanere senza admin).
export async function cambiaRuolo({ targetUserId, adminUserId, role }) {
  if (role !== 'user' && role !== 'admin') {
    throw new BadRequestError('Ruolo non valido', 'INVALID_ROLE');
  }
  if (targetUserId === adminUserId && role !== 'admin') {
    throw new ForbiddenError('Non puoi rimuovere il tuo stesso ruolo admin', 'CANNOT_DEMOTE_SELF');
  }
  const ok = await impostaRuolo(targetUserId, role);
  if (!ok) throw new NotFoundError('Utente non trovato', 'USER_NOT_FOUND');
  return { aggiornato: true, role };
}

// Statistiche generali.
export async function statisticheGenerali() {
  return await statistiche();
}
