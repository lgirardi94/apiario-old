// ===== FILE VERSION: 2026-06-04.1 · backendAdapter.js =====
//
// ADAPTER BACKEND (modalità account)
// ==================================
// Gemello del DriveAdapter: implementa la STESSA interfaccia che Storage
// si aspetta, ma invece di parlare con Google Drive parla con l'API REST
// del backend. Si attiva con:
//
//     Storage._setAdapter(creaBackendAdapter({ baseUrl, getToken, onAuthExpired }));
//
// Interfaccia implementata (identica a DriveAdapter):
//   nome
//   carica()                 -> { db, mag, cont, ob, nec, settings, todo }
//   salvaTutto(dati)         -> salva SOLO le sezioni presenti
//   salvaFile(nome, dati)    -> scrittura singolo file
//   leggiFile(nome)          -> contenuto o null se assente
//   listaBackup()            -> [{ id, name, modifiedTime }]
//   creaBackup(dati, max)    -> nome del backup creato
//   eliminaFile(id)          -> elimina per id (file o backup)
//
// NOTE DI DESIGN:
// - L'adapter NON logga: solleva errori puliti. Storage fa log + throw.
// - Un 401 da token scaduto diventa un Error con err.code = 'AUTH_EXPIRED',
//   così l'app può intercettarlo e riportare al login.
// - I metadati { version, savedAt } vengono aggiunti qui (come fa il
//   DriveAdapter), così il backend riceve il JSON completo e lo salva as-is.

