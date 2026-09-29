#!/usr/bin/env bash
# Nullkode backups: the nightly backup service, one-off backups and restores.
#
# Docker: the "backup" service in docker-compose.yml runs this script in its
# own small container (scripts/backup.Dockerfile). It copies the database over
# the Compose network while the app keeps running, and reads the upload
# volumes read-only. The "restore" service runs "restore" with write access.
# Without Docker: docs/deploy/systemd/nullkode-backup.sh runs it from a
# systemd timer, with the PostgreSQL tools installed on the server.
#
# Commands:
#   loop        every day at BACKUP_TIME, make the day's backup (the service)
#   scheduled   make the day's backup now: weekly on BACKUP_WEEKLY_DAY (or
#               when the last weekly one is over a week old), otherwise daily
#   once        make a full backup now (scripts/backup.sh). Backups made this
#               way are never deleted automatically.
#   prune       only apply the rules for how many backups to keep
#   restore <backup> [--apply]
#               check a backup; with --apply, restore it into an empty
#               installation (scripts/restore.sh runs this)
#
# Settings (environment variables):
#   DATABASE_URL           postgres://user:password@host:port/database. Or
#                          the usual PGHOST, PGUSER, PGPASSWORD, PGDATABASE.
#   BACKUP_DIR             where backups go (default /backups)
#   BACKUP_SOURCE_ROOT     the folder holding uploads/, public/uploads/,
#                          public/assets/cloned/ and package.json (default /nullkode)
#   BACKUP_ENV_FILE        the settings file (default <BACKUP_SOURCE_ROOT>/.env)
#   BACKUP_PASSPHRASE      encrypts the copy of .env in each backup. Without it,
#                          .env is left out.
#   BACKUP_TIME            HH:MM, 24-hour clock, in the TZ time zone (default
#                          03:30). "off" turns the nightly backup off.
#   BACKUP_WEEKLY_DAY      1-7, Monday to Sunday (default 7). The weekly backup
#                          also saves imported website files.
#   BACKUP_KEEP_DAILY      daily backups to keep (default 7)
#   BACKUP_KEEP_WEEKLY     weekly backups to keep (default 4)
#   BACKUP_HEARTBEAT_URL   opened after each successful nightly backup, for a
#                          monitor such as Healthchecks.io or Uptime Kuma
#
# Each backup is a folder named after the time it started (UTC), e.g.
# backups/20260929T033000Z, with database.dump (pg_dump -Fc), uploads.tar.gz,
# public-uploads.tar.gz, assets-cloned.tar.gz (weekly and one-off backups),
# env.enc, rowcounts.txt, SHA256SUMS, manifest.json and README.txt. The
# result of every backup is also saved in the database (Setting
# "backup.last"), where the admin pages read it.
set -Eeuo pipefail
shopt -s inherit_errexit
umask 077

BACKUP_DIR=${BACKUP_DIR:-/backups}
SRC=${BACKUP_SOURCE_ROOT:-/nullkode}
ENV_FILE=${BACKUP_ENV_FILE:-$SRC/.env}
ENC_ARGS=(-aes-256-cbc -pbkdf2 -iter 600000 -md sha256)
# The app's Docker image runs as the "node" user (uid 1000); restored upload
# folders are handed back to it.
RESTORE_OWNER=${RESTORE_OWNER:-1000:1000}

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$*"; }
warn() { log "Warning: $*" >&2; }
die() { log "Error: $*" >&2; exit 1; }

number_or_default() { # value default
  if [[ $1 =~ ^[0-9]+$ ]]; then printf '%s' "$((10#$1))"; else printf '%s' "$2"; fi
}
KEEP_DAILY=$(number_or_default "${BACKUP_KEEP_DAILY:-7}" 7)
KEEP_WEEKLY=$(number_or_default "${BACKUP_KEEP_WEEKLY:-4}" 4)
WEEKLY_DAY=${BACKUP_WEEKLY_DAY:-7}
[[ $WEEKLY_DAY =~ ^[1-7]$ ]] || WEEKLY_DAY=7

