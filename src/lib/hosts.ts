// Host classification shared by the middleware (edge runtime — keep this file
// free of Node/DB imports) and server code.

const PLATFORM_HOSTS = new Set(["localhost", "127.0.0.1"]);

try {
  if (process.env.PUBLIC_BASE_URL) {
    const base = new URL(process.env.PUBLIC_BASE_URL).hostname.toLowerCase();
    PLATFORM_HOSTS.add(base);
    // The hosted nullkode.com service also answers on these names. Other
    // installs mustn't treat them as their own.
    if (base === "nullkode.com" || base.endsWith(".nullkode.com")) {
      for (const h of ["nullkode.com", "www.nullkode.com", "ipv4.nullkode.com"]) PLATFORM_HOSTS.add(h);
    }
  }
} catch {
  // Setup reports an invalid base URL.
}
// The address the Android preview phones use to reach this server (e.g.
// http://10.0.2.2:3001) is the studio too, not an app's own domain.
try {
  if (process.env.NK_EMU_EXPO_ORIGIN) PLATFORM_HOSTS.add(new URL(process.env.NK_EMU_EXPO_ORIGIN).hostname.toLowerCase());
} catch {
  // Ignored: the emulator page reports a bad origin.
}
// Extra names for this studio, comma-separated (e.g. "www.example.com").
for (const h of (process.env.PLATFORM_HOST_ALIASES ?? "").split(",")) {
  const name = h.trim().toLowerCase();
  if (name) PLATFORM_HOSTS.add(name);
}

/** Lower-cased hostname without port, from a Host header value. */
export function normalizeHost(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().split(":")[0].replace(/\.$/, "");
}

/**
 * The studio's own origins (PUBLIC_BASE_URL and its aliases, same scheme and
 * port), e.g. for a CSP frame-ancestors list. Empty when PUBLIC_BASE_URL isn't set.
 */
export function studioOrigins(): string[] {
  let base: URL;
  try {
    base = new URL(process.env.PUBLIC_BASE_URL ?? "");
  } catch {
    return [];
  }
  const port = base.port ? `:${base.port}` : "";
  const own = base.hostname.toLowerCase();
  // Not the emulators' way in (NK_EMU_EXPO_ORIGIN): nobody uses the studio there.
  let emulator = "";
  try {
    emulator = process.env.NK_EMU_EXPO_ORIGIN ? new URL(process.env.NK_EMU_EXPO_ORIGIN).hostname.toLowerCase() : "";
  } catch {
    // Not a URL.
  }
  return [...PLATFORM_HOSTS]
    .filter((h) => h === own || (!["localhost", "127.0.0.1"].includes(h) && h !== emulator))
    .map((h) => `${base.protocol}//${h}${port}`);
}

/** The operator's own domains, where the dashboard runs under the platform brand. */
export function isPlatformHost(host: string): boolean {
  return PLATFORM_HOSTS.has(host);
}

/** A plausible public hostname (letters, digits, hyphens, at least one dot). */
export function isValidDomainName(host: string): boolean {
  return host.length <= 253 && /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(host) && !/^\d+(\.\d+){3}$/.test(host);
}

/**
 * Optional separate domain for published apps: each app is served at
 * https://<label>.<APPS_DOMAIN>, its own web origin, so an app's pages can
 * never act on the dashboard or on other apps. Needs a wildcard DNS record
 * (*.APPS_DOMAIN) pointing at this server.
 */
const APPS_DOMAIN = (() => {
  const raw = (process.env.APPS_DOMAIN ?? "").trim();
  if (!raw) return "";
  try {
    return normalizeHost(raw.includes("://") ? new URL(raw).host : raw);
  } catch {
    return "";
  }
})();

export function appsDomain(): string | null {
  return APPS_DOMAIN || null;
}

/** "<label>.<APPS_DOMAIN>" → label; null for any other host. */
export function appLabelFromHost(host: string): string | null {
  if (!APPS_DOMAIN || !host.endsWith(`.${APPS_DOMAIN}`)) return null;
  const label = host.slice(0, -(APPS_DOMAIN.length + 1));
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label) ? label : null;
}
