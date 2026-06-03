// ===== FILE VERSION: 2026-05-28.2 · registro.js =====
// ======= ISPEZIONE =======
// (TELAINO_OPZIONI, CELLE_REALI_LABEL e renderTelainiVisual sono ora in shared.js)

// ============================================
// VISITA MULTI-ARNIA
// ============================================
function toggleMultiArnia() {
  try {
    const isMulti = document.getElementById('logMultiArnia')?.checked;
    const selector = document.getElementById('multiArniaSelector');
    const singolaArniaRow = document.getElementById('logArnia')?.closest('.form-row');
    const noteRow = document.getElementById('logNote')?.closest('.form-row');
    const varroaRow = document.getElementById('logVarroa')?.closest('.form-row');
    const ispezioneFields = document.getElementById('ispezioneFields');
    const accessoriSection = document.getElementById('accessoriSection');
    const multiFields = document.getElementById('multiArniaFields');

    if(isMulti) {
      // Mostra selettore multiplo, nascondi dropdown singolo
      if(selector) selector.style.display = 'block';
      if(singolaArniaRow) {
        const sel = document.getElementById('logArnia');
        if(sel) sel.style.display = 'none';
        const lbl = singolaArniaRow.querySelector('label');
        if(lbl) lbl.style.display = 'none';
      }
      // Nascondi i campi singoli (note/varroa/ispezione/accessori) — vanno per-arnia
      if(noteRow) noteRow.style.display = 'none';
      if(varroaRow) varroaRow.style.display = 'none';
      if(ispezioneFields) ispezioneFields.style.display = 'none';
      if(accessoriSection) accessoriSection.style.display = 'none';
      if(multiFields) multiFields.style.display = 'block';

      renderMultiArniaCheckboxes();
    } else {
      // Ripristina modalità singola
      if(selector) selector.style.display = 'none';
      if(singolaArniaRow) {
        const sel = document.getElementById('logArnia');
        if(sel) sel.style.display = '';
        const lbl = singolaArniaRow.querySelector('label');
        if(lbl) lbl.style.display = '';
      }
      if(noteRow) noteRow.style.display = '';
      if(varroaRow) varroaRow.style.display = '';
      if(multiFields) { multiFields.style.display = 'none'; multiFields.innerHTML = ''; }
      // Re-applica visibilità ispezione in base ai tipi selezionati
      toggleIspezioneFields();
      onVisitaArniaChange();
    }
  } catch(err) {
    console.error('[Registro] Errore in toggleMultiArnia:', err.message);
  }
}

function renderMultiArniaCheckboxes() {
  try {
    const container = document.getElementById('multiArniaCheckboxes');
    if(!container) return;
    const arnieAttive = arnie.filter(a => a.status !== 'dismessa' && !a.annoDismissione);
    if(arnieAttive.length === 0) {
      container.innerHTML = '<span style="color:var(--text-light);font-style:italic;font-size:0.85rem">Nessuna arnia disponibile</span>';
      return;
    }
    container.innerHTML = arnieAttive.map(a => `
      <label class="tipo-chip" style="cursor:pointer">
        <input type="checkbox" class="multiArniaCheck" value="${a.id}" onchange="renderMultiArniaFields()"> #${a.num}${a.nome?' '+a.nome:''}
      </label>
    `).join('');
  } catch(err) {
    console.error('[Registro] Errore in renderMultiArniaCheckboxes:', err.message);
  }
}

