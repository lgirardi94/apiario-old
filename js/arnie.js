// ===== FILE VERSION: 2026-05-28.5 · arnie.js =====
// ======= ARNIE =======
let editingMelari = []; // temp melari list while modal is open
let editingRetePropoli = null; // singolo oggetto (max 1 per arnia)
let editingTrappolaPolline = null; // singolo oggetto (max 1 per arnia)
let editingTelaini = []; // temp telaini (genealogia) list while modal is open

// ===== COSTANTI: tipi accessori produttivi =====
const ACCESSORI_PROD = {
  melari: {
    label: 'Melari',
    icon: '🍯',
    statusLabel: { posizionato: 'In produzione', rimosso: 'Rimosso', produzione: 'Smielato' },
    posizLabel: 'Data posizion.',
    unitLabel: 'N° telaini',
    unitMin: 1, unitMax: 12,
    placeholder: 'Es. 10'
  },
  reti_propoli: {
    label: 'Reti propoli',
    icon: '🌿',
    statusLabel: { posizionato: 'In produzione', rimosso: 'Rimosso', produzione: 'Raschiata' },
    posizLabel: 'Data posiz.',
    unitLabel: 'N° reti',
    unitMin: 1, unitMax: 5,
    placeholder: 'Es. 1'
  },
  trappole_polline: {
    label: 'Trappole polline',
    icon: '🌾',
    statusLabel: { posizionato: 'Attiva', rimosso: 'Rimossa', produzione: 'Svuotata' },
    posizLabel: 'Data attivazione',
    unitLabel: 'Posizione',
    unitMin: 0, unitMax: 0,
    placeholder: 'Fondo / Entrata',
    isText: true // questa è testo invece di numero
  }
};

// ===== COSTANTI: tipi arnia =====
const ARNIA_TIPI = {
  famiglia:    { label: 'Famiglia',             icon: '🏠', short: 'Famiglia',   color: 'brown',  cls: 'tipo-famiglia' },
  nucleo:      { label: 'Nucleo',               icon: '🍯', short: 'Nucleo',     color: 'amber',  cls: 'tipo-nucleo' },
  nucleo_fec:  { label: 'Nucleo fecondazione',  icon: '👑', short: 'Fecond.',    color: 'purple', cls: 'tipo-nucleo-fec' },
  sciame:      { label: 'Sciame catturato',     icon: '🐝', short: 'Sciame',     color: 'green',  cls: 'tipo-sciame' },
};

// ===== COSTANTI: tipi telaino =====
const TELAINO_TIPI = {
  covata:    { label: 'Covata', icon: '🟡' },
  scorte:    { label: 'Scorte (miele/polline)', icon: '🍯' },
  misto:     { label: 'Misto (covata + scorte)', icon: '🟠' },
  vuoto:     { label: 'Vuoto / Foglio cera', icon: '⬜' },
};

// Restituisce il prossimo numero progressivo disponibile (univoco tra TUTTI i tipi)
function nextArniaNumber() {
  const used = new Set(arnie.map(a => parseInt(a.num, 10)).filter(n => !isNaN(n)));
  let n = 1;
  while(used.has(n)) n++;
  return n;
}

// Aggiorna l'anteprima del colore regina nel modale
function aggiornaReginaPreview() {
  try {
    const anno = document.getElementById('arniReginaAnno')?.value;
    const box = document.getElementById('arniReginaPreview');
    if(!box) return;
    if(!anno || anno.length < 4) {
      box.style.display = 'none';
      return;
    }
    if (typeof getReginaColorInfo !== 'function') {
      console.warn('[Arnie] getReginaColorInfo non disponibile (shared.js non caricato?)');
      box.style.display = 'none';
      return;
    }
    const info = getReginaColorInfo(anno);
    if(!info) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'flex';
    box.innerHTML = `${getReginaPallino(anno, 14)}<span>Colore <strong style="color:${info.dark}">${info.name}</strong></span>`;
  } catch(err) {
    console.error('[Arnie] Errore in aggiornaReginaPreview:', err.message);
  }
}

// Migrazione: aggiunge tipo='famiglia' alle arnie esistenti che non lo hanno
function migrateArniaTipi() {
  let changed = false;
  arnie.forEach(a => {
    if(!a.tipo) { a.tipo = 'famiglia'; changed = true; }
  });
  if(changed) saveDB();
}

// ===== GENEALOGIA: gestione telaini e regina =====

// Aggiorna visibilità della sezione genealogia in base al tipo arnia
function updateGenealogiaVisibility() {
  const tipo = document.getElementById('arniTipo')?.value || 'famiglia';
  const box = document.getElementById('arniGenealogiaBox');
  const sciameBox = document.getElementById('arniSciameBox');
  const telainiBox = document.getElementById('arniTelainiBox');
  const dataLabel = document.getElementById('arniDataCostLabel');
  const subtitle = document.getElementById('arniGenealogiaSubtitle');

  if(!box) return;

  // Box genealogia mostrato per tutti i tipi (anche famiglia)
  box.style.display = 'block';

  // Sciame: mostra box sciame, nascondi telaini, etichetta diversa per data
  if(tipo === 'sciame') {
    if(sciameBox) sciameBox.style.display = 'block';
    if(telainiBox) telainiBox.style.display = 'block';
    if(dataLabel) dataLabel.textContent = '📅 Data cattura';
    if(subtitle) subtitle.textContent = '— Origine dello sciame';
  } else {
    if(sciameBox) sciameBox.style.display = 'none';
    if(telainiBox) telainiBox.style.display = 'block';
    if(dataLabel) dataLabel.textContent = (tipo === 'famiglia') ? '📅 Data installazione' : '📅 Data costituzione';
    if(subtitle) subtitle.textContent = (tipo === 'nucleo_fec') ? '— Tracciamento mini-arnia'
      : (tipo === 'famiglia') ? '— Origine regina e telai'
      : '— Tracciamento provenienza';
  }

  // Aggiorna le dropdown arnia di provenienza nei telaini
  refreshTelainiArniaDropdowns();
  // Aggiorna anche la dropdown regina-inserita
  populateReginaArniaSrc();
}

// Popola le tendine "Da arnia #X" per regina inserita
function populateReginaArniaSrc() {
  const sel = document.getElementById('arniReginaArniaSrc');
  if(!sel) return;
  const editId = document.getElementById('editArniId').value;
  const sorted = [...arnie].sort((a, b) => (parseInt(a.num,10)||0) - (parseInt(b.num,10)||0));
  const opts = sorted
    .filter(a => a.id !== editId) // non se stessa
    .map(a => `<option value="${a.id}">#${a.num}${a.nome ? ' — '+a.nome : ''}</option>`)
    .join('');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Seleziona —</option>' + opts;
  if(cur) sel.value = cur;
}

// Aggiunge un nuovo telaino vuoto e renderizza
function addTelaino() {
  editingTelaini.push({
    tipo: 'covata',
    arniaSrcId: '',
    note: ''
  });
  renderTelainiList();
}

// Rimuove un telaino dato l'indice
function removeTelaino(idx) {
  editingTelaini.splice(idx, 1);
  renderTelainiList();
}

// Aggiorna un campo del telaino
function updateTelaino(idx, field, val) {
  if(editingTelaini[idx]) editingTelaini[idx][field] = val;
}

