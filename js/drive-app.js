// ===== FILE VERSION: 2026-06-04.6 · drive-app.js =====
// ======= GOOGLE DRIVE — LOGIN OBBLIGATORIO + AUTO-SAVE =======

// Costanti di timing
const DRIVE_DEBOUNCE_MS    = 800;   // Attesa prima di salvare dopo modifica
const DRIVE_RETRY_MS       = 5000;  // Ritento dopo errore di rete
const DRIVE_INIT_DELAY_MS  = 500;   // Attesa caricamento Google API

let _isAuthorized = false;
let _isSaving = false;
let _hasUnsavedChanges = false;

// Detect connessione persa per avvisare l'utente
window.addEventListener('online',  () => {
  if(_hasUnsavedChanges && _isAuthorized) {
    showImportToast('🔄 Connessione tornata, sincronizzo...');
    pushToCloud(true);
  }
});
window.addEventListener('offline', () => {
  setDriveLoading(false);
  const status = document.getElementById('driveStatus');
  if(status) {
    status.textContent = '📵 Offline — modifiche salvate localmente';
    status.style.color = 'rgba(245,150,80,0.9)';
  }
});

function updateDriveUI(connected) {
  const btnLogin  = document.getElementById('btnDriveLogin');
  const btnLogout = document.getElementById('btnDriveLogout');
  const status    = document.getElementById('driveStatus');
  if(btnLogin)  btnLogin.style.display  = connected ? 'none' : 'flex';
  if(btnLogout) btnLogout.style.display = connected ? 'inline-block' : 'none';
  if(status) {
    status.textContent = connected ? '☁️ Sincronizzato con Google Drive' : '☁️ Non connesso';
    status.style.color = connected ? 'rgba(100,220,100,0.8)' : 'rgba(251,245,230,0.55)';
  }
}

function setDriveLoading(on, msg = '') {
  const status = document.getElementById('driveStatus');
  if(!status) return;
  if(on) { status.textContent = msg; status.style.color = 'rgba(245,200,66,0.8)'; }
  else { updateDriveUI(_isAuthorized); }
}

function initGoogleDrive() {
  initDrive(
    async () => {
      // Login completato — carica i dati PRIMA di abilitare i salvataggi
      const gateStatus = document.getElementById('loginGateStatus');
      if(gateStatus) gateStatus.textContent = '🔄 Caricamento dati da Drive...';
      try {
        await loadFromCloud();
        // Solo ora attiva i salvataggi su Drive — evita di salvare array vuoti
        // se qualche evento di rendering innesca un save durante il caricamento
        _isAuthorized = true;
        showApp();
      } catch(e) {
        console.error('Errore caricamento iniziale:', e);
        if(gateStatus) gateStatus.textContent = '❌ Errore: ' + e.message;
      }
    },
    () => {
      // Token salvato trovato — mostra "caricamento"
      const gateStatus = document.getElementById('loginGateStatus');
      if(gateStatus) gateStatus.textContent = '🔄 Riprendo la sessione...';
    },
    () => {
      // Token non valido — mostra schermata login
      _isAuthorized = false;
      const gateStatus = document.getElementById('loginGateStatus');
      if(gateStatus) gateStatus.textContent = '👇 Tocca il pulsante per accedere';
    }
  );
}

async function loadFromCloud() {
  try {
    const { db, mag, cont, ob, nec, settings: settingsData, todo } = await Storage.carica();
    if(db && db.arnie && db.logBook) { arnie = db.arnie; logBook = db.logBook; }
    if(mag && mag.articoli && mag.movimentazioni) { articoli = mag.articoli; movimentazioni = mag.movimentazioni; }
    if(cont && cont.movimentiContabili) { movimentiContabili = cont.movimentiContabili; }
    if(ob && ob.obiettivi) { obiettivi = ob.obiettivi; }
    if(nec && nec.necessita) { necessita = nec.necessita; }
    if(todo && Array.isArray(todo.todos)) { todos = todo.todos; }
    if(settingsData) {
      // Riempie settings con le proprietà da Drive, mantenendo i default per quelle nuove
      Object.assign(settings, settingsData);
      delete settings.version;
      delete settings.savedAt;
    }
    // Controlla se serve un backup automatico (dopo aver caricato i dati)
    checkAutoBackup();
  } catch(err) {
    console.error('[Drive] Errore in loadFromCloud:', err.message, err);
    throw err; // rilancia per gestione esterna
  }
}

