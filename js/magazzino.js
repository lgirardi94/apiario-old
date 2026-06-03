// ===== FILE VERSION: 2026-05-28.5 · magazzino.js =====
// ======= FUZZY SIMILARITY =======
function similarity(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if(a === b) return 1;
  if(a.length < 2 || b.length < 2) return 0;
  // Bigram similarity
  const getBigrams = s => {
    const bg = new Set();
    for(let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i+2));
    return bg;
  };
  const bgA = getBigrams(a);
  const bgB = getBigrams(b);
  let intersection = 0;
  bgA.forEach(bg => { if(bgB.has(bg)) intersection++; });
  return (2 * intersection) / (bgA.size + bgB.size);
}

function findSimili(nome, escludiId) {
  return articoli
    .filter(a => a.id !== escludiId)
    .map(a => ({ ...a, sim: similarity(nome, a.nome) }))
    .filter(a => a.sim >= 0.5)
    .sort((a, b) => b.sim - a.sim);
}

// ======= CONTROLLI MAGAZZINO =======
function runControlli() {
  const container = document.getElementById('controlliResult');
  container.innerHTML = '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem">Analisi in corso...</div>';

  // Trova coppie di duplicati sospetti (esclude coppie ignorate)
  const ignorati = settings.duplicatiIgnorati || [];
  const coppie = [];
  const visti = new Set();
  articoli.forEach((a, i) => {
    articoli.forEach((b, j) => {
      if(i >= j) return;
      const key = [a.id, b.id].sort().join('_');
      if(visti.has(key) || ignorati.includes(key)) return;
      const sim = similarity(a.nome, b.nome);
      if(sim >= 0.5) {
        visti.add(key);
        coppie.push({ a, b, sim });
      }
    });
  });

  if(coppie.length === 0) {
    container.innerHTML = `
      <div style="background:#e8f5e9;border:1px solid #9FC9B0;border-radius:6px;padding:1.2rem 1.5rem;display:flex;align-items:center;gap:0.8rem">
        <span style="font-size:1.5rem">✅</span>
        <div>
          <div style="font-weight:600;color:var(--green)">Nessun duplicato rilevato</div>
          <div style="font-size:0.88rem;color:var(--text-light)">Tutti i ${articoli.length} articoli sembrano unici.</div>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:1rem;font-size:0.9rem;color:var(--text-light)">
      Trovate <strong>${coppie.length}</strong> coppie di articoli potenzialmente duplicati. Puoi fare il merge per unire le movimentazioni nel primo articolo ed eliminare il secondo.
    </div>
    ${coppie.map((c, idx) => {
      const giacA = getGiacenzaLocale(c.a.id);
      const giacB = getGiacenzaLocale(c.b.id);
      const movA = movimentazioni.filter(m => m.articoloId === c.a.id).length;
      const movB = movimentazioni.filter(m => m.articoloId === c.b.id).length;
      const pct = Math.round(c.sim * 100);
      const colSim = pct >= 80 ? 'var(--red)' : pct >= 65 ? '#e65100' : 'var(--amber)';
      return `
      <div class="card" style="margin-bottom:1rem;padding:1.2rem">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:1rem">
          <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-light)">Similarità</span>
          <span style="font-family:'Playfair Display',serif;font-size:1.1rem;color:${colSim};font-weight:700">${pct}%</span>
          <div style="flex:1;height:6px;background:var(--cream-dark);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${colSim};border-radius:3px"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:0.8rem;align-items:center;margin-bottom:1rem">
          <div style="background:var(--amber-pale);border:1px solid var(--amber-light);border-radius:6px;padding:0.8rem">
            <div style="font-weight:600;color:var(--brown);margin-bottom:0.3rem">${c.a.nome}</div>
            <div style="font-size:0.82rem;color:var(--text-light)">Giacenza: ${giacA % 1 === 0 ? giacA : giacA.toFixed(1)} ${c.a.unita}</div>
            <div style="font-size:0.82rem;color:var(--text-light)">${movA} movimentazioni</div>
          </div>
          <span style="font-size:1.2rem;color:var(--text-light)">⟷</span>
          <div style="background:var(--cream);border:1px solid var(--cream-dark);border-radius:6px;padding:0.8rem">
            <div style="font-weight:600;color:var(--brown);margin-bottom:0.3rem">${c.b.nome}</div>
            <div style="font-size:0.82rem;color:var(--text-light)">Giacenza: ${giacB % 1 === 0 ? giacB : giacB.toFixed(1)} ${c.b.unita}</div>
            <div style="font-size:0.82rem;color:var(--text-light)">${movB} movimentazioni</div>
          </div>
        </div>
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap">
          <button class="btn" style="font-size:0.85rem;padding:0.45rem 1rem" onclick="mergeArticoli('${c.a.id}','${c.b.id}')">
            ⬅ Merge: tieni "${c.a.nome}"
          </button>
          <button class="btn btn-secondary" style="font-size:0.85rem;padding:0.45rem 1rem" onclick="mergeArticoli('${c.b.id}','${c.a.id}')">
            ➡ Merge: tieni "${c.b.nome}"
          </button>
          <button class="btn-icon" style="padding:0.45rem 0.8rem;font-size:0.82rem;color:var(--text-light)" onclick="ignoraDuplicato(${idx},'${c.a.id}','${c.b.id}')" title="Non sono duplicati, ignora">
            ✕ Non sono duplicati
          </button>
        </div>
      </div>`;
    }).join('')}
  `;
}

function mergeArticoli(mantieniId, eliminaId) {
  const mantieni = articoli.find(a => a.id === mantieniId);
  const elimina  = articoli.find(a => a.id === eliminaId);
  if(!mantieni || !elimina) return;

  const movElimina = movimentazioni.filter(m => m.articoloId === eliminaId).length;
  const msg = `Stai per:\n• Spostare ${movElimina} movimentazioni da "${elimina.nome}" → "${mantieni.nome}"\n• Eliminare "${elimina.nome}"\n\nL'operazione non è reversibile. Continuare?`;
  if(!confirm(msg)) return;

  // Sposta tutte le movimentazioni
  movimentazioni = movimentazioni.map(m =>
    m.articoloId === eliminaId ? { ...m, articoloId: mantieniId } : m
  );
  // Elimina l'articolo duplicato
  articoli = articoli.filter(a => a.id !== eliminaId);
  saveMagazzino();
  showImportToast(`✅ Merge completato — ${movElimina} movimentazioni spostate su "${mantieni.nome}"`);
  runControlli();
  renderMagArticoli();
}

