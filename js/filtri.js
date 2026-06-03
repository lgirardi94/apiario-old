// ===== FILE VERSION: 2026-05-28.2 · filtri.js =====
/* ===========================================================
   FILTRI — dropdown multiscelta riutilizzabile
   Logica: i filtri di tipo "categoria" si combinano in OR tra loro,
   poi il risultato si incrocia in AND con i filtri di tipo "stato".
   =========================================================== */

// Stato dei filtri attivi per ogni "contesto" (magazzino, ordini, registro, contabilita, home)
const _filtriAttivi = {
  magazzino: new Set(),
  ordini: new Set(),
  registro: new Set(),
  contabilita: new Set(),
};

// Definizione dei filtri per ogni contesto.
// type: 'stato' (AND) o 'categoria' (OR tra loro)
// test(item, ctx): funzione che dice se l'elemento passa il filtro
const FILTRI_DEF = {
  magazzino: [
    { id: 'sottosoglia', label: '⚠️ Sotto soglia', type: 'stato', test: a => a.soglia && getGiacenzaLocale(a.id) <= parseFloat(a.soglia) },
    { id: 'scaduti', label: '🔴 Scaduti', type: 'stato', test: a => _isScaduto(a) },
    { id: 'scadenza', label: '⏰ In scadenza (3 mesi)', type: 'stato', test: a => _isInScadenza(a) },
    { id: 'esaurimento', label: '📉 In esaurimento (<1 mese)', type: 'stato', test: a => {
        const g = getGiacenzaLocale(a.id);
        if(g <= 0) return false;
        const m = (typeof getPrevisioneMesiResidui === 'function') ? getPrevisioneMesiResidui(a.id, g) : null;
        return m !== null && m < 1;
      } },
    { id: 'prezzomancante', label: '💰 Prezzo mancante', type: 'stato', test: a => !(parseFloat(a.prezzoUnitario) > 0) },
    { id: 'cat_api', label: '🐝 Nuclei/Api Regina', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'api' },
    { id: 'cat_farmaci', label: '💊 Farmaci', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'farmaci' },
    { id: 'cat_alimentazione', label: '🍬 Alimentazione', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'alimentazione' },
    { id: 'cat_telai_cera', label: '🪵 Telai e cera', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'telai_cera' },
    { id: 'cat_arnie', label: '📦 Arnie e componenti', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'arnie' },
    { id: 'cat_attrezzatura', label: '🔧 Attrezzatura', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'attrezzatura' },
    { id: 'cat_confezionamento', label: '🫙 Confezionamento', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'confezionamento' },
    { id: 'cat_prodotto', label: '🍯 Prodotti finiti', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'prodotto' },
    { id: 'cat_altro', label: '📋 Altro', type: 'categoria', test: a => normalizzaCatMagazzino(a.categoria) === 'altro' },
  ],
  ordini: [
    { id: 'urgenti', label: '🔴 Urgenti', type: 'stato', test: n => n.priorita === 'urgente' },
    { id: 'scadenza7', label: '📅 Scadenza entro 7gg', type: 'stato', test: n => {
        if(!n.dataPrevista) return false;
        const dp = new Date(n.dataPrevista);
        if(isNaN(dp.getTime())) return false;
        return dp <= new Date(Date.now() + 7*24*60*60*1000);
      } },
    { id: 'daordinare', label: '📝 Da ordinare', type: 'categoria', test: n => n.stato === 'da_ordinare' },
    { id: 'ordinati', label: '🚚 In arrivo', type: 'categoria', test: n => n.stato === 'ordinato' },
  ],
  registro: [
    { id: 'ispezione', label: '🔍 Solo ispezioni', type: 'categoria', test: e => (getTipi(e)||[]).includes('ispezione') },
    { id: 'trattamento', label: '💊 Solo trattamenti', type: 'categoria', test: e => (getTipi(e)||[]).includes('trattamento') },
    { id: 'produzione', label: '🍯 Solo raccolte', type: 'categoria', test: e => (getTipi(e)||[]).includes('produzione') },
    { id: 'nutrizione', label: '🍬 Solo nutrizione', type: 'categoria', test: e => (getTipi(e)||[]).includes('nutrizione') },
    { id: 'mese', label: '📅 Questo mese', type: 'stato', test: e => _inPeriodo(e.data, 'mese') },
    { id: 'anno', label: '🗓️ Quest\'anno', type: 'stato', test: e => _inPeriodo(e.data, 'anno') },
  ],
  contabilita: [
    { id: 'entrate', label: '➕ Solo entrate', type: 'categoria', test: m => m.tipo === 'entrata' },
    { id: 'uscite', label: '➖ Solo uscite', type: 'categoria', test: m => m.tipo === 'uscita' },
    { id: 'auto', label: '🔗 Solo automatici', type: 'stato', test: m => !!m.origine },
    { id: 'manuali', label: '✍️ Solo manuali', type: 'stato', test: m => !m.origine },
    { id: 'spedizioni', label: '📮 Solo spedizioni', type: 'stato', test: m => Array.isArray(m.categorie) && m.categorie.includes('spedizioni') },
    { id: 'mese', label: '📅 Questo mese', type: 'stato', test: m => _inPeriodo(m.data, 'mese') },
    { id: 'anno', label: '🗓️ Quest\'anno', type: 'stato', test: m => _inPeriodo(m.data, 'anno') },
  ],
};

