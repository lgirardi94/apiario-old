# Guida al deploy end-to-end — "Il Mio Apiario"

> Guida completa e **indipendente dal provider** per portare online l'app: frontend, backend e
> database, e farli parlare tra loro. Non si lega a DigitalOcean o GitHub Pages in particolare:
> spiega i *concetti* e il *flusso*, così sai cosa fare su qualsiasi piattaforma. Dove serve un
> esempio concreto, lo do, segnalandolo come tale.

---

## Indice

1. [Il quadro mentale: cosa significa "andare online"](#1-il-quadro-mentale)
2. [I tre pezzi e come si parlano](#2-i-tre-pezzi-e-come-si-parlano)
3. [L'ordine giusto di deploy (e perché)](#3-lordine-giusto-di-deploy)
4. [FASE 1 — Il database](#fase-1--il-database)
5. [FASE 2 — Il backend](#fase-2--il-backend)
6. [FASE 3 — Il frontend](#fase-3--il-frontend)
7. [FASE 4 — Collegare i pezzi](#fase-4--collegare-i-pezzi)
8. [FASE 5 — Primo admin e collaudo](#fase-5--primo-admin-e-collaudo)
9. [I concetti trasversali che devi padroneggiare](#9-i-concetti-trasversali)
10. [Mappa di traduzione tra provider](#10-mappa-di-traduzione-tra-provider)
11. [Troubleshooting per sintomo](#11-troubleshooting-per-sintomo)

---

## 1. Il quadro mentale

"Mettere online" significa prendere codice che gira **sul tuo computer** e farlo girare su
**computer sempre accesi e raggiungibili da internet** (i "server", che oggi sono servizi
gestiti nel cloud).

Tre cose cambiano rispetto al tuo computer:

1. **L'indirizzo.** In locale usi `localhost`. Online ogni pezzo ha un indirizzo pubblico
   (un URL o dominio) con cui gli altri lo raggiungono.
2. **La configurazione.** In locale i settaggi stanno in un file `.env` sul tuo disco. Online
   stanno nelle **variabili d'ambiente** del servizio (un pannello sicuro), perché il `.env`
   non viene mai caricato (contiene segreti).
3. **La permanenza.** Il tuo computer si spegne; i server no. E i dati non stanno più in file
   locali, ma in un **database gestito** che vive per conto suo.

Tutto il resto della guida è declinare queste tre idee sui tre pezzi dell'app.

---

## 2. I tre pezzi e come si parlano

```
   UTENTE (browser)
        │
        │ visita l'URL del sito
        ▼
┌──────────────────┐   chiamate API (HTTPS)   ┌──────────────────┐
│   FRONTEND        │ ───────────────────────▶ │   BACKEND         │
│   file statici    │                          │   server Node.js  │
│   (HTML/CSS/JS)    │ ◀─────────────────────── │                   │
│                   │     risposte JSON         │                   │
└──────────────────┘                          └────────┬──────────┘
   serve i file                                         │ query SQL
   al browser                                           ▼
                                              ┌────────────────────┐
                                              │   DATABASE          │
                                              │   PostgreSQL        │
                                              └────────────────────┘
```

**Cos'è ciascun pezzo, in concreto:**

- **Frontend** — i file della tua app (HTML, CSS, JavaScript, incluse le pagine come
  `index.html`, `verifica-email.html`, `admin.html`). Sono **statici**: non "eseguono" nulla
  sul server, vengono solo *consegnati* al browser, che poi li fa girare. Per questo si possono
  ospitare su servizi semplici e spesso gratuiti.

- **Backend** — il server Node.js (questo l'abbiamo costruito qui). È **dinamico**: gira di
  continuo, riceve richieste, esegue logica, parla col database. Per questo richiede un servizio
  che "tiene acceso" un processo (a differenza dei file statici).

- **Database** — PostgreSQL, dove vivono i dati di tutti gli utenti. È un servizio a sé, che il
  provider gestisce (backup, sicurezza).

**Come si parlano:**

- Il **browser** scarica il frontend dal suo URL, e da lì in poi il JavaScript del frontend fa
  **chiamate API** al backend (è il `BASE_URL` in `js/auth.js`, e il `backendAdapter.js`).
- Il **backend** riceve quelle chiamate e, quando deve leggere/scrivere dati, fa **query** al
  database (è la `DATABASE_URL`).
- Il database **non è raggiungibile dal browser** né dal frontend: solo il backend ci parla.
  È un bene per la sicurezza (i dati non sono esposti direttamente a internet).

Tieni a mente questa catena: **browser → frontend → backend → database**. Ogni "collegamento"
è un indirizzo che va configurato (le Fasi 4).

---

## 3. L'ordine giusto di deploy

Si procede **dal fondo della catena verso l'alto**, perché ogni pezzo ha bisogno dell'indirizzo
di quello sotto:

```
1. DATABASE   →  produce la DATABASE_URL  ─┐
                                            │ serve al backend
2. BACKEND    →  produce l'URL del backend ─┤
                                            │ serve al frontend
3. FRONTEND   →  produce l'URL del sito  ───┤
                                            │ serve al backend (CORS + link email)
4. COLLEGARE  →  si incastrano gli indirizzi tra loro
5. ADMIN+TEST →  si designa l'admin e si collauda tutto
```

C'è una piccola circolarità (il backend ha bisogno dell'URL del frontend per il CORS, ma il
frontend ha bisogno dell'URL del backend per le chiamate): la sciogliamo nella Fase 4, perché
gli indirizzi pubblici sono spesso prevedibili o aggiornabili dopo.

---

## FASE 1 — Il database

**Obiettivo:** avere un PostgreSQL gestito, con le tabelle create, e in mano la sua
*connection string*.

### 1a. Crea un'istanza PostgreSQL gestita

Su qualsiasi provider (DigitalOcean Managed DB, Render PostgreSQL, Railway, Neon, Supabase, ...)
il flusso concettuale è lo stesso:

1. Scegli **PostgreSQL** come motore.
2. Scegli la **taglia** più piccola per iniziare (i tuoi volumi sono modesti; si scala dopo).
3. Scegli la **regione** geografica: la più vicina ai tuoi utenti e, idealmente, **la stessa in
   cui metterai il backend** (latenza minore, e spesso il traffico interno non si paga).
4. Crea, attendi che sia pronto.

### 1b. Recupera la connection string

Ogni provider, nella pagina del database, mostra una **connection string** (a volte chiamata
"connection URL" o "database URL"). Ha sempre questa forma:

```
postgresql://UTENTE:PASSWORD@HOST:PORTA/NOMEDB?sslmode=require
```

**Copiala e custodiscila** — è il valore di `DATABASE_URL`. Contiene la password: trattala come
una credenziale (mai in un file committato).

> Nota su SSL: i database gestiti quasi sempre richiedono connessioni cifrate (`sslmode=require`
> nella stringa). Il nostro backend lo gestisce con la variabile `DATABASE_SSL=true`.

### 1c. Crea lo schema (le tabelle)

Il database è vuoto: vanno create le tabelle. Hai il file `sql/schema.sql` nel progetto. Due
modi, validi ovunque:

- **Console SQL del provider** (se offerta): apri la console, incolla il contenuto di
  `schema.sql`, esegui.
- **Da terminale con `psql`:**
  ```bash
  psql "LA_CONNECTION_STRING" -f sql/schema.sql
  ```

Verifica che le tabelle ci siano (`users`, `user_files`, `user_backups`, `auth_tokens`):
```bash
psql "LA_CONNECTION_STRING" -c "\dt"
```

> Conserva l'accesso `psql` (o la console): ti servirà nella Fase 5 per nominare il primo admin.

---

## FASE 2 — Il backend

**Obiettivo:** il server Node.js online, raggiungibile a un URL pubblico, connesso al database.

### 2a. Metti il codice su un repository Git

Quasi tutti i servizi di hosting per backend prendono il codice da **GitHub/GitLab/Bitbucket**.
Se non l'hai già fatto:

```bash
cd cartella-del-backend          # dove c'è package.json
git init
git add .
git commit -m "Backend - primo commit"
git branch -M main
git remote add origin URL-DEL-TUO-REPO
git push -u origin main
```

**Verifica fondamentale:** che `.env` **non** sia finito nel repo (il `.gitignore` del progetto
lo esclude apposta). I segreti vanno nelle variabili d'ambiente del servizio, mai nel codice.

### 2b. Crea il servizio backend

Concetto comune a tutti i provider (App Platform, Render Web Service, Railway, Fly.io, ...):
crei un servizio di tipo **"web service"** (un processo che resta in ascolto e risponde alle
richieste HTTP — non un "sito statico", non un "worker").

Gli dici:
- **Da dove prende il codice:** il repo e il branch (`main`).
- **Come si costruisce** ("build command"): `npm install`.
- **Come si avvia** ("run/start command"): `npm start`.
- **Su che porta ascolta:** il nostro codice legge la variabile `PORT` che il provider imposta
  in automatico — non serve toccarla.
- **Taglia:** la più piccola per iniziare.

### 2c. Imposta le variabili d'ambiente

Questo è il passo che sostituisce il tuo file `.env` locale. Nel pannello del servizio
("Environment Variables" / "Environment" / "Config Vars" a seconda del provider), inserisci:

| Variabile | Valore | Segreta? |
|---|---|:---:|
| `DATABASE_URL` | la connection string (Fase 1b) | ✅ |
| `DATABASE_SSL` | `true` | |
| `JWT_SECRET` | stringa lunga e casuale (vedi sotto) | ✅ |
| `JWT_EXPIRES_IN` | `7d` | |
| `BCRYPT_COST` | `12` | |
| `VERIFY_TOKEN_TTL_HOURS` | `24` | |
| `RESET_TOKEN_TTL_HOURS` | `1` | |
| `BREVO_API_KEY` | chiave Brevo | ✅ |
| `EMAIL_FROM` | mittente verificato su Brevo | |
| `EMAIL_FROM_NAME` | `Il Mio Apiario` | |
| `FRONTEND_URL` | URL del frontend (lo definiamo in Fase 3/4) | |
| `NODE_ENV` | `production` | |

Genera `JWT_SECRET` sul tuo computer:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> `FRONTEND_URL` potresti non averlo ancora se non hai deployato il frontend: metti un valore
> provvisorio e lo correggi in Fase 4. È una delle due variabili che chiudono la circolarità.

### 2d. Avvia il deploy e prendi l'URL

Avvii il deploy: il servizio scarica il codice, esegue `npm install`, lancia `npm start`. Segui
i log per vedere che parta senza errori (cerca un messaggio tipo "In ascolto sulla porta...").

A fine deploy, il provider assegna un **URL pubblico** al backend (es.
`https://qualcosa.provider.app`). **Copialo:** è ciò che il frontend userà come `BASE_URL`.

### 2e. Verifica che risponda

Apri nel browser:
```
URL-DEL-BACKEND/health
```
Deve rispondere `{"status":"ok"}`. Se sì, il backend è vivo e connesso.

---

## FASE 3 — Il frontend

**Obiettivo:** i file statici dell'app online, a un URL pubblico.

> Questa fase dipende da come è strutturato il repository del frontend (costruito nell'altra
> chat). I passi sotto valgono per il deploy statico in generale; per dettagli specifici della
> tua app, fai riferimento alla chat frontend.

### 3a. Cos'è un deploy statico

Il frontend è fatto di file che non vanno "eseguiti" sul server: vanno solo *serviti* al
browser. Per questo si ospita su servizi per **siti statici** (GitHub Pages, Netlify, Vercel,
Cloudflare Pages, ...), spesso **gratuiti**, che prendono i file (di solito da un repo Git) e li
pubblicano a un URL con HTTPS incluso.

### 3b. Pubblica i file

Il flusso concettuale:

1. Il codice del frontend è in un **repository Git**.
2. Colleghi quel repo al servizio statico (o, per GitHub Pages, attivi Pages nelle impostazioni
   del repo).
3. Indichi **da quale cartella** servire i file (la radice, o una sottocartella tipo `docs/` o
   `dist/` — dipende da com'è organizzato il repo del frontend).
4. Il servizio pubblica e ti dà l'**URL del sito** (es. `https://tuonome.github.io/nome-repo`
   per GitHub Pages, o un dominio del provider).

### 3c. Prendi l'URL del frontend

**Copia l'URL pubblico del sito.** Servirà al backend (per il CORS e per i link nelle email).
Annotalo **senza slash finale** (importante per la Fase 4).

> Le pagine speciali dell'app (`verifica-email.html`, `reimposta-password.html`, `admin.html`)
> saranno raggiungibili sotto questo URL, es.
> `https://tuonome.github.io/nome-repo/verifica-email.html`. Il backend costruisce già i link
> email verso questi nomi.

---

## FASE 4 — Collegare i pezzi

Ora che ogni pezzo ha un indirizzo, li facciamo puntare l'uno all'altro. Sono **due
collegamenti**.

### 4a. Frontend → Backend (il `BASE_URL`)

Nel repository del **frontend**, file `js/auth.js`, c'è la costante `BASE_URL` (un placeholder).
Sostituiscila con l'URL del backend (Fase 2d), **senza slash finale**:

```javascript
const BASE_URL = 'https://url-del-backend.provider.app';
```

Fai `commit` e `push`: il sito statico si riaggiorna. Da ora il frontend sa **dove** mandare le
chiamate API.

### 4b. Backend → Frontend (il `FRONTEND_URL`)

Nel pannello del **backend**, imposta/correggi la variabile `FRONTEND_URL` con l'URL del
frontend (Fase 3c), **senza slash finale**:

```
FRONTEND_URL = https://tuonome.github.io/nome-repo
```

Salva: il backend si ri-deploya con il valore giusto. Questo serve a due cose:
- **CORS:** il backend accetterà chiamate **solo** da quell'origine (sicurezza). Se sbagliato,
  il browser blocca le chiamate con un errore CORS.
- **Link nelle email:** i link di verifica e reset punteranno a quel dominio.

> **La circolarità sciolta:** prima il frontend non sapeva l'URL del backend, e il backend non
> sapeva quello del frontend. Ora che entrambi esistono, ciascuno riceve l'indirizzo dell'altro.
> Per questo i due collegamenti si fanno *dopo* aver deployato entrambi i pezzi.

### 4c. La catena completa, configurata

```
browser ──visita──▶ FRONTEND (URL del sito)
FRONTEND ──BASE_URL──▶ BACKEND (URL del backend)
BACKEND ──DATABASE_URL──▶ DATABASE
BACKEND ──FRONTEND_URL──▶ (autorizza il frontend via CORS, costruisce i link email)
```

Tutti gli indirizzi sono al loro posto. Manca solo l'admin e il collaudo.

---

## FASE 5 — Primo admin e collaudo

### 5a. Designa il primo amministratore

Il pannello admin esiste, ma il primo admin si nomina a mano (una volta sola):

1. **Apri l'app e registrati** in modalità Account con la tua email.
2. **Promuovi quell'account** con una query sul database (console o `psql`):
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'tua-email@esempio.ch';
   ```
3. **Esci e rientra:** comparirà il pannello admin.

### 5b. Collaudo end-to-end

Percorri la catena completa e verifica ogni anello:

- [ ] `URL-BACKEND/health` → `{"status":"ok"}` (backend vivo)
- [ ] Il sito frontend si apre al suo URL (frontend pubblicato)
- [ ] Registrazione in modalità Account riesce (frontend ↔ backend ↔ database)
- [ ] Arriva l'email di verifica (Brevo configurato) e il link apre `verifica-email.html`
- [ ] Login e visualizzazione dati funzionano
- [ ] Crei dati, ricarichi, i dati restano (salvataggio sul database)
- [ ] L'account admin vede il pannello e carica gli utenti
- [ ] La modalità Drive funziona ancora (indipendente dal backend)

Tutti verdi = deploy completo.

---

## 9. I concetti trasversali

Quattro cose che, una volta capite, rendono ogni deploy comprensibile.

### Variabili d'ambiente (perché esistono)

Il codice non deve contenere segreti (password, chiavi) né valori che cambiano tra "sul tuo PC"
e "in produzione". Si tengono **fuori** dal codice, in variabili che l'ambiente fornisce. Così
lo **stesso identico codice** gira in locale (legge il `.env`) e online (legge le variabili del
provider), cambiando solo i valori. È anche il motivo per cui `.env` non va mai su Git: i
segreti vivono solo nei pannelli sicuri.

### HTTPS (perché è obbligatorio)

In produzione tutto viaggia su **HTTPS** (connessione cifrata). Senza, password e token
passerebbero in chiaro, intercettabili. I servizi gestiti (statici e backend) forniscono HTTPS
in automatico. Non è un optional: il login e i token *richiedono* HTTPS per essere sicuri.

### CORS (perché il browser blocca le chiamate)

Per sicurezza, il browser impedisce a un sito di chiamare un backend su un dominio diverso, *a
meno che* il backend non dichiari "accetto chiamate da quell'origine". È ciò che fa la variabile
`FRONTEND_URL` sul backend. Se vedi errori "CORS" nella console del browser, quasi sempre è un
disallineamento tra l'URL reale del frontend e ciò che il backend ha in `FRONTEND_URL`.

### Stateless e riavvii (perché i dati stanno nel database)

I servizi backend gestiti possono **riavviarsi** (aggiornamenti, scaling): tutto ciò che è "in
memoria" si perde. Per questo i dati persistono nel **database**, non nel processo. Lo stesso
vale per i file: non salvare dati sul disco del backend (potrebbe sparire a un riavvio) — è il
motivo per cui esiste il database gestito.

---

## 10. Mappa di traduzione tra provider

Lo stesso concetto ha nomi diversi a seconda del servizio. Questa tabella ti aiuta a orientarti
ovunque.

| Concetto | DigitalOcean | Render | Railway | Vercel/Netlify (statico) |
|---|---|---|---|---|
| Backend dinamico | App Platform "Web Service" | "Web Service" | "Service" | (non adatto a backend persistenti) |
| Database PostgreSQL | "Managed Database" | "PostgreSQL" | "PostgreSQL plugin" | — |
| Sito statico (frontend) | App Platform "Static Site" | "Static Site" | "Static" | il loro core |
| Variabili d'ambiente | "Environment Variables" | "Environment" | "Variables" | "Environment Variables" |
| Comando di avvio | "Run Command" | "Start Command" | "Start Command" | (build only) |
| URL pubblico | "App URL" / dominio | "onrender.com" URL | "up.railway.app" | dominio del provider |
| Log | "Runtime Logs" | "Logs" | "Deployments → Logs" | "Deploy logs" |

Il **frontend statico** può stare su un provider e il **backend** su un altro: si parlano
comunque via URL pubblici. Es. frontend su GitHub Pages, backend + DB su Render. L'importante è
configurare `BASE_URL` e `FRONTEND_URL` con gli URL corretti, ovunque siano.

---

## 11. Troubleshooting per sintomo

**"Errore CORS" / "blocked by CORS policy" nella console del browser.**
`FRONTEND_URL` (sul backend) non coincide esattamente con l'URL reale del frontend. Devono
combaciare: stesso `https://`, stesso dominio/percorso, **senza** slash finale. Correggi e
ri-deploya il backend.

**Il frontend carica ma le chiamate falliscono / "Failed to fetch".**
Probabili cause: `BASE_URL` nel frontend sbagliato o vuoto; oppure il backend è giù (controlla
`/health`); oppure manca HTTPS. Verifica l'URL del backend e che risponda.

**Il backend non parte / log: "Variabile d'ambiente mancante".**
Manca una variabile obbligatoria (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`). Controlla che
ci siano tutte e siano scritte correttamente.

**Errori di connessione al database / SSL / "no pg_hba.conf entry".**
`DATABASE_SSL` deve essere `true` e `DATABASE_URL` la stringa completa del provider (con
`?sslmode=require`).

**"relation does not exist" quando uso l'app.**
Le tabelle non sono state create: esegui `schema.sql` sul database (Fase 1c), sulla connection
string giusta.

**Le email non arrivano.**
(1) `BREVO_API_KEY` corretta; (2) `EMAIL_FROM` è un mittente **verificato** su Brevo; (3)
controlla lo spam.

**I link nelle email puntano al posto sbagliato.**
`FRONTEND_URL` sul backend è errato: è da lì che si costruiscono i link. Correggilo.

**Il pulsante Admin non compare.**
Hai eseguito `UPDATE users SET role='admin'` e poi fatto **logout/login**? Il ruolo si legge al
login.

**Dopo un riavvio del backend "ho perso dei dati".**
Non devono esserci dati salvati nel processo/su disco del backend: tutto va nel database. Se
succede, c'è qualcosa che scrive fuori dal DB — ma con questo backend i dati vanno tutti su
PostgreSQL, quindi un riavvio non li tocca.

---

## In sintesi

Il deploy è: **dal basso verso l'alto** (database → backend → frontend), poi **collegare gli
indirizzi** (`BASE_URL` e `FRONTEND_URL`), poi **admin e collaudo**. I quattro concetti
trasversali (variabili d'ambiente, HTTPS, CORS, persistenza nel database) spiegano il *perché*
di ogni passo, e valgono su qualunque provider. La guida specifica per DigitalOcean che hai già
è un'istanza concreta di questo stesso schema.

---

*Guida al deploy end-to-end (provider-agnostica) — "Il Mio Apiario". Per i dettagli specifici
del frontend, fai riferimento alla chat dedicata al frontend; per i passi concreti su
DigitalOcean, alla guida dedicata.*
