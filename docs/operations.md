# Running NullKode: the operator's runbook

This page covers the day-to-day running of a NullKode server: how to tell it
is healthy, what to do when the database needs an update, how scheduled flows
run, what the nightly clean-up removes, and how to send useful details with a
bug report.

Most of it is also on one screen: **Admin > System**. It shows each check as
a coloured card with a plain explanation, the nightly clean-up settings, the
recent warnings and errors, and buttons to copy or download the details.

## 1. Is it healthy?

### `/api/health` (for Docker and uptime monitors)

`GET /api/health` is cheap enough to call every few seconds. It checks that
the database answers and that its structure matches this version of the app.

| Answer | Meaning |
| --- | --- |
| `200 {"ok":true,"version":"…"}` | All good. |
| `503 {"ok":false,"reason":"database unreachable"}` | The app can't reach PostgreSQL. |
| `503 {"ok":false,"reason":"database needs update"}` | The database is missing columns this version needs (see section 2). |

The public answer never says which columns are missing. The server log and
the admin page do.

### `/api/health?detail=1` (for your own monitoring)

Set `HEALTH_TOKEN` in `.env` to a long random value and restart. Then:

```bash
curl -H "Authorization: Bearer $HEALTH_TOKEN" https://your-studio.example.com/api/health?detail=1
```

It returns every check from Admin > System (id, status `green`/`amber`/`red`
and a plain message, without file paths or addresses), and answers 503 when
any check is red. Without the token it answers 401.

### Uptime Kuma or Healthchecks.io

- **Uptime Kuma:** add an *HTTP(s)* monitor for `https://your-studio.example.com/api/health`
  with "accepted status codes" 200. For the detailed check, use an *HTTP(s) - Json Query*
  monitor on `/api/health?detail=1`, add the header
  `{"Authorization": "Bearer <HEALTH_TOKEN>"}`, and check that `ok` is `true`.
- **Healthchecks.io** (or any "dead man's switch"): create a check with a
  5-minute period and have a cron job on another machine call
  `curl -fsS https://your-studio.example.com/api/health && curl -fsS https://hc-ping.com/<your-uuid>`.
  If the server goes down, the pings stop and you get an email.

### What the System cards mean

