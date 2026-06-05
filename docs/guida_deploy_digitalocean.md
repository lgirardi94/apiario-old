# Guida al deploy su DigitalOcean — "Il Mio Apiario" Backend

> Guida passo-passo per mettere online il backend su DigitalOcean App Platform, con database
> PostgreSQL gestito. Scritta per chi non l'ha mai fatto: ogni passo spiega *cosa* fare e
> *perché*. Dove l'interfaccia di DigitalOcean usa termini specifici, li riporto tra virgolette.

---

## Cosa costruiremo

Tre pezzi che lavorano insieme:

```
┌─────────────────────┐         ┌──────────────────────┐
│  Frontend            │         │  Backend             │
│  (GitHub Pages)      │ ──API──▶│  (App Platform)      │
│  l'app dell'utente   │         │  il server Node.js   │
└─────────────────────┘         └──────────┬───────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │  Database          │
                                  │  (Managed Postgres)│
                                  │  i dati di tutti   │
                                  └────────────────────┘
```

- Il **frontend** è già su GitHub Pages (lo gestisci tu, fuori da questa guida).
- Il **backend** lo mettiamo su **App Platform** (il servizio gestito di DigitalOcean che
  prende il codice da GitHub e lo fa girare).
- Il **database** è un **Managed Database PostgreSQL** (DigitalOcean lo gestisce per te:
  backup, sicurezza, aggiornamenti).

---

## Costi previsti (verifica sempre i prezzi attuali)

| Componente | Piano iniziale consigliato | Costo indicativo |
|---|---|---|
| Backend (App Platform) | "Basic" web service più piccolo | ~$5/mese |
| Database PostgreSQL | "Development database" (512 MB) | ~$7/mese |
| Frontend | GitHub Pages | gratis |
| **Totale** | | **~$12/mese** |

> **Credito di benvenuto:** i nuovi account DigitalOcean di solito ricevono ~$200 di credito
> validi per i primi 60 giorni. Copre abbondantemente i primi mesi di prova.
>
> **Nota sul "development database":** è pensato per sviluppo/test, ha risorse limitate ma è
> perfetto per iniziare e per i tuoi volumi. Più avanti, se servisse, si passa a un cluster
> più grande senza perdere i dati.
>
> **Risparmio sul traffico:** tieni backend e database **nella stessa regione** (es. Francoforte
> FRA1, vicina alla Svizzera). Il traffico tra loro, nella stessa regione, non viene conteggiato.

---

## Prerequisiti

1. **Un account DigitalOcean** — registrati su digitalocean.com (serve una carta, anche se usi
   il credito gratuito).
2. **Il codice del backend su un repository GitHub** — App Platform prende il codice da lì.
   Se non l'hai ancora caricato, vedi la sezione "Appendice A: mettere il codice su GitHub".
3. **Una chiave API Brevo e un mittente verificato** — per le email (vedi "Appendice B").
4. **L'URL del tuo frontend** su GitHub Pages (es. `https://tuonome.github.io/nome-repo`).

---

## PARTE 1 — Creare il database PostgreSQL

Cominciamo dal database, perché al backend servirà la sua stringa di connessione.

### Passo 1.1 — Apri la creazione del database

1. Accedi a DigitalOcean.
2. Nel menu in alto, clicca il pulsante verde **"Create"**.
3. Scegli **"Databases"**.

### Passo 1.2 — Configura il database

1. **"Choose a database engine"** → seleziona **PostgreSQL** (lascia la versione predefinita,
   è una recente).
2. **"Choose a configuration"** → cerca l'opzione più economica:
   - Cerca la sezione **"Basic"** e, se disponibile, l'opzione **"Development database"** o il
     piano da **512 MB / più piccolo**. È quello da ~$7/mese.
3. **"Choose a datacenter region"** → scegli **Frankfurt (FRA1)** (la più vicina alla Svizzera;
   buona latenza e adatta per dati EU).
