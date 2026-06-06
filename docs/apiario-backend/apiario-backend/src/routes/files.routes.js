// =========================================================
//  routes/files.routes.js
//  Endpoint /api/files/*. Tutte protette: richiedono token valido.
// =========================================================

import { Router } from 'express';
import * as files from '../controllers/files.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { richiediAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Tutte le rotte dei file richiedono autenticazione.
router.use(richiediAuth);

// Oggetto aggregato
router.get('/', asyncHandler(files.carica));        // carica()
router.put('/', asyncHandler(files.salvaTutto));     // salvaTutto()

// Singolo file per nome
router.get('/:nome', asyncHandler(files.leggiFile)); // leggiFile()
router.put('/:nome', asyncHandler(files.salvaFile)); // salvaFile()

// Eliminazione per id (file o backup)
router.delete('/:id', asyncHandler(files.eliminaFile)); // eliminaFile()

export default router;
