// =========================================================
//  server.js
//  Punto di ingresso: prende l'app configurata e la mette in
//  ascolto sulla porta. Gestisce lo spegnimento pulito.
// =========================================================

import app from './app.js';
import { config } from './config/env.js';
import { chiudiPool } from './db/pool.js';

const server = app.listen(config.port, () => {
  console.log(`[server] In ascolto sulla porta ${config.port} (${config.nodeEnv})`);
  console.log(`[server] CORS abilitato per: ${config.frontendUrl}`);
});

// Spegnimento pulito: chiude il pool di connessioni al DB.
async function spegni(segnale) {
  console.log(`\n[server] Ricevuto ${segnale}, spegnimento in corso...`);
  server.close(async () => {
    await chiudiPool();
    console.log('[server] Chiuso correttamente.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => spegni('SIGTERM'));
process.on('SIGINT', () => spegni('SIGINT'));
