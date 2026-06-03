// ===== FILE VERSION: 2026-05-28.2 · state.js =====
// ===== STATE GLOBALE =====
// I dati sono caricati da Drive dopo il login. localStorage è solo cache di backup.

let arnie   = [];
let logBook = [];

let articoli       = [];
let movimentazioni = [];

let movimentiContabili = [];

let obiettivi = [];

let necessita = []; // Lista articoli da ordinare

let todos = []; // Sezione "Cose da fare" (To-Do)

// Settings — preferenze e dati di servizio (es. duplicati ignorati)
let settings = {
  duplicatiIgnorati: []
};

// ===== HELPERS DI SALVATAGGIO =====
// Ognuno aggiorna localStorage (cache) e spinge automaticamente su Drive

function saveDB() {
  try {
    localStorage.setItem('arnie', JSON.stringify(arnie));
    localStorage.setItem('logBook', JSON.stringify(logBook));
    pushToCloud(true);
  } catch(err) {
    console.error('[State] Errore in saveDB:', err.message);
  }
}

function saveMagazzino() {
  try {
    localStorage.setItem('articoli', JSON.stringify(articoli));
    localStorage.setItem('movimentazioni', JSON.stringify(movimentazioni));
    pushToCloud(true);
  } catch(err) {
    console.error('[State] Errore in saveMagazzino:', err.message);
  }
}

function saveContabilita() {
  try {
    localStorage.setItem('movimentiContabili', JSON.stringify(movimentiContabili));
    pushToCloud(true);
  } catch(err) {
    console.error('[State] Errore in saveContabilita:', err.message);
  }
}

function saveObiettivi() {
  try {
    localStorage.setItem('obiettivi', JSON.stringify(obiettivi));
    pushToCloud(true);
  } catch(err) {
    console.error('[State] Errore in saveObiettivi:', err.message);
  }
}

function saveNecessita() {
  try {
    localStorage.setItem('necessita', JSON.stringify(necessita));
    pushToCloud(true);
  } catch(err) {
    console.error('[State] Errore in saveNecessita:', err.message);
  }
}

function saveTodos() {
  try {
    localStorage.setItem('todos', JSON.stringify(todos));
    pushToCloud(true);
  } catch(err) {
    console.error('[State] Errore in saveTodos:', err.message);
  }
}

function saveSettings() {
  try {
    localStorage.setItem('apiario_settings', JSON.stringify(settings));
    pushToCloud(true);
  } catch(err) {
    console.error('[State] Errore in saveSettings:', err.message);
  }
}

// ===== HELPER STATISTICHE =====
/**
 * Restituisce { totale, perAnno: { '2025': X, '2026': Y } } sommando produzionePerAnno di tutte le arnie.
 * Fonte unica di verità per le quantità di miele prodotto.
 */
function getMieleStats() {
  const perAnno = {};
  let totale = 0;
  arnie.forEach(a => {
    if(!a.produzionePerAnno) return;
    Object.entries(a.produzionePerAnno).forEach(([yr, prods]) => {
      const sum = Object.values(prods).reduce((s, q) => s + q, 0);
      perAnno[yr] = (perAnno[yr] || 0) + sum;
      totale += sum;
    });
  });
  return { totale, perAnno };
}

/**
 * Trova l'ultima ispezione registrata per una specifica arnia.
 * Ritorna null se nessuna ispezione esiste.
 */
function findUltimaIspezione(arniaId) {
  return logBook.find(e => {
    const t = getTipi(e);
    return e.arniaId === arniaId && t.includes('ispezione') && e.ispezione;
  }) || null;
}

/**
 * Conta i giorni distinti in cui c'è stata almeno una visita di campo
 * (ispezione, trattamento, nutrizione). Più arnie visitate lo stesso giorno = 1.
 * @param {string|number} [annoFilter] - Se specificato, conta solo i giorni dell'anno indicato
 */
function countGiorniVisita(annoFilter) {
  const TIPI_VISITA = ['ispezione', 'trattamento', 'nutrizione'];
  const giorniSet = new Set();
  const annoStr = annoFilter != null ? String(annoFilter) : null;
  logBook.forEach(e => {
    if(!e.data) return;
    if(annoStr && !e.data.startsWith(annoStr)) return;
    const tipi = getTipi(e);
    if(tipi.some(t => TIPI_VISITA.includes(t))) {
      giorniSet.add(e.data);
    }
  });
  return giorniSet.size;
}
