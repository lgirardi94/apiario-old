# 🛠️ Il Mio Apiario — Documentazione tecnica (per lo sviluppatore)

Riferimento interno su architettura, struttura dei file, moduli, variabili globali, sistema di storage/autenticazione e convenzioni di lavoro. Documento da tenere aggiornato quando si modifica l'app.

---

## 1. Architettura in breve

App **statica** (HTML + CSS + JavaScript vanilla, nessun framework, nessun build step). Si carica su hosting statico (GitHub Pages). Tutta la logica gira nel browser.

I dati possono essere salvati in due **modalità** alternative, scelte dall'utente all'avvio:
- **Drive** — file JSON nell'area `appDataFolder` del Google Drive dell'utente (OAuth Google).
- **Account** — chiamate REST a un backend separato (Node.js + PostgreSQL), autenticazione con token JWT.

Il cuore dell'astrazione è l'oggetto **`Storage`**: tutto il codice dell'app salva/carica solo tramite `Storage`, che dietro le quinte usa un **adapter** (Drive o Backend). Aggiungere o cambiare backend non tocca il resto dell'app.

```
moduli app (arnie, registro, magazzino, ...)
        │  chiamano solo
        ▼
     Storage  ──→  adapter attivo
                   ├─ DriveAdapter   (storage.js, usa le drive*() di shared.js)
                   └─ BackendAdapter (backendAdapter.js, usa fetch verso il backend)
```

---

## 2. Struttura dei file

### Pagine HTML
| File | Ruolo |
|------|-------|
| `index.html` (era `apiario.html`) | App principale (desktop + mobile) |
| `visita_rapida.html` | PWA: registrazione rapida visita |
| `inserimento_rapido.html` | PWA: spese/magazzino/vendite/ordini rapidi |
| `todo.html` | PWA: cose da fare |
| `etichette.html` | Generatore etichette miele |
| `verifica-email.html` | Landing per il link di verifica email (legge `?token=`) |
| `reimposta-password.html` | Landing per il link di reset password (legge `?token=`) |
| `admin.html` | Pannello amministrativo (solo admin; include solo `auth.js`) |

### Core / condivisi
| File | Ruolo |
|------|-------|
| `shared.js` | Costanti (CLIENT_ID, SCOPES, FILENAME_*, CAT_*, TELAINO_OPZIONI), funzioni Drive di basso livello `drive*()`, helper condivisi |
| `js/storage.js` | Oggetto `Storage` + `DriveAdapter` (strato di astrazione storage) |
| `js/backendAdapter.js` | Factory `creaBackendAdapter()` → adapter per il backend |
| `js/auth.js` | Oggetto `Auth`: token, modalità, chiamate `/api/auth/*`, attivazione adapter |
| `js/auth-ui.js` | Oggetto `AuthUI`: schermate (scelta/login/registrazione/recupero), gate di avvio |
| `js/state.js` | Variabili globali di stato + funzioni `save*()` |
| `js/nav.js` | Navigazione tra sezioni |
| `js/versioni.js` | `FILE_VERSIONS`, `APP_BUILD`, tasto "Verifica" allineamento file |
| `style-main.css` | Stili app principale |
| `style-mobile.css` | Stili mobile/PWA |

### Moduli di sezione (in `js/`)
`home.js`, `arnie.js`, `registro.js`, `magazzino.js`, `contabilita.js`, `obiettivi.js`, `calcolatori.js`, `report.js`, `insights.js`, `necessita.js`, `ricerca.js`, `filtri.js`, `todo.js`, `import-export.js`, `drive-app.js`.