function ignoraDuplicato(idx, idA, idB) {
  // Salva la coppia come "ignorata" nelle settings (sincronizzata su Drive)
  if(!settings.duplicatiIgnorati) settings.duplicatiIgnorati = [];
  const key = [idA, idB].sort().join('_');
  if(!settings.duplicatiIgnorati.includes(key)) settings.duplicatiIgnorati.push(key);
  saveSettings();
  showImportToast('✅ Coppia ignorata — non verrà più segnalata');
  runControlli();
}


// ======= MAGAZZINO NAV =======
function showMagTab(tab, btn) {
  try {
    const ids = ['magTabArticoli','magTabMovimentazioni','magTabNecessita','magTabControlli'];
    const mapping = {
      articoli: 'magTabArticoli',
      movimentazioni: 'magTabMovimentazioni',
      necessita: 'magTabNecessita',
      controlli: 'magTabControlli',
    };
    ids.forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.display = (mapping[tab] === id) ? 'block' : 'none';
    });
    document.querySelectorAll('.mag-tab').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if(tab === 'articoli') renderMagArticoli();
    if(tab === 'movimentazioni') { renderMagMovimentazioni(); updateMovArticoloSelect(); }
    if(tab === 'necessita') { if(typeof renderNecessita === 'function') renderNecessita(); }
    if(tab === 'controlli') {
      const cr = document.getElementById('controlliResult');
      if(cr) cr.innerHTML = '';
    }
  } catch(err) {
    console.error('[Magazzino] Errore in showMagTab:', err.message);
  }
}

// ======= GIACENZA (wrapper per shared.js) =======
// shared.js espone getGiacenza(articoloId, movimentazioni)
// qui usiamo la variabile locale movimentazioni per comodità
function getGiacenzaLocale(articoloId) {
  return getGiacenza(articoloId, movimentazioni);
}

