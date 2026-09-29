/**
 * Keeping secrets out of stored flow runs and out of flow responses.
 *
 * - redactForLog: what a FlowRun row may hold. Password-like, token and card
 *   fields are masked at any depth, and so is the plain text of anything fed
 *   to a hash_password or verify_password step, wherever it shows up. Long
 *   values are shortened and the whole thing is capped at about 8 KB.
 * - scrubResponseBody: what a browser may receive. Password fields and
 *   password hashes are removed. Tokens, secrets and codes are left alone on
 *   purpose: abandoned-cart returns its resume token, and the coupon, ticket
 *   and referral features return the code the visitor just got.
 */

const MASK = "[hidden]";

/** Masked wherever it appears in a field name (shared with the Data tab's rules and more). */
const SECRET_KEY = /pass|pwd|secret|token|_hash$|card|cvc|cvv|iban/i;
/**
 * Short names that would also match ordinary words ("shipping", "opinion",
 * "footprint"), so they only count at the edges of a word of the field name:
 * pin, user_pin, userPin, securitypin, pincode, otp, otpCode, otpcode.
 */
const SECRET_WORD = /^(?:pin|pincode|otp|totp)$|(?:pin|otp)$|^otp/;
/** Values that are password hashes, whatever the field is called. */
const HASH_VALUE = /^\$(?:argon2(?:id|i|d)|2[abxy]?)\$/;

const MAX_DEPTH = 8;
const MAX_ITEMS = 50;
const MAX_KEYS = 100;
const MAX_STRING = 1000;
/** Secrets shorter than this are only masked when a whole value equals them. */
const MIN_EMBEDDED_SECRET = 6;
export const MAX_LOG_BYTES = 8 * 1024;

function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Whether a field with this name should never be stored in plain text. */
export function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key) || keyWords(key).some((w) => SECRET_WORD.test(w));
}

function maskString(s: string, secrets: ReadonlySet<string>): string {
  if (secrets.has(s) || HASH_VALUE.test(s)) return MASK;
  let out = s;
  for (const secret of secrets) {
    if (secret.length >= MIN_EMBEDDED_SECRET && out.includes(secret)) out = out.split(secret).join(MASK);
  }
  if (out.length > MAX_STRING) out = `${out.slice(0, MAX_STRING)}… [${out.length - MAX_STRING} more characters]`;
  return out;
}

function isPlainObject(v: object): boolean {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function redactValue(v: unknown, secrets: ReadonlySet<string>, depth: number, stack: Set<object>): unknown {
  if (v === null || v === undefined) return v ?? null;
  switch (typeof v) {
    case "string":
      return maskString(v, secrets);
    case "number":
      return Number.isFinite(v) ? v : String(v);
    case "boolean":
      return v;
    case "bigint":
      return v.toString();
    case "function":
    case "symbol":
      return null;
  }
  const obj = v as object;
  if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? null : obj.toISOString();
  if (typeof Blob !== "undefined" && obj instanceof Blob) {
    const name = (obj as { name?: unknown }).name;
    return `[file${typeof name === "string" && name ? ` ${name.slice(0, 120)}` : ""}, ${obj.size} bytes]`;
  }
  if (depth >= MAX_DEPTH) return "[…]";
  if (stack.has(obj)) return "[circular]";
  stack.add(obj);
  try {
    if (Array.isArray(obj)) {
      const out = obj.slice(0, MAX_ITEMS).map((x) => redactValue(x, secrets, depth + 1, stack));
      if (obj.length > MAX_ITEMS) out.push(`[${obj.length - MAX_ITEMS} more]`);
      return out;
    }
    if (obj instanceof Map) return redactValue(Object.fromEntries(obj), secrets, depth, stack);
    if (obj instanceof Set) return redactValue([...obj], secrets, depth, stack);
    if (!isPlainObject(obj) && typeof (obj as { toJSON?: unknown }).toJSON === "function") {
      return redactValue((obj as { toJSON: () => unknown }).toJSON(), secrets, depth, stack);
    }
    const entries = Object.entries(obj);
    const out: Record<string, unknown> = {};
    for (const [k, val] of entries.slice(0, MAX_KEYS)) {
      out[k] = isSecretKey(k) ? (val === null || val === undefined || val === "" ? val ?? null : MASK) : redactValue(val, secrets, depth + 1, stack);
    }
    if (entries.length > MAX_KEYS) out["[more]"] = `${entries.length - MAX_KEYS} more fields`;
    return out;
  } finally {
    stack.delete(obj);
  }
}

function utf8Prefix(s: string, maxBytes: number): string {
  const buf = Buffer.from(s, "utf8");
  if (buf.length <= maxBytes) return s;
  // Drop a partly cut character at the end.
  return buf.subarray(0, maxBytes).toString("utf8").replace(/\uFFFD$/, "");
}

/**
 * A copy of `value` that is safe to keep in the run log: secret fields and
 * the given plain-text secrets masked, long values shortened, and at most
 * about 8 KB in total. A value that is still too big after that is replaced
 * by `{ _truncated: true, bytes, preview }`.
 */
export function redactForLog(value: unknown, secrets: ReadonlySet<string> = new Set(), maxBytes = MAX_LOG_BYTES): unknown {
  const cleaned = redactValue(value, secrets, 0, new Set());
  let json: string;
  try {
    json = JSON.stringify(cleaned) ?? "null";
  } catch {
    return { _truncated: true, preview: "[this couldn't be saved]" };
  }
  const bytes = Buffer.byteLength(json, "utf8");
  if (bytes <= maxBytes) return cleaned;
  return { _truncated: true, bytes, preview: `${utf8Prefix(json, Math.max(256, maxBytes - 256))}…` };
}

/* ── Responses ─────────────────────────────────────────────────────────── */

const RESPONSE_SECRET_KEY = /password|_hash$/i;

function scrubString(s: string): string {
  if (!/password|_hash|\$argon2|\$2[abxy]?\$/i.test(s)) return s;
  return s
    .replace(/"(?:[^"\\]*password[^"\\]*|[^"\\]*_hash)"\s*:\s*(?:"(?:[^"\\]|\\.)*"|null|true|false|-?\d[\d.eE+-]*)\s*,?/gi, "")
    .replace(/\$argon2(?:id|i|d)\$[^\s"',}\]]*/g, MASK)
    .replace(/\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}/g, MASK);
}

function scrubValue(v: unknown, depth: number): unknown {
  if (typeof v === "string") return HASH_VALUE.test(v) ? MASK : v;
  if (!v || typeof v !== "object" || depth > 64) return v;
  if (Array.isArray(v)) return v.map((x) => scrubValue(x, depth + 1));
  if (!isPlainObject(v)) return v;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (RESPONSE_SECRET_KEY.test(k)) continue;
    out[k] = scrubValue(val, depth + 1);
  }
  return out;
}

/**
 * A flow response with password fields and password hashes taken out, at any
 * depth. Covers every flow at once (sign-in's "me", member lists, AI-made
 * flows, and a reply that sends back all of the flow's values).
 */
export function scrubResponseBody(body: unknown): unknown {
  if (typeof body === "string") return scrubString(body);
  return scrubValue(body, 0);
}
