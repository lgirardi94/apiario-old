// ===== FILE VERSION: 2026-05-28.1 · storage.js =====
//
// STRATO DI ASTRAZIONE STORAGE
// ============================
// Unico punto di accesso al salvataggio/caricamento dei dati dell'app.
// L'app NON chiama più direttamente le funzioni drive*(): chiama Storage.*,
// che delega all'adapter attivo. Per ora esiste solo il DriveAdapter (Google Drive),
// quindi il comportamento è identico a prima. In futuro si potrà aggiungere un
// BackendAdapter (server + database) senza toccare il resto dell'app.
//
// Interfaccia pubblica (oggetto globale Storage):
//   await Storage.carica()                      -> { db, mag, cont, ob, nec, settings, todo }
//   await Storage.salvaTutto({ db, mag, ... })  -> salva SOLO le sezioni presenti nell'oggetto
//   await Storage.salvaFile(nome, dati)         -> scrittura di un singolo file
//   await Storage.leggiFile(nome)               -> lettura di un singolo file (null se assente)
//   await Storage.listaBackup()                 -> [{ id, name, modifiedTime }]
//   await Storage.creaBackup(dati, max)         -> crea backup datato (ritorna il nome)
//   await Storage.eliminaFile(id)               -> elimina un file per id
//   Storage.modalita                            -> 'drive' (per ora sempre)
//
// NOTA: le costanti FILENAME_* e le funzioni drive*() restano in shared.js.
// Questo file le usa tramite l'adapter; non le ridefinisce.

(function () {
  'use strict';

  // ---- Adapter: Google Drive ----
  // Incapsula le funzioni drive*() già presenti in shared.js, senza cambiarne il comportamento.
  const DriveAdapter = {
    nome: 'drive',

    async carica() {
      // driveLoadAll ritorna già { db, mag, cont, ob, nec, settings, todo }
      return await driveLoadAll();
    },

    async salvaTutto(dati) {
      // Salva solo le sezioni effettivamente presenti in `dati`.
      // Per le sezioni assenti NON tocca il file su Drive (scrittura selettiva).
      const ts = new Date().toISOString();
      const mappa = {
        db:       FILENAME_DB,
        mag:      FILENAME_MAG,
        cont:     FILENAME_CONT,
        ob:       FILENAME_OB,
        nec:      FILENAME_NEC,
        settings: FILENAME_SETTINGS,
        todo:     FILENAME_TODO,
      };
      const scritture = [];
      Object.keys(mappa).forEach(chiave => {
        if (dati[chiave] !== undefined && dati[chiave] !== null) {
          const payload = { version: 1, savedAt: ts, ...dati[chiave] };
          scritture.push(driveWriteFile(mappa[chiave], payload));
        }
      });
      await Promise.all(scritture);
    },

    async salvaFile(nome, dati) {
      return await driveWriteFile(nome, dati);
    },

    async leggiFile(nome) {
      return await driveReadFile(nome);
    },

    async listaBackup() {
      return await driveListBackups();
    },

    async creaBackup(dati, max = 5) {
      return await driveCreateAutoBackup(dati, max);
    },

    async eliminaFile(id) {
      return await driveDeleteFile(id);
    },
  };

  // ---- Selezione dell'adapter attivo ----
  // Oggi: sempre Drive. Domani qui si potrà scegliere tra DriveAdapter e BackendAdapter
  // in base alla modalità scelta dall'utente all'avvio.
  let _adapter = DriveAdapter;

  // ---- Oggetto pubblico Storage ----
  const Storage = {
    get modalita() { return _adapter ? _adapter.nome : 'nessuno'; },

    // Permette in futuro di cambiare adapter (per ora non usato dall'app).
    _setAdapter(a) {
      if (a && typeof a.carica === 'function') { _adapter = a; }
      else { console.error('[Storage] Adapter non valido, mantengo quello attuale.'); }
    },

    async carica() {
      try {
        return await _adapter.carica();
      } catch (e) {
        console.error('[Storage] Errore in carica():', e.message);
        throw e;
      }
    },

    async salvaTutto(dati) {
      try {
        if (!dati || typeof dati !== 'object') {
          console.error('[Storage] salvaTutto richiede un oggetto { db, mag, ... }');
          return;
        }
        return await _adapter.salvaTutto(dati);
      } catch (e) {
        console.error('[Storage] Errore in salvaTutto():', e.message);
        throw e;
      }
    },

    async salvaFile(nome, dati) {
      try {
        if (!nome) { console.error('[Storage] salvaFile: nome mancante'); return; }
        return await _adapter.salvaFile(nome, dati);
      } catch (e) {
        console.error('[Storage] Errore in salvaFile(' + nome + '):', e.message);
        throw e;
      }
    },

    async leggiFile(nome) {
      try {
        if (!nome) { console.error('[Storage] leggiFile: nome mancante'); return null; }
        return await _adapter.leggiFile(nome);
      } catch (e) {
        console.error('[Storage] Errore in leggiFile(' + nome + '):', e.message);
        throw e;
      }
    },

    async listaBackup() {
      try {
        return await _adapter.listaBackup();
      } catch (e) {
        console.error('[Storage] Errore in listaBackup():', e.message);
        throw e;
      }
    },

    async creaBackup(dati, max) {
      try {
        return await _adapter.creaBackup(dati, max);
      } catch (e) {
        console.error('[Storage] Errore in creaBackup():', e.message);
        throw e;
      }
    },

    async eliminaFile(id) {
      try {
        if (!id) { console.error('[Storage] eliminaFile: id mancante'); return; }
        return await _adapter.eliminaFile(id);
      } catch (e) {
        console.error('[Storage] Errore in eliminaFile():', e.message);
        throw e;
      }
    },
  };

  // Espone Storage globalmente (sia per l'app principale sia per le PWA che caricano questo file)
  window.Storage = Storage;
})();
