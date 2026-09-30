# Deploy recipes

Production deployment templates for common stacks. Pick the closest
match and adapt.

| File | When to use |
|---|---|
| [`systemd/nullkode.service`](./systemd/nullkode.service) | bare-metal Linux with systemd (logs to the journal; checks the database before starting) |
| [`systemd/nullkode-backup.timer`](./systemd/nullkode-backup.timer), [`.service`](./systemd/nullkode-backup.service), [`.sh`](./systemd/nullkode-backup.sh) | nightly backups without Docker |
| [`logrotate/nullkode`](./logrotate/nullkode) | only if the systemd service writes log files instead of the journal |
| [`nginx.conf`](./nginx.conf) | nginx in front of Nullkode (TLS, custom domains, SSE) |
| [`apache.conf`](./apache.conf) | Apache 2.4 in front (mod_proxy + mod_proxy_http) |
| [`plesk.md`](./plesk.md) | Plesk-managed VPS (Apache + nginx layered, additional vhost directives), and **how to update safely** ([Updating](./plesk.md#updating)) |
| [`RESTORE.md`](./RESTORE.md) | backups, testing a backup, and restoring |
| [`../../Caddyfile`](../../Caddyfile) | Docker install in HTTPS mode: automatic certificates for every address (the installer turns it on) |

All of these are starting points — review and edit for your domain, TLS
certs, and load-balancer setup before shipping. The first-time install with
Docker is described in [docs/install.md](../install.md).

## Backups, logs and updates

- **Docker:** the `backup` service in `docker-compose.yml` makes a backup every
  night while the app runs (settings: `BACKUP_*` in `.env`), and every service
  keeps at most five 10 MB log files. `bash scripts/backup.sh` makes one now.
- **systemd:** install `systemd/nullkode-backup.timer` with its service. The
  app's own service logs to the journal (`journalctl -u nullkode`); if you
  switch it to log files, install `logrotate/nullkode` too.
- **Updating without Docker:** follow [plesk.md → Updating](./plesk.md#updating)
  on any systemd server: back up, update the database, build next to the
  running version, then restart. Never run `pnpm install` or
  `prisma generate` in the live folder without updating the database and
  restarting right after.
- Restoring and testing backups: [RESTORE.md](./RESTORE.md).

## HTTPS and domains

### Docker (guided install)

When the operator answers `y` to "Do you have a domain name for this server?" (or runs `NULLKODE_DOMAIN=studio.example.com bash install.sh`), the installer writes these to `.env` and starts the `caddy` service:

| Setting | Meaning |
|---|---|
| `PUBLIC_BASE_URL=https://studio.example.com` | the studio's address; the app then sets `Secure` cookies |
| `COMPOSE_PROFILES=https` | starts `caddy` (profile `https` in `docker-compose.yml`) |
| `NK_AUTO_TLS=1` | the home page says HTTPS is automatic |
| `NK_TLS_EMAIL` | optional contact address for Let's Encrypt |
| `APPS_DOMAIN` | optional: every published app at `https://<label>.<APPS_DOMAIN>` |
| `NK_TLS_ASK_SECRET` | random, made once; shared by Caddy and the app |

Answering `n` (or `NULLKODE_DOMAIN=none`) empties `COMPOSE_PROFILES`, removes the `caddy` container and serves plain http on `APP_PORT`. Certificates stay in the `caddy_data` volume for later. Each run of the installer recreates `caddy`, so an updated `Caddyfile` takes effect; after editing it by hand, run `docker compose up -d --force-recreate caddy`.

`caddy` (official `caddy:2.11.4-alpine` image) listens on ports 80 and 443 (TCP, and UDP 443 for HTTP/3) and passes every request to `app:3001` using the [`Caddyfile`](../../Caddyfile) in the project root:

- **On-demand certificates.** The first TLS handshake for a name that has no certificate makes Caddy call `GET http://app:3001/api/internal/tls-allow?domain=<name>&token=<NK_TLS_ASK_SECRET>`. The app answers 200 only for the host of `PUBLIC_BASE_URL`, a `Domain` row with status `ACTIVE` (verified custom domain), a reseller domain with `domainVerifiedAt` set and status `ACTIVE`, and `<label>.<APPS_DOMAIN>` of a published app. Everything else gets 404, including requests with a missing or wrong token, and Caddy refuses the handshake without contacting the certificate authority. Caddy asks again before it renews a certificate, so removed domains and unpublished apps stop renewing. Caddy returns 404 for `/api/internal/*` from outside.
- **Headers.** The Host header is kept. `X-Forwarded-Proto` is `https`. `X-Forwarded-For` and `X-Real-IP` are set to the visitor's address, replacing anything the visitor sent (the app's sign-up and rate limits trust `X-Real-IP`).
- **Long requests and streaming.** No read, write or response timeout (Caddy's defaults) and `flush_interval -1`, so AI builds that run for many minutes and live progress streams (SSE) pass through unbuffered. Request bodies up to 100 MB; the app's largest upload is 20 MB per file.
- **Redirects.** Every `http://` request gets a 308 redirect to the same `https://` address. Caddy answers ACME HTTP-01 challenges on port 80 first.
- **Certificate authorities.** Let's Encrypt; when `NK_TLS_EMAIL` is set, ZeroSSL as a fallback.

DNS records:

| Record | Points to | When |
|---|---|---|
| `A studio.example.com` | the server's IPv4 address | always |
| `A *.apps.example.com` | the server's IPv4 address | with `APPS_DOMAIN=apps.example.com` |
| `AAAA` for the same names | the server's IPv6 address | optional |
| `CNAME www.customer.com` → `studio.example.com`, `TXT _verify.www.customer.com` | | each customer domain (shown in the app's Domains screen) |

Notes:

- **Why a separate apps domain.** With `APPS_DOMAIN`, each app is its own web origin, so an app's pages can't act on the studio, where users are signed in, or on other apps. A separate registrable domain (`myapps.site`) is better than a subdomain of the studio's domain (`apps.example.com`): browsers treat names under one registrable domain as the same site (parent-domain cookies, `SameSite`), and a separate domain keeps apps outside it. It also counts against a separate Let's Encrypt limit.
- **Rate limits.** Every studio, app and custom-domain address is its own certificate. Let's Encrypt allows about 50 new certificates per registered domain per week; renewals don't count (see [letsencrypt.org/docs/rate-limits](https://letsencrypt.org/docs/rate-limits/)). If more apps than that are published each week, use a separate apps domain and set `NK_TLS_EMAIL` so ZeroSSL can take over. A wildcard certificate for `*.APPS_DOMAIN` needs a DNS-provider plugin for Caddy and isn't included.
- **Keep `caddy_data`.** It holds the certificates and the ACME account. Without it, every certificate is requested again, which can reach those limits.
- **Router port forwarding.** When a router forwards the public ports 80 and 443 to other ports on this computer, set `HTTP_PORT` and `HTTPS_PORT` in `.env`.
- **Trying it out.** To test without real certificates, add `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` to the global options at the top of the `Caddyfile` (browsers will warn), and remove it afterwards.
- **Logs.** `docker compose logs caddy`. Certificates are issued on the first visit to each address, not during setup.

### Your own reverse proxy

On bare metal, or when another web server already owns ports 80 and 443, answer `n`, set `PUBLIC_BASE_URL=https://YOUR-DOMAIN` and put your proxy in front of `127.0.0.1:3001`. It must:

- keep the Host header and send `X-Forwarded-Proto: https`;
- replace `X-Real-IP` with the connecting client's address, never pass on one the client sent;
- not buffer responses, and allow requests that run for 15 minutes or more;
- accept request bodies of at least 32 MB.

For automatic certificates for customers' domains and app addresses without Docker, run Caddy on the host with the root `Caddyfile`: change both `app:3001` to `127.0.0.1:3001` and give Caddy and the app the same `NK_TLS_ASK_SECRET` (`openssl rand -hex 32`). With nginx or Apache, each custom domain needs its own certificate, and `APPS_DOMAIN` needs a wildcard certificate (DNS-01 challenge).

## Scheduled workflows

The app checks for due scheduled workflows every minute by itself, so bare-metal installations need nothing extra. If you'd rather drive it from outside (for example a cron job, or with several app processes), set `NK_EXTERNAL_SCHEDULER=1` and call `GET /api/cron` once per minute with an `Authorization: Bearer` header containing `CRON_SECRET`. The guided Compose setup does exactly that: its `scheduler` service calls `/api/cron`, and `docker-compose.yml` sets `NK_EXTERNAL_SCHEDULER=1` for the app. Do not log or publish the secret.

## Native Android compilation

Downloading the native source project (Mobile App → "Advanced: download source project") never needs build tools. Building an installable APK on the server (Mobile App → **Build APK**) needs JDK 17 and parts of Google's Android SDK. Installing them means accepting Google's [Android SDK License](https://developer.android.com/studio/terms). They run only on x86-64 (Intel/AMD) hosts: Google does not publish Linux ARM builds of the Android build tools.

### Docker (guided install)

The installer asks, then saves the answer in `.env` as `NULLKODE_ANDROID=1` or `0`. For scripted installs, set it first: `NULLKODE_ANDROID=1 bash install.sh`, or `$env:NULLKODE_ANDROID='1'` before `Start-Nullkode.bat` on Windows. Compose passes the value to the image build as a build argument. After you edit `.env` yourself, run `docker compose up -d --build` to apply the change.

With `NULLKODE_ANDROID=1` the image adds:

- JDK 17 (Debian `openjdk-17-jdk-headless`);
- `platforms;android-36`, `build-tools;36.0.0` and `platform-tools` in `/opt/android-sdk`, installed with Android cmdline-tools 12.0 (SHA-256 pinned). Only the Android SDK License is accepted, and the build log says so;
- the Gradle 8.11.1 distribution, the Android Gradle plugin 8.9.3 and every other dependency of the template, downloaded by building the template once during the image build (`GRADLE_USER_HOME=/home/node/.gradle`). APK builds then download nothing and work offline.

Measured on this release: the Android option adds 1.05 GB to the app image (3.04 GB without it, 4.09 GB with it). Each APK build takes about 20 seconds, the first one included, with or without internet access. Builds run one at a time and stop after 20 minutes.

APKs are signed with a debug key that the first build creates in `ANDROID_USER_HOME=/app/uploads/.android`. It is in the uploads volume, so it survives image updates and `scripts/backup.sh` includes it. Keep it: Android only installs an update over an app signed with the same key.

To check a running install: `docker compose exec app java -version` and `docker compose exec app ls /opt/android-sdk/platforms /opt/android-sdk/build-tools`.

### Bare metal (systemd)

`src/lib/apk-build.ts` finds the tools through these variables. The defaults suit a server where the tools were installed by hand.

| Variable | Default | Purpose |
|---|---|---|
| `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) | `/opt/android-sdk` | SDK with `platforms;android-36` and `build-tools;36.0.0` |
| `JAVA_HOME` | the JDK that provides `javac` on `PATH` | JDK 17 used by Gradle |
| `GRADLE_USER_HOME` | `~/.gradle` | Gradle distribution and dependency cache |
| `ANDROID_USER_HOME` | `~/.android` | holds `debug.keystore`, the key that signs every APK; keep it stable |
| `NK_APK_WORK_DIR` | `<tmp>/nk-apk` | scratch space for each build |

Install the tools as root (Debian/Ubuntu shown):

```sh
apt-get install -y openjdk-17-jdk-headless unzip curl
curl -fLo /tmp/clt.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
echo "2d2d50857e4eb553af5a6dc3ad507a17adf43d115264b1afc116f95c92e5e258  /tmp/clt.zip" | sha256sum -c -
mkdir -p /opt/android-sdk/cmdline-tools && unzip -q /tmp/clt.zip -d /opt/android-sdk/cmdline-tools
mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest
# Shows Google's Android SDK License and asks you to accept it.
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"
```

The service user needs read access to the SDK. It needs write access to `uploads/`, `GRADLE_USER_HOME`, `ANDROID_USER_HOME` and `NK_APK_WORK_DIR`. The first build downloads Gradle and the build dependencies (a few hundred MB). To download them in advance, run this once as the service user: copy `native-templates/android-webview` to a temporary folder, write `sdk.dir=/opt/android-sdk` to its `local.properties`, then run `sh gradlew assembleDebug --no-daemon` there. **Build APK** becomes available when the SDK platform, build-tools, a JDK and the template are all found.