4. **"Finalize and create"**:
   - **"Database cluster name"** → dai un nome riconoscibile, es. `apiario-db`.
   - Clicca **"Create Database Cluster"**.

La creazione richiede qualche minuto. Nel frattempo DigitalOcean prepara il database.

### Passo 1.3 — Recupera la stringa di connessione

Quando il database è pronto:

1. Aprilo dalla lista (clicca su `apiario-db`).
2. Vai sulla scheda **"Overview"** (o **"Connection Details"**).
3. Trovi un riquadro **"Connection Details"** con un menu a tendina. Seleziona
   **"Connection string"**.
4. Vedrai una stringa che inizia con `postgresql://...`. **Copiala e mettila da parte** (la
   useremo per `DATABASE_URL`). Ha questa forma:
   ```
   postgresql://doadmin:LA_PASSWORD@apiario-db-do-user-xxxxx.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```

> Nota: questa stringa contiene già la password e indica `sslmode=require` — il database
> richiede SSL. Ce ne ricorderemo nella configurazione del backend (`DATABASE_SSL=true`).

> **Sicurezza:** questa stringa è una credenziale. Non condividerla, non metterla in un file
> committato su GitHub. La incolleremo solo nel pannello sicuro di App Platform.

---

## PARTE 2 — Creare lo schema del database

Il database esiste ma è vuoto: dobbiamo creare le tabelle. Ci sono due modi; scegli quello con
cui ti trovi meglio.

### Metodo A — Dalla console web di DigitalOcean (più semplice, senza installare nulla)

Alcuni piani offrono una console SQL integrata:

1. Nella pagina del database, cerca una scheda o pulsante tipo **"Console"** o **"Query"**.
2. Si apre un terminale SQL già connesso al database.
3. Apri il file `sql/schema.sql` del progetto, **copia tutto il suo contenuto**, incollalo
   nella console e premi invio/esegui.
4. Le tabelle vengono create.

### Metodo B — Dal tuo computer con `psql` (se preferisci la riga di comando)

`psql` è il client a riga di comando di PostgreSQL.

1. Installa `psql` se non ce l'hai:
   - **Mac:** `brew install libpq` poi `brew link --force libpq` (oppure installa Postgres.app)
   - **Windows:** scarica PostgreSQL da postgresql.org (include `psql`)
   - **Linux:** `sudo apt install postgresql-client`
2. Esegui lo schema, sostituendo la stringa con la tua:
   ```bash
   psql "LA_TUA_CONNECTION_STRING" -f sql/schema.sql
   ```
3. Se non dà errori, le tabelle sono create. Puoi verificarlo:
   ```bash
   psql "LA_TUA_CONNECTION_STRING" -c "\dt"
   ```
   Dovresti vedere: `users`, `user_files`, `user_backups`, `auth_tokens`.

> Tieni a portata di mano `psql` (o la console web): ti servirà anche dopo, per **designare il
> primo admin** (Parte 5).

---

## PARTE 3 — Deployare il backend su App Platform

Ora mettiamo online il server Node.js.

### Passo 3.1 — Avvia la creazione dell'app

1. Menu in alto → **"Create"** → **"Apps"** (App Platform).
2. **"Create App"**.

### Passo 3.2 — Collega il repository GitHub

1. **"Choose Source"** → seleziona **GitHub**.
2. La prima volta, DigitalOcean ti chiede di **autorizzare l'accesso a GitHub**. Concedilo
   (puoi limitarlo al solo repository del backend).
3. Seleziona:
   - **"Repository"** → il repo del backend.
   - **"Branch"** → di solito `main`.
   - **"Source Directory"** → lascia `/` (la radice), perché `package.json` è lì.
4. **"Autodeploy"** → lascialo attivo: così ogni volta che fai `push` su GitHub, l'app si
   ri-deploya da sola.
5. Clicca **"Next"**.

