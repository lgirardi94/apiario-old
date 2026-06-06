// =========================================================
//  schemas/admin.schema.js
//  Validazione degli input per gli endpoint admin.
// =========================================================

import { z } from 'zod';

// Query di lista: ricerca e paginazione, tutti opzionali.
export const listaUtentiSchema = z.object({
  cerca: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// Cambio ruolo.
export const cambiaRuoloSchema = z.object({
  role: z.enum(['user', 'admin']),
});