// ============================================
// BACKUP AUTOMATICO PERIODICO
// Crea un backup datato su Drive ogni N giorni (default 7)
// ============================================
const AUTO_BACKUP_DAYS = 7;

async function checkAutoBackup() {
  try {
    const last = settings.lastAutoBackup ? new Date(settings.lastAutoBackup) : null;
    const oggi = new Date();
    let serve = false;
    if(!last || isNaN(last.getTime())) {
      serve = true;
    } else {
      const giorni = (oggi - last) / (1000*60*60*24);
      if(giorni >= AUTO_BACKUP_DAYS) serve = true;
    }
    if(!serve) {
      console.log('[Drive] Backup automatico non necessario (ultimo:', settings.lastAutoBackup || 'mai', ')');
      return;
    }

    console.log('[Drive] Creazione backup automatico...');
    const fullData = { arnie, logBook, articoli, movimentazioni, movimentiContabili, obiettivi, necessita };
    const nome = await Storage.creaBackup(fullData, 5);
    settings.lastAutoBackup = oggi.toISOString();
    // Salva settings aggiornati (silenzioso)
    pushToCloud(true);
    console.log('[Drive] Backup automatico creato:', nome);
    if(typeof showImportToast === 'function') showImportToast('💾 Backup automatico settimanale creato');
  } catch(err) {
    console.error('[Drive] Errore in checkAutoBackup:', err.message);
    // Non bloccante: l'app continua a funzionare
  }
}

