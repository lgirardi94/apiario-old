// ===== FILE VERSION: 2026-06-04.1 · auth-ui.js =====
//
// INTERFACCIA AUTENTICAZIONE (schermate + gate di avvio)
// ======================================================
// Modulo condiviso: genera le schermate di scelta modalità / login /
// registrazione (overlay a tutto schermo) e orchestra il flusso d'avvio.
// Usa Auth (auth.js) per le chiamate e Storage (storage.js) per i dati.
// Scritto UNA volta, incluso in tutte le pagine.
//
// Uso tipico (in ogni pagina, al posto dell'avvio diretto):
//
//   AuthUI.avvia({
//     onDrive:   function(){ /* avvia il flusso Google Drive esistente */ },
//     onAccount: async function(){ /* dati pronti dal backend: mostra l'app */ },
//     titolo:    'Il Mio Apiario'
//   });
//
// Il gate decide in base a Auth.getModalita():
//   'drive'   -> chiama onDrive()
//   'account' -> se token valido: attiva adapter + onAccount(); altrimenti login
//   (nessuna) -> mostra la schermata di scelta
//
// Su sessione scaduta (AUTH_EXPIRED) l'app può richiamare AuthUI.mostraLogin().

(function () {
  'use strict';

  // Config interna passata da avvia()
  let _cfg = { onDrive: null, onAccount: null, titolo: 'Il Mio Apiario' };
  let _montato = false;

  // ---- CSS (iniettato una volta) ----
  const CSS = `
  #authOverlay, #authOverlay *{ box-sizing:border-box; }
  #authOverlay{
    position:fixed; inset:0; z-index:4000;
    display:none; align-items:center; justify-content:center; padding:24px;
    font-family:'Spline Sans',system-ui,sans-serif; color:#3A2E1A;
    background:
      radial-gradient(circle at 18% 12%, rgba(232,163,23,.10), transparent 42%),
      radial-gradient(circle at 86% 88%, rgba(200,132,26,.10), transparent 46%),
      linear-gradient(160deg, #FBF4E6 0%, #F5E9D0 100%);
    overflow:auto;
  }
  #authOverlay .au-stage{ position:relative; width:100%; max-width:460px; }
  #authOverlay .au-card{
    background:#FFFDF8; border:1px solid #E6D6B3; border-radius:24px;
    box-shadow:0 10px 40px -12px rgba(139,94,20,.28);
    padding:38px 30px 30px; position:relative; overflow:hidden;
  }
  #authOverlay .au-card::after{
    content:""; position:absolute; top:0; left:0; right:0; height:5px;
    background:linear-gradient(90deg, #E8A317, #8B5E14);
  }
  #authOverlay .au-brand{ text-align:center; margin-bottom:26px; }
  #authOverlay .au-logo{
    width:60px; height:60px; margin:0 auto 12px;
    display:flex; align-items:center; justify-content:center; font-size:32px;
    background:radial-gradient(circle at 35% 30%, #FFD466, #E8A317 70%);
    border-radius:18px; box-shadow:0 4px 16px -6px rgba(139,94,20,.22), inset 0 -3px 8px rgba(139,94,20,.25);
    transform:rotate(-4deg);
  }
  #authOverlay .au-brand h1{ font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:25px; color:#8B5E14; letter-spacing:-.01em; }
  #authOverlay .au-brand p{ color:#7A6A4F; font-size:14px; margin-top:5px; }
  #authOverlay .au-title{ font-family:'Fraunces',Georgia,serif; font-size:19px; font-weight:600; margin-bottom:6px; }
  #authOverlay .au-sub{ color:#7A6A4F; font-size:14px; margin-bottom:20px; line-height:1.5; }
  #authOverlay .au-mode{
    width:100%; text-align:left; border:1.5px solid #E6D6B3; background:#FFFDF8;
    border-radius:18px; padding:18px 16px; display:flex; gap:14px; align-items:flex-start;
    cursor:pointer; transition:transform .18s, box-shadow .18s, border-color .18s, background .18s;
    margin-bottom:13px; font-family:inherit; position:relative;
  }
  #authOverlay .au-mode:hover{ transform:translateY(-2px); box-shadow:0 4px 16px -6px rgba(139,94,20,.22); border-color:#E8A317; background:#FFFEFB; }
  #authOverlay .au-mode-ico{ flex:0 0 46px; height:46px; display:flex; align-items:center; justify-content:center; font-size:24px; border-radius:13px; background:#FBF4E6; border:1px solid #E6D6B3; }
  #authOverlay .au-mode-body{ flex:1; padding-top:1px; }
  #authOverlay .au-mode-body h3{ font-size:15.5px; font-weight:600; margin-bottom:3px; display:flex; align-items:center; gap:8px; }
  #authOverlay .au-mode-body p{ font-size:13px; color:#7A6A4F; line-height:1.45; }
  #authOverlay .au-mode-arrow{ align-self:center; color:#C8841A; font-size:20px; transition:transform .18s; }
  #authOverlay .au-mode:hover .au-mode-arrow{ transform:translateX(4px); }
  #authOverlay .au-tag{ font-size:10.5px; font-weight:600; background:#E8A317; color:#fff; padding:2px 8px; border-radius:999px; letter-spacing:.02em; }
  #authOverlay .au-field{ margin-bottom:15px; }
  #authOverlay .au-field label{ display:block; font-size:13px; font-weight:500; margin-bottom:6px; }
  #authOverlay .au-inwrap{ position:relative; }
  #authOverlay .au-field input{
    width:100%; padding:12px 14px; border:1.5px solid #E6D6B3; border-radius:12px;
    font-size:15px; font-family:inherit; background:#FFFEFB; color:#3A2E1A; transition:border-color .15s, box-shadow .15s;
  }
  #authOverlay .au-field input:focus{ outline:none; border-color:#E8A317; box-shadow:0 0 0 3px rgba(232,163,23,.16); }
  #authOverlay .au-eye{ position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:16px; padding:4px; color:#7A6A4F; }
  #authOverlay .au-btn{ width:100%; padding:13px; border:none; border-radius:12px; font-size:15px; font-weight:600; font-family:inherit; cursor:pointer; transition:transform .15s, filter .15s; }
  #authOverlay .au-btn:disabled{ opacity:.6; cursor:default; }
  #authOverlay .au-btn-primary{ background:linear-gradient(135deg, #E8A317, #C8841A); color:#fff; box-shadow:0 4px 16px -6px rgba(139,94,20,.22); }
  #authOverlay .au-btn-primary:hover:not(:disabled){ transform:translateY(-1px); filter:brightness(1.04); }
  #authOverlay .au-btn-ghost{ background:transparent; color:#8B5E14; border:1.5px solid #E6D6B3; margin-top:10px; }
  #authOverlay .au-btn-ghost:hover{ background:#FBF4E6; }
  #authOverlay .au-link{ display:inline-block; color:#C8841A; font-size:13.5px; text-decoration:none; cursor:pointer; }
  #authOverlay .au-link:hover{ text-decoration:underline; }
  #authOverlay .au-row{ display:flex; justify-content:space-between; align-items:center; margin-top:4px; }
  #authOverlay .au-back{ display:inline-flex; align-items:center; gap:6px; color:#7A6A4F; font-size:13.5px; background:none; border:none; cursor:pointer; font-family:inherit; margin-bottom:16px; padding:0; }
  #authOverlay .au-back:hover{ color:#3A2E1A; }
  #authOverlay .au-err{ background:#FBEBE4; border:1px solid #E6BBA6; color:#B5562E; font-size:13px; border-radius:10px; padding:9px 12px; margin-bottom:14px; display:none; }
  #authOverlay .au-fieldmsg{ font-size:12px; color:#B5562E; margin-top:5px; display:none; }
  #authOverlay .au-foot{ text-align:center; font-size:13px; color:#7A6A4F; margin-top:18px; }
  #authOverlay .au-divider{ height:1px; background:#E6D6B3; margin:18px 0; }
  `;

  // ---- helpers DOM ----
  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function montaSeServe() {
    if (_montato) return;
    try {
      // CSS
      const style = document.createElement('style');
      style.id = 'authOverlayStyle';
      style.textContent = CSS;
      document.head.appendChild(style);
      // Overlay container (figlio diretto del body, fuori da stacking context)
      const ov = el('<div id="authOverlay"><div class="au-stage"><div class="au-card" id="authCard"></div></div></div>');
      document.body.appendChild(ov);
      _montato = true;
    } catch (e) {
      console.error('[AuthUI] Errore montaggio:', e.message);
    }
  }
  function mostraOverlay() {
    montaSeServe();
    const ov = document.getElementById('authOverlay');
    if (ov) ov.style.display = 'flex';
  }
  function nascondiOverlay() {
    const ov = document.getElementById('authOverlay');
    if (ov) ov.style.display = 'none';
  }
  function setCard(html) {
    montaSeServe();
    const c = document.getElementById('authCard');
    if (c) c.innerHTML = html;
  }
  function brand() {
    return `<div class="au-brand"><div class="au-logo">🐝</div><h1>${escapeHtml(_cfg.titolo || 'Il Mio Apiario')}</h1></div>`;
  }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ============================================================
  // SCHERMATA: scelta modalità
  // ============================================================
  function mostraScelta() {
    const ultima = (typeof Auth !== 'undefined') ? Auth.getModalita() : null;
    const tagAccount = ultima === 'account' ? '<span class="au-tag">ultima usata</span>' : '';
    const tagDrive   = ultima === 'drive'   ? '<span class="au-tag">ultima usata</span>' : '';

    setCard(`
      ${brand()}
      <div class="au-title">Come vuoi accedere?</div>
      <div class="au-sub">Scegli dove salvare i tuoi dati. Potrai cambiare in qualsiasi momento.</div>

      <button class="au-mode" id="auModeAccount">
        <div class="au-mode-ico">👤</div>
        <div class="au-mode-body">
          <h3>Account ${tagAccount}</h3>
          <p>Accedi con email e password. I dati sono sul server, sincronizzati su tutti i tuoi dispositivi.</p>
        </div>
        <div class="au-mode-arrow">→</div>
      </button>

      <button class="au-mode" id="auModeDrive">
        <div class="au-mode-ico">☁️</div>
        <div class="au-mode-body">
          <h3>Google Drive ${tagDrive}</h3>
          <p>Usa il tuo Google Drive personale. I dati restano sul tuo account Google.</p>
        </div>
        <div class="au-mode-arrow">→</div>
      </button>
    `);
    mostraOverlay();
    const a = document.getElementById('auModeAccount');
    const d = document.getElementById('auModeDrive');
    if (a) a.onclick = () => mostraLogin();
    if (d) d.onclick = () => scegliDrive();
  }

  function scegliDrive() {
    try {
      if (typeof Auth !== 'undefined') Auth.setModalita('drive');
      nascondiOverlay();
      if (typeof _cfg.onDrive === 'function') _cfg.onDrive();
      else console.error('[AuthUI] onDrive non definito.');
    } catch (e) { console.error('[AuthUI] scegliDrive:', e.message); }
  }

  // ============================================================
  // SCHERMATA: login (account)
  // ============================================================
  function mostraLogin() {
    setCard(`
      ${brand()}
      <button class="au-back" id="auBackToChoice">← Cambia modalità</button>
      <div class="au-title">Accedi al tuo account</div>
      <div class="au-sub">Inserisci le tue credenziali per continuare.</div>
      <div class="au-err" id="auLoginErr"></div>
      <div class="au-field">
        <label for="auLoginEmail">Email</label>
        <input type="email" id="auLoginEmail" autocomplete="email" placeholder="nome@esempio.it">
      </div>
      <div class="au-field">
        <label for="auLoginPwd">Password</label>
        <div class="au-inwrap">
          <input type="password" id="auLoginPwd" autocomplete="current-password" placeholder="••••••••">
          <button type="button" class="au-eye" data-target="auLoginPwd">👁</button>
        </div>
      </div>
      <div class="au-row" style="margin-bottom:18px">
        <span class="au-link" id="auGoForgot">Password dimenticata?</span>
      </div>
      <button class="au-btn au-btn-primary" id="auLoginBtn">Accedi</button>
      <div class="au-foot">Non hai un account? <span class="au-link" id="auGoRegister">Registrati</span></div>
    `);
    mostraOverlay();
    bindEye();
    on('auBackToChoice', 'click', mostraScelta);
    on('auGoRegister', 'click', mostraRegistrazione);
    on('auGoForgot', 'click', function () {
      // Recupero password: schermata della Fase 3. Per ora avviso gentile.
      mostraInfoTemporanea('Il recupero password sarà disponibile a breve.');
    });
    on('auLoginBtn', 'click', eseguiLogin);
    // invio con Enter
    enterSubmits(['auLoginEmail', 'auLoginPwd'], eseguiLogin);
  }

  async function eseguiLogin() {
    const email = val('auLoginEmail').trim();
    const pwd = val('auLoginPwd');
    hideErr('auLoginErr');
    if (!email || !pwd) { showErr('auLoginErr', 'Inserisci email e password.'); return; }

    const btn = document.getElementById('auLoginBtn');
    setBtnLoading(btn, '⏳ Accesso...');
    try {
      await Auth.login({ email, password: pwd });
      Auth.setModalita('account');
      await entraInModalitaAccount();
    } catch (e) {
      showErr('auLoginErr', Auth.messaggioErrore(e));
      setBtnNormal(btn, 'Accedi');
    }
  }

  // ============================================================
  // SCHERMATA: registrazione
  // ============================================================
  function mostraRegistrazione() {
    setCard(`
      ${brand()}
      <button class="au-back" id="auBackToLogin">← Torna al login</button>
      <div class="au-title">Crea il tuo account</div>
      <div class="au-sub">Bastano pochi secondi. Riceverai un'email per confermare l'indirizzo.</div>
      <div class="au-err" id="auRegErr"></div>
      <div class="au-field">
        <label for="auRegNome">Nome <span style="color:#7A6A4F;font-weight:400">(facoltativo)</span></label>
        <input type="text" id="auRegNome" autocomplete="name" placeholder="Come ti chiami">
      </div>
      <div class="au-field">
        <label for="auRegEmail">Email</label>
        <input type="email" id="auRegEmail" autocomplete="email" placeholder="nome@esempio.it">
        <div class="au-fieldmsg" id="auRegEmailMsg"></div>
      </div>
      <div class="au-field">
        <label for="auRegPwd">Password</label>
        <div class="au-inwrap">
          <input type="password" id="auRegPwd" autocomplete="new-password" placeholder="Almeno 8 caratteri">
          <button type="button" class="au-eye" data-target="auRegPwd">👁</button>
        </div>
        <div class="au-fieldmsg" id="auRegPwdMsg"></div>
      </div>
      <button class="au-btn au-btn-primary" id="auRegBtn">Crea account</button>
      <div class="au-foot">Hai già un account? <span class="au-link" id="auGoLogin">Accedi</span></div>
    `);
    mostraOverlay();
    bindEye();
    on('auBackToLogin', 'click', mostraLogin);
    on('auGoLogin', 'click', mostraLogin);
    on('auRegBtn', 'click', eseguiRegistrazione);
    enterSubmits(['auRegNome', 'auRegEmail', 'auRegPwd'], eseguiRegistrazione);
  }

  async function eseguiRegistrazione() {
    const nome = val('auRegNome').trim();
    const email = val('auRegEmail').trim();
    const pwd = val('auRegPwd');
    hideErr('auRegErr');
    hideMsg('auRegEmailMsg'); hideMsg('auRegPwdMsg');

    // validazione inline minima
    let valido = true;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      showMsg('auRegEmailMsg', 'Inserisci un indirizzo email valido.'); valido = false;
    }
    if (!pwd || pwd.length < 8) {
      showMsg('auRegPwdMsg', 'La password deve avere almeno 8 caratteri.'); valido = false;
    }
    if (!valido) return;

    const btn = document.getElementById('auRegBtn');
    setBtnLoading(btn, '⏳ Creazione...');
    try {
      await Auth.register({ email, password: pwd, nome });
      Auth.setModalita('account');
      await entraInModalitaAccount();
    } catch (e) {
      // se l'errore ha dettagli sui campi, mostrali inline
      if (e && e.code === 'EMAIL_IN_USE') {
        showMsg('auRegEmailMsg', Auth.messaggioErrore(e));
      } else {
        showErr('auRegErr', Auth.messaggioErrore(e));
      }
      setBtnNormal(btn, 'Crea account');
    }
  }

  // ============================================================
  // INGRESSO in modalità account: attiva adapter + carica app
  // ============================================================
  async function entraInModalitaAccount() {
    // attiva il BackendAdapter (Storage parlerà col backend)
    Auth.attivaBackendAdapter(function onAuthExpired() {
      // sessione scaduta in corsa: torna al login
      mostraLogin();
      showErr('auLoginErr', Auth.messaggioErrore({ code: 'AUTH_EXPIRED' }));
    });
    nascondiOverlay();
    try {
      if (typeof _cfg.onAccount === 'function') {
        await _cfg.onAccount();
      } else {
        console.error('[AuthUI] onAccount non definito.');
      }
    } catch (e) {
      console.error('[AuthUI] onAccount:', e.message);
      // se i dati non si caricano per sessione scaduta, l'adapter ha già gestito il redirect
      if (e && e.code === 'AUTH_EXPIRED') return;
      // altrimenti, errore generico: rimanda al login con messaggio
      mostraLogin();
      showErr('auLoginErr', Auth.messaggioErrore(e));
    }
  }

  // ============================================================
  // GATE DI AVVIO
  // ============================================================
  async function avvia(cfg) {
    _cfg = Object.assign({ onDrive: null, onAccount: null, titolo: 'Il Mio Apiario' }, cfg || {});
    const mod = (typeof Auth !== 'undefined') ? Auth.getModalita() : null;

    if (mod === 'drive') {
      if (typeof _cfg.onDrive === 'function') _cfg.onDrive();
      return;
    }

    if (mod === 'account') {
      // c'è un token? proviamo a validarlo
      if (Auth.isLoggedIn()) {
        // attiva subito l'adapter così me()/carica() vanno al backend
        Auth.attivaBackendAdapter(function onAuthExpired() {
          mostraLogin();
        });
        try {
          await Auth.me(); // valida la sessione
          await entraInModalitaAccount();
          return;
        } catch (e) {
          // token non valido/scaduto -> login
          Auth.clearToken();
          mostraLogin();
          return;
        }
      }
      // nessun token -> login
      mostraLogin();
      return;
    }

    // nessuna scelta salvata -> schermata di scelta
    mostraScelta();
  }

  // ============================================================
  // utility piccole
  // ============================================================
  function on(id, ev, fn) { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); }
  function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
  function showErr(id, msg) { const e = document.getElementById(id); if (e) { e.textContent = msg; e.style.display = 'block'; } }
  function hideErr(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  function showMsg(id, msg) { const e = document.getElementById(id); if (e) { e.textContent = msg; e.style.display = 'block'; } }
  function hideMsg(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  function setBtnLoading(btn, txt) { if (btn) { btn.disabled = true; btn.dataset._t = btn.textContent; btn.textContent = txt; } }
  function setBtnNormal(btn, txt) { if (btn) { btn.disabled = false; btn.textContent = txt || btn.dataset._t || btn.textContent; } }
  function bindEye() {
    document.querySelectorAll('#authOverlay .au-eye').forEach(function (b) {
      b.addEventListener('click', function () {
        const t = document.getElementById(b.getAttribute('data-target'));
        if (!t) return;
        t.type = t.type === 'password' ? 'text' : 'password';
        b.textContent = t.type === 'password' ? '👁' : '🙈';
      });
    });
  }
  function enterSubmits(ids, fn) {
    ids.forEach(function (id) {
      const e = document.getElementById(id);
      if (e) e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); fn(); } });
    });
  }
  function mostraInfoTemporanea(testo) {
    // piccolo avviso non bloccante in cima alla card login
    showErr('auLoginErr', testo);
  }

  // ---- API pubblica ----
  window.AuthUI = {
    avvia: avvia,
    mostraScelta: mostraScelta,
    mostraLogin: mostraLogin,
    mostraRegistrazione: mostraRegistrazione,
    nascondi: nascondiOverlay,
  };
})();
