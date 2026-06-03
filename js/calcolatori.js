// ===== FILE VERSION: 2026-05-28.1 · calcolatori.js =====
/* Unione di sciroppo + candito + propoli */

// ========== SCIROPPO ==========
// ======= SCIROPPO =======
let sciMode = '1to1';

function showSciroppoTab(tab, btn) {
  try {
    ['Calcolatore','Procedimento','Conservazione','Integratori'].forEach(t => {
      const el = document.getElementById(`sciTab${t}`);
      if(el) el.style.display = 'none';
    });
    document.querySelectorAll('#utilTabSciroppo .mag-tabs .mag-tab').forEach(b => b.classList.remove('active'));
    const targetEl = document.getElementById(`sciTab${tab.charAt(0).toUpperCase()+tab.slice(1)}`);
    if(!targetEl) {
      console.warn('[Sciroppo] Tab non trovata:', tab);
      return;
    }
    targetEl.style.display = 'block';
    if(btn) btn.classList.add('active');
    if(tab === 'calcolatore') sciCalc();
  } catch(err) {
    console.error('[Sciroppo] Errore in showSciroppoTab:', err.message);
  }
}

function sciSetMode(m) {
  sciMode = m;
  document.getElementById('sci-btn-1to1').className = 'sci-type-btn' + (m==='1to1'?' on-1to1':'');
  document.getElementById('sci-btn-2to1').className = 'sci-type-btn' + (m==='2to1'?' on-2to1':'');
  const accent = document.getElementById('sciCalcAccent');
  if(accent) accent.className = 'sci-calc-card-accent' + (m==='2to1'?' mode-2to1':'');
  sciCalc();
}

function sciCalc() {
  const h = parseInt(document.getElementById('sci-sl-hives')?.value || 3, 10);
  const l = parseFloat(document.getElementById('sci-sl-liters')?.value || 1);
  const outH = document.getElementById('sci-out-hives');
  const outL = document.getElementById('sci-out-liters');
  if(outH) outH.textContent = h;
  if(outL) outL.textContent = l.toFixed(1) + ' L';

  const tot = h * l;
  let acq, zuc, brix, uso, usoCls;
  if(sciMode === '1to1') {
    acq = tot / 2; zuc = tot / 2; brix = 50; uso = 'Primavera'; usoCls = 'sci-uso-badge sci-uso-primavera';
  } else {
    acq = tot * 0.37; zuc = tot * 0.63; brix = 67; uso = 'Autunno'; usoCls = 'sci-uso-badge sci-uso-autunno';
  }

  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  const setClass = (id, cls) => { const el = document.getElementById(id); if(el) el.className = cls; };
  set('sci-r-acq', acq.toFixed(1));
  set('sci-r-zuc', zuc.toFixed(1));
  set('sci-r-tot', tot.toFixed(1));
  set('sci-r-brix', '~' + brix + '°');
  set('sci-r-uso', uso);
  setClass('sci-r-uso', usoCls);

  const grams = Math.round(tot * 0.5 * 10) / 10;
  set('sci-r-grams', grams.toFixed(1));

  const intere = Math.floor(grams / 5);
  const resto  = Math.round((grams - intere * 5) * 10) / 10;
  let txt = '';
  if(intere > 0) txt += intere + ' bustina' + (intere > 1 ? 'e' : '');
  if(resto > 0)  txt += (intere > 0 ? ' + ' : '') + resto + ' g parziale';
  if(grams < 0.5) txt = '< mezzo grammo';
  set('sci-r-bust', txt || '—');

  const restoEl = document.getElementById('sci-r-resto');
  if(restoEl) {
    if(resto > 0 && resto < 5 && intere > 0) {
      restoEl.textContent = `Dalla bustina parziale: usa ${resto} g, conserva i restanti ${Math.round((5-resto)*10)/10} g in un vasetto chiuso.`;
    } else if(resto > 0 && intere === 0) {
      restoEl.textContent = `Prendi una bustina e usa solo ${resto} g. Conserva il resto in vasetto chiuso.`;
    } else {
      restoEl.textContent = '';
    }
  }
}


// ========== CANDITO ==========
/* ===========================================================
   CANDITO — Calcolatore ricetta e gestione tab
   =========================================================== */

let candMode = 'classico'; // 'classico' | 'polline'

