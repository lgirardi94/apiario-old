// ===== FILE VERSION: 2026-05-28.2 · contabilita.js =====

function getCatList(tipo) { return tipo === 'entrata' ? CAT_ENTRATA : CAT_USCITA; }

// ======= CONTABILITÀ NAV =======
function showContTab(tab, btn) {
  document.getElementById('contTabRiepilogo').style.display = tab === 'riepilogo' ? 'block' : 'none';
  document.getElementById('contTabMovimenti').style.display = tab === 'movimenti' ? 'block' : 'none';
  document.querySelectorAll('#contabilita .mag-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if(tab === 'riepilogo') renderContRiepilogo();
  if(tab === 'movimenti') { populateContAnnoFilter(); renderContMovimenti(); }
}

// ======= RIEPILOGO =======
function renderContRiepilogo() {
  try {
    const anno = new Date().getFullYear();
    const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

    // Totals all time
    const totEntrate = movimentiContabili.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0);
    const totUscite = movimentiContabili.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);
    const saldoTot = totEntrate - totUscite;

    // Totals current year
    const annoCurr = movimentiContabili.filter(m=>m.data&&m.data.startsWith(String(anno)));
    const entAnno = annoCurr.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0);
    const uscAnno = annoCurr.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);
    const saldoAnno = entAnno - uscAnno;

  // KPI
  document.getElementById('contKpiGrid').innerHTML = `
    <div class="cont-kpi"><div class="cont-kpi-label">Saldo ${anno}</div><div class="cont-kpi-val saldo ${saldoAnno>=0?'pos':'neg'}">${saldoAnno>=0?'+':''}€ ${fmt(saldoAnno)}</div></div>
    <div class="cont-kpi"><div class="cont-kpi-label">Entrate ${anno}</div><div class="cont-kpi-val entrata">€ ${fmt(entAnno)}</div></div>
    <div class="cont-kpi"><div class="cont-kpi-label">Uscite ${anno}</div><div class="cont-kpi-val uscita">€ ${fmt(uscAnno)}</div></div>
    <div class="cont-kpi"><div class="cont-kpi-label">Saldo totale</div><div class="cont-kpi-val saldo ${saldoTot>=0?'pos':'neg'}">${saldoTot>=0?'+':''}€ ${fmt(saldoTot)}</div></div>
    <div class="cont-kpi"><div class="cont-kpi-label">Entrate totali</div><div class="cont-kpi-val entrata">€ ${fmt(totEntrate)}</div></div>
    <div class="cont-kpi"><div class="cont-kpi-label">Uscite totali</div><div class="cont-kpi-val uscita">€ ${fmt(totUscite)}</div></div>
  `;

  // ===== SELETTORE ANNO per grafico mensile =====
  // Lista anni dai movimenti + anno corrente + 3 anni futuri
  const anniDataset = [...new Set(movimentiContabili.map(m=>m.data&&m.data.slice(0,4)).filter(Boolean))];
  for(let i=0;i<=3;i++){
    const a = String(anno+i);
    if(!anniDataset.includes(a)) anniDataset.push(a);
  }
  const tuttiAnniMens = anniDataset.sort().reverse();

  const selAnno = document.getElementById('chartMensileAnno');
  if(!selAnno) return; // Safety: l'HTML potrebbe non avere ancora il selettore
  // Mantieni la selezione utente se esiste, altrimenti default all'anno corrente
  const annoSelPrev = selAnno.value;
  selAnno.innerHTML = tuttiAnniMens.map(a => `<option value="${a}">${a}</option>`).join('');
  selAnno.value = annoSelPrev && tuttiAnniMens.includes(annoSelPrev) ? annoSelPrev : String(anno);
  const annoMens = selAnno.value;

  // Movimenti dell'anno selezionato
  const movAnnoSel = movimentiContabili.filter(m=>m.data&&m.data.startsWith(annoMens));
  const entMens = movAnnoSel.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0);
  const uscMens = movAnnoSel.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);
  const saldoMens = entMens - uscMens;

  // Riassunto totali sopra il grafico
  document.getElementById('chartMensileTotali').innerHTML = movAnnoSel.length === 0
    ? `<span style="font-style:italic">Nessun movimento per ${annoMens}</span>`
    : `Entrate: <strong style="color:var(--green)">€ ${fmt(entMens)}</strong> · Uscite: <strong style="color:var(--red)">€ ${fmt(uscMens)}</strong> · Saldo: <strong class="saldo ${saldoMens>=0?'pos':'neg'}" style="color:${saldoMens>=0?'var(--green)':'var(--red)'}">${saldoMens>=0?'+':''}€ ${fmt(saldoMens)}</strong>`;

  // Chart mensile per l'anno selezionato
  const maxMens = Math.max(...Array.from({length:12},(_,i)=>{
    const m = String(i+1).padStart(2,'0');
    const prefix = `${annoMens}-${m}`;
    const e = movAnnoSel.filter(x=>x.data.startsWith(prefix)&&x.tipo==='entrata').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    const u = movAnnoSel.filter(x=>x.data.startsWith(prefix)&&x.tipo==='uscita').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    return Math.max(e,u);
  }), 1);

  document.getElementById('chartMensile').innerHTML = Array.from({length:12},(_,i)=>{
    const m = String(i+1).padStart(2,'0');
    const prefix = `${annoMens}-${m}`;
    const e = movAnnoSel.filter(x=>x.data.startsWith(prefix)&&x.tipo==='entrata').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    const u = movAnnoSel.filter(x=>x.data.startsWith(prefix)&&x.tipo==='uscita').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    const we = Math.round((e/maxMens)*100);
    const wu = Math.round((u/maxMens)*100);
    return `<div class="bar-row">
      <span class="bar-label">${mesi[i]}</span>
      <div style="flex:1;display:flex;flex-direction:column;gap:2px">
        <div class="bar-track"><div class="bar-fill-e" style="width:${we}%"></div></div>
        <div class="bar-track"><div class="bar-fill-u" style="width:${wu}%"></div></div>
      </div>
      <span class="bar-vals" style="text-align:right"><span style="color:var(--green)">+€${fmt(e)}</span><br><span style="color:var(--red)">-€${fmt(u)}</span></span>
    </div>`;
  }).join('');

  // Chart annate (TUTTI gli anni con dati, ordinati cronologicamente)
  const anniSet = [...new Set(movimentiContabili.map(m=>m.data&&m.data.slice(0,4)).filter(Boolean))].sort();
  const maxAnn = Math.max(...anniSet.map(a=>{
    const e = movimentiContabili.filter(m=>m.data&&m.data.startsWith(a)&&m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0);
    const u = movimentiContabili.filter(m=>m.data&&m.data.startsWith(a)&&m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);
    return Math.max(e,u);
  }), 1);

  // Riassunto sopra il grafico annate
  if(anniSet.length === 0) {
    document.getElementById('chartAnnateTotali').innerHTML = '<span style="font-style:italic">Nessun movimento registrato</span>';
  } else {
    document.getElementById('chartAnnateTotali').innerHTML = `<strong>${anniSet.length}</strong> ${anniSet.length===1?'anno':'anni'} di storico · Da <strong>${anniSet[0]}</strong> a <strong>${anniSet[anniSet.length-1]}</strong>`;
  }

  document.getElementById('chartAnnate').innerHTML = anniSet.length === 0
    ? '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessun dato disponibile.</div>'
    : anniSet.map(a=>{
      const e = movimentiContabili.filter(m=>m.data&&m.data.startsWith(a)&&m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0);
      const u = movimentiContabili.filter(m=>m.data&&m.data.startsWith(a)&&m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);
      const saldo = e - u;
      const we = Math.round((e/maxAnn)*100);
      const wu = Math.round((u/maxAnn)*100);
      return `<div class="bar-row">
        <span class="bar-label">${a}</span>
        <div style="flex:1;display:flex;flex-direction:column;gap:2px">
          <div class="bar-track"><div class="bar-fill-e" style="width:${we}%"></div></div>
          <div class="bar-track"><div class="bar-fill-u" style="width:${wu}%"></div></div>
        </div>
        <span class="bar-vals" style="text-align:right">
          <span style="color:var(--green)">+€${fmt(e)}</span><br>
          <span style="color:var(--red)">-€${fmt(u)}</span><br>
          <span style="color:${saldo>=0?'var(--green)':'var(--red)'};font-weight:600;font-size:0.78rem">${saldo>=0?'+':''}€${fmt(saldo)}</span>
        </span>
      </div>`;
    }).join('');

  // ===== NUOVI GRAFICI =====
  renderTopAnno(annoCurr, anno);
  renderDiamondChart(movAnnoSel, annoMens);
  renderCumulativo(annoMens);
  renderTorte(annoMens);
  renderTopMovimenti(annoMens);
  renderHeatmap();

  // Sincronizza i selettori anno secondari con quello principale
  syncYearSelectors(annoMens);

  // Ultime 8
  const ultime = [...movimentiContabili].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,8);
  document.getElementById('contUltime').innerHTML = ultime.length === 0
    ? '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessun movimento registrato.</div>'
    : ultime.map(m=>`
      <div class="mov-cont-item ${m.tipo}">
        <span class="mov-date">${formatDate(m.data)}</span>
        <span class="mov-cont-importo ${m.tipo}">${m.tipo==='entrata'?'+':'-'}€ ${fmt(m.importo)}</span>
        <div style="flex:1"><div style="font-weight:600;color:var(--brown)">${m.descrizione||'—'} ${m.origine ? '<span title="Generato automaticamente da '+(m.origine==='ordine'?'un ordine ricevuto':'una vendita')+'" style="font-size:0.7rem;background:rgba(55,138,221,0.12);color:#185FA5;padding:1px 6px;border-radius:8px;font-weight:600;vertical-align:middle">🔗 auto</span>' : ''}</div>
        <div style="font-size:0.82rem;color:var(--text-light)">${(Array.isArray(m.categorie)?m.categorie:[]).map(c=>{
          const all=[...CAT_ENTRATA,...CAT_USCITA]; const found=all.find(x=>x.id===c); return found?found.label:c;
        }).join(', ')}</div></div>
      </div>`).join('');
  } catch(err) {
    console.error('[Contabilita] Errore in renderContRiepilogo:', err.message);
  }
}

