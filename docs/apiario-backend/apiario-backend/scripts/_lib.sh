#!/usr/bin/env bash
# =========================================================
#  scripts/_lib.sh
#  Funzioni condivise (log colorati, controlli, helper).
#  Non si esegue da solo: viene incluso dagli altri script con:
#     source "$(dirname "$0")/_lib.sh"
# =========================================================

# Colori (disattivati se l'output non è un terminale).
if [ -t 1 ]; then
  C_RESET='\033[0m'; C_RED='\033[0;31m'; C_GRN='\033[0;32m'
  C_YEL='\033[0;33m'; C_BLU='\033[0;34m'; C_BOLD='\033[1m'
else
  C_RESET=''; C_RED=''; C_GRN=''; C_YEL=''; C_BLU=''; C_BOLD=''
fi

info()  { printf "${C_BLU}ℹ${C_RESET}  %s\n" "$1"; }
ok()    { printf "${C_GRN}✓${C_RESET}  %s\n" "$1"; }
warn()  { printf "${C_YEL}⚠${C_RESET}  %s\n" "$1"; }
err()   { printf "${C_RED}✗${C_RESET}  %s\n" "$1" >&2; }
title() { printf "\n${C_BOLD}%s${C_RESET}\n" "$1"; }

# Esce con errore e messaggio.
die() { err "$1"; exit 1; }

# Verifica che un comando esista nel PATH.
has_cmd() { command -v "$1" >/dev/null 2>&1; }

# Siamo in una sessione interattiva? (c'è un umano che può rispondere)
is_interactive() { [ -t 0 ] && [ -t 1 ]; }

# Trova la radice del progetto (la cartella che contiene package.json),
# partendo dalla posizione di questo script.
project_root() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  echo "$dir"
}

# Carica le variabili da un file .env, se esiste, nell'ambiente corrente.
# Ignora righe vuote e commenti. Non sovrascrive variabili già impostate
# nell'ambiente (così l'ambiente del provider ha la precedenza).
load_env_file() {
  local envfile="$1"
  [ -f "$envfile" ] || return 0
  # Legge riga per riga in modo sicuro.
  while IFS= read -r riga || [ -n "$riga" ]; do
    # salta righe vuote e commenti
    case "$riga" in
      ''|\#*) continue ;;
    esac
    # deve contenere un '='
    case "$riga" in
      *=*) ;;
      *) continue ;;
    esac
    local chiave="${riga%%=*}"
    local valore="${riga#*=}"
    # rimuove spazi attorno alla chiave
    chiave="$(echo "$chiave" | xargs)"
    # rimuove un eventuale prefisso "export "
    chiave="${chiave#export }"
    # rimuove una coppia di virgolette (doppie o singole) che racchiude il
    # valore: senza questo, un .env con DATABASE_URL="postgres://..." passerebbe
    # le virgolette a psql, facendo fallire la connessione.
    case "$valore" in
      \"*\") valore="${valore#\"}"; valore="${valore%\"}" ;;
      \'*\') valore="${valore#\'}"; valore="${valore%\'}" ;;
    esac
    # esporta solo se non già definita nell'ambiente
    if [ -z "${!chiave:-}" ]; then
      export "$chiave=$valore"
    fi
  done < "$envfile"
}

# Verifica che una variabile d'ambiente sia impostata e non vuota.
# Uso: require_var NOME_VAR
require_var() {
  local nome="$1"
  [ -n "${!nome:-}" ]
}

# Scrive o aggiorna una coppia CHIAVE=VALORE nel file .env del progetto.
# Se la chiave esiste già, la sostituisce; altrimenti la aggiunge in fondo.
# Uso: upsert_env CHIAVE "valore"
upsert_env() {
  local chiave="$1"
  local valore="$2"
  local root envfile
  root="$(project_root)"
  envfile="$root/.env"

  touch "$envfile"

  if grep -q "^${chiave}=" "$envfile" 2>/dev/null; then
    # Sostituisce la riga esistente (usa un delimitatore non comune per sicurezza).
    local tmp
    tmp="$(mktemp)"
    # riscrive il file sostituendo la riga della chiave
    while IFS= read -r riga || [ -n "$riga" ]; do
      case "$riga" in
        "${chiave}="*) printf '%s=%s\n' "$chiave" "$valore" ;;
        *) printf '%s\n' "$riga" ;;
      esac
    done < "$envfile" > "$tmp"
    mv "$tmp" "$envfile"
  else
    printf '%s=%s\n' "$chiave" "$valore" >> "$envfile"
  fi
}