// ======= RENDER ARTICOLI =======
// ======= RENDER ARTICOLI =======
function renderMagArticoli() {
  try {
    const filtroSearch = (document.getElementById('magFiltroSearch')?.value || '').toLowerCase();
    const ordinamento = document.getElementById('magOrdinamento')?.value || 'nome';
    const catLabel = {
      farmaci: '💊 Farmaci/sanitari', alimentazione: '🍬 Alimentazione', telai_cera: '🪵 Telai e cera',
      arnie: '📦 Arnie e componenti', attrezzatura: '🔧 Attrezzatura', confezionamento: '🫙 Confezionamento',
      prodotto: '🍯 Prodotti finiti', altro: '📋 Altro',
      // legacy
      materiale: '🔧 Attrezzatura', consumabile: '🍬 Alimentazione',
    };
    const catColor = {
      farmaci: 'var(--red)', alimentazione: 'var(--amber)', telai_cera: 'var(--brown-light)',
      arnie: 'var(--brown)', attrezzatura: 'var(--blue)', confezionamento: 'var(--green)',
      prodotto: 'var(--amber)', altro: 'var(--text-light)',
      materiale: 'var(--blue)', consumabile: 'var(--amber)',
    };

    // ===== KPI BAR =====
    renderMagKpi();

    // ===== DROPDOWN FILTRI =====
    if(typeof initFiltroDropdown === 'function' && document.getElementById('magFiltriDropdown')) {
      initFiltroDropdown('magazzino', 'magFiltriDropdown', renderMagArticoli);
    }

    // Helper: è sotto soglia?
    const isSottoSoglia = (a) => {
      const g = getGiacenzaLocale(a.id);
      return a.soglia && g <= parseFloat(a.soglia);
    };

    // Applica ricerca testuale + filtri multiscelta
    let filtered = articoli.filter(a => {
      if(filtroSearch && !a.nome.toLowerCase().includes(filtroSearch)) return false;
      return true;
    });
    if(typeof applicaFiltri === 'function') filtered = applicaFiltri('magazzino', filtered);

    // ===== ORDINAMENTO =====
    filtered = [...filtered].sort((a, b) => {
      switch(ordinamento) {
        case 'giacenza_asc':  return getGiacenzaLocale(a.id) - getGiacenzaLocale(b.id);
        case 'giacenza_desc': return getGiacenzaLocale(b.id) - getGiacenzaLocale(a.id);
        case 'scadenza': {
          if(!a.scadenza && !b.scadenza) return 0;
          if(!a.scadenza) return 1;
          if(!b.scadenza) return -1;
          return a.scadenza.localeCompare(b.scadenza);
        }
        case 'categoria': return (a.categoria||'').localeCompare(b.categoria||'') || a.nome.localeCompare(b.nome);
        case 'valore_desc': {
          const va = getGiacenzaLocale(a.id) * (parseFloat(a.prezzoUnitario)||0);
          const vb = getGiacenzaLocale(b.id) * (parseFloat(b.prezzoUnitario)||0);
          return vb - va;
        }
        case 'nome':
        default: return a.nome.localeCompare(b.nome);
      }
    });

    // Pulsante "aggiungi sotto soglia agli ordini": visibile solo se ci sono sotto-soglia
    const btnOrdina = document.getElementById('magBtnOrdinaSottoSoglia');
    if(btnOrdina) {
      const countSotto = articoli.filter(isSottoSoglia).length;
      btnOrdina.style.display = countSotto > 0 ? 'inline-block' : 'none';
      btnOrdina.textContent = `🛒 Aggiungi ${countSotto} sotto soglia agli ordini`;
    }

    const grid = document.getElementById('magGrid');
    if(!grid) return;

    if(filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="big">📦</span>${articoli.length === 0 ? 'Nessun articolo. Aggiungine uno!' : 'Nessun articolo corrisponde ai filtri.'}</div>`;
      return;
    }

    grid.innerHTML = filtered.map(a => {
      const giac = getGiacenzaLocale(a.id);
      const giacClass = giac === 0 ? 'zero' : (a.soglia && giac <= parseFloat(a.soglia) ? 'bassa' : '');
      const sogliaAlert = a.soglia && giac <= parseFloat(a.soglia) && giac > 0
        ? `<div style="font-size:0.78rem;color:var(--red);margin-top:0.2rem">⚠️ Sotto soglia minima (${a.soglia} ${a.unita})</div>` : '';
      const scadenzaHtml = a.scadenza ? (() => {
        const [y, m] = a.scadenza.split('-');
        const scadMs = new Date(parseInt(y, 10), parseInt(m, 10)-1, 1).getTime();
        const oggi = Date.now();
        const mesiAllaScad = Math.round((scadMs - oggi) / (1000 * 60 * 60 * 24 * 30));
        const cls = mesiAllaScad <= 3 ? 'vicina' : '';
        return `<div class="mag-scadenza ${cls}">Scad: ${m}/${y}${a.lotto ? ' · Lotto: '+a.lotto : ''}</div>`;
      })() : '';

      // Valore economico
      const prezzoU = parseFloat(a.prezzoUnitario) || 0;
      const valore = giac * prezzoU;
      const valoreHtml = prezzoU > 0
        ? `<div style="font-size:0.78rem;color:var(--text-light);margin-top:0.2rem">💰 € ${prezzoU.toFixed(2)}/${a.unita} · Valore: <strong>€ ${valore.toFixed(2)}</strong></div>` : '';

      // Previsione consumo
      const previsione = getPrevisioneConsumo(a.id, giac);

      // Badge ordini in corso
      const ordiniHtml = (() => {
        if(typeof getNecessitaPerArticolo !== 'function') return '';
        const ordiniArt = getNecessitaPerArticolo(a.id);
        if(ordiniArt.length === 0) return '';
        const totaleOrd = ordiniArt.reduce((s,n) => s + (parseFloat(n.quantita)||0), 0);
        const inArrivo = ordiniArt.filter(n => n.stato === 'ordinato').length;
        const daOrd = ordiniArt.filter(n => n.stato === 'da_ordinare').length;
        let label = '';
        if(daOrd > 0 && inArrivo > 0) label = `${daOrd} da ordinare · ${inArrivo} in arrivo`;
        else if(daOrd > 0) label = `${daOrd} da ordinare`;
        else if(inArrivo > 0) label = `${inArrivo} in arrivo`;
        return `<div onclick="event.stopPropagation();const b=document.querySelector('.mag-tab[onclick*=necessita]');if(b)showMagTab('necessita',b)" style="margin-top:0.4rem;background:rgba(200,134,10,0.12);color:var(--brown);padding:0.3rem 0.6rem;border-radius:4px;font-size:0.78rem;display:flex;align-items:center;gap:0.3rem;cursor:pointer;border:1px solid rgba(200,134,10,0.25)" title="Clicca per vedere la lista ordini">🛒 <strong>${totaleOrd % 1 === 0 ? totaleOrd : totaleOrd.toFixed(1)} ${a.unita}</strong> ${label}</div>`;
      })();

      return `
      <div class="mag-card">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${catColor[a.categoria]||'var(--brown-light)'};margin-bottom:0.4rem">${catLabel[a.categoria]||a.categoria}</div>
        <div class="mag-card-nome">${a.nome}</div>
        ${a.note ? `<div style="font-size:0.82rem;color:var(--text-light);margin-bottom:0.5rem">${a.note}</div>` : ''}
        <div style="margin-top:0.5rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
          <span class="mag-giacenza ${giacClass}">${giac % 1 === 0 ? giac : giac.toFixed(1)}</span>
          <span class="mag-unita">${a.unita}</span>
          <!-- Carico/scarico rapido inline -->
          <span style="display:inline-flex;gap:0.25rem;margin-left:auto">
            <button onclick="movRapido('${a.id}', -1)" title="Scarico -1" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--red);background:white;color:var(--red);cursor:pointer;font-size:1rem;font-weight:700;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
            <button onclick="movRapido('${a.id}', 1)" title="Carico +1" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--green);background:white;color:var(--green);cursor:pointer;font-size:1rem;font-weight:700;line-height:1;display:flex;align-items:center;justify-content:center">+</button>
          </span>
        </div>
        ${sogliaAlert}
        ${scadenzaHtml}
        ${valoreHtml}
        ${previsione}
        ${ordiniHtml}
        <div class="mag-actions">
          <button class="btn" style="padding:0.35rem 0.8rem;font-size:0.82rem" onclick="openMovModal('${a.id}')">+ Mov.</button>
          <button class="btn btn-secondary" style="padding:0.35rem 0.7rem;font-size:0.82rem" onclick="creaPromemoriaArticolo('${a.id}')" title="Crea un promemoria nella sezione Da Fare">📋</button>
          <button class="btn btn-secondary" style="padding:0.35rem 0.7rem;font-size:0.82rem" onclick="openArticoloModal('${a.id}')">✏️</button>
          <button class="btn btn-danger" style="padding:0.35rem 0.7rem;font-size:0.82rem" onclick="deleteArticolo('${a.id}')">🗑</button>
        </div>
      </div>`;
    }).join('');
  } catch(err) {
    console.error('[Magazzino] Errore in renderMagArticoli:', err.message);
  }
}

// Crea un promemoria To-Do collegato a un articolo (da magazzino)
function creaPromemoriaArticolo(articoloId) {
  try {
    const a = articoli.find(x => x.id === articoloId);
    if(!a) { console.warn('[Magazzino] Articolo non trovato per promemoria:', articoloId); return; }
    if(typeof creaTodoRapido !== 'function') {
      alert('Sezione "Da Fare" non disponibile.');
      return;
    }
    creaTodoRapido({
      testo: `Ordinare ${a.nome}`,
      categoria: 'acquisto',
      priorita: 'media',
      articoloId: a.id,
    });
  } catch(err) {
    console.error('[Magazzino] Errore in creaPromemoriaArticolo:', err.message);
  }
}

// ======= KPI MAGAZZINO =======
function renderMagKpi() {
  try {
    const bar = document.getElementById('magKpiBar');
    if(!bar) return;

    const totArticoli = articoli.length;
    const sottoSoglia = articoli.filter(a => {
      const g = getGiacenzaLocale(a.id);
      return a.soglia && g <= parseFloat(a.soglia);
    }).length;

    // In scadenza nei prossimi 3 mesi
    const oggi = Date.now();
    const inScadenza = articoli.filter(a => {
      if(!a.scadenza) return false;
      const [y, m] = a.scadenza.split('-');
      const scadMs = new Date(parseInt(y,10), parseInt(m,10)-1, 1).getTime();
      const mesi = (scadMs - oggi) / (1000*60*60*24*30);
      return mesi <= 3;
    }).length;

    // Valore totale magazzino
    const valoreTot = articoli.reduce((s, a) => {
      const g = getGiacenzaLocale(a.id);
      return s + g * (parseFloat(a.prezzoUnitario) || 0);
    }, 0);

    const kpi = (icon, val, label, color) => `
      <div style="flex:1;min-width:110px;background:white;border:1px solid var(--cream-dark);border-radius:6px;padding:0.6rem 0.8rem;text-align:center">
        <div style="font-size:1.3rem;font-weight:700;color:${color};line-height:1">${icon} ${val}</div>
        <div style="font-size:0.72rem;color:var(--text-light);margin-top:0.2rem;text-transform:uppercase;letter-spacing:0.04em">${label}</div>
      </div>`;

    bar.innerHTML =
      kpi('📦', totArticoli, 'Articoli', 'var(--brown)') +
      kpi('⚠️', sottoSoglia, 'Sotto soglia', sottoSoglia > 0 ? 'var(--red)' : 'var(--text-light)') +
      kpi('⏰', inScadenza, 'In scadenza', inScadenza > 0 ? 'var(--amber)' : 'var(--text-light)') +
      (valoreTot > 0 ? kpi('💰', '€' + valoreTot.toFixed(0), 'Valore stimato', 'var(--green)') : '');
  } catch(err) {
    console.error('[Magazzino] Errore in renderMagKpi:', err.message);
  }
}

// ======= PREVISIONE CONSUMO =======
// Calcola i mesi residui di scorta basandosi sul consumo degli ultimi 6 mesi.
// Ritorna null se non ci sono abbastanza dati.
function getPrevisioneMesiResidui(articoloId, giacenzaAttuale) {
  try {
    const oggi = new Date();
    const seiMesiFa = new Date(oggi.getTime() - 180*24*60*60*1000);
    const uscite = movimentazioni.filter(m => {
      if(m.articoloId !== articoloId) return false;
      if(m.tipo !== 'uscita') return false;
      if(!m.data) return false;
      const d = new Date(m.data);
      return !isNaN(d.getTime()) && d >= seiMesiFa;
    });
    if(uscite.length < 2) return null; // troppi pochi dati

    const totaleConsumato = uscite.reduce((s, m) => s + (parseFloat(m.qta) || 0), 0);
    if(totaleConsumato <= 0) return null;

    const date = uscite.map(m => new Date(m.data).getTime()).sort((a,b) => a-b);
    const mesiSpan = Math.max(1, (oggi.getTime() - date[0]) / (1000*60*60*24*30));
    const consumoMensile = totaleConsumato / mesiSpan;
    if(consumoMensile <= 0) return null;

    return giacenzaAttuale / consumoMensile;
  } catch(err) {
    console.error('[Magazzino] Errore in getPrevisioneMesiResidui:', err.message);
    return null;
  }
}

// Versione HTML per la card articolo
function getPrevisioneConsumo(articoloId, giacenzaAttuale) {
  try {
    const mesiResidui = getPrevisioneMesiResidui(articoloId, giacenzaAttuale);
    if(mesiResidui === null) return '';

    // Recupera consumo mensile per il tooltip
    const oggi = new Date();
    const seiMesiFa = new Date(oggi.getTime() - 180*24*60*60*1000);
    const uscite = movimentazioni.filter(m => m.articoloId === articoloId && m.tipo === 'uscita' && m.data && new Date(m.data) >= seiMesiFa);
    const totaleConsumato = uscite.reduce((s, m) => s + (parseFloat(m.qta) || 0), 0);
    const date = uscite.map(m => new Date(m.data).getTime()).sort((a,b) => a-b);
    const mesiSpan = Math.max(1, (oggi.getTime() - date[0]) / (1000*60*60*24*30));
    const consumoMensile = totaleConsumato / mesiSpan;

    let txt, color;
    if(mesiResidui < 1) { txt = 'meno di 1 mese'; color = 'var(--red)'; }
    else if(mesiResidui < 2) { txt = `~${Math.round(mesiResidui)} mese`; color = 'var(--amber)'; }
    else { txt = `~${Math.round(mesiResidui)} mesi`; color = 'var(--text-light)'; }

    return `<div style="font-size:0.76rem;color:${color};margin-top:0.2rem" title="Consumo medio: ${consumoMensile.toFixed(1)}/mese negli ultimi 6 mesi">📉 Scorta per ${txt}</div>`;
  } catch(err) {
    console.error('[Magazzino] Errore in getPrevisioneConsumo:', err.message);
    return '';
  }
}

// ======= VENDITA RAPIDA =======
// Apre il modale vendita. Se articoloId è passato, lo preseleziona.
function openVenditaModal(articoloId) {
  try {
    const modal = document.getElementById('venditaModal');
    if(!modal) return;

    // Popola dropdown prodotti finiti
    const sel = document.getElementById('vendArticolo');
    if(sel) {
      const prodotti = articoli.filter(a => normalizzaCatMagazzino(a.categoria) === 'prodotto')
        .sort((a,b) => a.nome.localeCompare(b.nome));
      // Se non ci sono prodotti finiti, mostra tutti gli articoli
      const lista = prodotti.length > 0 ? prodotti : [...articoli].sort((a,b)=>a.nome.localeCompare(b.nome));
      sel.innerHTML = '<option value="">— Seleziona prodotto —</option>' +
        lista.map(a => `<option value="${a.id}">${a.nome} (${getGiacenzaLocale(a.id)} ${a.unita})</option>`).join('');
    }

    // Reset campi
    document.getElementById('editMovId') && (document.getElementById('vendData').value = new Date().toISOString().slice(0,10));
    document.getElementById('vendQuantita').value = '';
    document.getElementById('vendPrezzoUnit').value = '';
    document.getElementById('vendNote').value = '';
    document.getElementById('vendLibera').checked = false;
    document.getElementById('vendDescLibera').style.display = 'none';
    document.getElementById('vendDescLibera').value = '';
    document.getElementById('vendCategoria').value = 'vendita_miele';
    if(articoloId && sel) {
      sel.value = articoloId;
      onVenditaArticoloChange();
    }
    updateVenditaTotale();
    modal.classList.add('open');
  } catch(err) {
    console.error('[Magazzino] Errore in openVenditaModal:', err.message);
  }
}

function closeVenditaModal() {
  const m = document.getElementById('venditaModal');
  if(m) m.classList.remove('open');
}

function onVenditaArticoloChange() {
  // Precompila prezzo unitario suggerito dal prezzo articolo (se presente)
  const artId = document.getElementById('vendArticolo')?.value;
  const art = articoli.find(a => a.id === artId);
  // Suggerisci categoria in base al nome
  if(art) {
    const nome = art.nome.toLowerCase();
    const catSel = document.getElementById('vendCategoria');
    if(catSel) {
      if(nome.includes('cera') || nome.includes('propoli') || nome.includes('polline')) catSel.value = 'vendita_cera';
      else if(nome.includes('nucleo') || nome.includes('regina') || nome.includes('sciame')) catSel.value = 'vendita_nuclei';
      else catSel.value = 'vendita_miele';
    }
  }
  updateVenditaTotale();
}

function onVenditaLiberaToggle() {
  const libera = document.getElementById('vendLibera').checked;
  document.getElementById('vendDescLibera').style.display = libera ? 'block' : 'none';
  const sel = document.getElementById('vendArticolo');
  if(sel) sel.disabled = libera;
}

function updateVenditaTotale() {
  const q = parseFloat(document.getElementById('vendQuantita')?.value) || 0;
  const p = parseFloat(document.getElementById('vendPrezzoUnit')?.value) || 0;
  const tot = q * p;
  const el = document.getElementById('vendTotale');
  if(el) el.textContent = '€ ' + tot.toFixed(2).replace('.', ',');

  // Avviso giacenza insufficiente
  const warn = document.getElementById('vendGiacenzaWarn');
  const libera = document.getElementById('vendLibera')?.checked;
  if(warn && !libera) {
    const artId = document.getElementById('vendArticolo')?.value;
    if(artId && q > 0) {
      const giac = getGiacenzaLocale(artId);
      if(q > giac) {
        warn.style.display = 'block';
        warn.textContent = `⚠️ Giacenza disponibile: ${giac}. Vendi più di quanto hai in magazzino.`;
      } else {
        warn.style.display = 'none';
      }
    } else {
      warn.style.display = 'none';
    }
  }
}

function salvaVendita() {
  try {
    const libera = document.getElementById('vendLibera').checked;
    const artId = document.getElementById('vendArticolo').value;
    const descLibera = document.getElementById('vendDescLibera').value.trim();
    const q = parseFloat(document.getElementById('vendQuantita').value);
    const p = parseFloat(document.getElementById('vendPrezzoUnit').value);
    const data = document.getElementById('vendData').value;
    const categoria = document.getElementById('vendCategoria').value;
    const note = document.getElementById('vendNote').value.trim();

    if(!libera && !artId) { alert('Seleziona un prodotto o scegli "Voce libera"'); return; }
    if(libera && !descLibera) { alert('Inserisci una descrizione per la voce libera'); return; }
    if(!q || q <= 0) { alert('Inserisci una quantità valida'); return; }
    if(!p || p < 0) { alert('Inserisci un prezzo valido'); return; }
    if(!data) { alert('Inserisci la data'); return; }

    const totale = q * p;
    const art = artId ? articoli.find(a => a.id === artId) : null;
    const descrizione = libera ? descLibera : (art ? art.nome : 'Vendita');

    // 1. Scarico magazzino (solo se non è voce libera e c'è articolo)
    if(!libera && art) {
      movimentazioni.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        articoloId: art.id,
        tipo: 'uscita',
        qta: q,
        data,
        note: `Vendita${note ? ' · '+note : ''}`,
        valore: totale,
      });
      saveMagazzino();
    }

    // 2. Entrata in contabilità (auto-generata, editabile)
    movimentiContabili.unshift({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      data,
      tipo: 'entrata',
      importo: totale,
      categorie: [categoria],
      descrizione: `${descrizione} (${q}${art ? ' '+art.unita : ' pz'} × € ${p.toFixed(2)})${note ? ' · '+note : ''}`,
      origine: 'vendita',
      origineArticoloId: art ? art.id : null,
    });
    if(typeof saveContabilita === 'function') saveContabilita();

    closeVenditaModal();
    renderMagArticoli();
    if(typeof renderContRiepilogo === 'function') renderContRiepilogo();
    if(typeof renderContMovimenti === 'function') renderContMovimenti();
    if(typeof renderHome === 'function') renderHome();
    if(typeof showImportToast === 'function') showImportToast(`💰 Vendita registrata: € ${totale.toFixed(2)}`);
  } catch(err) {
    console.error('[Magazzino] Errore in salvaVendita:', err.message);
    alert('Errore durante la registrazione della vendita: ' + err.message);
  }
}

// ======= MOVIMENTO RAPIDO (+1 / -1 inline) =======
function movRapido(articoloId, delta) {
  try {
    const art = articoli.find(a => a.id === articoloId);
    if(!art) { console.warn('[Magazzino] Articolo non trovato:', articoloId); return; }

    // Per scarico, verifica che ci sia giacenza
    const giac = getGiacenzaLocale(articoloId);
    if(delta < 0 && giac <= 0) {
      showImportToast('⚠️ Giacenza già a zero');
      return;
    }

    movimentazioni.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      articoloId,
      tipo: delta > 0 ? 'entrata' : 'uscita',
      qta: Math.abs(delta),
      data: new Date().toISOString().slice(0,10),
      note: delta > 0 ? 'Carico rapido +1' : 'Scarico rapido -1',
    });
    saveMagazzino();
    renderMagArticoli();
  } catch(err) {
    console.error('[Magazzino] Errore in movRapido:', err.message);
  }
}

// ======= AGGIUNGI SOTTO-SOGLIA AGLI ORDINI =======
function aggiungiSottoSogliaAOrdini() {
  try {
    const sottoSoglia = articoli.filter(a => {
      const g = getGiacenzaLocale(a.id);
      return a.soglia && g <= parseFloat(a.soglia);
    });
    if(sottoSoglia.length === 0) {
      alert('Nessun articolo sotto soglia.');
      return;
    }

    // Filtra quelli già in lista ordini (per non duplicare)
    const giaInLista = (typeof necessita !== 'undefined')
      ? new Set(necessita.filter(n => n.stato !== 'ricevuto').map(n => n.articoloId).filter(Boolean))
      : new Set();

    const daAggiungere = sottoSoglia.filter(a => !giaInLista.has(a.id));
    if(daAggiungere.length === 0) {
      alert('Tutti gli articoli sotto soglia sono già nella lista ordini.');
      return;
    }

    if(!confirm(`Aggiungere ${daAggiungere.length} articol${daAggiungere.length>1?'i':'o'} sotto soglia alla lista "Da ordinare"?\n\n${daAggiungere.map(a=>'• '+a.nome).join('\n')}`)) return;

    if(typeof necessita === 'undefined') {
      console.error('[Magazzino] Variabile necessita non disponibile');
      return;
    }

    daAggiungere.forEach(a => {
      const giac = getGiacenzaLocale(a.id);
      const soglia = parseFloat(a.soglia) || 0;
      // Quantità suggerita: porta a 2× soglia (l'utente può modificarla dopo)
      const qtaSuggerita = Math.max(1, Math.round(soglia * 2 - giac));
      necessita.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2) + a.id.slice(-3),
        articoloId: a.id,
        descrizione: '',
        quantita: qtaSuggerita,
        unita: a.unita || 'pz',
        fornitore: '',
        priorita: giac === 0 ? 'alta' : 'media',
        dataPrevista: '',
        prezzoStimato: parseFloat(a.prezzoUnitario) ? (parseFloat(a.prezzoUnitario) * qtaSuggerita) : null,
        note: `Aggiunto automaticamente (sotto soglia: ${giac}/${a.soglia} ${a.unita})`,
        stato: 'da_ordinare',
        dataCreazione: new Date().toISOString().slice(0,10),
        dataOrdine: null,
      });
    });

    if(typeof saveNecessita === 'function') saveNecessita();
    if(typeof renderNecessita === 'function') renderNecessita();
    if(typeof renderHome === 'function') renderHome();
    showImportToast(`✅ ${daAggiungere.length} articoli aggiunti agli ordini`);

    // Passa alla tab ordini per mostrare il risultato
    const b = document.querySelector('.mag-tab[onclick*=necessita]');
    if(b) showMagTab('necessita', b);
  } catch(err) {
    console.error('[Magazzino] Errore in aggiungiSottoSogliaAOrdini:', err.message);
  }
}

// ======= RENDER MOVIMENTAZIONI =======
function renderMagMovimentazioni() {
  const filtroTipo = document.getElementById('magFiltroMov')?.value || '';
  const filtroArt = document.getElementById('magFiltroMovArticolo')?.value || '';
  const tipoEmoji = { entrata: '➕', uscita: '➖', rettifica: '🔧' };
  const tipoLabel = { entrata: 'Entrata', uscita: 'Uscita', rettifica: 'Rettifica' };

  let filtered = [...movimentazioni]
    .sort((a, b) => b.data.localeCompare(a.data))
    .filter(m => {
      if(filtroTipo && m.tipo !== filtroTipo) return false;
      if(filtroArt && m.articoloId !== filtroArt) return false;
      return true;
    });

  const list = document.getElementById('movList');
  if(!list) return;

  if(filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><span class="big">🔄</span>Nessuna movimentazione trovata.</div>`;
    return;
  }

  list.innerHTML = filtered.map(m => {
    const art = articoli.find(a => a.id === m.articoloId);
    const segno = m.tipo === 'entrata' ? '+' : m.tipo === 'uscita' ? '−' : '=';
    return `
    <div class="mov-item ${m.tipo}">
      <span class="mov-date">${formatDate(m.data)}</span>
      <span class="mov-qta ${m.tipo}">${segno}${parseFloat(m.qta) % 1 === 0 ? parseFloat(m.qta) : parseFloat(m.qta).toFixed(1)} ${art?.unita||''}</span>
      <div class="mov-info">
        <div class="mov-nome">${art ? art.nome : '—'}</div>
        <div class="mov-note">${tipoEmoji[m.tipo]} ${tipoLabel[m.tipo]}${m.note ? ' · ' + m.note : ''}</div>
      </div>
      <button class="btn-icon" onclick="openMovEditModal('${m.id}')" title="Modifica">✏️</button>
      <button class="btn-icon del" onclick="deleteMov('${m.id}')" title="Elimina">🗑</button>
    </div>`;
  }).join('');
}