### Passo 3.3 — App Platform rileva Node.js

DigitalOcean analizza il repo e dovrebbe riconoscere un'app **Node.js**, proponendo:

- **"Build Command"** → di solito vuoto o `npm install` (va bene; `npm install` installa le
  dipendenze).
- **"Run Command"** → dovrebbe rilevare `npm start` dal `package.json`. Se non lo fa,
  impostalo a mano: **`npm start`**.
- **"HTTP Port"** → il nostro server legge la porta dalla variabile `PORT`. App Platform
  imposta `PORT` in automatico (di solito 8080); il nostro codice la usa già. Lascia il
  default.

> Se ti chiede il **"Resource Type"**, dev'essere **"Web Service"** (un servizio che resta in
> ascolto e risponde alle richieste), non "Static Site" né "Worker".

### Passo 3.4 — Scegli la dimensione (piano)

1. Cerca la sezione del piano / **"Edit Plan"** o **"Resource Size"**.
2. Scegli **"Basic"** e l'istanza più piccola (~$5/mese). Per i tuoi volumi è sufficiente.

### Passo 3.5 — Collega il database all'app (consigliato)

App Platform permette di "attaccare" il database creato prima, così vivono insieme:

1. Nella configurazione dell'app, cerca **"Add Resource"** o una sezione **"Databases"**.
2. Se ti propone di collegare un database esistente, seleziona **`apiario-db`** (quello della
   Parte 1).

> Questo passo è comodo ma **opzionale**: in ogni caso forniremo la `DATABASE_URL` a mano nel
> passo successivo, quindi se non trovi questa opzione, prosegui — funziona lo stesso.

### Passo 3.6 — Imposta le variabili d'ambiente

Questo è il passo cruciale. Le variabili sono i "settaggi segreti" che il backend legge
all'avvio (stringa del DB, chiave JWT, chiave Brevo, ecc.).

