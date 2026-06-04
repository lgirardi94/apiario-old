// ===== FILE VERSION: 2026-06-04.28 · versioni.js =====
/* ===========================================================
   REGISTRO VERSIONI FILE
   Ogni volta che si modifica un file, aggiornare qui la sua versione
   (formato: AAAA-MM-GG.progressivo) E l'header in cima al file stesso.
   Il tasto "🔍 Verifica" ri-scarica ogni file, legge l'header reale e lo
   confronta con la versione attesa qui sotto: 🟢 allineato / 🔴 disallineato.
   Così si scopre subito se un file caricato su GitHub è vecchio o mancante.
   =========================================================== */

// Per ogni file: percorso reale (per ri-scaricarlo) + versione attesa.
const FILE_VERSIONS = {
  // HTML
  'index.html':                { path: 'index.html',            ver: '2026-06-04.34' },
  'visita_rapida.html':        { path: 'visita_rapida.html',    ver: '2026-06-04.9' },
  'inserimento_rapido.html':   { path: 'inserimento_rapido.html', ver: '2026-06-04.11' },
  'todo.html':                 { path: 'todo.html',             ver: '2026-06-04.4' },
  'etichette.html':            { path: 'etichette.html',        ver: '2026-06-04.4' },
  // Core
  'shared.js':                 { path: 'shared.js',             ver: '2026-05-28.2' },
  'js/storage.js':             { path: 'js/storage.js',         ver: '2026-05-28.1' },
  'js/backendAdapter.js':      { path: 'js/backendAdapter.js',  ver: '2026-06-04.1' },
  'js/auth.js':                { path: 'js/auth.js',            ver: '2026-06-04.1' },
  'js/state.js':               { path: 'js/state.js',           ver: '2026-05-28.2' },
  'js/nav.js':                 { path: 'js/nav.js',             ver: '2026-05-28.4' },
  // Sezioni
  'js/home.js':                { path: 'js/home.js',            ver: '2026-05-28.3' },
  'js/arnie.js':               { path: 'js/arnie.js',           ver: '2026-05-28.5' },
  'js/registro.js':            { path: 'js/registro.js',        ver: '2026-05-28.2' },
  'js/magazzino.js':           { path: 'js/magazzino.js',       ver: '2026-05-28.5' },
  'js/contabilita.js':         { path: 'js/contabilita.js',     ver: '2026-05-28.2' },
  'js/necessita.js':           { path: 'js/necessita.js',       ver: '2026-05-28.8' },
  'js/obiettivi.js':           { path: 'js/obiettivi.js',       ver: '2026-05-28.3' },
  'js/todo.js':                { path: 'js/todo.js',            ver: '2026-05-28.1' },
  // Utility / calcolatori
  'js/calcolatori.js':         { path: 'js/calcolatori.js',     ver: '2026-05-28.1' },
  'js/report.js':              { path: 'js/report.js',          ver: '2026-05-28.3' },
  'js/insights.js':            { path: 'js/insights.js',        ver: '2026-05-28.9' },
  'js/ricerca.js':             { path: 'js/ricerca.js',         ver: '2026-05-28.2' },
  'js/filtri.js':              { path: 'js/filtri.js',          ver: '2026-05-28.2' },
  // Infrastruttura
  'js/drive-app.js':           { path: 'js/drive-app.js',       ver: '2026-05-28.3' },
  'js/import-export.js':       { path: 'js/import-export.js',   ver: '2026-05-28.2' },
  'js/versioni.js':            { path: 'js/versioni.js',        ver: '2026-06-04.28' },
};

// Versione "build" complessiva dell'app (la più recente tra tutte)
const APP_BUILD = '2026-06-04.34';

