# Il Mio Apiario — Backend (Passo 2)

Backend multi-utente per l'app *Il Mio Apiario*. Espone un'API REST con autenticazione
(email/password + JWT) e salvataggio dati per utente, con isolamento completo tra account.

È la **modalità account** dell'app: affianca, senza sostituirla, la modalità locale su Google
Drive esistente.

---

## Stack

- **Node.js** (≥ 18) + **Express**
- **PostgreSQL** (accesso via driver `pg`, SQL scritto a mano)
- **bcrypt** (hashing password) · **jsonwebtoken** (sessioni JWT) · **Zod** (validazione)
- **Brevo** per le email transazionali (verifica indirizzo, reset password), via API HTTP

I dati sono salvati come **JSONB** (un JSON per "file" dell'app, per utente), rispecchiando la
struttura dei file su Drive. Vedi i documenti di design per i dettagli.

---

## Struttura del progetto

```
apiario-backend/
├── Dockerfile               immagine del backend (produzione)
├── docker-compose.yml       sviluppo locale: PostgreSQL + backend insieme
├── package-lock.json        dipendenze bloccate (npm ci / build riproducibile)
├── sql/
│   ├── schema.sql            le tabelle del database
│   └── migrations/           modifiche incrementali allo schema
├── scripts/
│   ├── setup.sh              setup una-tantum (deps + schema + migration)
│   ├── run.sh                setup-and-run per sviluppo locale
│   ├── create-admin.sh       promuove un utente ad admin (via psql)
│   ├── promote-admin.js      promuove un utente ad admin (via Node)
│   └── _lib.sh               funzioni condivise dagli script
└── src/
    ├── server.js             avvio del server
    ├── app.js                configurazione Express (CORS, sicurezza, rotte)
    ├── config/env.js         lettura e validazione variabili d'ambiente
    ├── db/
    │   ├── pool.js           connessione PostgreSQL
    │   ├── init.js           crea lo schema base (npm run db:init)
    │   ├── migrate.js        schema + migration tracciate (npm run db:migrate)
    │   └── queries/          tutte le query SQL (users, files, backups, authTokens, admin)
    ├── routes/               definizione endpoint (auth, files, backups, admin)
    ├── controllers/          orchestrazione richieste
    ├── services/             logica di dominio (auth, token, email, files, backups, admin)
    ├── middleware/           auth (JWT), admin, validazione (Zod), gestione errori
    ├── schemas/              schemi di validazione input
    └── utils/                errori applicativi, mappa nomi file, helper
```

---

## Avvio con Docker (il modo più semplice)

Se hai **Docker** non devi installare Node né PostgreSQL: un comando avvia database e backend
insieme, con lo schema già applicato.

```bash
docker compose up --build
```

L'API risponde su `http://localhost:3000` (`/health` per il check). Per fermare:
`docker compose down` (i dati restano) oppure `docker compose down -v` (azzera il database).

📖 Guida completa — variabili, comandi utili, primo admin, troubleshooting e note di produzione:
**[`docs/guida_docker.md`](../../guida_docker.md)**.

---

## Avvio rapido (sviluppo locale)

### 1. Prerequisiti

- Node.js 18 o superiore (`node --version`)
- Un database PostgreSQL accessibile (locale o gestito)

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura le variabili d'ambiente

Copia il template e compila i valori:

```bash
cp .env.example .env
```

Apri `.env` e imposta almeno:

- **`DATABASE_URL`** — la stringa di connessione al tuo PostgreSQL.
- **`JWT_SECRET`** — una chiave lunga e casuale. Generane una con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- **`FRONTEND_URL`** — l'origine del frontend (per CORS e per i link nelle email).
  In sviluppo, l'indirizzo da cui servi l'app (es. `http://localhost:5500`).

Per far funzionare le **email** (verifica indirizzo e reset password) imposta anche:

- **`BREVO_API_KEY`** — dalla dashboard Brevo (sezione *SMTP & API*).
- **`EMAIL_FROM`** — un indirizzo mittente verificato su Brevo.

> Senza `BREVO_API_KEY` il server parte lo stesso, ma le email non vengono inviate (utile per
> sviluppare il resto). Vedrai un avviso all'avvio.

### 4. Crea lo schema del database

```bash
npm run db:migrate
```

Crea lo schema **e** applica le migration, tenendo traccia di quelle già fatte (tabella
`schema_migrations`). È sicuro rieseguirlo e **non richiede `psql`**: usa Node e `DATABASE_URL`.

> `npm run db:init` resta disponibile e crea il solo schema base. In alternativa, manualmente:
> `psql "$DATABASE_URL" -f sql/schema.sql`.

### 5. Avvia il server

```bash
# Sviluppo (riavvio automatico ad ogni modifica)
npm run dev

# Produzione
npm start
```

Se tutto è a posto vedrai:

```
[server] In ascolto sulla porta 3000 (development)
[server] CORS abilitato per: http://localhost:5500
```

Verifica che risponda:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

---

## Script di automazione (alternativa rapida all'avvio manuale)

Nella cartella `scripts/` ci sono tre script che automatizzano il setup. Sono **versatili**:
funzionano in locale, su un server VPS, e per il setup del database su piattaforme PaaS. La
gestione del `.env` è **interattiva quando serve e quando possibile**: se le variabili
essenziali sono già presenti (in `.env` o nell'ambiente) procedono in silenzio; se mancano e c'è
un terminale interattivo te le chiedono; se mancano in un ambiente automatico, escono con un
messaggio chiaro invece di bloccarsi.

### `scripts/setup.sh` — setup una-tantum

Fa tutto in un colpo: verifica i prerequisiti (Node, npm), assicura un `.env` valido (genera
`JWT_SECRET` se manca, rileva `sslmode=require` → `DATABASE_SSL=true`), installa le dipendenze
(`npm ci` se c'è il lockfile, altrimenti `npm install`), crea schema + migration con
`npm run db:migrate` e — se impostata `FIRST_ADMIN_EMAIL` — prova a promuovere il primo admin.
Chiude con uno smoke test della configurazione.

```bash
./scripts/setup.sh                                   # interattivo
./scripts/setup.sh -y                                # non-interattivo (JWT auto, niente domande)
./scripts/setup.sh --database-url "postgres://…" --frontend-url "https://…"
./scripts/setup.sh --first-admin tua-email@esempio.ch
```

È **idempotente**. Non serve più `psql` per il setup del database (lo fa Node via `db:migrate`):
`psql` resta utile solo per lo script manuale `create-admin.sh`.

### `scripts/run.sh` — setup-and-run (sviluppo locale)

Comodo in locale: esegue il setup se non è ancora stato fatto, poi avvia il server.

```bash
./scripts/run.sh          # avvia (con setup automatico se serve)
./scripts/run.sh --dev    # avvia in modalità sviluppo (riavvio automatico)
./scripts/run.sh --setup  # esegue solo il setup, senza avviare
```

> Su PaaS (App Platform, Render, ...) **non** serve `run.sh`: la piattaforma esegue da sé
> `npm install` + `npm start`. Lì usa semmai `setup.sh` una volta per creare lo schema del DB.

### Designare il primo admin

Tre modi, dal più automatico al più manuale:

```bash
# 1) Automatico: imposta FIRST_ADMIN_EMAIL nel .env → chi si registra con quell'email è admin
# 2) Node, su un account già registrato:
npm run admin:promote -- tua-email@esempio.ch
# 3) psql (bash):
./scripts/create-admin.sh tua-email@esempio.ch     # chiede l'email se omessa
```

> Cosa gli script **non** possono fare: creare l'istanza PostgreSQL gestita o il servizio
> backend sul provider, né impostare le variabili nel pannello del provider. Quello è
> *provisioning dell'infrastruttura*, che avviene dal pannello web (o dalla CLI del provider).
> Gli script automatizzano la *configurazione del software* una volta che la macchina e il
> database esistono.

---

## Variabili d'ambiente

| Variabile | Obblig. | Default | Descrizione |
|---|:---:|---|---|
| `PORT` | no | `3000` | Porta del server |
| `NODE_ENV` | no | `development` | `development` o `production` |
| `DATABASE_URL` | **sì** | — | Stringa di connessione PostgreSQL |
| `DATABASE_SSL` | no | `false` | `true` se il provider richiede SSL (spesso sì in hosting) |
| `JWT_SECRET` | **sì** | — | Chiave per firmare i JWT (lunga e casuale) |
| `JWT_EXPIRES_IN` | no | `7d` | Durata del token di sessione |
| `BCRYPT_COST` | no | `12` | Cost factor bcrypt |
| `VERIFY_TOKEN_TTL_HOURS` | no | `24` | Validità link verifica email (ore) |
| `RESET_TOKEN_TTL_HOURS` | no | `1` | Validità link reset password (ore) |
| `BREVO_API_KEY` | no* | — | Chiave API Brevo (*necessaria per le email) |
| `EMAIL_FROM` | no | `noreply@example.com` | Mittente delle email (verificato su Brevo) |
| `EMAIL_FROM_NAME` | no | `Il Mio Apiario` | Nome mittente |
| `FRONTEND_URL` | **sì** | — | Origine del frontend (CORS + link email) |
| `FIRST_ADMIN_EMAIL` | no | — | Se un utente si registra con questa email, diventa admin in automatico |

---

## API REST

Tutte le risposte sono JSON. Gli endpoint dei dati richiedono l'header:

```
Authorization: Bearer <token>
```

### Autenticazione — `/api/auth`

| Metodo | Endpoint | Protetto | Descrizione |
|---|---|:---:|---|
| POST | `/api/auth/register` | no | Crea account, invia email di verifica. Ritorna `{ token, user }` |
| POST | `/api/auth/login` | no | Login. Ritorna `{ token, user }` |
| POST | `/api/auth/logout` | no | No-op simbolico (il client scarta il token) |
| GET | `/api/auth/me` | sì | Dati dell'utente corrente `{ user }` |
| GET | `/api/auth/verify-email?token=…` | no | Verifica l'indirizzo email |
| POST | `/api/auth/resend-verification` | sì | Rinvia l'email di verifica |
| POST | `/api/auth/forgot-password` | no | Richiede il link di reset (risposta sempre neutra) |
| POST | `/api/auth/reset-password` | no | Reimposta la password con `{ token, newPassword }` |

L'oggetto `user` ha la forma: `{ id, email, nome, email_verified, role }`.

### Dati / file — `/api/files`

Speculari all'interfaccia `Storage` del frontend. Tutte protette.

| Metodo | Endpoint | Mappa su | Descrizione |
|---|---|---|---|
| GET | `/api/files` | `carica()` | Oggetto aggregato `{ db, mag, cont, ob, nec, settings, todo }` |
| PUT | `/api/files` | `salvaTutto()` | Salva solo le sezioni presenti nel body (scrittura selettiva) |
| GET | `/api/files/:nome` | `leggiFile()` | `{ content }` — `content` è `null` se il file non esiste |
| PUT | `/api/files/:nome` | `salvaFile()` | Body: `{ content: … }` |
| DELETE | `/api/files/:id` | `eliminaFile()` | Elimina per id (file **o** backup) |

Nomi file validi: `db`, `magazzino`, `contabilita`, `obiettivi`, `necessita`, `settings`,
`todo`, `etichette`.

### Backup — `/api/backups`

| Metodo | Endpoint | Mappa su | Descrizione |
|---|---|---|---|
| GET | `/api/backups` | `listaBackup()` | `[{ id, name, modifiedTime }, …]` |
| POST | `/api/backups` | `creaBackup()` | Body: `{ content, max? }`. Crea snapshot e fa cleanup oltre `max` |

### Amministrazione — `/api/admin`

Endpoint del pannello admin. **Doppiamente protetti**: richiedono un token valido *e* che
l'utente abbia `role = 'admin'`. Un utente normale che li chiama riceve 403 (`NOT_ADMIN`).

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/api/admin/stats` | Statistiche generali (totale utenti, verificati, nuovi 7/30 giorni, file, backup) |
| GET | `/api/admin/users?cerca=&limit=&offset=` | Lista utenti (con conteggio file/backup) + totale, ricerca e paginazione |
| GET | `/api/admin/users/:id` | Dettaglio utente (include num. arnie e visite) |
| DELETE | `/api/admin/users/:id` | Elimina l'utente e **tutti** i suoi dati (cascade) |
| POST | `/api/admin/users/:id/verify-email` | Forza la verifica email dell'utente |
| PUT | `/api/admin/users/:id/role` | Cambia ruolo. Body: `{ role: 'user' \| 'admin' }` |

Protezioni: l'admin **non può** eliminare né declassare sé stesso (evita di restare senza admin).

---

## Creare il primo amministratore

Il pannello admin gestisce gli utenti, ma il **primo** admin va designato una volta sola
(problema dell'uovo e la gallina: non esiste ancora un admin che possa promuoverne altri).

> **Scorciatoia automatica (consigliata):** imposta `FIRST_ADMIN_EMAIL` nel `.env` **prima** di
> registrarti: l'account creato con quell'email nasce già admin e puoi saltare la procedura
> manuale qui sotto. Per un account già esistente: `npm run admin:promote -- tua-email@esempio.ch`.

Procedura manuale (alternativa):

1. **Registrati normalmente** dall'app (modalità account) con l'email che vuoi usare come admin.
2. **Promuovi quell'account ad admin** con una query diretta sul database:

   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'tua-email@esempio.ch';
   ```

   Puoi eseguirla dalla console SQL del tuo provider di hosting, oppure con `psql`:

   ```bash
   psql "$DATABASE_URL" -c "UPDATE users SET role = 'admin' WHERE email = 'tua-email@esempio.ch';"
   ```

3. **Fatto.** Da ora quell'account è admin: al login il campo `user.role` sarà `'admin'`, e potrà
   usare gli endpoint `/api/admin/*` (e il pannello frontend, quando sarà pronto). Eventuali altri
   admin futuri li potrai nominare dal pannello, senza più toccare il database.

> Se hai creato il database **prima** di aggiungere il pannello admin, esegui anche la migration
> che introduce la colonna `role`:
> ```bash
> psql "$DATABASE_URL" -f sql/migrations/001_add_user_role.sql
> ```

---

## Codici di errore

Le risposte d'errore hanno forma `{ error, code?, details? }`. I codici principali:

| Code | Status | Significato |
|---|:---:|---|
| `VALIDATION_ERROR` | 400 | Input non valido (vedi `details`) |
| `INVALID_FILE_NAME` | 400 | Nome file non riconosciuto |
| `INVALID_CREDENTIALS` | 401 | Email o password errate (messaggio generico) |
| `AUTH_EXPIRED` | 401 | Sessione scaduta → il frontend riporta al login |
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Token assente o non valido |
| `EMAIL_IN_USE` | 409 | Email già registrata |
| `INVALID_TOKEN` | 400 | Token di verifica/reset non valido o scaduto |
| `NOT_ADMIN` | 403 | Endpoint admin chiamato da un non-admin |
| `CANNOT_DELETE_SELF` | 403 | L'admin ha tentato di eliminare sé stesso |
| `CANNOT_DEMOTE_SELF` | 403 | L'admin ha tentato di declassare sé stesso |
| `NOT_FOUND` | 404 | Risorsa inesistente |
| `RATE_LIMITED` | 429 | Troppi tentativi (rate limiting sugli endpoint auth sensibili) |

---

## Sicurezza (in sintesi)

- Password salvate solo come **hash bcrypt** (mai in chiaro).
- Token email (verifica/reset) salvati **hashati**, usa-e-getta, a scadenza.
- Messaggi **anti-enumerazione** su login e *password dimenticata* (non rivelano se un'email
  esiste).
- **CORS** ristretto all'origine del frontend; **Helmet** per gli header di sicurezza.
- **Rate limiting** sugli endpoint sensibili (login, registrazione, recupero/reset password);
  `trust proxy` impostato per identificare correttamente l'IP dietro un reverse proxy.
- Il `user_id` proviene **sempre** dal token verificato: un utente non può accedere ai dati di
  un altro.
- Servire **sempre su HTTPS** in produzione (token e password viaggiano nelle richieste).

---

## Deploy (cenni)

Il backend è pensato per un hosting gestito (DigitalOcean App Platform, Render, Railway o
simili):

1. Crea un'istanza PostgreSQL gestita e copia la sua connection string in `DATABASE_URL`
   (imposta `DATABASE_SSL=true` se richiesto).
2. Configura tutte le variabili d'ambiente nel pannello del servizio (mai committare `.env`).
3. Comando di build: `npm install`. Comando di avvio: `npm start`.
4. Inizializza il database con `npm run db:migrate` (schema + migration). Si può usare anche come
   comando di pre-deploy: `npm run db:migrate && npm start`.
5. Imposta `FRONTEND_URL` sull'URL pubblico del frontend (GitHub Pages) per il CORS.

> In alternativa puoi self-hostare tutto con **Docker** (`docker compose up`): vedi
> [`docs/guida_docker.md`](../../guida_docker.md).

---

## Note

- I dati sono salvati come JSON (JSONB) rispecchiando i file dell'app: il backend custodisce e
  restituisce, non interpreta i contenuti. Tutta la logica di dominio resta nel frontend.
- La modalità Google Drive dell'app continua a funzionare in modo indipendente: questo backend
  è **aggiuntivo**.
