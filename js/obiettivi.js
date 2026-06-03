// ===== FILE VERSION: 2026-05-28.3 · obiettivi.js =====

const OB_STAGIONI = {
  primavera: { label: 'Primavera', icon: '🌿', mesi: 'Mar–Mag' },
  estate:    { label: 'Estate',    icon: '☀️',  mesi: 'Giu–Ago' },
  autunno:   { label: 'Autunno',   icon: '🍂',  mesi: 'Set–Nov' },
  inverno:   { label: 'Inverno',   icon: '🌨️',  mesi: 'Dic–Feb' }
};
const OB_STATO = {
  da_fare:    { label: 'Da fare',    icon: '🔲', cls: 'ob-da-fare' },
  in_corso:   { label: 'In corso',   icon: '🔄', cls: 'ob-in-corso' },
  completato: { label: 'Completato', icon: '✅', cls: 'ob-completato' }
};

function getAnniObiettivi() {
  const anni = [...new Set(obiettivi.map(o => o.anno))];
  const annoCorr = new Date().getFullYear();
  for(let i = 0; i <= 3; i++) {
    if(!anni.includes(annoCorr + i)) anni.push(annoCorr + i);
  }
  return anni.sort().reverse();
}

// ======= STATO FILTRI (sistema a chip, stile "Da fare") =======
let _obChip = 'tutti';      // 'tutti' | 'annuali' | 'stagionali'
let _obSubAnno = '';        // sotto-chip anno (vista annuali)
let _obSubStagione = '';    // sotto-chip stagione (vista stagionali)

function setObChip(chip) {
  _obChip = chip;
  _obSubAnno = '';
  _obSubStagione = '';
  renderObiettivi();
}
function setObSubAnno(a) { _obSubAnno = (String(_obSubAnno) === String(a)) ? '' : a; renderObiettivi(); }
function setObSubStagione(s) { _obSubStagione = (_obSubStagione === s) ? '' : s; renderObiettivi(); }

