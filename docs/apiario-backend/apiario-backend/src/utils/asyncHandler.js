// =========================================================
//  utils/asyncHandler.js
//  In Express, gli errori lanciati dentro funzioni async non
//  arrivano da soli al gestore errori. Questo wrapper li cattura
//  e li inoltra a next(), evitando try/catch ripetuti nei controller.
//
//  Uso:  router.get('/x', asyncHandler(async (req, res) => { ... }))
// =========================================================

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