### Altri
`*.manifest.json` (3 manifest PWA), `icons/` (6 icone PWA), `gen_icons.py` (script generazione icone, non parte dell'app).

### Ordine di caricamento script (in tutte le pagine)
```
shared.js → storage.js → backendAdapter.js → auth.js → auth-ui.js → (moduli specifici)
```
L'ordine conta: `storage.js` usa le `drive*()` di `shared.js`; `auth.js` usa `Storage` e `creaBackendAdapter`; `auth-ui.js` usa `Auth` e `Storage`.

---

## 3. Variabili globali di stato (`js/state.js`)

Array/oggetti in memoria, popolati al caricamento e persistiti con le `save*()`:

| Variabile | Contenuto |
|-----------|-----------|
| `arnie` | Array oggetti ARNIA |
| `logBook` | Array oggetti VISITA |
| `articoli` | Array articoli di magazzino |
| `movimentazioni` | Array movimenti di magazzino |
| `movimentiContabili` | Array movimenti contabili |
| `obiettivi` | Array obiettivi |
| `necessita` | Array ordini/necessità |
| `todos` | Array cose da fare |
| `settings` | Oggetto impostazioni (`duplicatiIgnorati`, `fornitori`) |

Le strutture dettagliate dei singoli oggetti sono in `strutture_json_apiario.md`.

### Funzioni di persistenza (`state.js`)
`saveDB()`, `saveMagazzino()`, `saveContabilita()`, `saveObiettivi()`, `saveNecessita()`, `saveTodos()`, `saveSettings()` — ciascuna serializza la sua sezione e la salva tramite `Storage` (o l'auto-save di `drive-app.js`). Più funzioni di calcolo: `getMieleStats()`, `findUltimaIspezione()`, `countGiorniVisita()`.

---

## 4. Sistema di storage (`Storage`)

Definito in `js/storage.js` come `window.Storage`. Interfaccia (firma a oggetto, non posizionale):

```javascript
await Storage.carica()                      // → { db, mag, cont, ob, nec, settings, todo }
await Storage.salvaTutto({ db, mag, ... })  // salva SOLO le sezioni presenti
await Storage.salvaFile(nome, dati)         // scrittura singolo file
await Storage.leggiFile(nome)               // lettura singolo file (null se assente)
await Storage.listaBackup()                 // → [{ id, name, modifiedTime }]
await Storage.creaBackup(dati, max)         // backup datato → nome
await Storage.eliminaFile(id)               // elimina file/backup
Storage.modalita                            // nome adapter attivo ('drive' | 'backend')
Storage._setAdapter(adapter)                // cambia adapter (usato da Auth)
```

- **DriveAdapter** (interno a storage.js): incapsula `driveLoadAll`, `driveWriteFile`, `driveReadFile`, `driveListBackups`, `driveCreateAutoBackup`, `driveDeleteFile` di `shared.js`. Aggiunge `{version, savedAt}` alle sezioni salvate. È l'adapter di **default**.
- **BackendAdapter** (`backendAdapter.js`): stessa interfaccia, ma via `fetch` agli endpoint `/api/files` e `/api/backups`. Aggiunge l'header `Authorization: Bearer <token>`, normalizza i 401 di sessione a `err.code = 'AUTH_EXPIRED'`.

**Regola**: nessun modulo deve chiamare `drive*()` direttamente. Solo `Storage`. (Le `drive*()` restano in `shared.js` e sono usate unicamente dal DriveAdapter.)

---

## 5. Sistema di autenticazione (`Auth` + `AuthUI`)

### `js/auth.js` → `window.Auth` (logica)
Configurazione in cima al file:
```javascript
const BASE_URL = 'https://CONFIGURA-URL-BACKEND';  // ← URL del backend
```
Chiavi localStorage: `apiario_token` (JWT), `apiario_modalita` (`'account'` | `'drive'`).

Metodi: `getToken/setToken/clearToken`, `isLoggedIn`, `getModalita/setModalita/clearModalita`, e le chiamate API: `register({email,password,nome})`, `login({email,password})`, `me()`, `logout()`, `forgotPassword(email)`, `resetPassword({token,newPassword})`, `resendVerification()`, `verifyEmail(token)`. Più `attivaBackendAdapter(onAuthExpired)` (collega `Storage` al backend) e `messaggioErrore(err)` (traduce i `code` in messaggi italiani).

### `js/auth-ui.js` → `window.AuthUI` (interfaccia)
Genera le schermate come overlay (`#authOverlay`, z-index 4000, figlio diretto di `body`). Metodi: `avvia({onDrive, onAccount, titolo})` (gate di avvio), `mostraScelta()`, `mostraLogin()`, `mostraRegistrazione()`, `nascondi()`.

### Gate di avvio (`AuthUI.avvia`)
Logica eseguita all'apertura di ogni pagina:
- `modalita === 'drive'` → chiama `onDrive()` (flusso Google Drive storico)
- `modalita === 'account'` → se c'è token: attiva adapter, valida con `me()`, poi `onAccount()`; se token non valido → login
- nessuna modalità → schermata di scelta

Ogni pagina definisce le proprie `onDrive`/`onAccount` (caricano i dati e mostrano l'app), poi chiama `AuthUI.avvia(...)` al `window load`. Se `AuthUI` non è disponibile, fallback automatico al flusso Drive.

### Pagine dei link email
`verifica-email.html` e `reimposta-password.html` sono autonome: includono solo `auth.js`, leggono `?token=` e chiamano rispettivamente `Auth.verifyEmail` e `Auth.resetPassword`. **Il backend deve puntare i link delle email a questi nomi di file.**

### Codici errore gestiti
`INVALID_CREDENTIALS`, `EMAIL_IN_USE`, `VALIDATION_ERROR`, `INVALID_TOKEN`, `AUTH_EXPIRED`, `RATE_LIMITED`, `NETWORK_ERROR`. Per l'area admin si aggiungono: `NOT_ADMIN`, `CANNOT_DELETE_SELF`, `CANNOT_DEMOTE_SELF`, `USER_NOT_FOUND`, `INVALID_ROLE`.

---

## 5-bis. Pannello amministrativo (`admin.html`)

Area riservata all'unico amministratore (il proprietario). Permette di vedere le statistiche, cercare/sfogliare gli utenti, vedere il dettaglio di un utente, forzare la verifica email, cambiare ruolo ed eliminare un utente con tutti i suoi dati.

### Come funziona la sicurezza (due livelli)
1. **Backend (protezione reale)**: gli endpoint `/api/admin/*` rispondono **403 `NOT_ADMIN`** a qualunque token che non appartenga a un utente con `role === 'admin'` nel database. È qui che risiede la sicurezza: nessuno può usare le funzioni admin senza essere admin nel DB.
2. **Frontend (solo UX)**: il pulsante "🛡️ Admin" nell'header dell'app compare solo se `Auth.isAdmin()` è vero, e `admin.html` all'avvio rivalida con `GET /api/auth/me` e blocca l'accesso se `user.role !== 'admin'`. Questo è solo "non mostrare"; non sostituisce la protezione del backend.

### Dipendenze e struttura
- `admin.html` è **autonoma**: include **solo** `js/auth.js` (non serve `storage.js`/`backendAdapter.js`/`auth-ui.js`, perché non carica i dati dell'app — usa unicamente le chiamate admin di `Auth`).
- Le chiamate admin sono metodi di `Auth` (in `auth.js`), che riusano l'helper interno `authFetch` con il token corrente:
  - `Auth.adminStats()` → `GET /api/admin/stats`
  - `Auth.adminUsers({ cerca, limit, offset })` → `GET /api/admin/users?...` → `{ utenti, totale }`
  - `Auth.adminUserDetail(id)` → `GET /api/admin/users/:id` → `{ utente }`
  - `Auth.adminDeleteUser(id)` → `DELETE /api/admin/users/:id`
  - `Auth.adminVerifyUser(id)` → `POST /api/admin/users/:id/verify-email`
  - `Auth.adminSetRole(id, role)` → `PUT /api/admin/users/:id/role`
- Inoltre `auth.js` conserva l'utente corrente: `Auth.getUtente()` (oggetto `user` con `role`), `Auth.isAdmin()` (bool). Popolati da `login`/`register`/`me`, azzerati da `logout`.

### Come ABILITARE il pannello (procedura completa, una tantum)
Prerequisito: la **modalità Account** deve essere operativa (backend online e `BASE_URL` configurato in `auth.js`). Poi:

1. **Registra il tuo account** nell'app, in modalità Account (la prima volta, con la tua email).
2. **Designa quell'account come admin** sul database del backend, una sola volta, via SQL:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'tua-email@esempio.ch';
   ```
   (Vedi il README del backend, sezione "Creare il primo amministratore".)
3. **Esci e rientra** nell'app (o ricarica): al login `Auth` rilegge `role` da `me()`, `Auth.isAdmin()` diventa `true`, e nell'header compare il pulsante **🛡️ Admin**.
4. Da lì in poi gestisci tutto dal pannello; non serve più toccare il database.

> Nota: finché `BASE_URL` è il placeholder o non c'è un admin nel DB, il pulsante non compare e aprire `admin.html` direttamente mostra "Accesso riservato".

### Come USARE il pannello
- **Apertura**: pulsante 🛡️ Admin nell'header dell'app, oppure URL diretto `admin.html` (comunque protetto dal controllo `me()`).
- **Dashboard**: 6 card in cima (utenti totali, verificati, nuovi 7 giorni, nuovi 30 giorni, file salvati, backup).
- **Ricerca**: il campo in alto filtra per email o nome (case-insensitive), con debounce ~350 ms; resetta la paginazione.
- **Tabella**: email (con badge `admin` se applicabile), nome, stato verifica (badge verde/giallo), data registrazione, ultimo accesso, numero file. Paginazione a fondo pagina quando gli utenti superano `LIMIT` (50): "Precedenti / Successivi" con `offset`.
- **Dettaglio utente**: clic su una riga → modale con stato email, ruolo, date, conteggi file/backup e arnie/visite, più le azioni:
  - **✓ Forza verifica email** — appare solo se l'utente non è verificato.
  - **↑ Rendi admin / ↓ Rimuovi ruolo admin** — chiede conferma. Disabilitato sul proprio account (il backend risponde `CANNOT_DEMOTE_SELF`).
  - **🗑 Elimina utente e dati** — **conferma forte**: bisogna digitare l'email esatta dell'utente. Irreversibile, cancella file, backup, token in cascata. Disabilitato sul proprio account (`CANNOT_DELETE_SELF`).
- **Sessione scaduta**: se durante l'uso il token scade (`AUTH_EXPIRED`), il pannello rimanda all'app (`index.html`), che mostrerà il login.

### Punti di manutenzione
- L'admin è identificato **solo** dal campo `role` nel DB; non esiste una lista hard-coded di email nel frontend.
- Se cambi i nomi/contratti degli endpoint admin nel backend, aggiorna i 6 metodi `admin*` in `auth.js`.
- `LIMIT` di paginazione è una costante in cima allo script di `admin.html`.

---

## 6. Costanti chiave (`shared.js`)

- `CLIENT_ID` — OAuth Google (per la modalità Drive). **Va autorizzato per il dominio del repo** nella Google Cloud Console (origini JavaScript).
- `SCOPES` — `https://www.googleapis.com/auth/drive.appdata`
- `FILENAME_DB / _MAG / _CONT / _OB / _NEC / _SETTINGS / _TODO` — nomi dei file dati
- `CAT_ENTRATA`, `CAT_USCITA`, `CAT_MAGAZZINO` — categorie (id + label; CAT_MAGAZZINO ha `catSpesa` che collega alla categoria di spesa)
- `TELAINO_OPZIONI` — opzioni per i telaini

Le categorie sono lette **dinamicamente** dai moduli (contabilità, inserimento rapido, report, insights): aggiungere una voce in `CAT_*` la fa comparire automaticamente. Unica eccezione storica: i filtri magazzino in `filtri.js` elencano le categorie a mano (verificare lì se si aggiungono categorie magazzino).

---

## 7. Moduli di sezione (panoramica funzionale)

| Modulo | Responsabilità | Esempi di funzioni |
|--------|----------------|--------------------|
| `home.js` | Dashboard, KPI, alert, banner stagionale | `getStagioneCorrente`, render KPI |
| `arnie.js` | CRUD arnie, schede, genealogia per-arnia | `nextArniaNumber`, render schede, modale arnia |
| `registro.js` | Visite (anche multi-arnia), ispezioni, raccolte | `toggleMultiArnia`, salvataggio visita |
| `magazzino.js` | Articoli, movimenti, giacenze, scadenze, duplicati | `similarity` (fuzzy nomi), giacenza, alert scorte |
| `contabilita.js` | Entrate/uscite, categorie, saldi | `getCatList`, render movimenti |
| `obiettivi.js` | Obiettivi annuali/stagionali, progressi | `getAnniObiettivi` |
| `calcolatori.js` | Sciroppo, candito, propoli | `showSciroppoTab` |
| `report.js` | Report annuale completo (PDF/stampa) + genealogia SVG | `visitePerArniaAnno`, `generaReportCompleto` |
| `insights.js` | Analisi, grafici, **genealogia** (minimale + grafo + SVG) | `buildGenealogiaMinimale`, `buildGenealogiaTree`, `drawGenealogiaTree`, `buildGenealogiaSVGStatico` |
| `necessita.js` | Ordini, fornitori, ricezione → magazzino | `getNecessitaAttive` |
| `ricerca.js` | Ricerca globale (arnie/visite/magazzino/ordini) | `ricercaEscapeHtml` |
| `filtri.js` | Filtri multiscelta (magazzino, ordini, ecc.) | `_isScaduto` |
| `todo.js` | Cose da fare, checklist | `_todoOggiISO` |
| `import-export.js` | Import/export JSON manuale | `exportJSON` |
| `drive-app.js` | Orchestrazione avvio app principale, auto-save, login/logout | `loadFromCloud`, `pushToCloud`, `showApp`, `driveLogoutApp`, `avviaModalitaDrive`, `avviaModalitaAccount` |

### Genealogia (dettaglio, in `insights.js`)
Tre rappresentazioni che condividono la stessa logica di calcolo:
- `buildGenealogiaMinimale(arnie, logBook)` — vista compatta a indentazione (usata in Insights, non soffre lo spazio stretto)
- `buildGenealogiaTree(arnie, logBook, {idPrefix})` + `drawGenealogiaTree(prefix)` — grafo completo con linee (usato nella modale "Apri ingrandito")
- `buildGenealogiaSVGStatico(arnie, logBook)` — SVG autosufficiente per il report (no `getBoundingClientRect`)

**Calcolo livelli (generazioni)**: il livello di un'arnia = (max livello tra tutte le sue *fonti*) + 1, dove le fonti sono la madre della regina (`reginaArniaSrc` se `reginaOrigine === 'inserita'`) **e** le arnie da cui ha ricevuto telaini (`telainiOrigine[].arniaSrcId`). Un'arnia generata da arnie esistenti scende sotto di esse. Radici (senza fonti) = livello 0. Anti-ciclo con `Set` guard (la cache del livello precede il check guard).

---

## 8. Sistema di versioni dei file (tasto "Verifica")

Serve a garantire che i file caricati siano allineati e che le cache siano invalidate.

- Ogni file JS ha in **riga 1**: `// ===== FILE VERSION: AAAA-MM-GG.n · nomefile =====`
- Ogni file HTML ha in **riga 2**: `<!-- FILE VERSION: AAAA-MM-GG.n · nomefile -->`
- `js/versioni.js` contiene:
  - `FILE_VERSIONS` — oggetto `{ path, ver }` per ogni file tracciato
  - `APP_BUILD` — versione globale dell'app
  - funzioni del tasto "Verifica" (`mostraVersioniFile`, ...) che confrontano gli header reali con `FILE_VERSIONS`

### Procedura ad OGNI modifica di un file
1. **Bump dell'header** del file modificato (incrementa `.n`).
2. **Aggiorna il campo `ver`** corrispondente in `FILE_VERSIONS`.
3. Se hai modificato `index.html` o `versioni.js`, **bump di `APP_BUILD`**.
4. **Cache buster**: aggiorna il `?v=` nel tag `<script>`/`<link>` che include quel file, in tutte le pagine che lo includono. **Vale anche per i CSS** (`style-main.css`, `style-mobile.css`).
5. Verifica che il conteggio sia **N/N allineati** (lo script confronta `path:'...' ver:'...'` con gli header; per `index.html` legge `apiario.html` se stai lavorando sul file sorgente).

⚠️ **File condivisi**: modificare un file incluso ovunque (es. `auth-ui.js`, `shared.js`, `storage.js`) impone di aggiornare il suo `?v=` in **tutte** le pagine che lo includono → bump di tutte quelle pagine. È oneroso ma necessario per la cache.

---

## 9. Convenzioni di codice

- **Logging difensivo** con prefisso per modulo: `console.warn`/`console.error` tipo `[Storage]`, `[Auth]`, `[AuthUI]`, `[Genealogia]`, `[Magazzino]`, `[Todo]`, `[Inserimento rapido]`, `[Visita]`, `[Report]`, ecc.
- **try/catch** attorno alle operazioni che possono fallire (I/O, parsing, DOM).
- **Verifiche DOM**: `const el = document.getElementById(...); if(!el) return;` prima di usare un elemento.
- **Fallback**: se un modulo opzionale manca (es. `AuthUI`), il codice ricade su un comportamento sicuro (es. flusso Drive).
- I moduli espongono funzioni globali (no moduli ES); i file core (`storage`, `auth`, `auth-ui`) usano IIFE che assegnano un oggetto a `window`.
- Niente `localStorage`/`sessionStorage` per i dati di dominio (solo cache/sessione tecnica: token, modalità, cache di backup).

---

## 10. Deploy e configurazione

1. Caricare tutti i file rispettando la struttura (HTML in root, moduli in `js/`, icone in `icons/`).
2. Attivare GitHub Pages sul repo.
3. **Google Cloud Console**: aggiungere l'URL del repo alle *origini JavaScript autorizzate* del `CLIENT_ID` (necessario per il login Drive).
4. **Modalità Account**: impostare `BASE_URL` in `js/auth.js` con l'URL del backend; assicurarsi che il backend abbia il CORS aperto verso il dominio del frontend e che i link email puntino a `verifica-email.html` / `reimposta-password.html`.
5. Aprire l'app, scegliere la modalità e testare salvataggio/caricamento.

> **Backend con Docker:** per sviluppo o self-hosting del backend, `docker compose up` avvia
> PostgreSQL + API con lo schema già applicato — dettagli in [`guida_docker.md`](guida_docker.md)
> e nel README del backend. Senza Docker: `./scripts/setup.sh` oppure `npm run db:migrate`.

---

## 11. Note storiche / decisioni

- **Repo separato per la versione multi-utente**: la produzione storica (solo Drive) resta intatta come rollback; lo sviluppo prosegue sul repo nuovo (con `storage.js`/`auth*`).
- **Le due modalità usano archivi diversi**: Drive (file su Drive personale) e Account (DB del backend) non condividono i dati.
- **PWA = stesso dominio**: condividono `localStorage` con l'app principale, quindi ereditano la scelta di modalità e il token.