(function () {
  'use strict';

  // Costruisce l'adapter. Parametri:
  //   baseUrl        URL base del backend, es. 'https://api.miosito.ch'
  //   getToken       funzione che ritorna il JWT corrente (string|null)
  //   onAuthExpired  (opzionale) callback invocata quando il token è scaduto
  function creaBackendAdapter({ baseUrl, getToken, onAuthExpired } = {}) {
    if (!baseUrl) {
      console.error('[BackendAdapter] baseUrl mancante.');
    }

    // Rimuove eventuale slash finale dal baseUrl.
    const BASE = String(baseUrl || '').replace(/\/+$/, '');

    // Mappa chiavi brevi (app) -> file_name (backend), per gli endpoint per-nome.
    // Per /api/files (oggetto aggregato) il backend usa già le chiavi brevi.
    const MAPPA_NOMI = {
      db:       'db',
      mag:      'magazzino',
      cont:     'contabilita',
      ob:       'obiettivi',
      nec:      'necessita',
      settings: 'settings',
      todo:     'todo',
    };

    // Traduce un "nome" ricevuto da salvaFile/leggiFile nel file_name del backend.
    // Accetta sia chiavi brevi ('mag') sia nomi già espliciti ('magazzino', 'etichette').
    function risolviNomeFile(nome) {
      if (MAPPA_NOMI[nome]) return MAPPA_NOMI[nome];
      return nome; // già un file_name valido (es. 'etichette', 'magazzino')
    }

    // ---- Helper: fetch autenticata + gestione uniforme degli errori ----
    async function apiFetch(percorso, opzioni = {}) {
      const token = typeof getToken === 'function' ? getToken() : null;

      const headers = Object.assign(
        { 'Content-Type': 'application/json' },
        opzioni.headers || {}
      );
      if (token) headers['Authorization'] = 'Bearer ' + token;

      let risposta;
      try {
        risposta = await fetch(BASE + percorso, { ...opzioni, headers });
      } catch (e) {
        // Errore di rete (server irraggiungibile, offline, CORS, ...).
        const err = new Error('Errore di rete: ' + (e && e.message ? e.message : 'connessione fallita'));
        err.code = 'NETWORK_ERROR';
        throw err;
      }

      // Sessione scaduta / token non valido.
      if (risposta.status === 401) {
        let code = 'UNAUTHORIZED';
        try {
          const corpo = await risposta.json();
          if (corpo && corpo.code) code = corpo.code; // es. 'AUTH_EXPIRED'
        } catch (_) { /* corpo non JSON: ignora */ }

        const err = new Error('Sessione scaduta o non autorizzata');
        // Normalizziamo a AUTH_EXPIRED i casi di sessione non più valida,
        // così l'app ha un solo codice da intercettare per il redirect al login.
        err.code = (code === 'AUTH_EXPIRED' || code === 'TOKEN_INVALID' || code === 'TOKEN_MISSING')
          ? 'AUTH_EXPIRED'
          : code;

        if (err.code === 'AUTH_EXPIRED' && typeof onAuthExpired === 'function') {
          try { onAuthExpired(); } catch (_) { /* non bloccare */ }
        }
        throw err;
      }

      // Altri errori HTTP: proviamo a estrarre il messaggio dal corpo.
      if (!risposta.ok) {
        let messaggio = 'Errore ' + risposta.status;
        try {
          const corpo = await risposta.json();
          if (corpo && corpo.error) messaggio = corpo.error;
        } catch (_) { /* corpo non JSON */ }
        const err = new Error(messaggio);
        err.status = risposta.status;
        throw err;
      }

      // 204 No Content o corpo vuoto.
      if (risposta.status === 204) return null;
      const testo = await risposta.text();
      if (!testo) return null;
      try {
        return JSON.parse(testo);
      } catch (_) {
        return testo;
      }
    }

    // ---- Adapter ----
    return {
      nome: 'backend',

      // GET /api/files -> { db, mag, cont, ob, nec, settings, todo }
      async carica() {
        const dati = await apiFetch('/api/files', { method: 'GET' });
        return dati || {};
      },

      // PUT /api/files con SOLO le sezioni presenti (scrittura selettiva).
      // Aggiunge { version, savedAt } a ogni sezione, come il DriveAdapter.
      async salvaTutto(dati) {
        const ts = new Date().toISOString();
        const corpo = {};
        Object.keys(MAPPA_NOMI).forEach((chiave) => {
          if (dati[chiave] !== undefined && dati[chiave] !== null) {
            corpo[chiave] = { version: 1, savedAt: ts, ...dati[chiave] };
          }
        });
        await apiFetch('/api/files', {
          method: 'PUT',
          body: JSON.stringify(corpo),
        });
      },

      // PUT /api/files/:nome con body { content }.
      async salvaFile(nome, dati) {
        const fileName = risolviNomeFile(nome);
        return await apiFetch('/api/files/' + encodeURIComponent(fileName), {
          method: 'PUT',
          body: JSON.stringify({ content: dati }),
        });
      },

      // GET /api/files/:nome -> contenuto o null se assente.
      async leggiFile(nome) {
        const fileName = risolviNomeFile(nome);
        const risultato = await apiFetch('/api/files/' + encodeURIComponent(fileName), {
          method: 'GET',
        });
        // Il backend risponde { content: ... } dove content può essere null.
        return risultato ? risultato.content : null;
      },

      // GET /api/backups -> [{ id, name, modifiedTime }]
      async listaBackup() {
        const lista = await apiFetch('/api/backups', { method: 'GET' });
        return Array.isArray(lista) ? lista : [];
      },

      // POST /api/backups con body { content, max } -> ritorna il nome creato.
      async creaBackup(dati, max = 5) {
        const risultato = await apiFetch('/api/backups', {
          method: 'POST',
          body: JSON.stringify({ content: dati, max }),
        });
        return risultato ? risultato.name : null;
      },

      // DELETE /api/files/:id -> elimina per id (il backend capisce se è file o backup).
      async eliminaFile(id) {
        return await apiFetch('/api/files/' + encodeURIComponent(id), {
          method: 'DELETE',
        });
      },
    };
  }

  // Espone la factory globalmente, accanto a Storage.
  window.creaBackendAdapter = creaBackendAdapter;
})();
