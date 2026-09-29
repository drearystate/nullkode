# Deploying Nullkode on Plesk

Plesk uses a two-tier proxy chain: **nginx (port 443)** → **Apache (port
7081)** → **your app**. You need to configure both for the Designer's
long-running requests to survive.

## 1. Install the app

In Plesk, add the domain (e.g. `nullkode.example.com`). Then SSH in:

<!-- TODO: replace YOUR_ORG once the GitHub organisation is chosen. -->

```bash
cd /var/www/vhosts/nullkode.example.com/httpdocs
git clone https://github.com/drearystate/nullkode.git .
pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env with DATABASE_URL, AUTH_SECRET, PUBLIC_BASE_URL, etc.
pnpm db:push
pnpm build
```

## 2. systemd service

Use the template at [`docs/deploy/systemd/nullkode.service`](./systemd/nullkode.service).
Adjust:

```
WorkingDirectory=/var/www/vhosts/nullkode.example.com/httpdocs
EnvironmentFile=/var/www/vhosts/nullkode.example.com/httpdocs/.env
User=root  # or a dedicated user; if you want the Designer's command-line
           # agent to run as a separate user, root + a runner user (section 5)
```

Before each start it checks that the database has every column this version
needs (`scripts/check-schema.mjs`) and refuses to start with a plain message
if not. Its log goes to the systemd journal: `journalctl -u nullkode -f`.

Enable and start:

```bash
sudo cp docs/deploy/systemd/nullkode.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nullkode
```

## 3. Plesk Apache vhost.conf

Plesk lets you add custom directives under **Domain → Apache &
nginx Settings → Additional Apache directives**. Paste:

```apache
<IfModule mod_proxy.c>
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyTimeout 600

    ProxyPass /.well-known/acme-challenge/ !
    ProxyPass /plesk-stat !
    ProxyPass /webstat !

    ProxyPass        / http://127.0.0.1:3001/
    ProxyPassReverse / http://127.0.0.1:3001/
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Host  "%{HTTP_HOST}s"
</IfModule>
```

Plesk's nginx sits in front of Apache and sets `X-Real-IP` to the visitor's
real address; Apache passes it on, so don't overwrite it here (Apache would
put nginx's own address in it). If your Plesk server has nginx turned off,
add `RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"` inside the block
instead — the app trusts this header for sign-up protection and rate limits.

## 4. Plesk nginx custom directives

Under **Additional nginx directives**, paste:

```nginx
# Long-running agent + SSE.
proxy_read_timeout 900;
proxy_send_timeout 900;
proxy_connect_timeout 60;
proxy_buffering off;

# Block dotfile access (good hygiene).
location ~ /\.(env|git|ht|aws|ssh) {
    deny all;
    return 404;
}
```

Apply settings in Plesk to write them out.

## 5. Optional: command-line AI provider

Only if you set the AI provider to the command-line tool
(`AI_PROVIDER=claude-cli`, or **Admin → Settings → AI**) instead of an
API. Its subprocess defaults to running as `claude-runner` (uid 983). Create
the user and sign the tool in:

```bash
sudo useradd -m -u 983 -s /bin/bash claude-runner
sudo -u claude-runner -- claude    # interactive login
```

If you don't want a separate user, set `NK_CLAUDE_RUNNER_DISABLE=1` in
`.env`. The subprocess will then run as whoever owns the Next process
(root, in a typical Plesk setup — fine if you trust your inputs).

## 6. Nightly backups

Install the backup timer from [`docs/deploy/systemd`](./systemd): it copies
the database while the app keeps running, plus `uploads/`, `public/uploads/`
and, weekly, `public/assets/cloned/`, keeps 7 daily and 4 weekly backups, and
records the result for the admin pages. Adjust the paths and user in
`nullkode-backup.service` first (the comments at its top show how to install
it), and set `BACKUP_PASSPHRASE` in `.env` so backups include an encrypted
copy of `.env`. It needs the PostgreSQL client tools (`pg_dump`, `psql`) of
the database's major version. Restoring: [RESTORE.md](RESTORE.md).

## 7. Verify

```bash
# Service running?
systemctl status nullkode

# Behind proxy? The health check answers {"ok":true,...} with status 200.
curl -I https://nullkode.example.com/
curl -fsS https://nullkode.example.com/api/health

# Designer's command-line agent healthy? (admin session required)
curl https://nullkode.example.com/api/designer/health
```

## Updating

The running server keeps the database client it started with in memory. The
files on disk only matter at the next start, and that can be any restart:
yours, a crash, or a reboot. So update in this order, and don't stop half
way:

1. **Back up.** `sudo systemctl start nullkode-backup` (with the backup timer
   installed), and check `journalctl -u nullkode-backup -n 20` says it
   finished.
2. **Get the new version.** `git pull`, or extract the new release over the
   folder. Keep `.env`, `uploads/`, `public/uploads/` and
   `public/assets/cloned/`.
3. **Install its packages.** `pnpm install --frozen-lockfile`. This also
   regenerates the database client (`prisma generate`), which from now on
   expects the new version's database. Don't restart until step 5.
4. **See what the database update will change.** Review the SQL before
   running it:
   `pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
   Expect only additions (new tables, columns, indexes).
5. **Update the database.** `pnpm db:push`. Never add
   `--accept-data-loss`: if Prisma asks for it, stop and read the release
   notes first.
6. **Build next to the running version.** The site keeps serving the old
   build meanwhile:
   `NK_BUILD_DIR=.next-new pnpm build`
7. **Switch and restart,** in one go:
   `rm -rf .next-prev && mv .next .next-prev && mv .next-new .next && sudo systemctl restart nullkode`
8. **Check.** `curl -fsS https://nullkode.example.com/api/health` must answer
   with status 200, and `journalctl -u nullkode -n 50` must show no errors.
   Open the dashboard and one published app. If something is wrong, put the
   previous build back and restart
   (`rm -rf .next-failed && mv .next .next-failed && mv .next-prev .next && sudo systemctl restart nullkode`);
   the added database columns don't bother the older version.

**Never run `pnpm install`, `pnpm add` or `prisma generate` in the live folder
unless you update the database (steps 4 and 5) and restart right after.**
Otherwise the next restart starts a database client that expects columns the
database doesn't have, and every page fails. That is what took every app on
the hosted service down for seven hours on 29 September 2026. The service's
start check (`scripts/check-schema.mjs`) now refuses to start in that
situation, with a message saying what's missing, but the site still stays
down until the database is updated.
