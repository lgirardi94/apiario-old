// =========================================================
//  routes/admin.routes.js
//  Endpoint /api/admin/*. Doppiamente protette:
//  richiediAuth (token valido) + richiediAdmin (ruolo admin).
// =========================================================

import { Router } from 'express';
import * as admin from '../controllers/admin.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { richiediAuth } from '../middleware/auth.middleware.js';
import { richiediAdmin } from '../middleware/admin.middleware.js';
import { valida } from '../middleware/validate.middleware.js';
import { listaUtentiSchema, cambiaRuoloSchema } from '../schemas/admin.schema.js';

const router = Router();

// Ogni rotta admin richiede: autenticato E admin.
router.use(richiediAuth);
router.use(richiediAdmin);

router.get('/stats', asyncHandler(admin.statistiche));

router.get('/users', valida(listaUtentiSchema, 'query'), asyncHandler(admin.elencaUtenti));
router.get('/users/:id', asyncHandler(admin.dettaglioUtente));
router.delete('/users/:id', asyncHandler(admin.eliminaUtente));
router.post('/users/:id/verify-email', asyncHandler(admin.verificaEmail));
router.put('/users/:id/role', valida(cambiaRuoloSchema), asyncHandler(admin.cambiaRuolo));

export default router;
