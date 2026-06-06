// =========================================================
//  controllers/admin.controller.js
//  Orchestra gli endpoint del pannello admin. Tutte le rotte
//  passano da richiediAuth + richiediAdmin, quindi qui siamo
//  certi che chi chiama è un admin (req.userId è l'admin).
// =========================================================

import * as adminService from '../services/admin.service.js';

// GET /api/admin/users?cerca=&limit=&offset=
export async function elencaUtenti(req, res) {
  const { cerca, limit, offset } = req.query;
  const risultato = await adminService.elencaUtenti({ cerca, limit, offset });
  res.status(200).json(risultato); // { utenti, totale }
}

// GET /api/admin/users/:id
export async function dettaglioUtente(req, res) {
  const u = await adminService.dettaglio(req.params.id);
  res.status(200).json({ utente: u });
}

// DELETE /api/admin/users/:id
export async function eliminaUtente(req, res) {
  const esito = await adminService.rimuoviUtente({
    targetUserId: req.params.id,
    adminUserId: req.userId,
  });
  res.status(200).json({ ok: true, ...esito });
}

// POST /api/admin/users/:id/verify-email
export async function verificaEmail(req, res) {
  const esito = await adminService.verificaEmailUtente(req.params.id);
  res.status(200).json({ ok: true, ...esito });
}

// PUT /api/admin/users/:id/role   body: { role }
export async function cambiaRuolo(req, res) {
  const esito = await adminService.cambiaRuolo({
    targetUserId: req.params.id,
    adminUserId: req.userId,
    role: req.body.role,
  });
  res.status(200).json({ ok: true, ...esito });
}

// GET /api/admin/stats
export async function statistiche(_req, res) {
  const stats = await adminService.statisticheGenerali();
  res.status(200).json(stats);
}
