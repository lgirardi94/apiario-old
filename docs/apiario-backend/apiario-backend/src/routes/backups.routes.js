// =========================================================
//  routes/backups.routes.js
//  Endpoint /api/backups/*. Tutte protette.
//  Nota: l'eliminazione di un backup passa da DELETE /api/files/:id
//  (id opaco), coerente con l'interfaccia eliminaFile(id) dell'app.
// =========================================================

import { Router } from 'express';
import * as backups from '../controllers/backups.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { richiediAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(richiediAuth);

router.get('/', asyncHandler(backups.lista)); // listaBackup()
router.post('/', asyncHandler(backups.crea));  // creaBackup()

export default router;