// ============================================
// HELPER: sincronizza i selettori secondari
// ============================================
function syncYearSelectors(annoSel) {
  const annoCorr = new Date().getFullYear();
  const anniDataset = [...new Set(movimentiContabili.map(m=>m.data&&m.data.slice(0,4)).filter(Boolean))];
  for(let i=0;i<=3;i++){
    const a = String(annoCorr+i);
    if(!anniDataset.includes(a)) anniDataset.push(a);
  }
  const anni = anniDataset.sort().reverse();
  const optionsHtml = anni.map(a => `<option value="${a}">${a}</option>`).join('');
  ['chartCumAnno', 'chartPieAnno', 'chartTopMovAnno'].forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    const prev = sel.value;
    sel.innerHTML = optionsHtml;
    // Sincronizza al selettore principale al primo caricamento, altrimenti rispetta la scelta utente
    sel.value = prev && anni.includes(prev) ? prev : annoSel;
  });
}

// ============================================
// ⭐ TOP DELL'ANNO
// ============================================
function renderTopAnno(movAnnoCurr, anno) {
  const cont = document.getElementById('contTopAnno');
  if(!cont) return;

  // Top categoria entrata
  const entratePerCat = {};
  const uscitePerCat = {};
  movAnnoCurr.forEach(m => {
    const cats = Array.isArray(m.categorie) ? m.categorie : [];
    const imp = parseFloat(m.importo || 0);
    cats.forEach(c => {
      if(m.tipo === 'entrata') entratePerCat[c] = (entratePerCat[c]||0) + imp;
      else if(m.tipo === 'uscita') uscitePerCat[c] = (uscitePerCat[c]||0) + imp;
    });
  });

  const totEnt = Object.values(entratePerCat).reduce((s,v)=>s+v, 0);
  const totUsc = Object.values(uscitePerCat).reduce((s,v)=>s+v, 0);

  const sortedEnt = Object.entries(entratePerCat).sort((a,b)=>b[1]-a[1]);
  const sortedUsc = Object.entries(uscitePerCat).sort((a,b)=>b[1]-a[1]);

  const all = [...CAT_ENTRATA, ...CAT_USCITA];
  const catLabel = id => (all.find(c=>c.id===id)?.label) || id;

  // Mese top (saldo)
  const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  let bestMonth = null;
  let bestSaldo = -Infinity;
  for(let i=0;i<12;i++){
    const m = String(i+1).padStart(2,'0');
    const prefix = `${anno}-${m}`;
    const movMese = movAnnoCurr.filter(x=>x.data.startsWith(prefix));
    if(movMese.length === 0) continue;
    const e = movMese.filter(x=>x.tipo==='entrata').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    const u = movMese.filter(x=>x.tipo==='uscita').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    const saldo = e - u;
    if(saldo > bestSaldo) { bestSaldo = saldo; bestMonth = i; }
  }

  let html = '';
  if(sortedEnt.length > 0) {
    const [cat, val] = sortedEnt[0];
    const pct = totEnt > 0 ? Math.round((val/totEnt)*100) : 0;
    html += `<div class="cont-top-box ent">
      <div class="cont-top-label">💰 Entrata principale</div>
      <div class="cont-top-name">${catLabel(cat)}</div>
      <div class="cont-top-val" style="color:var(--green)">€ ${fmt(val)} · ${pct}% delle entrate</div>
    </div>`;
  } else {
    html += `<div class="cont-top-box ent">
      <div class="cont-top-label">💰 Entrata principale</div>
      <div class="cont-top-name" style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessuna entrata ${anno}</div>
    </div>`;
  }

  if(sortedUsc.length > 0) {
    const [cat, val] = sortedUsc[0];
    const pct = totUsc > 0 ? Math.round((val/totUsc)*100) : 0;
    html += `<div class="cont-top-box usc">
      <div class="cont-top-label">💸 Uscita principale</div>
      <div class="cont-top-name">${catLabel(cat)}</div>
      <div class="cont-top-val" style="color:var(--red)">€ ${fmt(val)} · ${pct}% delle uscite</div>
    </div>`;
  } else {
    html += `<div class="cont-top-box usc">
      <div class="cont-top-label">💸 Uscita principale</div>
      <div class="cont-top-name" style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessuna uscita ${anno}</div>
    </div>`;
  }

  if(bestMonth !== null) {
    html += `<div class="cont-top-box mese">
      <div class="cont-top-label">📈 Mese migliore</div>
      <div class="cont-top-name">${mesi[bestMonth]} ${anno}</div>
      <div class="cont-top-val" style="color:${bestSaldo>=0?'var(--green)':'var(--red)'}">${bestSaldo>=0?'+':''}€ ${fmt(bestSaldo)} di saldo</div>
    </div>`;
  } else {
    html += `<div class="cont-top-box mese">
      <div class="cont-top-label">📈 Mese migliore</div>
      <div class="cont-top-name" style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessun movimento ${anno}</div>
    </div>`;
  }

  cont.innerHTML = html;
}