function renderMultiArniaFields() {
  try {
    const checks = Array.from(document.querySelectorAll('.multiArniaCheck:checked'));
    const fieldsContainer = document.getElementById('multiArniaFields');
    if(!fieldsContainer) return;

    const tipiSelezionati = Array.from(document.querySelectorAll('#logTipo input:checked')).map(x => x.value);
    const conIspezione = tipiSelezionati.includes('ispezione');

    if(checks.length === 0) {
      fieldsContainer.innerHTML = '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem;padding:1rem;text-align:center">Seleziona almeno un\'arnia sopra per inserire le note.</div>';
      return;
    }

    fieldsContainer.innerHTML = `
      <div style="background:rgba(200,134,10,0.08);border:1px solid rgba(200,134,10,0.25);border-radius:6px;padding:0.7rem 1rem;margin:1rem 0 0.8rem;font-size:0.9rem;color:var(--brown)">
        📋 Stai per registrare <strong>${checks.length} visit${checks.length>1?'e':'a'}</strong> (una per arnia): ${checks.map(c=>{const a=arnie.find(x=>x.id===c.value);return a?'#'+a.num:'';}).filter(Boolean).join(', ')}
      </div>
      <div style="font-family:'Playfair Display',serif;font-size:1rem;color:var(--brown);margin:0 0 0.6rem">📝 Dettagli per arnia</div>` +
      checks.map(chk => {
        const arnia = arnie.find(a => a.id === chk.value);
        if(!arnia) return '';
        // Precompila ispezione dall'ultima visita di questa arnia
        const ultimaIsp = findUltimaIspezione(arnia.id);
        const ispPrev = ultimaIsp?.ispezione || {};
        const covataVal = ispPrev.covata || '';
        const scorteVal = ispPrev.scorte || '';
        const telainiVal = ispPrev.telaini || '';
        const celleVal = ispPrev.celleReali || '0';
        return `
        <div style="border:1px solid var(--cream-dark);border-radius:6px;padding:0.9rem;margin-bottom:0.8rem;background:white">
          <div style="font-weight:600;color:var(--brown);margin-bottom:0.6rem;display:flex;align-items:center;gap:0.4rem">
            🏠 #${arnia.num}${arnia.nome?' — '+arnia.nome:''}
            ${ultimaIsp ? `<span style="font-size:0.72rem;color:var(--text-light);font-weight:400">· precompilato da ${formatDate(ultimaIsp.data)}</span>` : ''}
          </div>
          <div class="form-row" style="margin-bottom:0.6rem">
            <label style="font-size:0.82rem">Note / Osservazioni</label>
            <textarea id="multiNote_${arnia.id}" rows="2" placeholder="Note per questa arnia..." style="width:100%"></textarea>
          </div>
          <div class="form-row" style="margin-bottom:0">
            <label style="font-size:0.82rem">Varroa (cadute/giorno)</label>
            <input type="number" id="multiVarroa_${arnia.id}" min="0" placeholder="—" style="width:100%">
          </div>
          ${conIspezione ? `
          <div style="margin-top:0.7rem;padding-top:0.7rem;border-top:1px dashed var(--cream-dark)">
            <div style="font-size:0.82rem;color:var(--text-light);margin-bottom:0.5rem">🔍 Ispezione</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem">
              <div class="form-row" style="margin:0">
                <label style="font-size:0.78rem">Covata (0-5)</label>
                <input type="number" id="multiCovata_${arnia.id}" min="0" max="5" placeholder="—" value="${covataVal}">
              </div>
              <div class="form-row" style="margin:0">
                <label style="font-size:0.78rem">Scorte (0-5)</label>
                <input type="number" id="multiScorte_${arnia.id}" min="0" max="5" placeholder="—" value="${scorteVal}">
              </div>
              <div class="form-row" style="margin:0">
                <label style="font-size:0.78rem">Telaini occupati</label>
                <input type="number" id="multiTelaini_${arnia.id}" min="0" max="20" placeholder="—" value="${telainiVal}">
              </div>
              <div class="form-row" style="margin:0">
                <label style="font-size:0.78rem">Celle reali</label>
                <select id="multiCelleReali_${arnia.id}">
                  ${CELLE_REALI_LABEL.map((l,i) => `<option value="${i}"${String(i)===String(celleVal)?' selected':''}>${l}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>` : ''}
        </div>`;
      }).join('');
  } catch(err) {
    console.error('[Registro] Errore in renderMultiArniaFields:', err.message);
  }
}

function precompilaDaUltimaIspezione() {
  const arniaId = document.getElementById('logArnia').value;
  if(!arniaId) return;

  const ultimaIsp = findUltimaIspezione(arniaId);
  if(!ultimaIsp) return;

  const isp = ultimaIsp.ispezione;
  if(isp.covata)     document.getElementById('ispCovata').value     = isp.covata;
  if(isp.scorte)     document.getElementById('ispScorte').value     = isp.scorte;
  if(isp.celleReali !== undefined && isp.celleReali !== '')
                     document.getElementById('ispCelleReali').value = isp.celleReali;
  if(isp.telaini) {
    document.getElementById('ispTelaini').value = isp.telaini;
    renderTelainiMapForm();
    if(isp.mappa && isp.mappa.length) {
      isp.mappa.forEach((tipo, i) => {
        const sel = document.getElementById(`telainoVal_${i}`);
        if(sel) sel.value = tipo;
      });
    }
  }
  showImportToast(`📋 Precompilato da ultima ispezione del ${formatDate(ultimaIsp.data)}`);
}

function toggleIspezioneFields() {
  const tipi = Array.from(document.querySelectorAll('#logTipo input:checked')).map(x => x.value);

  // Se in modalità multi-arnia, rigenera i campi per-arnia e nascondi i campi singoli
  const isMulti = document.getElementById('logMultiArnia')?.checked;
  if(isMulti) {
    if(typeof renderMultiArniaFields === 'function') renderMultiArniaFields();
    // I campi singoli restano nascosti
    const elIspM = document.getElementById('ispezioneFields');
    if(elIspM) elIspM.style.display = 'none';
    // Ma il trattamento (condiviso) deve restare visibile
    const elTratM = document.getElementById('trattamentoFields');
    if(elTratM) elTratM.style.display = tipi.includes('trattamento') ? 'block' : 'none';
    const elRacM = document.getElementById('raccoltaFields');
    if(elRacM) elRacM.style.display = 'none'; // raccolta non gestita in multi
    return;
  }

  const showIsp = tipi.includes('ispezione');
  const showRac = tipi.includes('produzione');
  const showTrat = tipi.includes('trattamento');
  const elIsp = document.getElementById('ispezioneFields');
  const elRac = document.getElementById('raccoltaFields');
  const elTrat = document.getElementById('trattamentoFields');
  if(elIsp) {
    elIsp.style.display = showIsp ? 'block' : 'none';
    if(showIsp) {
      precompilaDaUltimaIspezione();
    }
    if(!showIsp) {
      document.getElementById('ispCovata').value = '';
      document.getElementById('ispScorte').value = '';
      document.getElementById('ispCelleReali').value = '';
      document.getElementById('ispTelaini').value = '';
      document.getElementById('telainiMapForm').innerHTML = '';
    }
  }
  if(elRac) {
    elRac.style.display = showRac ? 'block' : 'none';
    if(showRac && document.getElementById('raccoltaRighe').children.length === 0) {
      addRaccoltaRiga();
    }
    if(!showRac) {
      document.getElementById('raccoltaRighe').innerHTML = '';
    }
  }
  if(elTrat) {
    elTrat.style.display = showTrat ? 'block' : 'none';
    if(!showTrat) {
      document.getElementById('trattProdotto').value = '';
      document.getElementById('trattDosaggio').value = '';
    }
  }
}

let raccoltaRigheCount = 0;

function addRaccoltaRiga() {
  const prodotti = articoli.filter(a => a.categoria === 'prodotto');
  if(prodotti.length === 0) {
    alert('Nessun articolo di categoria "Prodotto finito" nel magazzino. Aggiungine uno prima.');
    return;
  }
  const idx = raccoltaRigheCount++;
  const div = document.createElement('div');
  div.id = `raccoltaRiga_${idx}`;
  div.style.cssText = 'display:grid;grid-template-columns:1fr auto auto;gap:0.5rem;align-items:end;margin-bottom:0.5rem';
  div.innerHTML = `
    <div>
      <select id="raccoltaArt_${idx}" onchange="raccoltaArtChange(${idx})" style="width:100%;padding:0.5rem 0.7rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.95rem;background:white">
        <option value="">— Seleziona prodotto —</option>
        ${prodotti.map(a=>`<option value="${a.id}" data-unita="${a.unita}">${a.nome}</option>`).join('')}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:0.3rem">
      <input type="number" id="raccoltaQta_${idx}" min="0" step="0.1" placeholder="Qtà" style="width:80px;padding:0.5rem 0.5rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:'Crimson Pro',serif;font-size:0.95rem;background:white">
      <span id="raccoltaUnita_${idx}" style="font-size:0.82rem;color:var(--text-light);min-width:24px">—</span>
    </div>
    <button type="button" onclick="removeRaccoltaRiga(${idx})" class="btn-icon del" style="margin-bottom:0">✕</button>
  `;
  document.getElementById('raccoltaRighe').appendChild(div);
}

function raccoltaArtChange(idx) {
  const sel = document.getElementById(`raccoltaArt_${idx}`);
  const opt = sel.options[sel.selectedIndex];
  document.getElementById(`raccoltaUnita_${idx}`).textContent = opt?.dataset?.unita || '—';
}

function removeRaccoltaRiga(idx) {
  const el = document.getElementById(`raccoltaRiga_${idx}`);
  if(el) el.remove();
}

function getRaccoltaData() {
  const righe = document.getElementById('raccoltaRighe').querySelectorAll('[id^="raccoltaRiga_"]');
  const result = [];
  righe.forEach(riga => {
    const idx = riga.id.split('_')[1];
    const artId = document.getElementById(`raccoltaArt_${idx}`)?.value;
    const qta = parseFloat(document.getElementById(`raccoltaQta_${idx}`)?.value);
    if(artId && qta > 0) result.push({ articoloId: artId, qta });
  });
  return result;
}

function renderTelainiMapForm() {
  const n = parseInt(document.getElementById('ispTelaini').value, 10) || 0;
  const container = document.getElementById('telainiMapForm');
  if(!n) { container.innerHTML = ''; return; }
  container.innerHTML = `<div class="telaini-map-form">` +
    Array.from({length: n}, (_, i) => `
      <div class="telaino-form-item">
        <label>T${i+1}</label>
        <select id="telainoVal_${i}">
          ${TELAINO_OPZIONI.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
      </div>`).join('') +
    `</div>`;
}

function getTelainiData() {
  const n = parseInt(document.getElementById('ispTelaini').value, 10) || 0;
  if(!n) return null;
  return Array.from({length: n}, (_, i) => {
    const sel = document.getElementById(`telainoVal_${i}`);
    return sel ? sel.value : '';
  });
}

function renderTelainiVisual(mappa) {
  // Alias per shared.js renderTelainiVisualHTML
  return renderTelainiVisualHTML(mappa);
}

// ======= ACCESSORI PRODUTTIVI nella VISITA =======
// Stato temporaneo durante la visita (azioni pendenti su accessori)
let _visitaAccessoriPending = {
  melariDaRimuovere: [],  // [meleId, ...]
  reteToggle: null,        // 'attiva' | 'disattiva' | null
  trappolaToggle: null     // 'attiva' | 'disattiva' | null
};

function onVisitaArniaChange() {
  _visitaAccessoriPending = { melariDaRimuovere: [], reteToggle: null, trappolaToggle: null };
  renderAccessoriVisita();
}

function renderAccessoriVisita() {
  try {
    const section = document.getElementById('accessoriSection');
    const content = document.getElementById('accessoriContent');
    if(!section || !content) return;

    const arniaId = document.getElementById('logArnia')?.value;
    if(!arniaId) {
      section.style.display = 'none';
      return;
    }
    const a = arnie.find(x => x.id === arniaId);
    if(!a) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';

  let html = '';

  // MELARI
  const melari = a.melari || [];
  const melariAttivi = melari.filter((m, i) => m.status === 'posizionato' && !_visitaAccessoriPending.melariDaRimuovere.includes(i));
  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:600;color:var(--brown);margin-bottom:0.4rem;font-size:0.95rem">🍯 Melari</div>';
  if(melariAttivi.length === 0) {
    html += '<div style="font-size:0.85rem;color:var(--text-light);font-style:italic;margin-bottom:0.4rem">Nessun melario attivo</div>';
  } else {
    melariAttivi.forEach((m, displayIdx) => {
      const realIdx = melari.indexOf(m);
      html += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.7rem;background:white;border:1px solid var(--cream-dark);border-radius:4px;margin-bottom:0.3rem;font-size:0.88rem">
          <span><strong>${m.num} telaini</strong>${m.note ? ' — '+m.note : ''} <span style="color:var(--text-light);font-size:0.78rem">(dal ${m.data?formatDate(m.data):'—'})</span></span>
          <button type="button" class="btn btn-danger" onclick="visitaRimuoviMelario(${realIdx})" style="padding:0.25rem 0.6rem;font-size:0.78rem">🗑 Rimuovi</button>
        </div>
      `;
    });
  }
  if(_visitaAccessoriPending.melariDaRimuovere.length > 0) {
    html += `<div style="font-size:0.82rem;color:var(--red);margin-top:0.3rem;font-style:italic">⚠️ ${_visitaAccessoriPending.melariDaRimuovere.length} melario(i) verrà(nno) marcato(i) come "smielato" al salvataggio</div>`;
  }
  // Aggiungi melario
  html += `
    <div style="display:flex;gap:0.4rem;margin-top:0.4rem;flex-wrap:wrap;align-items:flex-end">
      <div style="flex:1;min-width:80px">
        <label style="font-size:0.74rem;color:var(--text-light);display:block;margin-bottom:0.2rem">N° telaini</label>
        <input type="number" id="visMelNum" min="1" max="12" placeholder="Es. 10" style="width:100%;padding:0.35rem 0.5rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.88rem">
      </div>
      <div style="flex:2;min-width:120px">
        <label style="font-size:0.74rem;color:var(--text-light);display:block;margin-bottom:0.2rem">Note</label>
        <input type="text" id="visMelNote" placeholder="Es. acacia" style="width:100%;padding:0.35rem 0.5rem;border:1px solid var(--cream-dark);border-radius:3px;font-family:inherit;font-size:0.88rem">
      </div>
      <button type="button" class="btn" onclick="visitaAggiungiMelario()" style="padding:0.4rem 0.8rem;font-size:0.85rem">➕ Aggiungi melario</button>
    </div>
  `;
  html += '</div>';

  // RETE PROPOLI
  html += '<div style="margin-bottom:1rem">';
  html += '<div style="font-weight:600;color:var(--brown);margin-bottom:0.4rem;font-size:0.95rem">🌿 Rete propoli</div>';
  const reteAttualeAttiva = a.retePropoli && a.retePropoli.attiva !== false && _visitaAccessoriPending.reteToggle !== 'disattiva';
  const reteAttivaPendente = _visitaAccessoriPending.reteToggle === 'attiva';
  const reteEffettivamente = reteAttualeAttiva || reteAttivaPendente;
  if(reteEffettivamente) {
    const dataAtt = (reteAttivaPendente ? new Date().toISOString().slice(0,10) : a.retePropoli?.data) || '';
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.7rem;background:white;border:1px solid var(--cream-dark);border-radius:4px;font-size:0.88rem">
        <span>✓ Rete propoli <strong>attiva</strong>${dataAtt ? ` <span style="color:var(--text-light);font-size:0.78rem">(dal ${formatDate(dataAtt)})</span>` : ''}${reteAttivaPendente?' <em style="color:var(--green)">(attivata in questa visita)</em>':''}</span>
        <button type="button" class="btn btn-danger" onclick="visitaToggleRete('disattiva')" style="padding:0.25rem 0.6rem;font-size:0.78rem">🗑 Rimuovi</button>
      </div>
    `;
  } else {
    const disattivataInVisita = _visitaAccessoriPending.reteToggle === 'disattiva';
    if(disattivataInVisita) {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.7rem;background:#FDF0F0;border:1px solid var(--red);border-radius:4px;font-size:0.88rem">
        <span style="color:var(--red)">⚠️ Rete verrà disattivata al salvataggio</span>
        <button type="button" class="btn btn-secondary" onclick="visitaToggleRete(null)" style="padding:0.25rem 0.6rem;font-size:0.78rem">↶ Annulla</button>
      </div>`;
    } else {
      html += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.7rem;background:white;border:1px dashed var(--cream-dark);border-radius:4px;font-size:0.88rem">
          <span style="color:var(--text-light);font-style:italic">Nessuna rete propoli attiva</span>
          <button type="button" class="btn" onclick="visitaToggleRete('attiva')" style="padding:0.25rem 0.6rem;font-size:0.78rem">➕ Attiva</button>
        </div>
      `;
    }
  }
  html += '</div>';

  // TRAPPOLA POLLINE
  html += '<div>';
  html += '<div style="font-weight:600;color:var(--brown);margin-bottom:0.4rem;font-size:0.95rem">🌾 Trappola polline</div>';
  const trappolaAttuale = a.trappolaPolline && a.trappolaPolline.attiva !== false && _visitaAccessoriPending.trappolaToggle !== 'disattiva';
  const trappolaAttivaPendente = _visitaAccessoriPending.trappolaToggle === 'attiva';
  const trappolaEffettivamente = trappolaAttuale || trappolaAttivaPendente;
  if(trappolaEffettivamente) {
    const dataAtt = (trappolaAttivaPendente ? new Date().toISOString().slice(0,10) : a.trappolaPolline?.data) || '';
    const pos = a.trappolaPolline?.posizione || 'Entrata';
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.7rem;background:white;border:1px solid var(--cream-dark);border-radius:4px;font-size:0.88rem">
        <span>✓ Trappola <strong>attiva</strong> (${pos})${dataAtt ? ` <span style="color:var(--text-light);font-size:0.78rem">(dal ${formatDate(dataAtt)})</span>` : ''}${trappolaAttivaPendente?' <em style="color:var(--green)">(attivata in questa visita)</em>':''}</span>
        <button type="button" class="btn btn-danger" onclick="visitaToggleTrappola('disattiva')" style="padding:0.25rem 0.6rem;font-size:0.78rem">🗑 Rimuovi</button>
      </div>
    `;
  } else {
    const disattivataInVisita = _visitaAccessoriPending.trappolaToggle === 'disattiva';
    if(disattivataInVisita) {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.7rem;background:#FDF0F0;border:1px solid var(--red);border-radius:4px;font-size:0.88rem">
        <span style="color:var(--red)">⚠️ Trappola verrà disattivata al salvataggio</span>
        <button type="button" class="btn btn-secondary" onclick="visitaToggleTrappola(null)" style="padding:0.25rem 0.6rem;font-size:0.78rem">↶ Annulla</button>
      </div>`;
    } else {
      html += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.7rem;background:white;border:1px dashed var(--cream-dark);border-radius:4px;font-size:0.88rem">
          <span style="color:var(--text-light);font-style:italic">Nessuna trappola attiva</span>
          <button type="button" class="btn" onclick="visitaToggleTrappola('attiva')" style="padding:0.25rem 0.6rem;font-size:0.78rem">➕ Attiva</button>
        </div>
      `;
    }
  }
  html += '</div>';

  // Melari aggiunti in questa visita
  if(_melariAggiunti.length > 0) {
    html += '<div style="margin-top:0.6rem;padding:0.5rem 0.7rem;background:#EEF6E7;border-left:3px solid var(--green);border-radius:3px;font-size:0.82rem">';
    html += `<strong>${_melariAggiunti.length} melario(i) verrà(nno) aggiunto(i) al salvataggio:</strong>`;
    _melariAggiunti.forEach((m, i) => {
      html += `<div style="margin-top:0.2rem;display:flex;justify-content:space-between;align-items:center">📦 ${m.num} telaini${m.note?' — '+m.note:''} <button type="button" onclick="visitaAnnullaMelario(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.85rem">✕</button></div>`;
    });
    html += '</div>';
  }

  content.innerHTML = html;
  } catch(err) {
    console.error('[Registro] Errore in renderAccessoriVisita:', err.message);
  }
}

let _melariAggiunti = []; // melari aggiunti in questa visita

function visitaRimuoviMelario(idx) {
  if(!_visitaAccessoriPending.melariDaRimuovere.includes(idx)) {
    _visitaAccessoriPending.melariDaRimuovere.push(idx);
  }
  renderAccessoriVisita();
}

function visitaAggiungiMelario() {
  const num = document.getElementById('visMelNum')?.value;
  if(!num) { alert('Inserisci il numero di telaini'); return; }
  const note = document.getElementById('visMelNote')?.value.trim() || '';
  _melariAggiunti.push({ num, note, data: document.getElementById('logData')?.value || new Date().toISOString().slice(0,10), status: 'posizionato', id: Date.now().toString() });
  document.getElementById('visMelNum').value = '';
  document.getElementById('visMelNote').value = '';
  renderAccessoriVisita();
}

function visitaAnnullaMelario(idx) {
  _melariAggiunti.splice(idx, 1);
  renderAccessoriVisita();
}

function visitaToggleRete(action) {
  _visitaAccessoriPending.reteToggle = action;
  renderAccessoriVisita();
}

function visitaToggleTrappola(action) {
  _visitaAccessoriPending.trappolaToggle = action;
  renderAccessoriVisita();
}

// Applica le modifiche pendenti dell'accessori all'arnia
function applicaModificheAccessoriVisita(arniaObj) {
  if(!arniaObj) return;
  const dataVisita = document.getElementById('logData')?.value || new Date().toISOString().slice(0,10);

  // 1) Melari da rimuovere → status 'produzione' (smielato)
  if(_visitaAccessoriPending.melariDaRimuovere.length > 0) {
    if(!arniaObj.melari) arniaObj.melari = [];
    _visitaAccessoriPending.melariDaRimuovere.forEach(idx => {
      if(arniaObj.melari[idx]) {
        arniaObj.melari[idx].status = 'produzione';
        arniaObj.melari[idx].dataFine = dataVisita;
      }
    });
  }
  // 2) Melari aggiunti
  if(_melariAggiunti.length > 0) {
    if(!arniaObj.melari) arniaObj.melari = [];
    _melariAggiunti.forEach(m => {
      arniaObj.melari.push({ ...m, data: m.data || dataVisita });
    });
  }
  // 3) Rete propoli
  if(_visitaAccessoriPending.reteToggle === 'attiva') {
    arniaObj.retePropoli = {
      data: dataVisita,
      note: '',
      attiva: true,
      storico: arniaObj.retePropoli?.storico || []
    };
  } else if(_visitaAccessoriPending.reteToggle === 'disattiva') {
    const r = arniaObj.retePropoli;
    if(r) {
      const storico = r.storico || [];
      storico.push({ dataInizio: r.data, dataFine: dataVisita, note: r.note, stato: 'raschiata' });
      arniaObj.retePropoli = { attiva: false, storico };
    }
  }
  // 4) Trappola polline
  if(_visitaAccessoriPending.trappolaToggle === 'attiva') {
    arniaObj.trappolaPolline = {
      posizione: arniaObj.trappolaPolline?.posizione || 'Entrata',
      data: dataVisita,
      note: '',
      attiva: true,
      storico: arniaObj.trappolaPolline?.storico || []
    };
  } else if(_visitaAccessoriPending.trappolaToggle === 'disattiva') {
    const t = arniaObj.trappolaPolline;
    if(t) {
      const storico = t.storico || [];
      storico.push({ dataInizio: t.data, dataFine: dataVisita, posizione: t.posizione, note: t.note });
      arniaObj.trappolaPolline = { attiva: false, storico };
    }
  }

  // Reset stato visita
  _visitaAccessoriPending = { melariDaRimuovere: [], reteToggle: null, trappolaToggle: null };
  _melariAggiunti = [];
}

// ======= REGISTRO =======
function updateArniSelects() {
  const selects = ['logArnia','filterArnia'];
  selects.forEach(sid => {
    const sel = document.getElementById(sid);
    if(!sel) return;
    const defaultOpt = sid === 'logArnia'
      ? '<option value="">— Seleziona arnia —</option>'
      : '<option value="">Tutte le arnie</option>';
    sel.innerHTML = defaultOpt + arnie.map(a => `<option value="${a.id}">#${a.num}${a.nome?' – '+a.nome:''}</option>`).join('');
  });
}

function addLogEntry() {
  try {
    const dataEl = document.getElementById('logData');
    if(!dataEl) {
      console.error('[Registro] Elemento logData non trovato');
      return;
    }
    const data = dataEl.value;
    if(!data) { alert('Inserisci la data'); return; }
    const tipi = Array.from(document.querySelectorAll('#logTipo input:checked')).map(x => x.value);
    if(tipi.length === 0) { alert('Seleziona almeno un tipo di intervento'); return; }

    // ===== MODALITÀ MULTI-ARNIA =====
    const isMulti = document.getElementById('logMultiArnia')?.checked;
    if(isMulti) {
      return addLogEntryMulti(data, tipi);
    }

    const noteEl = document.getElementById('logNote');
    if(!noteEl) {
      console.error('[Registro] Elemento logNote non trovato');
      return;
    }
    const note = noteEl.value.trim();
    if(!note) { alert('Compila le note'); return; }

    // Arnia obbligatoria
    const arniaId = document.getElementById('logArnia').value;
    if(!arniaId) { alert('Seleziona un\'arnia — è obbligatoria'); return; }
    const arniaObj = arnie.find(a => a.id === arniaId);
    if(!arniaObj) {
      console.warn('[Registro] Arnia non trovata:', arniaId);
      alert('Arnia non valida. Ricarica la pagina e riprova.');
      return;
    }

  // Dati ispezione
  let ispezioneData = null;
  if(tipi.includes('ispezione')) {
    ispezioneData = {
      covata:     document.getElementById('ispCovata').value,
      scorte:     document.getElementById('ispScorte').value,
      celleReali: document.getElementById('ispCelleReali').value,
      telaini:    parseInt(document.getElementById('ispTelaini').value, 10) || null,
      mappa:      getTelainiData()
    };
  }

  // Dati raccolta
  let raccoltaData = null;
  if(tipi.includes('produzione')) {
    const righe = getRaccoltaData();
    if(righe.length === 0) { alert('Aggiungi almeno un prodotto nella sezione Raccolta'); return; }
    raccoltaData = righe;
  }

  // Dati trattamento
  let trattamentoData = null;
  if(tipi.includes('trattamento')) {
    const prodotto = document.getElementById('trattProdotto').value;
    const dosaggio = document.getElementById('trattDosaggio').value;
    if(prodotto || dosaggio) {
      trattamentoData = { prodotto, dosaggio };
    }
  }

  const entry = {
    id: Date.now().toString(), data,
    arniaId, arniaNome: arniaObj ? `#${arniaObj.num}${arniaObj.nome?' – '+arniaObj.nome:''}` : '—',
    tipo: tipi, note,
    varroa: document.getElementById('logVarroa').value,
    ispezione: ispezioneData,
    raccolta: raccoltaData,
    trattamento: trattamentoData
  };
  logBook.unshift(entry);

  // Applica modifiche agli accessori produttivi (melari, rete, trappola)
  applicaModificheAccessoriVisita(arniaObj);

  saveDB();

  // ===== CHECK EVOLUZIONE SCIAME (post Step 2) =====
  // Se la visita riguarda uno sciame che non è ancora stato "valutato", chiediamo come è evoluto
  if(arniaObj && arniaObj.tipo === 'sciame' && arniaObj.sciameNeedsEvolutionCheck) {
    setTimeout(() => askSciameEvolution(arniaObj.id), 600);
  }

  // Movimenti automatici magazzino per raccolta
  if(raccoltaData && raccoltaData.length > 0) {
    const annoVisita = data.slice(0, 4);
    raccoltaData.forEach(r => {
      movimentazioni.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        data, articoloId: r.articoloId,
        tipo: 'entrata', qta: r.qta,
        note: `Da visita ${arniaObj ? '#'+arniaObj.num : ''} del ${formatDate(data)}`
      });
      // Aggiorna produzione per arnia e anno
      if(arniaObj) {
        const art = articoli.find(a => a.id === r.articoloId);
        if(!arniaObj.produzionePerAnno) arniaObj.produzionePerAnno = {};
        if(!arniaObj.produzionePerAnno[annoVisita]) arniaObj.produzionePerAnno[annoVisita] = {};
        const nomeArt = art ? art.nome : r.articoloId;
        arniaObj.produzionePerAnno[annoVisita][nomeArt] =
          (arniaObj.produzionePerAnno[annoVisita][nomeArt] || 0) + r.qta;
        arnie = arnie.map(a => a.id === arniaId ? arniaObj : a);
      }
    });
    saveMagazzino();
    saveDB();
  }

  // Reset form
  document.getElementById('logNote').value = '';
  document.getElementById('logVarroa').value = '';
  document.getElementById('logArnia').value = '';
  document.querySelectorAll('#logTipo input').forEach(x => x.checked = false);
  document.getElementById('ispCovata').value = '';
  document.getElementById('ispScorte').value = '';
  document.getElementById('ispCelleReali').value = '';
  document.getElementById('ispTelaini').value = '';
  document.getElementById('telainiMapForm').innerHTML = '';
  document.getElementById('ispezioneFields').style.display = 'none';
  document.getElementById('raccoltaFields').style.display = 'none';
  document.getElementById('raccoltaRighe').innerHTML = '';
  document.getElementById('trattamentoFields').style.display = 'none';
  document.getElementById('trattProdotto').value = '';
  document.getElementById('trattDosaggio').value = '';
  raccoltaRigheCount = 0;

  renderLog();
  renderStats();
  showImportToast('✅ Visita salvata' + (raccoltaData ? ` · ${raccoltaData.length} prodotti caricati a magazzino` : ''));

  // Proponi di schedulare la prossima visita
  const arniaLabel = arniaObj ? `#${arniaObj.num}${arniaObj.nome?' — '+arniaObj.nome:''}` : '';
  setTimeout(() => showCalendarPopup(arniaLabel), 400);
  } catch(err) {
    console.error('[Registro] Errore in addLogEntry:', err.message, err);
    alert('Errore durante il salvataggio. Apri F12 → Console per dettagli.');
  }
}

