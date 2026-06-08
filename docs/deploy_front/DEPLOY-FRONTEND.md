# 🚀 Deploy del frontend su Hetzner Cloud (Docker + nginx)

Guida per pubblicare il frontend di "Il Mio Apiario" su un VPS Hetzner Cloud,
servito da nginx in un contenitore Docker, accanto al backend.

I file di questo setup sono:
- `Dockerfile` — costruisce l'immagine nginx col frontend
- `nginx.conf` — serve i file statici e inoltra `/api/` al backend
- `.dockerignore` — esclude i file non necessari dall'immagine

---

## Prima di tutto: una modifica al frontend

Con questo setup frontend e backend stanno sullo **stesso dominio**, quindi
in `js/auth.js` imposta:

```javascript
const BASE_URL = '';   // stringa vuota: le chiamate /api/ restano sullo stesso host
```

Così non serve configurare il CORS sul backend, e nginx inoltra da solo le
chiamate `/api/...` al backend. (Ricorda poi di fare il bump di versione di
`auth.js` come da procedura, perché lo hai modificato.)

---

## Step sul server Hetzner

### 1. Crea il server
Nella Hetzner Console crea un server scegliendo l'app one-click **Docker CE**
(arriva con Docker già installato). Annota l'**indirizzo IP**.

### 2. Accedi via SSH
Dal tuo computer:
```bash
ssh root@IP-DEL-SERVER
```

### 3. Porta i file dell'app sul server
Il modo più comodo è clonare il repo GitHub:
```bash
mkdir -p /opt/apiario && cd /opt/apiario
git clone https://github.com/TUO-UTENTE/TUO-REPO.git frontend
```
(In alternativa puoi copiarli con `scp` dal tuo computer.)

### 4. Inserisci il frontend nel docker-compose complessivo
Questo è il punto in cui frontend e backend si uniscono. Il `docker-compose.yml`
che mette insieme **frontend + backend Node + PostgreSQL** va preparato con la
**chat backend** (deve conoscere il backend). Il pezzo del frontend, da inserire
in quel file, assomiglia a questo:

```yaml
services:
  frontend:
    build: ./frontend          # la cartella con Dockerfile + i file dell'app
    ports:
      - "80:80"                # in produzione di solito dietro un reverse proxy HTTPS
    depends_on:
      - backend
    restart: unless-stopped

  # backend: ...   <-- definito dalla chat backend
  # db (postgres): ...   <-- definito dalla chat backend
```

⚠️ In `nginx.conf`, il proxy punta a `http://backend:3000`. Verifica con la chat
backend che **il nome del servizio sia `backend`** e **la porta sia `3000`**;
se sono diversi, aggiorna `nginx.conf` di conseguenza.

### 5. Avvia tutto
Dalla cartella che contiene il `docker-compose.yml`:
```bash
docker compose up -d --build
```
Il frontend sarà raggiungibile sull'IP del server (porta 80).

---

## Dominio e HTTPS

- **Dominio**: crea un record DNS di tipo **A** che punta il tuo dominio
  all'IP del server.
- **HTTPS**: in produzione conviene mettere davanti un **reverse proxy** che
  gestisce il certificato automaticamente (Caddy o Traefik sono i più semplici;
  in alternativa nginx + Certbot). Anche questo va orchestrato nel
  `docker-compose.yml` complessivo → coordinalo con la chat backend.

> Nota: il `nginx.conf` di questo frontend serve l'app in HTTP sulla porta 80
> dentro il contenitore. L'HTTPS lo aggiunge il reverse proxy che sta davanti.

---

## Link delle email (verifica / reset password)

Con questo deploy, le pagine `verifica-email.html` e `reimposta-password.html`
sono servite da nginx come tutte le altre. Assicurati che il backend costruisca
i link delle email puntando al **tuo dominio**:
- `https://TUO-DOMINIO/verifica-email.html?token=...`
- `https://TUO-DOMINIO/reimposta-password.html?token=...`

---

## Aggiornare il frontend in futuro

Quando modifichi l'app:
```bash
cd /opt/apiario/frontend
git pull
cd ..   # dove sta il docker-compose.yml
docker compose up -d --build frontend
```

---

## Riassunto: chi fa cosa

- **Frontend (questi file)**: `Dockerfile`, `nginx.conf`, `.dockerignore` →
  pronti. Più la modifica `BASE_URL = ''` in `auth.js`.
- **Chat backend**: il `docker-compose.yml` complessivo (frontend + backend +
  PostgreSQL), il `Dockerfile` del backend, il reverse proxy per l'HTTPS, e la
  conferma di nome-servizio/porta del backend.