// ---- Helper condivisi ----
function _isScaduto(a) {
  if(!a.scadenza) return false;
  const parts = a.scadenza.split('-');
  if(parts.length < 2) return false;
  const scadMs = new Date(parseInt(parts[0],10), parseInt(parts[1],10), 0).getTime(); // ultimo giorno mese
  return !isNaN(scadMs) && scadMs < Date.now();
}
function _isInScadenza(a) {
  if(!a.scadenza) return false;
  const parts = a.scadenza.split('-');
  if(parts.length < 2) return false;
  const scadMs = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, 1).getTime();
  if(isNaN(scadMs)) return false;
  const mesi = (scadMs - Date.now()) / (1000*60*60*24*30);
  return mesi >= 0 && mesi <= 3;
}
function _inPeriodo(data, tipo) {
  if(!data) return false;
  const d = new Date(data);
  if(isNaN(d.getTime())) return false;
  const oggi = new Date();
  if(tipo === 'mese') return d.getFullYear() === oggi.getFullYear() && d.getMonth() === oggi.getMonth();
  if(tipo === 'anno') return d.getFullYear() === oggi.getFullYear();
  return true;
}

/**
 * Applica i filtri attivi di un contesto a una lista.
 * Logica intelligente: categorie in OR tra loro, poi AND con ogni stato.
 */
function applicaFiltri(contesto, lista) {
  try {
    const attivi = _filtriAttivi[contesto];
    if(!attivi || attivi.size === 0) return lista;
    const def = FILTRI_DEF[contesto] || [];
    const attiviDef = def.filter(f => attivi.has(f.id));
    const categorie = attiviDef.filter(f => f.type === 'categoria');
    const stati = attiviDef.filter(f => f.type === 'stato');

    return lista.filter(item => {
      // Categorie: almeno una deve passare (OR). Se non ci sono categorie attive, passa.
      if(categorie.length > 0) {
        const okCat = categorie.some(f => { try { return f.test(item); } catch(e){ return false; } });
        if(!okCat) return false;
      }
      // Stati: tutti devono passare (AND)
      for(const f of stati) {
        try { if(!f.test(item)) return false; } catch(e) { return false; }
      }
      return true;
    });
  } catch(err) {
    console.error('[Filtri] Errore in applicaFiltri:', err.message);
    return lista;
  }
}

/**
 * Renderizza il dropdown multiscelta in un container.
 * onChange viene chiamato quando cambiano i filtri.
 */
function renderFiltroDropdown(contesto, containerId, onChange) {
  try {
    const container = document.getElementById(containerId);
    if(!container) return;
    const def = FILTRI_DEF[contesto] || [];
    const attivi = _filtriAttivi[contesto];

    // Calcola conteggi (quanti elementi passerebbero ogni singolo filtro)
    const sorgente = _getSorgente(contesto);
    const conteggi = {};
    def.forEach(f => {
      conteggi[f.id] = sorgente.filter(item => { try { return f.test(item); } catch(e){ return false; } }).length;
    });

    const ddId = 'dd_' + contesto;
    const menuItems = def.map(f => {
      const on = attivi.has(f.id);
      return `<div class="filtro-item ${on?'on':''}" onclick="toggleFiltro('${contesto}','${f.id}')">
        <i class="ti ti-${on?'square-check':'square'}"></i>
        <span>${f.label}</span>
        <span class="filtro-cnt">${conteggi[f.id]}</span>
      </div>`;
    }).join('');

    const chips = [...attivi].map(id => {
      const f = def.find(x => x.id === id);
      if(!f) return '';
      return `<span class="filtro-chip">${f.label}<button onclick="toggleFiltro('${contesto}','${id}')" aria-label="Rimuovi">✕</button></span>`;
    }).join('');

    const label = attivi.size === 0 ? '🔽 Filtri' : `🔽 ${attivi.size} filtri attivi`;

    container.innerHTML = `
      <div style="position:relative;display:inline-block;min-width:180px" id="${ddId}">
        <button type="button" onclick="toggleFiltroMenu('${ddId}',event)" style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;background:white;border:1px solid var(--cream-dark);border-radius:4px;padding:0.45rem 0.8rem;font-size:0.9rem;font-family:'Crimson Pro',serif;color:var(--text);cursor:pointer">
          <span>${label}</span>
        </button>
        <div class="filtro-menu" style="display:none;position:absolute;top:100%;left:0;min-width:240px;margin-top:4px;background:white;border:1px solid var(--cream-dark);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:50;max-height:60vh;overflow-y:auto">
          ${menuItems}
          ${attivi.size > 0 ? `<div class="filtro-item" style="border-top:2px solid var(--cream-dark);color:var(--red);justify-content:center" onclick="azzeraFiltri('${contesto}')"><span>✕ Azzera tutti</span></div>` : ''}
        </div>
      </div>
      ${chips ? `<span style="display:inline-flex;flex-wrap:wrap;gap:5px;margin-left:0.5rem;vertical-align:middle">${chips}</span>` : ''}
    `;

    // Salva il callback per i toggle successivi
    _filtroCallbacks[contesto] = onChange;
  } catch(err) {
    console.error('[Filtri] Errore in renderFiltroDropdown:', err.message);
  }
}

