// ===== FILE VERSION: 2026-06-04.1 · auth.js =====
//
// MODULO AUTENTICAZIONE (modalità account)
// ========================================
// Unico punto per: gestione del token JWT, gestione della modalità scelta
// (account / drive), chiamate agli endpoint /api/auth del backend, e
// attivazione del BackendAdapter.
//
// Questo modulo NON fa nulla al caricamento: espone solo window.Auth.
// Sarà l'app (le schermate di login) a chiamarne i metodi. Quindi includerlo
// nelle pagine NON cambia il comportamento finché non viene usato.
//
// Interfaccia pubblica (window.Auth):
//   --- configurazione ---
//   Auth.BASE_URL                      URL del backend (da configurare sotto)
//   --- token ---
//   Auth.getToken()                    -> string | null
//   Auth.setToken(t)                   salva il JWT
//   Auth.clearToken()                  rimuove il JWT
//   Auth.isLoggedIn()                  -> bool (c'è un token?)
//   --- modalità ('account' | 'drive') ---
//   Auth.getModalita()                 -> 'account' | 'drive' | null
//   Auth.setModalita(m)                salva la modalità
//   Auth.clearModalita()               dimentica la modalità
//   --- chiamate API auth (tutte async) ---
//   Auth.register({ email, password, nome }) -> { token, user }
//   Auth.login({ email, password })          -> { token, user }
//   Auth.me()                                -> { user }
//   Auth.logout()                            -> { ok }
//   Auth.forgotPassword(email)               -> { ok, message }
//   Auth.resetPassword({ token, newPassword })-> { ok, message }
//   Auth.resendVerification()                -> { ok }
//   Auth.verifyEmail(token)                  -> { ok, message }
//   --- adapter ---
//   Auth.attivaBackendAdapter(onAuthExpired)  collega Storage al backend
//   --- messaggi d'errore ---
//   Auth.messaggioErrore(err)          -> stringa gentile per la UI (da err.code)
//
// Ogni metodo che fallisce solleva un Error con err.code valorizzato quando il
// backend fornisce un codice (es. 'INVALID_CREDENTIALS'), così la UI può
// tradurlo in un messaggio gentile con Auth.messaggioErrore(err).