// ======= RENDER PRINCIPALE =======
function renderObiettivi() {
  try {
    const tot = obiettivi.length;
    const nAnn = obiettivi.filter(o => o.tipo === 'annuale').length;
    const nStag = obiettivi.filter(o => o.tipo === 'stagionale').length;

    // CHIP principali
    const chipBox = document.getElementById('obChips');
    if(chipBox) {
      const chips = [
        { id: 'tutti', label: '📋 Tutti', cnt: tot },
        { id: 'annuali', label: '📆 Annuali', cnt: nAnn },
        { id: 'stagionali', label: '🌿 Stagionali', cnt: nStag },
      ];
      chipBox.innerHTML = chips.map(c => {
        const on = _obChip === c.id;
        const stChip = `display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1.1rem;border-radius:22px;font-size:0.92rem;font-weight:600;cursor:pointer;border:1.5px solid ${on?'var(--amber)':'var(--cream-dark)'};background:${on?'var(--amber-pale)':'white'};color:${on?'var(--brown)':'var(--text-light)'}`;
        const stCnt = `background:${on?'white':'var(--cream)'};border-radius:10px;padding:0.05rem 0.45rem;font-size:0.76rem`;
        return `<span style="${stChip}" onclick="setObChip('${c.id}')">${c.label} <span style="${stCnt}">${c.cnt}</span></span>`;
      }).join('');
    }

    // SOTTO-CHIP (anni o stagioni)
    const subBox = document.getElementById('obSubchips');
    if(subBox) {
      const stSub = (on) => `display:inline-block;padding:0.35rem 0.85rem;border-radius:16px;font-size:0.84rem;cursor:pointer;border:1px solid ${on?'var(--brown)':'var(--cream-dark)'};background:${on?'var(--brown)':'white'};color:${on?'white':'var(--text-light)'}`;
      if(_obChip === 'annuali') {
        const anni = getAnniObiettivi().filter(a => obiettivi.some(o => o.tipo==='annuale' && o.anno===a));
        subBox.style.display = 'flex';
        subBox.innerHTML = `<span style="${stSub(!_obSubAnno)}" onclick="setObSubAnno('')">Tutti gli anni</span>` +
          anni.map(a => `<span style="${stSub(String(_obSubAnno)===String(a))}" onclick="setObSubAnno('${a}')">${a}</span>`).join('');
      } else if(_obChip === 'stagionali') {
        subBox.style.display = 'flex';
        subBox.innerHTML = `<span style="${stSub(!_obSubStagione)}" onclick="setObSubStagione('')">Tutte</span>` +
          Object.entries(OB_STAGIONI).map(([k,st]) => `<span style="${stSub(_obSubStagione===k)}" onclick="setObSubStagione('${k}')">${st.icon} ${st.label}</span>`).join('');
      } else {
        subBox.style.display = 'none';
        subBox.innerHTML = '';
      }
    }

    // LISTA
    const lista = document.getElementById('obLista');
    if(!lista) return;
    if(tot === 0) {
      lista.innerHTML = `<div class="empty-state"><span class="big">🎯</span>Nessun obiettivo ancora.<br>Aggiungine uno!</div>`;
      return;
    }

    let html = '';
    if(_obChip === 'tutti') {
      html += _renderGruppoAnnuali(obiettivi.filter(o => o.tipo === 'annuale'));
      html += _renderGruppoStagionali(obiettivi.filter(o => o.tipo === 'stagionale'));
    } else if(_obChip === 'annuali') {
      let ann = obiettivi.filter(o => o.tipo === 'annuale');
      if(_obSubAnno) ann = ann.filter(o => String(o.anno) === String(_obSubAnno));
      html += _renderGruppoAnnuali(ann);
    } else {
      let stag = obiettivi.filter(o => o.tipo === 'stagionale');
      if(_obSubStagione) stag = stag.filter(o => o.stagione === _obSubStagione);
      html += _renderGruppoStagionali(stag);
    }
    lista.innerHTML = html || `<div class="empty-state"><span class="big">🎯</span>Nessun obiettivo per questo filtro.</div>`;
  } catch(err) {
    console.error('[Obiettivi] Errore in renderObiettivi:', err.message);
  }
}

function _renderGruppoAnnuali(items) {
  if(items.length === 0) return '';
  const grouped = {};
  items.forEach(o => { (grouped[o.anno] = grouped[o.anno] || []).push(o); });
  let out = '';
  if(_obChip === 'tutti') out += `<div class="ob-sezione-tit">📆 Annuali</div>`;
  out += Object.entries(grouped).sort(([a],[b]) => b - a).map(([anno, list]) => {
    const done = list.filter(o => o.stato === 'completato').length;
    return `
      <div style="margin-bottom:1.3rem">
        <div class="ob-group-tit">
          <span>📆 Anno ${anno}</span>
          <span class="ob-group-done">${done}/${list.length} completati</span>
        </div>
        ${list.map(renderObCard).join('')}
      </div>`;
  }).join('');
  return out;
}

function _renderGruppoStagionali(items) {
  if(items.length === 0) return '';
  const ordStag = ['primavera','estate','autunno','inverno'];
  const grouped = {};
  items.forEach(o => {
    const key = `${o.anno}_${o.stagione}`;
    if(!grouped[key]) grouped[key] = { anno: o.anno, stagione: o.stagione, items: [] };
    grouped[key].items.push(o);
  });
  let out = '';
  if(_obChip === 'tutti') out += `<div class="ob-sezione-tit">🌿 Stagionali</div>`;
  out += Object.values(grouped)
    .sort((a,b) => b.anno - a.anno || ordStag.indexOf(a.stagione) - ordStag.indexOf(b.stagione))
    .map(g => {
      const st = OB_STAGIONI[g.stagione] || { label: g.stagione, icon: '🌿' };
      const done = g.items.filter(o => o.stato === 'completato').length;
      return `
        <div style="margin-bottom:1.3rem">
          <div class="ob-group-tit">
            <span>${st.icon} ${st.label} ${g.anno}</span>
            <span class="ob-group-done">${done}/${g.items.length} completati</span>
          </div>
          ${g.items.map(renderObCard).join('')}
        </div>`;
    }).join('');
  return out;
}


