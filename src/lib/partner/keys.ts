import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { BlockList, isIP } from "node:net";
import type { PartnerKey, Prisma, Reseller } from "@prisma/client";
import { db } from "../db";
import { isSameServerRequest } from "../same-server";

/**
 * Partner API keys. A key is `nk_live_<random>`; only its SHA-256 is stored.
 * The first 8 characters of the random part (the "prefix") find the row and
 * identify the key in lists; the full hash is then compared in constant time.
 *
 * Each key has
 *  - a scope: one reseller (its clients only) or the platform (the
 *    operator's own customers: ordinary accounts that belong to no reseller);
 *  - permissions: users, sso, build, publish, usage (all on by default);
 *  - a network rule: same server only (no allowedIps, the default) or a list
 *    of IPs/CIDRs matched against the trusted client address (X-Real-IP, set
 *    by the reverse proxy; never X-Forwarded-For).
 */

export const KEY_PREFIX = "nk_live_";
export const PERMISSIONS = ["users", "sso", "build", "publish", "usage"] as const;
export type Permission = (typeof PERMISSIONS)[number];
export type Permissions = Record<Permission, boolean>;

export const ALL_PERMISSIONS: Permissions = { users: true, sso: true, build: true, publish: true, usage: true };

export type KeyWithReseller = PartnerKey & { reseller: Pick<Reseller, "id" | "name" | "ownerId" | "status" | "maxAiActions" | "maxClients"> | null };

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** A new key: the secret (shown once) and what is stored. */
export function generateKey(): { raw: string; prefix: string; hash: string } {
  // 32 random bytes; base64url without "-" and "_" so the key is one word
  // (double-click selects it whole) and the prefix is plain letters/digits.
  let random = "";
  while (random.length < 43) random += randomBytes(48).toString("base64").replace(/[^A-Za-z0-9]/g, "");
  random = random.slice(0, 43);
  const raw = `${KEY_PREFIX}${random}`;
  return { raw, prefix: random.slice(0, 8), hash: hashKey(raw) };
}

export function normalizePermissions(input: unknown, base: Permissions = ALL_PERMISSIONS): Permissions {
  const out = { ...base };
  if (input && typeof input === "object") {
    for (const p of PERMISSIONS) {
      const v = (input as Record<string, unknown>)[p];
      if (typeof v === "boolean") out[p] = v;
    }
  }
  return out;
}

export function keyPermissions(key: Pick<PartnerKey, "permissions">): Permissions {
  return normalizePermissions(key.permissions, { users: false, sso: false, build: false, publish: false, usage: false });
}

/* ── Network rules ─────────────────────────────────────────── */

/** "203.0.113.7" or "10.0.0.0/8" or "2001:db8::/32"; null when it isn't one. */
export function normalizeIpRule(entry: string): string | null {
  const s = entry.trim();
  if (!s) return null;
  const [addr, bits, extra] = s.split("/");
  if (extra !== undefined) return null;
  const family = isIP(addr);
  if (!family) return null;
  if (bits === undefined) return addr.toLowerCase();
  if (!/^\d{1,3}$/.test(bits)) return null;
  const n = Number(bits);
  if (n > (family === 4 ? 32 : 128)) return null;
  return `${addr.toLowerCase()}/${n}`;
}

/** Parses a list of rules; `bad` lists the entries that aren't IPs or CIDRs. */
export function parseIpRules(input: unknown): { rules: string[]; bad: string[] } {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[\s,;]+/) : [];
  const rules: string[] = [];
  const bad: string[] = [];
  for (const item of list) {
    if (typeof item !== "string" || !item.trim()) continue;
    const r = normalizeIpRule(item);
    if (r) {
      if (!rules.includes(r)) rules.push(r);
    } else bad.push(String(item).slice(0, 60));
  }
  return { rules: rules.slice(0, 50), bad };
}

function ipMatches(ip: string, rules: string[]): boolean {
  const family = isIP(ip);
  if (!family) return false;
  const list = new BlockList();
  for (const r of rules) {
    const [addr, bits] = r.split("/");
    const f = isIP(addr) === 6 ? "ipv6" : "ipv4";
    try {
      if (bits === undefined) list.addAddress(addr, f);
      else list.addSubnet(addr, Number(bits), f);
    } catch {
      // Skip a rule Node can't read.
    }
  }
  // "::ffff:1.2.3.4" is the IPv4 address 1.2.3.4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1];
  if (mapped) return list.check(mapped, "ipv4") || list.check(ip, "ipv6");
  return list.check(ip, family === 6 ? "ipv6" : "ipv4");
}

/**
 * The address a partner request comes from, for its key's network rule:
 * the proxy's X-Real-IP, or "127.0.0.1" for a call made on this server
 * itself (no proxy headers at all, see lib/same-server.ts). Null when it
 * can't be trusted (forwarded headers without X-Real-IP).
 */