// ======= ARTICOLO MODAL =======
function openArticoloModal(id) {const modal = document.getElementById('articoloModal');
  if(!modal) {
    console.error('[Magazzino] articoloModal non trovato nel DOM');
    return;
  }
  if(id && typeof id === 'string' && articoli.find(a => a.id === id)) {
    const a = articoli.find(x => x.id === id);
    if(!a) {
      console.warn('[Magazzino] Articolo non trovato:', id);
      return;
    }
    document.getElementById('articoloModalTitle').textContent = '✏️ Modifica articolo';
    document.getElementById('editArticoloId').value = id;
    document.getElementById('artNome').value = a.nome;
    document.getElementById('artCategoria').value = a.categoria;
    document.getElementById('artUnita').value = a.unita;
    document.getElementById('artScadenza').value = a.scadenza || '';
    document.getElementById('artLotto').value = a.lotto || '';
    document.getElementById('artSoglia').value = a.soglia || '';
    const prezzoEl = document.getElementById('artPrezzoUnitario');
    if(prezzoEl) prezzoEl.value = a.prezzoUnitario || '';
    document.getElementById('artNote').value = a.note || '';
  } else {
    document.getElementById('articoloModalTitle').textContent = '📦 Nuovo articolo';
    document.getElementById('editArticoloId').value = '';
    document.getElementById('artNome').value = '';
    document.getElementById('artCategoria').value = 'materiale';
    document.getElementById('artUnita').value = 'pz';
    document.getElementById('artScadenza').value = '';
    document.getElementById('artLotto').value = '';
    document.getElementById('artSoglia').value = '';
    const prezzoEl = document.getElementById('artPrezzoUnitario');
    if(prezzoEl) prezzoEl.value = '';
    document.getElementById('artNote').value = '';
  }
  toggleCampiConsumabile();
  // Live fuzzy search listener
  const artNome = document.getElementById('artNome');
  const editId = document.getElementById('editArticoloId').value;
  artNome.oninput = () => {
    const nome = artNome.value.trim();
    const suggerimenti = document.getElementById('artSimili');
    if(!suggerimenti) return;
    if(nome.length < 2) { suggerimenti.innerHTML = ''; return; }
    const simili = findSimili(nome, editId);
    if(simili.length === 0) { suggerimenti.innerHTML = ''; return; }
    suggerimenti.innerHTML = `
      <div style="background:#fff3e0;border:1px solid #e65100;border-radius:4px;padding:0.6rem 0.9rem;font-size:0.85rem;color:#7f3100;margin-top:0.3rem">
        ⚠️ Articoli simili già presenti:
        ${simili.slice(0,3).map(s=>`<strong>${s.nome}</strong> (${Math.round(s.sim*100)}%)`).join(', ')}
      </div>`;
  };
  modal.classList.add('open');
}
function closeArticoloModal() { document.getElementById('articoloModal').classList.remove('open'); }

