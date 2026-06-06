#!/usr/bin/env bash
# =========================================================
#  scripts/setup.sh
#  Setup una-tantum del backend:
#   1. verifica prerequisiti (node, npm)
#   2. assicura un .env valido (flag CLI, interattivo, o auto)
#   3. installa le dipendenze (npm ci se c'è il lockfile, altrimenti npm install)
#   4. crea/aggiorna schema + migration via Node (npm run db:migrate)
#   5. promuove il primo admin (se FIRST_ADMIN_EMAIL è impostata)
#   + smoke test finale (configurazione valida per l'avvio)
#
#  È idempotente: rilanciarlo non rompe nulla.
#
#  Uso:
#     ./scripts/setup.sh
#     ./scripts/setup.sh --database-url "postgres://..." --frontend-url "https://..."
#     ./scripts/setup.sh -y            (non-interattivo: JWT auto, niente domande)
#     ./scripts/setup.sh --first-admin me@dominio.ch
#
#  Flag:
#     --database-url URL     imposta DATABASE_URL
#     --frontend-url URL     imposta FRONTEND_URL
#     --jwt-secret VAL       imposta JWT_SECRET (se assente, viene generato)
#     --first-admin EMAIL    imposta FIRST_ADMIN_EMAIL (auto-admin alla registrazione)
#     -y, --yes, --non-interactive   non fa domande; genera ciò che può
#     -h, --help             mostra questo aiuto
# =========================================================

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

ROOT="$(project_root)"
cd "$ROOT"

# ---------------------------------------------------------
# 0) Parsing argomenti
# ---------------------------------------------------------
CLI_DBURL=""; CLI_FRONT=""; CLI_JWT=""; CLI_ADMIN=""; FORCE_NONINT=0

stampa_aiuto() {
  sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --database-url) CLI_DBURL="${2:-}"; shift 2 ;;
    --frontend-url) CLI_FRONT="${2:-}"; shift 2 ;;
    --jwt-secret)   CLI_JWT="${2:-}";   shift 2 ;;
    --first-admin)  CLI_ADMIN="${2:-}"; shift 2 ;;
    -y|--yes|--non-interactive) FORCE_NONINT=1; shift ;;
    -h|--help) stampa_aiuto; exit 0 ;;
    *) die "Opzione non riconosciuta: $1 (usa --help)" ;;
  esac
done

# Interattivo solo se c'è un umano E non è stato forzato il non-interattivo.
interattivo() { [ "$FORCE_NONINT" -eq 0 ] && is_interactive; }

title "Setup backend — Il Mio Apiario"
info "Cartella progetto: $ROOT"

# ---------------------------------------------------------
# 1) Prerequisiti
# ---------------------------------------------------------
title "1/5 · Verifica prerequisiti"

has_cmd node || die "Node.js non trovato. Installa Node 18+ e riprova."
NODE_MAJOR="$(node -v | sed 's/v\([0-9]*\).*/\1/')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  die "Serve Node 18 o superiore (trovato $(node -v))."
fi
ok "Node $(node -v)"

has_cmd npm || die "npm non trovato."
ok "npm $(npm -v)"

# psql NON è più necessario: schema e migration ora passano da Node.
# Resta utile solo per lo script manuale create-admin.sh.
if has_cmd psql; then
  ok "psql presente (opzionale, per create-admin.sh)"
else
  info "psql assente: non serve per il setup (usiamo Node). Serve solo a create-admin.sh."
fi

# ---------------------------------------------------------
# 2) File .env
# ---------------------------------------------------------
title "2/5 · Configurazione (.env)"

ENV_FILE="$ROOT/.env"
EXAMPLE_FILE="$ROOT/.env.example"

# Punto di partenza: copia .env.example se .env non esiste.
if [ ! -f "$ENV_FILE" ] && [ -f "$EXAMPLE_FILE" ]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  info "Creato .env da .env.example"
fi

# Carica .env esistente (l'ambiente già presente ha la precedenza).
load_env_file "$ENV_FILE"

# Applica subito gli override passati da CLI.
[ -n "$CLI_DBURL" ] && { upsert_env "DATABASE_URL" "$CLI_DBURL"; export DATABASE_URL="$CLI_DBURL"; ok "DATABASE_URL impostata da CLI."; }
[ -n "$CLI_FRONT" ] && { CLI_FRONT="${CLI_FRONT%/}"; upsert_env "FRONTEND_URL" "$CLI_FRONT"; export FRONTEND_URL="$CLI_FRONT"; ok "FRONTEND_URL impostata da CLI."; }
[ -n "$CLI_JWT" ]   && { upsert_env "JWT_SECRET" "$CLI_JWT"; export JWT_SECRET="$CLI_JWT"; ok "JWT_SECRET impostata da CLI."; }
[ -n "$CLI_ADMIN" ] && { upsert_env "FIRST_ADMIN_EMAIL" "$CLI_ADMIN"; export FIRST_ADMIN_EMAIL="$CLI_ADMIN"; ok "FIRST_ADMIN_EMAIL impostata da CLI."; }

