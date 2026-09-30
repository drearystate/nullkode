# Install and run Nullkode

Nullkode is a complete, self-hosted app builder. Each installation is independent: your brand, users, database, AI connection, and Stripe account. There is no Nullkode license key or paid server required.

## First installation on your computer

1. Install **Docker Desktop** from https://www.docker.com/products/docker-desktop/ and open it. On Linux, Docker Engine with the Compose plugin also works.
2. Download the release ZIP and **extract it into a folder**. Keep the whole folder together.
3. Start the installer:
   - **Windows:** double-click `Start-Nullkode.bat`.
   - **macOS:** open Terminal in that folder and run `bash install.sh`. `Start-Nullkode.command` is also included for systems that allow opening downloaded scripts.
   - **Linux:** open a terminal in that folder and run `bash install.sh`.
4. The installer asks a few questions. On your own computer, press Enter for each one: no domain name, the address `http://localhost:3001`, and no Android apps. (On a server with a domain name, see [Put it on a public domain](#put-it-on-a-public-domain-automatic-https). For Android apps, see [Build Android apps](#build-android-apps-optional).) The first build downloads dependencies and may take several minutes. Keep the installer open.
5. Open **http://localhost:3001/install**. Copy the private setup code printed by the installer, create your owner account, and follow the three setup steps.

You can skip AI and start with templates, website import, or the visual editor. All six ways to start an app are included: describe it to the AI, the AI Designer, templates, copying a website, a blank app, and importing an app from a backup. Your browser can be closed without stopping the server. Restart it later by running the installer again; existing settings and data are preserved.

The source package needs an internet connection for its first build. It includes all application source, but downloads standard dependencies and container images. Local AI models are separate downloads and need hardware sufficient for the model you choose.

## Connect affordable AI

In **Administration → Settings**, choose OpenAI / compatible API.

- **OpenAI:** leave API base URL empty, enter your own API key, and use `gpt-6-luna` for both models. API usage is billed by the provider, separately from this free software.
- **Qwen3.8-27B:** connect a server running `Qwen/Qwen3.8-27B` (or the model alias configured by its operator). Model download and hardware setup happen on that server; the app does not download the weights.
- **Local or another hosted provider:** enter its OpenAI-compatible API URL and its exact model ID. For a server running on the same computer as Docker, use `host.docker.internal` instead of `localhost`, for example `http://host.docker.internal:11434/v1`. A local server may not need a key.
- Start with **JSON mode**, or **Prompt only** if the server does not support JSON mode. The model must reliably produce valid JSON and HTML. A text-only model cannot interpret image attachments.
- Save, then test the connection. Build a small sample app before inviting customers. Endpoint compatibility does not guarantee the quality of every model or quantization.

The app builds in smaller steps, detects how much text the model can read at once and uses shorter instructions for small models, and turns off slow "thinking" on local servers unless you switch it on. It never changes to a more expensive provider on its own. A command-line AI agent can optionally power the Designer; the normal installation does not need it. Image generation requires a separate image-capable service; a text model does not provide image generation.

Running AI on your own computer or server: see [docs/local-ai.md](local-ai.md). Selling this platform to agencies under their own brand: see [docs/resellers.md](resellers.md).

## Send email

Nullkode sends invitations, password links, and alerts to app owners, and apps can send their own emails (booking confirmations, sign-up codes). Set it up in **Administration → Settings → Email** with any email provider's SMTP details, then press **Send a test email to me**. Use port 587; many servers block port 25. Until email is set up, invitation and password links are shown on screen instead. Examples for common providers: [docs/email.md](email.md).

## Run your own business

Open **Administration → Settings → Your business & payments**. Use your own Stripe secret key and webhook signing secret. Create fixed recurring prices in Stripe, then paste their `price_…` IDs and choose the display names. Prices and currencies are read from Stripe. Leave IDs empty to run a free service.

Create a Stripe webhook for `https://YOUR-DOMAIN/api/stripe/webhook` with these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Enable the Stripe customer portal for plan changes and cancellations. Test with Stripe test mode before accepting live payments. Set each plan's limits in the same settings page.

Customers sign up on your installation. Their subscriptions pay your Stripe account. You decide your prices; Nullkode does not take a platform fee. Hosting, payment processing, domains, email, and hosted AI can have their own costs.

## Put it on a public domain (automatic HTTPS)

Without a domain name, Nullkode only answers on the computer it runs on. On a server that the internet can reach, the installer sets up secure HTTPS for you. You never buy, download or copy a certificate: free certificates from Let's Encrypt are made the first time each address is opened, and they renew by themselves.

You need:

- a server with a public IP address, with ports **80** and **443** open in its firewall and not used by another web server;
- a domain name, for example `example.com`. Pick a name for your studio under it, like `studio.example.com`.

Steps:

1. Run the installer on the server (`bash install.sh`) and answer `y` to **Do you have a domain name for this server?**
2. Type your studio's name, for example `studio.example.com`.
3. Optional: type an email address. Let's Encrypt only writes to it if a certificate needs your attention.
4. Optional: answer `y` to **Give each app its own web address?** and type a domain for your apps (see [below](#give-each-app-its-own-web-address)).
5. The installer shows your server's IP address and the DNS records to add. Add them where you manage your domain name (usually the company you bought it from):

   | Type | Name | Points to |
   |---|---|---|
   | A | `studio.example.com` | your server's IP address |
   | A | `*.apps.example.com` | your server's IP address. Only if you gave each app its own address. |

   Some DNS websites want only the first part of the name (`studio`, `*.apps`). If your server has an IPv6 address you may also add AAAA records for the same names. Delete any old A or AAAA records for these names. New DNS records can take from a few minutes to an hour to work.
6. Open `https://studio.example.com/install`. The very first visit can take up to a minute while the certificate is made.

The installer saves your answers in `.env`. Run it again to change them: it shows your saved answers, and pressing Enter keeps them. To go back to plain `http://` on this computer only, answer `n`.

For scripted installs, give the answers as settings. `none` turns one off.

- Linux or macOS: `NULLKODE_DOMAIN=studio.example.com NULLKODE_EMAIL=you@example.com NULLKODE_APPS_DOMAIN=apps.example.com bash install.sh`
- Windows (PowerShell): `$env:NULLKODE_DOMAIN='studio.example.com'; $env:NULLKODE_EMAIL='you@example.com'; $env:NULLKODE_APPS_DOMAIN='apps.example.com'; .\Start-Nullkode.bat`

### Give each app its own web address

Without it, every published app lives inside your studio's address, like `https://studio.example.com/app/my-shop`. With it, each app gets its own address, like `https://my-shop.apps.example.com`.

This is safer, and it matters most when other people build apps on your server. Web browsers keep different addresses apart. When each app has its own address, a badly made or harmful app can't reach into your studio, where you and your customers are signed in, or into other apps. If only you build apps, it's optional.

A completely separate domain for apps, like `myapps.site`, is even better than a name under your studio's domain, like `apps.example.com`. Browsers treat all names ending in `example.com` as one family and let them share a few things, such as some cookies. A separate domain keeps your apps outside that family.

It needs one "wildcard" DNS record: `*.apps.example.com` (or `*.myapps.site`) pointing to your server. The `*` covers every app, so you add it once.

### Customers' and resellers' domains

A customer who wants their own domain for an app adds it in the app's **Domains** screen and follows the steps shown there: a CNAME record pointing to your studio's address, and a TXT record that proves they own the domain. When it shows **Connected**, HTTPS works on the first visit. A reseller's dashboard domain works the same way once it's verified. Nobody installs a certificate.

Certificates are only ever made for your studio's address, verified customer and reseller domains, and the addresses of published apps. Before making one, the HTTPS server (Caddy) asks Nullkode whether the address belongs here, using the private `NK_TLS_ASK_SECRET` in `.env`. That way strangers can't make your server ask for certificates for other names.

### Already have a web server?

If ports 80 and 443 belong to your own web server (nginx, Apache, Plesk and so on), answer `n` and put Nullkode behind it. Set `PUBLIC_BASE_URL=https://YOUR-DOMAIN` in `.env`, send the traffic to `127.0.0.1:3001`, allow streaming responses and long AI requests, then run `docker compose up -d --force-recreate app`. Your web server then looks after certificates, including customers' domains. See `docs/deploy/README.md`.

## Build Android apps (optional)

The **Mobile App** tab can turn any published app into an Android app: an APK file that installs on Android phones. Building APKs needs Google's Android tools on your server, so the installer asks before adding them.

- **Space and time:** it adds about 1.1 GB and a few minutes to the first setup. After that, each APK builds in about 20 seconds, without internet access.
- **License:** it downloads Google's Android SDK. **Turning it on means you accept the [Android Software Development Kit License Agreement](https://developer.android.com/studio/terms).** Nullkode is free software, but the Android SDK belongs to Google and has its own terms.
- **Computer:** it needs an Intel or AMD (x86-64) processor. Google's Android build tools don't run on ARM, so Apple Silicon Macs and ARM servers can't build APKs. They can still download the Android source project.

**Turn it on later:** run the installer again and answer `y`. You can also use one command in the Nullkode folder:

- Linux or macOS: `NULLKODE_ANDROID=1 bash install.sh`
- Windows (PowerShell): `$env:NULLKODE_ANDROID='1'; .\Start-Nullkode.bat`

To turn it off, answer `n`, or use `NULLKODE_ANDROID=0`. Your answer is saved in `.env` as `NULLKODE_ANDROID`. If you edit that line yourself, run `docker compose up -d --build` to apply it.

**Build an APK:** publish your app, open **Mobile App**, and click **Build APK**. The APK installs directly on Android phones; allow "Install unknown apps" when the phone asks. To publish on Google Play, choose **Publish on Google Play (AAB)**: it makes a signed app bundle with the app's own upload key (download a backup of that key and keep it safe). iPhone apps: download the ready-made Xcode project, or use its GitHub workflow to send it to TestFlight without a Mac. Details: [docs/mobile-apps.md](mobile-apps.md).

Your server signs every APK with a key it creates on the first build. The key is kept with your uploads (`uploads/.android`), so backups include it. Keep it: a phone installs an update over an older version only when both are signed with the same key.

## Back up, update, or move

**Nullkode backs itself up every night** at 03:30, while it keeps running: the database, uploaded files, and once a week the files of imported websites. Backups go into the `backups` folder next to `install.sh`. The last 7 daily and 4 weekly backups are kept, and the admin pages show when the last one ran. To change the time or where backups go, set `BACKUP_TIME`, `TZ` and `BACKUP_DIR` in `.env` (see `.env.example`) and run the installer again.

**Keep `.env` safe as well.** It holds the key that unlocks the AI and payment keys saved in the database. Add a passphrase to `.env`, for example `BACKUP_PASSPHRASE=a long sentence only you know`, and every backup includes an encrypted copy of `.env`. Write the passphrase down somewhere away from this computer. Without a passphrase, backups leave `.env` out, so keep your own copy.

**Copy backups to another device** from time to time: a backup on the same disk doesn't help if the disk fails. Backups hold your customers' data, so keep them private.

Make a backup yourself before every update:

- Linux or macOS: `bash scripts/backup.sh`
- Windows (PowerShell, in the Nullkode folder): `docker compose run --rm backup once`

Check that a backup really works, without touching your installation: `bash scripts/restore.sh backups/<backup folder> --verify`.

To update, make a backup, keep your `.env` and Compose project name, replace the application files with the new release, then run the installer again. Database volumes persist. Startup refuses destructive schema changes; read the release's migration notes if it stops. Never run `docker compose down -v` on an installation you want to keep: it deletes your data.

To restore a backup or move to a new server: [docs/deploy/RESTORE.md](deploy/RESTORE.md).

HTTPS certificates don't need a backup. After moving to a new server, point your DNS records at it and the certificates are made again on the first visits.

## Keep an eye on it

- `/api/health` answers 200 when the app and its database are working. Point an uptime monitor (Uptime Kuma, Healthchecks.io, or your hosting company's) at it.
- Set `BACKUP_HEARTBEAT_URL` in `.env` to a monitor's "push" address, and it's opened after each nightly backup: when backups stop, the monitor tells you.
- Docker keeps at most 50 MB of logs for each part of Nullkode: `docker compose logs --tail=100 app` shows the latest.

More for operators (health details, housekeeping, updates): [docs/operations.md](operations.md).

## Troubleshooting

- **Docker not running:** open Docker Desktop and wait for it to be ready.
- **Port 3001 already used:** set `APP_PORT=3002` and `PUBLIC_BASE_URL=http://localhost:3002` in `.env`, then rerun the installer.
- **Lost setup code:** open `.env` and copy `INSTALL_TOKEN`. After setup, this code cannot create another owner.
- **Interrupted setup:** reopen `/install`. If signed out, enter the same setup code, owner email and password to resume.
- **Build or startup failed:** run `docker compose logs --tail=100 app`. Preserve `.env` and volumes. Check free disk space and Docker's memory allocation. First builds need substantially more memory than normal runtime; allow at least 8 GB to Docker as a starting point.
- **AI cannot connect:** check the server is running, model ID is exact, API URL includes `/v1` when required, and Docker can reach it. `localhost` inside the container is the container itself.
- **Login does not stick after changing address:** make `PUBLIC_BASE_URL` match the address and protocol you open, recreate the app container, and sign in again. To change the domain name, run the installer again instead.
- **HTTPS address doesn't open, or the browser warns about the certificate:** check that the DNS records the installer showed point to this server (`nslookup studio.example.com`), that ports 80 and 443 are open in the firewall, and that no other web server uses them. Then read `docker compose logs --tail=50 caddy`. A customer's domain only gets a certificate after it shows **Connected**; an app's own address only while the app is published.
- **"Another program already uses port 80 (or 443)":** another web server runs on this computer. Stop it, or answer `n` and put Nullkode behind it (see [Already have a web server?](#already-have-a-web-server)).
- **"Build service unavailable" in Mobile App:** Android APK building is off. Run the installer again and answer `y` (see [Build Android apps](#build-android-apps-optional)). Source project downloads work without it.

Android APK building is optional and set up by the installer. Bare-metal installs can follow `docs/deploy/README.md`. No feature source is withheld.

## Without Docker

For systemd, Plesk or your own web server, see [deploy/README.md](deploy/README.md), and to update such a server safely, [deploy/plesk.md → Updating](deploy/plesk.md#updating).

Email (invitations, password links, owner alerts) is set up in the browser under Administration → Settings → Email, with any provider's SMTP details. See [email.md](email.md).

For how the source is laid out, see [architecture.md](architecture.md). To report a security problem, see [SECURITY.md](../SECURITY.md).