1. Cerca la sezione **"Environment Variables"** (a livello dell'app o del componente web).
2. Aggiungi le variabili qui sotto una per una. Per quelle sensibili, spunta l'opzione
   **"Encrypt"** (le nasconde e le protegge — App Platform le chiama spesso "secret").

| Key (nome) | Value (valore) | Encrypt? |
|---|---|:---:|
| `DATABASE_URL` | la connection string copiata nella Parte 1 | ✅ Sì |
| `DATABASE_SSL` | `true` | no |
| `JWT_SECRET` | una stringa lunga e casuale (vedi sotto) | ✅ Sì |
| `JWT_EXPIRES_IN` | `7d` | no |
| `BCRYPT_COST` | `12` | no |
| `VERIFY_TOKEN_TTL_HOURS` | `24` | no |
| `RESET_TOKEN_TTL_HOURS` | `1` | no |
| `BREVO_API_KEY` | la tua chiave Brevo (Appendice B) | ✅ Sì |
| `EMAIL_FROM` | il mittente verificato su Brevo, es. `noreply@tuodominio.ch` | no |
| `EMAIL_FROM_NAME` | `Il Mio Apiario` | no |
| `FRONTEND_URL` | l'URL del frontend su GitHub Pages (senza slash finale) | no |
| `NODE_ENV` | `production` | no |

**Come generare `JWT_SECRET`:** sul tuo computer, in un terminale con Node installato:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Copia la stringa lunga che stampa e incollala come valore di `JWT_SECRET`.

> **Attenzione a `FRONTEND_URL`:** dev'essere esatto e **senza slash finale**. Esempio giusto:
> `https://tuonome.github.io/nome-repo`. Serve sia per il CORS (il backend accetta richieste
> solo da quell'origine) sia per costruire i link nelle email. Se sbagliato, il frontend non
> riuscirà a parlare col backend (errori CORS) e i link nelle email punteranno al posto sbagliato.

### Passo 3.7 — Avvia il deploy

1. Dai un nome all'app, es. `apiario-backend`.
2. Conferma la regione (idealmente **la stessa del database**, Frankfurt).
3. Clicca **"Create Resources"** / **"Deploy"**.

App Platform ora: scarica il codice, esegue `npm install`, avvia `npm start`. Richiede qualche
minuto. Puoi seguire i log nella scheda **"Activity"** o **"Runtime Logs"**.

### Passo 3.8 — Trova l'URL del backend

A deploy concluso, App Platform assegna all'app un URL pubblico, del tipo:
```
https://apiario-backend-xxxxx.ondigitalocean.app
```
Lo trovi in cima alla pagina dell'app. **Copialo**: è l'URL che il frontend userà come
`BASE_URL`.

### Passo 3.9 — Verifica che risponda

Apri nel browser (o con curl) l'endpoint di salute:
```
https://apiario-backend-xxxxx.ondigitalocean.app/health
```
Devi vedere: `{"status":"ok"}`. Se lo vedi, **il backend è online e funzionante**. 🎉

---

## PARTE 4 — Collegare il frontend al backend

Ora che il backend ha un URL pubblico, comunichiamolo al frontend.

1. Nel repository del **frontend**, apri `js/auth.js`.
2. Trova la costante `BASE_URL` (è un placeholder).
3. Sostituiscila con l'URL del backend (Passo 3.8), **senza slash finale**:
   ```javascript
   const BASE_URL = 'https://apiario-backend-xxxxx.ondigitalocean.app';
   ```
4. Salva, fai `commit` e `push`. GitHub Pages si aggiornerà da solo.

> Da questo momento la **modalità Account** dell'app è attiva: login, registrazione, ecc.
> parleranno col tuo backend.

---

## PARTE 5 — Designare il primo amministratore

Il pannello admin esiste, ma il primo admin va nominato a mano (una volta sola).

1. **Apri l'app** (frontend) e **registrati in modalità Account** con la tua email.
2. **Promuovi quell'account ad admin** eseguendo questa query sul database — con la console web
   (Parte 2, Metodo A) o con `psql` (Metodo B):
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'tua-email@esempio.ch';
   ```
   Con `psql`:
   ```bash
   psql "LA_TUA_CONNECTION_STRING" -c "UPDATE users SET role = 'admin' WHERE email = 'tua-email@esempio.ch';"
   ```
3. **Esci e rientra** nell'app: comparirà il pulsante **🛡️ Admin** e potrai gestire gli utenti.

Da qui in poi non serve più toccare il database per l'amministrazione: fai tutto dal pannello.

---

## PARTE 6 — Verifica finale (checklist)

Prova il flusso completo per assicurarti che tutto sia connesso:

- [ ] `https://.../health` risponde `{"status":"ok"}`
- [ ] Dall'app, in modalità Account, riesci a **registrarti**
- [ ] **Ricevi l'email di verifica** (controlla anche lo spam). Se non arriva → problema Brevo
      (vedi Appendice B / Troubleshooting)
- [ ] Cliccando il link nell'email, finisci su `verifica-email.html` e l'email risulta verificata
- [ ] Riesci a fare **login** e a vedere i tuoi dati
- [ ] Crei/modifichi qualcosa e, **ricaricando**, i dati sono ancora lì (il salvataggio sul
      backend funziona)
- [ ] Il tuo account admin vede il pulsante **🛡️ Admin** e il pannello carica gli utenti
- [ ] La modalità **Drive** continua a funzionare come prima

Se tutti i punti sono verdi, il deploy è completo e funzionante.

---

## Troubleshooting (problemi comuni)

**Il frontend dà errori "CORS" o "blocked by CORS policy".**
La variabile `FRONTEND_URL` nel backend non combacia con l'URL reale del frontend. Deve essere
identica (incluso `https://`, escluso lo slash finale). Correggila nelle variabili d'ambiente
dell'app e fai ri-deploy.

**Il backend non parte / log mostra "Variabile d'ambiente mancante".**
Manca una variabile obbligatoria (`DATABASE_URL`, `JWT_SECRET` o `FRONTEND_URL`). Controlla la
sezione Environment Variables e verifica che ci siano tutte e siano scritte bene.

**Errore di connessione al database / "no pg_hba.conf entry" / SSL.**
Assicurati che `DATABASE_SSL` sia `true` e che `DATABASE_URL` sia la stringa completa copiata
da DigitalOcean (con `?sslmode=require` in fondo).

**Le email non arrivano.**
Tre cose da verificare: (1) `BREVO_API_KEY` corretta; (2) `EMAIL_FROM` è un indirizzo
**verificato** su Brevo (Brevo rifiuta mittenti non verificati); (3) controlla lo spam. Vedi
Appendice B.

**Il pulsante Admin non compare.**
Hai eseguito la query `UPDATE users SET role='admin'`? E hai fatto **logout/login** dopo? Il
ruolo viene letto al login.

**Le tabelle non esistono / errore "relation does not exist".**
Non hai eseguito `schema.sql` sul database (Parte 2), oppure l'hai eseguito su un database
diverso. Riesegui lo schema sulla connection string giusta.

---

## Appendice A — Mettere il codice del backend su GitHub

Se il backend non è ancora su GitHub:

1. Crea un **nuovo repository** su github.com (può essere privato).
2. Sul tuo computer, nella cartella del backend (quella con `package.json`):
   ```bash
   git init
   git add .
   git commit -m "Backend Il Mio Apiario - primo commit"
   git branch -M main
   git remote add origin https://github.com/TUO-UTENTE/NOME-REPO.git
   git push -u origin main
   ```
3. Verifica su GitHub che i file ci siano. **Controlla che `.env` NON sia presente** (il
   `.gitignore` del progetto lo esclude apposta: i segreti vanno nelle variabili di App
   Platform, non nel repo).

---

## Appendice B — Configurare Brevo per le email

1. Crea un account gratuito su brevo.com.
2. **Verifica un mittente:** nella dashboard, sezione **"Senders & IP"** (o "Mittenti"),
   aggiungi e verifica l'indirizzo email che userai come mittente (`EMAIL_FROM`). Brevo invia
   un'email di conferma a quell'indirizzo.
   - Se hai un dominio tuo, puoi verificarlo per una migliore deliverability; altrimenti va bene
     anche un singolo indirizzo verificato.
3. **Crea la chiave API:** sezione **"SMTP & API"** → **"API Keys"** → **"Generate a new API
   key"**. Copiala: è la tua `BREVO_API_KEY`.
4. Incolla chiave e mittente nelle variabili d'ambiente del backend (Passo 3.6).

> Il piano gratuito Brevo (circa 300 email/giorno) è abbondante per registrazioni e reset
> password.

---

## Note di gestione (dopo il deploy)

- **Aggiornare il backend:** fai `push` su GitHub → App Platform ri-deploya da solo (se hai
  lasciato attivo l'autodeploy).
- **Vedere i log:** nella pagina dell'app, scheda **"Runtime Logs"** — utile per diagnosticare
  problemi.
- **Cambiare una variabile:** modificala nella sezione Environment Variables e l'app si
  ri-deploya con i nuovi valori.
- **Backup del database:** i Managed Database di DigitalOcean fanno **backup automatici
  giornalieri** (di solito conservati ~7 giorni). Non devi farli a mano.
- **Costi sotto controllo:** nella dashboard "Billing" vedi il consumo. Con il credito di
  benvenuto i primi mesi sono coperti.

---

*Guida al deploy — Backend "Il Mio Apiario" su DigitalOcean App Platform + Managed PostgreSQL.
I nomi delle voci dell'interfaccia possono variare leggermente: cerca l'equivalente più vicino
se qualcosa è stato rinominato.*
