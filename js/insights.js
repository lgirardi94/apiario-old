// ===== FILE VERSION: 2026-05-28.9 · insights.js =====
/* ===========================================================
   INSIGHTS / ANALISI — costo miele, simulatore prezzo,
   heatmap produzione, genealogia regine, report narrativo
   =========================================================== */

function insEscape(s) {
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Anni disponibili dai dati (visite + movimenti)
function getAnniDisponibili() {
  const anni = new Set();
  (logBook||[]).forEach(e => { if(e.data) anni.add(e.data.slice(0,4)); });
  (movimentiContabili||[]).forEach(m => { if(m.data) anni.add(m.data.slice(0,4)); });
  const annoCorrente = String(new Date().getFullYear());
  anni.add(annoCorrente);
  return [...anni].filter(a => /^\d{4}$/.test(a)).sort().reverse();
}

function getAnnoAnalisi() {
  const sel = document.getElementById('analisiAnno');
  return sel && sel.value ? sel.value : String(new Date().getFullYear());
}

// ===========================================================
// CALCOLI BASE
// ===========================================================

// Produzione totale miele (kg) per un anno
function insProduzioneAnno(anno) {
  let tot = 0;
  (logBook||[]).forEach(e => {
    if(!e.data || !e.data.startsWith(anno)) return;
    (e.raccolta||[]).forEach(r => { tot += parseFloat(r.qta) || 0; });
  });
  return tot;
}

// Costo consumabili dell'anno (uscite contabilità categorie consumabili/materiale)
function insCostoConsumabili(anno) {
  let tot = 0;
  (movimentiContabili||[]).forEach(m => {
    if(!m.data || !m.data.startsWith(anno)) return;
    if(m.tipo !== 'uscita') return;
    tot += parseFloat(m.importo) || 0;
  });
  return tot;
}

// Ammortamento attrezzatura: stima dal valore di magazzino "materiale" (categoria materiale)
// ammortizzato su 7 anni (durata tipica attrezzatura apistica)
function insAmmortamento(anno) {
  const ANNI_AMMORTAMENTO = 7;
  let valoreMateriale = 0;
  (articoli||[]).forEach(a => {
    if(a.categoria !== 'materiale') return;
    const giac = typeof getGiacenzaLocale === 'function' ? getGiacenzaLocale(a.id) : 0;
    const prezzo = parseFloat(a.prezzoUnitario) || 0;
    valoreMateriale += giac * prezzo;
  });
  return valoreMateriale / ANNI_AMMORTAMENTO;
}

// ===========================================================
// 1. COSTO REALE DEL MIELE
// ===========================================================
function renderCostoMiele(anno) {
  try {
    const kpi = document.getElementById('analisiCostoKpi');
    const nota = document.getElementById('analisiCostoNota');
    if(!kpi) return;

    const consumabili = insCostoConsumabili(anno);
    const ammortamento = insAmmortamento(anno);
    const produzione = insProduzioneAnno(anno);
    const costoTot = consumabili + ammortamento;
    const costoKg = produzione > 0 ? costoTot / produzione : 0;

    const card = (label, val, color) => `
      <div class="stat-box" style="text-align:center">
        <div class="stat-num" style="${color?'color:'+color:''}">${val}</div>
        <div class="stat-label">${label}</div>
      </div>`;

    kpi.innerHTML =
      card('Consumabili', '€ ' + consumabili.toFixed(0)) +
      card('Ammortamenti', '€ ' + ammortamento.toFixed(0)) +
      card('Produzione', produzione.toFixed(0) + ' kg') +
      card('Costo / kg', produzione > 0 ? '€ ' + costoKg.toFixed(2) : '—', 'var(--brown)');

    if(nota) {
      if(produzione <= 0) {
        nota.innerHTML = `<div style="background:rgba(0,0,0,0.03);border-radius:6px;padding:0.7rem 1rem;font-size:0.88rem;color:var(--text-light)">Nessuna produzione registrata per il ${anno}. Registra le raccolte nel registro visite per vedere il costo per kg.</div>`;
      } else {
        const costo500 = costoKg * 0.5;
        nota.innerHTML = `<div style="background:var(--amber-pale);border-radius:6px;padding:0.7rem 1rem;font-size:0.9rem;color:var(--brown)">Un vasetto da 500g ti costa <strong>€ ${costo500.toFixed(2)}</strong> prima di venderlo. Sotto questo prezzo ci rimetti.</div>`;
      }
    }
  } catch(err) {
    console.error('[Insights] Errore in renderCostoMiele:', err.message);
  }
}

// ===========================================================
// 2. SIMULATORE PREZZO
// ===========================================================
function updateSimulatore() {
  try {
    const anno = getAnnoAnalisi();
    const prezzo = parseFloat(document.getElementById('simPrezzo')?.value) || 0;
    const pezzatura = parseFloat(document.getElementById('simPezzatura')?.value) || 0.5;
    const out = document.getElementById('simPrezzoOut');
    if(out) out.textContent = '€ ' + prezzo.toFixed(2).replace('.', ',');

    const produzione = insProduzioneAnno(anno);
    const costoTot = insCostoConsumabili(anno) + insAmmortamento(anno);
    const costoKg = produzione > 0 ? costoTot / produzione : 0;
    const costoVasetto = costoKg * pezzatura;

    const nVasetti = pezzatura > 0 ? Math.floor(produzione / pezzatura) : 0;
    const ricavo = prezzo * nVasetti;
    const margine = ricavo - costoTot;
    const pct = ricavo > 0 ? Math.round(margine / ricavo * 100) : 0;
    const pareggio = prezzo > 0 ? Math.ceil(costoTot / prezzo) : 0;

    const kpi = document.getElementById('analisiSimKpi');
    if(kpi) {
      const card = (label, val) => `<div class="stat-box" style="text-align:center"><div class="stat-num">${val}</div><div class="stat-label">${label}</div></div>`;
      kpi.innerHTML =
        card('Vasetti producibili', nVasetti) +
        card('Ricavo totale', '€ ' + ricavo.toLocaleString('it-IT')) +
        card('Margine', '€ ' + Math.round(margine).toLocaleString('it-IT')) +
        card('Pareggio', pareggio + ' vasetti');
    }

    const nota = document.getElementById('analisiSimNota');
    if(nota) {
      if(produzione <= 0) {
        nota.innerHTML = `<span style="color:var(--text-light)">Nessuna produzione registrata per il ${anno}.</span>`;
      } else if(prezzo <= costoVasetto) {
        nota.innerHTML = `<span style="color:var(--red)">⚠️ Sotto il costo di produzione (€ ${costoVasetto.toFixed(2)}/vasetto) — ci rimetti.</span>`;
      } else if(pct < 40) {
        nota.innerHTML = `<span style="color:var(--amber)">Margine del ${pct}% — basso. Considera un prezzo più alto.</span>`;
      } else {
        nota.innerHTML = `<span style="color:var(--green)">Margine del ${pct}% — ottimo.</span>`;
      }
    }
  } catch(err) {
    console.error('[Insights] Errore in updateSimulatore:', err.message);
  }
}

// ===========================================================
// 6. HEATMAP PRODUZIONE (arnia × mese)
// ===========================================================
function renderHeatmapProduzione(anno) {
  try {
    const container = document.getElementById('analisiHeatmap');
    if(!container) return;

    const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    // Raccogli produzione per arnia per mese
    const datiPerArnia = {}; // arniaId -> [12 valori]
    let maxVal = 0;

    (logBook||[]).forEach(e => {
      if(!e.data || !e.data.startsWith(anno)) return;
      const mese = parseInt(e.data.slice(5,7), 10) - 1;
      if(isNaN(mese) || mese < 0 || mese > 11) return;
      const kg = (e.raccolta||[]).reduce((s,r) => s + (parseFloat(r.qta)||0), 0);
      if(kg <= 0) return;
      if(!datiPerArnia[e.arniaId]) datiPerArnia[e.arniaId] = new Array(12).fill(0);
      datiPerArnia[e.arniaId][mese] += kg;
      if(datiPerArnia[e.arniaId][mese] > maxVal) maxVal = datiPerArnia[e.arniaId][mese];
    });

    const arnieConProd = Object.keys(datiPerArnia);
    if(arnieConProd.length === 0) {
      container.innerHTML = `<div style="text-align:center;color:var(--text-light);font-style:italic;padding:1.5rem">Nessuna produzione registrata per il ${anno}.</div>`;
      return;
    }

    // Mostra solo mesi con almeno una produzione (per compattezza), min Mar-Set
    const mesiAttivi = [];
    for(let m=0; m<12; m++) {
      const haProd = arnieConProd.some(aid => datiPerArnia[aid][m] > 0);
      if(haProd) mesiAttivi.push(m);
    }
    if(mesiAttivi.length === 0) return;

    const col = (v) => {
      if(v === 0) return 'rgba(0,0,0,0.03)';
      const r = v / maxVal;
      if(r < 0.2) return '#EAF3DE';
      if(r < 0.4) return '#C0DD97';
      if(r < 0.6) return '#97C459';
      if(r < 0.8) return '#639922';
      return '#3B6D11';
    };
    const txtCol = (v) => v === 0 ? 'transparent' : (v/maxVal > 0.5 ? '#fff' : '#27500A');

    // Celle a larghezza fissa (max 52px) così restano compatte e quadrate anche con pochi dati
    const CELL = 48;
    let html = `<div style="display:grid;grid-template-columns:auto repeat(${mesiAttivi.length},${CELL}px);gap:4px;align-items:center;width:max-content">`;
    html += '<div></div>';
    mesiAttivi.forEach(m => { html += `<div style="text-align:center;font-size:0.72rem;color:var(--text-light);font-weight:600">${mesi[m]}</div>`; });

    // Ordina arnie per numero
    arnieConProd.sort((a,b) => {
      const na = arnie.find(x=>x.id===a), nb = arnie.find(x=>x.id===b);
      return (parseInt(na?.num)||0) - (parseInt(nb?.num)||0);
    });

    arnieConProd.forEach(aid => {
      const arnia = arnie.find(x => x.id === aid);
      const label = arnia ? '#'+arnia.num : '?';
      html += `<div style="font-size:0.8rem;color:var(--text);font-weight:600;white-space:nowrap;padding-right:6px">${label}</div>`;
      mesiAttivi.forEach(m => {
        const v = datiPerArnia[aid][m];
        html += `<div title="${label} · ${mesi[m]}: ${v.toFixed(1)} kg" style="width:${CELL}px;height:${CELL}px;background:${col(v)};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:${txtCol(v)}">${v>0?(v%1===0?v:v.toFixed(1)):''}</div>`;
      });
    });
    html += '</div>';

    // Legenda
    html += `<div style="display:flex;align-items:center;gap:6px;margin-top:12px;font-size:0.75rem;color:var(--text-light)">
      <span>meno</span>
      <span style="width:18px;height:12px;background:#EAF3DE;border-radius:2px"></span>
      <span style="width:18px;height:12px;background:#C0DD97;border-radius:2px"></span>
      <span style="width:18px;height:12px;background:#97C459;border-radius:2px"></span>
      <span style="width:18px;height:12px;background:#639922;border-radius:2px"></span>
      <span style="width:18px;height:12px;background:#3B6D11;border-radius:2px"></span>
      <span>più miele (kg)</span>
    </div>`;

    container.innerHTML = html;
  } catch(err) {
    console.error('[Insights] Errore in renderHeatmap:', err.message);
  }
}

// ===========================================================
// 7. GENEALOGIA REGINE — sempre popolata, con origine regina e telai
// ===========================================================
// === Modale genealogia ingrandita ===
function apriGenealogiaModale() {
  try {
    const mod = document.getElementById('genealogiaModale');
    const body = document.getElementById('genealogiaModaleBody');
    if(!mod || !body) return;
    // sposta la modale come figlia diretta del <body> per evitare che uno stacking
    // context di un contenitore la "intrappoli" sotto la barra/header dell'app
    if(mod.parentElement !== document.body) document.body.appendChild(mod);
    body.innerHTML = buildGenealogiaTree(arnie, logBook, { idPrefix: 'genModal' });
    mod.style.display = 'block';
    document.body.style.overflow = 'hidden';
    // disegna dopo che la modale è visibile e ha dimensioni
    setTimeout(() => drawGenealogiaTree('genModal'), 120);
  } catch(err) {
    console.error('[Insights] Errore apriGenealogiaModale:', err.message);
  }
}
function chiudiGenealogiaModale() {
  const mod = document.getElementById('genealogiaModale');
  if(mod) mod.style.display = 'none';
  document.body.style.overflow = '';
}

function renderGenealogia(anno) {
  try {
    const container = document.getElementById('analisiGenealogia');
    if(!container) return;
    container.innerHTML = buildGenealogiaMinimale(arnie, logBook);
  } catch(err) {
    console.error('[Insights] Errore in renderGenealogia:', err.message);
    const c = document.getElementById('analisiGenealogia');
    if(c) c.innerHTML = `<div style="color:var(--text-light);font-style:italic;padding:1rem">Impossibile mostrare la genealogia.</div>`;
  }
}

// === Vista MINIMALE della genealogia (per il riquadro Insights, stretto) ===
// Albero per indentazione: leggero, niente canvas/linee SVG, sta in qualsiasi larghezza.
// La vista completa a grafo è disponibile nella modale "Apri ingrandito".
function buildGenealogiaMinimale(arnieInput, logBookInput) {
  try {
    const arnieAll = (arnieInput || []).filter(a => !a.annoDismissione);
    if (arnieAll.length === 0) {
      return `<div style="text-align:center;color:var(--text-light);font-style:italic;padding:1rem">Nessuna arnia attiva da mostrare.</div>`;
    }

    const prodArnia = {};
    (logBookInput || []).forEach(e => {
      const kg = (e.raccolta || []).reduce((s, r) => s + (parseFloat(r.qta) || 0), 0);
      prodArnia[e.arniaId] = (prodArnia[e.arniaId] || 0) + kg;
    });

    const byId = {};
    arnieAll.forEach(a => { byId[a.id] = a; });
    const nomeArnia = (id) => { const a = byId[id]; return a ? '#' + a.num + (a.nome ? ' ' + a.nome : '') : '?'; };
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // relazioni
    const madreReginaDi = {};
    arnieAll.forEach(a => {
      if (a.reginaOrigine === 'inserita' && a.reginaArniaSrc && byId[a.reginaArniaSrc]) madreReginaDi[a.id] = a.reginaArniaSrc;
    });
    const telaiDi = {};
    arnieAll.forEach(a => {
      const counts = {};
      (a.telainiOrigine || []).forEach(t => {
        if (t.arniaSrcId && t.arniaSrcId !== a.id && byId[t.arniaSrcId]) counts[t.arniaSrcId] = (counts[t.arniaSrcId] || 0) + 1;
      });
      const list = Object.keys(counts).map(src => ({ srcId: src, count: counts[src] }));
      if (list.length) telaiDi[a.id] = list;
    });

    // figlie-da-regina per costruire l'albero annidato
    const figlieRegina = {};
    Object.keys(madreReginaDi).forEach(figliaId => {
      const mid = madreReginaDi[figliaId];
      (figlieRegina[mid] = figlieRegina[mid] || []).push(figliaId);
    });

    const origineInfo = {
      allevata:   { icon: '🥚', col: '#639922' },
      inserita:   { icon: '👑', col: '#BA7517' },
      acquistata: { icon: '🛒', col: '#4A6FA5' },
    };

    const pallino = (anno) => {
      if (!anno) return '';
      try { return (typeof getReginaPallino === 'function' ? getReginaPallino(anno, 8) : '') + ' '; }
      catch (e) { return ''; }
    };

    // riga singola arnia (con rientro = livello)
    const renderRiga = (a, liv) => {
      const oi = origineInfo[a.reginaOrigine] || origineInfo.allevata;
      const reg = a.reginaAnno ? (pallino(a.reginaAnno) + a.reginaAnno) : '';
      const kg = prodArnia[a.id] || 0;
      const kgTxt = kg > 0 ? ` · <span style="color:${kg>=15?'#27500A':(kg>=8?'#7a4a08':'var(--text-light)')};font-weight:600">${kg.toFixed(0)}kg</span>` : '';
      // provenienze in testo
      const prov = [];
      if (madreReginaDi[a.id]) prov.push(`👑 regina da ${esc(nomeArnia(madreReginaDi[a.id]))}`);
      (telaiDi[a.id] || []).forEach(t => prov.push(`🪵 ${t.count} ${t.count>1?'telaini':'telaino'} da ${esc(nomeArnia(t.srcId))}`));
      const provTxt = prov.length ? `<div style="font-size:0.72rem;color:var(--text-light);margin-top:0.1rem">${prov.join(' · ')}</div>` : '';
      return `
        <div style="margin-left:${liv*1.3}rem;margin-bottom:0.45rem;padding-left:0.6rem;border-left:3px solid ${oi.col}">
          <div style="font-size:0.9rem;color:var(--brown)"><span>${oi.icon}</span> <strong>#${esc(a.num)}</strong>${a.nome?' '+esc(a.nome):''}${reg?` <span style="color:var(--text-light);font-weight:400">· ${reg}</span>`:''}${kgTxt}</div>
          ${provTxt}
        </div>`;
    };

    // albero annidato: parto dalle radici (chi non ha madre-regina), scendo nelle figlie-da-regina
    const visited = new Set();
    const renderNodo = (id, liv) => {
      if (visited.has(id)) return '';
      visited.add(id);
      let h = renderRiga(byId[id], liv);
      (figlieRegina[id] || [])
        .sort((x, y) => (prodArnia[y] || 0) - (prodArnia[x] || 0))
        .forEach(fid => { h += renderNodo(fid, liv + 1); });
      return h;
    };

    const radici = arnieAll.filter(a => !madreReginaDi[a.id]).sort((a, b) => (prodArnia[b.id] || 0) - (prodArnia[a.id] || 0));
    let html = '';
    radici.forEach(r => { html += renderNodo(r.id, 0); });
    // eventuali rimaste (cicli) in fondo
    arnieAll.forEach(a => { if (!visited.has(a.id)) html += renderRiga(a, 0); });

    const legenda = `<div style="display:flex;flex-wrap:wrap;gap:0.7rem;margin-bottom:0.8rem;font-size:0.74rem;color:var(--text-light)">
      <span>🥚 allevata</span><span>👑 inserita</span><span>🛒 acquistata</span><span>🪵 telai ricevuti</span>
    </div>`;

    const nota = `<div style="margin-top:0.8rem;font-size:0.76rem;color:var(--text-light);font-style:italic">Vista compatta · usa "🔍 Apri ingrandito" per l'albero completo con le linee di parentela.</div>`;

    return legenda + html + nota;
  } catch (err) {
    console.error('[Genealogia] Errore vista minimale:', err.message);
    return `<div style="color:var(--text-light);font-style:italic;padding:1rem">Impossibile mostrare la genealogia.</div>`;
  }
}

// ===========================================================
// 5. REPORT NARRATIVO
// ===========================================================
const MESI_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

function generaNarrativaArnia(arnia, anno) {
  try {
    const visite = (logBook||[])
      .filter(e => e.arniaId === arnia.id && e.data && e.data.startsWith(anno))
      .sort((a,b) => a.data.localeCompare(b.data));

    if(visite.length === 0) return null;

    const frasi = [];
    const nome = arnia.nome ? arnia.nome : ('#' + arnia.num);

    // Prima visita
    const prima = visite[0];
    const meseInizio = MESI_IT[parseInt(prima.data.slice(5,7),10)-1];
    if(prima.ispezione && prima.ispezione.telaini) {
      const tel = parseInt(prima.ispezione.telaini,10);
      if(tel <= 4) frasi.push(`È iniziata l'anno debole a ${meseInizio}, con appena ${tel} telaini.`);
      else if(tel >= 8) frasi.push(`A ${meseInizio} era già forte, con ${tel} telaini occupati.`);
      else frasi.push(`A ${meseInizio} si presentava in condizioni discrete (${tel} telaini).`);
    } else {
      frasi.push(`Prima visita dell'anno a ${meseInizio}.`);
    }

    // Produzione
    const prodTot = visite.reduce((s,e) => s + (e.raccolta||[]).reduce((ss,r)=>ss+(parseFloat(r.qta)||0),0), 0);
    if(prodTot > 0) {
      // Trova il tipo di miele prevalente
      const perTipo = {};
      visite.forEach(e => (e.raccolta||[]).forEach(r => {
        const art = (articoli||[]).find(a=>a.id===r.articoloId);
        const nm = art ? art.nome : 'miele';
        perTipo[nm] = (perTipo[nm]||0) + (parseFloat(r.qta)||0);
      }));
      const tipoMax = Object.keys(perTipo).sort((a,b)=>perTipo[b]-perTipo[a])[0];
      frasi.push(`Ha prodotto <strong>${prodTot.toFixed(1)} kg</strong>${tipoMax?' (soprattutto '+insEscape(tipoMax)+')':''}.`);
    }

    // Trattamenti
    const tratt = visite.filter(e => (getTipi(e)||[]).includes('trattamento'));
    if(tratt.length > 0) {
      const ultimo = tratt[tratt.length-1];
      const meseT = MESI_IT[parseInt(ultimo.data.slice(5,7),10)-1];
      const prod = ultimo.trattamento && ultimo.trattamento.prodotto ? ultimo.trattamento.prodotto : '';
      frasi.push(`Trattata contro la varroa a ${meseT}${prod?' con '+insEscape(prod):''}.`);
    }

    // Sciamatura / celle reali
    const conCelle = visite.filter(e => e.ispezione && e.ispezione.celleReali && parseInt(e.ispezione.celleReali,10) > 0);
    if(conCelle.length > 0) {
      frasi.push(`Mostrati segni di sciamatura in ${conCelle.length} ${conCelle.length>1?'visite':'visita'} — tenuta sotto controllo.`);
    }

    // Chiusura
    frasi.push(`In totale ${visite.length} ${visite.length>1?'visite':'visita'} durante l'anno.`);

    return { nome: '#'+arnia.num+(arnia.nome?' — '+arnia.nome:''), testo: frasi.join(' '), visite: visite.length, prod: prodTot };
  } catch(err) {
    console.error('[Insights] Errore generaNarrativaArnia:', err.message);
    return null;
  }
}

function renderNarrativo(anno) {
  try {
    const container = document.getElementById('analisiNarrativo');
    if(!container) return;

    const racconti = [];
    (arnie||[]).filter(a => !a.annoDismissione).forEach(a => {
      const n = generaNarrativaArnia(a, anno);
      if(n) racconti.push(n);
    });

    if(racconti.length === 0) {
      container.innerHTML = `<div style="background:rgba(0,0,0,0.03);border-radius:6px;padding:1rem;text-align:center;color:var(--text-light);font-style:italic">Nessuna visita registrata nel ${anno} per generare i racconti.</div>`;
      return;
    }

    racconti.sort((a,b) => b.prod - a.prod);

    container.innerHTML = racconti.map(r => `
      <div style="background:white;border:1px solid var(--cream-dark);border-radius:8px;padding:1.1rem 1.3rem;margin-bottom:0.8rem">
        <div style="font-weight:600;font-size:1rem;color:var(--brown);margin-bottom:0.5rem">🏠 ${insEscape(r.nome)}</div>
        <p style="font-family:'Crimson Pro',serif;font-size:0.98rem;line-height:1.7;color:var(--text);margin:0">${r.testo}</p>
        <div style="margin-top:0.6rem;font-size:0.78rem;color:var(--text-light)">${r.visite} visite · ${r.prod.toFixed(1)} kg prodotti</div>
      </div>
    `).join('');
  } catch(err) {
    console.error('[Insights] Errore in renderNarrativo:', err.message);
  }
}

// ===========================================================
// ORCHESTRATORE
// ===========================================================
function renderAnalisi() {
  try {
    // Popola dropdown anni se vuoto
    const sel = document.getElementById('analisiAnno');
    if(sel && sel.options.length === 0) {
      const anni = getAnniDisponibili();
      sel.innerHTML = anni.map(a => `<option value="${a}">${a}</option>`).join('');
    }
    const anno = getAnnoAnalisi();
    const lbl = document.getElementById('analisiAnnoLabel');
    if(lbl) lbl.textContent = anno;

    renderCostoMiele(anno);
    updateSimulatore();
    renderHeatmapProduzione(anno);
    renderGenealogia(anno);
    renderNarrativo(anno);
  } catch(err) {
    console.error('[Insights] Errore in renderAnalisi:', err.message);
  }
}

// ===========================================================
// EXPORT REPORT ANNUALE (stampabile / PDF via window.print)
// ===========================================================
function esportaReportAnnuale() {
  try {
    const anno = getAnnoAnalisi();

    // --- Raccogli tutti i dati ---
    const consumabili = insCostoConsumabili(anno);
    const ammortamento = insAmmortamento(anno);
    const produzione = insProduzioneAnno(anno);
    const costoTot = consumabili + ammortamento;
    const costoKg = produzione > 0 ? costoTot / produzione : 0;

    // Entrate/uscite contabilità anno
    let entrate = 0, uscite = 0;
    (movimentiContabili||[]).forEach(m => {
      if(!m.data || !m.data.startsWith(anno)) return;
      if(m.tipo === 'entrata') entrate += parseFloat(m.importo)||0;
      else uscite += parseFloat(m.importo)||0;
    });

    // Visite totali anno
    const visiteAnno = (logBook||[]).filter(e => e.data && e.data.startsWith(anno));

    // Arnie attive
    const arnieAttive = (arnie||[]).filter(a => !a.annoDismissione);

    // Trattamenti dell'anno (per sezione sanitaria)
    const trattamenti = visiteAnno.filter(e => (getTipi(e)||[]).includes('trattamento'));

    // Produzione per arnia
    const prodPerArnia = {};
    visiteAnno.forEach(e => {
      const kg = (e.raccolta||[]).reduce((s,r)=>s+(parseFloat(r.qta)||0),0);
      if(kg>0) prodPerArnia[e.arniaId] = (prodPerArnia[e.arniaId]||0)+kg;
    });

    // Racconti narrativi
    const racconti = [];
    arnieAttive.forEach(a => { const n = generaNarrativaArnia(a, anno); if(n) racconti.push(n); });
    racconti.sort((a,b)=>b.prod-a.prod);

    // --- Costruisci HTML report ---
    const oggi = new Date().toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' });

    let html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Report Annuale Apiario ${anno}</title>
    <style>
      @page { margin: 1.5cm; }
      * { box-sizing: border-box; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #2A1A05; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 1rem; }
      h1 { font-size: 1.8rem; color: #5C3A10; border-bottom: 3px solid #C8860A; padding-bottom: 0.5rem; margin-bottom: 0.3rem; }
      h2 { font-size: 1.3rem; color: #6B4A20; margin-top: 2rem; border-bottom: 1px solid #E0D0B0; padding-bottom: 0.3rem; }
      h3 { font-size: 1.05rem; color: #5C3A10; margin-bottom: 0.3rem; }
      .sub { color: #8A6D3B; font-style: italic; margin-top: 0; }
      .kpi-row { display: flex; flex-wrap: wrap; gap: 0.8rem; margin: 1rem 0; }
      .kpi { flex: 1; min-width: 120px; border: 1px solid #E0D0B0; border-radius: 6px; padding: 0.7rem 1rem; text-align: center; }
      .kpi-num { font-size: 1.4rem; font-weight: bold; color: #5C3A10; }
      .kpi-lbl { font-size: 0.78rem; color: #8A6D3B; text-transform: uppercase; letter-spacing: 0.04em; }
      table { width: 100%; border-collapse: collapse; margin: 0.8rem 0; font-size: 0.92rem; }
      th, td { border: 1px solid #E0D0B0; padding: 0.4rem 0.6rem; text-align: left; }
      th { background: #FAEEDA; color: #6B4A20; }
      .narr { background: #FBF6EC; border-left: 3px solid #C8860A; border-radius: 0 4px 4px 0; padding: 0.8rem 1rem; margin-bottom: 0.7rem; }
      .narr-nome { font-weight: bold; color: #5C3A10; margin-bottom: 0.3rem; }
      .nota { background: #FAEEDA; border-radius: 6px; padding: 0.7rem 1rem; font-size: 0.92rem; }
      .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #E0D0B0; font-size: 0.8rem; color: #8A6D3B; text-align: center; }
      @media print { body { padding: 0; } h2 { page-break-after: avoid; } .narr, table { page-break-inside: avoid; } }
    </style></head><body>`;

    html += `<h1>🐝 Report Annuale Apiario — ${anno}</h1>
    <p class="sub">Generato il ${oggi} · ${arnieAttive.length} arnie attive · ${visiteAnno.length} visite registrate</p>`;

    // SEZIONE 1: Economia
    html += `<h2>💰 Bilancio economico</h2>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-num">€ ${entrate.toFixed(0)}</div><div class="kpi-lbl">Entrate</div></div>
      <div class="kpi"><div class="kpi-num">€ ${uscite.toFixed(0)}</div><div class="kpi-lbl">Uscite</div></div>
      <div class="kpi"><div class="kpi-num">€ ${(entrate-uscite).toFixed(0)}</div><div class="kpi-lbl">Saldo</div></div>
    </div>`;

    // Valore di magazzino (patrimonio attuale)
    let valoreMag = 0;
    (articoli||[]).forEach(a => {
      const giac = typeof getGiacenzaLocale === 'function' ? getGiacenzaLocale(a.id) : 0;
      valoreMag += giac * (parseFloat(a.prezzoUnitario) || 0);
    });
    if(valoreMag > 0) {
      html += `<p class="sub">Valore stimato del magazzino a oggi: <strong>€ ${valoreMag.toFixed(2)}</strong> (giacenze × prezzo unitario)</p>`;
    }

    // Ripartizione spese per categoria
    const spesePerCat = {};
    (movimentiContabili||[]).forEach(m => {
      if(!m.data || !m.data.startsWith(anno) || m.tipo !== 'uscita') return;
      const cats = Array.isArray(m.categorie) && m.categorie.length ? m.categorie : ['altro_costo'];
      // Attribuisco l'intero importo alla prima categoria
      const cat = cats[0];
      spesePerCat[cat] = (spesePerCat[cat] || 0) + (parseFloat(m.importo)||0);
    });
    const catKeys = Object.keys(spesePerCat).sort((a,b)=>spesePerCat[b]-spesePerCat[a]);
    if(catKeys.length > 0) {
      const catLabelMap = {};
      [...CAT_ENTRATA, ...CAT_USCITA].forEach(c => catLabelMap[c.id] = c.label);
      html += `<h3>Dove vanno le spese</h3><table><tr><th>Categoria</th><th>Importo</th><th>%</th></tr>`;
      catKeys.forEach(c => {
        const imp = spesePerCat[c];
        const pct = uscite > 0 ? Math.round(imp/uscite*100) : 0;
        html += `<tr><td>${catLabelMap[c]||c}</td><td>€ ${imp.toFixed(2)}</td><td>${pct}%</td></tr>`;
      });
      html += `</table>`;
    }

    // SEZIONE 2: Costo del miele
    html += `<h2>🍯 Costo di produzione del miele</h2>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-num">€ ${consumabili.toFixed(0)}</div><div class="kpi-lbl">Consumabili</div></div>
      <div class="kpi"><div class="kpi-num">€ ${ammortamento.toFixed(0)}</div><div class="kpi-lbl">Ammortamenti</div></div>
      <div class="kpi"><div class="kpi-num">${produzione.toFixed(0)} kg</div><div class="kpi-lbl">Produzione</div></div>
      <div class="kpi"><div class="kpi-num">${produzione>0?'€ '+costoKg.toFixed(2):'—'}</div><div class="kpi-lbl">Costo / kg</div></div>
    </div>`;
    if(produzione > 0) {
      html += `<div class="nota">Un vasetto da 500g ti costa <strong>€ ${(costoKg*0.5).toFixed(2)}</strong> di sola produzione. Per coprire i costi a € ${(costoKg*0.5).toFixed(2)}/vasetto dovresti venderne ${Math.ceil(costoTot/(costoKg*0.5||1))}.</div>`;
    }

    // SEZIONE 3: Produzione per arnia
    if(Object.keys(prodPerArnia).length > 0) {
      html += `<h2>📊 Produzione per arnia</h2><table><tr><th>Arnia</th><th>Produzione ${anno}</th></tr>`;
      Object.keys(prodPerArnia)
        .sort((a,b)=>prodPerArnia[b]-prodPerArnia[a])
        .forEach(aid => {
          const a = arnie.find(x=>x.id===aid);
          html += `<tr><td>#${a?a.num:'?'}${a&&a.nome?' — '+insEscape(a.nome):''}</td><td>${prodPerArnia[aid].toFixed(1)} kg</td></tr>`;
        });
      html += `</table>`;
    }

    // SEZIONE 4: Registro sanitario (trattamenti)
    html += `<h2>💊 Registro trattamenti sanitari</h2>`;
    if(trattamenti.length > 0) {
      html += `<table><tr><th>Data</th><th>Arnia</th><th>Prodotto</th><th>Dosaggio</th></tr>`;
      trattamenti.sort((a,b)=>a.data.localeCompare(b.data)).forEach(t => {
        const prod = t.trattamento && t.trattamento.prodotto ? insEscape(t.trattamento.prodotto) : '—';
        const dos = t.trattamento && t.trattamento.dosaggio ? insEscape(t.trattamento.dosaggio) : '—';
        html += `<tr><td>${formatDate(t.data)}</td><td>${insEscape(t.arniaNome||'—')}</td><td>${prod}</td><td>${dos}</td></tr>`;
      });
      html += `</table>`;
    } else {
      html += `<p class="sub">Nessun trattamento registrato nel ${anno}.</p>`;
    }

    // SEZIONE 5: Report narrativo
    if(racconti.length > 0) {
      html += `<h2>📖 L'anno delle tue arnie</h2>`;
      racconti.forEach(r => {
        html += `<div class="narr"><div class="narr-nome">🏠 ${insEscape(r.nome)}</div><div>${r.testo}</div></div>`;
      });
    }

    html += `<div class="footer">Il Mio Apiario · Report generato automaticamente · ${oggi}</div>`;
    html += `</body></html>`;

    // Apri in nuova finestra e lancia stampa
    const win = window.open('', '_blank');
    if(!win) {
      alert('Abilita i popup per esportare il report, oppure riprova.');
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);

    if(typeof showImportToast === 'function') showImportToast('📄 Report annuale generato');
  } catch(err) {
    console.error('[Insights] Errore in esportaReportAnnuale:', err.message);
    alert('Errore nella generazione del report: ' + err.message);
  }
}

// === GENEALOGIA AD ALBERO/GRAFO (riutilizzabile: Insights + Report) ===
// Costruisce il grafo dalle arnie e lo disegna come albero con linee anti-sovrapposizione.
// Ritorna una stringa HTML che include il canvas, le card e uno <script> che disegna le linee
// leggendo i bordi reali delle card (con ridisegno al resize).
//
// Parametri:
//   arnieInput  : array arnie (userà solo le attive)
//   logBookInput: array registro visite (per kg prodotti)
//   opts        : { idPrefix: stringa unica per non collidere con altri grafi nella pagina,
//                   forReport: bool (se true, layout statico senza listener resize) }
function buildGenealogiaTree(arnieInput, logBookInput, opts) {
  opts = opts || {};
  const PFX = opts.idPrefix || 'gen';
  const arnieAll = (arnieInput || []).filter(a => !a.annoDismissione);

  if (arnieAll.length === 0) {
    return `<div style="text-align:center;color:var(--text-light);font-style:italic;padding:1rem">Nessuna arnia attiva da mostrare.</div>`;
  }

  // --- Produzione storica per kg (per evidenziare le linee migliori) ---
  const prodArnia = {};
  (logBookInput || []).forEach(e => {
    const kg = (e.raccolta || []).reduce((s, r) => s + (parseFloat(r.qta) || 0), 0);
    prodArnia[e.arniaId] = (prodArnia[e.arniaId] || 0) + kg;
  });

  const byId = {};
  arnieAll.forEach(a => { byId[a.id] = a; });
  const nomeArnia = (id) => { const a = byId[id]; return a ? '#' + a.num + (a.nome ? ' ' + a.nome : '') : '?'; };

  // --- Relazioni regina (madre -> figlie) ---
  const figlieRegina = {};
  const madreReginaDi = {}; // figliaId -> madreId
  arnieAll.forEach(a => {
    if (a.reginaOrigine === 'inserita' && a.reginaArniaSrc && byId[a.reginaArniaSrc]) {
      (figlieRegina[a.reginaArniaSrc] = figlieRegina[a.reginaArniaSrc] || []).push(a.id);
      madreReginaDi[a.id] = a.reginaArniaSrc;
    }
  });

  // --- Contributi telai: figlia -> [{srcId, count}] (solo da arnie note e diverse da sé) ---
  const telaiDi = {};
  arnieAll.forEach(a => {
    const counts = {};
    (a.telainiOrigine || []).forEach(t => {
      if (t.arniaSrcId && t.arniaSrcId !== a.id && byId[t.arniaSrcId]) {
        counts[t.arniaSrcId] = (counts[t.arniaSrcId] || 0) + 1;
      }
    });
    const list = Object.keys(counts).map(src => ({ srcId: src, count: counts[src] }));
    if (list.length) telaiDi[a.id] = list;
  });

  // --- Assegna i LIVELLI (generazioni) in base alla PROVENIENZA ---
  // Una figlia generata da arnie esistenti (regina inserita OPPURE telaini ricevuti) sta SOTTO di esse.
  // livello = (max livello tra tutte le fonti) + 1. Radice (nessuna fonte) = 0.
  const fontiDi = {};
  arnieAll.forEach(a => {
    const set = new Set();
    if (madreReginaDi[a.id]) set.add(madreReginaDi[a.id]);
    (telaiDi[a.id] || []).forEach(t => set.add(t.srcId));
    fontiDi[a.id] = [...set];
  });
  const livello = {};
  function calcLivello(id, guard) {
    if (livello[id] != null) return livello[id];   // cache (precede l'anti-ciclo)
    if (guard.has(id)) return 0;                   // anti-ciclo
    guard.add(id);
    const fonti = fontiDi[id] || [];
    if (fonti.length === 0) { livello[id] = 0; }
    else {
      let maxL = 0;
      fonti.forEach(f => { maxL = Math.max(maxL, calcLivello(f, guard) + 1); });
      livello[id] = maxL;
    }
    return livello[id];
  }
  arnieAll.forEach(a => calcLivello(a.id, new Set()));

  // raggruppa per livello
  const perLivello = {};
  arnieAll.forEach(a => { (perLivello[livello[a.id]] = perLivello[livello[a.id]] || []).push(a); });
  const livelliOrd = Object.keys(perLivello).map(Number).sort((x, y) => x - y);

  // ordina ogni livello: per kg desc (le più produttive a sinistra)
  livelliOrd.forEach(L => {
    perLivello[L].sort((a, b) => (prodArnia[b.id] || 0) - (prodArnia[a.id] || 0));
  });

  // --- Geometria ---
  const CARD_W = 178;
  const GAP_X = 70;      // spazio orizzontale tra card
  const ROW_H = 230;     // spazio verticale tra inizio generazioni (card + banda linee)
  const PAD = 24;

  // posizione X di ogni card (per indice nella riga)
  const colCount = Math.max(...livelliOrd.map(L => perLivello[L].length));
  const canvasW = PAD * 2 + colCount * CARD_W + (colCount - 1) * GAP_X;

  // mappa id -> {x, y, row, col}
  const pos = {};
  livelliOrd.forEach((L, rowIdx) => {
    const row = perLivello[L];
    // centra la riga
    const rowW = row.length * CARD_W + (row.length - 1) * GAP_X;
    const startX = (canvasW - rowW) / 2;
    row.forEach((a, colIdx) => {
      pos[a.id] = {
        x: startX + colIdx * (CARD_W + GAP_X),
        y: PAD + rowIdx * ROW_H,
        row: rowIdx, col: colIdx
      };
    });
  });
  const canvasH = PAD * 2 + livelliOrd.length * ROW_H;

  // --- Info origine per le card ---
  const origineInfo = {
    allevata:   { icon: '🥚', label: 'allevata sul posto', col: '#639922', cls: 'gt-allevata' },
    inserita:   { icon: '👑', label: 'regina inserita',     col: '#BA7517', cls: 'gt-inserita' },
    acquistata: { icon: '🛒', label: 'regina acquistata',   col: '#4A6FA5', cls: 'gt-acquistata' },
  };

  // pallino anno regina (se la funzione globale esiste)
  const pallino = (anno) => {
    if (!anno) return '';
    try { return (typeof getReginaPallino === 'function' ? getReginaPallino(anno, 9) : '') + ' '; }
    catch (e) { return ''; }
  };

  const esc = (s) => {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // --- HTML delle card (posizionate assolute) ---
  let cardsHtml = '';
  arnieAll.forEach(a => {
    const p = pos[a.id];
    const oi = origineInfo[a.reginaOrigine] || origineInfo.allevata;
    const reg = a.reginaAnno ? (pallino(a.reginaAnno) + a.reginaAnno) : '';
    const kg = prodArnia[a.id] || 0;
    const kgCls = kg >= 15 ? 'hi' : (kg >= 8 ? 'mid' : '');
    const kgHtml = kg > 0 ? `<span class="gt-kg ${kgCls}">${kg.toFixed(0)} kg</span>` : '';

    // righe "riceve da"
    let riceveRows = '';
    if (madreReginaDi[a.id]) {
      riceveRows += `<div class="gt-rrow"><span class="gt-pill gt-pill-reg">👑 regina</span><span class="gt-from">da ${esc(nomeArnia(madreReginaDi[a.id]))}</span></div>`;
    }
    (telaiDi[a.id] || []).forEach(t => {
      riceveRows += `<div class="gt-rrow"><span class="gt-pill gt-pill-telai">🪵 ${t.count} ${t.count > 1 ? 'telaini' : 'telaino'}</span><span class="gt-from">da ${esc(nomeArnia(t.srcId))}</span></div>`;
    });
    const riceveBlock = riceveRows ? `<div class="gt-riceve">${riceveRows}</div>` : '';

    // dettaglio origine compatto
    let detOrigine = oi.label;
    if (a.reginaOrigine === 'acquistata' && a.reginaFornitore) detOrigine = 'acquistata · ' + esc(a.reginaFornitore);

    cardsHtml += `
      <div class="gt-card ${oi.cls}" id="${PFX}-card-${a.id}" style="left:${p.x}px;top:${p.y}px">
        <div class="gt-head">
          <div class="gt-toprow"><span class="gt-ico">${oi.icon}</span><span class="gt-num">#${a.num}</span></div>
          ${a.nome ? `<div class="gt-nm">${esc(a.nome)}</div>` : ''}
          <div class="gt-det">${reg ? reg + ' · ' : ''}${detOrigine}</div>
          ${kgHtml}
        </div>
        ${riceveBlock}
      </div>`;
  });

  // --- Connessioni (per il JS di disegno) ---
  // ogni conn: from, to, tipo, label, count
  const conns = [];
  arnieAll.forEach(a => {
    // regina
    if (madreReginaDi[a.id]) {
      conns.push({ from: madreReginaDi[a.id], to: a.id, tipo: 'regina', label: '👑 regina' });
    }
    // telai
    (telaiDi[a.id] || []).forEach(t => {
      conns.push({ from: t.srcId, to: a.id, tipo: 'telai', label: `🪵 ${t.count} ${t.count > 1 ? 'telaini' : 'telaino'}` });
    });
  });

  // suggerimento linea migliore
  let migliore = null, maxProd = 0;
  Object.keys(figlieRegina).forEach(mid => {
    const tot = figlieRegina[mid].reduce((s, fid) => s + (prodArnia[fid] || 0), 0);
    if (tot > maxProd) { maxProd = tot; migliore = mid; }
  });
  const suggerimento = (migliore && maxProd > 0)
    ? `<div class="gt-hint">💡 La linea di <strong>${esc(nomeArnia(migliore))}</strong> dà le figlie più produttive: ottima per allevare nuove regine.</div>`
    : '';

  // legenda
  const legenda = `
    <div class="gt-legenda">
      <span class="gt-leg"><span class="gt-sw gt-sw-reg"></span> discendenza per <strong>regina</strong></span>
      <span class="gt-leg"><span class="gt-sw gt-sw-telai"></span> contributo di <strong>solo telaini</strong></span>
      <span class="gt-leg">🥚 allevata · 👑 inserita · 🛒 acquistata</span>
    </div>`;

  // Registro dati per il disegno (la funzione di disegno è globale, vedi drawGenealogiaTree)
  if (!window._gtData) window._gtData = {};
  window._gtData[PFX] = { conns: conns, forReport: !!opts.forReport };

  // wrapper completo (NESSUNO <script> qui: via innerHTML non verrebbe eseguito;
  // il disegno lo lancia il chiamante con drawGenealogiaTree(PFX))
  return `
    ${legenda}
    <div style="overflow-x:auto;overflow-y:hidden">
      <div class="gt-canvas" id="${PFX}-canvas" style="position:relative;width:${canvasW}px;height:${canvasH}px;min-width:100%">
        <svg id="${PFX}-svg" style="position:absolute;inset:0;width:${canvasW}px;height:${canvasH}px;overflow:visible;pointer-events:none;z-index:1"></svg>
        ${cardsHtml}
      </div>
    </div>
    ${suggerimento}`;
}

// === Disegno linee del grafo genealogico (globale, riusato da Insights e Report) ===
// Legge i bordi reali delle card e traccia le linee con routing anti-sovrapposizione.
function drawGenealogiaTree(PFX) {
  try {
    if (!window._gtData || !window._gtData[PFX]) return;
    const CONNS = window._gtData[PFX].conns;
    const canvas = document.getElementById(PFX + '-canvas');
    const svg = document.getElementById(PFX + '-svg');
    if (!canvas || !svg) return;
    const cr = canvas.getBoundingClientRect();
    if (cr.width === 0) return; // non ancora visibile

    function rectOf(id) { const el = document.getElementById(PFX + '-card-' + id); return el ? el.getBoundingClientRect() : null; }

    // conteggi ancore per lato (per distribuire partenze/arrivi multipli)
    const outCount = {}, outUsed = {}, inCount = {}, inUsed = {};
    CONNS.forEach(c => { outCount[c.from] = (outCount[c.from] || 0) + 1; inCount[c.to] = (inCount[c.to] || 0) + 1; });

    // raggruppa per banda (Y bordo basso sorgente) per assegnare corsie distinte
    const byBand = {};
    CONNS.forEach(c => {
      const ra = rectOf(c.from), rb = rectOf(c.to); if (!ra || !rb) return;
      const key = Math.round(ra.bottom);
      (byBand[key] = byBand[key] || []).push(c);
    });

    let paths = '', dots = '', labels = '';
    Object.keys(byBand).forEach(bandKey => {
      const list = byBand[bandKey];
      const maxBottom = Math.max.apply(null, list.map(c => rectOf(c.from).bottom));
      const minTop = Math.min.apply(null, list.map(c => rectOf(c.to).top));
      const bandTop = maxBottom - cr.top;
      const bandBot = minTop - cr.top;
      const bandH = Math.max(30, bandBot - bandTop);
      const n = list.length;
      list.forEach((c, idx) => {
        const ra = rectOf(c.from), rb = rectOf(c.to); if (!ra || !rb) return;
        const oUsedIdx = (outUsed[c.from] = (outUsed[c.from] || 0)); outUsed[c.from]++;
        const iUsedIdx = (inUsed[c.to] = (inUsed[c.to] || 0)); inUsed[c.to]++;
        const oN = outCount[c.from], iN = inCount[c.to];
        const oFrac = (oN === 1) ? 0.5 : (0.25 + 0.5 * (oUsedIdx / (oN - 1)));
        const iFrac = (iN === 1) ? 0.5 : (0.25 + 0.5 * (iUsedIdx / (iN - 1)));
        const ax = ra.left - cr.left + ra.width * oFrac;
        const ay = ra.bottom - cr.top;
        const bx = rb.left - cr.left + rb.width * iFrac;
        const by = rb.top - cr.top;
        const col = c.tipo === 'regina' ? '#C8860A' : '#8B7355';
        const dash = c.tipo === 'telai' ? 'stroke-dasharray="6 4"' : '';
        const w = c.tipo === 'regina' ? 2.8 : 2.4;
        let d, lx, ly;
        if (Math.abs(ax - bx) < 3) {
          d = 'M ' + ax + ' ' + ay + ' L ' + bx + ' ' + by;
          lx = ax + 60; ly = (ay + by) / 2;
        } else {
          const laneY = bandTop + bandH * ((idx + 1) / (n + 1));
          d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + laneY + ' L ' + bx + ' ' + laneY + ' L ' + bx + ' ' + by;
          lx = (ax + bx) / 2; ly = laneY;
        }
        paths += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" ' + dash + ' stroke-linejoin="round"/>';
        paths += '<polygon points="' + bx + ',' + (by + 1) + ' ' + (bx - 5) + ',' + (by - 8) + ' ' + (bx + 5) + ',' + (by - 8) + '" fill="' + col + '"/>';
        dots += '<circle cx="' + ax + '" cy="' + ay + '" r="5" fill="#8B7355" stroke="white" stroke-width="2"/>';
        dots += '<circle cx="' + bx + '" cy="' + by + '" r="4" fill="white" stroke="#8B7355" stroke-width="2"/>';
        const wlbl = c.label.length * 6.2 + 16;
        labels += '<g transform="translate(' + lx + ',' + ly + ')">'
          + '<rect x="' + (-wlbl / 2) + '" y="-10" width="' + wlbl + '" height="20" rx="10" fill="' + col + '"/>'
          + '<text x="0" y="4" text-anchor="middle" fill="white" font-size="10.5" font-weight="600" font-family="Crimson Pro, serif">' + c.label + '</text>'
          + '</g>';
      });
    });
    svg.innerHTML = paths + dots + labels;
  } catch (err) {
    console.error('[Genealogia] Errore in drawGenealogiaTree:', err.message);
  }
}

// Ridisegna tutti i grafi presenti al resize della finestra
window.addEventListener('resize', function () {
  if (!window._gtData) return;
  clearTimeout(window._gtResizeT);
  window._gtResizeT = setTimeout(function () {
    Object.keys(window._gtData).forEach(function (pfx) {
      if (!window._gtData[pfx].forReport) drawGenealogiaTree(pfx);
    });
  }, 100);
});

// === GENEALOGIA SVG STATICO (per il report esportato, autosufficiente) ===
// Calcola posizioni e disegna TUTTO in SVG (card come gruppi, linee anti-sovrapposizione),
// senza dipendere da getBoundingClientRect. Ritorna una stringa SVG completa.
function buildGenealogiaSVGStatico(arnieInput, logBookInput) {
  try {
    const arnieAll = (arnieInput || []).filter(a => !a.annoDismissione);
    if (arnieAll.length === 0) {
      return '<p style="color:#8B6F4E;font-style:italic">Nessuna arnia da mostrare nella genealogia.</p>';
    }

    const prodArnia = {};
    (logBookInput || []).forEach(e => {
      const kg = (e.raccolta || []).reduce((s, r) => s + (parseFloat(r.qta) || 0), 0);
      prodArnia[e.arniaId] = (prodArnia[e.arniaId] || 0) + kg;
    });

    const byId = {};
    arnieAll.forEach(a => { byId[a.id] = a; });
    const nomeArnia = (id) => { const a = byId[id]; return a ? '#' + a.num + (a.nome ? ' ' + a.nome : '') : '?'; };

    const madreReginaDi = {};
    arnieAll.forEach(a => {
      if (a.reginaOrigine === 'inserita' && a.reginaArniaSrc && byId[a.reginaArniaSrc]) {
        madreReginaDi[a.id] = a.reginaArniaSrc;
      }
    });
    const telaiDi = {};
    arnieAll.forEach(a => {
      const counts = {};
      (a.telainiOrigine || []).forEach(t => {
        if (t.arniaSrcId && t.arniaSrcId !== a.id && byId[t.arniaSrcId]) counts[t.arniaSrcId] = (counts[t.arniaSrcId] || 0) + 1;
      });
      const list = Object.keys(counts).map(src => ({ srcId: src, count: counts[src] }));
      if (list.length) telaiDi[a.id] = list;
    });

    // livelli — basati sulla PROVENIENZA (regina inserita + telaini): figlia sotto le sue fonti
    const fontiDi = {};
    arnieAll.forEach(a => {
      const set = new Set();
      if (madreReginaDi[a.id]) set.add(madreReginaDi[a.id]);
      (telaiDi[a.id] || []).forEach(t => set.add(t.srcId));
      fontiDi[a.id] = [...set];
    });
    const livello = {};
    function calcLiv(id, guard) {
      if (livello[id] != null) return livello[id];
      if (guard.has(id)) return 0;
      guard.add(id);
      const fonti = fontiDi[id] || [];
      if (fonti.length === 0) { livello[id] = 0; }
      else {
        let maxL = 0;
        fonti.forEach(f => { maxL = Math.max(maxL, calcLiv(f, guard) + 1); });
        livello[id] = maxL;
      }
      return livello[id];
    }
    arnieAll.forEach(a => calcLiv(a.id, new Set()));
    const perLivello = {};
    arnieAll.forEach(a => { (perLivello[livello[a.id]] = perLivello[livello[a.id]] || []).push(a); });
    const livelliOrd = Object.keys(perLivello).map(Number).sort((x, y) => x - y);
    livelliOrd.forEach(L => perLivello[L].sort((a, b) => (prodArnia[b.id] || 0) - (prodArnia[a.id] || 0)));

    // geometria
    const CW = 168, CH = 92, GX = 70, ROWH = 210, PAD = 20;
    const colCount = Math.max(...livelliOrd.map(L => perLivello[L].length));
    const W = PAD * 2 + colCount * CW + (colCount - 1) * GX;
    const pos = {};
    livelliOrd.forEach((L, rowIdx) => {
      const row = perLivello[L];
      const rowW = row.length * CW + (row.length - 1) * GX;
      const startX = (W - rowW) / 2;
      row.forEach((a, colIdx) => {
        pos[a.id] = { x: startX + colIdx * (CW + GX), y: PAD + rowIdx * ROWH };
      });
    });
    const H = PAD * 2 + livelliOrd.length * ROWH;

    const colOf = (a) => a.reginaOrigine === 'inserita' ? '#BA7517' : (a.reginaOrigine === 'acquistata' ? '#4A6FA5' : '#639922');
    const bgOf = (a) => a.reginaOrigine === 'inserita' ? '#FCF4E5' : (a.reginaOrigine === 'acquistata' ? '#EEF3FA' : '#F4F9ED');
    const icoOf = (a) => a.reginaOrigine === 'inserita' ? '👑' : (a.reginaOrigine === 'acquistata' ? '🛒' : '🥚');
    const escX = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // connessioni
    const conns = [];
    arnieAll.forEach(a => {
      if (madreReginaDi[a.id]) conns.push({ from: madreReginaDi[a.id], to: a.id, tipo: 'regina', label: '👑 regina' });
      (telaiDi[a.id] || []).forEach(t => conns.push({ from: t.srcId, to: a.id, tipo: 'telai', label: '🪵 ' + t.count + (t.count > 1 ? ' telaini' : ' telaino') }));
    });

    // ancore distinte
    const outCount = {}, outUsed = {}, inCount = {}, inUsed = {};
    conns.forEach(c => { outCount[c.from] = (outCount[c.from] || 0) + 1; inCount[c.to] = (inCount[c.to] || 0) + 1; });

    // banda per coppia di livelli (per corsie)
    const byBand = {};
    conns.forEach(c => {
      const key = pos[c.from].y;
      (byBand[key] = byBand[key] || []).push(c);
    });

    let lines = '';
    Object.keys(byBand).forEach(bandKey => {
      const list = byBand[bandKey];
      const n = list.length;
      list.forEach((c, idx) => {
        const pf = pos[c.from], pt = pos[c.to];
        const oUsedIdx = (outUsed[c.from] = (outUsed[c.from] || 0)); outUsed[c.from]++;
        const iUsedIdx = (inUsed[c.to] = (inUsed[c.to] || 0)); inUsed[c.to]++;
        const oN = outCount[c.from], iN = inCount[c.to];
        const oFrac = (oN === 1) ? 0.5 : (0.25 + 0.5 * (oUsedIdx / (oN - 1)));
        const iFrac = (iN === 1) ? 0.5 : (0.25 + 0.5 * (iUsedIdx / (iN - 1)));
        const ax = pf.x + CW * oFrac, ay = pf.y + CH;
        const bx = pt.x + CW * iFrac, by = pt.y;
        const col = c.tipo === 'regina' ? '#C8860A' : '#8B7355';
        const dash = c.tipo === 'telai' ? ' stroke-dasharray="6 4"' : '';
        const w = c.tipo === 'regina' ? 2.6 : 2.2;
        const bandTop = ay, bandBot = by, bandH = Math.max(24, bandBot - bandTop);
        let d, lx, ly;
        if (Math.abs(ax - bx) < 3) { d = `M ${ax} ${ay} L ${bx} ${by}`; lx = ax + 55; ly = (ay + by) / 2; }
        else { const laneY = bandTop + bandH * ((idx + 1) / (n + 1)); d = `M ${ax} ${ay} L ${ax} ${laneY} L ${bx} ${laneY} L ${bx} ${by}`; lx = (ax + bx) / 2; ly = laneY; }
        lines += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}"${dash} stroke-linejoin="round"/>`;
        lines += `<polygon points="${bx},${by + 1} ${bx - 5},${by - 8} ${bx + 5},${by - 8}" fill="${col}"/>`;
        lines += `<circle cx="${ax}" cy="${ay}" r="4.5" fill="#8B7355" stroke="white" stroke-width="2"/>`;
        lines += `<circle cx="${bx}" cy="${by}" r="3.8" fill="white" stroke="#8B7355" stroke-width="2"/>`;
        const wlbl = c.label.length * 6 + 14;
        lines += `<g transform="translate(${lx},${ly})"><rect x="${-wlbl / 2}" y="-9" width="${wlbl}" height="18" rx="9" fill="${col}"/><text x="0" y="3.5" text-anchor="middle" fill="white" font-size="10" font-weight="600" font-family="Georgia,serif">${c.label}</text></g>`;
      });
    });

    // card come gruppi SVG
    let cards = '';
    arnieAll.forEach(a => {
      const p = pos[a.id];
      const col = colOf(a), bg = bgOf(a);
      const kg = prodArnia[a.id] || 0;
      const reg = a.reginaAnno ? a.reginaAnno : '';
      let sub = a.reginaOrigine === 'inserita' ? 'regina inserita' : (a.reginaOrigine === 'acquistata' ? 'acquistata' : 'allevata');
      cards += `<g transform="translate(${p.x},${p.y})">
        <rect x="0" y="0" width="${CW}" height="${CH}" rx="11" fill="${bg}" stroke="${col}" stroke-width="1.5"/>
        <rect x="0" y="0" width="5" height="${CH}" rx="2" fill="${col}"/>
        <text x="${CW / 2}" y="24" text-anchor="middle" font-size="15" font-weight="700" fill="#5C3A10" font-family="Georgia,serif">${icoOf(a)} #${escX(a.num)}</text>
        ${a.nome ? `<text x="${CW / 2}" y="40" text-anchor="middle" font-size="10" fill="#2A1A05" font-family="Georgia,serif">${escX(a.nome)}</text>` : ''}
        <text x="${CW / 2}" y="${a.nome ? 56 : 42}" text-anchor="middle" font-size="9" fill="#6B4A20" font-family="Georgia,serif">${reg ? reg + ' · ' : ''}${sub}</text>
        ${kg > 0 ? `<text x="${CW / 2}" y="${a.nome ? 74 : 62}" text-anchor="middle" font-size="10" font-weight="700" fill="#27500A" font-family="Georgia,serif">${kg.toFixed(0)} kg</text>` : ''}
      </g>`;
    });

    const legenda = `<div style="display:flex;gap:1.2rem;flex-wrap:wrap;font-size:9pt;color:#6B4A20;margin-bottom:0.6rem">
      <span>━━ <strong style="color:#C8860A">regina</strong> (uovo/cella)</span>
      <span>┄┄ <strong style="color:#8B7355">solo telaini</strong></span>
      <span>🥚 allevata · 👑 inserita · 🛒 acquistata</span>
    </div>`;

    return legenda + `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-width:${W}px" xmlns="http://www.w3.org/2000/svg">${lines}${cards}</svg>`;
  } catch (err) {
    console.error('[Genealogia] Errore SVG statico:', err.message);
    return '<p style="color:#8B6F4E;font-style:italic">Genealogia non disponibile.</p>';
  }
}