| Card | Green | Amber | Red |
| --- | --- | --- | --- |
| Database structure | matches this version | couldn't be checked | columns missing (section 2) |
| Database | connected, with its size | | can't connect |
| Disk space | 20% or more free where uploads live | under 20% | under 10% |
| Scheduler | checked in the last 5 minutes | no check for over 5 minutes, or flows paused after failing | |
| Clean-up | ran recently | report-only mode, off, failed steps or not run for 2 days | |
| Backups | recent, or not set up | last backup over 48 hours ago | last backup failed |
| Email | set up and sending | not set up, or some sends failed | every send failed |
| AI connection | ready | not set up | |
| Work in progress | app builds, designs and phone-app builds running now (restart when it's quiet) | | |
| Memory, Running for, Version | information | nearly out of memory | almost none left |

Free space is measured on the folder in `NK_DISK_CHECK_PATH`, or the private
uploads folder (`NK_NATIVE_DIR`, default `uploads/` in the app folder).

## 2. When the database needs an update

The app's code and its database structure must match. If new code runs
against an old database (for example after `pnpm install` or
`prisma generate` in the live folder without a database update), every page
that touches a missing column fails. This is what happened on 29 Sep 2026.

You find out in four places:

1. **At startup**, the log shows a block starting with
   `[schema] THE DATABASE NEEDS AN UPDATE` and lists the exact columns.
2. **`/api/health`** answers 503 "database needs update".
3. **The admin home** shows a red banner: "The database is missing N columns;
   the site will fail until it is updated", with the names.
4. **`scripts/check-schema.mjs`** refuses to start the server (below).

To fix it:

1. Back up the database (`pg_dump -Fc`, or `scripts/backup.sh` on Docker).
2. In the app folder run `pnpm exec prisma db push` and read what it plans to
   change. It only adds things; if it asks to accept data loss, stop and ask
   for help rather than accepting.
3. Restart the app. The banner disappears and `/api/health` turns 200 within
   a minute.

### `scripts/check-schema.mjs`

A pre-start check (plain Node, no build needed) that compares the columns the
installed database client expects with the real database.

| `NK_SCHEMA_MODE` | On drift |
| --- | --- |
| `refuse` (default) | prints the missing columns and exits 1, so the server does not start |
| `apply` | runs `prisma db push --skip-generate` (never with `--accept-data-loss`), checks again, and exits 1 only if something is still missing |
| `warn` | prints the problem and exits 0 |

If the database can't be reached at all, it prints a warning and exits 0, so a
slow database start doesn't block the app (which retries by itself).

- **Docker:** `scripts/container-start.sh` runs it in `apply` mode on every
  start, as the start script always did. Put `NK_SCHEMA_MODE=refuse` in `.env`
  if you'd rather apply changes by hand.
- **systemd (bare metal, Plesk):** the unit in `docs/deploy/systemd/` runs it
  as `ExecStartPre`. The default `refuse` means a forgotten update stops the
  start with a clear message in `journalctl -u nullkode` instead of a broken site.

When updating a bare-metal install, follow the "Updating" steps in
[`docs/deploy/plesk.md`](deploy/plesk.md): back up, update the database,
build in a separate `NK_BUILD_DIR`, restart, check `/api/health`.

## 3. Scheduled flows

Flows can run on a schedule ("every 15 minutes", "Monday to Friday at 09:00"
in a chosen time zone). Owners set this in the flow editor under **When this
runs**. The schedule is published with the app, like the flow's steps:
a new or changed schedule starts when the app is published, and turning a
schedule off takes effect straight away.

### How it runs

The app runs its own scheduler: once a minute, inside the app process.

- Each due run is **claimed in the database** in one atomic step, so however
  many app processes or outside timers tick at once, a run happens once.
- Before running, it checks the owner isn't suspended (or a client of a
  suspended reseller), the owner's plan includes scheduled flows, the app is
  published and the flow is scheduled in the published version. If not, it
  looks again in 15 minutes.
- Up to 4 flows run at a time, each for at most 120 seconds.
- A failed run waits longer each time (1, 2, 4, 8 … minutes). After
  **10 failures in a row** the flow is paused; the owner sees "Paused after 10
  failed runs in a row" and a **Resume** button.
- Flows with an AI step can't run more often than every 15 minutes.
- Times follow the chosen time zone through daylight-saving changes: a time
  the clock skips runs an hour later that day, a time it shows twice runs once.
- Schedules saved before this version (a number of minutes) keep working and
  start one interval after the update, not all at once.

The System page shows when the scheduler last checked and how many flows are
scheduled or paused. The last check is also stored in the setting
`scheduler.lastTick`.

### Using an outside timer instead

Some setups prefer one timer outside the app (for example several app copies
behind a load balancer). To switch:

1. Set `NK_EXTERNAL_SCHEDULER=1` in the app's environment and restart it. The
   app then stops ticking by itself.
2. Call `/api/cron` every minute with the secret in the header:
   ```bash
   * * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-studio.example.com/api/cron > /dev/null
   ```
   or run `scripts/scheduler.mjs` (`CRON_SECRET=… NK_CRON_URL=http://127.0.0.1:3001/api/cron node scripts/scheduler.mjs`).

The secret is only accepted in the `Authorization` header. `?secret=` in the
URL is refused (401), because URLs end up in proxy logs.

Running both the built-in scheduler and an outside timer is safe (nothing runs
twice); it just does the checking twice. On Docker, the `scheduler` service in
`docker-compose.yml` is therefore optional: remove it, or keep it and set
`NK_EXTERNAL_SCHEDULER=1` for the `app` service.

To switch back, remove `NK_EXTERNAL_SCHEDULER` and restart.

## 4. Nightly clean-up