export function partnerClientIp(req: Request): string | null {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return isIP(real) ? real : null;
  return isSameServerRequest(req) ? "127.0.0.1" : null;
}

/** Whether the key may be used from where this request came from. */
export function networkAllows(key: Pick<PartnerKey, "allowedIps">, req: Request): boolean {
  const rules = key.allowedIps ?? [];
  if (rules.length === 0) return isSameServerRequest(req);
  const ip = partnerClientIp(req);
  return ip !== null && ipMatches(ip, rules);
}

/* ── Authentication ────────────────────────────────────────── */

const DUMMY_HASH = hashKey(`${KEY_PREFIX}not-a-real-key`);

export type AuthFailure = "missing" | "invalid" | "revoked" | "suspended";

/** The key behind an Authorization header, or why there isn't one. */
export async function authenticateKey(header: string | null): Promise<{ key: KeyWithReseller } | { failure: AuthFailure }> {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  if (!m) return { failure: "missing" };
  const raw = m[1];
  const random = raw.startsWith(KEY_PREFIX) ? raw.slice(KEY_PREFIX.length) : "";
  const prefix = /^[A-Za-z0-9]{43}$/.test(random) ? random.slice(0, 8) : null;
  const row = prefix
    ? await db.partnerKey.findUnique({
        where: { prefix },
        include: { reseller: { select: { id: true, name: true, ownerId: true, status: true, maxAiActions: true, maxClients: true } } },
      })
    : null;
  // Compare against something either way, so a wrong prefix takes as long as a wrong key.
  const expected = Buffer.from(row?.hash ?? DUMMY_HASH, "hex");
  const given = Buffer.from(hashKey(raw), "hex");
  const same = expected.length === given.length && timingSafeEqual(expected, given);
  if (!row || !same) return { failure: "invalid" };
  if (row.revokedAt) return { failure: "revoked" };
  if (row.resellerId && (!row.reseller || row.reseller.status !== "ACTIVE")) return { failure: "suspended" };
  return { key: row };
}

const lastUsedWrites = new Map<string, number>();

/** Records that the key was used (at most once a minute per key). */
export function noteKeyUsed(keyId: string): void {
  const now = Date.now();
  const last = lastUsedWrites.get(keyId);
  if (last !== undefined && now - last < 60_000) return;
  lastUsedWrites.set(keyId, now);
  void db.partnerKey.update({ where: { id: keyId }, data: { lastUsedAt: new Date() } }).catch(() => {});
}

/* ── Management (admin and reseller screens) ───────────────── */

export type KeyView = {
  id: string;
  name: string;
  prefix: string;
  scope: { type: "reseller"; resellerId: string; resellerName: string } | { type: "platform" };
  permissions: Permissions;
  allowedIps: string[];
  webhookUrl: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
};

export type WebhookConfig = { url: string; secret: string; allowPrivate?: boolean };

export function webhookOf(key: Pick<PartnerKey, "webhook">): WebhookConfig | null {
  const w = key.webhook as Partial<WebhookConfig> | null;
  return w && typeof w.url === "string" && typeof w.secret === "string" ? (w as WebhookConfig) : null;
}

export function keyView(key: PartnerKey & { reseller?: Pick<Reseller, "id" | "name"> | null }): KeyView {
  return {
    id: key.id,
    name: key.name,
    prefix: `${KEY_PREFIX}${key.prefix}`,
    scope: key.resellerId ? { type: "reseller", resellerId: key.resellerId, resellerName: key.reseller?.name ?? "" } : { type: "platform" },
    permissions: keyPermissions(key),
    allowedIps: key.allowedIps,
    webhookUrl: webhookOf(key)?.url ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    rotatedAt: key.rotatedAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
  };
}

/** Creates a key, retrying on the (unlikely) prefix clash. Returns the row and the secret, shown once. */
export async function createKey(data: Omit<Prisma.PartnerKeyUncheckedCreateInput, "prefix" | "hash">): Promise<{ key: PartnerKey; raw: string }> {
  for (let attempt = 0; ; attempt++) {
    const { raw, prefix, hash } = generateKey();
    try {
      const key = await db.partnerKey.create({ data: { ...data, prefix, hash } });
      return { key, raw };
    } catch (err) {
      if (attempt >= 4 || (err as { code?: string }).code !== "P2002") throw err;
    }
  }
}

/** A new secret for the same key; the old one stops working at once. */
export async function rotateKey(id: string): Promise<{ key: PartnerKey; raw: string }> {
  for (let attempt = 0; ; attempt++) {
    const { raw, prefix, hash } = generateKey();
    try {
      const key = await db.partnerKey.update({ where: { id }, data: { prefix, hash, rotatedAt: new Date() } });
      return { key, raw };
    } catch (err) {
      if (attempt >= 4 || (err as { code?: string }).code !== "P2002") throw err;
    }
  }
}
