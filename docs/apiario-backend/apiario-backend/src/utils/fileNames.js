// =========================================================
//  utils/fileNames.js
//  Corrispondenza tra le chiavi brevi usate dall'app
//  ( { db, mag, cont, ob, nec, settings, todo } )
//  e i file_name salvati nel database.
//  Un solo posto per questa mappa.
// =========================================================

// chiave breve (lato app/Storage)  ->  file_name (lato DB)
export const CHIAVE_TO_FILENAME = {
  db:       'db',
  mag:      'magazzino',
  cont:     'contabilita',
  ob:       'obiettivi',
  nec:      'necessita',
  settings: 'settings',
  todo:     'todo',
};

// Mappa inversa: file_name (DB)  ->  chiave breve (app)
export const FILENAME_TO_CHIAVE = Object.fromEntries(
  Object.entries(CHIAVE_TO_FILENAME).map(([chiave, file]) => [file, chiave])
);

// Tutte le chiavi brevi previste (per iterare in carica()/salvaTutto()).
export const CHIAVI = Object.keys(CHIAVE_TO_FILENAME);

// Tutti i file_name previsti.
export const FILE_NAMES = Object.values(CHIAVE_TO_FILENAME);

// File extra gestiti a parte (pagina etichette): non rientra nell'oggetto
// aggregato { db, mag, ... } ma è un file valido per gli endpoint per-nome.
export const FILE_EXTRA = ['etichette'];

// Tutti i nomi file accettati dagli endpoint per-nome (/api/files/:nome).
export const FILE_NAMES_VALIDI = [...FILE_NAMES, ...FILE_EXTRA];
