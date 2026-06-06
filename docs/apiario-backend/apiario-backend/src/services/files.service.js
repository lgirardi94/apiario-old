// =========================================================
//  services/files.service.js
//  Logica di dominio dei file. Traduce tra il mondo dell'app
//  (oggetto aggregato { db, mag, cont, ... } con chiavi brevi)
//  e il mondo del DB (righe user_files con file_name).
// =========================================================

import {
  listaFile,
  leggiFile,
  salvaFile,
  eliminaFilePerId,
} from '../db/queries/files.js';
import {
  CHIAVE_TO_FILENAME,
  FILENAME_TO_CHIAVE,
  FILE_NAMES_VALIDI,
} from '../utils/fileNames.js';
import { BadRequestError } from '../utils/errors.js';

// ---------- carica(): ricompone l'oggetto aggregato ----------
// Legge tutte le righe dell'utente e costruisce { db, mag, cont, ob, nec, settings, todo }.
// Le chiavi senza file corrispondente semplicemente non compaiono (come su Drive).
export async function carica(userId) {
  const righe = await listaFile(userId);
  const aggregato = {};
  for (const { file_name, content } of righe) {
    const chiave = FILENAME_TO_CHIAVE[file_name];
    // Includiamo solo i file che fanno parte dell'oggetto aggregato
    // (es. 'etichette' è un file extra, non entra qui).
    if (chiave) aggregato[chiave] = content;
  }
  return aggregato;
}

// ---------- salvaTutto(): scrittura selettiva ----------
// (Correzione 4) Salva SOLO le sezioni presenti nell'oggetto ricevuto.
// Le sezioni assenti non vengono toccate, esattamente come fa il DriveAdapter.
export async function salvaTutto(userId, dati) {
  if (!dati || typeof dati !== 'object') {
    throw new BadRequestError('Corpo non valido: atteso un oggetto { db, mag, ... }');
  }

  const scritture = [];
  for (const [chiave, fileName] of Object.entries(CHIAVE_TO_FILENAME)) {
    const sezione = dati[chiave];
    if (sezione !== undefined && sezione !== null) {
      scritture.push(salvaFile(userId, fileName, sezione));
    }
  }
  await Promise.all(scritture);
  return { salvate: scritture.length };
}

// ---------- leggiFile(nome): singolo file ----------
// (Correzione 3) Ritorna null se il file non esiste (non è un errore).
export async function leggiFileSingolo(userId, nome) {
  validaNomeFile(nome);
  return await leggiFile(userId, nome);
}

// ---------- salvaFile(nome, dati): singolo file ----------
export async function salvaFileSingolo(userId, nome, content) {
  validaNomeFile(nome);
  if (content === undefined || content === null) {
    throw new BadRequestError('Contenuto mancante');
  }
  return await salvaFile(userId, nome, content);
}

// ---------- eliminaFile(id): per UUID ----------
// (Correzione 5) Prova a eliminare nei file; il controller gestirà
// anche il caso "era un backup" combinando con backups.service.
export async function eliminaFile(userId, id) {
  return await eliminaFilePerId(userId, id);
}

// Verifica che il nome file sia tra quelli previsti.
function validaNomeFile(nome) {
  if (!FILE_NAMES_VALIDI.includes(nome)) {
    throw new BadRequestError(
      `Nome file non valido: "${nome}". Ammessi: ${FILE_NAMES_VALIDI.join(', ')}`,
      'INVALID_FILE_NAME'
    );
  }
}
