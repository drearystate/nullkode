#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
trap 'echo; echo "Setup stopped. Your saved data has not been deleted. See docs/install.md → Troubleshooting."' ERR
printf '\nWelcome to Nullkode. This installer sets up the app and database.\n\n'
if ! command -v docker >/dev/null 2>&1; then
  echo 'Install and open Docker Desktop first: https://www.docker.com/products/docker-desktop/'
  echo 'On a Linux server, install Docker Engine and the Docker Compose plugin.'
  exit 1
fi
docker info >/dev/null 2>&1 || { echo 'Docker is not running. Open Docker Desktop, wait for it to start, then run this installer again.'; exit 1; }
docker compose version >/dev/null || { echo 'Docker Compose is missing. Install the Docker Compose plugin, then retry.'; exit 1; }

# Optional Android APK builder (docs/install.md → "Build Android apps").
# Measured size of the extra tools. Update it when the Android toolchain changes.
android_size='about 1.1 GB'
android_license='https://developer.android.com/studio/terms'

# Print one value from .env, or nothing.
env_value() {
  [[ -f .env ]] || return 0
  sed -n "s/^$1=//p" .env | tail -n 1 | tr -d "\r\"'"
}

# Set one KEY=value in .env and leave every other line as it is.
set_env_value() {
  local tmp
  tmp=$(mktemp .env.XXXXXX)
  if awk -v key="$1" -v value="$2" '
      index($0, key "=") == 1 { if (!done) print key "=" value; done = 1; next }
      { print }
      END { if (!done) print key "=" value }' .env > "$tmp"; then
    mv -f "$tmp" .env
  else
    rm -f "$tmp"
    return 1
  fi
}

# Print 1 for yes/true/on/1, 0 for no/false/off/0, and ? for anything else.
yes_no() {
  case "$1" in
    1|[yY]|[yY][eE][sS]|[tT][rR][uU][eE]|[oO][nN]) echo 1 ;;
    0|[nN]|[nN][oO]|[fF][aA][lL][sS][eE]|[oO][fF][fF]) echo 0 ;;
    *) echo '?' ;;
  esac
}

# Decide whether to include the Android APK builder: NULLKODE_ANDROID=1/0 for
# scripted installs, otherwise ask. The saved answer is the default next time.
choose_android() {
  local current answer hint
  current=$(yes_no "$(env_value NULLKODE_ANDROID)")
  [[ "$current" == 1 ]] || current=0
  if [[ -n "${NULLKODE_ANDROID:-}" ]]; then
    android=$(yes_no "$NULLKODE_ANDROID")
    [[ "$android" != '?' ]] || { echo 'NULLKODE_ANDROID must be 1 (build Android apps) or 0 (do not).'; exit 1; }
  elif [[ -t 0 ]]; then
    echo
    echo 'Optional: build Android apps'
    echo 'Nullkode can turn your published apps into Android apps (APK files) on this server.'
    echo "This adds ${android_size} and makes the first setup take a few minutes longer."
    echo "It downloads Google's Android SDK. Answering yes means you accept Google's Android SDK License:"
    echo "  ${android_license}"
    echo 'You can change your answer later by running this installer again.'
    if [[ "$current" == 1 ]]; then hint='Y/n'; else hint='y/N'; fi
    while true; do
      read -r -p "Do you want to build Android apps (APK files) from your server? [${hint}]: " answer || answer=''
      if [[ -z "$answer" ]]; then android=$current; break; fi
      android=$(yes_no "$answer")
      [[ "$android" == '?' ]] || break
      echo 'Please type y or n.'
    done
  else
    android=$current
  fi
  if [[ "$android" == 1 ]]; then
    case "$(docker info --format '{{.Architecture}}' 2>/dev/null || true)" in
      aarch64|arm64|arm*)
        echo "Android APK building needs an Intel or AMD (x86-64) processor. This computer's is ARM, so it stays off."
        echo 'The Mobile App tab can still download the Android source project.'
        android=0 ;;
    esac
  fi
  if [[ "$android" == 1 ]]; then
    echo "Android APK building: on. You accept Google's Android SDK License: ${android_license}"
  else
    echo 'Android APK building: off. Run this installer again to turn it on.'
  fi
}

# Print $1 random 64-character hex strings, one per line.
new_secrets() {
  docker run --rm node:20.19.2-bookworm-slim node -e "const c=require('crypto');for(let i=0;i<$1;i++)console.log(c.randomBytes(32).toString('hex'))"
}

