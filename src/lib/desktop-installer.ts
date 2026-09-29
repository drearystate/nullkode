/**
 * The desktop "installers" for a published app (see
 * src/app/api/projects/[id]/installer/[platform]/route.ts). Nothing is
 * installed in the traditional sense: each script adds shortcuts that open
 * the published address as an app-style window.
 *
 *   windows → a .bat that writes .lnk shortcuts targeting Edge or Chrome in
 *             --app mode, or a plain .url file when neither is found.
 *   mac     → a .command that builds a small .app bundle on the Desktop
 *             whose program opens the address in the default browser.
 *
 * App names come from the owner, so every value is escaped for the language
 * it lands in: XML for Info.plist, single quotes for bash, %% for cmd.exe.
 * White-label: the header names the owner's brand (their reseller's for a
 * reseller's clients), never this platform.
 */

export type InstallerInput = {
  /** The app's name, as the owner typed it. */
  appName: string;
  /** The published address the shortcuts open. */
  url: string;
  /** The brand shown in the file's header comment. */
  brandName: string;
};

/** Characters no file name on Windows or macOS may contain, plus control characters. */
const UNSAFE_FILENAME = /[\u0000-\u001f\u007f\\/:*?"<>|]/g;

/** A name that works as a file or folder name on Windows and macOS. */
export function installerFileName(name: string): string {
  const clean = name.replace(UNSAFE_FILENAME, "").replace(/\s+/g, " ").trim().slice(0, 80);
  // Windows drops trailing dots and spaces, and a leading dot hides the file on a Mac.
  return clean.replace(/[. ]+$/, "").replace(/^\.+/, "").trim() || "My App";
}

/** Text for a one-line comment: no line breaks and none of the characters cmd.exe treats specially. */
function commentText(s: string): string {
  return s.replace(/[\u0000-\u001f\u007f%!^&|<>"]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * The address as plain ASCII with no quote, percent-sign-free punctuation
 * that a shell or cmd.exe could act on: anything unusual is percent-encoded.
 */
export function installerUrl(url: string): string {
  let href: string;
  try {
    href = new URL(url).href;
  } catch {
    href = "https://example.invalid/";
  }
  return href.replace(/[^A-Za-z0-9:/?#=._~%-]/g, (c) =>
    Array.from(new TextEncoder().encode(c), (b) => `%${b.toString(16).toUpperCase().padStart(2, "0")}`).join(""),
  );
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A bash word that is never expanded: single quotes, with ' written as '\''. */
export function bashQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** cmd.exe expands %NAME% even inside quotes; %% is a literal percent sign. */
function batchValue(s: string): string {
  return s.replace(/%/g, "%%");
}

export function windowsInstaller({ appName, url, brandName }: InstallerInput): string {
  const name = installerFileName(appName);
  const lines = `@echo off
rem ${commentText(name) || "App"} - desktop shortcut installer from ${commentText(brandName) || "your app builder"}
rem Adds Desktop and Start Menu shortcuts that open the app in its own window.
rem Read app names as UTF-8, so names with accents or other scripts come out right.
chcp 65001 >nul
setlocal DisableDelayedExpansion

set "APPURL=${batchValue(installerUrl(url))}"
set "APPNAME=${batchValue(name)}"

set "BROWSER="
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"

if defined BROWSER (
  powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('StartMenu') + '\\Programs')) {" ^
    "  $lnk = $ws.CreateShortcut((Join-Path $dir ($env:APPNAME + '.lnk')));" ^
    "  $lnk.TargetPath = $env:BROWSER;" ^
    "  $lnk.Arguments = '--app=' + $env:APPURL;" ^
    "  $lnk.Description = $env:APPNAME;" ^
    "  $lnk.Save();" ^
    "}"
  echo Installed: "%APPNAME%" shortcuts added to your Desktop and Start Menu.
) else (
  rem No Edge or Chrome: a plain internet shortcut opens the default browser.
  (
    echo [InternetShortcut]
    echo URL=%APPURL%
  ) > "%UserProfile%\\Desktop\\%APPNAME%.url"
  echo Installed: "%APPNAME%" link added to your Desktop.
)

echo.
echo You can delete this installer file now.
pause
`;
  // cmd.exe expects Windows line endings.
  return lines.replace(/\r?\n/g, "\r\n");
}

export function macInstaller({ appName, url, brandName, bundleId }: InstallerInput & { bundleId: string }): string {
  const name = installerFileName(appName);
  const href = installerUrl(url);
  return `#!/bin/bash
# ${commentText(name) || "App"} - desktop app installer from ${commentText(brandName) || "your app builder"}
# Builds a small app on your Desktop that opens the app.
set -e
NAME=${bashQuote(name)}
APP="$HOME/Desktop/$NAME.app"
mkdir -p "$APP/Contents/MacOS"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>${xmlEscape(name)}</string>
  <key>CFBundleDisplayName</key><string>${xmlEscape(name)}</string>
  <key>CFBundleExecutable</key><string>launch</string>
  <key>CFBundleIdentifier</key><string>${xmlEscape(bundleId)}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
</dict></plist>
PLIST
cat > "$APP/Contents/MacOS/launch" <<'RUN'
#!/bin/bash
open ${bashQuote(href)}
RUN
chmod +x "$APP/Contents/MacOS/launch"
echo "Installed: $NAME is now on your Desktop."
echo "You can delete this installer file now."
`;
}
