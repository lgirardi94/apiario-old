// =========================================================
//  controllers/files.controller.js
//  Orchestra gli endpoint dei file. req.userId è iniettato dal
//  middleware di auth: tutte le operazioni sono già isolate per utente.
// =========================================================

import * as filesService from '../services/files.service.js';
import * as backupsService from '../services/backups.service.js';
import { NotFoundError } from '../utils/errors.js';

// GET /api/files  → carica()
// Ritorna l'oggetto aggregato { db, mag, cont, ob, nec, settings, todo }.
export async function carica(req, res) {
  const dati = await filesService.carica(req.userId);
  res.status(200).json(dati);
}

// PUT /api/files  → salvaTutto()
// Body: { db?, mag?, cont?, ... } — salva solo le sezioni presenti.
export async function salvaTutto(req, res) {
  const esito = await filesService.salvaTutto(req.userId, req.body);
  res.status(200).json({ ok: true, ...esito });
}

// GET /api/files/:nome  → leggiFile()
// (Correzione 3) File assente → 200 con { content: null }, non un errore.
export async function leggiFile(req, res) {
  const content = await filesService.leggiFileSingolo(req.userId, req.params.nome);
  res.status(200).json({ content }); // content può essere null
}

// PUT /api/files/:nome  → salvaFile()
// Body: { content: ... }
export async function salvaFile(req, res) {
  const esito = await filesService.salvaFileSingolo(
    req.userId,
    req.params.nome,
    req.body?.content
  );
  res.status(200).json({ ok: true, ...esito });
}

// DELETE /api/files/:id  → eliminaFile()
// (Correzione 5) L'id è un UUID opaco: può riferirsi a un file o a un
// backup. Proviamo prima tra i file, poi tra i backup. Se nessuno dei
// due, 404.
export async function eliminaFile(req, res) {
  const { id } = req.params;

  const eliminatoFile = await filesService.eliminaFile(req.userId, id);
  if (eliminatoFile) {
    return res.status(200).json({ ok: true, tipo: 'file' });
  }

  const eliminatoBackup = await backupsService.elimina(req.userId, id);
  if (eliminatoBackup) {
    return res.status(200).json({ ok: true, tipo: 'backup' });
  }

  throw new NotFoundError('Nessun file o backup con questo id', 'NOT_FOUND');
}