(function () {
  'use strict';

  // ============================================================
  // CONFIGURAZIONE — da impostare con l'URL reale del backend.
  // Esempio: 'https://apiario-backend.tuonome.app'
  // Finché è il placeholder, la modalità account non funzionerà
  // (ma la modalità Drive continua a funzionare normalmente).
  // ============================================================
  const BASE_URL = 'https://CONFIGURA-URL-BACKEND';

  const CHIAVE_TOKEN = 'apiario_token';
  const CHIAVE_MODALITA = 'apiario_modalita';

  // ---- helper interno: fetch verso /api/auth con gestione errori ----
  async function authFetch(percorso, { method = 'GET', body = null, autenticata = false } = {}) {
    const base = String(BASE_URL || '').replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (autenticata) {
      const t = leggiToken();
      if (t) headers['Authorization'] = 'Bearer ' + t;
    }

    let risposta;
    try {
      risposta = await fetch(base + percorso, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      const err = new Error('Connessione assente, riprova.');
      err.code = 'NETWORK_ERROR';
      throw err;
    }

    // Prova a leggere il corpo JSON (anche per gli errori, che portano { error, code, details }).
    let corpo = null;
    try {
      const testo = await risposta.text();
      corpo = testo ? JSON.parse(testo) : null;
    } catch (_) { corpo = null; }

    if (!risposta.ok) {
      const err = new Error((corpo && corpo.error) ? corpo.error : ('Errore ' + risposta.status));
      err.status = risposta.status;
      if (corpo && corpo.code) err.code = corpo.code;
      if (corpo && corpo.details) err.details = corpo.details;
      // Normalizza i 401 di sessione a AUTH_EXPIRED (come fa il BackendAdapter)
      if (risposta.status === 401 && !err.code) err.code = 'AUTH_EXPIRED';
      throw err;
    }

    return corpo;
  }

  // ---- token (storage) ----
  function leggiToken() {
    try { return localStorage.getItem(CHIAVE_TOKEN); }
    catch (e) { console.error('[Auth] getToken:', e.message); return null; }
  }
  function scriviToken(t) {
    try { if (t) localStorage.setItem(CHIAVE_TOKEN, t); }
    catch (e) { console.error('[Auth] setToken:', e.message); }
  }
  function rimuoviToken() {
    try { localStorage.removeItem(CHIAVE_TOKEN); }
    catch (e) { console.error('[Auth] clearToken:', e.message); }
  }

  // ---- modalità (storage) ----
  function leggiModalita() {
    try { return localStorage.getItem(CHIAVE_MODALITA); }
    catch (e) { console.error('[Auth] getModalita:', e.message); return null; }
  }
  function scriviModalita(m) {
    try {
      if (m === 'account' || m === 'drive') localStorage.setItem(CHIAVE_MODALITA, m);
      else console.warn('[Auth] modalità non valida:', m);
    } catch (e) { console.error('[Auth] setModalita:', e.message); }
  }
  function rimuoviModalita() {
    try { localStorage.removeItem(CHIAVE_MODALITA); }
    catch (e) { console.error('[Auth] clearModalita:', e.message); }
  }

  // ---- messaggi d'errore gentili per la UI ----
  const MESSAGGI = {
    INVALID_CREDENTIALS: 'Email o password non corretti.',
    EMAIL_IN_USE:        'Questa email è già registrata.',
    VALIDATION_ERROR:    'Controlla i dati inseriti.',
    INVALID_TOKEN:       'Il link è scaduto o non valido.',
    AUTH_EXPIRED:        'Sessione scaduta, accedi di nuovo.',
    RATE_LIMITED:        'Troppi tentativi, riprova tra poco.',
    NETWORK_ERROR:       'Connessione assente, riprova.',
  };

  // ---- oggetto pubblico ----
  const Auth = {
    BASE_URL: BASE_URL,

    // token
    getToken: leggiToken,
    setToken: scriviToken,
    clearToken: rimuoviToken,
    isLoggedIn() { return !!leggiToken(); },

    // modalità
    getModalita: leggiModalita,
    setModalita: scriviModalita,
    clearModalita: rimuoviModalita,

    // --- API: autenticazione ---
    async register({ email, password, nome } = {}) {
      const corpo = { email, password };
      if (nome) corpo.nome = nome;
      const res = await authFetch('/api/auth/register', { method: 'POST', body: corpo });
      if (res && res.token) scriviToken(res.token);
      return res;
    },

    async login({ email, password } = {}) {
      const res = await authFetch('/api/auth/login', { method: 'POST', body: { email, password } });
      if (res && res.token) scriviToken(res.token);
      return res;
    },

    async me() {
      return await authFetch('/api/auth/me', { method: 'GET', autenticata: true });
    },

    async logout() {
      // Il logout vero è scartare il token lato client; l'endpoint è no-op.
      try { await authFetch('/api/auth/logout', { method: 'POST' }); }
      catch (e) { /* non bloccare il logout locale per un errore di rete */ }
      rimuoviToken();
      return { ok: true };
    },

    async forgotPassword(email) {
      return await authFetch('/api/auth/forgot-password', { method: 'POST', body: { email } });
    },

    async resetPassword({ token, newPassword } = {}) {
      return await authFetch('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } });
    },

    async resendVerification() {
      return await authFetch('/api/auth/resend-verification', { method: 'POST', autenticata: true });
    },

    async verifyEmail(token) {
      return await authFetch('/api/auth/verify-email?token=' + encodeURIComponent(token || ''), { method: 'GET' });
    },

    // --- attivazione adapter backend ---
    // Collega Storage al backend usando il token corrente. Da chiamare dopo un
    // login riuscito in modalità account, e all'avvio se la modalità è 'account'.
    attivaBackendAdapter(onAuthExpired) {
      try {
        if (typeof creaBackendAdapter !== 'function') {
          console.error('[Auth] creaBackendAdapter non disponibile (backendAdapter.js non caricato?).');
          return false;
        }
        if (typeof Storage === 'undefined' || !Storage._setAdapter) {
          console.error('[Auth] Storage non disponibile (storage.js non caricato?).');
          return false;
        }
        Storage._setAdapter(creaBackendAdapter({
          baseUrl: BASE_URL,
          getToken: leggiToken,
          onAuthExpired: function () {
            rimuoviToken();
            if (typeof onAuthExpired === 'function') {
              try { onAuthExpired(); } catch (e) { console.error('[Auth] onAuthExpired:', e.message); }
            }
          },
        }));
        return true;
      } catch (e) {
        console.error('[Auth] attivaBackendAdapter:', e.message);
        return false;
      }
    },

    // --- messaggio gentile per la UI ---
    messaggioErrore(err) {
      if (!err) return 'Si è verificato un errore.';
      if (err.code && MESSAGGI[err.code]) return MESSAGGI[err.code];
      return err.message || 'Si è verificato un errore.';
    },
  };

  window.Auth = Auth;
})();