// ============================================
// 📅 GRAFICO A DIAMANTE
// ============================================
function renderDiamondChart(movAnno, anno) {
  const cont = document.getElementById('chartMensile');
  const labelsCont = document.getElementById('chartMensileLabels');
  if(!cont || !labelsCont) return;
  const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

  // Calcola valori per ogni mese
  const data = Array.from({length:12},(_,i)=>{
    const m = String(i+1).padStart(2,'0');
    const prefix = `${anno}-${m}`;
    const e = movAnno.filter(x=>x.data.startsWith(prefix)&&x.tipo==='entrata').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    const u = movAnno.filter(x=>x.data.startsWith(prefix)&&x.tipo==='uscita').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    return { mese: mesi[i], e, u };
  });

  const maxVal = Math.max(...data.map(d => Math.max(d.e, d.u)), 1);
  const halfH = 90; // px disponibili sopra/sotto la linea zero

  cont.innerHTML = data.map(d => {
    const hE = d.e > 0 ? Math.max(3, Math.round((d.e / maxVal) * halfH)) : 0;
    const hU = d.u > 0 ? Math.max(3, Math.round((d.u / maxVal) * halfH)) : 0;
    return `
      <div class="cont-diamond-col">
        ${d.e > 0 ? `<div class="cont-diamond-val">€${fmt(d.e)}</div>` : '<div style="height:12px"></div>'}
        <div class="cont-diamond-bar-e" style="height:${hE}px" title="${d.mese} ${anno}: +€${fmt(d.e)}"></div>
        <div class="cont-diamond-bar-u" style="height:${hU}px" title="${d.mese} ${anno}: -€${fmt(d.u)}"></div>
        ${d.u > 0 ? `<div class="cont-diamond-val usc">-€${fmt(d.u)}</div>` : '<div style="height:12px"></div>'}
      </div>
    `;
  }).join('');

  labelsCont.innerHTML = mesi.map(m => `<div>${m}</div>`).join('');
}