// ======= CARD OBIETTIVO =======
function renderObCard(o) {
  const stato = OB_STATO[o.stato] || OB_STATO.da_fare;
  const arnia = arnie.find(a => a.id === o.arniaId);
  const pct = o.target ? Math.min(100, Math.round((parseFloat(o.attuale||0)/parseFloat(o.target))*100)) : null;

  return `
  <div class="ob-card ${stato.cls}">
    <div class="ob-card-header">
      <span class="ob-stato-icon">${stato.icon}</span>
      <span class="ob-titolo">${o.titolo}</span>
      <div class="ob-actions">
        <select class="ob-stato-select" onchange="changeObStato('${o.id}', this.value)">
          <option value="da_fare"    ${o.stato==='da_fare'   ?'selected':''}>🔲 Da fare</option>
          <option value="in_corso"   ${o.stato==='in_corso'  ?'selected':''}>🔄 In corso</option>
          <option value="completato" ${o.stato==='completato'?'selected':''}>✅ Fatto</option>
        </select>
        <button class="btn-icon" onclick="openObModal(null, '${o.id}')" title="Modifica">✏️</button>
        <button class="btn-icon del" onclick="deleteObiettivo('${o.id}')" title="Elimina">🗑</button>
      </div>
    </div>
    ${o.descrizione ? `<div class="ob-desc">${o.descrizione}</div>` : ''}
    ${arnia ? `<div class="ob-meta">🏠 ${arnia.num}${arnia.nome?' — '+arnia.nome:''}</div>` : ''}
    ${o.note ? `<div class="ob-meta">📝 ${o.note}</div>` : ''}
    ${pct !== null ? `
      <div class="ob-progress-wrap">
        <div class="ob-progress-bar">
          <div class="ob-progress-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>=50?'var(--amber)':'var(--red)'}"></div>
        </div>
        <span class="ob-progress-label">${o.attuale||0} / ${o.target} ${o.unita||''} (${pct}%)</span>
      </div>` : ''}
  </div>`;
}

// ======= MODAL OBIETTIVO =======
// Apertura "Nuovo" generico: default annuale, l'utente sceglie il tipo nel modale
function openObModalNuovo() {
  openObModal(_obChip === 'stagionali' ? 'stagionale' : 'annuale');
}