function toggleCampiConsumabile() {
  const cat = document.getElementById('artCategoria').value;
  // Scadenza/lotto rilevanti per farmaci, alimentazione, telai/cera e prodotti finiti.
  // Le nascondo solo per attrezzatura e arnie/componenti (che non scadono).
  const senzaScadenza = ['attrezzatura', 'arnie'];
  const mostra = !senzaScadenza.includes(cat);
  const el = document.getElementById('artCampiConsumabile');
  if(el) el.style.display = mostra ? 'grid' : 'none';
}

function saveArticolo() {
  const nome = document.getElementById('artNome').value.trim();
  if(!nome) { alert('Inserisci il nome dell\'articolo'); return; }
  const editId = document.getElementById('editArticoloId').value;

  // Controllo similarità prima di salvare
  const simili = findSimili(nome, editId);
  if(simili.length > 0) {
    const nomiSimili = simili.slice(0,3).map(s=>`"${s.nome}" (${Math.round(s.sim*100)}% simile)`).join('\n• ');
    const conferma = confirm(
      `⚠️ Esistono già articoli simili:\n• ${nomiSimili}\n\nVuoi salvare comunque come nuovo articolo?`
    );
    if(!conferma) return;
  }

  const data = {
    id: editId || Date.now().toString(),
    nome,
    categoria: document.getElementById('artCategoria').value,
    unita: document.getElementById('artUnita').value,
    scadenza: document.getElementById('artScadenza').value || '',
    lotto: document.getElementById('artLotto').value.trim(),
    soglia: document.getElementById('artSoglia').value,
    prezzoUnitario: document.getElementById('artPrezzoUnitario')?.value || '',
    note: document.getElementById('artNote').value.trim()
  };
  // Preserva prezzoUnitario esistente se il campo è vuoto in modifica
  if(editId) {
    const esistente = articoli.find(a => a.id === editId);
    if(esistente && !data.prezzoUnitario && esistente.prezzoUnitario) {
      data.prezzoUnitario = esistente.prezzoUnitario;
    }
    articoli = articoli.map(a => a.id === editId ? data : a);
  }
  else { articoli.push(data); }
  saveMagazzino();
  closeArticoloModal();
  renderMagArticoli();
}

