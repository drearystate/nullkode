# Deploying Nullkode on Plesk

Plesk uses a two-tier proxy chain: **nginx (port 443)** → **Apache (port
7081)** → **your app**. You need to configure both for the Designer's
long-running requests to survive.

## 1. Install the app

In Plesk, add the domain (e.g. `nullkode.example.com`). Then SSH in:

```bash
cd /var/www/vhosts/nullkode.example.com/httpdocs
git clone https://github.com/drearystate/nullkode.git .
pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env with DATABASE_URL, AUTH_SECRET, PUBLIC_BASE_URL, etc.
pnpm db:push
pnpm -C apps/designer-renderer build
pnpm build
```

## 2. systemd service

Use the template at [`docs/deploy/systemd/nullkode.service`](./systemd/nullkode.service).
Adjust:

```
WorkingDirectory=/var/www/vhosts/nullkode.example.com/httpdocs
EnvironmentFile=/var/www/vhosts/nullkode.example.com/httpdocs/.env
User=root  # or a dedicated user; if you want the Designer's CLI
           # privilege drop to work, root + a claude-runner user
```

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

## 5. Claude CLI runner (Designer)

The Designer subprocess defaults to running as `claude-runner` (uid 983).
Create the user and authenticate the CLI:

```bash
sudo useradd -m -u 983 -s /bin/bash claude-runner
sudo -u claude-runner -- claude    # interactive `claude login`
```

If you don't want a separate user, set `NK_CLAUDE_RUNNER_DISABLE=1` in
`.env`. The subprocess will then run as whoever owns the Next process
(root, in a typical Plesk setup — fine if you trust your inputs).

## 6. Verify

```bash
# Service running?
systemctl status nullkode

# Behind proxy?
curl -I https://nullkode.example.com/

# Designer's CLI healthy? (admin session required)
curl https://nullkode.example.com/api/designer/health
```