function openObModal(tipo, editId) {
  const modal = document.getElementById('obModal');
  if(!modal) {
    console.error('[Obiettivi] obModal non trovato nel DOM');
    return;
  }
  const anno = new Date().getFullYear();

  const anni = getAnniObiettivi();
  document.getElementById('obAnno').innerHTML =
    anni.map(a => `<option value="${a}">${a}</option>`).join('');

  document.getElementById('obArnia').innerHTML =
    '<option value="">— Nessuna arnia specifica —</option>' +
    arnie.map(a => `<option value="${a.id}">#${a.num}${a.nome?' — '+a.nome:''}</option>`).join('');

  if(editId) {
    const o = obiettivi.find(x => x.id === editId);
    if(!o) return;
    document.getElementById('obModalTitle').textContent = '✏️ Modifica obiettivo';
    document.getElementById('editObId').value = editId;
    document.getElementById('obTipoHidden').value = o.tipo;
    const selT = document.getElementById('obTipoSelect'); if(selT) selT.value = o.tipo;
    document.getElementById('obTitolo').value = o.titolo;
    document.getElementById('obDescrizione').value = o.descrizione || '';
    document.getElementById('obAnno').value = o.anno;
    document.getElementById('obStato').value = o.stato;
    document.getElementById('obNote').value = o.note || '';
    document.getElementById('obArnia').value = o.arniaId || '';
    if(o.tipo === 'stagionale') {
      document.getElementById('obStagioneRow').style.display = 'block';
      document.getElementById('obStagione').value = o.stagione;
      document.getElementById('obAnnualeFields').style.display = 'none';
    } else {
      document.getElementById('obStagioneRow').style.display = 'none';
      document.getElementById('obAnnualeFields').style.display = 'block';
      document.getElementById('obTarget').value = o.target || '';
      document.getElementById('obAttuale').value = o.attuale || '';
      document.getElementById('obUnita').value = o.unita || '';
    }
  } else {
    document.getElementById('obModalTitle').textContent = tipo === 'stagionale' ? '🌿 Nuovo obiettivo stagionale' : '📆 Nuovo obiettivo annuale';
    document.getElementById('editObId').value = '';
    document.getElementById('obTipoHidden').value = tipo;
    const selTn = document.getElementById('obTipoSelect'); if(selTn) selTn.value = tipo;
    document.getElementById('obTitolo').value = '';
    document.getElementById('obDescrizione').value = '';
    document.getElementById('obAnno').value = anno;
    document.getElementById('obStato').value = 'da_fare';
    document.getElementById('obNote').value = '';
    document.getElementById('obArnia').value = '';
    document.getElementById('obStagioneRow').style.display = tipo === 'stagionale' ? 'block' : 'none';
    document.getElementById('obAnnualeFields').style.display = tipo === 'annuale' ? 'block' : 'none';
    document.getElementById('obTarget').value = '';
    document.getElementById('obAttuale').value = '';
    document.getElementById('obUnita').value = '';
  }
  modal.classList.add('open');
}

function closeObModal() { document.getElementById('obModal').classList.remove('open'); }

// Cambia tipo dal modale (radio/select): mostra/nasconde i campi giusti
function onObTipoChange(tipo) {
  document.getElementById('obTipoHidden').value = tipo;
  document.getElementById('obStagioneRow').style.display = tipo === 'stagionale' ? 'block' : 'none';
  document.getElementById('obAnnualeFields').style.display = tipo === 'annuale' ? 'block' : 'none';
}

function saveObiettivo() {
  const titolo = document.getElementById('obTitolo').value.trim();
  if(!titolo) { alert('Inserisci un titolo'); return; }
  const tipo   = document.getElementById('obTipoHidden').value;
  const editId = document.getElementById('editObId').value;
  const data = {
    id:          editId || Date.now().toString(),
    tipo,
    titolo,
    descrizione: document.getElementById('obDescrizione').value.trim(),
    anno:        parseInt(document.getElementById('obAnno').value, 10),
    stato:       document.getElementById('obStato').value,
    arniaId:     document.getElementById('obArnia').value || null,
    note:        document.getElementById('obNote').value.trim(),
    stagione:    tipo === 'stagionale' ? document.getElementById('obStagione').value : null,
    target:      tipo === 'annuale' ? parseFloat(document.getElementById('obTarget').value) || null : null,
    attuale:     tipo === 'annuale' ? parseFloat(document.getElementById('obAttuale').value) || null : null,
    unita:       tipo === 'annuale' ? document.getElementById('obUnita').value.trim() : null,
  };
  if(editId) { obiettivi = obiettivi.map(o => o.id === editId ? data : o); }
  else { obiettivi.push(data); }
  saveObiettivi();
  closeObModal();
  renderObiettivi();
}

function changeObStato(id, stato) {
  obiettivi = obiettivi.map(o => o.id === id ? {...o, stato} : o);
  saveObiettivi();
  renderObiettivi();
}

function deleteObiettivo(id) {
  if(!confirm('Eliminare questo obiettivo?')) return;
  obiettivi = obiettivi.filter(o => o.id !== id);
  saveObiettivi();
  renderObiettivi();
}
