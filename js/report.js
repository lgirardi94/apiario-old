// ===== FILE VERSION: 2026-05-28.3 · report.js =====
/* ===========================================================
   REPORT PDF — Generazione documenti stampabili
   =========================================================== */

// Helper: ottiene tutte le visite di un'arnia in un anno
function visitePerArniaAnno(arniaId, anno) {
  return logBook.filter(e => e.arniaId === arniaId && e.data && e.data.startsWith(String(anno)));
}

// Helper: produzione miele per arnia in un anno
function mielePerArniaAnno(arniaId, anno) {
  return visitePerArniaAnno(arniaId, anno)
    .reduce((s, e) => s + (e.raccolta || []).reduce((ss, r) => ss + (parseFloat(r.qta) || 0), 0), 0);
}

// Helper: trattamenti per arnia in un anno
function trattamentiPerArniaAnno(arniaId, anno) {
  return visitePerArniaAnno(arniaId, anno).filter(e => {
    const tipi = getTipi(e);
    return tipi.includes('trattamento') && e.trattamento;
  });
}

// Helper: tutti i trattamenti dell'anno
function tuttiTrattamentiAnno(anno) {
  return logBook.filter(e => {
    if(!e.data || !e.data.startsWith(String(anno))) return false;
    const tipi = getTipi(e);
    return tipi.includes('trattamento') && e.trattamento;
  });
}