// ============================================
// 📈 SALDO CUMULATIVO
// ============================================
function renderCumulativo(anno) {
  const sel = document.getElementById('chartCumAnno');
  const cont = document.getElementById('chartCumulativo');
  if(!cont) return;

  // L'anno del grafico cumulativo può essere diverso da quello mensile se l'utente lo ha cambiato
  const annoCum = sel?.value || anno;

  const movAnno = movimentiContabili.filter(m=>m.data&&m.data.startsWith(annoCum));

  // Saldo cumulativo per ogni mese
  const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  let cumulativo = 0;
  const series = mesi.map((mese, i) => {
    const m = String(i+1).padStart(2,'0');
    const prefix = `${annoCum}-${m}`;
    const e = movAnno.filter(x=>x.data.startsWith(prefix)&&x.tipo==='entrata').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    const u = movAnno.filter(x=>x.data.startsWith(prefix)&&x.tipo==='uscita').reduce((s,x)=>s+parseFloat(x.importo||0),0);
    cumulativo += (e - u);
    return { mese, saldo: cumulativo, hasData: (e>0 || u>0) };
  });

  // Trova ultimo mese con dati (per non disegnare linea su mesi futuri vuoti)
  let lastIdx = -1;
  for(let i=11;i>=0;i--){
    if(series[i].hasData) { lastIdx = i; break; }
  }
  // Se non ci sono dati nell'anno
  if(lastIdx < 0) {
    cont.innerHTML = '<div style="text-align:center;padding:3rem 1rem;color:var(--text-light);font-style:italic">Nessun movimento per ' + annoCum + '</div>';
    return;
  }

  // Tronca la serie all'ultimo mese con dati (mostra anche mesi vuoti tra il primo e l'ultimo)
  const seriesActive = series.slice(0, lastIdx + 1);

  // Calcola scala Y
  const vals = seriesActive.map(s => s.saldo);
  const maxAbs = Math.max(Math.abs(Math.max(...vals, 0)), Math.abs(Math.min(...vals, 0)), 100);
  const yMax = Math.ceil(maxAbs / 100) * 100;
  const yMin = -yMax;

  // SVG dimensioni
  const W = 640, H = 240;
  const padL = 50, padR = 20, padT = 20, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Scala
  const xStep = innerW / (mesi.length - 1);
  const yScale = (v) => padT + innerH * (1 - (v - yMin) / (yMax - yMin));
  const zeroY = yScale(0);

  // Punti della linea (solo mesi con dati)
  const points = seriesActive.map((s, i) => ({ x: padL + i * xStep, y: yScale(s.saldo), saldo: s.saldo, mese: s.mese }));

  // Path linea
  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  // Area sotto la linea (per riempimento gradiente)
  let areaPath = '';
  if(points.length > 0) {
    areaPath = `M ${points[0].x},${zeroY} ` +
      points.map(p => `L ${p.x},${p.y}`).join(' ') +
      ` L ${points[points.length-1].x},${zeroY} Z`;
  }

  // Trova picco e valle
  let peakIdx = 0, valleyIdx = 0;
  points.forEach((p,i) => {
    if(p.saldo > points[peakIdx].saldo) peakIdx = i;
    if(p.saldo < points[valleyIdx].saldo) valleyIdx = i;
  });

  // Gridlines orizzontali
  const gridYs = [];
  const step = yMax / 2;
  for(let v = -yMax; v <= yMax; v += step) {
    if(v === 0) continue;
    gridYs.push({ v, y: yScale(v) });
  }

  // Costruzione SVG
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;

  // Definisco un clipPath per separare area positiva da negativa
  svg += `<defs>
    <clipPath id="clip-pos-${annoCum}"><rect x="0" y="0" width="${W}" height="${zeroY}"/></clipPath>
    <clipPath id="clip-neg-${annoCum}"><rect x="0" y="${zeroY}" width="${W}" height="${H - zeroY}"/></clipPath>
  </defs>`;

  // Grid lines
  gridYs.forEach(g => {
    svg += `<line class="cum-grid" x1="${padL}" y1="${g.y}" x2="${W-padR}" y2="${g.y}"/>`;
    svg += `<text class="cum-label" x="${padL-5}" y="${g.y+3}" text-anchor="end">${g.v>0?'+':''}€${fmt(g.v)}</text>`;
  });

  // Label zero
  svg += `<text class="cum-label" x="${padL-5}" y="${zeroY+3}" text-anchor="end" style="font-weight:600;fill:var(--brown)">€0</text>`;

  // Area positiva (sopra zero)
  if(areaPath) {
    svg += `<path class="cum-area-pos" d="${areaPath}" clip-path="url(#clip-pos-${annoCum})"/>`;
    svg += `<path class="cum-area-neg" d="${areaPath}" clip-path="url(#clip-neg-${annoCum})"/>`;
  }

  // Linea zero
  svg += `<line class="cum-zero" x1="${padL}" y1="${zeroY}" x2="${W-padR}" y2="${zeroY}"/>`;

  // Linea principale
  svg += `<path class="cum-line" d="${linePath}"/>`;

  // Punti
  points.forEach((p, i) => {
    const isPeak = i === peakIdx && p.saldo > 0;
    const isValley = i === valleyIdx && p.saldo < 0;
    const isLast = i === points.length - 1;
    const r = (isPeak || isValley || isLast) ? 5 : 3.5;
    const fill = isPeak ? 'var(--green)' : isValley ? 'var(--red)' : 'var(--brown)';
    svg += `<circle class="cum-dot" cx="${p.x}" cy="${p.y}" r="${r}" style="fill:${fill}" title="${p.mese}: ${p.saldo>=0?'+':''}€${fmt(p.saldo)}"/>`;
  });

  // Etichetta picco
  if(peakIdx >= 0 && points[peakIdx].saldo > 0) {
    const p = points[peakIdx];
    svg += `<text class="cum-label" x="${p.x}" y="${p.y - 10}" text-anchor="middle" style="font-weight:700;fill:var(--green)">+€${fmt(p.saldo)}</text>`;
  }

  // Etichette mesi (asse X) — mostro TUTTI i mesi anche se non hanno dati
  mesi.forEach((mese, i) => {
    const x = padL + i * xStep;
    const isActive = i <= lastIdx;
    svg += `<text class="cum-label" x="${x}" y="${H - 15}" text-anchor="middle" style="${isActive?'':'opacity:0.4;font-style:italic'}">${mese}</text>`;
  });

  svg += `</svg>`;
  cont.innerHTML = svg;
}

