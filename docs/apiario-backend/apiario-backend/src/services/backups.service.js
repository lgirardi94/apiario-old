// =========================================================
//  services/backups.service.js
//  Logica di dominio dei backup: crea snapshot datati, applica
//  il cleanup oltre `max`, e restituisce la lista nella forma
//  attesa dall'adapter: { id, name, modifiedTime }.
// =========================================================

import {
  listaBackup,
  creaBackup,
  eliminaBackupVecchi,
  eliminaBackupPerId,
} from '../db/queries/backups.js';
import { BadRequestError } from '../utils/errors.js';

// ---------- listaBackup() ----------
// (Correzione 1) Mappa i campi del DB nella forma esatta che il
// frontend già usa con Drive: { id, name, modifiedTime }.
export async function lista(userId) {
  const righe = await listaBackup(userId);
  return righe.map((r) => ({
    id: r.id,
    name: r.backup_name,
    modifiedTime: r.created_at, // ISO 8601, compatibile con l'uso esistente
  }));
}

// ---------- creaBackup(dati, max) ----------
// Genera un nome datato, salva lo snapshot, poi elimina i backup
// che eccedono `max`. Ritorna il nome creato (come driveCreateAutoBackup).
export async function crea(userId, content, max = 5) {
  if (content === undefined || content === null) {
    throw new BadRequestError('Contenuto del backup mancante');
  }
  const limite = Number.isInteger(max) && max > 0 ? max : 5;

  const backupName = generaNomeBackup();
  const creato = await creaBackup(userId, backupName, content);
  await eliminaBackupVecchi(userId, limite);

  return { name: creato.backup_name, id: creato.id, modifiedTime: creato.created_at };
}

// ---------- eliminaBackup(id) ----------
export async function elimina(userId, id) {
  return await eliminaBackupPerId(userId, id);
}

// Nome backup datato, es. "apiario_backup_2026-06-04T10-30-00".
// (I due punti dell'orario sono sostituiti per restare leggibile.)
function generaNomeBackup() {
  const ora = new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '');
  return `apiario_backup_${ora}`;
}
