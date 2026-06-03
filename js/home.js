// ===== FILE VERSION: 2026-05-28.3 · home.js =====
// ======= HOME =======
const STAGIONI_INFO = {
  primavera: { nome: 'Primavera 2026', sub: 'Mar–Mag · Periodo acacia e sciamatura', mesi: [2,3,4] },
  estate:    { nome: 'Estate 2026',    sub: 'Giu–Ago · Raccolta e trattamenti estivi', mesi: [5,6,7] },
  autunno:   { nome: 'Autunno 2026',  sub: 'Set–Nov · Preparazione invernamento', mesi: [8,9,10] },
  inverno:   { nome: 'Inverno 2026',  sub: 'Dic–Feb · Riposo e preparazione', mesi: [11,0,1] },
};

function getStagioneCorrente() {
  const m = new Date().getMonth();
  if([2,3,4].includes(m))  return 'primavera';
  if([5,6,7].includes(m))  return 'estate';
  if([8,9,10].includes(m)) return 'autunno';
  return 'inverno';
}

function renderHome() {
  try {
    const anno = new Date().getFullYear();
    const stagione = getStagioneCorrente();
    const info = STAGIONI_INFO?.[stagione];
    if (!info) {
      console.warn('[Home] STAGIONI_INFO non disponibile per stagione:', stagione);
    }
    const giorniSettimana = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
    const mesiNome = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    const oggi = new Date();

    // Banner (verifiche DOM difensive)
    const seasonNameEl = document.getElementById('homeSeasonName');
    const seasonSubEl  = document.getElementById('homeSeasonSub');
    const dateEl       = document.getElementById('homeDate');
    if (seasonNameEl && info) seasonNameEl.textContent = info.nome;
    if (seasonSubEl && info)  seasonSubEl.textContent  = info.sub;
    if (dateEl) dateEl.textContent = `${giorniSettimana[oggi.getDay()]} ${oggi.getDate()} ${mesiNome[oggi.getMonth()]} ${oggi.getFullYear()}`;

  // Alerts
  const alerts = [];
  const sottoSoglia = articoli.filter(a => a.soglia && getGiacenzaLocale(a.id) <= parseFloat(a.soglia));
  if(sottoSoglia.length > 0)
    alerts.push({ msg: `${sottoSoglia.length} articol${sottoSoglia.length>1?'i':'o'} sotto soglia: ${sottoSoglia.map(a=>a.nome).join(', ')}`, target: 'magazzino', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' });

  // Articoli in scadenza (entro 3 mesi) — utile per farmaci antivarroa
  const oggiScad = Date.now();
  const inScadenza = articoli.filter(a => {
    if(!a.scadenza) return false;
    const parts = a.scadenza.split('-');
    if(parts.length < 2) return false;
    const scadMs = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, 1).getTime();
    if(isNaN(scadMs)) return false;
    const mesi = (scadMs - oggiScad) / (1000*60*60*24*30);
    return mesi <= 3; // include già scadute (mesi negativi)
  });
  if(inScadenza.length > 0) {
    // Separa scadute da in-scadenza
    const scadute = inScadenza.filter(a => {
      const parts = a.scadenza.split('-');
      const scadMs = new Date(parseInt(parts[0],10), parseInt(parts[1],10), 0).getTime(); // ultimo giorno del mese
      return scadMs < oggiScad;
    });
    if(scadute.length > 0) {
      alerts.push({ msg: `🔴 ${scadute.length} articol${scadute.length>1?'i':'o'} SCADUT${scadute.length>1?'I':'O'}: ${scadute.map(a=>a.nome).join(', ')}`, target: 'magazzino', color: '#8A2C2C', bg: '#fce8e8', border: '#C03030' });
    }
    const inScadProssima = inScadenza.filter(a => !scadute.includes(a));
    if(inScadProssima.length > 0) {
      alerts.push({ msg: `⏰ ${inScadProssima.length} articol${inScadProssima.length>1?'i':'o'} in scadenza entro 3 mesi: ${inScadProssima.map(a=>a.nome+' ('+a.scadenza.split('-')[1]+'/'+a.scadenza.split('-')[0]+')').join(', ')}`, target: 'magazzino', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' });
    }
  }
  const arnieProblema = arnie.filter(a => a.status === 'problema');
  if(arnieProblema.length > 0)
    alerts.push({ msg: `${arnieProblema.length} arni${arnieProblema.length>1?'e':'a'} in stato problema: ${arnieProblema.map(a=>'#'+a.num).join(', ')}`, target: 'arnie', color: '#8A2C2C', bg: '#fce8e8', border: '#C03030' });
  const arnieDebole = arnie.filter(a => a.status === 'debole');
  if(arnieDebole.length > 0)
    alerts.push({ msg: `${arnieDebole.length} arni${arnieDebole.length>1?'e':'a'} debol${arnieDebole.length>1?'i':'e'}: ${arnieDebole.map(a=>'#'+a.num).join(', ')}`, target: 'arnie', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' });

  // Nuclei pronti per promozione a famiglia
  if(typeof checkPromotionReady === 'function') {
    const nucleiProntiPromo = arnie.filter(a => a.tipo === 'nucleo' && checkPromotionReady(a.id));
    if(nucleiProntiPromo.length > 0)
      alerts.push({ msg: `${nucleiProntiPromo.length} nucle${nucleiProntiPromo.length>1?'i':'o'} pront${nucleiProntiPromo.length>1?'i':'o'} per promozione a Famiglia: ${nucleiProntiPromo.map(a=>'#'+a.num).join(', ')}`, target: 'arnie', color: '#5D8C44', bg: '#EEF6E7', border: '#5D8C44' });
  }

  // Sciami da valutare (con flag pending)
  const sciamiPending = arnie.filter(a => a.tipo === 'sciame' && a.sciameNeedsEvolutionCheck);
  if(sciamiPending.length > 0)
    alerts.push({ msg: `${sciamiPending.length} sciam${sciamiPending.length>1?'i':'e'} da valutare: ${sciamiPending.map(a=>'#'+a.num).join(', ')}`, target: 'arnie', color: '#5D8C44', bg: '#EEF6E7', border: '#5D8C44' });

  // 🛒 NECESSITÀ — Lista da ordinare
  if(typeof getNecessitaAttive === 'function') {
    // Solo voci ancora "da_ordinare" (escludo quelle già ordinate/in viaggio)
    const necAttive = getNecessitaAttive().filter(n => n.stato === 'da_ordinare');
    const necUrgenti = necAttive.filter(n => n.priorita === 'urgente');
    const oggi = new Date();
    const tra7gg = new Date(oggi.getTime() + 7*24*60*60*1000);
    const necDataVicina = necAttive.filter(n => {
      if(n.priorita === 'urgente') return false; // già conteggiati sopra
      if(!n.dataPrevista) return false;
      const dp = new Date(n.dataPrevista);
      return !isNaN(dp.getTime()) && dp <= tra7gg;
    });

    // Alert 1: voci urgenti
    if(necUrgenti.length > 0) {
      alerts.push({
        msg: `🔴 ${necUrgenti.length} ordin${necUrgenti.length>1?'i':'e'} URGENT${necUrgenti.length>1?'I':'E'} da effettuare`,
        target: 'magazzino', color: '#8A2C2C', bg: '#fce8e8', border: '#C03030'
      });
    }
    // Alert 2: data vicina entro 7gg
    if(necDataVicina.length > 0) {
      alerts.push({
        msg: `📅 ${necDataVicina.length} ordin${necDataVicina.length>1?'i':'e'} con scadenza entro 7 giorni`,
        target: 'magazzino', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27'
      });
    }
    // Alert 3: totale voci attive (solo se non già evidenziato come urgente/vicino)
    const giaEvidenziati = necUrgenti.length + necDataVicina.length;
    const rimanenti = necAttive.length - giaEvidenziati;
    if(rimanenti > 0 && giaEvidenziati === 0) {
      // Mostro il totale solo se non ci sono già alert specifici
      alerts.push({
        msg: `🛒 ${necAttive.length} voc${necAttive.length>1?'i':'e'} in lista "Da ordinare"`,
        target: 'magazzino', color: '#5C3A10', bg: 'rgba(200,134,10,0.10)', border: 'rgba(200,134,10,0.4)'
      });
    }
  }

  // 📉 ESAURIMENTO IMMINENTE — articoli con scorta < 1 mese (basato su consumo storico)
  if(typeof getPrevisioneMesiResidui === 'function') {
    const inEsaurimento = [];
    articoli.forEach(a => {
      const giac = getGiacenzaLocale(a.id);
      if(giac <= 0) return; // già a zero, lo gestisce "sotto soglia"
      const mesi = getPrevisioneMesiResidui(a.id, giac);
      if(mesi !== null && mesi < 1) {
        inEsaurimento.push(a.nome);
      }
    });
    if(inEsaurimento.length > 0) {
      alerts.push({
        msg: `📉 ${inEsaurimento.length} articol${inEsaurimento.length>1?'i':'o'} in esaurimento (< 1 mese): ${inEsaurimento.join(', ')}`,
        target: 'magazzino', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27'
      });
    }
  }

  const homeAlertsEl = document.getElementById('homeAlerts');
  if(homeAlertsEl) homeAlertsEl.innerHTML = alerts.map(al => `
    <div class="home-alert clickable" onclick="navigateTo('${al.target}')" style="background:${al.bg};border:1px solid ${al.border};border-radius:4px;padding:0.55rem 1rem;font-size:0.88rem;color:${al.color};margin-bottom:0.5rem;display:flex;align-items:center;gap:0.6rem">
      <span>⚠️</span><span style="flex:1">${al.msg}</span><span style="font-size:0.8rem;opacity:0.7">↗</span>
    </div>`).join('');

  // KPI — miele dalla fonte unica di verità (state.js)
  const mieleStats = getMieleStats();
  const totMiele = mieleStats.totale;
  const totMieleAnno = mieleStats.perAnno[anno] || 0;
  const giorniVisitaAnno = countGiorniVisita(anno);
  const mc = movimentiContabili || [];
  const annoStr = String(anno);
  const saldoAnno = mc.filter(m=>m.data&&m.data.startsWith(annoStr)&&m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0)
                  - mc.filter(m=>m.data&&m.data.startsWith(annoStr)&&m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);
  const saldoTot  = mc.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0)
                  - mc.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);

  // Conteggi per tipo
  const cntFamiglie    = arnie.filter(a => (a.tipo === 'famiglia' || !a.tipo) && a.status !== 'problema' && !a.annoDismissione).length;
  const cntNuclei      = arnie.filter(a => a.tipo === 'nucleo' && !a.annoDismissione).length;
  const cntFec         = arnie.filter(a => a.tipo === 'nucleo_fec' && !a.annoDismissione).length;
  const cntSciami      = arnie.filter(a => a.tipo === 'sciame' && !a.annoDismissione).length;

  document.getElementById('homeKpi').innerHTML = `
    <div class="stat-card clickable" onclick="navigateTo('arnie')" style="border-left:4px solid var(--brown)">
      <div class="stat-number">${cntFamiglie}</div>
      <div class="stat-label">🏠 Famiglie</div>
      ${cntNuclei + cntFec + cntSciami > 0 ? `<div style="font-size:0.7rem;color:var(--text-light);margin-top:0.2rem">+ ${cntNuclei} nucl. · ${cntFec} fec. · ${cntSciami} sc.</div>` : ''}
    </div>
    <div class="stat-card"><div class="stat-number">${totMieleAnno.toFixed(1)} kg</div><div class="stat-label">Miele ${anno}</div></div>
    <div class="stat-card"><div class="stat-number">${totMiele.toFixed(1)} kg</div><div class="stat-label">Miele totale</div></div>
    <div class="stat-card clickable" onclick="navigateTo('registro')"><div class="stat-number">${giorniVisitaAnno}</div><div class="stat-label">Giorni visita ${anno}</div></div>
    <div class="stat-card clickable" onclick="navigateTo('contabilita')"><div class="stat-number" style="color:${saldoAnno>=0?'var(--green)':'var(--red)'}">€${saldoAnno>=0?'':'-'}${fmt(Math.abs(saldoAnno))}</div><div class="stat-label">Saldo ${anno}</div></div>
    <div class="stat-card clickable" onclick="navigateTo('contabilita')"><div class="stat-number" style="color:${saldoTot>=0?'var(--green)':'var(--red)'}">€${saldoTot>=0?'':'-'}${fmt(Math.abs(saldoTot))}</div><div class="stat-label">Saldo totale</div></div>
  `;

  // Arnie cards — usa getTelainoInfo() da shared.js per coerenza colori
  const statusLabel = {attiva:'Attiva',debole:'Debole',problema:'Problema',invernata:'Invernata'};
  const statusCls = {attiva:'status-attiva',debole:'status-debole',problema:'status-problema',invernata:'status-invernata'};

  document.getElementById('homeArnieGrid').innerHTML = arnie.length === 0
    ? `<div class="empty-state" style="grid-column:1/-1"><span class="big">🏠</span>Nessuna arnia registrata.</div>`
    : arnie.map(a => {
        const isp = findUltimaIspezione(a.id);
        const mappaHtml = isp?.ispezione?.mappa?.length ? `
          <div style="display:flex;gap:2px;margin-top:6px;flex-wrap:wrap">
            ${isp.ispezione.mappa.map((tipo,i) => {
              const info = getTelainoInfo(tipo);
              const border = info.borderColor ? `border:1.5px solid ${info.borderColor}` : 'border:1px solid rgba(0,0,0,0.12)';
              return `<div title="T${i+1}: ${info.label}" style="width:22px;height:32px;border-radius:2px;${border};background:${info.color};display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:${info.textColor}">${info.short}</div>`;
            }).join('')}
          </div>` : '';
        return `
        <div class="arnia-card clickable" onclick="navigateTo('arnie')">
          <div class="arnia-num">#${a.num}</div>
          <div class="arnia-name">${a.nome||'—'}</div>
          <span class="arnia-status ${statusCls[a.status]}">${statusLabel[a.status]}</span>
          <div class="arnia-info" style="font-size:0.85rem">
            ${a.razza?`🐝 <em>${a.razza}</em><br>`:''}
            ${a.reginaAnno?`${getReginaPallino(a.reginaAnno)}Regina <strong>${a.reginaAnno}</strong><br>`:''}
            ${isp?`📅 Isp: ${formatDate(isp.data)}<br>`:''}
            ${isp?.ispezione?.telaini?`📏 ${isp.ispezione.telaini} telaini`:''}
            ${isp?.ispezione?.covata?` · 🟤 ${isp.ispezione.covata}/5`:''}
            ${isp?.ispezione?.celleReali?` · 👑 ${CELLE_REALI_LABEL[isp.ispezione.celleReali]||''}`:``}
          </div>
          ${getProduzioneBadges(a)}
          ${mappaHtml}
        </div>`;
      }).join('');

  // Ultime visite
  const tipoEmoji = {ispezione:'🔍',trattamento:'💊',nutrizione:'🍬',produzione:'🍯',salute:'⚕️',altro:'📌'};
  const tipoCol = {ispezione:'var(--brown-light)',trattamento:'var(--blue)',nutrizione:'var(--green)',produzione:'var(--amber)',salute:'var(--red)',altro:'var(--text-light)'};
  const ultime5 = logBook.slice(0,5);
  document.getElementById('homeUltimeVisite').innerHTML = ultime5.length === 0
    ? '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessuna visita registrata.</div>'
    : ultime5.map(e => {
        const tipi = getTipi(e);
        const col = tipoCol[tipi[0]]||'var(--text-light)';
        return `<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px dotted var(--cream-dark)">
          <div style="width:8px;height:8px;border-radius:50%;background:${col};margin-top:5px;flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:0.9rem;color:var(--text)">${tipi.map(t=>tipoEmoji[t]||'📌').join('')} ${e.arniaNome}</div>
            <div style="font-size:0.78rem;color:var(--text-light)">${formatDate(e.data)} · ${e.note.substring(0,45)}${e.note.length>45?'...':''}</div>
          </div>
        </div>`;
      }).join('');

  // Obiettivi in corso
  const obInCorso = obiettivi.filter(o => o.stato !== 'completato' && Number(o.anno) === anno).slice(0,5);
  document.getElementById('homeObiettivi').innerHTML = obInCorso.length === 0
    ? '<div style="color:var(--text-light);font-style:italic;font-size:0.9rem">Nessun obiettivo attivo.</div>'
    : obInCorso.map(o => {
        const pct = o.target ? Math.min(100,Math.round((parseFloat(o.attuale||0)/parseFloat(o.target))*100)) : null;
        const stato = o.stato==='in_corso'?'🔄':'🔲';
        const tipoBadge = o.tipo==='annuale'?`<span style="font-size:0.7rem;background:var(--amber-pale);color:var(--brown);padding:1px 5px;border-radius:3px;margin-left:4px">Annuale</span>`:`<span style="font-size:0.7rem;background:#e8f5e9;color:var(--green);padding:1px 5px;border-radius:3px;margin-left:4px">Stagionale</span>`;
        return `<div style="padding:5px 0;border-bottom:1px dotted var(--cream-dark)">
          <div style="font-size:0.9rem;color:var(--text);display:flex;align-items:center;gap:4px">${stato} ${o.titolo}${tipoBadge}</div>
          ${pct!==null?`<div style="height:4px;background:var(--cream-dark);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct>=100?'var(--green)':pct>=50?'var(--amber)':'var(--red)'};border-radius:2px"></div></div>`:''}
        </div>`;
      }).join('');

  // Grafico miele per anno — riusa mieleStats già calcolato sopra
  const mielePerAnno = mieleStats.perAnno;
  const anniMiele = Object.keys(mielePerAnno).sort();
  const maxMiele = Math.max(...Object.values(mielePerAnno), 1);
  document.getElementById('homeGraficoMiele').innerHTML = anniMiele.length === 0
    ? '<div style="color:var(--text-light);font-style:italic;font-size:0.85rem">Nessun dato. Registra una raccolta per vedere questo grafico.</div>'
    : anniMiele.map(a => {
        const tot = mielePerAnno[a];
        const w = Math.round((tot/maxMiele)*100);
        return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:0.82rem">
          <span style="min-width:32px;color:var(--text-light)">${a}</span>
          <div style="flex:1;height:10px;background:var(--cream-dark);border-radius:3px;overflow:hidden"><div style="height:100%;width:${w}%;background:var(--amber);border-radius:3px${a===String(anno)?';opacity:0.65':''}"></div></div>
          <span style="min-width:40px;text-align:right;color:var(--text-light)">${tot.toFixed(1)} kg${a===String(anno)?' *':''}</span>
        </div>`;
      }).join('') + (anniMiele.includes(String(anno)) ? '<div style="font-size:11px;color:var(--text-light);margin-top:4px">* anno in corso</div>' : '');

  // Grafico arnie per anno — conta arnie attive in ogni anno
  const annoCorrente = new Date().getFullYear();
  const anniConDati = arnie.filter(a => a.annoIntroduzione).map(a => a.annoIntroduzione);
  if(anniConDati.length === 0) {
    document.getElementById('homeGraficoArnie').innerHTML = '<div style="color:var(--text-light);font-style:italic;font-size:0.85rem">Aggiungi l\'anno di introduzione alle arnie per vedere questo grafico.</div>';
  } else {
    const minAnnoA = Math.min(...anniConDati);
    const tuttiAnniA = Array.from({length: annoCorrente - minAnnoA + 1}, (_, i) => minAnnoA + i);
    const serieArnie = tuttiAnniA.map(a => ({
      anno: a,
      tot: arnie.filter(ar => ar.annoIntroduzione && ar.annoIntroduzione <= a && (!ar.annoDismissione || ar.annoDismissione >= a)).length
    }));
    const maxAr = Math.max(...serieArnie.map(s => s.tot), 1);
    document.getElementById('homeGraficoArnie').innerHTML = serieArnie.map(s => {
      const w = Math.round((s.tot / maxAr) * 100);
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:0.82rem">
        <span style="min-width:32px;color:var(--text-light)">${s.anno}</span>
        <div style="flex:1;height:10px;background:var(--cream-dark);border-radius:3px;overflow:hidden"><div style="height:100%;width:${w}%;background:var(--green);border-radius:3px${s.anno===annoCorrente?';opacity:0.7':''}"></div></div>
        <span style="min-width:30px;text-align:right;color:var(--text-light)">${s.tot}</span>
      </div>`;
    }).join('');
  }

  // Grafico contabilità per anno
  const anniCont = [...new Set((movimentiContabili||[]).map(m=>m.data?.slice(0,4)).filter(Boolean))].sort();
  const maxCont = Math.max(...anniCont.map(a=>{
    const e=(movimentiContabili||[]).filter(m=>m.data?.startsWith(a)&&m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0);
    const u=(movimentiContabili||[]).filter(m=>m.data?.startsWith(a)&&m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);
    return Math.max(e,u);
  }),1);
  document.getElementById('homeGraficoContabilita').innerHTML = anniCont.length===0
    ? '<div style="color:var(--text-light);font-style:italic;font-size:0.85rem">Nessun dato.</div>'
    : anniCont.map(a=>{
        const e=(movimentiContabili||[]).filter(m=>m.data?.startsWith(a)&&m.tipo==='entrata').reduce((s,m)=>s+parseFloat(m.importo||0),0);
        const u=(movimentiContabili||[]).filter(m=>m.data?.startsWith(a)&&m.tipo==='uscita').reduce((s,m)=>s+parseFloat(m.importo||0),0);
        const we=Math.round((e/maxCont)*100);
        const wu=Math.round((u/maxCont)*100);
        return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:0.82rem">
          <span style="min-width:32px;color:var(--text-light)">${a}</span>
          <div style="flex:1;display:flex;flex-direction:column;gap:2px">
            <div style="height:5px;background:var(--cream-dark);border-radius:3px;overflow:hidden"><div style="height:100%;width:${we}%;background:var(--green);border-radius:3px"></div></div>
            <div style="height:5px;background:var(--cream-dark);border-radius:3px;overflow:hidden"><div style="height:100%;width:${wu}%;background:var(--red);border-radius:3px"></div></div>
          </div>
          <span style="min-width:60px;text-align:right;color:var(--text-light);font-size:0.75rem"><span style="color:var(--green)">+${fmt(e)}</span><br><span style="color:var(--red)">-${fmt(u)}</span></span>
        </div>`;
      }).join('') + `<div style="display:flex;gap:10px;margin-top:6px;font-size:0.75rem;color:var(--text-light)">
        <span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block"></span>Entrate</span>
        <span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block"></span>Uscite</span>
      </div>`;

    // 🛒 RIEPILOGO DA ORDINARE
    renderHomeNecessitaBox();
    if(typeof renderHomeCruscotto === 'function') renderHomeCruscotto();
    if(typeof renderTodoWidgetHome === 'function') renderTodoWidgetHome();
  } catch(err) {
    console.error('[Home] Errore durante renderHome:', err.message, err);
  }
}

// ============================================
// 🛒 BOX RIEPILOGO ORDINI DA FARE NELLA HOME
// ============================================
function renderHomeNecessitaBox() {
  try {
    const box = document.getElementById('homeNecessitaBox');
    if(!box) return;

    // Verifica che le funzioni del modulo necessita siano caricate
    if(typeof getNecessitaAttive !== 'function') {
      box.style.display = 'none';
      return;
    }

    const attiveTutte = getNecessitaAttive();
    // Nel box "Da ordinare" mostriamo solo ciò che richiede ancora azione (stato da_ordinare).
    // Le voci già "ordinato" (in viaggio) non servono qui.
    const attive = attiveTutte.filter(n => n.stato === 'da_ordinare');
    const inViaggio = attiveTutte.filter(n => n.stato === 'ordinato');

    if(attive.length === 0 && inViaggio.length === 0) {
      box.style.display = 'none';
      return;
    }
    // Se non c'è nulla da ordinare ma ci sono voci in viaggio, mostro solo un riepilogo minimale
    if(attive.length === 0) {
      box.style.display = 'block';
      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:1.1rem">🚚</span>
            <span style="font-size:0.9rem;color:var(--text)">${inViaggio.length} ordin${inViaggio.length>1?'i':'e'} in arrivo · nulla da ordinare</span>
          </div>
          <a href="#" onclick="navigateTo('magazzino');setTimeout(()=>{const b=document.querySelector('.mag-tab[onclick*=necessita]');if(b)showMagTab('necessita',b);},80);return false" style="font-size:0.78rem;color:var(--amber);text-decoration:none;font-weight:600">Lista ↗</a>
        </div>`;
      return;
    }
    const alta = attive.filter(n => n.priorita === 'alta');
    const oggi = new Date();
    const tra7gg = new Date(oggi.getTime() + 7*24*60*60*1000);
    const dataVicina = attive.filter(n => {
      if(n.priorita === 'urgente') return false;
      if(!n.dataPrevista) return false;
      const dp = new Date(n.dataPrevista);
      return !isNaN(dp.getTime()) && dp <= tra7gg;
    });

    // Top 3 voci per priorità
    const ordinePrior = { urgente: 0, alta: 1, media: 2, bassa: 3 };
    const top3 = [...attive]
      .sort((a,b) => {
        const pa = ordinePrior[a.priorita] ?? 4;
        const pb = ordinePrior[b.priorita] ?? 4;
        if(pa !== pb) return pa - pb;
        // a parità di priorità, data prevista più vicina prima
        if(a.dataPrevista && b.dataPrevista) return a.dataPrevista.localeCompare(b.dataPrevista);
        if(a.dataPrevista) return -1;
        if(b.dataPrevista) return 1;
        return 0;
      })
      .slice(0, 3);

    const priColor = { urgente: '#C04B3B', alta: '#E89488', media: '#C8860A', bassa: '#9CA3AF' };
    const priIcon = { urgente: '🔴', alta: '🟠', media: '🟡', bassa: '⚪' };

    // Totale stimato
    const totStimato = attive.reduce((s, n) => s + (parseFloat(n.prezzoStimato) || 0), 0);

    // Costruisco HTML
    const chipStyle = 'display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:11px;font-size:0.82rem;font-weight:600';

    box.style.display = 'block';
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;flex-wrap:wrap;gap:0.5rem">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span style="font-size:1.1rem">🛒</span>
          <span style="font-size:0.78rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.08em">Da ordinare</span>
        </div>
        <a href="#" onclick="navigateTo('magazzino');setTimeout(()=>{const b=document.querySelector('.mag-tab[onclick*=necessita]');if(b)showMagTab('necessita',b);},80);return false" style="font-size:0.78rem;color:var(--amber);text-decoration:none;font-weight:600">Lista completa ↗</a>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.9rem">
        ${urgenti.length > 0 ? `<span style="${chipStyle};background:${priColor.urgente}22;color:${priColor.urgente}">${priIcon.urgente} ${urgenti.length} urgent${urgenti.length>1?'i':'e'}</span>` : ''}
        ${alta.length > 0 ? `<span style="${chipStyle};background:${priColor.alta}22;color:${priColor.alta}">${priIcon.alta} ${alta.length} alta priorità</span>` : ''}
        ${dataVicina.length > 0 ? `<span style="${chipStyle};background:rgba(200,134,10,0.15);color:var(--brown)">📅 ${dataVicina.length} entro 7gg</span>` : ''}
        ${(urgenti.length === 0 && alta.length === 0 && dataVicina.length === 0) ? `<span style="${chipStyle};background:rgba(0,0,0,0.04);color:var(--text-light)">Nessuna voce critica</span>` : ''}
      </div>

      <div style="font-size:0.72rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.5rem">Prossime priorità</div>
      <div style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.9rem">
        ${top3.map(n => {
          const art = n.articoloId ? articoli.find(a => a.id === n.articoloId) : null;
          const desc = art ? art.nome : (n.descrizione || 'Articolo');
          const unita = n.unita || (art && art.unita) || '';
          const pCol = priColor[n.priorita] || '#C8860A';
          const pIco = priIcon[n.priorita] || '⚪';
          const fornitoreTxt = n.fornitore ? ` <span style="color:var(--text-light);font-size:0.82rem">[${escapeHomeHtml(n.fornitore)}]</span>` : '';
          const dataTxt = n.dataPrevista ? ` <span style="color:var(--text-light);font-size:0.78rem">· 📅 ${formatDate(n.dataPrevista)}</span>` : '';
          return `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.6rem;background:rgba(0,0,0,0.02);border-left:3px solid ${pCol};border-radius:4px;font-size:0.88rem">
              <span title="${n.priorita}">${pIco}</span>
              <span><strong>${n.quantita || '?'} ${escapeHomeHtml(unita)}</strong> · ${escapeHomeHtml(desc)}${fornitoreTxt}${dataTxt}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;border-top:1px solid var(--cream-dark);padding-top:0.6rem;font-size:0.82rem;color:var(--text-light)">
        <span><strong style="color:var(--brown)">${attive.length}</strong> da ordinare${inViaggio.length > 0 ? ` · 🚚 ${inViaggio.length} in arrivo` : ''}${totStimato > 0 ? ` · Stima: <strong style="color:var(--brown)">€ ${totStimato.toFixed(2)}</strong>` : ''}</span>
        <button onclick="copiaListaNecessita()" style="background:transparent;border:1px solid var(--cream-dark);color:var(--brown);padding:0.3rem 0.8rem;border-radius:4px;cursor:pointer;font-family:inherit;font-size:0.82rem">📋 Copia lista</button>
      </div>
    `;
  } catch(err) {
    console.error('[Home] Errore in renderHomeNecessitaBox:', err.message);
    const box = document.getElementById('homeNecessitaBox');
    if(box) box.style.display = 'none';
  }
}

// Helper escape locale (per evitare XSS nei dati utente)
function escapeHomeHtml(s) {
  if(!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