function deleteArticolo(id) {
  if(!confirm('Eliminare questo articolo e tutte le sue movimentazioni?')) return;
  articoli = articoli.filter(a => a.id !== id);
  movimentazioni = movimentazioni.filter(m => m.articoloId !== id);
  // Pulisce anche le necessità collegate (orfani)
  if(typeof necessita !== 'undefined' && Array.isArray(necessita)) {
    const before = necessita.length;
    necessita = necessita.filter(n => n.articoloId !== id);
    if(necessita.length !== before) {
      console.log('[Magazzino] Rimosse ' + (before - necessita.length) + ' necessità orfane dopo eliminazione articolo');
      if(typeof saveNecessita === 'function') saveNecessita();
      if(typeof renderNecessita === 'function') renderNecessita();
    }
  }
  saveMagazzino();
  renderMagArticoli();
}

// ======= MOVIMENTAZIONE MODAL =======
function updateMovArticoloSelect(preselect) {
  const filtSel = document.getElementById('magFiltroMovArticolo');
  if(filtSel) filtSel.innerHTML = '<option value="">Tutti gli articoli</option>' + articoli.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
}

function buildMovRiga(idx, preselect) {
  const div = document.createElement('div');
  div.id = `movRiga_${idx}`;
  div.style.cssText = 'margin-bottom:0.7rem;';
  div.innerHTML = `
    <div style="display:flex;gap:0.4rem;margin-bottom:0.3rem">
      <select id="movFiltrocat_${idx}" onchange="filtraMovArt(${idx})" style="padding:0.45rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.85rem;background:white;color:var(--text)">
        <option value="">Tutte le categorie</option>
        <option value="materiale">🔧 Materiale</option>
        <option value="consumabile">💊 Consumabili</option>
        <option value="prodotto">🍯 Prodotto finito</option>
      </select>
      <input type="text" id="movSearch_${idx}" placeholder="🔍 Cerca..." oninput="filtraMovArt(${idx})" style="flex:1;padding:0.45rem 0.6rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.85rem;background:white">
    </div>
    <div style="display:grid;grid-template-columns:1fr auto auto;gap:0.5rem;align-items:center">
      <select id="movArt_${idx}" onchange="movArtChange(${idx})" style="width:100%;padding:0.5rem 0.7rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.95rem;background:white">
        <option value="">— Seleziona articolo —</option>
        ${articoli.map(a=>`<option value="${a.id}" data-unita="${a.unita}" data-cat="${a.categoria}" ${a.id===preselect?'selected':''}>${a.nome} (${a.unita})</option>`).join('')}
      </select>
    <div style="display:flex;align-items:center;gap:0.3rem">
      <input type="number" id="movQta_${idx}" min="0" step="0.1" placeholder="Qtà" style="width:80px;padding:0.5rem 0.5rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.95rem;background:white">
      <span id="movUnita_${idx}" style="font-size:0.82rem;color:var(--text-light);min-width:24px">—</span>
    </div>
    <button type="button" onclick="removeMovRiga(${idx})" class="btn-icon del">✕</button>
  `;
  document.getElementById('movRighe').appendChild(div);
  if(preselect) {
    const opt = div.querySelector(`option[value="${preselect}"]`);
    if(opt) document.getElementById(`movUnita_${idx}`).textContent = opt.dataset.unita || '—';
  }
}