function showCanditoTab(tab, btn) {
  const tabs = ['calcolatore', 'procedimento', 'conservazione', 'quando'];
  tabs.forEach(t => {
    const el = document.getElementById('candTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if(el) el.style.display = (t === tab) ? 'block' : 'none';
  });
  // Active state
  const parent = btn?.closest('.mag-tabs');
  if(parent) {
    parent.querySelectorAll('.mag-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if(tab === 'calcolatore') candCalc();
}

function candSetMode(mode) {
  candMode = mode;
  document.getElementById('cand-btn-classico').classList.toggle('on-1to1', mode === 'classico');
  document.getElementById('cand-btn-polline').classList.toggle('on-2to1', mode === 'polline');

  // Mostra/nascondi box polline nel calcolatore
  const pollineBox = document.getElementById('candPollineBox');
  if(pollineBox) pollineBox.style.display = (mode === 'polline') ? 'block' : 'none';

  // Mostra/nascondi step polline nel procedimento
  const stepPolline = document.getElementById('candStepPolline');
  if(stepPolline) stepPolline.style.display = (mode === 'polline') ? 'flex' : 'none';

  // Aggiorna numerazione step se polline è visibile
  const num4 = document.getElementById('candNum4');
  const num5 = document.getElementById('candNum5');
  if(num4 && num5) {
    if(mode === 'polline') { num4.textContent = '4'; num5.textContent = '5'; }
    else { num4.textContent = '3'; num5.textContent = '4'; }
  }

  // Aggiorna badge "uso consigliato"
  const uso = document.getElementById('cand-r-uso');
  if(uso) {
    if(mode === 'polline') {
      uso.textContent = 'Fine inverno';
      uso.className = 'sci-uso-badge sci-uso-primavera';
    } else {
      uso.textContent = 'Inverno';
      uso.className = 'sci-uso-badge sci-uso-inverno';
    }
  }

  candCalc();
}

function candCalc() {
  const setText = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  const get = (id) => document.getElementById(id)?.value;

  const hives = parseInt(get('cand-sl-hives') || 3);
  const grams = parseInt(get('cand-sl-grams') || 1000);
  const totale = hives * grams;

  setText('cand-out-hives', hives);
  setText('cand-out-grams', (grams / 1000).toFixed(1) + ' kg');

  // Ricetta:
  // CLASSICO:  82% zucchero a velo + 18% miele
  // POLLINE:   75% zucchero a velo + 15% miele + 10% polline
  // Acqua: max 1-2% del totale, opzionale (per regolare consistenza)
  let zucPct, mielePct, pollinePct;
  if(candMode === 'polline') {
    zucPct = 0.75;
    mielePct = 0.15;
    pollinePct = 0.10;
  } else {
    zucPct = 0.82;
    mielePct = 0.18;
    pollinePct = 0;
  }

  const zucchero = Math.round(totale * zucPct);
  const miele = Math.round(totale * mielePct);
  const polline = Math.round(totale * pollinePct);
  const acqua = Math.round(totale * 0.01); // ~1% opzionale

  setText('cand-r-zucchero', fmtNum(zucchero));
  setText('cand-r-miele', fmtNum(miele));
  setText('cand-r-acqua', fmtNum(acqua) + ' (max)');
  setText('cand-r-polline', fmtNum(polline));
  setText('cand-r-totale', fmtNum(totale));
}

// Helper per formattare numero con separatore migliaia
function fmtNum(n) {
  return Math.round(n).toLocaleString('it-IT');
}

// Init: imposta modalità default classico
document.addEventListener('DOMContentLoaded', () => {
  // Solo se siamo sulla pagina giusta
  if(document.getElementById('cand-btn-classico')) {
    candSetMode('classico');
  }
});

// ========== PROPOLI ==========
/* ===========================================================
   PROPOLI — Calcolatore tintura alcolica/analcolica
   =========================================================== */

let propMode = 'alcolica'; // 'alcolica' | 'analcolica'

function showPropoliTab(tab, btn) {
  const tabs = ['calcolatore', 'procedimento', 'conservazione', 'usi'];
  tabs.forEach(t => {
    const el = document.getElementById('propTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if(el) el.style.display = (t === tab) ? 'block' : 'none';
  });
  const parent = btn?.closest('.mag-tabs');
  if(parent) {
    parent.querySelectorAll('.mag-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if(tab === 'calcolatore') propCalc();
}

function propSetMode(mode) {
  propMode = mode;
  document.getElementById('prop-btn-alcolica').classList.toggle('on-1to1', mode === 'alcolica');
  document.getElementById('prop-btn-analcolica').classList.toggle('on-2to1', mode === 'analcolica');

  // Mostra/nascondi blocchi output e gradazione
  document.getElementById('prop-output-alcolica').style.display = (mode === 'alcolica') ? 'block' : 'none';
  document.getElementById('prop-output-analcolica').style.display = (mode === 'analcolica') ? 'block' : 'none';
  document.getElementById('prop-grad-row').style.display = (mode === 'alcolica') ? 'flex' : 'none';

  propCalc();
}

function propCalc() {
  const setText = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  const get = (id) => document.getElementById(id)?.value;

  const grams = parseInt(get('prop-sl-grams') || 100, 10);
  const concentrazione = parseFloat(get('prop-sl-conc') || 20);  // 10, 20, 30
  const gradPartenza = parseFloat(get('prop-sl-grad') || 95);    // 90, 95, 96

  setText('prop-out-grams', grams + ' g');

  if(propMode === 'alcolica') {
    // Calcolo volume tintura: grams (propoli) corrisponde alla % della tintura totale
    // Es: 100 g propoli + 400 ml alcool 70° = 500 ml tintura al 20%
    // → Volume_tintura_totale = grams / (concentrazione / 100)
    // → Volume_solvente = volume_tintura - grams (assumendo 1 g ≈ 1 ml come densità della propoli)
    // Più correttamente: tintura X% = X g di propoli su 100 ml di alcool diluito
    // Quindi: vol_alcool_70 = grams * (100 / concentrazione) - ipotesi di volume
    // In pratica si usa: massa_propoli (g) su volume_alcool (ml) come rapporto peso/volume

    // Formula pratica: per concentrazione X%, su 100 g propoli servono (100 - X) * 5 ml di alcool 70°
    // Più precisamente: peso/volume → 20 g propoli in 100 ml = 20% p/v
    // Quindi 100 g propoli al 20% = 500 ml di alcool 70°

    const volAlcool70 = Math.round(grams * (100 / concentrazione));

    // Diluizione: vol_finale × 70 = vol_alcool_puro × grad_partenza
    // → vol_alcool_puro = vol_finale × 70 / grad_partenza
    const volAlcoolPuro = Math.round(volAlcool70 * 70 / gradPartenza);
    const volAcqua = volAlcool70 - volAlcoolPuro;

    // Volume totale della tintura (propoli + solvente)
    const volTintura = volAlcool70 + Math.round(grams * 0.5); // propoli aggiunge volume parziale

    setText('prop-r-propoli', grams);
    setText('prop-r-totale', volAlcool70);
    setText('prop-r-conc', concentrazione + '%');
    setText('prop-r-alcool', volAlcoolPuro);
    setText('prop-r-acqua', volAcqua);

    // Barattolo consigliato (volume liquido × 1.3, arrotondato a misura standard)
    const barattoloIdeale = Math.ceil(volAlcool70 * 1.3);
    const misureStandard = [250, 500, 750, 1000, 1500, 2000];
    const barattolo = misureStandard.find(v => v >= barattoloIdeale) || (Math.ceil(barattoloIdeale/500)*500);
    setText('prop-r-barattolo', barattolo);

    setText('prop-r-tempo', '4 sett.');
    setText('prop-r-durata', '3-5 anni');

  } else {
    // ANALCOLICA - glicerica
    // Stessa logica peso/volume, ma con glicerina+acqua 60:40
    // Concentrazione consigliata leggermente diversa per glicerica (meno estrazione)
    // Usiamo le stesse % per coerenza ma è leggermente sottostimata l'estrazione effettiva

    const volTotale = Math.round(grams * (100 / concentrazione));
    const volGlicerina = Math.round(volTotale * 0.6);
    const volAcqua = volTotale - volGlicerina;

    setText('prop-r-propoli-an', grams);
    setText('prop-r-totale-an', volTotale);
    setText('prop-r-conc-an', concentrazione + '%');
    setText('prop-r-glicerina', volGlicerina);
    setText('prop-r-acqua-an', volAcqua);

    const barattoloIdeale = Math.ceil(volTotale * 1.3);
    const misureStandard = [250, 500, 750, 1000, 1500, 2000];
    const barattolo = misureStandard.find(v => v >= barattoloIdeale) || (Math.ceil(barattoloIdeale/500)*500);
    setText('prop-r-barattolo', barattolo);

    setText('prop-r-tempo', '6 sett.');
    setText('prop-r-durata', '12-18 mesi');
  }
}

// Init alla prima apertura: imposta modalità alcolica
document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('prop-btn-alcolica')) {
    propSetMode('alcolica');
  }
});