// ============================================
// SALVATAGGIO MULTI-ARNIA
// Crea N visite distinte (una per arnia selezionata)
// con campi comuni (data, tipi, trattamento) e campi separati (note, ispezione)
// ============================================
function addLogEntryMulti(data, tipi) {
  try {
    const checks = Array.from(document.querySelectorAll('.multiArniaCheck:checked'));
    if(checks.length === 0) { alert('Seleziona almeno un\'arnia'); return; }

    // Dati comuni trattamento (condivisi tra tutte le arnie)
    let trattamentoData = null;
    if(tipi.includes('trattamento')) {
      trattamentoData = {
        prodotto: document.getElementById('trattProdotto')?.value || '',
        dosaggio: document.getElementById('trattDosaggio')?.value || '',
      };
    }

    const conIspezione = tipi.includes('ispezione');
    let creati = 0;
    let almenoUnaNota = false;

    // Verifica che almeno una arnia abbia una nota
    checks.forEach(chk => {
      const note = document.getElementById('multiNote_' + chk.value)?.value.trim();
      if(note) almenoUnaNota = true;
    });
    if(!almenoUnaNota) {
      alert('Inserisci le note per almeno un\'arnia');
      return;
    }

    checks.forEach(chk => {
      const arnia = arnie.find(a => a.id === chk.value);
      if(!arnia) { console.warn('[Registro] Arnia non trovata in multi:', chk.value); return; }

      const note = document.getElementById('multiNote_' + arnia.id)?.value.trim() || '';
      // Salta arnie senza note (l'utente potrebbe aver selezionato ma non compilato)
      if(!note) return;

      const varroa = document.getElementById('multiVarroa_' + arnia.id)?.value || '';

      let ispezioneData = null;
      if(conIspezione) {
        const covata = document.getElementById('multiCovata_' + arnia.id)?.value || '';
        const scorte = document.getElementById('multiScorte_' + arnia.id)?.value || '';
        const telaini = document.getElementById('multiTelaini_' + arnia.id)?.value || '';
        const celleReali = document.getElementById('multiCelleReali_' + arnia.id)?.value || '0';
        ispezioneData = { covata, scorte, telaini, celleReali, mappa: [] };
      }

      const entry = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        data,
        arniaId: arnia.id,
        arniaNome: `#${arnia.num}${arnia.nome ? ' — ' + arnia.nome : ''}`,
        tipo: tipi,
        note,
        varroa,
        ispezione: ispezioneData,
        trattamento: trattamentoData,
        raccolta: [],
      };
      logBook.unshift(entry);
      creati++;
    });

    if(creati === 0) {
      alert('Nessuna visita creata (compila le note delle arnie selezionate)');
      return;
    }

    saveDB();

    // Reset form
    document.getElementById('logMultiArnia').checked = false;
    toggleMultiArnia();
    document.querySelectorAll('#logTipo input:checked').forEach(c => c.checked = false);
    const trattF = document.getElementById('trattamentoFields');
    if(trattF) trattF.style.display = 'none';

    renderLog();
    renderStats();
    showImportToast(`✅ ${creati} visite salvate (${creati} arnie)`);
  } catch(err) {
    console.error('[Registro] Errore in addLogEntryMulti:', err.message, err);
    alert('Errore durante il salvataggio multiplo. Apri F12 per dettagli.');
  }
}

