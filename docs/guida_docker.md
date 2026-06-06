# 🐳 Guida all'installazione con Docker — Backend "Il Mio Apiario"

> Guida completa per avviare il **backend** (API + database PostgreSQL) con Docker, sia in
> locale per lo sviluppo, sia come base per il self-hosting. Con Docker non devi installare
> Node, npm o PostgreSQL sul tuo computer: ci pensa il container.

I file Docker stanno nella cartella del backend:
`docs/apiario-backend/apiario-backend/` (`Dockerfile`, `docker-compose.yml`, `.dockerignore`).
Tutti i comandi qui sotto vanno eseguiti **da quella cartella**.

---

## 1. Cosa ottieni

`docker-compose.yml` definisce due servizi che si avviano insieme:

- **`db`** — PostgreSQL 16 (immagine ufficiale `postgres:16-alpine`), con i dati salvati in un
  volume persistente (`apiario_db`).
- **`app`** — il backend Node/Express, costruito dal `Dockerfile`. All'avvio esegue
  `npm run db:migrate` (crea lo schema e applica le migration) e poi `npm start`.

Risultato: l'API risponde su **http://localhost:3000**, con il database già pronto. Nessun passo
manuale per lo schema.

---

## 2. Prerequisiti

Serve solo **Docker** con **Docker Compose** (incluso nelle versioni recenti):

