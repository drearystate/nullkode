#!/usr/bin/env bash
# Makes a full backup now, while Nullkode keeps running: the database,
# uploaded files, imported website files and, when BACKUP_PASSPHRASE is set
# in .env, an encrypted copy of .env. It uses the same backup container as
# the nightly backups and saves into backups/ (or BACKUP_DIR from .env).
# Backups made this way are never deleted automatically.
#
#   bash scripts/backup.sh
#
# On Windows (PowerShell), in the Nullkode folder: docker compose run --rm backup once
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
if [[ ! -f .env ]]; then
  echo 'There is no .env in this folder. Run this from your Nullkode folder (where install.sh is).' >&2
  exit 1
fi
# Create the backup folder as you (and private), so you can open and copy the
# backups and nobody else can.
backup_dir=$(sed -n 's/^BACKUP_DIR=//p' .env | tail -n 1 | tr -d "\"'\r")
(umask 077 && mkdir -p -- "${backup_dir:-backups}")
docker compose run --rm -T backup once
echo "Keep backups private (they hold your customers' data) and copy them to another device."