function deleteLog(id) {
  if(!confirm('Eliminare questa registrazione?')) return;
  logBook = logBook.filter(e => e.id !== id);
  saveDB();
  renderLog();
  renderStats();
}

function renderLog() {
  try {
  const search = (document.getElementById('filterSearch')?.value||'').toLowerCase();
  const tipo = document.getElementById('filterTipo')?.value||'';
  const arniaF = document.getElementById('filterArnia')?.value||'';
  const dataDa = document.getElementById('filterDataDa')?.value||'';
  const dataA = document.getElementById('filterDataA')?.value||'';

  // Dropdown filtri multiscelta
  if(typeof initFiltroDropdown === 'function' && document.getElementById('registroFiltriDropdown')) {
    initFiltroDropdown('registro', 'registroFiltriDropdown', renderLog);
  }

  let filtered = logBook.filter(e => {
    if(tipo && !getTipi(e).includes(tipo)) return false;
    if(arniaF && e.arniaId !== arniaF) return false;
    if(search && !e.note.toLowerCase().includes(search) && !e.arniaNome.toLowerCase().includes(search)) return false;
    // Filtro intervallo date (e.data è formato YYYY-MM-DD, confronto stringa funziona)
    if(dataDa && e.data && e.data < dataDa) return false;
    if(dataA && e.data && e.data > dataA) return false;
    return true;
  });
  if(typeof applicaFiltri === 'function') filtered = applicaFiltri('registro', filtered);

  // Info intervallo date
  const dateInfoEl = document.getElementById('filterDateInfo');
  if(dateInfoEl) {
    if(dataDa || dataA) {
      dateInfoEl.textContent = `${filtered.length} visite nel periodo`;
    } else {
      dateInfoEl.textContent = '';
    }
  }

  const tipoLabel = {ispezione:'Ispezione',trattamento:'Trattamento',nutrizione:'Nutrizione',produzione:'Produzione',salute:'Salute',altro:'Altro'};
  const tipoEmoji = {ispezione:'🔍',trattamento:'💊',nutrizione:'🍬',produzione:'🍯',salute:'⚕️',altro:'📌'};
  // Map per lookup veloce articoli — evita N find() in loop
  const artMap = new Map(articoli.map(a => [a.id, a]));
  const container = document.getElementById('logEntries');
  if(!container) { console.warn('[Registro] logEntries non trovato'); return; }
  if(filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="big">📖</span>Nessuna registrazione trovata${(dataDa||dataA)?' nel periodo selezionato':''}.</div>`;
    return;
  }
  container.innerHTML = filtered.map(e => {
    const tipi = getTipi(e);
    const firstTipo = tipi[0] || 'altro';
    return `
    <div class="log-entry tipo-${firstTipo}">
      <div class="log-entry-header">
        <div class="log-entry-meta">
          <span class="log-date">📅 ${formatDate(e.data)}</span>
          <span class="tag tag-arnia">🏠 ${e.arniaNome}</span>
          ${tipi.map(t => `<span class="tag tag-tipo ${t}">${tipoEmoji[t]||''} ${tipoLabel[t]||t}</span>`).join('')}
        </div>
        <div class="log-actions">
          <button class="btn-icon del" onclick="deleteLog('${e.id}')" title="Elimina">🗑</button>
        </div>
      </div>
      <div class="log-entry-note">${e.note}</div>
      ${e.varroa ? `<div class="log-entry-extra">
        <span>🕷 Varroa: <strong>${e.varroa} cadute/giorno</strong></span>
      </div>` : ''}
      ${e.trattamento && (e.trattamento.prodotto || e.trattamento.dosaggio) ? `<div class="log-entry-extra">
        <span>💊 Trattamento: <strong>${({varromed:'🌿 VarroMed',apibioxal:'❄️ Api-Bioxal',altro:'📌 Altro'}[e.trattamento.prodotto]||e.trattamento.prodotto||'—')}</strong>${e.trattamento.dosaggio?` · ${e.trattamento.dosaggio}`:''}</span>
      </div>` : ''}
      ${e.raccolta && e.raccolta.length ? `<div class="log-entry-extra" style="flex-wrap:wrap">
        ${e.raccolta.map(r => {
          const art = artMap.get(r.articoloId);
          return `<span>🍯 <strong>${r.qta} ${art?.unita||''}</strong> ${art?.nome||'(prodotto eliminato)'}</span>`;
        }).join('')}
      </div>` : ''}
      ${e.ispezione && (e.ispezione.covata || e.ispezione.scorte || e.ispezione.celleReali !== '' || e.ispezione.telaini) ? `
        <div class="log-entry-extra" style="margin-top:0.4rem;flex-wrap:wrap">
          ${e.ispezione.covata ? `<span>🟤 Covata: <strong>${e.ispezione.covata}/5</strong></span>` : ''}
          ${e.ispezione.scorte ? `<span>🟡 Scorte: <strong>${e.ispezione.scorte}/5</strong></span>` : ''}
          ${e.ispezione.celleReali !== undefined && e.ispezione.celleReali !== '' ? `<span>👑 Celle reali: <strong>${CELLE_REALI_LABEL[e.ispezione.celleReali]||e.ispezione.celleReali}</strong></span>` : ''}
          ${e.ispezione.telaini ? `<span>📏 Famiglia: <strong>${e.ispezione.telaini} telaini</strong></span>` : ''}
        </div>
        ${e.ispezione.mappa && e.ispezione.mappa.length ? renderTelainiVisual(e.ispezione.mappa) : ''}
      ` : ''}
    </div>`;
  }).join('');
  } catch(err) {
    console.error('[Registro] Errore in renderLog:', err.message);
  }
}

function resetFiltroDate() {
  const da = document.getElementById('filterDataDa');
  const a = document.getElementById('filterDataA');
  if(da) da.value = '';
  if(a) a.value = '';
  renderLog();
}

function renderStats() {
  // Calcola miele dalla fonte unica di verità: getMieleStats() in state.js
  const totalMiele = getMieleStats().totale;
  const totalTrattamenti = logBook.filter(e => getTipi(e).includes('trattamento')).length;
  const giorniVisita = countGiorniVisita();
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="stat-number">${arnie.length}</div><div class="stat-label">Arnie registrate</div></div>
    <div class="stat-card"><div class="stat-number">${logBook.length}</div><div class="stat-label">Registrazioni totali</div></div>
    <div class="stat-card"><div class="stat-number">${giorniVisita}</div><div class="stat-label">Giorni visita</div></div>
    <div class="stat-card"><div class="stat-number">${totalTrattamenti}</div><div class="stat-label">Trattamenti</div></div>
    <div class="stat-card"><div class="stat-number">${totalMiele.toFixed(1)}</div><div class="stat-label">Kg miele raccolti</div></div>
  `;
  // Quick stats
  const last5 = logBook.slice(0,5);
  const qs = document.getElementById('quickStats');
  if(last5.length === 0) { qs.innerHTML = '<em>Nessuna registrazione ancora.</em>'; return; }
  qs.innerHTML = '<strong>Ultime attività:</strong><br>' + last5.map(e =>
    `• ${formatDate(e.data)} — ${e.arniaNome}: ${e.note.substring(0,50)}${e.note.length>50?'...':''}`
  ).join('<br>');
}

function exportCSV() {
  try {
    if(logBook.length === 0) { alert('Nessun dato da esportare'); return; }
    const headers = ['Data','Arnia','Tipo','Note','Varroa (cadute/g)','Raccolta'];
    const artMap = new Map(articoli.map(a => [a.id, a]));
    const rows = logBook.map(e => {
      const tipi = getTipi(e).join(', ');
      const raccoltaStr = (e.raccolta || []).map(r => {
        const art = artMap.get(r.articoloId);
      return `${r.qta} ${art?.unita||''} ${art?.nome||''}`;
    }).join(' + ');
    return [e.data, e.arniaNome, tipi, `"${e.note.replace(/"/g,'""')}"`, e.varroa||'', `"${raccoltaStr}"`];
  });
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `registro_apiario_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  } catch(err) {
    console.error('[Registro] Errore in exportCSV:', err.message);
    alert('Errore durante l\'esportazione: ' + err.message);
  }
}

