import { getTranslations } from "next-intl/server";
import { db } from "../db";
import { getRealUser } from "../auth";
import { json } from "../utils";
import { requestLocale } from "@/i18n/request";
import { createKey, keyView, normalizePermissions, parseIpRules, rotateKey, webhookOf, ALL_PERMISSIONS } from "./keys";
import { newWebhookSecret, validWebhookUrl, webhookConfig } from "./webhooks";

/**
 * Managing partner keys, shared by Admin → Partner API (the operator: any
 * scope) and Reseller → Partner API (a reseller: keys for its own clients).
 * Secrets (the key, the webhook signing secret) are returned once, when made.
 */

export type Actor = { kind: "admin"; userId: string } | { kind: "reseller"; userId: string; resellerId: string };

type T = Awaited<ReturnType<typeof getTranslations<"partner.manage">>>;

export async function manageT(): Promise<T> {
  return getTranslations({ locale: await requestLocale(), namespace: "partner.manage" });
}

/** The signed-in operator, or a reseller (the real user, never an impersonated one). */
export async function partnerActor(kind: Actor["kind"]): Promise<{ actor: Actor } | { error: Response }> {
  const t = await manageT();
  const user = await getRealUser();
  if (kind === "admin") {
    if (user?.role !== "ADMIN") return { error: json({ error: t("forbidden") }, { status: 403 }) };
    return { actor: { kind: "admin", userId: user.id } };
  }
  if (user?.role !== "RESELLER") return { error: json({ error: t("forbidden") }, { status: 403 }) };
  const reseller = await db.reseller.findUnique({ where: { ownerId: user.id }, select: { id: true, status: true } });
  if (!reseller || reseller.status !== "ACTIVE") return { error: json({ error: t("forbidden") }, { status: 403 }) };
  return { actor: { kind: "reseller", userId: user.id, resellerId: reseller.id } };
}

function visibleWhere(actor: Actor) {
  return actor.kind === "admin" ? {} : { resellerId: actor.resellerId };
}

export async function listKeys(actor: Actor) {
  const rows = await db.partnerKey.findMany({
    where: visibleWhere(actor),
    orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    include: { reseller: { select: { id: true, name: true } } },
  });
  return rows.map(keyView);
}

async function findKey(actor: Actor, id: string) {
  return db.partnerKey.findFirst({ where: { id, ...visibleWhere(actor) }, include: { reseller: { select: { id: true, name: true } } } });
}

function readIps(input: unknown, t: T): { rules: string[] } | { error: Response } {
  const { rules, bad } = parseIpRules(input);
  if (bad.length) return { error: json({ error: t("badIps", { list: bad.slice(0, 5).join(", ") }) }, { status: 400 }) };
  return { rules };
}

export async function createKeyFor(actor: Actor, body: Record<string, unknown>): Promise<Response> {
  const t = await manageT();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) return json({ error: t("nameRequired") }, { status: 400 });
  let resellerId: string | null;
  if (actor.kind === "reseller") resellerId = actor.resellerId;
  else if (body.scope === "platform") resellerId = null;
  else if (typeof body.resellerId === "string" && (await db.reseller.findUnique({ where: { id: body.resellerId }, select: { id: true } }))) resellerId = body.resellerId;
  else return json({ error: t("badScope") }, { status: 400 });
  const ips = readIps(body.allowedIps ?? [], t);
  if ("error" in ips) return ips.error;
  const { key, raw } = await createKey({
    name,
    resellerId,
    permissions: normalizePermissions(body.permissions, ALL_PERMISSIONS),
    allowedIps: ips.rules,
    createdById: actor.userId,
  });
  console.log(`[partner] ${JSON.stringify({ manage: "create", keyId: key.id, key: key.prefix, by: actor.userId, scope: resellerId ?? "platform" })}`);
  const full = await findKey(actor, key.id);
  return json({ key: keyView(full ?? key), secret: raw }, { status: 201 });
}

export async function updateKeyFor(actor: Actor, id: string, body: Record<string, unknown>): Promise<Response> {
  const t = await manageT();
  const key = await findKey(actor, id);
  if (!key) return json({ error: t("notFound") }, { status: 404 });
  if (key.revokedAt) return json({ error: t("revoked") }, { status: 409 });
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) return json({ error: t("nameRequired") }, { status: 400 });
    data.name = name;
  }
  if (body.permissions !== undefined) data.permissions = normalizePermissions(body.permissions, normalizePermissions(key.permissions));
  if (body.allowedIps !== undefined) {
    const ips = readIps(body.allowedIps, t);
    if ("error" in ips) return ips.error;
    data.allowedIps = ips.rules;
  }
  let webhookSecret: string | undefined;
  if (body.webhookUrl !== undefined) {
    if (body.webhookUrl === null || body.webhookUrl === "") {
      data.webhook = null;
    } else {
      const allowPrivate = actor.kind === "admin";
      const url = validWebhookUrl(body.webhookUrl, allowPrivate);
      if (!url) return json({ error: allowPrivate ? t("badWebhookAdmin") : t("badWebhook") }, { status: 400 });
      const current = webhookOf(key);
      // A new secret when the webhook is first set or when asked for one.
      if (!current || body.newWebhookSecret === true) {
        webhookSecret = newWebhookSecret();
        data.webhook = webhookConfig(url, webhookSecret, allowPrivate);
      } else {
        data.webhook = { ...current, url, allowPrivate };
      }
    }
  }
  const updated = await db.partnerKey.update({ where: { id: key.id }, data: data as never, include: { reseller: { select: { id: true, name: true } } } });
  console.log(`[partner] ${JSON.stringify({ manage: "update", keyId: key.id, key: updated.prefix, by: actor.userId, fields: Object.keys(data) })}`);
  return json({ key: keyView(updated), ...(webhookSecret ? { webhookSecret } : {}) });
}

export async function rotateKeyFor(actor: Actor, id: string): Promise<Response> {
  const t = await manageT();
  const key = await findKey(actor, id);
  if (!key) return json({ error: t("notFound") }, { status: 404 });
  if (key.revokedAt) return json({ error: t("revoked") }, { status: 409 });
  const { key: rotated, raw } = await rotateKey(key.id);
  console.log(`[partner] ${JSON.stringify({ manage: "rotate", keyId: key.id, key: rotated.prefix, by: actor.userId })}`);
  return json({ key: keyView({ ...rotated, reseller: key.reseller }), secret: raw });
}

export async function revokeKeyFor(actor: Actor, id: string): Promise<Response> {
  const t = await manageT();
  const key = await findKey(actor, id);
  if (!key) return json({ error: t("notFound") }, { status: 404 });
  const updated = key.revokedAt ? key : await db.partnerKey.update({ where: { id: key.id }, data: { revokedAt: new Date() }, include: { reseller: { select: { id: true, name: true } } } });
  // Sign-in links it made stop working too.
  await db.partnerSsoTicket.deleteMany({ where: { keyId: key.id, usedAt: null } });
  console.log(`[partner] ${JSON.stringify({ manage: "revoke", keyId: key.id, key: key.prefix, by: actor.userId })}`);
  return json({ key: keyView(updated) });
}
