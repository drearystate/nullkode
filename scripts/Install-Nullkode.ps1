$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
# Optional Android APK builder (START-HERE.md, "Build Android apps").
# Measured size of the extra tools. Update it when the Android toolchain changes.
$androidSize = 'about 1.1 GB'
$androidLicense = 'https://developer.android.com/studio/terms'

# One value from .env, or '' when it is not set.
function Get-EnvValue([string]$Key) {
  if (!(Test-Path .env)) { return '' }
  $line = @(Get-Content .env | Where-Object { $_.StartsWith("$Key=") }) | Select-Object -Last 1
  if ($null -eq $line) { return '' }
  return $line.Substring($Key.Length + 1).Trim().Trim('"', "'")
}

# Set one KEY=value in .env and leave every other line as it is.
function Set-EnvValue([string]$Key, [string]$Value) {
  $found = $false
  $lines = @(foreach ($line in @(Get-Content .env)) {
    if ($line.StartsWith("$Key=")) { if (!$found) { "$Key=$Value"; $found = $true } } else { $line }
  })
  if (!$found) { $lines += "$Key=$Value" }
  $tmp = Join-Path (Get-Location) ".env.tmp$PID"
  [IO.File]::WriteAllText($tmp, (($lines -join "`n") + "`n"), (New-Object Text.UTF8Encoding $false))
  Move-Item -LiteralPath $tmp -Destination (Join-Path (Get-Location) '.env') -Force
}

# Like Set-EnvValue, but only writes (and lists) keys whose value changes.
function Update-EnvValue([string]$Key, [string]$Value) {
  $present = @(Get-Content .env | Where-Object { $_.StartsWith("$Key=") }).Count -gt 0
  if ($present -and (Get-EnvValue $Key) -ceq $Value) { return }
  Set-EnvValue $Key $Value
  $script:savedKeys += " $Key"
}

# '1' for yes/true/on/1, '0' for no/false/off/0, '?' for anything else.
function ConvertTo-YesNo([string]$Value) {
  switch -Regex ("$Value".Trim()) {
    '^(1|y|yes|true|on)$' { return '1' }
    '^(0|n|no|false|off)$' { return '0' }
    default { return '?' }
  }
}

# Random 64-character hex strings.
function New-Secret([int]$Count) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { return @(1..$Count | ForEach-Object { $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [BitConverter]::ToString($bytes).Replace('-','').ToLower() }) }
  finally { $rng.Dispose() }
}

# Web address and automatic HTTPS (START-HERE.md, "Put it on a public domain").
# With a domain name, Caddy (docker-compose.yml, profile "https") answers on
# ports 80 and 443 and gets certificates by itself. For scripted installs:
#   $env:NULLKODE_DOMAIN = 'studio.example.com'    (none = this computer only, plain http)
#   $env:NULLKODE_EMAIL = 'you@example.com'        (optional; none = no email)
#   $env:NULLKODE_APPS_DOMAIN = 'apps.example.com' (optional; none = off)
# Otherwise the installer asks. The saved answers are the defaults next time.

# A domain name in lower case, without http(s)://, path, port or final dot.
# '' if it isn't a name like studio.example.com.
function ConvertTo-Domain([string]$Value) {
  $name = "$Value".Trim().ToLowerInvariant() -replace '^[a-z][a-z0-9+.-]*://', '' -replace '[/?#].*$', '' -replace ':[0-9]*$', '' -replace '\.$', ''
  if ($name.Length -le 253 -and $name -cmatch '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])$') { return $name }
  return ''
}

function Test-Email([string]$Value) { return "$Value" -match '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' }

function Test-None([string]$Value) { return "$Value".Trim() -match '^(none|no|n|off|0|false)$' }

# Why $Apps can't be the apps domain for the studio at $Studio, or ''.
function Get-AppsDomainProblem([string]$Apps, [string]$Studio) {
  if ($Apps -eq $Studio) { return "The apps domain must be different from your studio's domain." }
  if ($Studio.EndsWith(".$Apps")) { return "Your studio's address can't be inside the apps domain. Use a name like apps.example.com." }
  return ''
}

# This server's public IP address as the internet sees it, or ''.
function Get-PublicIp([string]$Service) {
  try {
    $ip = "$(Invoke-RestMethod -Uri "https://$Service" -TimeoutSec 5 -UseBasicParsing)".Trim()
    if ($ip -match '^[0-9a-fA-F:.]+$') { return $ip }
  } catch { }
  return ''
}