// Renderizza la lista dei telaini nel modale
function renderTelainiList() {
  const cont = document.getElementById('telainiList');
  if(!cont) return;

  if(editingTelaini.length === 0) {
    cont.innerHTML = '<div style="color:var(--text-light);font-style:italic;font-size:0.85rem;padding:0.5rem 0">Nessun telaino. Aggiungi i telaini di partenza con la loro provenienza.</div>';
    return;
  }

  const editId = document.getElementById('editArniId').value;
  const sorted = [...arnie].sort((a, b) => (parseInt(a.num,10)||0) - (parseInt(b.num,10)||0));
  const arnieOpts = sorted
    .filter(a => a.id !== editId)
    .map(a => `<option value="${a.id}">#${a.num}${a.nome ? ' — '+a.nome : ''}</option>`)
    .join('');

  cont.innerHTML = editingTelaini.map((t, idx) => `
    <div style="background:white;padding:0.6rem 0.8rem;border-radius:4px;border:1px solid var(--cream-dark);display:grid;grid-template-columns:24px 1fr 1fr 1.3fr 28px;gap:0.5rem;align-items:center">
      <div style="font-family:'Playfair Display',serif;font-weight:700;color:var(--amber);text-align:center">${idx+1}</div>
      <select onchange="updateTelaino(${idx}, 'tipo', this.value)" style="padding:0.3rem 0.5rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.85rem">
        ${Object.entries(TELAINO_TIPI).map(([k,v]) => `<option value="${k}" ${t.tipo===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
      </select>
      <select onchange="updateTelaino(${idx}, 'arniaSrcId', this.value)" style="padding:0.3rem 0.5rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.85rem">
        <option value="">— Origine? —</option>
        ${arnieOpts}
      </select>
      <input type="text" placeholder="Note (es. 5 dl covata opercolata)" value="${t.note || ''}" oninput="updateTelaino(${idx}, 'note', this.value)" style="padding:0.3rem 0.5rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.85rem">
      <button type="button" onclick="removeTelaino(${idx})" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:1.2rem;font-weight:700;padding:0">✕</button>
    </div>
  `).join('');
}

// Aggiorna le tendine dei telaini esistenti (quando cambi arnie)
function refreshTelainiArniaDropdowns() {
  renderTelainiList();
}

// Seleziona origine regina e mostra i campi appropriati
function selectReginaOrigine(val) {
  document.getElementById('arniReginaOrigine').value = val;
  document.querySelectorAll('.regina-opt-radio').forEach(el => {
    el.classList.toggle('selected', el.getAttribute('data-val') === val);
  });
  document.getElementById('reginaInseritaBox').style.display = (val === 'inserita') ? 'block' : 'none';
  document.getElementById('reginaAcquistataBox').style.display = (val === 'acquistata') ? 'block' : 'none';
  populateReginaArniaSrc();
  updateReginaDateInfo();
}

// Calcola e mostra date previste fecondazione
function updateReginaDateInfo() {
  const origine = document.getElementById('arniReginaOrigine')?.value;
  const dataCost = document.getElementById('arniDataCostituzione')?.value;
  const infoBox = document.getElementById('reginaDateInfoBox');
  if(!infoBox) return;
  if(!dataCost) { infoBox.style.display = 'none'; return; }

  const data = new Date(dataCost);
  if(isNaN(data.getTime())) { infoBox.style.display = 'none'; return; }

  let html = '';
  if(origine === 'allevata') {
    // 16 giorni nascita + 7 maturazione + 14-20 fecondazione = ~30-43 gg
    const sfarfallamento = new Date(data); sfarfallamento.setDate(sfarfallamento.getDate() + 16);
    const fecondazione = new Date(data); fecondazione.setDate(fecondazione.getDate() + 30);
    const primaOvodepos = new Date(data); primaOvodepos.setDate(primaOvodepos.getDate() + 38);
    html = `
      <strong>⏳ Date previste (regina allevata sul posto):</strong><br>
      • Sfarfallamento regina: ~${fmtDate(sfarfallamento)}<br>
      • Voli di fecondazione: ~${fmtDate(fecondazione)}<br>
      • Prima deposizione: ~${fmtDate(primaOvodepos)} <em>(primo controllo consigliato)</em>
    `;
  } else if(origine === 'inserita') {
    const accettazione = new Date(data); accettazione.setDate(accettazione.getDate() + 5);
    const primoControl = new Date(data); primoControl.setDate(primoControl.getDate() + 10);
    html = `
      <strong>⏳ Date previste (regina inserita):</strong><br>
      • Verifica accettazione: ~${fmtDate(accettazione)}<br>
      • Primo controllo deposizione: ~${fmtDate(primoControl)}
    `;
  } else if(origine === 'acquistata') {
    const accettazione = new Date(data); accettazione.setDate(accettazione.getDate() + 5);
    const primoControl = new Date(data); primoControl.setDate(primoControl.getDate() + 10);
    html = `
      <strong>⏳ Date previste (regina acquistata):</strong><br>
      • Verifica accettazione: ~${fmtDate(accettazione)}<br>
      • Primo controllo deposizione: ~${fmtDate(primoControl)}
    `;
  }

  infoBox.style.display = 'block';
  infoBox.innerHTML = html;
}

// Helper formattazione data
function fmtDate(d) {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ===== SCIAME: check evoluzione alla prima visita =====
function askSciameEvolution(arniaId) {
  const a = arnie.find(x => x.id === arniaId);
  if(!a || a.tipo !== 'sciame') return;

  // Crea un mini-modal inline (overlay)
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'sciameEvolutionModal';
  overlay.style.zIndex = '10000';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px">
      <h3 style="color:var(--green);margin-bottom:0.5rem">🐝 Come è evoluto lo sciame?</h3>
      <p style="color:var(--text-light);font-size:0.92rem;margin-bottom:1rem">
        Hai appena registrato una visita per lo sciame <strong>#${a.num}${a.nome ? ' — '+a.nome : ''}</strong>.
        Dopo la cattura del ${a.dataCostituzione ? formatDate(a.dataCostituzione) : '—'}, come si è sviluppato?
      </p>

      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem">
        <button class="btn btn-primary" onclick="evolveSciame('${arniaId}', 'famiglia')" style="text-align:left;padding:0.8rem 1rem">
          🏠 <strong>È diventato una Famiglia</strong>
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.85);font-weight:400;margin-top:0.2rem">Sciame ben sviluppato (≥6 favi popolati), regina che depone bene</div>
        </button>
        <button class="btn btn-secondary" onclick="evolveSciame('${arniaId}', 'nucleo')" style="text-align:left;padding:0.8rem 1rem">
          🍯 <strong>È diventato un Nucleo</strong>
          <div style="font-size:0.78rem;color:var(--text-light);font-weight:400;margin-top:0.2rem">Sciame in sviluppo (3-5 favi), da rinforzare nella stagione</div>
        </button>
        <button class="btn btn-secondary" onclick="evolveSciame('${arniaId}', 'sciame')" style="text-align:left;padding:0.8rem 1rem">
          🐝 <strong>Ancora da valutare</strong>
          <div style="font-size:0.78rem;color:var(--text-light);font-weight:400;margin-top:0.2rem">Lascialo come "sciame" per ora, chiederò di nuovo alla prossima visita</div>
        </button>
        <button class="btn btn-danger" onclick="evolveSciame('${arniaId}', 'perso')" style="text-align:left;padding:0.8rem 1rem">
          ❌ <strong>Lo sciame è andato perso</strong>
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.85);font-weight:400;margin-top:0.2rem">Ha lasciato l'arnia o è morto — segna come dismesso</div>
        </button>
      </div>

      <div style="text-align:center;font-size:0.85rem;color:var(--text-light)">
        <a href="javascript:void(0)" onclick="closeSciameEvolution()" style="color:var(--text-light)">Decido più tardi</a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function closeSciameEvolution() {
  const m = document.getElementById('sciameEvolutionModal');
  if(m) m.remove();
}

function evolveSciame(arniaId, newTipo) {
  const a = arnie.find(x => x.id === arniaId);
  if(!a) return;

  if(newTipo === 'perso') {
    a.status = 'problema';
    a.annoDismissione = new Date().getFullYear();
    a.sciameNeedsEvolutionCheck = false;
    a.note = (a.note ? a.note + '\n' : '') + `Sciame andato perso (${new Date().toLocaleDateString('it-IT')})`;
  } else if(newTipo === 'sciame') {
    // Lascia tipo sciame ma flag già "chiesto", reschedulato per prossima visita
    a.sciameNeedsEvolutionCheck = true;
  } else {
    // Promuove a famiglia o nucleo
    a.tipo = newTipo;
    a.sciameNeedsEvolutionCheck = false;
    a.note = (a.note ? a.note + '\n' : '') + `Promosso da sciame a ${newTipo === 'famiglia' ? 'famiglia' : 'nucleo'} (${new Date().toLocaleDateString('it-IT')})`;
  }
  saveDB();
  closeSciameEvolution();
  renderArnie();

  // Feedback all'utente
  const msg = {
    famiglia: '✅ Sciame promosso a Famiglia',
    nucleo:   '✅ Sciame promosso a Nucleo',
    sciame:   '⏳ Decisione rimandata alla prossima visita',
    perso:    '❌ Sciame segnato come perso'
  }[newTipo];
  if(typeof alert !== 'undefined') alert(msg);
}

function renderArnie() {
  // Migrazione automatica al primo render
  migrateArniaTipi();

  const grid = document.getElementById('arnieGrid');
  if(arnie.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="big">🏠</span>Nessuna arnia registrata.<br>Aggiungi la tua prima arnia!</div>`;
    return;
  }

  // Filtri dal cruscotto home (se impostati)
  const fStatus = (typeof _filtroArnieStatus !== 'undefined') ? _filtroArnieStatus : null;
  const fTipo = (typeof _filtroArnieTipo !== 'undefined') ? _filtroArnieTipo : null;

  // Banner filtro attivo
  let bannerEl = document.getElementById('arnieFiltroBanner');
  if(fStatus || fTipo) {
    const labelMap = { problema: '🔴 con problemi', debole: '🟠 deboli', famiglia: '🏠 famiglie', nucleo: '🍯 nuclei' };
    const txt = labelMap[fStatus] || labelMap[fTipo] || '';
    if(!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'arnieFiltroBanner';
      bannerEl.style.cssText = 'display:flex;align-items:center;gap:0.5rem;background:var(--amber-pale);border:1px solid var(--cream-dark);border-radius:6px;padding:0.5rem 0.9rem;margin-bottom:1rem;font-size:0.88rem;color:var(--brown)';
      grid.parentNode.insertBefore(bannerEl, grid);
    }
    bannerEl.innerHTML = `<span>Filtro attivo: <strong>arnie ${txt}</strong></span><button onclick="azzeraFiltroArnie()" style="background:none;border:1px solid var(--brown);color:var(--brown);border-radius:4px;padding:0.15rem 0.6rem;cursor:pointer;font-family:inherit;font-size:0.8rem">✕ Mostra tutte</button>`;
    bannerEl.style.display = 'flex';
  } else if(bannerEl) {
    bannerEl.style.display = 'none';
  }

  // Ordina per numero crescente + applica filtri
  let sorted = [...arnie].sort((a, b) => (parseInt(a.num,10)||0) - (parseInt(b.num,10)||0));
  if(fStatus) sorted = sorted.filter(a => a.status === fStatus);
  if(fTipo === 'famiglia') sorted = sorted.filter(a => a.tipo === 'famiglia');
  else if(fTipo === 'nucleo') sorted = sorted.filter(a => a.tipo === 'nucleo' || a.tipo === 'nucleo_fec');

  grid.innerHTML = sorted.map(a => {
    const statusLabel = {attiva:'Attiva',debole:'Debole',problema:'Problema',invernata:'Invernata'}[a.status];
    const melariAttivi = (a.melari||[]).filter(m=>m.status==='posizionato').length;
    const reteAttiva = a.retePropoli && a.retePropoli.attiva !== false;
    const trappolaAttiva = a.trappolaPolline && a.trappolaPolline.attiva !== false;
    const tipoInfo = ARNIA_TIPI[a.tipo] || ARNIA_TIPI.famiglia;

    // Ultima ispezione + mappa telaini
    const isp = typeof findUltimaIspezione === 'function' ? findUltimaIspezione(a.id) : null;
    const mappaHtml = isp?.ispezione?.mappa?.length ? `
      <div style="display:flex;gap:2px;margin-top:8px;flex-wrap:wrap" title="Mappa telaini dall'ultima ispezione">
        ${isp.ispezione.mappa.map((tipo,i) => {
          const info = getTelainoInfo(tipo);
          const border = info.borderColor ? `border:1.5px solid ${info.borderColor}` : 'border:1px solid rgba(0,0,0,0.12)';
          return `<div title="T${i+1}: ${info.label}" style="width:22px;height:32px;border-radius:2px;${border};background:${info.color};display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:${info.textColor}">${info.short}</div>`;
        }).join('')}
      </div>` : '';

    return `
    <div class="arnia-card ${tipoInfo.cls}">
      <div class="arnia-card-head">
        <div class="arnia-num">${tipoInfo.icon} #${a.num}</div>
        <span class="arnia-tipo-badge badge-${a.tipo || 'famiglia'}">${tipoInfo.short}</span>
      </div>
      <div class="arnia-name">${a.nome || '—'}</div>
      <span class="arnia-status status-${a.status}">${statusLabel}</span>
      <div class="arnia-info">
        ${a.razza ? `🐝 <em>${a.razza}</em><br>` : ''}
        ${a.reginaAnno ? `${getReginaPallino(a.reginaAnno)}Regina <strong>${a.reginaAnno}</strong><br>` : ''}
        ${isp ? `📅 Ultima isp.: ${formatDate(isp.data)}<br>` : ''}
        ${isp?.ispezione?.telaini ? `📏 ${isp.ispezione.telaini} telaini` : ''}
        ${isp?.ispezione?.covata ? ` · 🟤 ${isp.ispezione.covata}/5` : ''}
        ${isp?.ispezione?.celleReali && typeof CELLE_REALI_LABEL !== 'undefined' ? ` · 👑 ${CELLE_REALI_LABEL[isp.ispezione.celleReali]||''}` : ''}
        ${a.temperamento ? `<br>😊 ${a.temperamento}` : ''}
      </div>
      ${getProduzioneBadges(a)}
      ${mappaHtml}
      <div class="arnia-actions" style="margin-top:0.8rem">
        <button class="btn btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.82rem" onclick="openDetail('${a.id}')">🔍 Dettaglio</button>
        <button class="btn btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.82rem" onclick="openArniModal('${a.id}')">✏️</button>
        ${isp ? `<button class="btn btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.82rem" onclick="apriEditTelaini('${a.id}', '${isp.id}')" title="Modifica mappa telaini dell'ultima ispezione">🍯 Telaini</button>` : ''}
        <button class="btn btn-danger" style="padding:0.4rem 0.8rem;font-size:0.82rem" onclick="deleteArnia('${a.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function renderModalMelari() {
  const list = document.getElementById('melariList');
  if(editingMelari.length === 0) {
    list.innerHTML = '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessun melario registrato.</div>';
    return;
  }
  const statusLabel = {posizionato:'In produzione', rimosso:'Rimosso', produzione:'Smielato'};
  list.innerHTML = editingMelari.map((m,i) => `
    <div class="melario-item" id="melItem-${i}" style="flex-direction:column;align-items:stretch;gap:0.5rem">
      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap">
        <span style="font-size:1.1rem">🍯</span>
        <span class="mel-info"><strong>${m.num} telaini</strong>${m.note?' — '+m.note:''}</span>
        <span class="mel-date">${m.data ? formatDate(m.data) : '—'}</span>
        <span class="mel-status mel-${m.status}">${statusLabel[m.status]||m.status}</span>
        <div style="margin-left:auto;display:flex;gap:0.3rem">
          <button class="btn-icon" onclick="openMelEdit(${i})" title="Modifica">✏️</button>
          <button class="btn-icon del" onclick="removeMelario(${i})" title="Rimuovi">✕</button>
        </div>
      </div>
      <div id="melEditForm-${i}" style="display:none;background:white;border:1px solid var(--cream-dark);border-radius:4px;padding:0.8rem;margin-top:0.2rem">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.6rem;margin-bottom:0.6rem">
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">N° telaini</label>
            <input type="number" id="melEditNum-${i}" value="${m.num}" min="1" max="12" style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.95rem;background:var(--cream)">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">Data</label>
            <input type="date" id="melEditData-${i}" value="${m.data||''}" style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.95rem;background:var(--cream)">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">Stato</label>
            <select id="melEditStatus-${i}" style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.95rem;background:var(--cream)">
              <option value="posizionato" ${m.status==='posizionato'?'selected':''}>In produzione</option>
              <option value="rimosso" ${m.status==='rimosso'?'selected':''}>Rimosso</option>
              <option value="produzione" ${m.status==='produzione'?'selected':''}>Smielato</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:0.6rem">
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">Note</label>
          <input type="text" id="melEditNote-${i}" value="${m.note||''}" placeholder="Es. acacia, 8 telaini opercolati..." style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.95rem;background:var(--cream)">
        </div>
        <div style="display:flex;gap:0.5rem;justify-content:flex-end">
          <button class="btn btn-secondary" style="padding:0.35rem 0.8rem;font-size:0.85rem" onclick="closeMelEdit(${i})">Annulla</button>
          <button class="btn" style="padding:0.35rem 0.8rem;font-size:0.85rem" onclick="saveMelEdit(${i})">💾 Salva</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openMelEdit(i) {
  // Close any other open edit forms
  editingMelari.forEach((_,j) => {
    const f = document.getElementById(`melEditForm-${j}`);
    if(f) f.style.display = 'none';
  });
  const form = document.getElementById(`melEditForm-${i}`);
  if(form) form.style.display = 'block';
}

function closeMelEdit(i) {
  const form = document.getElementById(`melEditForm-${i}`);
  if(form) form.style.display = 'none';
}

function saveMelEdit(i) {
  const num = document.getElementById(`melEditNum-${i}`).value;
  if(!num) { alert('Inserisci il numero di telaini'); return; }
  editingMelari[i] = {
    ...editingMelari[i],
    num,
    data: document.getElementById(`melEditData-${i}`).value,
    status: document.getElementById(`melEditStatus-${i}`).value,
    note: document.getElementById(`melEditNote-${i}`).value.trim()
  };
  renderModalMelari();
}

function addMelario() {
  const num = document.getElementById('melNum').value;
  if(!num) { alert('Inserisci il numero di telaini'); return; }
  editingMelari.push({
    num, data: document.getElementById('melData').value,
    status: document.getElementById('melStatus').value,
    note: document.getElementById('melNote').value.trim(),
    id: Date.now().toString()
  });
  document.getElementById('melNum').value = '';
  document.getElementById('melNote').value = '';
  renderModalMelari();
}

function removeMelario(i) {
  editingMelari.splice(i,1);
  renderModalMelari();
}

// =================================================
// RETE PROPOLI (max 1 per arnia)
// =================================================
function renderModalRetePropoli() {
  const cont = document.getElementById('retePropoliBox');
  if(!cont) return;
  const r = editingRetePropoli;
  if(!r) {
    cont.innerHTML = `
      <div style="text-align:center;padding:0.8rem;color:var(--text-light);font-size:0.9rem">
        <div style="margin-bottom:0.6rem;font-style:italic">Nessuna rete propoli attiva</div>
        <button class="btn" type="button" onclick="attivaRetePropoli()" style="padding:0.4rem 1rem;font-size:0.88rem">➕ Attiva rete propoli</button>
      </div>
    `;
    return;
  }
  cont.innerHTML = `
    <div style="background:white;border:1px solid var(--cream-dark);border-radius:4px;padding:0.8rem">
      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.6rem">
        <span style="font-size:1.2rem">🌿</span>
        <span style="color:var(--brown);font-weight:600">Rete attiva dal ${r.data ? formatDate(r.data) : '—'}</span>
        <span class="mel-status mel-posizionato" style="margin-left:auto">Attiva</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem">
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">Data attivazione</label>
          <input type="date" value="${r.data||''}" onchange="editingRetePropoli.data=this.value" style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.9rem;background:var(--cream)">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">Note</label>
          <input type="text" value="${r.note||''}" oninput="editingRetePropoli.note=this.value" placeholder="Es. sopra il nido..." style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.9rem;background:var(--cream)">
        </div>
      </div>
      <button class="btn btn-danger" type="button" onclick="disattivaRetePropoli()" style="padding:0.35rem 0.8rem;font-size:0.85rem">🗑 Disattiva rete</button>
    </div>
  `;
}

function attivaRetePropoli() {
  editingRetePropoli = {
    data: new Date().toISOString().slice(0,10),
    note: '',
    storico: editingRetePropoli?.storico || []
  };
  renderModalRetePropoli();
}

function disattivaRetePropoli() {
  if(!confirm('Disattivare la rete propoli? Verrà registrata nello storico.')) return;
  // Storicizza
  const r = editingRetePropoli;
  if(r) {
    const storico = r.storico || [];
    storico.push({
      dataInizio: r.data,
      dataFine: new Date().toISOString().slice(0,10),
      note: r.note,
      stato: 'raschiata'
    });
    editingRetePropoli = { attiva: false, storico };
    // Per coerenza con il check "attiva", impostiamo a null se non c'è nulla di interessante
    if(storico.length === 0) editingRetePropoli = null;
  } else {
    editingRetePropoli = null;
  }
  renderModalRetePropoli();
}

// =================================================
// TRAPPOLA POLLINE (max 1 per arnia)
// =================================================
function renderModalTrappolaPolline() {
  const cont = document.getElementById('trappolaPollineBox');
  if(!cont) return;
  const t = editingTrappolaPolline;
  if(!t || t.attiva === false) {
    cont.innerHTML = `
      <div style="text-align:center;padding:0.8rem;color:var(--text-light);font-size:0.9rem">
        <div style="margin-bottom:0.6rem;font-style:italic">Nessuna trappola polline attiva</div>
        <button class="btn" type="button" onclick="attivaTrappolaPolline()" style="padding:0.4rem 1rem;font-size:0.88rem">➕ Attiva trappola polline</button>
      </div>
    `;
    return;
  }
  cont.innerHTML = `
    <div style="background:white;border:1px solid var(--cream-dark);border-radius:4px;padding:0.8rem">
      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.6rem">
        <span style="font-size:1.2rem">🌾</span>
        <span style="color:var(--brown);font-weight:600">Trappola attiva dal ${t.data ? formatDate(t.data) : '—'}</span>
        <span class="mel-status mel-posizionato" style="margin-left:auto">Attiva</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.6rem;margin-bottom:0.6rem">
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">Posizione</label>
          <select onchange="editingTrappolaPolline.posizione=this.value" style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.9rem;background:var(--cream)">
            <option value="Entrata" ${t.posizione==='Entrata'?'selected':''}>Entrata (esterna)</option>
            <option value="Fondo" ${t.posizione==='Fondo'?'selected':''}>Fondo (cassetto)</option>
            <option value="Interna" ${t.posizione==='Interna'?'selected':''}>Interna (sopra nido)</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">Data attivaz.</label>
          <input type="date" value="${t.data||''}" onchange="editingTrappolaPolline.data=this.value" style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.9rem;background:var(--cream)">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2rem">Note</label>
          <input type="text" value="${t.note||''}" oninput="editingTrappolaPolline.note=this.value" placeholder="Es. attiva 3gg/sett..." style="width:100%;padding:0.4rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.9rem;background:var(--cream)">
        </div>
      </div>
      <button class="btn btn-danger" type="button" onclick="disattivaTrappolaPolline()" style="padding:0.35rem 0.8rem;font-size:0.85rem">🗑 Disattiva trappola</button>
    </div>
  `;
}

function attivaTrappolaPolline() {
  editingTrappolaPolline = {
    posizione: editingTrappolaPolline?.posizione || 'Entrata',
    data: new Date().toISOString().slice(0,10),
    note: '',
    attiva: true,
    storico: editingTrappolaPolline?.storico || []
  };
  renderModalTrappolaPolline();
}

function disattivaTrappolaPolline() {
  if(!confirm('Disattivare la trappola polline? Verrà registrata nello storico.')) return;
  const t = editingTrappolaPolline;
  if(t) {
    const storico = t.storico || [];
    storico.push({
      dataInizio: t.data,
      dataFine: new Date().toISOString().slice(0,10),
      posizione: t.posizione,
      note: t.note
    });
    editingTrappolaPolline = { attiva: false, storico };
    if(storico.length === 0) editingTrappolaPolline = null;
  } else {
    editingTrappolaPolline = null;
  }
  renderModalTrappolaPolline();
}

function openArniModal(id) {
  const modal = document.getElementById('arniModal');
  if(!modal) {
    console.error('[Arnie] arniModal non trovato nel DOM');
    return;
  }
  if(id) {
    const a = arnie.find(x => x.id === id);
    if(!a) {
      console.warn('[Arnie] Arnia non trovata per modifica:', id);
      return;
    }
    document.getElementById('arniModalTitle').textContent = '✏️ Modifica Arnia';
    document.getElementById('editArniId').value = id;
    document.getElementById('arniNum').value = a.num;
    if(document.getElementById('arniTipo')) document.getElementById('arniTipo').value = a.tipo || 'famiglia';
    document.getElementById('arniNome').value = a.nome || '';
    document.getElementById('arniStatus').value = a.status;
    document.getElementById('arniReginaAnno').value = a.reginaAnno || '';
    document.getElementById('arniNote').value = a.note || '';
    document.getElementById('arniRazza').value = a.razza || '';
    document.getElementById('arniRazzaOrigine').value = a.razzaOrigine || '';
    document.getElementById('arniTemperamento').value = a.temperamento || '';
    document.getElementById('arniSciamatura').value = a.sciamatura || '';
    document.getElementById('arniProduttivita').value = a.produttivita || '';
    document.getElementById('arniRazzaNote').value = a.razzaNote || '';
    document.getElementById('arniAnnoIntroduzione').value = a.annoIntroduzione || '';
    document.getElementById('arniAnnoDismissione').value = a.annoDismissione || '';
    editingMelari = JSON.parse(JSON.stringify(a.melari || []));
    editingRetePropoli = a.retePropoli ? JSON.parse(JSON.stringify(a.retePropoli)) : null;
    editingTrappolaPolline = a.trappolaPolline ? JSON.parse(JSON.stringify(a.trappolaPolline)) : null;
    // Genealogia
    editingTelaini = JSON.parse(JSON.stringify(a.telainiOrigine || []));
    document.getElementById('arniDataCostituzione').value = a.dataCostituzione || '';
    document.getElementById('arniSciameDim').value = a.sciameDim || '';
    document.getElementById('arniSciameLuogo').value = a.sciameLuogo || '';
    selectReginaOrigine(a.reginaOrigine || 'allevata');
    if(a.reginaArniaSrc) document.getElementById('arniReginaArniaSrc').value = a.reginaArniaSrc;
    if(a.reginaFornitore) document.getElementById('arniReginaFornitore').value = a.reginaFornitore;
  } else {
    document.getElementById('arniModalTitle').textContent = '🏠 Nuova Arnia';
    document.getElementById('editArniId').value = '';
    document.getElementById('arniNum').value = nextArniaNumber();
    if(document.getElementById('arniTipo')) document.getElementById('arniTipo').value = 'famiglia';
    document.getElementById('arniNome').value = '';
    document.getElementById('arniStatus').value = 'attiva';
    document.getElementById('arniReginaAnno').value = '';
    document.getElementById('arniNote').value = '';
    document.getElementById('arniRazza').value = '';
    document.getElementById('arniRazzaOrigine').value = '';
    document.getElementById('arniTemperamento').value = '';
    document.getElementById('arniSciamatura').value = '';
    document.getElementById('arniProduttivita').value = '';
    document.getElementById('arniRazzaNote').value = '';
    document.getElementById('arniAnnoIntroduzione').value = '';
    document.getElementById('arniAnnoDismissione').value = '';
    editingMelari = [];
    editingRetePropoli = null;
    editingTrappolaPolline = null;
    editingTelaini = [];
    // Genealogia: defaults
    document.getElementById('arniDataCostituzione').value = new Date().toISOString().slice(0,10);
    document.getElementById('arniSciameDim').value = '';
    document.getElementById('arniSciameLuogo').value = '';
    document.getElementById('arniReginaFornitore').value = '';
    selectReginaOrigine('allevata');
  }
  document.getElementById('melData').value = new Date().toISOString().slice(0,10);
  renderModalMelari();
  renderModalRetePropoli();
  renderModalTrappolaPolline();
  // Aggiorna sezione genealogia visibilità e contenuto
  updateGenealogiaVisibility();
  renderTelainiList();
  updateReginaDateInfo();
  aggiornaReginaPreview();
  modal.classList.add('open');
}
function closeArniModal() { document.getElementById('arniModal').classList.remove('open'); }

function saveArnia() {
  const editId = document.getElementById('editArniId').value;

  // Numero: se editing manteniamo quello esistente; se nuovo arnia, auto-assegnato
  let num;
  if(editId) {
    const existing = arnie.find(a => a.id === editId);
    num = existing ? existing.num : nextArniaNumber();
  } else {
    num = nextArniaNumber();
  }

  const data = {
    id: editId || Date.now().toString(),
    num: String(num),
    tipo: document.getElementById('arniTipo')?.value || 'famiglia',
    nome: document.getElementById('arniNome').value.trim(),
    status: document.getElementById('arniStatus').value,
    reginaAnno: document.getElementById('arniReginaAnno').value,
    note: document.getElementById('arniNote').value.trim(),
    razza: document.getElementById('arniRazza').value,
    razzaOrigine: document.getElementById('arniRazzaOrigine').value.trim(),
    temperamento: document.getElementById('arniTemperamento').value,
    sciamatura: document.getElementById('arniSciamatura').value,
    produttivita: document.getElementById('arniProduttivita').value,
    razzaNote: document.getElementById('arniRazzaNote').value.trim(),
    annoIntroduzione: parseInt(document.getElementById('arniAnnoIntroduzione').value, 10) || null,
    annoDismissione:  parseInt(document.getElementById('arniAnnoDismissione').value, 10)  || null,
    melari: editingMelari,
    retePropoli: editingRetePropoli,
    trappolaPolline: editingTrappolaPolline,
    // ===== GENEALOGIA =====
    telainiOrigine: editingTelaini,
    dataCostituzione: document.getElementById('arniDataCostituzione')?.value || '',
    reginaOrigine: document.getElementById('arniReginaOrigine')?.value || 'allevata',
    reginaArniaSrc: document.getElementById('arniReginaArniaSrc')?.value || '',
    reginaFornitore: document.getElementById('arniReginaFornitore')?.value.trim() || '',
    sciameDim: document.getElementById('arniSciameDim')?.value || '',
    sciameLuogo: document.getElementById('arniSciameLuogo')?.value.trim() || '',
    // Flag per check evoluzione sciame alla prima visita successiva
    sciameNeedsEvolutionCheck: (document.getElementById('arniTipo')?.value === 'sciame')
      ? (editId ? arnie.find(a => a.id === editId)?.sciameNeedsEvolutionCheck ?? true : true)
      : false,
  };
  if(editId) {
    arnie = arnie.map(a => a.id === editId ? { ...a, ...data } : a);
  } else {
    arnie.push(data);
  }
  saveDB();
  closeArniModal();
  renderArnie();
}

function deleteArnia(id) {
  const arnia = arnie.find(a => a.id === id);
  if(!arnia) { console.warn('[Arnie] Arnia non trovata:', id); return; }
  const visiteCollegate = logBook.filter(e => e.arniaId === id).length;
  let msg = `Eliminare l'arnia #${arnia.num}${arnia.nome ? ' — '+arnia.nome : ''}?`;
  if(visiteCollegate > 0) {
    msg += `\n\n⚠️ Ci sono ${visiteCollegate} visite registrate per questa arnia.\nVerranno mantenute nel registro come visite di un'arnia eliminata.`;
  }
  if(!confirm(msg)) return;
  arnie = arnie.filter(a => a.id !== id);
  // Pulisce eventuali necessità orfane collegate ad articoli di questa arnia
  // (non c'è collegamento diretto necessita→arnia, quindi non serve)
  saveDB();
  renderArnie();
  if(typeof renderHome === 'function') renderHome();
}

// ======= DETAIL PANEL =======
// ============================================
// EDIT MAPPA TELAINI ULTIMA ISPEZIONE
// ============================================
let _editingTelainiMap = []; // mappa temporanea durante editing
let _editingTelainiLogId = null;

function apriEditTelaini(arniaId, logId) {
  const log = logBook.find(e => e.id === logId);
  if(!log || !log.ispezione) {
    alert('Ispezione non trovata.');
    return;
  }
  _editingTelainiLogId = logId;
  _editingTelainiMap = [...(log.ispezione.mappa || [])];
  // Se la mappa è vuota, parti dal numero telaini dichiarato
  if(_editingTelainiMap.length === 0 && log.ispezione.telaini) {
    const n = parseInt(log.ispezione.telaini, 10);
    if(!isNaN(n)) {
      _editingTelainiMap = Array(n).fill(''); // vuoto = "?"
    }
  }
  if(_editingTelainiMap.length === 0) {
    _editingTelainiMap = Array(10).fill(''); // default 10 telaini vuoti
  }
  const arnia = arnie.find(a => a.id === arniaId);
  document.getElementById('editTelainiTitle').textContent = `🍯 Mappa telaini · Arnia #${arnia.num} · Ispezione ${formatDate(log.data)}`;
  renderEditTelainiMap();
  document.getElementById('editTelainiModal').classList.add('open');
}

function closeEditTelaini() {
  document.getElementById('editTelainiModal').classList.remove('open');
  _editingTelainiLogId = null;
  _editingTelainiMap = [];
}

function renderEditTelainiMap() {
  const cont = document.getElementById('editTelainiList');
  if(!cont) return;

  // Usa TELAINO_OPZIONI da shared.js (le stesse usate nelle visite!)
  // Salta la prima opzione "vuota" per il selettore
  const tipi = TELAINO_OPZIONI.filter(t => t.value !== '');

  cont.innerHTML = _editingTelainiMap.map((tipo, idx) => {
    const info = getTelainoInfo(tipo);
    return `
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:white;border:1px solid var(--cream-dark);border-radius:4px">
        <div style="width:28px;height:36px;border-radius:3px;border:1.5px solid ${info.borderColor||'rgba(0,0,0,0.12)'};background:${info.color};display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:${info.textColor};flex-shrink:0">${info.short}</div>
        <div style="font-family:'Playfair Display',serif;font-weight:700;color:var(--brown);min-width:30px">T${idx+1}</div>
        <select onchange="_editingTelainiMap[${idx}] = this.value; renderEditTelainiMap()" style="flex:1;padding:0.3rem 0.5rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.88rem">
          ${tipi.map(t => `<option value="${t.value}" ${t.value===tipo?'selected':''}>${t.label}</option>`).join('')}
        </select>
        <button onclick="removeTelainoFromMap(${idx})" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:1rem;font-weight:700">✕</button>
      </div>
    `;
  }).join('');
}

function addTelainoToMap() {
  // Default: usa primo tipo non-vuoto
  const defaultTipo = TELAINO_OPZIONI.find(t => t.value !== '')?.value || 'covata';
  _editingTelainiMap.push(defaultTipo);
  renderEditTelainiMap();
}

function removeTelainoFromMap(idx) {
  _editingTelainiMap.splice(idx, 1);
  renderEditTelainiMap();
}

function salvaEditTelaini() {
  const log = logBook.find(e => e.id === _editingTelainiLogId);
  if(!log) return;
  if(!log.ispezione) log.ispezione = {};
  log.ispezione.mappa = [..._editingTelainiMap];
  // Aggiorna anche il conteggio totale telaini se non specificato
  if(!log.ispezione.telaini) {
    log.ispezione.telaini = _editingTelainiMap.length;
  }
  saveDB();
  closeEditTelaini();
  renderArnie();
}



// ============================================
// SCHEDA DETTAGLIATA ARNIA (Step 3)
// ============================================

let _currentSchedaArniaId = null;
let _currentSchedaTab = 'anagrafica';

// Wrapper compatibilità: openDetail → openSchedaDettagliata
function openDetail(id) {
  openSchedaDettagliata(id);
}

function openSchedaDettagliata(arniaId) {
  try {
    if(!arniaId) {
      console.warn('[Arnie] openSchedaDettagliata chiamata senza arniaId');
      return;
    }
    const arnia = arnie.find(a => a.id === arniaId);
    if(!arnia) {
      console.warn('[Arnie] Arnia non trovata per scheda:', arniaId);
      return;
    }
    _currentSchedaArniaId = arniaId;
    _currentSchedaTab = 'anagrafica';
    renderScheda();
    const modal = document.getElementById('schedaArniaModal');
    if(!modal) {
      console.error('[Arnie] schedaArniaModal non trovato nel DOM');
      return;
    }
    modal.classList.add('open');
  } catch(err) {
    console.error('[Arnie] Errore in openSchedaDettagliata:', err.message);
  }
}

function closeSchedaDettagliata() {
  const modal = document.getElementById('schedaArniaModal');
  if(modal) modal.classList.remove('open');
  _currentSchedaArniaId = null;
}

// Wrapper: modifica l'arnia attualmente aperta nella scheda dettagliata.
// Serve perché _currentSchedaArniaId è interna al modulo e non accessibile
// dall'onclick inline nell'HTML.
function modificaArniaScheda() {
  const id = _currentSchedaArniaId;
  if(!id) {
    console.warn('[Arnie] modificaArniaScheda: nessuna arnia corrente');
    return;
  }
  closeSchedaDettagliata();
  openArniModal(id);
}

// Wrapper: promuove l'arnia corrente (vedi nota su _currentSchedaArniaId sopra)
function promuoviArniaScheda() {
  const id = _currentSchedaArniaId;
  if(!id) {
    console.warn('[Arnie] promuoviArniaScheda: nessuna arnia corrente');
    return;
  }
  promuoviNucleo(id);
}

function setSchedaTab(tab) {
  _currentSchedaTab = tab;
  renderScheda();
}

function renderScheda() {
  try {
    const a = arnie.find(x => x.id === _currentSchedaArniaId);
    if(!a) {
      console.warn('[Arnie] renderScheda: arnia corrente non trovata', _currentSchedaArniaId);
      return;
    }

    const tipoInfo = (typeof ARNIA_TIPI !== 'undefined' && ARNIA_TIPI[a.tipo]) ? ARNIA_TIPI[a.tipo] : (typeof ARNIA_TIPI !== 'undefined' ? ARNIA_TIPI.famiglia : { label: 'Famiglia', icon: '🏠', short: 'Famiglia' });
    const statusLabel = {attiva:'Attiva',debole:'Debole',problema:'Problema',invernata:'Invernata'}[a.status] || a.status || '—';

    // Header (sempre visibile)
    const tags = (typeof computeArniaTags === 'function') ? computeArniaTags(a) : [];
    const customTags = a.customTags || [];

    const headerEl = document.getElementById('schedaHeader');
    if(!headerEl) {
      console.warn('[Arnie] schedaHeader non trovato');
      return;
    }
    headerEl.innerHTML = `
    <div class="scheda-num-badge">${tipoInfo.icon} #${a.num}</div>
    <div class="scheda-header-info">
      <h2 style="margin:0;font-family:'Playfair Display',serif">${a.nome || '— senza nome —'}</h2>
      <div style="opacity:0.9;font-size:0.92rem;margin-top:0.3rem">
        <span class="scheda-tipo-pill badge-${a.tipo}">${tipoInfo.label}</span>
        · ${statusLabel}
      </div>
      <div class="scheda-tags-row">
        ${tags.map(t => `<span class="scheda-tag scheda-tag-auto" title="Tag automatico">${t}</span>`).join('')}
        ${customTags.map((t,i) => `<span class="scheda-tag scheda-tag-custom">${t}<button onclick="removeCustomTag(${i})" style="margin-left:4px;background:none;border:none;color:inherit;cursor:pointer;font-weight:700">✕</button></span>`).join('')}
        <button class="scheda-tag-add" onclick="addCustomTag()" title="Aggiungi tag personalizzato">➕ tag</button>
      </div>
    </div>
  `;

  // Tab buttons
  document.querySelectorAll('.scheda-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === _currentSchedaTab);
  });

  // Tab content
  let content = '';
  try {
    if(_currentSchedaTab === 'anagrafica')  content = renderSchedaAnagrafica(a);
    if(_currentSchedaTab === 'produzioni')  content = renderSchedaProduzioni(a);
    if(_currentSchedaTab === 'timeline')    content = renderSchedaTimeline(a);
    if(_currentSchedaTab === 'stats')       content = renderSchedaStats(a);
    if(_currentSchedaTab === 'note')        content = renderSchedaNote(a);
  } catch(err) {
    console.error('[Arnie] Errore rendering tab', _currentSchedaTab, ':', err.message);
    content = `<div style="color:var(--red);padding:1rem;font-style:italic">Errore caricamento sezione. Apri F12 per dettagli.</div>`;
  }

  const bodyEl = document.getElementById('schedaBody');
  if(bodyEl) bodyEl.innerHTML = content;

  // Promote button (solo nucleo)
  const promBtn = document.getElementById('schedaPromuoviBtn');
  if(promBtn) {
    promBtn.style.display = (a.tipo === 'nucleo') ? 'inline-block' : 'none';
  }
  } catch(err) {
    console.error('[Arnie] Errore generale in renderScheda:', err.message);
  }
}

// ============================================
// PUNTEGGIO SALUTE (adattivo)
// ============================================
function calcolaPunteggioSalute(arniaId) {
  // Cerca le ultime 3 ispezioni con dati per quest'arnia
  const ispezioni = logBook
    .filter(e => e.arniaId === arniaId && e.ispezione)
    .slice(0, 3);

  if(ispezioni.length === 0) {
    return { score: null, level: 'unknown', label: 'Dati insufficienti', factors: [] };
  }

  // Componenti adattive: media solo dei dati disponibili
  const factors = [];
  let totalWeight = 0;
  let totalScore = 0;

  // 1) Popolazione / sviluppo (telaini popolati)
  const telainiVals = ispezioni.map(i => parseInt(i.ispezione.telaini, 10)).filter(v => !isNaN(v));
  if(telainiVals.length) {
    const media = telainiVals.reduce((s,v)=>s+v,0) / telainiVals.length;
    // 10 favi = 10/10, 5 favi = 5/10, ecc.
    const score = Math.min(10, media);
    factors.push({ label: 'Sviluppo (telaini)', val: media.toFixed(1) + ' favi', score, weight: 30 });
    totalScore += score * 30;
    totalWeight += 30;
  }

  // 2) Covata
  const covataVals = ispezioni.map(i => parseInt(i.ispezione.covata, 10)).filter(v => !isNaN(v));
  if(covataVals.length) {
    const media = covataVals.reduce((s,v)=>s+v,0) / covataVals.length;
    // Covata 0-5 → score 0-10
    const score = media * 2;
    factors.push({ label: 'Covata', val: media.toFixed(1) + '/5', score, weight: 25 });
    totalScore += score * 25;
    totalWeight += 25;
  }

  // 3) Scorte
  const scorteVals = ispezioni.map(i => parseInt(i.ispezione.scorte, 10)).filter(v => !isNaN(v));
  if(scorteVals.length) {
    const media = scorteVals.reduce((s,v)=>s+v,0) / scorteVals.length;
    const score = media * 2;
    factors.push({ label: 'Scorte', val: media.toFixed(1) + '/5', score, weight: 20 });
    totalScore += score * 20;
    totalWeight += 20;
  }

  // 4) Celle reali (penalty se presenti)
  const celleRealiVals = ispezioni
    .map(i => i.ispezione.celleReali)
    .filter(v => v !== undefined && v !== '');
  if(celleRealiVals.length) {
    // 'no' → 10, 'sciamatura'/'sostituzione' → 5, 'emergenza' → 3
    const scores = celleRealiVals.map(v => {
      if(v === 'no' || v === 'nessuna') return 10;
      if(v === 'sostituzione') return 7;
      if(v === 'sciamatura') return 4;
      if(v === 'emergenza') return 3;
      return 6;
    });
    const score = scores.reduce((s,v)=>s+v,0) / scores.length;
    factors.push({ label: 'Tendenza sciamatura', val: celleRealiVals[0], score, weight: 15 });
    totalScore += score * 15;
    totalWeight += 15;
  }

  // 5) Frequenza visite (negli ultimi 60 giorni)
  const visite60gg = logBook.filter(e => {
    if(e.arniaId !== arniaId) return false;
    if(!e.data) return false;
    const d = new Date(e.data);
    if(isNaN(d.getTime())) return false;
    const diff = (Date.now() - d.getTime()) / (1000*60*60*24);
    return diff <= 60;
  });
  const giorniMediVisite = visite60gg.length >= 2 ? (60 / visite60gg.length) : null;
  if(giorniMediVisite !== null) {
    // 10-15 gg = ottimo (10), 20+ gg = scarso (5)
    let score = 10;
    if(giorniMediVisite > 21) score = 5;
    else if(giorniMediVisite > 15) score = 7;
    factors.push({ label: 'Frequenza visite', val: Math.round(giorniMediVisite) + ' gg medi', score, weight: 10 });
    totalScore += score * 10;
    totalWeight += 10;
  }

  if(totalWeight === 0) {
    return { score: null, level: 'unknown', label: 'Dati insufficienti', factors: [] };
  }

  const finalScore = totalScore / totalWeight;
  let level, label;
  if(finalScore >= 7.5)      { level = 'high'; label = 'Ottima'; }
  else if(finalScore >= 5.5) { level = 'medium'; label = 'Buona'; }
  else if(finalScore >= 3.5) { level = 'low'; label = 'Da monitorare'; }
  else                       { level = 'critical'; label = 'Critica'; }

  return { score: finalScore.toFixed(1), level, label, factors };
}

// ============================================
// TAG AUTOMATICI
// ============================================
function computeArniaTags(a) {
  const tags = [];

  // Calcolo produzione anno corrente
  const anno = String(new Date().getFullYear());
  const melariRimossi = (a.melari||[]).filter(m => m.status === 'rimosso' || m.status === 'produzione');
  const visiteRaccolta = logBook.filter(e => e.arniaId === a.id && e.raccolta && e.raccolta.length > 0);
  const kgAnno = visiteRaccolta
    .filter(e => e.data && e.data.startsWith(anno))
    .reduce((sum, e) => sum + e.raccolta.reduce((s, r) => s + (parseFloat(r.qta) || 0), 0), 0);

  // Tag produzione
  if(kgAnno >= 25) tags.push('🍯 Forte produttrice');
  else if(kgAnno >= 15) tags.push('🍯 Produttiva');

  // Sciamatura
  if(a.sciamatura === 'Alta') tags.push('⚠️ Tendenza sciamatura');

  // Temperamento
  if(a.temperamento === 'Molto docile' || a.temperamento === 'Docile') tags.push('😊 Docile');
  if(a.temperamento === 'Aggressiva') tags.push('😡 Aggressiva');

  // Regina giovane
  if(a.reginaAnno && (new Date().getFullYear() - parseInt(a.reginaAnno,10)) <= 1) {
    tags.push('👑 Regina giovane');
  }

  // Età colonia
  if(a.annoIntroduzione) {
    const eta = new Date().getFullYear() - parseInt(a.annoIntroduzione, 10);
    if(eta >= 3) tags.push('🌲 Colonia consolidata');
  }

  // Status
  if(a.status === 'debole') tags.push('⚠️ Debole');
  if(a.status === 'problema') tags.push('❌ Problema');

  return tags;
}

function addCustomTag() {
  const a = arnie.find(x => x.id === _currentSchedaArniaId);
  if(!a) return;
  const tag = prompt('Inserisci nuovo tag personalizzato:');
  if(!tag || !tag.trim()) return;
  if(!a.customTags) a.customTags = [];
  a.customTags.push(tag.trim());
  saveDB();
  renderScheda();
}

function removeCustomTag(idx) {
  const a = arnie.find(x => x.id === _currentSchedaArniaId);
  if(!a || !a.customTags) return;
  a.customTags.splice(idx, 1);
  saveDB();
  renderScheda();
}

// ============================================
// TAB ANAGRAFICA
// ============================================
function renderSchedaAnagrafica(a) {
  const salute = calcolaPunteggioSalute(a.id);
  const tipoInfo = ARNIA_TIPI[a.tipo] || ARNIA_TIPI.famiglia;
  const meleAnno = computeMieleAnno(a.id);
  const ultimaVisita = logBook.filter(e => e.arniaId === a.id)[0];
  const giorniDaUltima = (() => {
    if(!ultimaVisita || !ultimaVisita.data) return null;
    const d = new Date(ultimaVisita.data);
    if(isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000*60*60*24));
  })();
  const melariAttivi = (a.melari||[]).filter(m=>m.status==='posizionato').length;

  // Health card
  let healthCardHtml = '';
  if(salute.score !== null) {
    healthCardHtml = `
      <div class="scheda-health-card ${salute.level}">
        <div class="scheda-health-score">${salute.score}</div>
        <div class="scheda-health-info">
          <h3>Punteggio salute: ${salute.score}/10 — ${salute.label}</h3>
          <p>Calcolato sui dati delle ultime ${Math.min(3, logBook.filter(e=>e.arniaId===a.id&&e.ispezione).length)} visite. Click "📊 Statistiche" per i dettagli.</p>
        </div>
      </div>
    `;
  } else {
    healthCardHtml = `
      <div class="scheda-health-card unknown">
        <div class="scheda-health-score">—</div>
        <div class="scheda-health-info">
          <h3>Punteggio salute: dati insufficienti</h3>
          <p>Registra qualche ispezione con dati su covata, scorte e telaini per ottenere il punteggio.</p>
        </div>
      </div>
    `;
  }

  // Anagrafica grid
  let anagHtml = '<div class="scheda-anag-grid">';
  if(a.reginaAnno) anagHtml += `<div class="scheda-anag-card"><div class="scheda-anag-label">${getReginaPallino(a.reginaAnno, 12)}Anno regina</div><div class="scheda-anag-val">${a.reginaAnno}</div></div>`;
  if(a.annoIntroduzione) {
    const eta = new Date().getFullYear() - parseInt(a.annoIntroduzione, 10);
    anagHtml += `<div class="scheda-anag-card"><div class="scheda-anag-label">📅 Età colonia</div><div class="scheda-anag-val">${eta} ${eta===1?'anno':'anni'}</div></div>`;
  }
  if(a.razza) anagHtml += `<div class="scheda-anag-card"><div class="scheda-anag-label">🐝 Razza</div><div class="scheda-anag-val">${a.razza}</div></div>`;
  if(ultimaVisita) anagHtml += `<div class="scheda-anag-card"><div class="scheda-anag-label">📅 Ultima visita</div><div class="scheda-anag-val">${formatDate(ultimaVisita.data)}<br><small style="font-weight:400">(${giorniDaUltima} gg fa)</small></div></div>`;
  if(meleAnno > 0) anagHtml += `<div class="scheda-anag-card"><div class="scheda-anag-label">🍯 Miele ${new Date().getFullYear()}</div><div class="scheda-anag-val">${meleAnno.toFixed(1)} kg</div></div>`;
  if(melariAttivi > 0) anagHtml += `<div class="scheda-anag-card"><div class="scheda-anag-label">🍯 Melari attivi</div><div class="scheda-anag-val">${melariAttivi}</div></div>`;
  if(a.temperamento) anagHtml += `<div class="scheda-anag-card"><div class="scheda-anag-label">😊 Temperamento</div><div class="scheda-anag-val">${a.temperamento}</div></div>`;
  if(a.sciamatura) anagHtml += `<div class="scheda-anag-card"><div class="scheda-anag-label">⚠️ Sciamatura</div><div class="scheda-anag-val">${a.sciamatura}</div></div>`;
  anagHtml += '</div>';

  // Genealogia (mostrata sempre, per ogni tipo di arnia)
  let genealogiaHtml = renderGenealogiaSection(a);

  // Razza box
  let razzaBox = '';
  if(a.razzaOrigine || a.razzaNote) {
    razzaBox = `
      <div class="scheda-section">
        <h4>🐝 Razza e provenienza</h4>
        ${a.razzaOrigine ? `<p style="margin:0.3rem 0"><strong>Provenienza:</strong> ${a.razzaOrigine}</p>` : ''}
        ${a.razzaNote ? `<p style="margin:0.3rem 0;font-style:italic;color:var(--text-light)">${a.razzaNote}</p>` : ''}
      </div>
    `;
  }

  return `
    ${healthCardHtml}
    ${anagHtml}
    ${genealogiaHtml}
    ${razzaBox}
  `;
}

// Helper: miele anno corrente
function computeMieleAnno(arniaId) {
  const anno = new Date().getFullYear();
  return logBook
    .filter(e => e.arniaId === arniaId && e.raccolta && e.data && e.data.startsWith(String(anno)))
    .reduce((sum, e) => sum + (e.raccolta || []).reduce((s, r) => s + (parseFloat(r.qta) || 0), 0), 0);
}

// ============================================
// GENEALOGIA SECTION
// ============================================
function renderGenealogiaSection(a) {
  let html = '<div class="scheda-section"><h4>🌳 Genealogia</h4>';

  // Origine
  html += '<div class="genealogia-tree">';

  // Dati propri
  const dataCost = a.dataCostituzione ? formatDate(a.dataCostituzione) : '—';
  const reginaOriginiLabel = { allevata: '🥚 Allevata sul posto', inserita: '👑 Regina inserita', acquistata: '📥 Regina acquistata' };

  // Sciame: mostra origine e dimensione
  if(a.tipo === 'sciame') {
    html += `<div class="genealogia-line current">
      🐝 <strong>Sciame #${a.num}</strong> ← TU SEI QUI
      <div style="margin-left:1rem;font-size:0.85rem;color:var(--text-light);margin-top:0.3rem">
        Catturato il ${dataCost}
        ${a.sciameDim ? ` · Dimensione: ${a.sciameDim}` : ''}
        ${a.sciameLuogo ? `<br>Luogo: ${a.sciameLuogo}` : ''}
      </div>
    </div>`;
  } else {
    // Nucleo/Fecondazione: mostra arnie sorgenti
    const telaini = a.telainiOrigine || [];
    if(telaini.length > 0) {
      // Raggruppa per arnia sorgente
      const perArnia = {};
      telaini.forEach((t,i) => {
        const src = t.arniaSrcId || '';
        if(!perArnia[src]) perArnia[src] = [];
        perArnia[src].push({ ...t, idx: i+1 });
      });

      Object.entries(perArnia).forEach(([srcId, ts]) => {
        const srcArnia = arnie.find(x => x.id === srcId);
        const srcLabel = srcArnia
          ? `${ARNIA_TIPI[srcArnia.tipo].icon} <strong>#${srcArnia.num}${srcArnia.nome ? ' — '+srcArnia.nome : ''}</strong>`
          : '<em style="color:var(--text-light)">Origine non specificata</em>';
        html += `<div class="genealogia-line parent">
          ${srcLabel} — contributo di ${ts.length} ${ts.length===1?'telaino':'telaini'}
          <div style="margin-left:1rem;font-size:0.82rem;color:var(--text-light);margin-top:0.3rem">
            ${ts.map(t => `• Telaino ${t.idx}: ${TELAINO_TIPI[t.tipo]?.label || t.tipo}${t.note ? ' — '+t.note : ''}`).join('<br>')}
          </div>
        </div>`;
      });
    }

    // Origine regina
    const reginaLabel = reginaOriginiLabel[a.reginaOrigine] || '—';
    let reginaExtra = '';
    if(a.reginaOrigine === 'inserita' && a.reginaArniaSrc) {
      const src = arnie.find(x => x.id === a.reginaArniaSrc);
      if(src) reginaExtra = ` da #${src.num}${src.nome ? ' — '+src.nome : ''}`;
    } else if(a.reginaOrigine === 'acquistata' && a.reginaFornitore) {
      reginaExtra = ` da ${a.reginaFornitore}`;
    }

    html += `<div class="genealogia-line current">
      ${ARNIA_TIPI[a.tipo].icon} <strong>${ARNIA_TIPI[a.tipo].label} #${a.num}</strong> ← TU SEI QUI
      <div style="margin-left:1rem;font-size:0.85rem;color:var(--text-light);margin-top:0.3rem">
        Costituito il ${dataCost} · Regina: ${reginaLabel}${reginaExtra}
      </div>
    </div>`;
  }

  // Discendenti (chi è derivato da quest'arnia)
  const discendenti = arnie.filter(other => {
    // Telaini provenienti
    const fromTelaini = (other.telainiOrigine||[]).some(t => t.arniaSrcId === a.id);
    // Regina inserita
    const fromRegina = other.reginaArniaSrc === a.id;
    return other.id !== a.id && (fromTelaini || fromRegina);
  });

  if(discendenti.length > 0) {
    html += '<div class="genealogia-line" style="background:transparent;border-left:none;padding:0.4rem 0 0;font-style:italic;color:var(--text-light)">⬇️ Ha contribuito a:</div>';
    discendenti.forEach(d => {
      const telainiContrib = (d.telainiOrigine||[]).filter(t => t.arniaSrcId === a.id).length;
      const reginaContrib = d.reginaArniaSrc === a.id;
      const contributi = [];
      if(telainiContrib > 0) contributi.push(`${telainiContrib} ${telainiContrib===1?'telaino':'telaini'}`);
      if(reginaContrib) contributi.push('regina');
      html += `<div class="genealogia-line child">
        ${ARNIA_TIPI[d.tipo].icon} <strong>${ARNIA_TIPI[d.tipo].label} #${d.num}${d.nome ? ' — '+d.nome : ''}</strong>
        ${d.dataCostituzione ? `il ${formatDate(d.dataCostituzione)}` : ''} · ${contributi.join(', ')}
      </div>`;
    });
  }

  html += '</div></div>';
  return html;
}

// ============================================
// TAB PRODUZIONI (melari + rete propoli + trappola polline + stats)
// ============================================
function renderSchedaProduzioni(a) {
  const oggi = new Date();
  const giorniDa = (dateStr) => {
    if(!dateStr) return null;
    const d = new Date(dateStr);
    if(isNaN(d.getTime())) return null;
    return Math.floor((oggi - d) / (1000 * 60 * 60 * 24));
  };

  // ===== STATISTICHE GLOBALI =====
  const melari = a.melari || [];
  const melariAttivi = melari.filter(m => m.status === 'posizionato');
  const melariSmielati = melari.filter(m => m.status === 'produzione');
  const melariRimossi = melari.filter(m => m.status === 'rimosso');
  const reteAttiva = a.retePropoli && a.retePropoli.attiva !== false;
  const reteStorico = a.retePropoli?.storico || [];
  const trappolaAttiva = a.trappolaPolline && a.trappolaPolline.attiva !== false;
  const trappolaStorico = a.trappolaPolline?.storico || [];
  const kgAnno = computeMieleAnno(a.id);

  // ===== SEZIONE 1: STATISTICHE PRODUZIONE =====
  let statsHtml = `
    <div class="scheda-stat-grid" style="margin-bottom:1.5rem">
      <div class="scheda-anag-card" style="background:rgba(200,134,10,0.08)">
        <div class="scheda-anag-label">🍯 Miele anno ${new Date().getFullYear()}</div>
        <div class="scheda-anag-val">${kgAnno > 0 ? kgAnno.toFixed(1) + ' kg' : '—'}</div>
      </div>
      <div class="scheda-anag-card" style="background:rgba(200,134,10,0.08)">
        <div class="scheda-anag-label">🍯 Cicli melari totali</div>
        <div class="scheda-anag-val">${melariSmielati.length}</div>
      </div>
      <div class="scheda-anag-card" style="background:rgba(93,140,68,0.08)">
        <div class="scheda-anag-label">🌿 Cicli rete propoli</div>
        <div class="scheda-anag-val">${reteStorico.length}${reteAttiva ? ' + 1 in corso' : ''}</div>
      </div>
      <div class="scheda-anag-card" style="background:rgba(216,180,254,0.15)">
        <div class="scheda-anag-label">🌾 Cicli trappola polline</div>
        <div class="scheda-anag-val">${trappolaStorico.length}${trappolaAttiva ? ' + 1 in corso' : ''}</div>
      </div>
    </div>
  `;

  // ===== SEZIONE 2: MELARI =====
  let melariHtml = `
    <div class="scheda-section">
      <h4>🍯 Melari</h4>
      ${melari.length === 0 ? '<p style="margin:0;color:var(--text-light);font-style:italic;font-size:0.9rem">Nessun melario registrato. Aggiungi un melario dal modale "Modifica arnia".</p>' : ''}
  `;

  if(melariAttivi.length > 0) {
    melariHtml += '<div style="margin-bottom:0.8rem"><strong style="color:var(--green);font-size:0.95rem">✓ In produzione:</strong></div>';
    melariAttivi.forEach(m => {
      const gg = giorniDa(m.data);
      melariHtml += `
        <div style="background:rgba(93,140,68,0.08);border-left:3px solid var(--green);padding:0.7rem 1rem;border-radius:4px;margin-bottom:0.5rem">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
            <strong>🍯 ${m.num} telaini</strong>
            <span style="color:var(--text-light);font-size:0.85rem">${m.data ? formatDate(m.data) : '—'}${gg !== null ? ` · da ${gg} ${gg === 1 ? 'giorno' : 'giorni'}` : ''}</span>
          </div>
          ${m.note ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:0.2rem;font-style:italic">${m.note}</div>` : ''}
        </div>
      `;
    });
  }

  if(melariSmielati.length > 0 || melariRimossi.length > 0) {
    melariHtml += '<div style="margin:0.8rem 0 0.4rem"><strong style="color:var(--text-light);font-size:0.88rem">Storico melari:</strong></div>';
    [...melariSmielati, ...melariRimossi].sort((a,b) => (b.data || '').localeCompare(a.data || '')).forEach(m => {
      const statusLabel = m.status === 'produzione' ? '✓ Smielato' : '↩ Rimosso';
      const statusColor = m.status === 'produzione' ? 'var(--amber)' : 'var(--text-light)';
      melariHtml += `
        <div style="background:rgba(0,0,0,0.02);border-left:3px solid ${statusColor};padding:0.5rem 0.8rem;border-radius:4px;margin-bottom:0.4rem;opacity:0.85">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;font-size:0.88rem">
            <span><strong>🍯 ${m.num} telaini</strong> · ${statusLabel}</span>
            <span style="color:var(--text-light);font-size:0.82rem">${m.data ? formatDate(m.data) : '—'}${m.dataFine ? ' → ' + formatDate(m.dataFine) : ''}</span>
          </div>
          ${m.note ? `<div style="font-size:0.82rem;color:var(--text-light);margin-top:0.2rem;font-style:italic">${m.note}</div>` : ''}
        </div>
      `;
    });
  }
  melariHtml += '</div>';

  // ===== SEZIONE 3: RETE PROPOLI =====
  let reteHtml = `
    <div class="scheda-section">
      <h4>🌿 Rete propoli</h4>
  `;

  if(reteAttiva) {
    const gg = giorniDa(a.retePropoli.data);
    reteHtml += `
      <div style="background:rgba(93,140,68,0.1);border-left:3px solid var(--green);padding:0.9rem 1.1rem;border-radius:6px;margin-bottom:0.8rem">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;align-items:center">
          <strong style="color:var(--green);font-size:1rem">✓ Attiva</strong>
          <span style="color:var(--text-light);font-size:0.88rem">Dal ${a.retePropoli.data ? formatDate(a.retePropoli.data) : '—'}${gg !== null ? ` · ${gg} ${gg === 1 ? 'giorno' : 'giorni'}` : ''}</span>
        </div>
        ${a.retePropoli.note ? `<div style="font-size:0.88rem;color:var(--ink);margin-top:0.4rem;font-style:italic">${a.retePropoli.note}</div>` : ''}
      </div>
    `;
  } else if(reteStorico.length === 0) {
    reteHtml += '<p style="margin:0;color:var(--text-light);font-style:italic;font-size:0.9rem">Nessuna rete propoli attiva. Mai utilizzata su questa arnia.</p>';
  } else {
    reteHtml += '<p style="margin:0 0 0.5rem;color:var(--text-light);font-style:italic;font-size:0.9rem">Nessuna rete propoli attualmente attiva.</p>';
  }

  if(reteStorico.length > 0) {
    reteHtml += '<div style="margin:0.8rem 0 0.4rem"><strong style="color:var(--text-light);font-size:0.88rem">Cicli passati (raschiati):</strong></div>';
    [...reteStorico].reverse().forEach(s => {
      const ggCiclo = (s.dataInizio && s.dataFine) ?
        Math.floor((new Date(s.dataFine) - new Date(s.dataInizio)) / (1000 * 60 * 60 * 24)) : null;
      reteHtml += `
        <div style="background:rgba(0,0,0,0.02);border-left:3px solid var(--amber);padding:0.5rem 0.8rem;border-radius:4px;margin-bottom:0.4rem;opacity:0.9">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;font-size:0.88rem">
            <span><strong>🌿 ${s.stato || 'raschiata'}</strong></span>
            <span style="color:var(--text-light);font-size:0.82rem">${s.dataInizio ? formatDate(s.dataInizio) : '—'} → ${s.dataFine ? formatDate(s.dataFine) : '—'}${ggCiclo ? ` · ${ggCiclo} gg` : ''}</span>
          </div>
          ${s.note ? `<div style="font-size:0.82rem;color:var(--text-light);margin-top:0.2rem;font-style:italic">${s.note}</div>` : ''}
        </div>
      `;
    });
  }
  reteHtml += '</div>';

  // ===== SEZIONE 4: TRAPPOLA POLLINE =====
  let trappolaHtml = `
    <div class="scheda-section">
      <h4>🌾 Trappola polline</h4>
  `;

  if(trappolaAttiva) {
    const gg = giorniDa(a.trappolaPolline.data);
    trappolaHtml += `
      <div style="background:rgba(216,180,254,0.18);border-left:3px solid #8B6BB1;padding:0.9rem 1.1rem;border-radius:6px;margin-bottom:0.8rem">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;align-items:center">
          <div>
            <strong style="color:#8B6BB1;font-size:1rem">✓ Attiva</strong>
            <span style="margin-left:0.5rem;background:rgba(139,107,177,0.2);color:#8B6BB1;padding:2px 8px;border-radius:10px;font-size:0.78rem;font-weight:600">${a.trappolaPolline.posizione || 'Entrata'}</span>
          </div>
          <span style="color:var(--text-light);font-size:0.88rem">Dal ${a.trappolaPolline.data ? formatDate(a.trappolaPolline.data) : '—'}${gg !== null ? ` · ${gg} ${gg === 1 ? 'giorno' : 'giorni'}` : ''}</span>
        </div>
        ${a.trappolaPolline.note ? `<div style="font-size:0.88rem;color:var(--ink);margin-top:0.4rem;font-style:italic">${a.trappolaPolline.note}</div>` : ''}
      </div>
    `;
  } else if(trappolaStorico.length === 0) {
    trappolaHtml += '<p style="margin:0;color:var(--text-light);font-style:italic;font-size:0.9rem">Nessuna trappola polline attiva. Mai utilizzata su questa arnia.</p>';
  } else {
    trappolaHtml += '<p style="margin:0 0 0.5rem;color:var(--text-light);font-style:italic;font-size:0.9rem">Nessuna trappola polline attualmente attiva.</p>';
  }

  if(trappolaStorico.length > 0) {
    trappolaHtml += '<div style="margin:0.8rem 0 0.4rem"><strong style="color:var(--text-light);font-size:0.88rem">Cicli passati (svuotati):</strong></div>';
    [...trappolaStorico].reverse().forEach(s => {
      const ggCiclo = (s.dataInizio && s.dataFine) ?
        Math.floor((new Date(s.dataFine) - new Date(s.dataInizio)) / (1000 * 60 * 60 * 24)) : null;
      trappolaHtml += `
        <div style="background:rgba(0,0,0,0.02);border-left:3px solid #8B6BB1;padding:0.5rem 0.8rem;border-radius:4px;margin-bottom:0.4rem;opacity:0.9">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;font-size:0.88rem">
            <span><strong>🌾 ${s.posizione || 'Trappola'}</strong> · svuotata</span>
            <span style="color:var(--text-light);font-size:0.82rem">${s.dataInizio ? formatDate(s.dataInizio) : '—'} → ${s.dataFine ? formatDate(s.dataFine) : '—'}${ggCiclo ? ` · ${ggCiclo} gg` : ''}</span>
          </div>
          ${s.note ? `<div style="font-size:0.82rem;color:var(--text-light);margin-top:0.2rem;font-style:italic">${s.note}</div>` : ''}
        </div>
      `;
    });
  }
  trappolaHtml += '</div>';

  // Info finale
  const infoFinale = `
    <div style="background:rgba(200,134,10,0.06);border:1px solid rgba(200,134,10,0.2);border-radius:6px;padding:0.7rem 1rem;font-size:0.85rem;color:var(--text-light);margin-top:1rem">
      💡 <strong>Per modificare</strong> melari, rete propoli o trappola polline usa il pulsante <strong>"✏️ Modifica"</strong> in basso, oppure registra una visita che li aggiorni automaticamente.
    </div>
  `;

  return statsHtml + melariHtml + reteHtml + trappolaHtml + infoFinale;
}

// ============================================
// TAB TIMELINE
// ============================================
function renderSchedaTimeline(a) {
  const eventi = logBook.filter(e => e.arniaId === a.id);

  if(eventi.length === 0) {
    return '<div style="text-align:center;padding:3rem 1rem;color:var(--text-light);font-style:italic">Nessuna visita registrata per questa arnia.</div>';
  }

  let html = '<div class="scheda-timeline">';
  eventi.forEach(e => {
    const tipi = getTipi(e);
    const isTrat = tipi.includes('trattamento');
    const isIsp = tipi.includes('ispezione');
    const isRacc = tipi.includes('raccolta');
    const cls = isTrat ? 'treatment' : (isIsp ? 'visit' : 'event');
    const typeLabel = isTrat ? '💊 TRATTAMENTO' : (isIsp ? '📋 VISITA' : (isRacc ? '🍯 RACCOLTA' : '📝 NOTA'));

    let dettagli = '';
    if(e.ispezione) {
      const d = e.ispezione;
      const parts = [];
      if(d.telaini) parts.push(`<strong>${d.telaini} favi</strong>`);
      if(d.covata) parts.push(`Covata ${d.covata}/5`);
      if(d.scorte) parts.push(`Scorte ${d.scorte}/5`);
      if(d.celleReali && d.celleReali !== 'no') parts.push(`Celle reali: ${d.celleReali}`);
      dettagli = parts.join(' · ');
    }
    if(e.raccolta && e.raccolta.length) {
      const kg = e.raccolta.reduce((s,r)=>s+(parseFloat(r.qta)||0),0);
      dettagli += (dettagli ? ' · ' : '') + `🍯 Raccolti ${kg.toFixed(1)} kg`;
    }
    if(e.trattamento) dettagli += (dettagli ? ' · ' : '') + `${e.trattamento.prodotto || 'Trattamento'}`;

    html += `
      <div class="scheda-timeline-item ${cls}">
        <div class="scheda-timeline-date">${formatDate(e.data)}</div>
        <div class="scheda-timeline-card ${cls}">
          <div class="scheda-timeline-type">${typeLabel}</div>
          ${dettagli ? `<div class="scheda-timeline-details">${dettagli}</div>` : ''}
          ${e.note ? `<div class="scheda-timeline-details" style="margin-top:0.3rem;font-style:italic;color:var(--text-light)">${e.note}</div>` : ''}
        </div>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

// ============================================
// TAB STATISTICHE
// ============================================
function renderSchedaStats(a) {
  // Produzione per anno
  const anniDati = [...new Set(logBook.filter(e => e.arniaId === a.id && e.data).map(e => e.data.slice(0,4)))].sort();
  const produzionePerAnno = {};
  const visitePerAnno = {};
  const trattamentiPerAnno = {};

  anniDati.forEach(anno => {
    const visite = logBook.filter(e => e.arniaId === a.id && e.data && e.data.startsWith(anno));
    visitePerAnno[anno] = visite.length;
    produzionePerAnno[anno] = visite.reduce((s,e) => s + ((e.raccolta||[]).reduce((ss,r) => ss + (parseFloat(r.qta)||0), 0)), 0);
    trattamentiPerAnno[anno] = visite.filter(e => getTipi(e).includes('trattamento')).length;
  });

  // Giorni medi tra visite (ultimi 90 gg)
  const visiteRecenti = logBook
    .filter(e => e.arniaId === a.id)
    .filter(e => {
      if(!e.data) return false;
      const t = new Date(e.data).getTime();
      if(isNaN(t)) return false;
      return (Date.now() - t) / (1000*60*60*24) <= 90;
    })
    .map(e => new Date(e.data));
  let giorniMedi = null;
  if(visiteRecenti.length >= 2) {
    visiteRecenti.sort((a,b) => a-b);
    const diffs = [];
    for(let i=1;i<visiteRecenti.length;i++) diffs.push((visiteRecenti[i]-visiteRecenti[i-1])/(1000*60*60*24));
    giorniMedi = diffs.reduce((s,d)=>s+d,0)/diffs.length;
  }

  // Punteggio salute dettagli
  const salute = calcolaPunteggioSalute(a.id);

  // Render bar charts
  const maxProd = Math.max(...Object.values(produzionePerAnno), 1);
  const maxVis = Math.max(...Object.values(visitePerAnno), 1);
  const maxTrat = Math.max(...Object.values(trattamentiPerAnno), 1);

  const annoCorr = String(new Date().getFullYear());

  const barChart = (data, max, color, fmtFn) => Object.entries(data).map(([anno, val]) => `
    <div class="stat-bar-row">
      <span style="width:42px;color:var(--text-light);font-weight:600${anno===annoCorr?';color:var(--brown)':''}">${anno}${anno===annoCorr?' ★':''}</span>
      <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${Math.round((val/max)*100)}%;background:${color}"></div></div>
      <span style="color:var(--brown);font-weight:600;font-size:0.78rem">${fmtFn(val)}</span>
    </div>
  `).join('');

  let html = `<div class="scheda-stat-grid">
    <div class="scheda-stat-card">
      <h4>🍯 Produzione miele per anno</h4>
      ${anniDati.length === 0 ? '<div style="color:var(--text-light);font-style:italic">Nessun dato</div>' : barChart(produzionePerAnno, maxProd, 'var(--amber)', v => v.toFixed(1)+' kg')}
    </div>
    <div class="scheda-stat-card">
      <h4>📋 Visite per anno</h4>
      ${anniDati.length === 0 ? '<div style="color:var(--text-light);font-style:italic">Nessun dato</div>' : barChart(visitePerAnno, maxVis, 'var(--green)', v => v)}
    </div>
    <div class="scheda-stat-card">
      <h4>💊 Trattamenti varroa</h4>
      ${anniDati.length === 0 ? '<div style="color:var(--text-light);font-style:italic">Nessun dato</div>' : barChart(trattamentiPerAnno, maxTrat, 'var(--red)', v => v)}
    </div>
    <div class="scheda-stat-card" style="text-align:center;display:flex;flex-direction:column;justify-content:center">
      <h4 style="text-align:left">⏱️ Frequenza visite</h4>
      ${giorniMedi !== null ? `
        <div style="font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:var(--brown);margin:0.5rem 0">${Math.round(giorniMedi)} gg</div>
        <p style="margin:0;font-size:0.82rem;color:var(--text-light)">media tra visite (ultimi 90 giorni)</p>
      ` : '<div style="color:var(--text-light);font-style:italic;padding:1rem 0">Servono almeno 2 visite</div>'}
    </div>
  </div>`;

  // Insight automatici
  const insights = [];
  if(produzionePerAnno[annoCorr] && Object.keys(produzionePerAnno).length >= 2) {
    const anniPrec = Object.keys(produzionePerAnno).filter(y => y < annoCorr);
    if(anniPrec.length > 0) {
      const lastY = anniPrec[anniPrec.length-1];
      const delta = produzionePerAnno[annoCorr] - produzionePerAnno[lastY];
      if(delta > 0) insights.push(`Produzione in crescita rispetto al ${lastY} (+${delta.toFixed(1)} kg)`);
      else if(delta < 0) insights.push(`Produzione in calo rispetto al ${lastY} (${delta.toFixed(1)} kg)`);
    }
  }
  if(giorniMedi !== null) {
    if(giorniMedi <= 14) insights.push('Frequenza visite ottimale per la stagione attiva');
    else if(giorniMedi > 21) insights.push('Frequenza visite bassa — considera di visitare più spesso');
  }
  if(salute.score !== null) {
    if(salute.level === 'high') insights.push('Una delle arnie più sane del tuo apiario');
    else if(salute.level === 'critical') insights.push('⚠️ Punteggio salute critico — interventi urgenti consigliati');
  }

  if(insights.length > 0) {
    html += `<div class="scheda-section" style="margin-top:1rem">
      <h4>🔍 Insight automatici</h4>
      <ul style="margin:0;padding-left:1.3rem;line-height:1.7">
        ${insights.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>`;
  }

  // Dettaglio punteggio salute
  if(salute.factors.length > 0) {
    html += `<div class="scheda-section" style="margin-top:1rem">
      <h4>📊 Componenti del punteggio salute</h4>
      <table style="width:100%;font-size:0.88rem;border-collapse:collapse">
        <thead><tr><th style="text-align:left;padding:0.4rem;border-bottom:1px solid var(--cream-dark);color:var(--text-light);font-weight:600">Fattore</th><th style="text-align:left;padding:0.4rem;border-bottom:1px solid var(--cream-dark);color:var(--text-light);font-weight:600">Valore</th><th style="text-align:right;padding:0.4rem;border-bottom:1px solid var(--cream-dark);color:var(--text-light);font-weight:600">Score</th><th style="text-align:right;padding:0.4rem;border-bottom:1px solid var(--cream-dark);color:var(--text-light);font-weight:600">Peso</th></tr></thead>
        <tbody>
          ${salute.factors.map(f => `<tr>
            <td style="padding:0.4rem;border-bottom:1px dotted var(--cream-dark)">${f.label}</td>
            <td style="padding:0.4rem;border-bottom:1px dotted var(--cream-dark)">${f.val}</td>
            <td style="padding:0.4rem;text-align:right;border-bottom:1px dotted var(--cream-dark);font-weight:600;color:${f.score>=7?'var(--green)':f.score>=5?'var(--amber)':'var(--red)'}">${f.score.toFixed(1)}/10</td>
            <td style="padding:0.4rem;text-align:right;border-bottom:1px dotted var(--cream-dark);color:var(--text-light)">${f.weight}%</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  return html;
}

// ============================================
// TAB NOTE LIBERE
// ============================================
function renderSchedaNote(a) {
  return `
    <div class="scheda-section">
      <h4>📝 Note libere</h4>
      <p style="font-size:0.88rem;color:var(--text-light);margin:0 0 0.6rem">Spazio per appunti, osservazioni, promemoria personali. Sincronizzato su Drive.</p>
      <textarea id="schedaNoteText" rows="10" style="width:100%;padding:0.8rem;border:1px solid var(--cream-dark);border-radius:6px;font-family:inherit;font-size:0.95rem;background:#FFFEF7;line-height:1.6;resize:vertical" placeholder="Scrivi qui le tue note...">${(a.notaLibera || '').replace(/</g,'&lt;')}</textarea>
      <button class="btn btn-primary" onclick="salvaSchedaNote()" style="margin-top:0.6rem">💾 Salva note</button>
      <span id="schedaNoteSaved" style="display:none;margin-left:0.8rem;color:var(--green);font-size:0.88rem">✓ Salvato</span>
    </div>
  `;
}

function salvaSchedaNote() {
  const a = arnie.find(x => x.id === _currentSchedaArniaId);
  if(!a) return;
  a.notaLibera = document.getElementById('schedaNoteText').value;
  saveDB();
  const saved = document.getElementById('schedaNoteSaved');
  if(saved) {
    saved.style.display = 'inline';
    setTimeout(() => { saved.style.display = 'none'; }, 2000);
  }
}

// ============================================
// PROMOZIONE NUCLEO → FAMIGLIA
// ============================================
function promuoviNucleo(arniaId, askConfirm = true) {
  const a = arnie.find(x => x.id === arniaId);
  if(!a) return;
  if(a.tipo !== 'nucleo') {
    alert('Solo i nuclei possono essere promossi a famiglia.');
    return;
  }
  if(askConfirm && !confirm(`Promuovere il Nucleo #${a.num} a Famiglia?\n\nIl numero rimarrà #${a.num}, cambierà solo il tipo.`)) return;
  a.tipo = 'famiglia';
  // Aggiungi nota nel diario
  const note = `📈 Promosso da Nucleo a Famiglia il ${new Date().toLocaleDateString('it-IT')}`;
  a.note = (a.note ? a.note + '\n' : '') + note;
  saveDB();
  renderScheda();
  renderArnie();
  alert('✅ Nucleo promosso a Famiglia con successo!');
}

// Check se un nucleo è "pronto per promozione" (≥7 favi nelle ultime 2 visite)
function checkPromotionReady(arniaId) {
  const a = arnie.find(x => x.id === arniaId);
  if(!a || a.tipo !== 'nucleo') return false;
  const ispezioni = logBook
    .filter(e => e.arniaId === arniaId && e.ispezione && e.ispezione.telaini)
    .slice(0, 2);
  if(ispezioni.length < 2) return false;
  return ispezioni.every(i => parseInt(i.ispezione.telaini, 10) >= 7);
}