function mostraVersioniFile() {
  try {
    const existing = document.getElementById('versioniOverlay');
    if(existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'versioniOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,18,8,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem';

    const righe = Object.entries(FILE_VERSIONS).map(([file, info]) => `
      <tr data-file="${file}">
        <td style="padding:0.35rem 0.6rem;border-bottom:1px solid #F0E6CC;font-family:monospace;font-size:0.8rem">${file}</td>
        <td style="padding:0.35rem 0.6rem;border-bottom:1px solid #F0E6CC;font-family:monospace;font-size:0.8rem;text-align:right;color:#5C3A10;font-weight:600">${info.ver}</td>
        <td class="vstato" style="padding:0.35rem 0.6rem;border-bottom:1px solid #F0E6CC;font-size:0.85rem;text-align:center;white-space:nowrap">–</td>
      </tr>`).join('');

    overlay.innerHTML = `
      <div style="background:white;border-radius:8px;padding:1.5rem;width:100%;max-width:560px;max-height:82vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="font-family:'Playfair Display',serif;font-size:1.2rem;color:#5C3A10;margin:0 0 0.3rem">🏷️ Versioni dei file</h3>
        <p style="font-size:0.83rem;color:#8A6D3B;margin:0 0 1rem">Build app: <strong>${APP_BUILD}</strong> · Premi <strong>🔍 Verifica</strong> per controllare che ogni file caricato corrisponda alla versione attesa.</p>
        <div id="verificaEsito" style="display:none;border-radius:6px;padding:0.6rem 0.9rem;margin-bottom:0.9rem;font-size:0.88rem"></div>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <th style="text-align:left;padding:0.4rem 0.6rem;border-bottom:2px solid #C8860A;font-size:0.74rem;color:#6B4A20;text-transform:uppercase">File</th>
            <th style="text-align:right;padding:0.4rem 0.6rem;border-bottom:2px solid #C8860A;font-size:0.74rem;color:#6B4A20;text-transform:uppercase">Attesa</th>
            <th style="text-align:center;padding:0.4rem 0.6rem;border-bottom:2px solid #C8860A;font-size:0.74rem;color:#6B4A20;text-transform:uppercase">Stato</th>
          </tr>
          ${righe}
        </table>
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
          <button id="btnVerificaVer" onclick="verificaVersioni()" style="flex:1;min-width:120px;padding:0.6rem;background:#639922;border:none;border-radius:6px;font-weight:700;color:white;cursor:pointer;font-family:inherit">🔍 Verifica</button>
          <button onclick="copiaVersioni()" style="flex:1;min-width:120px;padding:0.6rem;background:white;border:1.5px solid #C8860A;border-radius:6px;font-weight:600;color:#5C3A10;cursor:pointer;font-family:inherit">📋 Copia elenco</button>
          <button onclick="document.getElementById('versioniOverlay').remove()" style="flex:1;min-width:120px;padding:0.6rem;background:#C8860A;border:none;border-radius:6px;font-weight:700;color:#1A1208;cursor:pointer;font-family:inherit">Chiudi</button>
        </div>
      </div>`;

    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  } catch(err) {
    console.error('[Versioni] Errore in mostraVersioniFile:', err.message);
  }
}

// Estrae la versione (AAAA-MM-GG.n) dall'header di un file (prima/seconda riga)
function _estraiVersioneDaTesto(testo) {
  if(!testo) return null;
  // Cerca nelle prime righe un pattern "FILE VERSION: 2026-05-28.9"
  const primeRighe = testo.split('\n').slice(0, 3).join('\n');
  const m = primeRighe.match(/FILE VERSION:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+)/);
  return m ? m[1] : null;
}

// Tasto "🔍 Verifica": ri-scarica ogni file, legge l'header reale e confronta con l'attesa
async function verificaVersioni() {
  const btn = document.getElementById('btnVerificaVer');
  const esitoBox = document.getElementById('verificaEsito');
  if(btn) { btn.disabled = true; btn.textContent = '⏳ Verifica in corso...'; }

  let okCount = 0, koCount = 0, errCount = 0;
  const entries = Object.entries(FILE_VERSIONS);

  for(const [file, info] of entries) {
    const cella = document.querySelector(`#versioniOverlay tr[data-file="${CSS.escape(file)}"] .vstato`);
    try {
      // Cache-busting forte: timestamp unico per leggere il file REALE servito ora
      const resp = await fetch(info.path + '?_vchk=' + Date.now(), { cache: 'no-store' });
      if(!resp.ok) throw new Error('HTTP ' + resp.status);
      const testo = await resp.text();
      const verReale = _estraiVersioneDaTesto(testo);

      if(!verReale) {
        errCount++;
        if(cella) { cella.textContent = '⚠️ no header'; cella.title = 'Header FILE VERSION non trovato nel file'; }
      } else if(verReale === info.ver) {
        okCount++;
        if(cella) { cella.innerHTML = '🟢 ' + verReale; cella.title = 'Allineato'; }
      } else {
        koCount++;
        if(cella) { cella.innerHTML = '🔴 ' + verReale; cella.title = `Atteso ${info.ver}, trovato ${verReale}`; }
      }
    } catch(e) {
      errCount++;
      if(cella) { cella.textContent = '⚠️ errore'; cella.title = e.message; }
      console.warn('[Versioni] Verifica fallita per', file, e.message);
    }
  }

  // Riepilogo
  if(esitoBox) {
    esitoBox.style.display = 'block';
    if(koCount === 0 && errCount === 0) {
      esitoBox.style.background = '#EAF3DE';
      esitoBox.style.color = '#27500A';
      esitoBox.innerHTML = `✅ Tutto allineato — ${okCount} file corrispondono alla versione attesa.`;
    } else {
      esitoBox.style.background = '#FBE9E7';
      esitoBox.style.color = '#A33';
      let msg = `⚠️ Trovati problemi: `;
      const parti = [];
      if(koCount > 0) parti.push(`${koCount} file disallineati (🔴)`);
      if(errCount > 0) parti.push(`${errCount} non leggibili (⚠️)`);
      msg += parti.join(', ') + `. ${okCount} ok. `;
      if(koCount > 0) msg += 'Ricarica su GitHub i file 🔴, poi fai hard refresh (Ctrl+Shift+R) e ri-verifica.';
      esitoBox.innerHTML = msg;
    }
  }

  if(btn) { btn.disabled = false; btn.textContent = '🔍 Verifica di nuovo'; }
}

function copiaVersioni() {
  try {
    const testo = `IL MIO APIARIO — Versioni file (build ${APP_BUILD})\n` +
      '═'.repeat(48) + '\n' +
      Object.entries(FILE_VERSIONS).map(([f, info]) => `${info.ver}  ${f}`).join('\n');
    if(navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(testo).then(
        () => { if(typeof showImportToast === 'function') showImportToast('📋 Elenco versioni copiato'); },
        () => alert(testo)
      );
    } else {
      alert(testo);
    }
  } catch(err) {
    console.error('[Versioni] Errore in copiaVersioni:', err.message);
  }
}
