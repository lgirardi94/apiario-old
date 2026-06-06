#!/usr/bin/env bash
# =========================================================
#  scripts/create-admin.sh
#  Promuove un account esistente al ruolo 'admin'.
#  L'utente deve essersi PRIMA registrato dall'app.
#
#  Uso:
#     ./scripts/create-admin.sh                  (chiede l'email)
#     ./scripts/create-admin.sh email@dominio.ch (email come argomento)
# =========================================================

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

ROOT="$(project_root)"
cd "$ROOT"

title "Designazione amministratore"

# Carica le variabili (per DATABASE_URL).
load_env_file "$ROOT/.env"

require_var DATABASE_URL || die "DATABASE_URL non impostata (controlla .env o l'ambiente)."
has_cmd psql || die "psql non trovato: necessario per eseguire la query. Installa il client PostgreSQL."

# Email: da argomento o chiesta interattivamente.
EMAIL="${1:-}"
if [ -z "$EMAIL" ]; then
  if is_interactive; then
    printf "  %s " "Email dell'account da rendere admin:"
    read -r EMAIL
  else
    die "Nessuna email fornita. Uso: ./scripts/create-admin.sh email@dominio.ch"
  fi
fi
[ -n "$EMAIL" ] || die "Email vuota."

info "Promuovo ad admin: $EMAIL"

# Esegue l'update e verifica quante righe ha toccato.
# - L'email arriva tramite variabile psql (-v em=...) e si usa :'em':
#   psql la quota/escapa in modo sicuro (niente SQL injection né problemi
#   con apici nell'indirizzo, es. o'brien@x.com).
# - lower() perché l'app salva le email normalizzate in minuscolo: così la
#   ricerca funziona anche se l'admin digita maiuscole.
RISULTATO="$(psql "$DATABASE_URL" -t -A -v ON_ERROR_STOP=1 -v em="$EMAIL" \
  -c "UPDATE users SET role = 'admin' WHERE email = lower(:'em') RETURNING id;" || true)"

if [ -n "$RISULTATO" ]; then
  ok "Fatto. L'account $EMAIL ora è admin."
  info "Esci e rientra nell'app: comparirà il pannello Admin 🛡️"
else
  err "Nessun account trovato con email: $EMAIL"
  warn "Verifica di esserti registrato dall'app con QUESTA email, poi riprova."
  exit 1
fi