# Web address and automatic HTTPS (docs/install.md → "Put it on a public domain").
# With a domain name, Caddy (docker-compose.yml, profile "https") answers on
# ports 80 and 443 and gets certificates by itself. For scripted installs:
#   NULLKODE_DOMAIN=studio.example.com   (none = this computer only, plain http)
#   NULLKODE_EMAIL=you@example.com       (optional; none = no email)
#   NULLKODE_APPS_DOMAIN=apps.example.com (optional; none = off)
# Otherwise the installer asks. The saved answers are the defaults next time.

# A domain name in lower case, without http(s)://, path, port or final dot.
# Prints nothing if it isn't a name like studio.example.com.
clean_domain() {
  local name
  name=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's|^[a-z][a-z0-9+.-]*://||' -e 's|[/?#].*$||' -e 's|:[0-9]*$||' -e 's|\.$||')
  if [[ ${#name} -le 253 && "$name" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])$ ]]; then printf '%s' "$name"; fi
}

valid_email() { [[ "$1" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; }

# Why $1 can't be the apps domain for the studio at $2, or nothing.
apps_domain_problem() {
  if [[ "$1" == "$2" ]]; then
    echo "The apps domain must be different from your studio's domain."
  elif [[ "$2" == *".$1" ]]; then
    echo "Your studio's address can't be inside the apps domain. Use a name like apps.example.com."
  fi
}

# This server's public IP address as the internet sees it, or nothing.
public_ip() {
  local ip=''
  if command -v curl >/dev/null 2>&1; then ip=$(curl -fsS --max-time 5 "https://$1" 2>/dev/null || true); fi
  if [[ "$ip" =~ ^[0-9a-fA-F:.]+$ ]]; then printf '%s' "$ip"; fi
}

# True if a program on this computer already answers on TCP port $1.
port_in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

# Sets https (1/0), domain, tls_email, apps_domain and, without a domain
# name, app_address.
choose_https() {
  local answer eof hint own parent suggestion problem saved_domain saved_email saved_apps ipv4 ipv6 target
  saved_https=0
  if [[ ",$(env_value COMPOSE_PROFILES)," == *,https,* ]]; then saved_https=1; fi
  saved_domain=$(clean_domain "$(env_value PUBLIC_BASE_URL)")
  saved_email=$(env_value NK_TLS_EMAIL)
  valid_email "$saved_email" || saved_email=''
  saved_apps=$(clean_domain "$(env_value APPS_DOMAIN)")
  domain='' tls_email='' apps_domain='' app_address=''

  # 1. A domain name for the studio, or this computer only.
  if [[ -n "${NULLKODE_DOMAIN:-}" ]]; then
    case "$(printf '%s' "$NULLKODE_DOMAIN" | tr '[:upper:]' '[:lower:]')" in
      none|no|n|off|0|false) https=0 ;;
      *)
        https=1
        domain=$(clean_domain "$NULLKODE_DOMAIN")
        [[ -n "$domain" ]] || { echo 'NULLKODE_DOMAIN must be a domain name like studio.example.com, or none.'; exit 1; } ;;
    esac
  elif [[ -t 0 ]]; then
    echo
    echo 'Your web address'
    echo 'Without a domain name, Nullkode runs on this computer at http://localhost:3001.'
    echo 'With a domain name, it runs at an address like https://studio.example.com, and the'
    echo 'secure HTTPS certificates are made and renewed for you, for free.'
    echo 'Answer y only on a server the internet can reach, with ports 80 and 443 free'
    echo '(no other web server running). On your own computer, answer n.'
    if [[ "$saved_https" == 1 ]]; then hint='Y/n'; else hint='y/N'; fi
    while true; do
      read -r -p "Do you have a domain name for this server? [${hint}]: " answer || answer=''
      if [[ -z "$answer" ]]; then https=$saved_https; break; fi
      https=$(yes_no "$answer")
      [[ "$https" == '?' ]] || break
      echo 'Please type y or n.'
    done
    if [[ "$https" == 1 ]]; then
      while true; do
        eof=0
        read -r -p "Your studio's domain name, for example studio.example.com${saved_domain:+ [$saved_domain]}: " answer || eof=1
        domain=$(clean_domain "${answer:-$saved_domain}")
        [[ -z "$domain" ]] || break
        [[ "$eof" == 0 ]] || { echo; echo "No domain name was typed. Run this installer again when you're ready."; exit 1; }
        echo 'Type a domain name like studio.example.com (letters, numbers, dots and dashes).'
      done
    fi
  else
    https=$saved_https
    domain=$saved_domain
    if [[ "$https" == 1 && -z "$domain" ]]; then echo 'Set your domain name, for example: NULLKODE_DOMAIN=studio.example.com bash install.sh'; exit 1; fi
  fi

  if [[ "$https" == 0 ]]; then
    # First setup, or HTTPS mode is being turned off: the https:// address stops working.
    if [[ ! -f .env || "$saved_https" == 1 ]]; then
      target=$(env_value APP_PORT)
      read -r -p "App address [http://localhost:${target:-3001}]: " app_address || true
      app_address=${app_address:-http://localhost:${target:-3001}}
      # URLs enter .env, never the shell. Reject characters interpreted by Compose.
      [[ "$app_address" =~ ^https?://[a-zA-Z0-9.-]+(:[0-9]+)?/?$ ]] || { echo 'Use a full http:// or https:// address, without a path.'; exit 1; }
    fi
    echo "Web address: ${app_address:-$(env_value PUBLIC_BASE_URL)} (no automatic HTTPS)"
    return 0
  fi

  # 2. Optional email for certificate notices.
  if [[ -n "${NULLKODE_EMAIL:-}" ]]; then
    tls_email=$NULLKODE_EMAIL
    [[ "$tls_email" != none ]] || tls_email=''
    if [[ -n "$tls_email" ]] && ! valid_email "$tls_email"; then echo 'NULLKODE_EMAIL must be an email address, or none.'; exit 1; fi
  elif [[ -t 0 ]]; then
    echo
    echo "Optional: your email address. Let's Encrypt, who makes the free certificates,"
    echo 'only writes to it if a certificate needs your attention.'
    while true; do
      if [[ -n "$saved_email" ]]; then
        read -r -p "Email for certificate notices [${saved_email}] (type none for no email): " answer || answer=''
      else
        read -r -p 'Email for certificate notices (press Enter to skip): ' answer || answer=''
      fi
      tls_email=${answer:-$saved_email}
      [[ "$tls_email" != none ]] || tls_email=''
      if [[ -z "$tls_email" ]] || valid_email "$tls_email"; then break; fi
      echo "That doesn't look like an email address. Try again, or press Enter to skip."
    done
  else
    tls_email=$saved_email
  fi

  # 3. Optional: every published app at its own address, <name>.<apps domain>.
  parent=${domain#*.}
  [[ "$parent" == *.* ]] || parent=$domain
  suggestion=${saved_apps:-apps.$parent}
  if [[ -n "${NULLKODE_APPS_DOMAIN:-}" ]]; then
    case "$(printf '%s' "$NULLKODE_APPS_DOMAIN" | tr '[:upper:]' '[:lower:]')" in
      none|no|n|off|0|false) apps_domain='' ;;
      *)
        apps_domain=$(clean_domain "$NULLKODE_APPS_DOMAIN")
        [[ -n "$apps_domain" ]] || { echo 'NULLKODE_APPS_DOMAIN must be a domain name like apps.example.com, or none.'; exit 1; } ;;
    esac
  elif [[ -t 0 ]]; then
    echo
    echo 'Optional: give each app its own web address'
    echo "Each published app can get its own address, like https://my-shop.${suggestion}."
    echo 'This is safer when other people build apps on your server: every app is kept'
    echo "apart, so a bad app can't reach your studio or other people's apps. A separate"
    echo "domain just for apps (like myapps.site) is even safer than a name under your"
    echo "studio's domain. It needs one more DNS record, shown below."
    if [[ -n "$saved_apps" ]]; then hint='Y/n'; else hint='y/N'; fi
    while true; do
      read -r -p "Give each app its own web address? [${hint}]: " answer || answer=''
      if [[ -z "$answer" ]]; then
        if [[ -n "$saved_apps" ]]; then own=1; else own=0; fi
        break
      fi
      own=$(yes_no "$answer")
      [[ "$own" == '?' ]] || break
      echo 'Please type y or n.'
    done
    while [[ "$own" == 1 ]]; do
      eof=0
      read -r -p "Domain for your apps [${suggestion}]: " answer || eof=1
      apps_domain=$(clean_domain "${answer:-$suggestion}")
      problem='Type a domain name like apps.example.com.'
      if [[ -n "$apps_domain" ]]; then problem=$(apps_domain_problem "$apps_domain" "$domain"); fi
      [[ -n "$problem" ]] || break
      [[ "$eof" == 0 ]] || { echo; echo "$problem Run this installer again when you're ready."; exit 1; }
      echo "$problem"
    done
  else
    apps_domain=$saved_apps
  fi
  if [[ -n "$apps_domain" ]]; then
    problem=$(apps_domain_problem "$apps_domain" "$domain")
    if [[ -n "$problem" ]]; then echo "$problem Set NULLKODE_APPS_DOMAIN to another name, or none."; exit 1; fi
  fi

  # 4. The DNS records to add.
  echo
  echo "Looking up this server's public IP address..."
  ipv4=$(public_ip api.ipify.org)
  ipv6=$(public_ip api6.ipify.org)
  [[ "$ipv4" == *.* ]] || ipv4=''
  [[ "$ipv6" == *:* ]] || ipv6=''
  target=${ipv4:-"this server's public IP address"}
  echo 'Add these DNS records where you manage your domain name (usually the company you bought it from):'
  printf '  %-6s %-32s %s\n' Type Name 'Points to'
  printf '  %-6s %-32s %s\n' A "$domain" "$target"
  if [[ -n "$apps_domain" ]]; then printf '  %-6s %-32s %s\n' A "*.${apps_domain}" "$target"; fi
  if [[ -n "$ipv6" ]]; then
    printf '  %-6s %-32s %s\n' AAAA "$domain" "$ipv6"
    if [[ -n "$apps_domain" ]]; then printf '  %-6s %-32s %s\n' AAAA "*.${apps_domain}" "$ipv6"; fi
  fi
  if [[ -n "$apps_domain" ]]; then echo 'The * record covers every app, so you only add it once.'; fi
  echo "Some DNS websites want only the first part of the name, for example ${domain%%.*} instead of ${domain}."
  echo 'Delete any other A or AAAA records for these names, and keep ports 80 and 443 open.'
  echo 'Certificates are made on the first visit, so you can finish this setup first.'
  echo "Web address: https://${domain} with automatic HTTPS."
  if [[ -n "$apps_domain" ]]; then echo "Each app: https://<app name>.${apps_domain}"; fi
}

# Only write (and list) keys whose value changes.
update_env() {
  if grep -q "^$1=" .env && [[ "$(env_value "$1")" == "$2" ]]; then return 0; fi
  set_env_value "$1" "$2"
  saved_keys="${saved_keys} $1"
}

# Save the web address answers in .env. Every other line stays as it is.
save_https() {
  local ask
  saved_keys=''
  if [[ "$https" == 1 ]]; then
    update_env PUBLIC_BASE_URL "https://${domain}"
    update_env COMPOSE_PROFILES https
    update_env NK_AUTO_TLS 1
    update_env NK_TLS_EMAIL "$tls_email"
    update_env APPS_DOMAIN "$apps_domain"
  elif [[ "$saved_https" == 1 ]]; then
    update_env PUBLIC_BASE_URL "${app_address%/}"
    update_env COMPOSE_PROFILES ''
    update_env NK_AUTO_TLS 0
    update_env APPS_DOMAIN ''
  fi
  # Lets Caddy ask the app which addresses may get a certificate. Made once.
  ask=$(env_value NK_TLS_ASK_SECRET)
  if [[ ${#ask} -lt 32 ]]; then update_env NK_TLS_ASK_SECRET "$(new_secrets 1)"; fi
  if [[ -n "$saved_keys" ]]; then echo "Saved your choices in .env:${saved_keys}"; fi
}

if [[ -f .env ]]; then
  echo 'Using your existing .env. No passwords will be replaced.'
fi
choose_https
if [[ "$https" == 1 ]]; then app_address="https://${domain}"; fi
choose_android
if [[ ! -f .env ]]; then
  echo 'Generating private passwords and your setup code…'
  secrets=$(new_secrets 5)
  mapfile_compat=()
  while IFS= read -r line; do mapfile_compat+=("$line"); done <<< "$secrets"
  [[ ${#mapfile_compat[@]} == 5 ]] || { echo 'Could not generate secrets.'; exit 1; }
  umask 077
  # Noclobber prevents two simultaneous installers overwriting credentials.
  (set -o noclobber; cat > .env <<ENV
PUBLIC_BASE_URL=${app_address%/}
APP_PORT=3001
BIND_ADDRESS=127.0.0.1
DB_PASSWORD=${mapfile_compat[0]}
AUTH_SECRET=${mapfile_compat[1]}
INSTALL_TOKEN=${mapfile_compat[2]}
CRON_SECRET=${mapfile_compat[3]}
NK_TLS_ASK_SECRET=${mapfile_compat[4]}
AI_PROVIDER=openai
OPENAI_SCAFFOLD_MODEL=gpt-6-luna
OPENAI_EDIT_MODEL=gpt-6-luna
NULLKODE_ANDROID=${android}
ENV
  )
elif [[ "$(env_value NULLKODE_ANDROID)" != "$android" ]]; then
  set_env_value NULLKODE_ANDROID "$android"
  echo "Saved your choice in .env: NULLKODE_ANDROID=${android}"
fi
save_https
for key in AUTH_SECRET INSTALL_TOKEN DB_PASSWORD CRON_SECRET NK_TLS_ASK_SECRET; do
  rg_value=$(sed -n "s/^${key}=//p" .env | head -1)
  [[ ${#rg_value} -ge 32 && "$rg_value" != *replace* ]] || { echo "Your existing .env needs a random ${key} of at least 32 characters. See docs/install.md."; exit 1; }
done
# Compose prefers the shell's value over .env, so pass on the normalized ones.
export NULLKODE_ANDROID="$android"
COMPOSE_PROFILES=$(env_value COMPOSE_PROFILES)
export COMPOSE_PROFILES
if [[ "$https" == 1 ]]; then
  if [[ -z "$(docker compose ps -q caddy 2>/dev/null)" ]]; then
    http_port=${HTTP_PORT:-$(env_value HTTP_PORT)}
    https_port=${HTTPS_PORT:-$(env_value HTTPS_PORT)}
    for port in "${http_port:-80}" "${https_port:-443}"; do
      if port_in_use "$port"; then
        echo "Another program on this computer already uses port ${port}, which HTTPS needs."
        echo 'Usually that is another web server. Stop it and run this installer again, or answer n'
        echo 'and put Nullkode behind that web server instead (docs/install.md → "Put it on a public domain").'
        exit 1
      fi
    done
  fi
  if [[ "$(env_value BIND_ADDRESS)" == 0.0.0.0 ]]; then
    echo "Note: BIND_ADDRESS=0.0.0.0 in .env also lets people open the app without HTTPS on port $(env_value APP_PORT). Set BIND_ADDRESS=127.0.0.1 unless you need that."
  fi
else
  # Without a domain name, stop the HTTPS web server if an earlier setup started it.
  docker compose --profile https rm --stop --force caddy >/dev/null 2>&1 || true
fi
if [[ "$android" == 1 ]]; then
  echo 'Building and starting Nullkode with the Android tools. The first download can take 10 minutes or more.'
else
  echo 'Building and starting Nullkode. The first download can take several minutes.'
fi
docker compose up --build -d --wait --wait-timeout 240
if [[ "$https" == 1 ]]; then
  # Start the HTTPS web server afresh so it reads the current Caddyfile.
  docker compose up -d --no-deps --force-recreate caddy
  printf '\nReady! Open %s/install\n' "$(env_value PUBLIC_BASE_URL)"
  echo 'The first visit can take up to a minute while the secure certificate is made.'
  echo "If the page doesn't open, check the DNS records shown above and that ports 80 and 443 are open."
else
  printf '\nReady! Open http://localhost:%s/install\n' "$(sed -n 's/^APP_PORT=//p' .env | head -1 | awk '{print ($0 ? $0 : 3001)}')"
fi
printf 'Your private setup code: %s\n' "$(sed -n 's/^INSTALL_TOKEN=//p' .env | head -1)"
if [[ "$android" == 1 ]]; then
  echo 'Android APK building is on: open an app, then Mobile App → Build APK.'
fi
echo 'Keep .env safe. It contains the keys needed to recover your installation.'
if [[ "$https" != 1 ]]; then
  echo 'To use a domain name with automatic HTTPS, run this installer again on your server and answer y.'
fi