let movRigheCount = 0;

function addMovRiga() { buildMovRiga(movRigheCount++); }
function removeMovRiga(idx) { const el = document.getElementById(`movRiga_${idx}`); if(el) el.remove(); }
function filtraMovArt(idx) {
  const cat    = document.getElementById(`movFiltrocat_${idx}`)?.value || '';
  const search = (document.getElementById(`movSearch_${idx}`)?.value || '').toLowerCase();
  const sel    = document.getElementById(`movArt_${idx}`);
  if(!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Seleziona articolo —</option>' +
    articoli
      .filter(a => (!cat || a.categoria === cat) && (!search || a.nome.toLowerCase().includes(search)))
      .map(a => `<option value="${a.id}" data-unita="${a.unita}" data-cat="${a.categoria}" ${a.id===cur?'selected':''}>${a.nome} (${a.unita})</option>`)
      .join('');
  if(cur) sel.value = cur;
  movArtChange(idx);
}

function movArtChange(idx) {
  const sel = document.getElementById(`movArt_${idx}`);
  const opt = sel.options[sel.selectedIndex];
  document.getElementById(`movUnita_${idx}`).textContent = opt?.dataset?.unita || '—';
}

function openMovModal(articoloId) {
  updateMovArticoloSelect();
  document.getElementById('editMovId').value = '';
  document.getElementById('movData').value = today();
  document.getElementById('movTipo').value = 'entrata';
  document.getElementById('movNote').value = '';
  document.getElementById('movRighe').innerHTML = '';
  movRigheCount = 0;
  buildMovRiga(movRigheCount++, articoloId || '');
  // Titolo + visibilità "aggiungi riga" (in modifica nascondo la multi-riga)
  const titolo = document.getElementById('movModalTitle');
  if(titolo) titolo.textContent = '🔄 Nuova movimentazione';
  const addBtn = document.getElementById('movAddRigaBtn');
  if(addBtn) addBtn.style.display = '';
  document.getElementById('movModal').classList.add('open');
}

// Modifica di una singola movimentazione esistente
function openMovEditModal(id) {
  try {
    const m = movimentazioni.find(x => x.id === id);
    if(!m) { console.warn('[Magazzino] Movimentazione non trovata:', id); return; }
    updateMovArticoloSelect();
    document.getElementById('editMovId').value = id;
    document.getElementById('movData').value = m.data || today();
    document.getElementById('movTipo').value = m.tipo || 'entrata';
    document.getElementById('movNote').value = m.note || '';
    // Una sola riga, precompilata
    document.getElementById('movRighe').innerHTML = '';
    movRigheCount = 0;
    buildMovRiga(movRigheCount++, m.articoloId || '');
    // Imposta la quantità nella riga appena creata
    setTimeout(() => {
      const qtaEl = document.getElementById('movQta_0');
      if(qtaEl) qtaEl.value = m.qta;
    }, 0);
    const titolo = document.getElementById('movModalTitle');
    if(titolo) titolo.textContent = '✏️ Modifica movimentazione';
    // In modifica nascondo "aggiungi riga" (si modifica un movimento per volta)
    const addBtn = document.getElementById('movAddRigaBtn');
    if(addBtn) addBtn.style.display = 'none';
    document.getElementById('movModal').classList.add('open');
  } catch(err) {
    console.error('[Magazzino] Errore in openMovEditModal:', err.message);
  }
}

function closeMovModal() { document.getElementById('movModal').classList.remove('open'); }

function saveMov() {
  const data = document.getElementById('movData').value;
  const tipo = document.getElementById('movTipo').value;
  const note = document.getElementById('movNote').value.trim();
  const editId = document.getElementById('editMovId').value;
  if(!data) { alert('Inserisci la data'); return; }

  const righe = document.getElementById('movRighe').querySelectorAll('[id^="movRiga_"]');
  const movs = [];
  let errore = false;
  righe.forEach(riga => {
    const idx = riga.id.split('_')[1];
    const artId = document.getElementById(`movArt_${idx}`)?.value;
    const qta   = parseFloat(document.getElementById(`movQta_${idx}`)?.value);
    if(!artId || !qta || qta <= 0) { errore = true; return; }
    movs.push({ articoloId: artId, qta });
  });
  if(errore || movs.length === 0) { alert('Compila articolo e quantità per ogni riga'); return; }

  if(editId) {
    // Modifica: aggiorna il movimento esistente (preserva eventuale campo valore/origine)
    const m0 = movs[0];
    movimentazioni = movimentazioni.map(x => x.id === editId
      ? { ...x, data, tipo, articoloId: m0.articoloId, qta: m0.qta, note }
      : x);
    saveMagazzino();
    closeMovModal();
    renderMagArticoli();
    renderMagMovimentazioni();
    showImportToast('✅ Movimentazione aggiornata!');
    return;
  }

  movs.forEach(m => {
    movimentazioni.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      data, articoloId: m.articoloId, tipo, qta: m.qta, note
    });
  });
  saveMagazzino();
  closeMovModal();
  renderMagArticoli();
  renderMagMovimentazioni();
  showImportToast(`✅ ${movs.length} movimentazion${movs.length>1?'i':'e'} salvata${movs.length>1?'':'!'}`);
}

function deleteMov(id) {
  if(!confirm('Eliminare questa movimentazione?')) return;
  movimentazioni = movimentazioni.filter(m => m.id !== id);
  saveMagazzino();
  renderMagMovimentazioni();
  renderMagArticoli();
}