# True if a program on this computer already answers on TCP port $Port.
function Test-PortInUse([int]$Port) {
  $client = New-Object Net.Sockets.TcpClient
  try { return $client.ConnectAsync('127.0.0.1', $Port).Wait(1000) } catch { return $false } finally { $client.Dispose() }
}

# Windows PowerShell 5.1 turns redirected stderr into errors, so Docker probes run with 'Continue'.
function Test-DockerRunning { $ErrorActionPreference = 'Continue'; docker info *> $null; return ($LASTEXITCODE -eq 0) }
function Get-DockerArch { $ErrorActionPreference = 'Continue'; return "$(docker info --format '{{.Architecture}}' 2>$null)".Trim() }
function Test-CaddyRunning { $ErrorActionPreference = 'Continue'; return [bool]"$(docker compose ps -q caddy 2>$null)".Trim() }
function Remove-Caddy { $ErrorActionPreference = 'Continue'; docker compose --profile https rm --stop --force caddy *> $null }

try {
  if (!(Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Install and open Docker Desktop first: https://www.docker.com/products/docker-desktop/' }
  if (!(Test-DockerRunning)) { throw 'Docker is not running. Open Docker Desktop, wait for it to start, then retry.' }
  docker compose version
  if ($LASTEXITCODE -ne 0) { throw 'Docker Compose is missing. Update Docker Desktop.' }
  $interactive = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected
  $haveEnv = Test-Path .env
  if ($haveEnv) { Write-Host 'Using your existing .env. Your passwords will not be replaced.' }

  # Web address: a domain name for the studio (automatic HTTPS), or this computer only.
  $savedHttps = if ((",$(Get-EnvValue 'COMPOSE_PROFILES'),") -like '*,https,*') { '1' } else { '0' }
  $savedDomain = ConvertTo-Domain (Get-EnvValue 'PUBLIC_BASE_URL')
  $savedEmail = Get-EnvValue 'NK_TLS_EMAIL'
  if (!(Test-Email $savedEmail)) { $savedEmail = '' }
  $savedApps = ConvertTo-Domain (Get-EnvValue 'APPS_DOMAIN')
  $domain = ''; $tlsEmail = ''; $appsDomain = ''; $address = ''
  if ("$env:NULLKODE_DOMAIN".Trim()) {
    if (Test-None $env:NULLKODE_DOMAIN) { $https = '0' }
    else {
      $https = '1'
      $domain = ConvertTo-Domain $env:NULLKODE_DOMAIN
      if (!$domain) { throw 'NULLKODE_DOMAIN must be a domain name like studio.example.com, or none.' }
    }
  } elseif ($interactive) {
    Write-Host ''
    Write-Host 'Your web address'
    Write-Host 'Without a domain name, Nullkode runs on this computer at http://localhost:3001.'
    Write-Host 'With a domain name, it runs at an address like https://studio.example.com, and the'
    Write-Host 'secure HTTPS certificates are made and renewed for you, for free.'
    Write-Host 'Answer y only on a server the internet can reach, with ports 80 and 443 free'
    Write-Host '(no other web server running). On your own computer, answer n.'
    $hint = if ($savedHttps -eq '1') { 'Y/n' } else { 'y/N' }
    while ($true) {
      $answer = "$(Read-Host "Do you have a domain name for this server? [$hint]")".Trim()
      if (!$answer) { $https = $savedHttps; break }
      $https = ConvertTo-YesNo $answer
      if ($https -ne '?') { break }
      Write-Host 'Please type y or n.'
    }
    if ($https -eq '1') {
      $suffix = if ($savedDomain) { " [$savedDomain]" } else { '' }
      while ($true) {
        $answer = Read-Host "Your studio's domain name, for example studio.example.com$suffix"
        if ($null -eq $answer -and !$savedDomain) { throw "No domain name was typed. Run this installer again when you're ready." }
        $answer = "$answer".Trim()
        if (!$answer) { $answer = $savedDomain }
        $domain = ConvertTo-Domain $answer
        if ($domain) { break }
        Write-Host 'Type a domain name like studio.example.com (letters, numbers, dots and dashes).'
      }
    }
  } else {
    $https = $savedHttps
    $domain = $savedDomain
    if ($https -eq '1' -and !$domain) { throw "Set your domain name first, for example: `$env:NULLKODE_DOMAIN='studio.example.com'" }
  }

  if ($https -eq '0') {
    # First setup, or HTTPS mode is being turned off: the https:// address stops working.
    if (!$haveEnv -or $savedHttps -eq '1') {
      $port = Get-EnvValue 'APP_PORT'
      if (!$port) { $port = '3001' }
      $address = if ($interactive) { "$(Read-Host "App address [http://localhost:$port]")".Trim() } else { '' }
      if (!$address) { $address = "http://localhost:$port" }
      if ($address -notmatch '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?/?$') { throw 'Use an http:// or https:// address without a path.' }
    }
    $shown = if ($address) { $address } else { Get-EnvValue 'PUBLIC_BASE_URL' }
    Write-Host "Web address: $shown (no automatic HTTPS)"
  } else {
    $address = "https://$domain"
    # Optional email for certificate notices.
    if ("$env:NULLKODE_EMAIL".Trim()) {
      $tlsEmail = "$env:NULLKODE_EMAIL".Trim()
      if ($tlsEmail -eq 'none') { $tlsEmail = '' }
      if ($tlsEmail -and !(Test-Email $tlsEmail)) { throw 'NULLKODE_EMAIL must be an email address, or none.' }
    } elseif ($interactive) {
      Write-Host ''
      Write-Host "Optional: your email address. Let's Encrypt, who makes the free certificates,"
      Write-Host 'only writes to it if a certificate needs your attention.'
      while ($true) {
        $prompt = if ($savedEmail) { "Email for certificate notices [$savedEmail] (type none for no email)" } else { 'Email for certificate notices (press Enter to skip)' }
        $answer = "$(Read-Host $prompt)".Trim()
        $tlsEmail = if ($answer) { $answer } else { $savedEmail }
        if ($tlsEmail -eq 'none') { $tlsEmail = '' }
        if (!$tlsEmail -or (Test-Email $tlsEmail)) { break }
        Write-Host "That doesn't look like an email address. Try again, or press Enter to skip."
      }
    } else { $tlsEmail = $savedEmail }

    # Optional: every published app at its own address, <name>.<apps domain>.
    $parent = $domain.Substring($domain.IndexOf('.') + 1)
    if (!$parent.Contains('.')) { $parent = $domain }
    $suggestion = if ($savedApps) { $savedApps } else { "apps.$parent" }
    if ("$env:NULLKODE_APPS_DOMAIN".Trim()) {
      if (Test-None $env:NULLKODE_APPS_DOMAIN) { $appsDomain = '' }
      else {
        $appsDomain = ConvertTo-Domain $env:NULLKODE_APPS_DOMAIN
        if (!$appsDomain) { throw 'NULLKODE_APPS_DOMAIN must be a domain name like apps.example.com, or none.' }
      }
    } elseif ($interactive) {
      Write-Host ''
      Write-Host 'Optional: give each app its own web address'
      Write-Host "Each published app can get its own address, like https://my-shop.$suggestion."
      Write-Host 'This is safer when other people build apps on your server: every app is kept'
      Write-Host "apart, so a bad app can't reach your studio or other people's apps. A separate"
      Write-Host 'domain just for apps (like myapps.site) is even safer than a name under your'
      Write-Host "studio's domain. It needs one more DNS record, shown below."
      $hint = if ($savedApps) { 'Y/n' } else { 'y/N' }
      while ($true) {
        $answer = "$(Read-Host "Give each app its own web address? [$hint]")".Trim()
        if (!$answer) { $own = if ($savedApps) { '1' } else { '0' }; break }
        $own = ConvertTo-YesNo $answer
        if ($own -ne '?') { break }
        Write-Host 'Please type y or n.'
      }
      while ($own -eq '1') {
        $raw = Read-Host "Domain for your apps [$suggestion]"
        $answer = "$raw".Trim()
        if (!$answer) { $answer = $suggestion }
        $appsDomain = ConvertTo-Domain $answer
        $problem = if ($appsDomain) { Get-AppsDomainProblem $appsDomain $domain } else { 'Type a domain name like apps.example.com.' }
        if (!$problem) { break }
        if ($null -eq $raw) { throw "$problem Run this installer again when you're ready." }
        Write-Host $problem
      }
    } else { $appsDomain = $savedApps }
    if ($appsDomain) {
      $problem = Get-AppsDomainProblem $appsDomain $domain
      if ($problem) { throw "$problem Set NULLKODE_APPS_DOMAIN to another name, or none." }
    }

    # The DNS records to add.
    Write-Host ''
    Write-Host "Looking up this server's public IP address..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    $ipv4 = Get-PublicIp 'api.ipify.org'
    $ipv6 = Get-PublicIp 'api6.ipify.org'
    if (!$ipv4.Contains('.')) { $ipv4 = '' }
    if (!$ipv6.Contains(':')) { $ipv6 = '' }
    $target = if ($ipv4) { $ipv4 } else { "this server's public IP address" }
    Write-Host 'Add these DNS records where you manage your domain name (usually the company you bought it from):'
    Write-Host ('  {0,-6} {1,-32} {2}' -f 'Type', 'Name', 'Points to')
    Write-Host ('  {0,-6} {1,-32} {2}' -f 'A', $domain, $target)
    if ($appsDomain) { Write-Host ('  {0,-6} {1,-32} {2}' -f 'A', "*.$appsDomain", $target) }
    if ($ipv6) {
      Write-Host ('  {0,-6} {1,-32} {2}' -f 'AAAA', $domain, $ipv6)
      if ($appsDomain) { Write-Host ('  {0,-6} {1,-32} {2}' -f 'AAAA', "*.$appsDomain", $ipv6) }
    }
    if ($appsDomain) { Write-Host 'The * record covers every app, so you only add it once.' }
    Write-Host "Some DNS websites want only the first part of the name, for example $($domain.Split('.')[0]) instead of $domain."
    Write-Host 'Delete any other A or AAAA records for these names, and keep ports 80 and 443 open.'
    Write-Host 'Certificates are made on the first visit, so you can finish this setup first.'
    Write-Host "Web address: https://$domain with automatic HTTPS."
    if ($appsDomain) { Write-Host "Each app: https://<app name>.$appsDomain" }
  }

  # Android APK builder: $env:NULLKODE_ANDROID = 1 or 0 for scripted installs, otherwise ask.
  # The saved answer is the default next time.
  $current = if ((ConvertTo-YesNo (Get-EnvValue 'NULLKODE_ANDROID')) -eq '1') { '1' } else { '0' }
  if ("$env:NULLKODE_ANDROID".Trim()) {
    $android = ConvertTo-YesNo $env:NULLKODE_ANDROID
    if ($android -eq '?') { throw 'NULLKODE_ANDROID must be 1 (build Android apps) or 0 (do not).' }
  } elseif ($interactive) {
    Write-Host ''
    Write-Host 'Optional: build Android apps'
    Write-Host 'Nullkode can turn your published apps into Android apps (APK files) on this server.'
    Write-Host "This adds $androidSize and makes the first setup take a few minutes longer."
    Write-Host "It downloads Google's Android SDK. Answering yes means you accept Google's Android SDK License:"
    Write-Host "  $androidLicense"
    Write-Host 'You can change your answer later by running this installer again.'
    $hint = if ($current -eq '1') { 'Y/n' } else { 'y/N' }
    while ($true) {
      $answer = "$(Read-Host "Do you want to build Android apps (APK files) from your server? [$hint]")".Trim()
      if (!$answer) { $android = $current; break }
      $android = ConvertTo-YesNo $answer
      if ($android -ne '?') { break }
      Write-Host 'Please type y or n.'
    }
  } else { $android = $current }
  if ($android -eq '1' -and (Get-DockerArch) -match '^(aarch64|arm)') {
    Write-Host "Android APK building needs an Intel or AMD (x86-64) processor. This computer's is ARM, so it stays off."
    Write-Host 'The Mobile App tab can still download the Android source project.'
    $android = '0'
  }
  if ($android -eq '1') { Write-Host "Android APK building: on. You accept Google's Android SDK License: $androidLicense" }
  else { Write-Host 'Android APK building: off. Run this installer again to turn it on.' }

  if (!$haveEnv) {
    $secrets = @(New-Secret 5)
    $content = "PUBLIC_BASE_URL=$($address.TrimEnd('/'))`nAPP_PORT=3001`nBIND_ADDRESS=127.0.0.1`nDB_PASSWORD=$($secrets[0])`nAUTH_SECRET=$($secrets[1])`nINSTALL_TOKEN=$($secrets[2])`nCRON_SECRET=$($secrets[3])`nNK_TLS_ASK_SECRET=$($secrets[4])`nAI_PROVIDER=openai`nOPENAI_SCAFFOLD_MODEL=gpt-6-luna`nOPENAI_EDIT_MODEL=gpt-6-luna`nNULLKODE_ANDROID=$android`n"
    $stream = [IO.File]::Open((Join-Path (Get-Location) '.env'), [IO.FileMode]::CreateNew)
    try { $bytes = [Text.Encoding]::UTF8.GetBytes($content); $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
  } elseif ((Get-EnvValue 'NULLKODE_ANDROID') -ne $android) {
    Set-EnvValue 'NULLKODE_ANDROID' $android
    Write-Host "Saved your choice in .env: NULLKODE_ANDROID=$android"
  }

  # Save the web address answers. Every other line of .env stays as it is.
  $script:savedKeys = ''
  if ($https -eq '1') {
    Update-EnvValue 'PUBLIC_BASE_URL' "https://$domain"
    Update-EnvValue 'COMPOSE_PROFILES' 'https'
    Update-EnvValue 'NK_AUTO_TLS' '1'
    Update-EnvValue 'NK_TLS_EMAIL' $tlsEmail
    Update-EnvValue 'APPS_DOMAIN' $appsDomain
  } elseif ($savedHttps -eq '1') {
    Update-EnvValue 'PUBLIC_BASE_URL' $address.TrimEnd('/')
    Update-EnvValue 'COMPOSE_PROFILES' ''
    Update-EnvValue 'NK_AUTO_TLS' '0'
    Update-EnvValue 'APPS_DOMAIN' ''
  }
  # Lets Caddy ask the app which addresses may get a certificate. Made once.
  if ((Get-EnvValue 'NK_TLS_ASK_SECRET').Length -lt 32) { Update-EnvValue 'NK_TLS_ASK_SECRET' @(New-Secret 1)[0] }
  if ($script:savedKeys) { Write-Host "Saved your choices in .env:$($script:savedKeys)" }

  foreach ($key in @('AUTH_SECRET','INSTALL_TOKEN','DB_PASSWORD','CRON_SECRET','NK_TLS_ASK_SECRET')) {
    $value = Get-EnvValue $key
    if ($value.Length -lt 32 -or $value -match 'replace') { throw "Your .env needs a random $key of at least 32 characters. See START-HERE.md." }
  }
  # Compose prefers this process's values over .env, so pass on the normalized ones.
  $env:NULLKODE_ANDROID = $android
  $env:COMPOSE_PROFILES = Get-EnvValue 'COMPOSE_PROFILES'
  if ($https -eq '1') {
    if (!(Test-CaddyRunning)) {
      $httpPort = if ("$env:HTTP_PORT".Trim()) { "$env:HTTP_PORT".Trim() } elseif (Get-EnvValue 'HTTP_PORT') { Get-EnvValue 'HTTP_PORT' } else { '80' }
      $httpsPort = if ("$env:HTTPS_PORT".Trim()) { "$env:HTTPS_PORT".Trim() } elseif (Get-EnvValue 'HTTPS_PORT') { Get-EnvValue 'HTTPS_PORT' } else { '443' }
      foreach ($p in @($httpPort, $httpsPort)) {
        if (Test-PortInUse ([int]$p)) { throw "Another program on this computer already uses port $p, which HTTPS needs. Usually that is another web server. Stop it and run this installer again, or answer n and put Nullkode behind that web server instead (START-HERE.md, `"Put it on a public domain`")." }
      }
    }
    if ((Get-EnvValue 'BIND_ADDRESS') -eq '0.0.0.0') {
      Write-Host "Note: BIND_ADDRESS=0.0.0.0 in .env also lets people open the app without HTTPS on port $(Get-EnvValue 'APP_PORT'). Set BIND_ADDRESS=127.0.0.1 unless you need that."
    }
  } else {
    # Without a domain name, stop the HTTPS web server if an earlier setup started it.
    Remove-Caddy
  }
  if ($android -eq '1') { Write-Host 'Building and starting Nullkode with the Android tools. The first download can take 10 minutes or more.' }
  else { Write-Host 'Building and starting Nullkode. The first download can take several minutes.' }
  docker compose up --build -d --wait --wait-timeout 240
  if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Read START-HERE.md (Troubleshooting). Your saved data has not been deleted.' }
  if ($https -eq '1') {
    # Start the HTTPS web server afresh so it reads the current Caddyfile.
    docker compose up -d --no-deps --force-recreate caddy
    if ($LASTEXITCODE -ne 0) { throw 'The HTTPS web server did not start. Read START-HERE.md (Troubleshooting). Your saved data has not been deleted.' }
    $url = "$(Get-EnvValue 'PUBLIC_BASE_URL')/install"
    Write-Host "Ready! Open $url"
    Write-Host 'The first visit can take up to a minute while the secure certificate is made.'
    Write-Host "If the page doesn't open, check the DNS records shown above and that ports 80 and 443 are open."
  } else {
    $port = Get-EnvValue 'APP_PORT'
    if (!$port) { $port = '3001' }
    $url = "http://localhost:$port/install"
  }
  Write-Host "Your private setup code: $(Get-EnvValue 'INSTALL_TOKEN')"
  if ($android -eq '1') { Write-Host 'Android APK building is on: open an app, then Mobile App, then Build APK.' }
  if ($https -ne '1') { Write-Host 'To use a domain name with automatic HTTPS, run this installer again on your server and answer y.' }
  Start-Process $url
} catch { Write-Host $_ -ForegroundColor Red; exit 1 }