// Lista i backup disponibili con opzione di ripristino
async function mostraBackupDisponibili() {
  try {
    const backups = await Storage.listaBackup();
    if(backups.length === 0) {
      alert('Nessun backup automatico disponibile ancora.\n\nI backup vengono creati automaticamente ogni 7 giorni all\'apertura dell\'app.');
      return;
    }

    // Costruisci un modale di scelta
    const existing = document.getElementById('backupRestoreOverlay');
    if(existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'backupRestoreOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,18,8,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem';

    const righe = backups.map(b => {
      const dataParte = b.name.replace('apiario_autobackup_', '').replace('.json', '');
      const modif = b.modifiedTime ? new Date(b.modifiedTime).toLocaleString('it-IT', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.7rem 0.9rem;border:1px solid #F0E6CC;border-radius:6px;margin-bottom:0.5rem">
        <div>
          <div style="font-weight:600;color:#5C3A10">📦 ${dataParte}</div>
          <div style="font-size:0.78rem;color:#8A6D3B">Salvato: ${modif}</div>
        </div>
        <button onclick="ripristinaBackup('${b.id}','${dataParte}')" style="background:#C8860A;color:#1A1208;border:none;border-radius:5px;padding:0.45rem 0.9rem;font-weight:700;cursor:pointer;font-family:inherit;font-size:0.85rem">Ripristina</button>
      </div>`;
    }).join('');

    overlay.innerHTML = `
      <div style="background:white;border-radius:8px;padding:1.6rem;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="font-family:'Playfair Display',serif;font-size:1.25rem;color:#5C3A10;margin:0 0 0.4rem">📦 Backup disponibili</h3>
        <p style="font-size:0.85rem;color:#8A6D3B;margin:0 0 1rem">${backups.length} backup automatici · creati ogni 7 giorni, mantenuti gli ultimi 5</p>
        ${righe}
        <div style="margin-top:1rem;padding:0.7rem 0.9rem;background:#FDF3DC;border-radius:6px;font-size:0.8rem;color:#6B4A20;border-left:3px solid #C8860A">
          ⚠️ Il ripristino sostituirà <strong>tutti i dati attuali</strong> con quelli del backup scelto. Verrà creato prima un backup di sicurezza dello stato corrente.
        </div>
        <button onclick="document.getElementById('backupRestoreOverlay').remove()" style="width:100%;margin-top:1rem;padding:0.7rem;background:white;border:1.5px solid #F0E6CC;border-radius:6px;font-weight:600;color:#6B4A20;cursor:pointer;font-family:inherit">Chiudi</button>
      </div>`;

    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  } catch(err) {
    console.error('[Drive] Errore in mostraBackupDisponibili:', err.message);
    alert('Errore nel recupero dei backup: ' + err.message);
  }
}

// Ripristina un backup specifico
async function ripristinaBackup(fileId, dataLabel) {
  try {
    if(!confirm(`Ripristinare il backup del ${dataLabel}?\n\nTUTTI i dati attuali (arnie, visite, magazzino, contabilità, ordini) verranno sostituiti con quelli del backup.\n\nVerrà comunque creato un backup di sicurezza dello stato attuale prima di procedere.`)) {
      return;
    }

    // 1. Crea backup di sicurezza dello stato corrente (con nome speciale)
    const oggi = new Date();
    const tsLabel = oggi.toISOString().slice(0,19).replace(/[:T]/g,'-');
    const statoCorrente = { arnie, logBook, articoli, movimentazioni, movimentiContabili, obiettivi, necessita };
    try {
      await Storage.salvaFile(`apiario_autobackup_pre-ripristino-${tsLabel}.json`, { version:1, backupDate: oggi.toISOString(), preRipristino: true, ...statoCorrente });
    } catch(e) {
      console.warn('[Drive] Backup di sicurezza fallito, procedo comunque:', e.message);
    }

    // 2. Leggi il backup scelto
    const backupData = await Storage.leggiFile(`apiario_autobackup_${dataLabel}.json`);
    if(!backupData) {
      alert('Impossibile leggere il backup selezionato.');
      return;
    }

    // 3. Ripristina i dati nelle variabili globali
    if(Array.isArray(backupData.arnie)) { arnie.length = 0; backupData.arnie.forEach(x => arnie.push(x)); }
    if(Array.isArray(backupData.logBook)) { logBook.length = 0; backupData.logBook.forEach(x => logBook.push(x)); }
    if(Array.isArray(backupData.articoli)) { articoli.length = 0; backupData.articoli.forEach(x => articoli.push(x)); }
    if(Array.isArray(backupData.movimentazioni)) { movimentazioni.length = 0; backupData.movimentazioni.forEach(x => movimentazioni.push(x)); }
    if(Array.isArray(backupData.movimentiContabili)) { movimentiContabili.length = 0; backupData.movimentiContabili.forEach(x => movimentiContabili.push(x)); }
    if(Array.isArray(backupData.obiettivi)) { obiettivi.length = 0; backupData.obiettivi.forEach(x => obiettivi.push(x)); }
    if(Array.isArray(backupData.necessita)) { necessita.length = 0; backupData.necessita.forEach(x => necessita.push(x)); }

    // 4. Salva lo stato ripristinato su Drive (sovrascrive i file correnti)
    pushToCloud(true);

    // 5. Re-render tutto
    if(typeof renderArnie === 'function') renderArnie();
    if(typeof renderLog === 'function') renderLog();
    if(typeof renderStats === 'function') renderStats();
    if(typeof renderMagArticoli === 'function') renderMagArticoli();
    if(typeof renderContRiepilogo === 'function') renderContRiepilogo();
    if(typeof renderNecessita === 'function') renderNecessita();
    if(typeof renderHome === 'function') renderHome();

    const overlay = document.getElementById('backupRestoreOverlay');
    if(overlay) overlay.remove();

    alert(`✅ Backup del ${dataLabel} ripristinato con successo.\n\nLo stato precedente è stato salvato come backup di sicurezza.`);
  } catch(err) {
    console.error('[Drive] Errore in ripristinaBackup:', err.message);
    alert('Errore durante il ripristino: ' + err.message);
  }
}

function showApp() {
  try {
    const gate = document.getElementById('loginGate');
    const app = document.getElementById('appContent');
    if(gate) gate.style.display = 'none';
    if(app) app.style.display = 'block';
    updateDriveUI(true);
    // Mostra il link al pannello admin SOLO se l'utente è admin (modalità account).
    // (La protezione vera è lato backend: gli endpoint /api/admin rispondono 403 ai non-admin.)
    try {
      const btnAdmin = document.getElementById('btnAdmin');
      if(btnAdmin) btnAdmin.style.display = (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) ? 'inline-block' : 'none';
    } catch(e) { console.error('[Drive] check admin:', e.message); }
  // Setup form
  document.getElementById('logData').value = today();
  const artCat = document.getElementById('artCategoria');
  if(artCat) {
    artCat.addEventListener('change', toggleCampiConsumabile);
    toggleCampiConsumabile();
  }
  document.getElementById('logTipo').addEventListener('change', toggleIspezioneFields);
  document.getElementById('logArnia').addEventListener('change', () => {
    const tipi = Array.from(document.querySelectorAll('#logTipo input:checked')).map(x => x.value);
    if(tipi.includes('ispezione')) precompilaDaUltimaIspezione();
  });
  renderArnie();
  renderStats();
  updateArniSelects();
  renderMagArticoli();
  renderContRiepilogo();
  if(typeof renderNecessita === 'function') renderNecessita();
  renderHome();
  } catch(err) {
    console.error('[Drive] Errore in showApp:', err.message);
  }
}

/**
 * Salva tutti i dati su Drive con debouncing.
 * Se chiamata più volte in rapida successione, accumula le richieste e salva una volta sola.
 * Se un salvataggio è in corso quando arriva una nuova richiesta, segna che dovrà essere rifatto.
 */
let _saveTimer = null;
let _pendingSave = false;

function pushToCloud(silent = false) {
  if(!_isAuthorized) return;
  _hasUnsavedChanges = true;
  // Debounce: aspetta 800ms di silenzio prima di salvare
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => _doSave(silent), DRIVE_DEBOUNCE_MS);
}

async function _doSave(silent) {
  if(_isSaving) {
    // Salvataggio già in corso — segna che dovremo rifarlo dopo
    _pendingSave = true;
    return;
  }
  if(!navigator.onLine) {
    // Offline — non tentare nemmeno
    setDriveLoading(false);
    return;
  }
  _isSaving = true;
  if(!silent) setDriveLoading(true, '☁️ Salvataggio...');
  try {
    await Storage.salvaTutto({
      db:       { arnie, logBook },
      mag:      { articoli, movimentazioni },
      cont:     { movimentiContabili },
      ob:       { obiettivi },
      nec:      { necessita },
      settings: settings,
      todo:     { todos }
    });
    _hasUnsavedChanges = false;
    if(!silent) showImportToast('☁️ Salvato su Drive');
  } catch(e) {
    showImportToast('❌ Errore salvataggio: ' + e.message);
    console.error('[Drive] Errore in pushToCloud:', e);
    // Riprova fra 5 secondi (nel caso di errore di rete temporaneo)
    setTimeout(() => pushToCloud(true), DRIVE_RETRY_MS);
  } finally {
    _isSaving = false;
    setDriveLoading(false);
    // Se sono arrivate richieste durante il salvataggio, rifai il salvataggio
    if(_pendingSave) {
      _pendingSave = false;
      pushToCloud(true);
    }
  }
}

// Dalla schermata di login Drive, torna alla scelta della modalità.
// (La modalità Account ha già il "Cambia modalità" nel suo overlay.)
function tornaAllaScelta() {
  try {
    // Dimentica la scelta Drive così la schermata di scelta riparte pulita
    if(typeof Auth !== 'undefined' && Auth.clearModalita) Auth.clearModalita();
    const gate = document.getElementById('loginGate');
    if(gate) gate.style.display = 'none';
    if(typeof AuthUI !== 'undefined' && AuthUI.mostraScelta) {
      AuthUI.mostraScelta();
    } else if(gate) {
      // fallback: se AuthUI non c'è, lascia il loginGate visibile
      gate.style.display = 'flex';
    }
  } catch(e) {
    console.error('[Drive] tornaAllaScelta:', e.message);
  }
}

function driveLogoutApp() {
  const inAccount = (typeof Auth !== 'undefined' && Auth.getModalita() === 'account');
  const domanda = inAccount
    ? 'Uscire dall\'account? Per rientrare dovrai accedere di nuovo.'
    : 'Disconnettersi da Google Drive? Per accedere di nuovo dovrai rifare il login.';
  if(!confirm(domanda)) return;
  // Cancella timer e flag pendenti
  if(_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  _pendingSave = false;
  _hasUnsavedChanges = false;
  if(inAccount) {
    // logout account: scarta il token (l'endpoint è no-op)
    try { Auth.logout(); } catch(e) { console.error('[Auth] logout:', e.message); }
  } else {
    driveLogout();
  }
  _isAuthorized = false;
  // Azzera lo stato in memoria
  arnie = []; logBook = [];
  articoli = []; movimentazioni = [];
  movimentiContabili = [];
  obiettivi = [];
  necessita = [];
  todos = [];
  settings = { duplicatiIgnorati: [] };
  // Pulisci anche la cache locale
  ['arnie','logBook','articoli','movimentazioni','movimentiContabili','obiettivi','necessita','todos','apiario_settings'].forEach(k => localStorage.removeItem(k));
  document.getElementById('appContent').style.display = 'none';
  // Torna alla schermata di scelta modalità (così può cambiare Drive/Account)
  if(typeof AuthUI !== 'undefined' && AuthUI.mostraScelta) {
    const gate = document.getElementById('loginGate');
    if(gate) gate.style.display = 'none';
    AuthUI.mostraScelta();
  } else {
    document.getElementById('loginGate').style.display = 'flex';
    document.getElementById('loginGateStatus').textContent = '👇 Tocca il pulsante per accedere';
  }
}

// Avvio dei dati per la modalità Drive (flusso storico, invariato)
function avviaModalitaDrive() {
  document.getElementById('loginGate').style.display = 'flex';
  setTimeout(initGoogleDrive, DRIVE_INIT_DELAY_MS);
}

// Avvio per la modalità Account: i dati arrivano dal backend via Storage.
// (AuthUI ha già attivato il BackendAdapter prima di chiamarci.)
async function avviaModalitaAccount() {
  const gate = document.getElementById('loginGate');
  if(gate) gate.style.display = 'none';
  await loadFromCloud();      // ora passa per il BackendAdapter
  _isAuthorized = true;
  showApp();
}

window.addEventListener('load', () => {
  // Gate di scelta modalità (Drive / Account). Se AuthUI non è disponibile
  // per qualunque motivo, ricade sul flusso Drive storico (sicurezza).
  if (typeof AuthUI !== 'undefined' && AuthUI.avvia) {
    AuthUI.avvia({
      titolo: 'Il Mio Apiario',
      onDrive: avviaModalitaDrive,
      onAccount: avviaModalitaAccount,
    });
  } else {
    avviaModalitaDrive();
  }
});

// Avvisa prima di chiudere la scheda se ci sono modifiche non salvate
window.addEventListener('beforeunload', (e) => {
  if(_hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
});
