#!/usr/bin/env bash
# Nightly backup for a Nullkode server set up without Docker (systemd,
# Plesk). nullkode-backup.timer runs it through nullkode-backup.service.
#
# It runs the same backup as the Docker backup service (scripts/backup-loop.sh)
# with this server's PostgreSQL tools: a live pg_dump of DATABASE_URL (the app
# keeps running), the uploads/, public/uploads/ and, weekly,
# public/assets/cloned/ folders, and an encrypted copy of .env when
# BACKUP_PASSPHRASE is set. It keeps 7 daily and 4 weekly backups
# (BACKUP_KEEP_DAILY, BACKUP_KEEP_WEEKLY) and records the result where the
# admin pages show it.
#
# Needs: bash, pg_dump and psql of the same major version as the database
# server (or newer), tar, gzip, sha256sum, and openssl for BACKUP_PASSPHRASE.
#
#   nullkode-backup.sh             the day's backup (weekly on BACKUP_WEEKLY_DAY)
#   nullkode-backup.sh once        a full backup now, never deleted automatically
#
# Settings come from the environment (the service loads .env):
#   NULLKODE_DIR   the Nullkode folder (default: three folders up from here)
#   BACKUP_DIR     where backups go (default /var/backups/nullkode; a relative
#                  path is taken from NULLKODE_DIR)
set -euo pipefail
app_dir=${NULLKODE_DIR:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)}
[[ -f $app_dir/scripts/backup-loop.sh ]] || { echo "Can't find Nullkode in $app_dir. Set NULLKODE_DIR." >&2; exit 1; }
for tool in pg_dump psql tar gzip sha256sum; do
  command -v "$tool" >/dev/null 2>&1 || { echo "$tool is missing. Install the PostgreSQL client tools (for example: apt install postgresql-client)." >&2; exit 1; }
done
[[ -n ${DATABASE_URL:-} || -n ${PGHOST:-} ]] || { echo "DATABASE_URL is not set. Run this through nullkode-backup.service, which loads .env." >&2; exit 1; }

backup_dir=${BACKUP_DIR:-/var/backups/nullkode}
[[ $backup_dir == /* ]] || backup_dir="$app_dir/${backup_dir#./}"
export BACKUP_DIR=$backup_dir
export BACKUP_SOURCE_ROOT=${BACKUP_SOURCE_ROOT:-$app_dir}
export BACKUP_ENV_FILE=${BACKUP_ENV_FILE:-$app_dir/.env}

exec bash "$app_dir/scripts/backup-loop.sh" "${1:-scheduled}"
