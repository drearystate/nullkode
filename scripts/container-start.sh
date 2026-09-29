#!/bin/sh
set -eu
if [ "${NULLKODE_ANDROID:-0}" = "1" ] && [ ! -d "${ANDROID_HOME:-/opt/android-sdk}/platforms" ]; then
  echo "NULLKODE_ANDROID=1, but this image was built without the Android tools. Run the installer again, or: docker compose up -d --build" >&2
fi
# Bring the database up to date on every start: additive changes only, never
# --accept-data-loss. If something the app needs is still missing afterwards,
# stop here with a plain message instead of serving pages that would fail.
# NK_SCHEMA_MODE=refuse in .env stops without changing the database.
NK_SCHEMA_MODE="${NK_SCHEMA_MODE:-apply}" node scripts/check-schema.mjs
# PORT lets a hosting platform choose the port; Docker Compose uses 3001.
exec node node_modules/next/dist/bin/next start -p "${PORT:-3001}" -H 0.0.0.0