// ============================================
// 🥧 TORTE CATEGORIE
// ============================================
function renderTorte(anno) {
  const sel = document.getElementById('chartPieAnno');
  const cont = document.getElementById('chartTorte');
  if(!cont) return;
  const annoP = sel?.value || anno;

  const movAnno = movimentiContabili.filter(m=>m.data&&m.data.startsWith(annoP));

  const entratePerCat = {};
  const uscitePerCat = {};
  movAnno.forEach(m => {
    const cats = Array.isArray(m.categorie) ? m.categorie : [];
    const imp = parseFloat(m.importo || 0);
    cats.forEach(c => {
      if(m.tipo === 'entrata') entratePerCat[c] = (entratePerCat[c]||0) + imp;
      else if(m.tipo === 'uscita') uscitePerCat[c] = (uscitePerCat[c]||0) + imp;
    });
  });

  const all = [...CAT_ENTRATA, ...CAT_USCITA];
  const catLabel = id => (all.find(c=>c.id===id)?.label) || id;

  // Palette di colori
  const palEnt = ['#5D8C44','#A8C977','#3D6029','#C8860A','#F4E4BC','#8B6F4E','#7BA85A'];
  const palUsc = ['#C04B3B','#E89488','#8B4513','#5C3A10','#2A1A0F','#A0522D','#CD853F'];

  cont.innerHTML = `
    <div class="cont-pie-wrap">
      <div class="cont-pie-title">💰 Entrate</div>
      ${buildPieSvg(entratePerCat, palEnt, catLabel)}
    </div>
    <div class="cont-pie-wrap">
      <div class="cont-pie-title">💸 Uscite</div>
      ${buildPieSvg(uscitePerCat, palUsc, catLabel)}
    </div>
  `;
}