const _filtroCallbacks = {};
const _filtroContainers = {};

// Ricava la lista sorgente per i conteggi
function _getSorgente(contesto) {
  switch(contesto) {
    case 'magazzino': return articoli || [];
    case 'ordini': return (typeof necessita !== 'undefined') ? necessita.filter(n => n.stato !== 'ricevuto') : [];
    case 'registro': return logBook || [];
    case 'contabilita': return movimentiContabili || [];
    default: return [];
  }
}

function toggleFiltroMenu(ddId, event) {
  if(event) event.stopPropagation();
  // Chiudi tutti gli altri menu
  document.querySelectorAll('.filtro-menu').forEach(m => {
    if(!m.closest('#'+ddId)) m.style.display = 'none';
  });
  const menu = document.querySelector('#'+ddId+' .filtro-menu');
  if(menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function toggleFiltro(contesto, id) {
  const attivi = _filtriAttivi[contesto];
  if(!attivi) return;
  if(attivi.has(id)) attivi.delete(id);
  else attivi.add(id);
  // Ridisegna il dropdown e richiama il callback
  if(_filtroContainers[contesto]) renderFiltroDropdown(contesto, _filtroContainers[contesto], _filtroCallbacks[contesto]);
  if(_filtroCallbacks[contesto]) _filtroCallbacks[contesto]();
}

function azzeraFiltri(contesto) {
  const attivi = _filtriAttivi[contesto];
  if(!attivi) return;
  attivi.clear();
  if(_filtroContainers[contesto]) renderFiltroDropdown(contesto, _filtroContainers[contesto], _filtroCallbacks[contesto]);
  if(_filtroCallbacks[contesto]) _filtroCallbacks[contesto]();
}

// Imposta un filtro dall'esterno (es. dal cruscotto home) e attiva la pagina
function impostaFiltro(contesto, id, valore) {
  const attivi = _filtriAttivi[contesto];
  if(!attivi) return;
  if(valore) attivi.add(id);
  else attivi.delete(id);
}

// Inizializza un dropdown (memorizza il container e fa il primo render)
function initFiltroDropdown(contesto, containerId, onChange) {
  _filtroContainers[contesto] = containerId;
  renderFiltroDropdown(contesto, containerId, onChange);
}

// Chiudi i menu cliccando fuori
document.addEventListener('click', () => {
  document.querySelectorAll('.filtro-menu').forEach(m => m.style.display = 'none');
});

/* ===========================================================
   CRUSCOTTO HOME — scorciatoie che aprono una pagina filtrata
   =========================================================== */
const CRUSCOTTO_DEF = [
  // Arnie
  { id: 'arnie_problema', label: '🔴 Arnie con problemi', sezione: 'arnie',
    count: () => (arnie||[]).filter(a => a.status === 'problema').length,
    azione: () => { _filtroArnieStatus = 'problema'; navigateTo('arnie'); if(typeof renderArnie==='function') renderArnie(); } },
  { id: 'arnie_deboli', label: '🟠 Arnie deboli', sezione: 'arnie',
    count: () => (arnie||[]).filter(a => a.status === 'debole').length,
    azione: () => { _filtroArnieStatus = 'debole'; navigateTo('arnie'); if(typeof renderArnie==='function') renderArnie(); } },
  { id: 'arnie_famiglie', label: '🏠 Solo famiglie', sezione: 'arnie',
    count: () => (arnie||[]).filter(a => a.tipo === 'famiglia').length,
    azione: () => { _filtroArnieTipo = 'famiglia'; navigateTo('arnie'); if(typeof renderArnie==='function') renderArnie(); } },
  { id: 'arnie_nuclei', label: '🍯 Solo nuclei', sezione: 'arnie',
    count: () => (arnie||[]).filter(a => a.tipo === 'nucleo' || a.tipo === 'nucleo_fec').length,
    azione: () => { _filtroArnieTipo = 'nucleo'; navigateTo('arnie'); if(typeof renderArnie==='function') renderArnie(); } },
  // Magazzino
  { id: 'mag_sottosoglia', label: '⚠️ Magazzino sotto soglia', sezione: 'magazzino',
    count: () => (articoli||[]).filter(a => a.soglia && getGiacenzaLocale(a.id) <= parseFloat(a.soglia)).length,
    azione: () => { _filtriAttivi.magazzino.clear(); _filtriAttivi.magazzino.add('sottosoglia'); navigateTo('magazzino'); if(typeof renderMagArticoli==='function') renderMagArticoli(); } },
  { id: 'mag_scaduti', label: '🔴 Articoli scaduti', sezione: 'magazzino',
    count: () => (articoli||[]).filter(a => _isScaduto(a)).length,
    azione: () => { _filtriAttivi.magazzino.clear(); _filtriAttivi.magazzino.add('scaduti'); navigateTo('magazzino'); if(typeof renderMagArticoli==='function') renderMagArticoli(); } },
  { id: 'mag_scadenza', label: '⏰ Articoli in scadenza', sezione: 'magazzino',
    count: () => (articoli||[]).filter(a => _isInScadenza(a)).length,
    azione: () => { _filtriAttivi.magazzino.clear(); _filtriAttivi.magazzino.add('scadenza'); navigateTo('magazzino'); if(typeof renderMagArticoli==='function') renderMagArticoli(); } },
  // Ordini
  { id: 'ord_urgenti', label: '🛒 Ordini urgenti', sezione: 'magazzino',
    count: () => (typeof necessita !== 'undefined') ? necessita.filter(n => n.stato === 'da_ordinare' && n.priorita === 'urgente').length : 0,
    azione: () => { navigateTo('magazzino'); setTimeout(() => { const b = document.querySelector('.mag-tab[onclick*=necessita]'); if(b) showMagTab('necessita', b); }, 80); } },
];

// Filtri arnie impostabili dal cruscotto (letti da renderArnie)
let _filtroArnieStatus = null;
let _filtroArnieTipo = null;

function renderHomeCruscotto() {
  try {
    const container = document.getElementById('homeCruscotto');
    if(!container) return;

    // Calcola i conteggi e tieni solo le voci con count > 0
    const voci = CRUSCOTTO_DEF.map(v => ({ ...v, n: (() => { try { return v.count(); } catch(e){ return 0; } })() }))
      .filter(v => v.n > 0);

    if(voci.length === 0) {
      container.innerHTML = '';
      return;
    }

    const menuItems = voci.map(v => `
      <div class="filtro-item" onclick="eseguiCruscotto('${v.id}')">
        <span>${v.label}</span>
        <span class="filtro-cnt">${v.n}</span>
      </div>`).join('');

    container.innerHTML = `
      <div style="position:relative;display:inline-block" id="dd_cruscotto">
        <button type="button" onclick="toggleFiltroMenu('dd_cruscotto',event)" style="display:flex;align-items:center;gap:8px;background:var(--amber-pale);border:1px solid var(--cream-dark);border-radius:6px;padding:0.5rem 1rem;font-size:0.9rem;font-family:'Crimson Pro',serif;color:var(--brown);cursor:pointer;font-weight:600">
          <span>⚡ Filtri rapidi</span>
          <span style="background:var(--brown);color:white;border-radius:10px;padding:0 8px;font-size:0.75rem">${voci.length}</span>
        </button>
        <div class="filtro-menu" style="display:none;position:absolute;top:100%;left:0;min-width:260px;margin-top:4px;background:white;border:1px solid var(--cream-dark);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:50;max-height:60vh;overflow-y:auto">
          ${menuItems}
        </div>
      </div>`;
  } catch(err) {
    console.error('[Filtri] Errore in renderHomeCruscotto:', err.message);
  }
}

function eseguiCruscotto(id) {
  try {
    const v = CRUSCOTTO_DEF.find(x => x.id === id);
    if(!v) return;
    // Chiudi il menu
    document.querySelectorAll('.filtro-menu').forEach(m => m.style.display = 'none');
    // Reset filtri arnie prima di applicarne uno nuovo
    _filtroArnieStatus = null;
    _filtroArnieTipo = null;
    v.azione();
  } catch(err) {
    console.error('[Filtri] Errore in eseguiCruscotto:', err.message);
  }
}

function azzeraFiltroArnie() {
  _filtroArnieStatus = null;
  _filtroArnieTipo = null;
  if(typeof renderArnie === 'function') renderArnie();
}