- **Windows / macOS:** installa [Docker Desktop](https://www.docker.com/products/docker-desktop/).
- **Linux:** installa Docker Engine + il plugin Compose (`docker compose`).

Verifica che funzioni:

```bash
docker --version
docker compose version
```

---

## 3. Avvio in un comando

Dalla cartella `docs/apiario-backend/apiario-backend/`:

```bash
docker compose up --build
```

Cosa succede:

1. Docker costruisce l'immagine del backend (`npm ci` dal `package-lock.json`).
2. Avvia PostgreSQL e aspetta che sia **pronto** (healthcheck `pg_isready`).
3. Il backend esegue `npm run db:migrate` → crea tabelle e migration.
4. Parte il server. Quando vedi questa riga è tutto a posto:

   ```
   [server] In ascolto sulla porta 3000 (development)
   ```

Verifica da un altro terminale:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

Per fermare: `Ctrl+C`, oppure da un altro terminale `docker compose down`.

> **Avvio in background:** aggiungi `-d` (`docker compose up --build -d`) per non occupare il
> terminale. I log li vedi con `docker compose logs -f app`.

---

## 4. Configurazione (variabili d'ambiente)

Le variabili del backend sono già impostate, per lo sviluppo, dentro `docker-compose.yml` nella
sezione `app → environment`:

| Variabile | Valore di default (dev) | A cosa serve |
|---|---|---|
| `DATABASE_URL` | `postgresql://apiario:apiario@db:5432/apiario` | Connessione al container `db` |
| `DATABASE_SSL` | `false` | In locale niente SSL |
| `JWT_SECRET` | `dev-secret-non-usare-in-produzione` | Firma dei token di sessione |
| `FRONTEND_URL` | `http://localhost:5500` | CORS + link nelle email |
| `BREVO_API_KEY` | *(vuota)* | Email disattivate finché non la imposti |
| `FIRST_ADMIN_EMAIL` | *(vuota)* | Email che diventa admin alla registrazione |

Per cambiarle, modifica direttamente `docker-compose.yml` e rilancia `docker compose up --build`.

> ⚠️ I valori di default sono pensati **solo per lo sviluppo locale**. Per il self-hosting in
> rete vedi la sezione [Produzione](#8-note-per-la-produzione).

---

## 5. Diventare amministratore

Due strade, entrambe supportate:

1. **Automatica (consigliata):** imposta la tua email in `FIRST_ADMIN_EMAIL` nel
   `docker-compose.yml`, (ri)avvia, poi **registrati dall'app con quella email**: l'account nasce
   già admin.

2. **Manuale, su un account già registrato:** promuovilo con uno dei comandi del container:

   ```bash
   # via lo script Node, nel container dell'app (usa FIRST_ADMIN_EMAIL o l'email passata)
   docker compose exec app npm run admin:promote -- tua-email@esempio.ch

   # oppure direttamente in SQL, nel container del database
   docker compose exec db psql -U apiario -d apiario \
     -c "UPDATE users SET role='admin' WHERE email = lower('tua-email@esempio.ch');"
   ```

   > Nota: lo script `./scripts/create-admin.sh` usa `psql`, che **non** è incluso nell'immagine
   > `app` (basata su Node Alpine). In contesto Docker usa uno dei due comandi qui sopra.

---

## 6. Comandi utili

```bash
# Avviare / ricostruire
docker compose up --build            # in primo piano
docker compose up --build -d         # in background

# Log
docker compose logs -f app           # log del backend
docker compose logs -f db            # log del database

# Fermare
docker compose down                  # ferma i container (i DATI restano nel volume)
docker compose down -v               # ferma e AZZERA il database (volume incluso)

# Ispezionare il database
docker compose exec db psql -U apiario -d apiario      # apre psql nel container
docker compose exec db psql -U apiario -d apiario -c "\dt"   # elenca le tabelle

# Rieseguire le migration manualmente (di solito non serve: parte all'avvio)
docker compose exec app npm run db:migrate
```

---

## 7. Collegare il frontend

Il frontend (le pagine HTML del progetto) gira separatamente — di solito da un piccolo server
statico in locale (es. l'estensione *Live Server* di VS Code, spesso su `http://localhost:5500`).

1. In `js/auth.js` imposta `BASE_URL` (o l'equivalente) sull'URL del backend:
   `http://localhost:3000`.
2. Assicurati che `FRONTEND_URL` nel `docker-compose.yml` corrisponda all'origine da cui servi
   il frontend (es. `http://localhost:5500`): serve al CORS e ai link nelle email.
3. Apri il frontend nel browser, scegli la **modalità Account**, registra un utente e prova
   salvataggio/caricamento.

---

## 8. Note per la produzione

Il `docker-compose.yml` di questo repo è ottimizzato per lo **sviluppo locale**. Per usarlo come
base di self-hosting in rete, cambia almeno:

- **Segreti reali:** `JWT_SECRET` lungo e casuale
  (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`), password del
  database robusta (non `apiario`).
- **Database:** valuta un PostgreSQL **gestito** (DigitalOcean, Render, Neon, Supabase…) invece
  del container `db`. In tal caso togli il servizio `db`, punta `DATABASE_URL` al DB gestito e
  imposta `DATABASE_SSL=true` (la connection string di solito contiene `?sslmode=require`).
- **`NODE_ENV=production`** e **`FRONTEND_URL`** sull'URL pubblico reale del frontend.
- **HTTPS davanti al backend:** metti un reverse proxy (Caddy, Nginx, Traefik) che termina il TLS.
  Il backend ha già `trust proxy` impostato, quindi il rate limiting funziona correttamente
  dietro proxy.
- **Email:** imposta `BREVO_API_KEY` ed `EMAIL_FROM` (mittente verificato su Brevo), altrimenti
  verifica email e reset password non inviano nulla.

> Per il deploy su piattaforme gestite **senza** Docker (build da GitHub) restano valide le guide
> `guida_deploy_digitalocean.md` e `guida_deploy_end_to_end.md`.

---

## 9. Solo l'immagine (senza Compose)

Se hai già un database PostgreSQL e vuoi solo il container del backend:

```bash
# costruisci l'immagine
docker build -t apiario-backend .

# avvia, passando le variabili (DB esterno raggiungibile dal container)
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://utente:password@host:5432/db?sslmode=require" \
  -e DATABASE_SSL=true \
  -e JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" \
  -e FRONTEND_URL="https://tuonome.github.io/il-mio-apiario" \
  apiario-backend
```

Lo schema: con un'immagine sola non parte `db:migrate` automaticamente (lo fa il `command` del
Compose). Esegui una volta:

```bash
docker run --rm \
  -e DATABASE_URL="..." -e DATABASE_SSL=true \
  -e JWT_SECRET="x" -e FRONTEND_URL="x" \
  apiario-backend npm run db:migrate
```

---

## 10. Troubleshooting

| Sintomo | Causa probabile | Rimedio |
|---|---|---|
| `port is already allocated` / `address already in use` | La porta 3000 o 5432 è già occupata | Cambia la mappatura in `ports:` (es. `"3001:3000"`) o libera la porta |
| Il backend riparte in loop all'avvio | Il DB non era ancora pronto | Già gestito dall'healthcheck; se persiste, `docker compose down -v` e riprova |
| `password authentication failed` | Credenziali DB non coerenti tra `db` e `DATABASE_URL` | Verifica che utente/password/db combacino nel `docker-compose.yml` |
| Le email non partono | `BREVO_API_KEY` non impostata | Normale in dev; impostala per attivarle |
| Modifiche al codice non si vedono | L'immagine è in cache | Ricostruisci con `docker compose up --build` |
| Voglio ripartire da zero | — | `docker compose down -v` (azzera anche il database) |

---

*Guida Docker — Backend "Il Mio Apiario". Per i dettagli su API, variabili e sicurezza vedi il
`README.md` del backend in `docs/apiario-backend/apiario-backend/`.*
