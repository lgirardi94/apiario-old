#!/usr/bin/env bash
# =========================================================
#  scripts/run.sh
#  Orchestratore comodo per SVILUPPO LOCALE:
#   - se il setup non è ancora stato fatto, lo esegue
#   - poi avvia il server
#
#  Per produzione su PaaS (App Platform, Render, ...) NON serve questo:
#  la piattaforma esegue da sé `npm install` + `npm start`. Lì usa
#  semmai scripts/setup.sh una volta per creare lo schema del DB.
#
#  Uso:
#     ./scripts/run.sh           avvia (con setup se serve)
#     ./scripts/run.sh --dev     avvia in modalità sviluppo (nodemon)
#     ./scripts/run.sh --setup   forza il setup e basta (non avvia)
# =========================================================

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

ROOT="$(project_root)"
cd "$ROOT"

MODE="start"
case "${1:-}" in
  --dev)   MODE="dev" ;;
  --setup) MODE="setup-only" ;;
  "")      MODE="start" ;;
  *) die "Opzione non riconosciuta: $1 (usa --dev, --setup, o nessuna)" ;;
esac

# Decide se serve il setup: manca node_modules o manca .env?
needs_setup() {
  [ ! -d "$ROOT/node_modules" ] && return 0
  [ ! -f "$ROOT/.env" ] && return 0
  return 1
}

if [ "$MODE" = "setup-only" ]; then
  bash "$ROOT/scripts/setup.sh"
  exit 0
fi

if needs_setup; then
  info "Setup non ancora completato: lo eseguo prima di avviare."
  bash "$ROOT/scripts/setup.sh"
else
  ok "Setup già presente (node_modules e .env trovati)."
fi

title "Avvio server"
if [ "$MODE" = "dev" ]; then
  info "Modalità sviluppo (riavvio automatico)."
  npm run dev
else
  info "Modalità produzione."
  npm start
fi
