#!/usr/bin/env bash
# Restores a Nullkode backup (made by the nightly backup service or by
# scripts/backup.sh). Run it from the Nullkode folder.
#
#   bash scripts/restore.sh backups/20260929T033000Z
#       Checks the backup and this installation. Changes nothing.
#   bash scripts/restore.sh backups/20260929T033000Z --apply
#       Restores the backup into this folder's installation, which must be
#       new: restore before starting Nullkode here for the first time. If this
#       folder has no .env, it is recovered from the backup's encrypted copy
#       (you are asked for BACKUP_PASSPHRASE).
#   bash scripts/restore.sh backups/20260929T033000Z --verify
#       Tests the backup next to your running installation: restores it into
#       a throwaway copy, starts the app on it, checks every table, then
#       removes the copy. Your installation is not touched.
#
# Step by step, and for Windows: docs/deploy/RESTORE.md.
set -euo pipefail

say() { printf '%s\n' "$*"; }
die() { printf 'Error: %s\n' "$*" >&2; exit 1; }
self="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/$(basename -- "${BASH_SOURCE[0]}")"
usage() {
  sed -n '2,19p' "$self" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

[[ $# -ge 1 && $# -le 2 ]] || usage
mode=${2:-}
case $mode in ''|--apply|--verify) ;; *) usage ;; esac
[[ -d $1 ]] || die "There is no folder $1."
backup_dir=$(cd -- "$1" && pwd)
name=${backup_dir##*/}
parent=${backup_dir%/*}
parent=${parent:-/}
cd -- "$(dirname -- "$self")/.."
[[ -f $backup_dir/database.dump ]] || die "$backup_dir has no database.dump, so it isn't a complete backup."
command -v docker >/dev/null 2>&1 || die "Docker is needed. Install Docker Desktop (or Docker Engine with the Compose plugin) first."
docker compose version >/dev/null 2>&1 || die "Docker Compose is needed. Install the Docker Compose plugin first."

env_value() { [[ -f .env ]] && sed -n "s/^$1=//p" .env | tail -n 1 | tr -d "\"'\r"; return 0; }
project=${COMPOSE_PROJECT_NAME:-$(env_value COMPOSE_PROJECT_NAME)}
project=${project:-nullkode}
backups_folder=$(env_value BACKUP_DIR)
backups_folder=${backups_folder:-backups}

checksums_ok() { # folder
  [[ -f $1/SHA256SUMS ]] || return 0
  if command -v sha256sum >/dev/null 2>&1; then (cd -- "$1" && sha256sum -c SHA256SUMS >/dev/null 2>&1)
  else (cd -- "$1" && shasum -a 256 -c SHA256SUMS >/dev/null 2>&1); fi
}

openssl_can_decrypt() {
  command -v openssl >/dev/null 2>&1 \
    && openssl enc -aes-256-cbc -pbkdf2 -iter 1 -md sha256 -pass pass:x -in /dev/null -out /dev/null >/dev/null 2>&1
}

recover_env() {
  local tmp=.env.restoring
  if [[ -z ${BACKUP_PASSPHRASE:-} ]]; then
    printf 'BACKUP_PASSPHRASE for this backup (not shown as you type): ' >&2
    IFS= read -r -s BACKUP_PASSPHRASE
    printf '\n' >&2
  fi
  export BACKUP_PASSPHRASE
  rm -f "$tmp"
  if openssl_can_decrypt; then
    (umask 077 && openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in "$backup_dir/env.enc" -out "$tmp" -pass env:BACKUP_PASSPHRASE 2>/dev/null) \
      || { rm -f "$tmp"; die "Couldn't open the backup's env.enc: the passphrase is wrong, or the file is damaged."; }
  else
    # This computer's openssl is too old (older macOS): use a small container.
    (umask 077 && docker run --rm -e BACKUP_PASSPHRASE -v "$backup_dir:/in:ro" alpine:3 sh -c \
      'apk add --no-cache -q openssl >/dev/null && openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in /in/env.enc -pass env:BACKUP_PASSPHRASE' > "$tmp") \
      || { rm -f "$tmp"; die "Couldn't open the backup's env.enc: the passphrase is wrong, the file is damaged, or Docker couldn't download openssl."; }
  fi
  mv "$tmp" .env
  say "Recovered .env from the backup."
}

say "Backup: $backup_dir"
checksums_ok "$backup_dir" || die "The backup's files don't match their checksums (SHA256SUMS): it is damaged or incomplete. Try another backup."
# The backup folder inside the restore container.
mount=(-v "$parent:/restore-from:ro")

case $mode in
  '')
    if [[ ! -f .env ]]; then
      if [[ -f $backup_dir/env.enc ]]; then
        say "The backup's files are complete. This folder has no .env yet: --apply will recover it from the backup's encrypted copy (it asks for BACKUP_PASSPHRASE)."
      else
        say "The backup's files are complete. This folder has no .env, and the backup doesn't include one: copy the .env you kept into $(pwd) before running --apply."
      fi
      exit 0
    fi
    (umask 077 && mkdir -p -- "$backups_folder")
    docker compose up -d --wait db
    docker compose run --rm -T "${mount[@]}" restore "/restore-from/$name"
    ;;

  --apply)
    if [[ -f .env ]]; then say "Using the .env in this folder."
    elif [[ -f $backup_dir/env.enc ]]; then recover_env
    else die "There is no .env in this folder, and the backup doesn't include one (BACKUP_PASSPHRASE wasn't set when it was made). Copy the .env you kept into $(pwd), then run this again."
    fi
    (umask 077 && mkdir -p -- "$backups_folder")
    docker compose up -d --wait db
    docker compose run --rm -T "${mount[@]}" restore "/restore-from/$name" --apply
    say "Building and starting Nullkode. The first build can take several minutes."
    docker compose up -d --build --wait --wait-timeout 900
    say ""
    say "Restored. Open $(env_value PUBLIC_BASE_URL) and sign in with your usual owner account."
    say "Before pointing your domain at this server, check a saved app, an uploaded picture, the AI connection and payment settings."
    ;;

  --verify)
    [[ -f .env ]] || die "--verify runs next to a working installation, and this folder has no .env. To restore into this folder, use --apply."
    verify="${project}-verify"
    port=${NK_VERIFY_PORT:-}
    if [[ -z $port ]]; then
      for candidate in $(seq 39100 39199); do
        if ! (exec 3<>"/dev/tcp/127.0.0.1/$candidate") 2>/dev/null; then port=$candidate; break; fi
      done
      [[ -n $port ]] || die "Couldn't find a free port for the test copy. Set NK_VERIFY_PORT to one."
    fi
    V() { COMPOSE_PROFILES='' APP_PORT=$port BIND_ADDRESS=127.0.0.1 docker compose -p "$verify" "$@"; }
    cleanup() {
      say "Removing the test copy..."
      V --profile restore down -v --remove-orphans >/dev/null 2>&1 || true
      docker image rm "$verify-app" "$verify-restore" >/dev/null 2>&1 || true
    }
    trap cleanup EXIT
    # Reuse the images this installation already built, so nothing is rebuilt.
    for service in app restore; do
      if docker image inspect "$project-$service" >/dev/null 2>&1; then docker tag "$project-$service" "$verify-$service"; fi
    done
    say "Restoring into a throwaway copy (Compose project \"$verify\")..."
    V up -d --wait db
    V run --rm -T "${mount[@]}" restore "/restore-from/$name" --apply
    say "Starting the app on the copy. This can take a few minutes..."
    V up -d --wait --wait-timeout 900 app
    if command -v curl >/dev/null 2>&1; then
      curl -fsS -m 30 "http://127.0.0.1:$port/api/health" >/dev/null || die "The app started, but its health check (/api/health) failed."
    fi
    say ""
    say "This backup works: every table matches, and Nullkode started on it (health check OK)."
    ;;
esac