# --- Database connection -----------------------------------------------------

# Turns DATABASE_URL into PG* variables, so the password never appears on a
# command line (where other users of the server could see it), and drops the
# options only Prisma understands (schema=, connection_limit= ...).
url_decode() { local s=${1//\\/\\\\}; printf '%b' "${s//%/\\x}"; }
use_database_url() {
  local url=${DATABASE_URL:-} rest auth hostport path query pair key value
  [[ -n $url ]] || return 0
  [[ $url =~ ^postgres(ql)?:// ]] || die "DATABASE_URL must start with postgres:// or postgresql://."
  rest=${url#*://}
  if [[ $rest == *\?* ]]; then query=${rest#*\?}; rest=${rest%%\?*}; else query=''; fi
  if [[ $rest == */* ]]; then path=${rest#*/}; rest=${rest%%/*}; else path=''; fi
  if [[ $rest == *@* ]]; then auth=${rest%@*}; hostport=${rest##*@}; else auth=''; hostport=$rest; fi
  if [[ -n $auth ]]; then
    export PGUSER; PGUSER=$(url_decode "${auth%%:*}")
    if [[ $auth == *:* ]]; then export PGPASSWORD; PGPASSWORD=$(url_decode "${auth#*:}"); fi
  fi
  if [[ $hostport =~ ^\[([^]]+)\](:([0-9]+))?$ ]]; then
    export PGHOST=${BASH_REMATCH[1]}
    if [[ -n ${BASH_REMATCH[3]} ]]; then export PGPORT=${BASH_REMATCH[3]}; fi
  elif [[ -n $hostport ]]; then
    export PGHOST=${hostport%%:*}
    if [[ $hostport == *:* ]]; then export PGPORT=${hostport##*:}; fi
  fi
  if [[ -n $path ]]; then export PGDATABASE; PGDATABASE=$(url_decode "$path"); fi
  local IFS='&'
  set -f
  for pair in $query; do
    key=${pair%%=*}; value=$(url_decode "${pair#*=}")
    case $key in
      host) export PGHOST=$value ;;
      port) export PGPORT=$value ;;
      user) export PGUSER=$value ;;
      password) export PGPASSWORD=$value ;;
      sslmode) export PGSSLMODE=$value ;;
      sslrootcert) export PGSSLROOTCERT=$value ;;
      sslcert) export PGSSLCERT=$value ;;
      sslkey) export PGSSLKEY=$value ;;
      connect_timeout) export PGCONNECT_TIMEOUT=$value ;;
      application_name) export PGAPPNAME=$value ;;
      options) export PGOPTIONS=$value ;;
      target_session_attrs) export PGTARGETSESSIONATTRS=$value ;;
      gssencmode) export PGGSSENCMODE=$value ;;
      channel_binding) export PGCHANNELBINDING=$value ;;
      *) ;; # Prisma's own options
    esac
  done
  set +f
  unset DATABASE_URL
}
use_database_url
export PGCONNECT_TIMEOUT=${PGCONNECT_TIMEOUT:-15}
: "${PGDATABASE:=nullkode}"; export PGDATABASE

sql() { psql -X -q -A -t -v ON_ERROR_STOP=1 "$@"; }

# A new database container first runs a temporary server that only answers
# locally while it sets itself up; its health check can pass before the real
# server accepts connections. Wait (up to BACKUP_DB_WAIT seconds, default 90).
wait_for_db() {
  local waited=0 limit
  limit=$(number_or_default "${BACKUP_DB_WAIT:-90}" 90)
  until sql -c 'SELECT 1' >/dev/null 2>&1; do
    ((waited < limit)) || return 1
    sleep 2; waited=$((waited + 2))
  done
}

# --- Small helpers -----------------------------------------------------------

json_string() {
  local s=$1
  s=${s//\\/\\\\}; s=${s//\"/\\\"}; s=${s//$'\n'/\\n}; s=${s//$'\r'/\\r}; s=${s//$'\t'/\\t}
  s=$(printf '%s' "$s" | tr -d '\000-\010\013\014\016-\037')
  printf '"%s"' "$s"
}
iso_from_name() { # 20260929T033000Z -> 2026-09-29T03:30:00Z
  local n=$1
  printf '%s-%s-%sT%s:%s:%sZ' "${n:0:4}" "${n:4:2}" "${n:6:2}" "${n:9:2}" "${n:11:2}" "${n:13:2}"
}
epoch_from_name() {
  local n=$1
  date -u -d "${n:0:4}-${n:4:2}-${n:6:2} ${n:9:2}:${n:11:2}:${n:13:2}" +%s
}
manifest_value() { # manifest-file key  (string or number values); empty when missing
  { sed -n "s/^  \"$2\": \"\{0,1\}\([^\",]*\)\"\{0,1\},\{0,1\}\$/\1/p" "$1" 2>/dev/null || true; } | head -n 1
}
app_version() {
  { sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC/package.json" 2>/dev/null || true; } | head -n 1
}
backup_names() { # newest first
  local d
  for d in "$BACKUP_DIR"/*/; do
    d=${d%/}; d=${d##*/}
    if [[ $d =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then printf '%s\n' "$d"; fi
  done | sort -r
}
newest_backup() { # [kind] -> name of the newest finished backup (of that kind)
  local name kind
  while IFS= read -r name; do
    kind=$(manifest_value "$BACKUP_DIR/$name/manifest.json" kind)
    [[ -n $kind ]] || continue
    if [[ -z ${1:-} || $kind == "$1" ]]; then printf '%s' "$name"; return 0; fi
  done < <(backup_names)
  return 0
}
file_owner() { stat -c %u:%g "$1" 2>/dev/null || true; }
# Backups written by the container belong to root. Hand them to whoever owns
# .env (the person who installed Nullkode), so they can copy and delete them.
hand_over() { # path
  local owner
  [[ $(id -u) == 0 ]] || return 0
  owner=$(file_owner "$ENV_FILE")
  [[ -n $owner && $owner != 0:0 ]] || return 0
  chown -R "$owner" "$1" 2>/dev/null || true
  [[ $(file_owner "$BACKUP_DIR") == 0:0 ]] && chown "$owner" "$BACKUP_DIR" 2>/dev/null || true
}

LOCK=''
release_lock() { [[ -n $LOCK ]] && rm -rf "$LOCK"; LOCK=''; }
take_lock() { # wait|nowait
  local lock="$BACKUP_DIR/.lock" waited=0
  until mkdir "$lock" 2>/dev/null; do
    # Left behind by a backup that was stopped part-way.
    if [[ -n $(find "$lock" -maxdepth 0 -mmin +360 2>/dev/null) ]]; then rm -rf "$lock"; continue; fi
    [[ $1 == wait && $waited -lt 7200 ]] || return 1
    sleep 30; waited=$((waited + 30))
  done
  LOCK=$lock
  printf '%s %s %s\n' "$$" "$(hostname 2>/dev/null || echo unknown)" "$(date -u +%FT%TZ)" > "$lock/owner"
}

# --- Status in the database ----------------------------------------------------

record_status() { # json
  printf '%s\n' "INSERT INTO \"Setting\" (key, value, \"updatedAt\") VALUES ('backup.last', :'marker'::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, \"updatedAt\" = now();" \
    | psql -X -q -v ON_ERROR_STOP=1 -v marker="$1" >/dev/null 2>&1 \
    || warn "Couldn't save this backup's result in the database (it may not be set up yet)."
}

heartbeat() {
  [[ -n ${BACKUP_HEARTBEAT_URL:-} ]] || return 0
  if command -v curl >/dev/null 2>&1; then curl -fsS -m 30 --retry 2 -o /dev/null "$BACKUP_HEARTBEAT_URL"
  else wget -q -T 30 -O /dev/null "$BACKUP_HEARTBEAT_URL"; fi \
    || warn "Couldn't reach BACKUP_HEARTBEAT_URL."
}

# --- Making a backup -----------------------------------------------------------

# One psql session exports a snapshot and counts every table's rows in it;
# pg_dump then copies exactly that snapshot. The app keeps running, and a
# restore can be checked against the counts row for row.
COUNT_TABLES_SQL="SELECT format('SELECT %L || ''|'' || count(*) FROM %I.%I', n.nspname || '.' || c.relname, n.nspname, c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname <> 'information_schema' AND n.nspname NOT LIKE 'pg\\_%' ORDER BY n.nspname, c.relname \\gexec"

dump_database() { # folder
  local dir=$1 snapshot line finished=0 to from
  coproc SNAP { psql -X -q -A -t -v ON_ERROR_STOP=1 2>&1; }
  exec {to}>&"${SNAP[1]}" {from}<&"${SNAP[0]}"
  printf '%s\n' 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;' 'SELECT pg_export_snapshot();' >&"$to"
  IFS= read -r -t 120 snapshot <&"$from" || snapshot=''
  [[ $snapshot =~ ^[0-9A-F]+-[0-9A-F]+(-[0-9]+)?$ ]] || { echo "Couldn't connect to the database: ${snapshot:-no answer}" >&2; return 1; }
  printf '%s\n' "$COUNT_TABLES_SQL" "SELECT '__nk_counts_done__';" >&"$to"
  : > "$dir/rowcounts.txt"
  while IFS= read -r -t 3600 line <&"$from"; do
    if [[ $line == __nk_counts_done__ ]]; then finished=1; break; fi
    [[ $line == *'|'* ]] || { echo "Counting rows failed: $line" >&2; return 1; }
    printf '%s\n' "$line" >> "$dir/rowcounts.txt"
  done
  [[ $finished == 1 ]] || { echo "Counting rows failed." >&2; return 1; }
  pg_dump -Fc --snapshot="$snapshot" -f "$dir/database.dump"
  printf 'COMMIT;\n\\q\n' >&"$to"
  exec {to}>&- {from}<&-
  wait "$SNAP_PID" 2>/dev/null || true
}

archive() { # folder archive-name path-under-SRC
  local dir=$1 out=$2 rel=$3 rc=0
  if [[ ! -d $SRC/$rel ]]; then log "No $rel folder, skipped."; return 0; fi
  tar -czf "$dir/$out" -C "$SRC" "$rel" || rc=$?
  # GNU tar says 1 when a file changed while it was read (someone uploaded at
  # that moment). The archive is still complete for everything else.
  if [[ $rc == 1 ]] && tar --version 2>/dev/null | grep -q GNU; then warn "$rel changed while it was saved; the newest files may be missing."; rc=0; fi
  return "$rc"
}

save_env() { # folder -> prints encrypted | not-included | missing
  local dir=$1
  if [[ -z ${BACKUP_PASSPHRASE:-} ]]; then printf 'not-included'; return 0; fi
  if [[ ! -f $ENV_FILE ]]; then printf 'missing'; return 0; fi
  command -v openssl >/dev/null 2>&1 || { echo "openssl is needed to encrypt .env (BACKUP_PASSPHRASE is set)." >&2; return 1; }
  openssl enc "${ENC_ARGS[@]}" -salt -in "$ENV_FILE" -out "$dir/env.enc" -pass env:BACKUP_PASSPHRASE || return 1
  printf 'encrypted'
}

write_readme() { # folder
  cat > "$1/README.txt" <<'EOF'
Nullkode backup

database.dump          the database (pg_dump custom format)
uploads.tar.gz         files the apps keep privately (including the key that signs Android apps)
public-uploads.tar.gz  pictures and files uploaded to apps
assets-cloned.tar.gz   imported websites' files (weekly and one-off backups only)
env.enc                .env, encrypted with BACKUP_PASSPHRASE (only when that was set)
rowcounts.txt          rows in every table when the copy was made
SHA256SUMS             checksums: sha256sum -c SHA256SUMS
manifest.json          what's in this backup

To restore, see docs/deploy/RESTORE.md, or run from the Nullkode folder:
  bash scripts/restore.sh <this folder>            (check it first)
  bash scripts/restore.sh <this folder> --verify   (test it in a throwaway copy)

To open env.enc by hand (it asks for the passphrase):
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in env.enc -out .env

Keep backups private: they hold your customers' data.
EOF
}

# Runs as its own bash process (the "_steps" command), so that any failing
# step stops it: bash ignores `set -e` inside anything used as a condition.
backup_steps() { # kind name folder
  local kind=$1 name=$2 dir=$3 env_state files=() f total=0 size rows=0 tables=0 line pgver
  echo "Copying the database" > "$dir/.step"
  dump_database "$dir"
  echo "Saving uploaded files" > "$dir/.step"
  archive "$dir" uploads.tar.gz uploads
  archive "$dir" public-uploads.tar.gz public/uploads
  if [[ $kind != daily ]]; then
    echo "Saving imported website files" > "$dir/.step"
    archive "$dir" assets-cloned.tar.gz public/assets/cloned
  fi
  echo "Saving .env" > "$dir/.step"
  env_state=$(save_env "$dir")
  write_readme "$dir"
  echo "Writing checksums" > "$dir/.step"
  for f in database.dump uploads.tar.gz public-uploads.tar.gz assets-cloned.tar.gz env.enc rowcounts.txt; do
    if [[ -f $dir/$f ]]; then files+=("$f"); fi
  done
  (cd "$dir" && sha256sum "${files[@]}" > SHA256SUMS)
  while IFS= read -r line; do
    tables=$((tables + 1)); rows=$((rows + ${line##*|}))
  done < "$dir/rowcounts.txt"
  pgver=$(sql -c 'SHOW server_version' 2>/dev/null | head -n 1 || true)
  {
    printf '{\n'
    printf '  "format": 1,\n'
    printf '  "kind": "%s",\n' "$kind"
    printf '  "createdAt": "%s",\n' "$(iso_from_name "$name")"
    printf '  "finishedAt": "%s",\n' "$(date -u +%FT%TZ)"
    printf '  "appVersion": %s,\n' "$(json_string "$(app_version)")"
    printf '  "postgresVersion": %s,\n' "$(json_string "$pgver")"
    printf '  "env": "%s",\n' "$env_state"
    printf '  "tables": %s,\n' "$tables"
    printf '  "rows": %s,\n' "$rows"
    printf '  "files": [\n'
    local i=0 sum
    for f in "${files[@]}"; do
      size=$(stat -c %s "$dir/$f"); total=$((total + size)); i=$((i + 1))
      sum=$(sed -n "s/^\([0-9a-f]\{64\}\)  $f\$/\1/p" "$dir/SHA256SUMS")
      printf '    { "name": "%s", "bytes": %s, "sha256": "%s" }%s\n' "$f" "$size" "$sum" "$([[ $i -lt ${#files[@]} ]] && echo ,)"
    done
    printf '  ],\n'
    printf '  "bytes": %s,\n' "$total"
    printf '  "ok": true\n'
    printf '}\n'
  } > "$dir/manifest.json"
}

make_backup() { # daily|weekly|manual
  local kind=$1 name dir started_at error bytes seconds env_state last version rc=0
  local lockmode=wait
  if [[ $kind == manual ]]; then lockmode=nowait; fi
  if ! mkdir -p "$BACKUP_DIR" 2>/dev/null || [[ ! -w $BACKUP_DIR ]]; then
    log "Error: can't write to $BACKUP_DIR."
    record_status "{\"at\": \"$(date -u +%FT%TZ)\", \"ok\": false, \"kind\": \"$kind\", \"error\": $(json_string "Can't write to the backup folder."), \"lastSuccessAt\": null, \"lastSuccessBytes\": null}"
    return 1
  fi
  take_lock "$lockmode" || { log "Another backup is running. Try again when it has finished."; return 1; }
  # A failure here is reported by the first step below, like any other.
  wait_for_db || true
  name=$(date -u +%Y%m%dT%H%M%SZ)
  while [[ -e $BACKUP_DIR/$name || -e $BACKUP_DIR/$name.partial ]]; do sleep 1; name=$(date -u +%Y%m%dT%H%M%SZ); done
  dir="$BACKUP_DIR/$name.partial"
  mkdir -p "$dir"
  started_at=$(date +%s)
  log "Starting a $kind backup: $BACKUP_DIR/$name"
  bash "${BASH_SOURCE[0]}" _steps "$kind" "$name" "$dir" 2> "$dir/.errors" || rc=$?
  if [[ $rc == 0 ]] && mv "$dir" "$BACKUP_DIR/$name"; then
    dir="$BACKUP_DIR/$name"
    if [[ -s $dir/.errors ]]; then cat "$dir/.errors" >&2; fi
    rm -f "$dir/.step" "$dir/.errors"
    hand_over "$dir"
    release_lock
    bytes=$(manifest_value "$BACKUP_DIR/$name/manifest.json" bytes)
    env_state=$(manifest_value "$BACKUP_DIR/$name/manifest.json" env)
    seconds=$(( $(date +%s) - started_at ))
    version=$(app_version)
    record_status "{\"at\": \"$(date -u +%FT%TZ)\", \"ok\": true, \"kind\": \"$kind\", \"name\": \"$name\", \"bytes\": ${bytes:-0}, \"seconds\": $seconds, \"env\": \"$env_state\", \"version\": $(json_string "$version"), \"error\": null, \"lastSuccessAt\": \"$(date -u +%FT%TZ)\", \"lastSuccessBytes\": ${bytes:-0}}"
    log "Backup finished in ${seconds}s: $BACKUP_DIR/$name ($(( ${bytes:-0} / 1048576 )) MB)."
    if [[ $env_state == not-included ]]; then
      warn "This backup doesn't include .env, because BACKUP_PASSPHRASE is not set. Keep your own copy of .env somewhere safe: it holds the key that unlocks saved AI and payment settings."
    elif [[ $env_state == missing ]]; then
      warn "No .env was found at $ENV_FILE, so this backup doesn't include it."
    fi
    return 0
  fi
  error="$(cat "$dir/.step" 2>/dev/null || echo Backup) failed: $({ grep -v '^[[:space:]]*$' "$dir/.errors" 2>/dev/null || true; } | tail -n 3 | tr '\n' ' ')"
  error=${error% }
  cat "$dir/.errors" >&2 2>/dev/null || true
  rm -rf "$dir"
  release_lock
  last=$(newest_backup)
  record_status "{\"at\": \"$(date -u +%FT%TZ)\", \"ok\": false, \"kind\": \"$kind\", \"error\": $(json_string "$error"), \"lastSuccessAt\": $(if [[ -n $last ]]; then printf '"%s"' "$(iso_from_name "$last")"; else echo null; fi), \"lastSuccessBytes\": $(if [[ -n $last ]]; then manifest_value "$BACKUP_DIR/$last/manifest.json" bytes; else echo null; fi)}"
  log "Error: $error"
  return 1
}

# --- Keeping the right number of backups ---------------------------------------

prune() {
  local name kind newest daily=0 weekly=0 p
  [[ -d $BACKUP_DIR ]] || return 0
  newest=$(newest_backup)
  while IFS= read -r name; do
    kind=$(manifest_value "$BACKUP_DIR/$name/manifest.json" kind)
    case $kind in
      daily) daily=$((daily + 1)); ((daily > KEEP_DAILY)) || continue ;;
      weekly) weekly=$((weekly + 1)); ((weekly > KEEP_WEEKLY)) || continue ;;
      # One-off backups, and folders this script didn't make (for example
      # backups from older versions), are never deleted automatically.
      *) continue ;;
    esac
    [[ $name != "$newest" ]] || continue
    log "Removing old $kind backup $name"
    rm -rf "${BACKUP_DIR:?}/$name"
  done < <(backup_names)
  # Backups that were stopped part-way.
  for p in "$BACKUP_DIR"/*.partial; do
    [[ -d $p ]] || continue
    if [[ -n $(find "$p" -maxdepth 0 -mmin +1440 2>/dev/null) ]]; then log "Removing unfinished backup ${p##*/}"; rm -rf "$p"; fi
  done
}

# --- Scheduling -------------------------------------------------------------------

scheduled() {
  local kind=daily today last_weekly
  today=$(date +%F)
  last_weekly=$(newest_backup weekly)
  if [[ $(date +%u) == "$WEEKLY_DAY" || -z $last_weekly ]] \
    || (( $(date +%s) - $(epoch_from_name "$last_weekly") > 7 * 86400 )); then
    kind=weekly
  fi
  make_backup "$kind" || return 1
  printf '%s\n' "$today" > "$BACKUP_DIR/.last-scheduled"
  hand_over "$BACKUP_DIR/.last-scheduled"
  heartbeat
  prune
}

loop() {
  local time=${BACKUP_TIME:-03:30} target today now last fail_day='' fails=0 next_try=0
  trap 'log "Backup service stopping."; exit 0' TERM INT
  if [[ $(printf '%s' "$time" | tr 'A-Z' 'a-z') == off ]]; then
    log "Nightly backups are off (BACKUP_TIME=off). Run scripts/backup.sh to make one."
    while :; do sleep 86400 & wait $!; done
  fi
  if [[ ! $time =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]]; then
    warn "BACKUP_TIME should look like 03:30 (24-hour clock) or off, not \"$time\". Using 03:30."
    time=03:30
  fi
  target=${time/:/}
  mkdir -p "$BACKUP_DIR"
  log "Nightly backups at $time ($(date +%Z)) into $BACKUP_DIR: keeping $KEEP_DAILY daily and $KEEP_WEEKLY weekly backups; the weekly one also saves imported website files."
  [[ -n ${BACKUP_PASSPHRASE:-} ]] || warn "BACKUP_PASSPHRASE is not set, so backups won't include .env. Keep your own copy of .env somewhere safe."
  # Let the app finish starting before a catch-up backup.
  sleep "$(number_or_default "${BACKUP_START_DELAY:-60}" 60)" & wait $!
  while :; do
    today=$(date +%F); now=$(date +%H%M)
    last=$(cat "$BACKUP_DIR/.last-scheduled" 2>/dev/null || true)
    [[ $fail_day == "$today" ]] || { fail_day=$today; fails=0; }
    # Today's backup is due from BACKUP_TIME on. If the computer was off or
    # asleep then, it runs as soon as it's back.
    if [[ $last != "$today" ]] && (( 10#$now >= 10#$target )) && (( fails < 4 )) && (( $(date +%s) >= next_try )); then
      if scheduled; then fails=0
      else fails=$((fails + 1)); next_try=$(( $(date +%s) + $(number_or_default "${BACKUP_RETRY_SECONDS:-1800}" 1800) )); fi
    fi
    sleep 30 & wait $!
  done
}

# --- Restoring ----------------------------------------------------------------------

restore() { # backup [--apply]
  local target=${1:-} mode=${2:-} dir root tables cloned='' name f problems=0
  [[ -n $target ]] || die "Say which backup to restore, for example: restore 20260929T033000Z"
  if [[ $target == /* ]]; then dir=${target%/}; else dir="$BACKUP_DIR/${target%/}"; fi
  [[ -d $dir ]] || die "There is no backup at $dir."
  [[ -f $dir/database.dump ]] || die "$dir has no database.dump, so it isn't a complete backup."
  root=${dir%/*}; name=${dir##*/}
  log "Backup: $dir"
  if [[ -f $dir/manifest.json ]]; then
    log "Made $(manifest_value "$dir/manifest.json" createdAt) ($(manifest_value "$dir/manifest.json" kind) backup) by Nullkode $(manifest_value "$dir/manifest.json" appVersion): $(manifest_value "$dir/manifest.json" tables) tables, $(manifest_value "$dir/manifest.json" rows) rows."
  fi
  if [[ -f $dir/SHA256SUMS ]]; then
    (cd "$dir" && sha256sum -c SHA256SUMS >/dev/null 2>&1) || die "The backup's files don't match their checksums (SHA256SUMS): it is damaged or incomplete."
    log "Checksums match."
  else
    warn "This backup has no checksums (it was made by an older version), so it can't be checked before restoring."
  fi
  # Imported website files are only in weekly and one-off backups: take the
  # newest ones next to this backup.
  if [[ -f $dir/assets-cloned.tar.gz ]]; then cloned=$dir/assets-cloned.tar.gz
  elif [[ ! -f $dir/assets.tar.gz ]]; then
    while IFS= read -r f; do
      if [[ -f $root/$f/assets-cloned.tar.gz ]]; then cloned=$root/$f/assets-cloned.tar.gz; break; fi
    done < <(BACKUP_DIR=$root backup_names)
    if [[ -n $cloned ]]; then log "Imported website files come from ${cloned%/*}."
    else warn "No backup next to this one has imported website files (assets-cloned.tar.gz); imported websites will miss their pictures."; fi
  fi
  wait_for_db || die "Can't reach the database to restore into."
  tables=$(sql -c "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')") \
    || die "Can't reach the database to restore into."
  if [[ $tables != 0 ]]; then
    die "This installation's database already has $tables tables. A backup can only be restored into a new, empty installation, so nothing was changed. Follow docs/deploy/RESTORE.md: use a new folder, and restore before starting Nullkode there for the first time."
  fi
  if [[ $mode != --apply ]]; then
    log "The backup can be restored into this (empty) installation. Nothing was changed. Run again with --apply to restore it."
    return 0
  fi

  log "Restoring the database..."
  pg_restore --no-owner --no-privileges --exit-on-error --single-transaction -d "$PGDATABASE" "$dir/database.dump"
  log "Restoring files..."
  for f in uploads.tar.gz public-uploads.tar.gz assets.tar.gz; do
    [[ -f $dir/$f ]] && tar -xzf "$dir/$f" -C "$SRC"
  done
  [[ -n $cloned ]] && tar -xzf "$cloned" -C "$SRC"
  if [[ $(id -u) == 0 ]]; then
    for f in uploads public/uploads public/assets/cloned; do
      [[ -d $SRC/$f ]] && [[ $(file_owner "$SRC/$f") == 0:0 ]] && chown "$RESTORE_OWNER" "$SRC/$f" 2>/dev/null || true
    done
  fi
  if [[ -f $dir/rowcounts.txt ]]; then
    local expected actual line table count have
    expected=$(sort "$dir/rowcounts.txt")
    actual=$(printf '%s\n' "$COUNT_TABLES_SQL" | sql | sort)
    while IFS= read -r line; do
      [[ -n $line ]] || continue
      table=${line%|*}; count=${line##*|}
      have=$(printf '%s\n' "$actual" | grep -F -x -e "$table|$count" || true)
      if [[ -z $have ]]; then
        problems=$((problems + 1))
        warn "$table: $count rows in the backup, $(printf '%s\n' "$actual" | grep -F -e "$table|" | head -n 1 | sed 's/.*|//' || echo none) after restoring."
      fi
    done <<< "$expected"
    ((problems == 0)) || die "$problems tables don't match the backup."
    log "Every table matches the backup: $(printf '%s\n' "$expected" | grep -c '|') tables."
  fi
  log "Restored $name."
}

command=${1:-loop}
shift || true
case $command in
  loop) loop ;;
  scheduled) scheduled ;;
  once) make_backup manual; prune ;;
  prune) prune ;;
  restore) restore "$@" ;;
  _steps) backup_steps "$@" ;;
  *) die "Unknown command \"$command\". Use loop, scheduled, once, prune or restore." ;;
esac
