import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import type { PartnerKey } from "@prisma/client";
import { db } from "../db";
import { subscribe } from "../ai/runs";
import { decryptSecret, encryptSecret } from "../settings";
import { webhookOf, type WebhookConfig } from "./keys";
import { runView, scopedRun } from "./runs";

/**
 * Build-finished webhooks. A key can have a callback URL; when a build it
 * started ends, the URL gets a POST with the run (the same shape as
 * GET /runs/{id}), signed with the key's webhook secret:
 *
 *   X-NK-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<body>")>
 *
 * Delivery is retried (5 attempts over about 35 minutes) until the endpoint
 * answers 2xx. It is best effort: the process that started the build sends
 * it, so a build interrupted by a restart is not reported (it shows as
 * failed in GET /runs/{id}). Keys made by resellers may only call public
 * HTTPS addresses; the operator's keys may also call private ones.
 */

const RETRY_DELAYS_MS = [0, 10_000, 60_000, 5 * 60_000, 30 * 60_000];

export function newWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function webhookConfig(url: string, secret: string, allowPrivate: boolean): WebhookConfig {
  return { url, secret: encryptSecret(secret), allowPrivate };
}

/** A URL a webhook may be sent to, or null. */
export function validWebhookUrl(raw: unknown, allowPrivate: boolean): string | null {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  try {
    const u = new URL(raw.trim());
    if (u.username || u.password) return null;
    if (u.protocol !== "https:" && !(allowPrivate && u.protocol === "http:")) return null;
    if (!allowPrivate && isIP(u.hostname.replace(/^\[|\]$/g, "")) && isPrivateAddress(u.hostname.replace(/^\[|\]$/g, ""))) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const PRIVATE = new BlockList();
for (const [net, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) {
  PRIVATE.addSubnet(net, bits, "ipv4");
}
for (const [net, bits] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["::ffff:0:0", 96], ["64:ff9b::", 96]] as const) {
  PRIVATE.addSubnet(net, bits, "ipv6");
}

export function isPrivateAddress(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1];
  if (mapped) return PRIVATE.check(mapped, "ipv4");
  const family = isIP(ip);
  if (!family) return true;
  return PRIVATE.check(ip, family === 6 ? "ipv6" : "ipv4");
}

/** Sends one signed POST; resolves to the status code (0 when it couldn't connect or was refused). */
async function post(hook: WebhookConfig, body: string, deliveryId: string, event: string): Promise<number> {
  const url = new URL(hook.url);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  // The address is checked and then pinned for the request itself, so a DNS
  // answer can't change between the check and the connection.
  let address: string;
  let family: number;
  try {
    const found = isIP(host) ? { address: host, family: isIP(host) } : await lookup(host);
    address = found.address;
    family = found.family;
  } catch {
    return 0;
  }
  if (!hook.allowPrivate && isPrivateAddress(address)) return 0;
  const secret = decryptSecret(hook.secret);
  if (!secret) return 0;
  const ts = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  const mod = url.protocol === "https:" ? https : http;
  return new Promise((resolve) => {
    const req = mod.request(
      url,
      {
        method: "POST",
        lookup: (_h: string, _o: unknown, cb: (err: Error | null, address: string, family: number) => void) => cb(null, address, family),
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "user-agent": "partner-webhooks/1",
          "x-nk-event": event,
          "x-nk-delivery": deliveryId,
          "x-nk-signature": `t=${ts},v1=${signature}`,
        },
        timeout: 10_000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", () => resolve(0));
    req.end(body);
  });
}

async function deliver(keyId: string, runId: string): Promise<void> {
  const deliveryId = randomUUID();
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt]) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]).unref?.());
    // Re-read every time: a revoked key or a removed webhook stops the retries.
    const key = await db.partnerKey.findUnique({ where: { id: keyId } }).catch(() => null);
    const hook = key && !key.revokedAt ? webhookOf(key) : null;
    if (!key || !hook) return;
    const run = await scopedRun(key, runId).catch(() => null);
    if (!run || run.status === "running") return;
    const event = run.status === "success" ? "build.succeeded" : "build.failed";
    const body = JSON.stringify({ id: deliveryId, type: event, createdAt: new Date().toISOString(), attempt: attempt + 1, data: { run: await runView(run) } });
    const status = await post(hook, body, deliveryId, event).catch(() => 0);
    console.log(`[partner] ${JSON.stringify({ webhook: event, keyId, runId, deliveryId, attempt: attempt + 1, status })}`);
    if (status >= 200 && status < 300) return;
  }
}

/** Sends the key's webhook when this build ends (if the key has one). */
export function watchBuild(key: Pick<PartnerKey, "id" | "webhook">, runId: string): void {
  if (!webhookOf(key)) return;
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    void deliver(key.id, runId).catch((err) => console.error("[partner] webhook failed", err instanceof Error ? err.message : err));
  };
  void subscribe(runId, { onEvent: () => {}, onEnd: () => setTimeout(fire, 250) }).catch(() => {});
}