// ============================================
// REPORT COMPLETO
// ============================================
function generaReportCompleto() {
  try {
    const anno = prompt('Per quale anno generare il report?', new Date().getFullYear());
    if(!anno) return;
    const annoNum = parseInt(anno, 10);
    if(isNaN(annoNum)) { alert('Anno non valido'); return; }

    const oggi = new Date();
    const dataGenStr = oggi.toLocaleDateString('it-IT');

    // ===== CALCOLO ORDINI (necessità) per il report =====
    // Ricevuti: filtrati per anno (dataOrdine o dataCreazione nell'anno). Da ricevere/da ordinare: stato attuale.
    const _nomeOrdine = (n) => {
      const art = (typeof articoli !== 'undefined' && n.articoloId) ? articoli.find(a => a.id === n.articoloId) : null;
      return art ? art.nome : (n.descrizione || 'Articolo');
    };
    const _annoDi = (s) => (s && typeof s === 'string') ? s.slice(0,4) : '';
    const ordiniTutti = (typeof necessita !== 'undefined') ? (necessita || []) : [];
    const ordiniRicevuti = ordiniTutti.filter(n => n.stato === 'ricevuto' &&
      (_annoDi(n.dataOrdine) === String(annoNum) || _annoDi(n.dataCreazione) === String(annoNum)));
    const ordiniDaRicevere = ordiniTutti.filter(n => n.stato === 'ordinato');
    const ordiniDaOrdinare = ordiniTutti.filter(n => n.stato === 'da_ordinare');

    // Calcoli generali
    const arnieAttive = arnie.filter(a => !a.annoDismissione || a.annoDismissione > annoNum);
    const famiglie    = arnieAttive.filter(a => a.tipo === 'famiglia' || !a.tipo);
    const nuclei      = arnieAttive.filter(a => a.tipo === 'nucleo');
    const nucleiFec   = arnieAttive.filter(a => a.tipo === 'nucleo_fec');
    const sciami      = arnieAttive.filter(a => a.tipo === 'sciame');

  // Miele totale
  let mieleTotale = 0;
  const produzionePerArnia = arnieAttive.map(a => {
    const kg = mielePerArniaAnno(a.id, annoNum);
    mieleTotale += kg;
    return { a, kg };
  }).sort((x, y) => y.kg - x.kg);

  // Miele per varietà
  const mielePerVarieta = {};
  arnieAttive.forEach(a => {
    visitePerArniaAnno(a.id, annoNum).forEach(e => {
      (e.raccolta || []).forEach(r => {
        // r contiene articoloId — recupera nome articolo dal magazzino
        const art = (typeof articoli !== 'undefined') ? articoli.find(x => x.id === r.articoloId) : null;
        const tipo = art ? art.nome : (r.articoloId || 'Non specificato');
        const kg = parseFloat(r.qta) || 0;
        mielePerVarieta[tipo] = (mielePerVarieta[tipo] || 0) + kg;
      });
    });
  });
  const varietaSorted = Object.entries(mielePerVarieta).sort((a,b) => b[1] - a[1]);
  const maxVarieta = varietaSorted.length > 0 ? varietaSorted[0][1] : 1;

  // Contabilità
  const mc = movimentiContabili || [];
  const annoStr = String(annoNum);
  const entrate = mc.filter(m => m.data && m.data.startsWith(annoStr) && m.tipo === 'entrata').reduce((s,m)=>s+parseFloat(m.importo||0), 0);
  const uscite = mc.filter(m => m.data && m.data.startsWith(annoStr) && m.tipo === 'uscita').reduce((s,m)=>s+parseFloat(m.importo||0), 0);
  const saldo = entrate - uscite;

  // Trattamenti
  const trattamenti = tuttiTrattamentiAnno(annoNum);

  // Obiettivi
  const obiettAnno = (typeof obiettivi !== 'undefined' ? obiettivi : []).filter(o => o.anno === annoNum);
  const obCompletati = obiettAnno.filter(o => o.stato === 'completato').length;
  const obTotali = obiettAnno.length;

  // ===== NUOVI CALCOLI PER SEZIONI AGGIUNTIVE =====

  // Contabilità per categoria
  const annoMovimenti = mc.filter(m => m.data && m.data.startsWith(annoStr));
  const allCats = (typeof CAT_ENTRATA !== 'undefined') ? [...CAT_ENTRATA, ...CAT_USCITA] : [];
  const getCatLabel = (id) => (allCats.find(c => c.id === id)?.label) || id || '—';

  const entratePerCat = {};
  const uscitePerCat = {};
  annoMovimenti.forEach(m => {
    const cats = Array.isArray(m.categorie) ? m.categorie : [];
    const imp = parseFloat(m.importo || 0);
    cats.forEach(c => {
      if(m.tipo === 'entrata') entratePerCat[c] = (entratePerCat[c]||0) + imp;
      else if(m.tipo === 'uscita') uscitePerCat[c] = (uscitePerCat[c]||0) + imp;
    });
  });
  const entratePerCatSorted = Object.entries(entratePerCat).sort((a,b) => b[1]-a[1]);
  const uscitePerCatSorted = Object.entries(uscitePerCat).sort((a,b) => b[1]-a[1]);

  // Andamento mensile contabilità
  const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const mensileData = mesi.map((m, i) => {
    const mm = String(i+1).padStart(2,'0');
    const prefix = `${annoStr}-${mm}`;
    const e = annoMovimenti.filter(x => x.data.startsWith(prefix) && x.tipo === 'entrata').reduce((s,x) => s+parseFloat(x.importo||0), 0);
    const u = annoMovimenti.filter(x => x.data.startsWith(prefix) && x.tipo === 'uscita').reduce((s,x) => s+parseFloat(x.importo||0), 0);
    return { mese: m, e, u, saldo: e-u };
  });

  // Top 5 movimenti
  const top5Entrate = annoMovimenti.filter(m => m.tipo === 'entrata').sort((a,b) => parseFloat(b.importo||0) - parseFloat(a.importo||0)).slice(0, 5);
  const top5Uscite = annoMovimenti.filter(m => m.tipo === 'uscita').sort((a,b) => parseFloat(b.importo||0) - parseFloat(a.importo||0)).slice(0, 5);

  // Calendario attività mensile (visite, miele, trattamenti, eventi)
  const calendarioMensile = mesi.map((m, i) => {
    const mm = String(i+1).padStart(2,'0');
    const prefix = `${annoStr}-${mm}`;
    const visiteM = logBook.filter(e => e.data && e.data.startsWith(prefix));
    const kgM = visiteM.reduce((s,e) => s + (e.raccolta || []).reduce((ss,r) => ss + (parseFloat(r.qta)||0), 0), 0);
    const tratM = visiteM.filter(e => getTipi(e).includes('trattamento')).length;
    return { mese: m, visite: visiteM.length, kg: kgM, trattamenti: tratM };
  });

  // Statistiche genealogia
  // Filtro fallback: se dataCostituzione manca, consideralo dell'anno corrente
  // (es. nuclei creati prima dello Step 2 quando il campo non esisteva)
  const isFromAnno = (a, anno) => {
    if(a.dataCostituzione && a.dataCostituzione.startsWith(String(anno))) return true;
    // Se non c'è dataCostituzione e siamo nell'anno corrente, includilo
    if(!a.dataCostituzione && anno === new Date().getFullYear()) return true;
    return false;
  };
  const sciamiAnno = arnieAttive.filter(a => a.tipo === 'sciame' && isFromAnno(a, annoNum));
  const nucleiCreatiAnno = arnieAttive.filter(a => (a.tipo === 'nucleo' || a.tipo === 'nucleo_fec') && isFromAnno(a, annoNum));
  // Promozioni: cerca nota "Promosso da Nucleo" nelle note (semplice ma efficace)
  const promozioniAnno = arnie.filter(a => (a.note || '').includes('Promosso da Nucleo'));
  // Origine regine (di nuclei e fec creati nell'anno)
  const regineNucleiAnno = nucleiCreatiAnno.reduce((acc, a) => {
    const o = a.reginaOrigine || 'allevata';
    acc[o] = (acc[o] || 0) + 1;
    return acc;
  }, {});

  // Magazzino al 31/12
  const articoliConGiacenza = (typeof articoli !== 'undefined' ? articoli : []).map(art => {
    const giacenza = (typeof getGiacenzaLocale === 'function') ? getGiacenzaLocale(art.id) : 0;
    return { ...art, giacenza };
  });
  const articoliPerCategoria = {};
  articoliConGiacenza.forEach(a => {
    const cat = a.categoria || 'Senza categoria';
    if(!articoliPerCategoria[cat]) articoliPerCategoria[cat] = [];
    articoliPerCategoria[cat].push(a);
  });
  const articoliEsaurimento = articoliConGiacenza.filter(a => a.sogliaMinima && a.giacenza < parseFloat(a.sogliaMinima));

  // Confronto anni precedenti (ultimi 3 anni)
  const anniPrec = [annoNum - 2, annoNum - 1, annoNum];
  const confrontoAnni = anniPrec.map(yr => {
    const arnieY = arnie.filter(a => !a.annoDismissione || a.annoDismissione > yr);
    const visiteY = logBook.filter(e => e.data && e.data.startsWith(String(yr)));
    const kgY = visiteY.reduce((s,e) => s + (e.raccolta || []).reduce((ss,r) => ss + (parseFloat(r.qta)||0), 0), 0);
    const tratY = visiteY.filter(e => getTipi(e).includes('trattamento')).length;
    const movY = mc.filter(m => m.data && m.data.startsWith(String(yr)));
    const entY = movY.filter(m => m.tipo === 'entrata').reduce((s,m) => s+parseFloat(m.importo||0), 0);
    const uscY = movY.filter(m => m.tipo === 'uscita').reduce((s,m) => s+parseFloat(m.importo||0), 0);
    return { anno: yr, arnie: arnieY.length, kg: kgY, trattamenti: tratY, saldo: entY-uscY };
  });
  const haStoricoConfronto = confrontoAnni.filter(c => c.arnie > 0 || c.kg > 0 || c.saldo !== 0).length >= 2;

  // Calcolo punteggio salute per ogni arnia
  const arnieConSalute = arnieAttive.map(a => {
    const salute = (typeof calcolaPunteggioSalute === 'function') ? calcolaPunteggioSalute(a.id) : { score: null, level: 'unknown', label: '—' };
    const visiteY = visitePerArniaAnno(a.id, annoNum).length;
    const kgY = mielePerArniaAnno(a.id, annoNum);
    const tratY = trattamentiPerArniaAnno(a.id, annoNum).length;
    return { a, salute, visite: visiteY, kg: kgY, trattamenti: tratY };
  });

  // Riepilogo finale
  const arnieAttive_n = arnieAttive.length;
  const resaMedia = arnieAttive_n > 0 ? mieleTotale / arnieAttive_n : 0;
  const annoPrec = confrontoAnni[1]; // anno-1
  const annoCorrConf = confrontoAnni[2]; // anno corrente
  let trendKg = '';
  if(haStoricoConfronto && annoPrec.kg > 0) {
    const delta = annoCorrConf.kg - annoPrec.kg;
    const pct = Math.abs(Math.round((delta/annoPrec.kg)*100));
    trendKg = delta >= 0 ? `+${delta.toFixed(1)} kg vs ${annoPrec.anno} (+${pct}%)` : `${delta.toFixed(1)} kg vs ${annoPrec.anno} (-${pct}%)`;
  }

  // Costruisci HTML report
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Report Apiario ${annoNum}</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  body { font-family: Georgia, 'Crimson Pro', serif; color: #2A1A0F; line-height: 1.5; }
  h1.report-title { text-align: center; color: #5C3A10; font-size: 22pt; margin: 0 0 0.3rem; font-family: Georgia, serif; }
  .report-subtitle { text-align: center; color: #8B6F4E; font-style: italic; margin-bottom: 1rem; }
  .report-header { border-top: 2px solid #5C3A10; border-bottom: 2px solid #5C3A10; padding: 0.5rem 0; margin-bottom: 1rem; display: flex; justify-content: space-between; font-size: 9pt; }
  h2 { color: #5C3A10; font-size: 13pt; margin: 1rem 0 0.5rem; padding-bottom: 0.3rem; border-bottom: 1px dotted #ccc; font-family: Georgia, serif; }
  h3 { color: #5C3A10; font-size: 11pt; margin: 0.8rem 0 0.3rem; font-family: Georgia, serif; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.8rem; }
  .kpi { background: #FAEED1; padding: 0.5rem 0.7rem; border-left: 3px solid #C8860A; border-radius: 4px; }
  .kpi-label { font-size: 8pt; color: #8B6F4E; text-transform: uppercase; }
  .kpi-val { font-size: 14pt; color: #5C3A10; font-weight: 700; }
  .kpi-val.pos { color: #5D8C44; }
  .kpi-val.neg { color: #C04B3B; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 0.8rem; }
  th { background: #FAEED1; color: #5C3A10; text-align: left; padding: 0.4rem 0.5rem; border-bottom: 2px solid #E8DDB8; font-weight: 700; }
  td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #E8DDB8; }
  .right { text-align: right; }
  .total-row td { font-weight: 700; background: #FAEED1; color: #5C3A10; }
  .bar-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; font-size: 9pt; }
  .bar-label { min-width: 90px; color: #8B6F4E; font-weight: 600; }
  .bar-track { flex: 1; height: 11px; background: white; border: 1px solid #E8DDB8; border-radius: 2px; overflow: hidden; }
  .bar-fill { height: 100%; background: #C8860A; }
  .bar-fill.green { background: #5D8C44; }
  .bar-fill.red { background: #C04B3B; }
  .bar-val { min-width: 65px; text-align: right; color: #5C3A10; font-weight: 600; }
  .footer { margin-top: 1.5rem; padding-top: 0.5rem; border-top: 1px dotted #E8DDB8; font-size: 8pt; color: #8B6F4E; text-align: center; font-style: italic; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>

<div class="no-print" style="text-align:center;margin-bottom:1rem;padding:0.8rem;background:#FAEED1;border-radius:4px">
  <strong>📄 Anteprima report</strong><br>
  <button onclick="window.print()" style="margin-top:0.5rem;padding:8px 20px;background:#C8860A;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:1rem">🖨️ Stampa / Salva come PDF</button>
  <button onclick="window.close()" style="margin-top:0.5rem;margin-left:0.5rem;padding:8px 20px;background:transparent;color:#5C3A10;border:1px solid #5C3A10;border-radius:4px;cursor:pointer">Chiudi</button>
</div>

<h1 class="report-title">🐝 Report Annuale Apiario</h1>
<p class="report-subtitle">Anno ${annoNum}</p>
<div class="report-header">
  <span>🐝 Apicoltura</span>
  <span>Generato il ${dataGenStr}</span>
</div>

<h2>📊 Panoramica generale</h2>
<div class="kpis">
  <div class="kpi"><div class="kpi-label">Famiglie</div><div class="kpi-val">${famiglie.length}</div></div>
  <div class="kpi"><div class="kpi-label">Nuclei</div><div class="kpi-val">${nuclei.length}</div></div>
  <div class="kpi"><div class="kpi-label">Miele prodotto</div><div class="kpi-val">${mieleTotale.toFixed(1)} kg</div></div>
  <div class="kpi"><div class="kpi-label">Saldo annuo</div><div class="kpi-val ${saldo>=0?'pos':'neg'}">${saldo>=0?'+':''}€ ${fmt(saldo)}</div></div>
</div>
${nucleiFec.length + sciami.length > 0 ? `<p style="font-size:9pt;color:#8B6F4E;margin-top:-0.5rem">Inoltre: ${nucleiFec.length} nucle${nucleiFec.length===1?'o':'i'} di fecondazione, ${sciami.length} sciam${sciami.length===1?'e':'i'} catturat${sciami.length===1?'o':'i'}</p>` : ''}

${varietaSorted.length > 0 ? `
<h2>🍯 Produzione per varietà</h2>
${varietaSorted.map(([tipo, kg]) => `
  <div class="bar-row">
    <span class="bar-label">${tipo}</span>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.round((kg/maxVarieta)*100)}%"></div></div>
    <span class="bar-val">${kg.toFixed(1)} kg</span>
  </div>
`).join('')}
` : ''}

<h2>🏆 Produzione per arnia</h2>
${produzionePerArnia.length === 0 ? '<p style="color:#8B6F4E;font-style:italic">Nessuna produzione registrata.</p>' : `
<table>
  <thead><tr><th>Arnia</th><th>Nome</th><th>Tipo</th><th class="right">Visite</th><th class="right">Miele (kg)</th></tr></thead>
  <tbody>
    ${produzionePerArnia.filter(p => p.kg > 0 || p.a.tipo === 'famiglia').slice(0, 30).map(p => `
      <tr>
        <td><strong>#${p.a.num}</strong></td>
        <td>${p.a.nome || '—'}</td>
        <td>${ARNIA_TIPI[p.a.tipo || 'famiglia'].label}</td>
        <td class="right">${visitePerArniaAnno(p.a.id, annoNum).length}</td>
        <td class="right">${p.kg > 0 ? p.kg.toFixed(1) : '—'}</td>
      </tr>
    `).join('')}
    <tr class="total-row"><td colspan="4"><strong>TOTALE</strong></td><td class="right"><strong>${mieleTotale.toFixed(1)} kg</strong></td></tr>
  </tbody>
</table>
`}

<h2>💰 Bilancio ${annoNum}</h2>
<div class="bar-row">
  <span class="bar-label">Entrate</span>
  <div class="bar-track"><div class="bar-fill green" style="width:${Math.max(entrate,uscite,1)>0?Math.round(entrate/Math.max(entrate,uscite,1)*100):0}%"></div></div>
  <span class="bar-val">€ ${fmt(entrate)}</span>
</div>
<div class="bar-row">
  <span class="bar-label">Uscite</span>
  <div class="bar-track"><div class="bar-fill red" style="width:${Math.max(entrate,uscite,1)>0?Math.round(uscite/Math.max(entrate,uscite,1)*100):0}%"></div></div>
  <span class="bar-val">€ ${fmt(uscite)}</span>
</div>
<div class="bar-row">
  <span class="bar-label"><strong>Saldo</strong></span>
  <div class="bar-track"></div>
  <span class="bar-val" style="color:${saldo>=0?'#5D8C44':'#C04B3B'}">${saldo>=0?'+':''}€ ${fmt(saldo)}</span>
</div>

${trattamenti.length > 0 ? `
<h2>💊 Trattamenti antivarroa eseguiti</h2>
<table>
  <thead><tr><th>Data</th><th>Prodotto</th><th>Arnie</th><th>Note</th></tr></thead>
  <tbody>
    ${trattamenti.map(t => {
      const a = arnie.find(x => x.id === t.arniaId);
      return `<tr>
        <td>${formatDate(t.data)}</td>
        <td>${t.trattamento.prodotto || '—'}</td>
        <td>${a ? '#'+a.num : '—'}</td>
        <td>${(t.note || '').substring(0, 60)}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
` : ''}

${obiettAnno.length > 0 ? `
<h2>🎯 Obiettivi ${annoNum}</h2>
<table>
  <thead><tr><th>Stagione</th><th>Obiettivo</th><th>Stato</th></tr></thead>
  <tbody>
    ${obiettAnno.map(o => {
      const fallbackStag = { label: o.stagione || 'Annuale', icon: '🎯' };
      const fallbackStato = { label: o.stato || '—', icon: '' };
      const stagione = (typeof OB_STAGIONI !== 'undefined' && OB_STAGIONI[o.stagione]) ? OB_STAGIONI[o.stagione] : fallbackStag;
      const stato = (typeof OB_STATO !== 'undefined' && OB_STATO[o.stato]) ? OB_STATO[o.stato] : fallbackStato;
      return `<tr>
        <td>${stagione.icon || ''} ${stagione.label || o.stagione || '—'}</td>
        <td>${o.titolo || '—'}</td>
        <td>${stato.icon || ''} ${stato.label || o.stato || '—'}</td>
      </tr>`;
    }).join('')}
    <tr class="total-row"><td colspan="2"><strong>OBIETTIVI COMPLETATI</strong></td><td><strong>${obCompletati}/${obTotali}</strong></td></tr>
  </tbody>
</table>
` : ''}

<!-- =========================================== -->
<!-- DETTAGLIO PER ARNIA -->
<!-- =========================================== -->
<h2>🏠 Dettaglio per arnia</h2>
${arnieConSalute.length === 0 ? '<p style="color:#8B6F4E;font-style:italic">Nessuna arnia da mostrare.</p>' : `
<table>
  <thead>
    <tr>
      <th>Arnia</th>
      <th>Nome</th>
      <th>Tipo</th>
      <th class="right">Visite</th>
      <th class="right">Miele</th>
      <th class="right">Trattam.</th>
      <th>Salute</th>
      <th>Note</th>
    </tr>
  </thead>
  <tbody>
    ${arnieConSalute.sort((x,y) => y.kg - x.kg).map(({a, salute, visite, kg, trattamenti}) => {
      const tipoInfo = (typeof ARNIA_TIPI !== 'undefined') ? ARNIA_TIPI[a.tipo || 'famiglia'] : {label: a.tipo || 'Famiglia', icon: '🏠'};
      const saluteLabel = salute.score !== null ? `${salute.score}/10 (${salute.label})` : '— dati insuff.';
      const saluteColor = salute.level === 'high' ? '#5D8C44' : salute.level === 'medium' ? '#C8860A' : salute.level === 'low' ? '#E89488' : salute.level === 'critical' ? '#C04B3B' : '#8B6F4E';
      const noteStr = (a.note || '').substring(0, 80);
      return `<tr>
        <td><strong>${tipoInfo.icon} #${a.num}</strong></td>
        <td>${a.nome || '—'}</td>
        <td>${tipoInfo.label}</td>
        <td class="right">${visite}</td>
        <td class="right">${kg > 0 ? kg.toFixed(1)+' kg' : '—'}</td>
        <td class="right">${trattamenti}</td>
        <td style="color:${saluteColor};font-weight:600">${saluteLabel}</td>
        <td style="font-size:8pt;color:#8B6F4E">${noteStr}${(a.note||'').length>80?'...':''}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
`}

<!-- =========================================== -->
<!-- CONTABILITÀ DETTAGLIATA -->
<!-- =========================================== -->
<h2>📊 Contabilità dettagliata ${annoNum}</h2>

${entratePerCatSorted.length > 0 ? `
<h3 style="color:#5D8C44;font-size:11pt;margin:0.8rem 0 0.4rem;font-family:Georgia,serif">💰 Entrate per categoria</h3>
<table>
  <thead><tr><th>Categoria</th><th class="right">Importo</th><th class="right">% del totale</th></tr></thead>
  <tbody>
    ${entratePerCatSorted.map(([cat, val]) => `<tr>
      <td>${getCatLabel(cat)}</td>
      <td class="right">€ ${fmt(val)}</td>
      <td class="right">${entrate > 0 ? Math.round((val/entrate)*100) : 0}%</td>
    </tr>`).join('')}
    <tr class="total-row"><td><strong>TOTALE ENTRATE</strong></td><td class="right"><strong>€ ${fmt(entrate)}</strong></td><td class="right"><strong>100%</strong></td></tr>
  </tbody>
</table>
` : ''}

${uscitePerCatSorted.length > 0 ? `
<h3 style="color:#C04B3B;font-size:11pt;margin:0.8rem 0 0.4rem;font-family:Georgia,serif">💸 Uscite per categoria</h3>
<table>
  <thead><tr><th>Categoria</th><th class="right">Importo</th><th class="right">% del totale</th></tr></thead>
  <tbody>
    ${uscitePerCatSorted.map(([cat, val]) => `<tr>
      <td>${getCatLabel(cat)}</td>
      <td class="right">€ ${fmt(val)}</td>
      <td class="right">${uscite > 0 ? Math.round((val/uscite)*100) : 0}%</td>
    </tr>`).join('')}
    <tr class="total-row"><td><strong>TOTALE USCITE</strong></td><td class="right"><strong>€ ${fmt(uscite)}</strong></td><td class="right"><strong>100%</strong></td></tr>
  </tbody>
</table>
` : ''}

${mensileData.some(m => m.e > 0 || m.u > 0) ? `
<h3 style="color:#5C3A10;font-size:11pt;margin:0.8rem 0 0.4rem;font-family:Georgia,serif">📅 Andamento mensile</h3>
<table>
  <thead><tr><th>Mese</th><th class="right">Entrate</th><th class="right">Uscite</th><th class="right">Saldo</th></tr></thead>
  <tbody>
    ${mensileData.map(m => `<tr>
      <td>${m.mese}</td>
      <td class="right" style="color:#5D8C44">${m.e > 0 ? '€ '+fmt(m.e) : '—'}</td>
      <td class="right" style="color:#C04B3B">${m.u > 0 ? '€ '+fmt(m.u) : '—'}</td>
      <td class="right" style="font-weight:600;color:${m.saldo>=0?'#5D8C44':'#C04B3B'}">${m.saldo !== 0 ? (m.saldo>=0?'+':'')+'€ '+fmt(m.saldo) : '—'}</td>
    </tr>`).join('')}
    <tr class="total-row"><td><strong>TOTALE</strong></td><td class="right"><strong>€ ${fmt(entrate)}</strong></td><td class="right"><strong>€ ${fmt(uscite)}</strong></td><td class="right" style="color:${saldo>=0?'#5D8C44':'#C04B3B'}"><strong>${saldo>=0?'+':''}€ ${fmt(saldo)}</strong></td></tr>
  </tbody>
</table>
` : ''}

${top5Entrate.length > 0 ? `
<h3 style="color:#5D8C44;font-size:11pt;margin:0.8rem 0 0.4rem;font-family:Georgia,serif">🏆 Top 5 entrate</h3>
<table>
  <thead><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th class="right">Importo</th></tr></thead>
  <tbody>
    ${top5Entrate.map(m => `<tr>
      <td>${formatDate(m.data)}</td>
      <td>${m.descrizione || '—'}</td>
      <td style="font-size:8pt">${(Array.isArray(m.categorie)?m.categorie:[]).map(getCatLabel).join(', ')}</td>
      <td class="right" style="color:#5D8C44;font-weight:600">+€ ${fmt(m.importo)}</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

${top5Uscite.length > 0 ? `
<h3 style="color:#C04B3B;font-size:11pt;margin:0.8rem 0 0.4rem;font-family:Georgia,serif">🔻 Top 5 uscite</h3>
<table>
  <thead><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th class="right">Importo</th></tr></thead>
  <tbody>
    ${top5Uscite.map(m => `<tr>
      <td>${formatDate(m.data)}</td>
      <td>${m.descrizione || '—'}</td>
      <td style="font-size:8pt">${(Array.isArray(m.categorie)?m.categorie:[]).map(getCatLabel).join(', ')}</td>
      <td class="right" style="color:#C04B3B;font-weight:600">-€ ${fmt(m.importo)}</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

<!-- =========================================== -->
<!-- MAGAZZINO AL 31/12 -->
<!-- =========================================== -->
${articoliConGiacenza.length > 0 ? `
<h2>📦 Inventario magazzino al 31/12/${annoNum}</h2>

${articoliEsaurimento.length > 0 ? `
<div style="background:#FFF0F0;border-left:3px solid #C04B3B;padding:0.5rem 0.8rem;margin-bottom:0.8rem;font-size:9pt">
  <strong style="color:#C04B3B">⚠️ ${articoliEsaurimento.length} articol${articoliEsaurimento.length===1?'o':'i'} sotto soglia minima:</strong>
  ${articoliEsaurimento.map(a => `${a.nome} (${a.giacenza.toFixed(1)} ${a.unita||''})`).join(' · ')}
</div>
` : ''}

${Object.entries(articoliPerCategoria).sort().map(([cat, items]) => `
<h3 style="color:#5C3A10;font-size:11pt;margin:0.6rem 0 0.3rem;font-family:Georgia,serif">${cat}</h3>
<table>
  <thead><tr><th>Articolo</th><th class="right">Giacenza</th><th>Unità</th><th>Stato</th></tr></thead>
  <tbody>
    ${items.sort((a,b) => a.nome.localeCompare(b.nome)).map(a => {
      const sottoSoglia = a.sogliaMinima && a.giacenza < parseFloat(a.sogliaMinima);
      const isZero = a.giacenza <= 0;
      const stato = isZero ? '<span style="color:#C04B3B;font-weight:600">❌ Esaurito</span>' :
                    sottoSoglia ? `<span style="color:#C8860A;font-weight:600">⚠️ Sotto soglia (${a.sogliaMinima})</span>` :
                    '<span style="color:#5D8C44">✓ OK</span>';
      return `<tr>
        <td>${a.nome}</td>
        <td class="right"><strong>${a.giacenza.toFixed(a.giacenza % 1 === 0 ? 0 : 2)}</strong></td>
        <td>${a.unita || '—'}</td>
        <td>${stato}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
`).join('')}
` : ''}

<!-- =========================================== -->
<!-- ORDINI -->
<!-- =========================================== -->
${(ordiniRicevuti.length + ordiniDaRicevere.length + ordiniDaOrdinare.length > 0) ? `
<h2>🛒 Ordini ${annoNum}</h2>

${ordiniRicevuti.length > 0 ? `
<h3 style="color:#5C3A10;font-size:11pt;margin:0.6rem 0 0.3rem;font-family:Georgia,serif">✅ Ordinati e ricevuti nell'anno (${ordiniRicevuti.length})</h3>
<table>
  <thead><tr><th>Articolo</th><th class="right">Quantità</th><th>Fornitore</th><th class="right">Spesa merce</th></tr></thead>
  <tbody>
    ${ordiniRicevuti.map(n => `<tr>
      <td>${_nomeOrdine(n)}</td>
      <td class="right">${n.quantita} ${n.unita||''}</td>
      <td>${n.fornitore || '—'}</td>
      <td class="right">${n.prezzoStimato ? '€ '+parseFloat(n.prezzoStimato).toFixed(2) : '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

${ordiniDaRicevere.length > 0 ? `
<h3 style="color:#5C3A10;font-size:11pt;margin:0.6rem 0 0.3rem;font-family:Georgia,serif">🚚 Ordinati, in attesa di ricezione (${ordiniDaRicevere.length})</h3>
<table>
  <thead><tr><th>Articolo</th><th class="right">Quantità</th><th>Fornitore</th></tr></thead>
  <tbody>
    ${ordiniDaRicevere.map(n => `<tr>
      <td>${_nomeOrdine(n)}</td>
      <td class="right">${n.quantita} ${n.unita||''}</td>
      <td>${n.fornitore || '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

${ordiniDaOrdinare.length > 0 ? `
<h3 style="color:#5C3A10;font-size:11pt;margin:0.6rem 0 0.3rem;font-family:Georgia,serif">📝 Da ordinare (${ordiniDaOrdinare.length})</h3>
<table>
  <thead><tr><th>Articolo</th><th class="right">Quantità</th><th>Fornitore</th><th>Priorità</th></tr></thead>
  <tbody>
    ${ordiniDaOrdinare.map(n => {
      const prio = { urgente:'🔴 Urgente', alta:'🟠 Alta', media:'🟡 Media', bassa:'⚪ Bassa' }[n.priorita] || '—';
      return `<tr>
      <td>${_nomeOrdine(n)}</td>
      <td class="right">${n.quantita} ${n.unita||''}</td>
      <td>${n.fornitore || '—'}</td>
      <td>${prio}</td>
    </tr>`;
    }).join('')}
  </tbody>
</table>
` : ''}
` : ''}

<!-- =========================================== -->
<!-- STATISTICHE GENEALOGIA -->
<!-- =========================================== -->
${(nucleiCreatiAnno.length + sciamiAnno.length + promozioniAnno.length > 0) ? `
<h2>🌳 Genealogia ${annoNum}</h2>
<table>
  <tbody>
    <tr><td><strong>🍯 Nuclei creati nell'anno</strong></td><td class="right"><strong>${nucleiCreatiAnno.filter(a => a.tipo === 'nucleo').length}</strong></td></tr>
    <tr><td><strong>👑 Nuclei di fecondazione creati</strong></td><td class="right"><strong>${nucleiCreatiAnno.filter(a => a.tipo === 'nucleo_fec').length}</strong></td></tr>
    <tr><td><strong>🐝 Sciami catturati</strong></td><td class="right"><strong>${sciamiAnno.length}</strong></td></tr>
    <tr><td><strong>⬆️ Nuclei promossi a famiglia</strong></td><td class="right"><strong>${promozioniAnno.length}</strong></td></tr>
  </tbody>
</table>

${Object.keys(regineNucleiAnno).length > 0 ? `
<h3 style="color:#8B6BB1;font-size:11pt;margin:0.8rem 0 0.4rem;font-family:Georgia,serif">👑 Origine regine introdotte</h3>
<table>
  <thead><tr><th>Origine</th><th class="right">Numero</th><th class="right">%</th></tr></thead>
  <tbody>
    ${Object.entries(regineNucleiAnno).map(([orig, n]) => {
      const totRegine = Object.values(regineNucleiAnno).reduce((s,v)=>s+v,0);
      const label = { allevata: '🥚 Allevate sul posto', inserita: '👑 Regine inserite', acquistata: '📥 Regine acquistate' }[orig] || orig;
      return `<tr><td>${label}</td><td class="right">${n}</td><td class="right">${totRegine>0?Math.round((n/totRegine)*100):0}%</td></tr>`;
    }).join('')}
  </tbody>
</table>
` : ''}
` : ''}

<!-- =========================================== -->
<!-- CONFRONTO ANNI PRECEDENTI -->
<!-- =========================================== -->
${haStoricoConfronto ? `
<h2>📈 Confronto con anni precedenti</h2>
<table>
  <thead>
    <tr>
      <th>Anno</th>
      <th class="right">Arnie attive</th>
      <th class="right">Miele (kg)</th>
      <th class="right">Trattamenti</th>
      <th class="right">Saldo</th>
    </tr>
  </thead>
  <tbody>
    ${confrontoAnni.map(c => {
      const isCorrente = c.anno === annoNum;
      return `<tr style="${isCorrente?'background:#FAEED1;font-weight:600':''}">
        <td>${c.anno}${isCorrente?' ★':''}</td>
        <td class="right">${c.arnie}</td>
        <td class="right">${c.kg.toFixed(1)}</td>
        <td class="right">${c.trattamenti}</td>
        <td class="right" style="color:${c.saldo>=0?'#5D8C44':'#C04B3B'}">${c.saldo>=0?'+':''}€ ${fmt(c.saldo)}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
<p style="font-size:8pt;color:#8B6F4E;font-style:italic;margin-top:0.3rem">★ Anno in corso (dati parziali se non concluso)</p>
` : ''}

<!-- =========================================== -->
<!-- CALENDARIO ATTIVITÀ MENSILE -->
<!-- =========================================== -->
${calendarioMensile.some(c => c.visite > 0 || c.kg > 0) ? `
<h2>📅 Calendario attività ${annoNum}</h2>
<table>
  <thead><tr><th>Mese</th><th class="right">Visite</th><th class="right">Miele (kg)</th><th class="right">Trattamenti</th></tr></thead>
  <tbody>
    ${calendarioMensile.map(c => {
      const empty = c.visite === 0 && c.kg === 0 && c.trattamenti === 0;
      return `<tr style="${empty?'color:#aaa':''}">
        <td>${c.mese}</td>
        <td class="right">${c.visite || '—'}</td>
        <td class="right">${c.kg > 0 ? c.kg.toFixed(1) : '—'}</td>
        <td class="right">${c.trattamenti || '—'}</td>
      </tr>`;
    }).join('')}
    <tr class="total-row">
      <td><strong>TOTALE</strong></td>
      <td class="right"><strong>${calendarioMensile.reduce((s,c)=>s+c.visite,0)}</strong></td>
      <td class="right"><strong>${calendarioMensile.reduce((s,c)=>s+c.kg,0).toFixed(1)}</strong></td>
      <td class="right"><strong>${calendarioMensile.reduce((s,c)=>s+c.trattamenti,0)}</strong></td>
    </tr>
  </tbody>
</table>
` : ''}

<!-- =========================================== -->
<!-- RIEPILOGO FINALE -->
<!-- =========================================== -->
<h2>🎯 Riepilogo finale</h2>
<div style="background:#FAEED1;padding:1rem 1.2rem;border-radius:6px;border-left:4px solid #C8860A">
  <ul style="margin:0;padding-left:1.3rem;line-height:1.8">
    <li><strong>Arnie attive a fine anno:</strong> ${arnieAttive_n} (${famiglie.length} famiglie, ${nuclei.length} nuclei, ${nucleiFec.length} fecondazione, ${sciami.length} sciami)</li>
    <li><strong>Produzione totale:</strong> ${mieleTotale.toFixed(1)} kg di miele${trendKg ? ` — <em>${trendKg}</em>` : ''}</li>
    <li><strong>Resa media per arnia:</strong> ${resaMedia.toFixed(1)} kg</li>
    ${varietaSorted.length > 0 ? `<li><strong>Varietà più prodotta:</strong> ${varietaSorted[0][0]} (${varietaSorted[0][1].toFixed(1)} kg, ${Math.round((varietaSorted[0][1]/mieleTotale)*100)}% del totale)</li>` : ''}
    <li><strong>Bilancio economico:</strong> ${saldo>=0?'utile':'perdita'} di ${saldo>=0?'+':''}€ ${fmt(saldo)} (entrate € ${fmt(entrate)} · uscite € ${fmt(uscite)})</li>
    ${trattamenti.length > 0 ? `<li><strong>Trattamenti antivarroa:</strong> ${trattamenti.length} interventi eseguiti</li>` : ''}
    ${obTotali > 0 ? `<li><strong>Obiettivi:</strong> ${obCompletati} su ${obTotali} completati (${Math.round((obCompletati/obTotali)*100)}%)</li>` : ''}
    ${promozioniAnno.length > 0 ? `<li><strong>Sviluppo:</strong> ${promozioniAnno.length} nuclei promossi a famiglia nell'anno</li>` : ''}
    ${articoliEsaurimento.length > 0 ? `<li style="color:#C04B3B"><strong>⚠️ Da rifornire:</strong> ${articoliEsaurimento.length} articolo/i sotto soglia minima</li>` : ''}
  </ul>
</div>

<div class="footer">
  Generato automaticamente da "Il Mio Apiario" · ${dataGenStr}
</div>

</body>
</html>`;

  // Inserisce la genealogia (SVG statico, a tutta larghezza) prima del footer
  try {
    if(typeof buildGenealogiaSVGStatico === 'function') {
      const genSvg = buildGenealogiaSVGStatico(arnie, logBook);
      const genSection = `
<h2>👑 Genealogia delle regine</h2>
<div style="background:#FFFDF8;border:1px solid #E8DDB8;border-radius:6px;padding:1rem;overflow-x:auto">
  ${genSvg}
</div>
`;
      html = html.replace('<div class="footer">', genSection + '<div class="footer">');
    }
  } catch(e) { console.error('[Report] Genealogia non inserita:', e.message); }

  // Apri il report in nuova finestra
  const win = window.open('', '_blank', 'width=900,height=700');
  if(!win) {
    alert('Per favore consenti i popup per questo sito per generare il report.');
    return;
  }
  win.document.write(html);
  win.document.close();
  } catch(err) {
    console.error('[Report] Errore in generaReportCompleto:', err.message, err);
    alert('Errore durante la generazione del report. Apri F12 → Console per dettagli.');
  }
}

// ============================================
// REPORT TRATTAMENTI (registro ufficiale)
// ============================================
function generaReportTrattamenti() {
  try {
    const anno = prompt('Per quale anno generare il registro?', new Date().getFullYear());
    if(!anno) return;
    const annoNum = parseInt(anno, 10);
    if(isNaN(annoNum)) { alert('Anno non valido'); return; }

  const oggi = new Date();
  const dataGenStr = oggi.toLocaleDateString('it-IT');

  const arnieAttive = arnie.filter(a => !a.annoDismissione || a.annoDismissione > annoNum);
  const trattamenti = tuttiTrattamentiAnno(annoNum);

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Registro Trattamenti ${annoNum}</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  body { font-family: Georgia, serif; color: #2A1A0F; line-height: 1.5; }
  h1.report-title { text-align: center; color: #5C3A10; font-size: 18pt; margin: 0 0 0.3rem; font-family: Georgia, serif; }
  .report-subtitle { text-align: center; color: #8B6F4E; font-style: italic; margin-bottom: 1rem; }
  .report-header { border-top: 2px solid #5C3A10; border-bottom: 2px solid #5C3A10; padding: 0.5rem 0; margin-bottom: 1rem; font-size: 10pt; }
  h2 { color: #5C3A10; font-size: 12pt; margin: 1rem 0 0.5rem; font-family: Georgia, serif; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 0.8rem; }
  th { background: #FAEED1; color: #5C3A10; text-align: left; padding: 0.4rem 0.5rem; border: 1px solid #E8DDB8; font-weight: 700; }
  td { padding: 0.4rem 0.5rem; border: 1px solid #E8DDB8; }
  .info-table td { border: none; padding: 0.3rem 0.5rem; }
  .footer { margin-top: 1.5rem; padding-top: 0.5rem; border-top: 1px dotted #E8DDB8; font-size: 8pt; color: #8B6F4E; text-align: center; font-style: italic; }
  .firma-section { margin-top: 2rem; }
  .firma-row { border-top: 1px solid #2A1A0F; margin-top: 1rem; padding-top: 0.5rem; display: flex; justify-content: space-between; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>

<div class="no-print" style="text-align:center;margin-bottom:1rem;padding:0.8rem;background:#FAEED1;border-radius:4px">
  <strong>📄 Anteprima registro</strong><br>
  <button onclick="window.print()" style="margin-top:0.5rem;padding:8px 20px;background:#C8860A;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:1rem">🖨️ Stampa / Salva come PDF</button>
  <button onclick="window.close()" style="margin-top:0.5rem;margin-left:0.5rem;padding:8px 20px;background:transparent;color:#5C3A10;border:1px solid #5C3A10;border-radius:4px;cursor:pointer">Chiudi</button>
</div>

<h1 class="report-title">💊 Registro Ufficiale Trattamenti</h1>
<p class="report-subtitle">Documento per ispezione veterinaria</p>

<div class="report-header">
  <table class="info-table">
    <tr><td><strong>Anno:</strong></td><td>${annoNum}</td></tr>
    <tr><td><strong>Numero arnie attive:</strong></td><td>${arnieAttive.length}</td></tr>
    <tr><td><strong>Data generazione:</strong></td><td>${dataGenStr}</td></tr>
  </table>
</div>

<h2>Trattamenti antivarroa effettuati</h2>
${trattamenti.length === 0 ? '<p style="color:#8B6F4E;font-style:italic">Nessun trattamento registrato per questo anno.</p>' : `
<table>
  <thead>
    <tr>
      <th>Data</th>
      <th>Arnia</th>
      <th>Prodotto</th>
      <th>Principio attivo</th>
      <th>Dose/Lotto</th>
      <th>Note</th>
    </tr>
  </thead>
  <tbody>
    ${trattamenti.map(t => {
      const a = arnie.find(x => x.id === t.arniaId);
      const trat = t.trattamento || {};
      return `<tr>
        <td>${formatDate(t.data)}</td>
        <td>#${a ? a.num : '?'}${a && a.nome ? ' — '+a.nome : ''}</td>
        <td>${trat.prodotto || '—'}</td>
        <td>${trat.principioAttivo || '—'}</td>
        <td>${trat.dose || '—'}${trat.lotto ? '<br>Lotto: '+trat.lotto : ''}</td>
        <td>${(t.note || '').substring(0,100)}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
`}

<div class="firma-section">
  <p style="font-size:9pt;color:#8B6F4E;line-height:1.7">
    Il sottoscritto dichiara di aver effettuato i trattamenti antivarroa sopra elencati nel rispetto delle linee guida ministeriali (rif. <em>Linee guida IZS Venezie 2024 — Nota 11687</em>) e nel rispetto del periodo di sospensione previsto per il miele destinato al consumo.
  </p>
  <div class="firma-row">
    <span style="font-size:10pt"><strong>Luogo, data</strong><br>__________________, ${dataGenStr}</span>
    <span style="font-size:10pt"><strong>Firma apicoltore</strong><br>___________________________</span>
  </div>
</div>

<div class="footer">
  Generato automaticamente da "Il Mio Apiario" · ${dataGenStr}
</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if(!win) {
    alert('Per favore consenti i popup per questo sito per generare il report.');
    return;
  }
  win.document.write(html);
  win.document.close();
  } catch(err) {
    console.error('[Report] Errore in generaReportTrattamenti:', err.message);
    alert('Errore durante la generazione del registro. Apri F12 → Console per dettagli.');
  }
}

// ===========================================================
// MODALE EXPORT REPORT — punto unico per tutti i report
// Per aggiungere un report: aggiungi una voce a REPORT_DISPONIBILI
// ===========================================================
const REPORT_DISPONIBILI = [
  {
    id: 'completo',
    icona: '📄',
    titolo: 'Report completo',
    descrizione: 'Fotografia generale dell\'apiario: arnie, produzione, trattamenti, magazzino, ordini dell\'anno e bilancio.',
    azione: () => generaReportCompleto(),
  },
  {
    id: 'annuale',
    icona: '📊',
    titolo: 'Report annuale (analisi)',
    descrizione: 'Bilancio economico e analisi produttive dell\'anno selezionato (costo del miele, ripartizione spese, narrativo).',
    azione: () => { if(typeof esportaReportAnnuale === 'function') esportaReportAnnuale(); else alert('Report annuale non disponibile.'); },
  },
  {
    id: 'trattamenti',
    icona: '💊',
    titolo: 'Registro trattamenti',
    descrizione: 'Elenco dei trattamenti sanitari per arnia, utile per l\'ispezione veterinaria.',
    azione: () => generaReportTrattamenti(),
  },
];

function mostraExportReport() {
  try {
    const old = document.getElementById('exportReportOverlay');
    if(old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'exportReportOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,18,8,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem';
    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });

    const voci = REPORT_DISPONIBILI.map(r => `
      <button onclick="eseguiReport('${r.id}')" style="display:flex;gap:0.8rem;align-items:flex-start;width:100%;text-align:left;background:white;border:1px solid var(--cream-dark);border-radius:8px;padding:0.9rem 1rem;cursor:pointer;font-family:inherit;margin-bottom:0.6rem;transition:border-color 0.15s" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--cream-dark)'">
        <span style="font-size:1.6rem;line-height:1">${r.icona}</span>
        <span style="flex:1">
          <span style="display:block;font-weight:700;color:var(--brown);font-size:1rem">${r.titolo}</span>
          <span style="display:block;font-size:0.83rem;color:var(--text-light);margin-top:0.2rem">${r.descrizione}</span>
        </span>
        <span style="color:var(--amber);font-size:1.2rem;align-self:center">↓</span>
      </button>`).join('');

    overlay.innerHTML = `
      <div style="background:var(--cream);border-radius:10px;padding:1.5rem;width:100%;max-width:520px;max-height:84vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;color:var(--brown);margin:0 0 0.3rem">📄 Esporta report</h3>
        <p style="font-size:0.85rem;color:var(--text-light);margin:0 0 1.2rem">Scegli il report da generare. Si aprirà la finestra di stampa del browser (puoi salvarlo come PDF).</p>
        ${voci}
        <button onclick="document.getElementById('exportReportOverlay').remove()" style="width:100%;margin-top:0.5rem;padding:0.7rem;background:var(--brown);border:none;border-radius:6px;font-weight:700;color:white;cursor:pointer;font-family:inherit">Chiudi</button>
      </div>`;
    document.body.appendChild(overlay);
  } catch(err) {
    console.error('[Report] Errore in mostraExportReport:', err.message);
  }
}

function eseguiReport(id) {
  try {
    const r = REPORT_DISPONIBILI.find(x => x.id === id);
    if(!r) return;
    const ov = document.getElementById('exportReportOverlay');
    if(ov) ov.remove();
    // Piccolo ritardo per chiudere la modale prima di aprire la stampa
    setTimeout(() => { r.azione(); }, 150);
  } catch(err) {
    console.error('[Report] Errore in eseguiReport:', err.message);
  }
}
