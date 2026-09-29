/**
 * Keeps private keys out of the files owners download (the backup export
 * and the offline bundle). Those files get emailed, shared and uploaded to
 * other tools, so they must not carry a Stripe secret key, an SMS token or an
 * API key.
 *
 * Module settings are copied into the app's flow steps when a module is
 * installed (for example "Bearer {{config.stripeSecret}}" becomes the real
 * key), so blanking the setting alone isn't enough: the same values are
 * blanked wherever they appear in the flows.
 */

/** Module settings that hold private keys (stripeSecret, twilioAuthToken, apiKey…). */
export const SECRET_SETTING = /secret|token|key|password/i;

/**
 * Table columns never copied into a downloaded file: passwords, password
 * hashes, secrets and tokens. The same rule as SENSITIVE_COLUMN in
 * src/lib/sensitive.ts.
 */
export const SENSITIVE_COLUMN_RE = /password|_hash$|secret|token/i;

/** Well-known private key formats, blanked wherever they were typed in: Stripe secret, restricted and webhook keys. */
const KNOWN_SECRET = /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{6,}|\bwhsec_[A-Za-z0-9]{6,}/g;

/** Request headers that carry credentials. */
const CREDENTIAL_HEADER = /^(?:authorization|proxy-authorization|x-api-key|api-key|apikey)$|secret|token|password/i;

/** Shorter values are too likely to match ordinary text to be blanked everywhere. */
const MIN_SECRET_LENGTH = 8;

export type RedactionReport = { removed: number };

export function newRedactionReport(): RedactionReport {
  return { removed: 0 };
}

/**
 * A module's settings with every private key blanked. The blanked values are
 * added to `secrets`, so redactFlowGraph can remove the copies in the flows.
 */
export function redactModuleConfig(config: unknown, secrets: Set<string>, report: RedactionReport): Record<string, unknown> {
  const source = config && typeof config === "object" && !Array.isArray(config) ? (config as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!SECRET_SETTING.test(key)) {
      out[key] = value;
      continue;
    }
    if (typeof value === "string" && value.trim().length >= MIN_SECRET_LENGTH) secrets.add(value.trim());
    if (value !== "" && value !== null && value !== undefined) report.removed += 1;
    out[key] = "";
  }
  return out;
}

function scrubString(value: string, secrets: Set<string>, report: RedactionReport): string {
  let out = value;
  for (const secret of secrets) {
    if (out.includes(secret)) {
      out = out.split(secret).join("");
      report.removed += 1;
    }
  }
  return out.replace(KNOWN_SECRET, () => {
    report.removed += 1;
    return "";
  });
}

function scrubDeep(value: unknown, secrets: Set<string>, report: RedactionReport): unknown {
  if (typeof value === "string") return scrubString(value, secrets, report);
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, secrets, report));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubDeep(v, secrets, report);
    return out;
  }
  return value;
}

/**
 * A flow graph with private keys removed from its steps: the values of the
 * app's secret module settings, well-known key formats, and credential
 * headers typed straight into a web-request step. Template values such as
 * "Bearer {{vars.token}}" are left alone: they hold no key themselves.
 */
export function redactFlowGraph(graph: unknown, secrets: Set<string>, report: RedactionReport): unknown {
  const scrubbed = scrubDeep(graph, secrets, report);
  if (!scrubbed || typeof scrubbed !== "object") return scrubbed;
  const nodes = (scrubbed as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) return scrubbed;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const data = (node as { data?: unknown }).data;
    if (!data || typeof data !== "object") continue;
    const headers = (data as { headers?: unknown }).headers;
    if (!headers || typeof headers !== "object" || Array.isArray(headers)) continue;
    for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
      if (!CREDENTIAL_HEADER.test(name) || typeof value !== "string") continue;
      if (value.includes("{{") || !value.replace(/^(?:bearer|basic|token)\s*/i, "").trim()) continue;
      (headers as Record<string, unknown>)[name] = "";
      report.removed += 1;
    }
  }
  return scrubbed;
}

/** A table row without passwords, hashes, secrets or tokens. */
export function redactRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of Object.keys(out)) {
    if (SENSITIVE_COLUMN_RE.test(key)) out[key] = null;
  }
  return out;
}
