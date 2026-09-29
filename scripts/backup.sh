#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
umask 077
backup_path="backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_path"
# Stop writers while capturing a matching database/assets snapshot.
trap 'docker compose start app >/dev/null' EXIT
docker compose stop app
docker compose exec -T db pg_dump -U nullkode -d nullkode -Fc > "$backup_path/database.dump"
docker compose run --rm --no-deps --entrypoint tar app -czf - uploads public/uploads public/assets/cloned > "$backup_path/assets.tar.gz"
cp .env "$backup_path/.env"
docker compose config --no-interpolate > "$backup_path/compose.yml"
printf 'Backup saved to %s. Keep it private and copy it off this server.\n' "$backup_path"
