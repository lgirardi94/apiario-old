// =========================================================
//  routes/index.js
//  Monta tutti i gruppi di rotte sotto /api.
// =========================================================

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import filesRoutes from './files.routes.js';
import backupsRoutes from './backups.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/files', filesRoutes);
router.use('/backups', backupsRoutes);
router.use('/admin', adminRoutes);

export default router;
