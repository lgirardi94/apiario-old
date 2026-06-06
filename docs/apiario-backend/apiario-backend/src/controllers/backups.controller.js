// =========================================================
//  controllers/backups.controller.js
//  Orchestra gli endpoint dei backup. req.userId dal middleware auth.
// =========================================================

import * as backupsService from '../services/backups.service.js';

// GET /api/backups  → listaBackup()
// Ritorna [{ id, name, modifiedTime }, ...] (forma attesa dall'adapter).
export async function lista(req, res) {
  const backups = await backupsService.lista(req.userId);
  res.status(200).json(backups);
}

// POST /api/backups  → creaBackup(dati, max)
// Body: { content: ..., max?: numero }
export async function crea(req, res) {
  const { content, max } = req.body ?? {};
  const creato = await backupsService.crea(req.userId, content, max);
  res.status(201).json({ ok: true, ...creato });
}