# --- JWT_SECRET: se manca, lo generiamo SEMPRE (è sicuro e non richiede scelte). ---
if ! require_var JWT_SECRET; then
  JWT_GEN="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
  upsert_env "JWT_SECRET" "$JWT_GEN"
  export JWT_SECRET="$JWT_GEN"
  ok "JWT_SECRET generato automaticamente."
fi

# --- DATABASE_URL ---
if ! require_var DATABASE_URL; then
  if interattivo; then
    printf "  %s\n" "Connection string PostgreSQL (postgresql://utente:password@host:porta/db):"
    read -r _dburl
    [ -n "$_dburl" ] || die "DATABASE_URL è obbligatoria."
    upsert_env "DATABASE_URL" "$_dburl"; export DATABASE_URL="$_dburl"
  else
    die "DATABASE_URL mancante. Passala con --database-url o impostala nell'ambiente/.env."
  fi
fi

# --- FRONTEND_URL ---
if ! require_var FRONTEND_URL; then
  if interattivo; then
    printf "  %s\n" "URL del frontend (es. https://tuonome.github.io/repo) — serve per CORS e link email:"
    read -r _front
    [ -n "$_front" ] || die "FRONTEND_URL è obbligatoria."
    _front="${_front%/}"
    upsert_env "FRONTEND_URL" "$_front"; export FRONTEND_URL="$_front"
  else
    die "FRONTEND_URL mancante. Passala con --frontend-url o impostala nell'ambiente/.env."
  fi
fi

# --- SSL automatico: i DB gestiti usano sslmode=require nella stringa. ---
if [ -z "${DATABASE_SSL:-}" ] || [ "${DATABASE_SSL:-}" = "false" ]; then
  case "${DATABASE_URL:-}" in
    *sslmode=require*)
      upsert_env "DATABASE_SSL" "true"; export DATABASE_SSL="true"
      info "Rilevato sslmode=require: imposto DATABASE_SSL=true."
      ;;
  esac
fi

ok "Variabili essenziali a posto (DATABASE_URL, JWT_SECRET, FRONTEND_URL)."
[ -n "${BREVO_API_KEY:-}" ] || warn "BREVO_API_KEY non impostata: verifica email e reset password resteranno disattivati finché non la configuri."

# ---------------------------------------------------------
# 3) Dipendenze
# ---------------------------------------------------------
title "3/5 · Installazione dipendenze"
if [ -f "$ROOT/package-lock.json" ]; then
  info "Trovato package-lock.json: uso 'npm ci' (riproducibile e veloce)."
  npm ci
else
  info "Nessun lockfile: uso 'npm install'."
  npm install
fi
ok "Dipendenze installate."

# ---------------------------------------------------------
# 4) Schema + migration (via Node, niente psql necessario)
# ---------------------------------------------------------
title "4/5 · Database: schema e migration"
info "Eseguo 'npm run db:migrate' (idempotente, traccia le migration applicate)."
npm run db:migrate
ok "Database creato/aggiornato."

# ---------------------------------------------------------
# 5) Primo admin (opzionale)
# ---------------------------------------------------------
title "5/5 · Primo amministratore"
if [ -n "${FIRST_ADMIN_EMAIL:-}" ]; then
  info "FIRST_ADMIN_EMAIL = ${FIRST_ADMIN_EMAIL}"
  info "• Alla registrazione con questa email, l'account diventerà admin in automatico."
  info "• Provo intanto a promuoverlo ora (se si è già registrato):"
  npm run admin:promote || warn "Promozione non riuscita ora: puoi rifarla con 'npm run admin:promote' o './scripts/create-admin.sh'."
else
  info "FIRST_ADMIN_EMAIL non impostata (auto-promozione disattivata)."
  info "Potrai designare un admin con:  ./scripts/create-admin.sh  (manuale, via psql)"
fi

# ---------------------------------------------------------
# Smoke test: la configurazione è valida per avviare l'app?
# ---------------------------------------------------------
title "Verifica finale (smoke test)"
if node -e "import('./src/config/env.js').then(()=>{console.log('config ok');}).catch((e)=>{console.error(e.message);process.exit(1);})" >/dev/null 2>&1; then
  ok "Configurazione valida: l'app può avviarsi."
else
  warn "La validazione della configurazione ha segnalato qualcosa: controlla il .env."
fi

title "Setup completato 🐝"
ok "Il backend è pronto."
info "Avvia con:   npm start        (produzione)"
info "oppure:      npm run dev      (sviluppo, riavvio automatico)"
info "oppure:      ./scripts/run.sh (setup-and-run per sviluppo locale)"
echo
info "Admin: imposta FIRST_ADMIN_EMAIL nel .env (auto), oppure ./scripts/create-admin.sh (manuale)."