Without it, run logs, expired sign-ins, old published versions and deleted
apps' files grow forever. It runs once a day at or after
`NK_MAINTENANCE_HOUR` (server time, default `3`, i.e. 03:00; Docker
containers use UTC unless `TZ` is set), from the same once-a-minute tick. A
lease in the settings table makes sure only one process does it at a time,
and deletes happen in batches of 5000 so nothing is locked for long.

### What it keeps

| Records | Kept |
| --- | --- |
| Flow run logs | 30 days (90 days for failed runs), at most 1000 per flow, and always each flow's latest run |
| Sign-in sessions | until they expire |
| Invitation and password links | until used or expired |
| AI usage records | 13 months (allowances only count the current month) |
| Published versions | each app's newest 20, plus the live one and the one before it |
| Deleted apps' files (`<uploads>/.trash`) | 7 days |
| Deleted apps' data (`trash_proj_…` database schemas) | 7 days |

Files people uploaded (`public/uploads`) are never removed: pages, published
versions and app data may still use them.

Once, the first time it removes anything, it also blanks the stored input and
output of old run logs that mention a password, hash, secret or token (older
versions stored them in plain text). The setting `upgrades.flowrun-scrub-1`
records that this happened.

### Turning it on

Nothing is deleted until an operator says so. The mode is set on
**Admin > System > Nightly clean-up** (or with `NK_MAINTENANCE` in `.env`;
the admin setting wins):

- **Report only** (default): each night it counts what it would remove and
  shows it on the System page. Nothing is deleted.
- **Remove old records** (`apply`): each night it deletes what the rules allow.
- **Off**: nothing is checked or removed.

Take a backup before turning it on the first time: the first run can remove a
lot, and deleted records can't be brought back.

### By hand

```bash
pnpm exec tsx scripts/maintenance.ts            # report: what would be removed
pnpm exec tsx scripts/maintenance.ts --apply    # remove it now
```

It uses `DATABASE_URL` (or `.env` in the current folder) and the same lease
as the nightly run. "Check now" / "Run clean-up now" on the System page does
the same in the current mode. The last result is stored in the setting
`maintenance.last`.

## 5. Diagnostics and bug reports

Admin > System keeps the last 500 warnings and errors the server printed since
it started (bot noise such as "Failed to find Server Action" is left out) and
shows the latest 50. Before anything is kept or shown, it hides email
addresses, `Bearer` and `sk-` keys, payment keys, `postgres://` addresses,
database ids and the value of every environment setting longer than 8
characters.

- **Copy details** and **Download .txt** give you one text with the version,
  install type, architecture, Node and PostgreSQL versions, HTTPS mode,
  whether `APPS_DOMAIN` is set, the *names* (never values) of the settings in
  `.env`, every check and the recent errors.
- **Open a bug report** opens a new issue on the project's tracker with only
  the version, install type and architecture filled in. Paste the details
  yourself after reading them.
- The same bundle is at `GET /api/admin/diagnostics` (operators only;
  `?format=txt` for the text). Everyone else gets 404, as for the page.

## 6. Settings reference

| Setting | Default | What it does |
| --- | --- | --- |
| `HEALTH_TOKEN` | unset | Enables `/api/health?detail=1` with `Authorization: Bearer <token>`. |
| `CRON_SECRET` | set by the installer | Secret for `/api/cron` (header only). |
| `NK_EXTERNAL_SCHEDULER` | unset | `1` = the app doesn't tick by itself; something must call `/api/cron` every minute. |
| `NK_MAINTENANCE` | `report` | Nightly clean-up mode when not set on the System page: `report`, `apply` or `off`. |
| `NK_MAINTENANCE_HOUR` | `3` | Hour (server time, 0-23) at or after which the nightly clean-up runs. |
| `NK_SCHEMA_MODE` | `refuse` (Docker: `apply`) | What `scripts/check-schema.mjs` does on drift: `refuse`, `apply` or `warn`. |
| `NK_DISK_CHECK_PATH` | private uploads folder | Where free disk space is measured. |
| `PORT` | `3001` | Port the Docker start script listens on (for hosting platforms that assign one). |