function buildPieSvg(data, palette, catLabel) {
  const entries = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  if(entries.length === 0) {
    return '<div class="cont-pie-empty">Nessun dato</div>';
  }
  const tot = entries.reduce((s,e)=>s+e[1], 0);
  if(tot === 0) return '<div class="cont-pie-empty">Nessun dato</div>';

  const cx = 50, cy = 50, r = 45;
  let curAngle = -Math.PI / 2; // Start in alto
  let paths = '';
  let legend = '';

  entries.forEach(([cat, val], i) => {
    const pct = val / tot;
    const angleSpan = pct * 2 * Math.PI;
    const endAngle = curAngle + angleSpan;
    const x1 = cx + r * Math.cos(curAngle);
    const y1 = cy + r * Math.sin(curAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angleSpan > Math.PI ? 1 : 0;
    const color = palette[i % palette.length];

    // Per slice = 100% (un'unica categoria), disegna un cerchio pieno
    if(entries.length === 1) {
      paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
    } else {
      paths += `<path d="M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}"><title>${catLabel(cat)}: €${fmt(val)} (${Math.round(pct*100)}%)</title></path>`;
    }

    legend += `<div class="cont-pie-legend-row">
      <div class="cont-pie-color" style="background:${color}"></div>
      <span class="cont-pie-cat">${catLabel(cat)}</span>
      <span class="cont-pie-val">€${fmt(val)} · ${Math.round(pct*100)}%</span>
    </div>`;

    curAngle = endAngle;
  });

  return `
    <svg class="cont-pie-svg" viewBox="0 0 100 100">${paths}</svg>
    <div class="cont-pie-legend">${legend}</div>
  `;
}

// ============================================
// 🏆 TOP MOVIMENTI
// ============================================
function renderTopMovimenti(anno) {
  const sel = document.getElementById('chartTopMovAnno');
  const cont = document.getElementById('chartTopMov');
  if(!cont) return;
  const annoTop = sel?.value || anno;

  const movAnno = movimentiContabili.filter(m=>m.data&&m.data.startsWith(annoTop));
  const all = [...CAT_ENTRATA, ...CAT_USCITA];
  const catLabel = id => (all.find(c=>c.id===id)?.label) || id;

  const entrate = movAnno.filter(m=>m.tipo==='entrata').sort((a,b)=>parseFloat(b.importo||0)-parseFloat(a.importo||0)).slice(0,5);
  const uscite = movAnno.filter(m=>m.tipo==='uscita').sort((a,b)=>parseFloat(b.importo||0)-parseFloat(a.importo||0)).slice(0,5);

  const maxE = entrate.length > 0 ? parseFloat(entrate[0].importo||0) : 1;
  const maxU = uscite.length > 0 ? parseFloat(uscite[0].importo||0) : 1;

  const renderItem = (m, idx, max, tipo) => {
    const imp = parseFloat(m.importo||0);
    const w = Math.round((imp / max) * 100);
    const cats = Array.isArray(m.categorie) ? m.categorie : [];
    const catStr = cats.map(catLabel).join(', ');
    return `
      <div class="cont-topmov-item ${tipo}">
        <div class="topmov-bar-bg" style="width:${w}%"></div>
        <div class="cont-topmov-rank">${idx+1}</div>
        <div class="cont-topmov-desc">
          <div class="cont-topmov-desc-main">${m.descrizione || '—'}</div>
          <div class="cont-topmov-cat">${formatDate(m.data)} · ${catStr || '—'}</div>
        </div>
        <div class="cont-topmov-val ${tipo}">${tipo==='ent'?'+':'-'}€ ${fmt(imp)}</div>
      </div>
    `;
  };

  cont.innerHTML = `
    <div class="cont-topmov-col">
      <h4 class="ent">💰 Top entrate</h4>
      <div class="cont-topmov-list">
        ${entrate.length === 0
          ? '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem;padding:0.8rem 0">Nessuna entrata per '+annoTop+'</div>'
          : entrate.map((m,i)=>renderItem(m, i, maxE, 'ent')).join('')}
      </div>
    </div>
    <div class="cont-topmov-col">
      <h4 class="usc">💸 Top uscite</h4>
      <div class="cont-topmov-list">
        ${uscite.length === 0
          ? '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem;padding:0.8rem 0">Nessuna uscita per '+annoTop+'</div>'
          : uscite.map((m,i)=>renderItem(m, i, maxU, 'usc')).join('')}
      </div>
    </div>
  `;
}

// ============================================
// 🔥 HEATMAP PLURIENNALE
// ============================================
function renderHeatmap() {
  const cont = document.getElementById('chartHeatmap');
  if(!cont) return;
  const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

  // Anni con dati (e anno corrente)
  const annoCorr = new Date().getFullYear();
  const anniSet = new Set(movimentiContabili.map(m=>m.data&&m.data.slice(0,4)).filter(Boolean));
  anniSet.add(String(annoCorr));
  const anni = [...anniSet].sort();

  if(anni.length === 0 || (anni.length === 1 && movimentiContabili.length === 0)) {
    cont.innerHTML = '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessun dato disponibile.</div>';
    return;
  }

  // Calcola entrate per ogni anno × mese
  const grid = {};
  let maxVal = 1;
  anni.forEach(anno => {
    grid[anno] = {};
    for(let i=0;i<12;i++){
      const m = String(i+1).padStart(2,'0');
      const prefix = `${anno}-${m}`;
      const e = movimentiContabili.filter(x=>x.data&&x.data.startsWith(prefix)&&x.tipo==='entrata').reduce((s,x)=>s+parseFloat(x.importo||0),0);
      grid[anno][i] = e;
      if(e > maxVal) maxVal = e;
    }
  });

  // Funzione per colore in scala (0 = chiaro, maxVal = scuro)
  const palette = ['#FAEED1','#E8DDB8','#D4C58B','#A8C977','#5D8C44','#3D6029'];
  const colorFor = (val) => {
    if(val <= 0) return palette[0];
    const ratio = Math.min(1, val / maxVal);
    const idx = Math.min(palette.length - 1, Math.ceil(ratio * (palette.length - 1)));
    return palette[idx];
  };

  // Determina mese corrente per evidenziare e marcare mesi futuri
  const oggi = new Date();
  const annoCorrentestr = String(oggi.getFullYear());
  const meseCorrente = oggi.getMonth();

  let html = '<table class="cont-heatmap-table"><thead><tr><th></th>';
  mesi.forEach(m => html += `<th>${m}</th>`);
  html += '<th style="padding-left:12px;color:var(--brown);font-weight:600">Totale</th></tr></thead><tbody>';

  anni.forEach(anno => {
    let tot = 0;
    let row = `<tr><td class="year-cell">${anno}</td>`;
    for(let i=0;i<12;i++){
      const val = grid[anno][i] || 0;
      tot += val;
      const isFutureMonth = (anno === annoCorrentestr && i > meseCorrente);
      const isCurrent = (anno === annoCorrentestr && i === meseCorrente);
      const bg = isFutureMonth ? '#FAEED1' : colorFor(val);
      const textCol = (val > 0 && colorFor(val) === '#3D6029') ? 'white' : (val > 0 && colorFor(val) === '#5D8C44') ? 'white' : 'var(--text)';
      const cellStyle = `background:${bg};color:${textCol}${isCurrent?';outline:2px solid var(--amber);outline-offset:1px;font-weight:700':''}${isFutureMonth?';color:var(--text-light);font-style:italic':''}`;
      const cellText = isFutureMonth ? '·' : (val > 0 ? (val >= 1000 ? Math.round(val/100)/10+'k' : Math.round(val)) : '—');
      const title = isFutureMonth ? `${mesi[i]} ${anno}: futuro` : `${mesi[i]} ${anno}: €${fmt(val)}`;
      row += `<td class="cont-heatmap-cell" style="${cellStyle}" title="${title}">${cellText}</td>`;
    }
    const isParziale = (anno === annoCorrentestr && meseCorrente < 11);
    row += `<td style="padding-left:12px;font-weight:700;color:var(--brown);text-align:right;white-space:nowrap">€ ${fmt(tot)}${isParziale?' <span style="font-size:0.7rem;color:var(--text-light);font-weight:400">(parz.)</span>':''}</td></tr>`;
    html += row;
  });

  html += '</tbody></table>';
  html += `<div class="cont-heatmap-legend">
    <span>Meno</span>
    <div class="cont-heatmap-legend-cells">
      ${palette.map(c => `<div style="background:${c}"></div>`).join('')}
    </div>
    <span>Più</span>
  </div>`;

  cont.innerHTML = html;
}

// ======= MOVIMENTI =======
function populateContAnnoFilter() {
  const annoCorr = new Date().getFullYear();
  const anni = [...new Set(movimentiContabili.map(m=>m.data&&m.data.slice(0,4)).filter(Boolean))];
  // Aggiungi anno corrente + 3 anni futuri (per pianificazione)
  for(let i=0;i<=3;i++){
    const a = String(annoCorr+i);
    if(!anni.includes(a)) anni.push(a);
  }
  const anniSorted = anni.sort().reverse();
  const sel = document.getElementById('contFiltroAnno');
  if(!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Tutti gli anni</option>' + anniSorted.map(a=>`<option value="${a}">${a}</option>`).join('');
  if(cur) sel.value = cur;
}

function renderContMovimenti() {
  const filtroAnno = document.getElementById('contFiltroAnno')?.value||'';
  const filtroSearch = (document.getElementById('contFiltroSearch')?.value||'').toLowerCase();
  const all=[...CAT_ENTRATA,...CAT_USCITA];

  // Dropdown filtri multiscelta
  if(typeof initFiltroDropdown === 'function' && document.getElementById('contFiltriDropdown')) {
    initFiltroDropdown('contabilita', 'contFiltriDropdown', renderContMovimenti);
  }

  let filtered = [...movimentiContabili]
    .sort((a,b)=>b.data.localeCompare(a.data))
    .filter(m=>{
      if(filtroAnno && !m.data.startsWith(filtroAnno)) return false;
      if(filtroSearch && !(m.descrizione||'').toLowerCase().includes(filtroSearch) && !(m.note||'').toLowerCase().includes(filtroSearch)) return false;
      return true;
    });
  if(typeof applicaFiltri === 'function') filtered = applicaFiltri('contabilita', filtered);

  const el = document.getElementById('contMovList');
  if(!el) return;
  if(filtered.length===0){ el.innerHTML='<div class="empty-state"><span class="big">💰</span>Nessun movimento trovato.</div>'; return; }

  el.innerHTML = filtered.map(m=>{
    const cats = (Array.isArray(m.categorie)?m.categorie:[]).map(c=>{const f=all.find(x=>x.id===c);return f?f.label:c;}).join(', ');
    const autoBadge = m.origine ? ` <span title="Generato automaticamente da ${m.origine==='ordine'?'un ordine ricevuto':'una vendita'} — puoi comunque modificarlo" style="font-size:0.7rem;background:rgba(55,138,221,0.12);color:#185FA5;padding:1px 6px;border-radius:8px;font-weight:600;vertical-align:middle">🔗 auto</span>` : '';
    return `<div class="mov-cont-item ${m.tipo}">
      <span class="mov-date">${formatDate(m.data)}</span>
      <span class="mov-cont-importo ${m.tipo}">${m.tipo==='entrata'?'+':'-'}€ ${fmt(m.importo)}</span>
      <div style="flex:1">
        <div style="font-weight:600;color:var(--brown)">${m.descrizione||'—'}${autoBadge}</div>
        <div style="font-size:0.82rem;color:var(--text-light)">${cats}${m.note?' · '+m.note:''}</div>
      </div>
      <button class="btn-icon" onclick="openContMovModal('${m.id}')" title="Modifica">✏️</button>
      <button class="btn-icon del" onclick="deleteContMov('${m.id}')" title="Elimina">🗑</button>
    </div>`;
  }).join('');
}

function deleteContMov(id) {
  if(!confirm('Eliminare questo movimento?')) return;
  movimentiContabili = movimentiContabili.filter(m=>m.id!==id);
  saveContabilita();
  renderContMovimenti();
  renderContRiepilogo();
}


// ======= MODAL MOVIMENTO CONTABILE =======
function renderCatChips() {
  const tipo = document.getElementById('contMovTipo')?.value||'entrata';
  const cats = getCatList(tipo);
  document.getElementById('contCatChips').innerHTML = cats.map(c=>`
    <label class="cat-chip"><input type="checkbox" value="${c.id}"> ${c.label}</label>
  `).join('');
}

function openContMovModal(id) {
  const editIdEl = document.getElementById('editContMovId');
  if(id) {
    const m = movimentiContabili.find(x => x.id === id);
    if(!m) { console.warn('[Contabilita] Movimento non trovato:', id); return; }
    document.getElementById('contMovModalTitle').textContent = m.origine ? '✏️ Modifica movimento 🔗' : '✏️ Modifica movimento';
    editIdEl.value = id;
    document.getElementById('contMovData').value = m.data;
    document.getElementById('contMovTipo').value = m.tipo;
    document.getElementById('contMovDesc').value = m.descrizione || '';
    document.getElementById('contMovImporto').value = m.importo;
    document.getElementById('contMovNote').value = m.note || '';
    renderCatChips();
    // Pre-seleziona le categorie
    setTimeout(() => {
      (Array.isArray(m.categorie)?m.categorie:[]).forEach(c => {
        const chk = document.querySelector(`#contCatChips input[value="${c}"]`);
        if(chk) chk.checked = true;
      });
    }, 30);
  } else {
    document.getElementById('contMovModalTitle').textContent = '💰 Nuovo movimento';
    editIdEl.value = '';
    document.getElementById('contMovData').value = new Date().toISOString().slice(0,10);
    document.getElementById('contMovTipo').value = 'entrata';
    document.getElementById('contMovDesc').value = '';
    document.getElementById('contMovImporto').value = '';
    document.getElementById('contMovNote').value = '';
    renderCatChips();
  }
  document.getElementById('contMovModal').classList.add('open');
}

function closeContMovModal() { document.getElementById('contMovModal').classList.remove('open'); }

function saveContMov() {
  const data = document.getElementById('contMovData').value;
  const importo = document.getElementById('contMovImporto').value;
  const descrizione = document.getElementById('contMovDesc').value.trim();
  if(!data||!importo||!descrizione){ alert('Compila data, importo e descrizione'); return; }
  const categorie = Array.from(document.querySelectorAll('#contCatChips input:checked')).map(x=>x.value);
  const editId = document.getElementById('editContMovId').value;

  if(editId) {
    // Modifica: preserva id, origine e origineId
    const esistente = movimentiContabili.find(x => x.id === editId);
    movimentiContabili = movimentiContabili.map(x => x.id === editId ? {
      ...x,
      data,
      tipo: document.getElementById('contMovTipo').value,
      descrizione,
      importo: parseFloat(importo),
      categorie,
      note: document.getElementById('contMovNote').value.trim(),
    } : x);
  } else {
    const mov = {
      id: Date.now().toString(), data,
      tipo: document.getElementById('contMovTipo').value,
      descrizione, importo: parseFloat(importo), categorie,
      note: document.getElementById('contMovNote').value.trim()
    };
    movimentiContabili.unshift(mov);
  }
  saveContabilita();
  closeContMovModal();
  populateContAnnoFilter();
  renderContMovimenti();
  renderContRiepilogo();
  showImportToast(editId ? '✅ Movimento aggiornato!' : '✅ Movimento salvato!');
}

