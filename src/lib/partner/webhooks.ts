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
import { subscribeGame } from "../game-studio/events";
import { asFeatures } from "../game-studio/features";
import { featureCountsOf, gameCard, gameView, jobView, scopedGame } from "./games";

/**
 * Webhooks. A key can have a callback URL; when a build it started ends, the
 * URL gets a POST with the run (the same shape as GET /runs/{id}), and games
 * it builds send their steps, their end and their publishing (game.*), all
 * signed with the key's webhook secret:
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

/**
 * Sends one event to the key's webhook, retried until it answers 2xx. The key
 * is read again before every attempt (a revoked key or a removed webhook
 * stops the retries); `payload` gives the event and its data for this
 * attempt, or null to send nothing.
 */
async function deliverWithRetries(keyId: string, payload: (key: PartnerKey) => Promise<{ event: string; data: unknown } | null>, log: Record<string, string>): Promise<void> {
  const deliveryId = randomUUID();
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt]) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]).unref?.());
    const key = await db.partnerKey.findUnique({ where: { id: keyId } }).catch(() => null);
    const hook = key && !key.revokedAt ? webhookOf(key) : null;
    if (!key || !hook) return;
    const next = await payload(key).catch(() => null);
    if (!next) return;
    const body = JSON.stringify({ id: deliveryId, type: next.event, createdAt: new Date().toISOString(), attempt: attempt + 1, data: next.data });
    const status = await post(hook, body, deliveryId, next.event).catch(() => 0);
    console.log(`[partner] ${JSON.stringify({ webhook: next.event, keyId, ...log, deliveryId, attempt: attempt + 1, status })}`);
    if (status >= 200 && status < 300) return;
  }
}

async function deliver(keyId: string, runId: string): Promise<void> {
  await deliverWithRetries(
    keyId,
    async (key) => {
      const run = await scopedRun(key, runId);
      if (!run || run.status === "running") return null;
      return { event: run.status === "success" ? "build.succeeded" : "build.failed", data: { run: await runView(run) } };
    },
    { runId },
  );
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

/* ── Games ─────────────────────────────────────────────────── */

export type GameWebhookEvent = "game.step.completed" | "game.build.completed" | "game.build.failed" | "game.build.stopped" | "game.published";

/**
 * Sends a game event to the key's webhook (when it has one). The data is
 * made once, when the event happens, and sent as it was then on every retry;
 * nothing is sent once the game has left the key's scope.
 */
export function sendGameEvent(key: Pick<PartnerKey, "id" | "webhook">, gameId: string, event: GameWebhookEvent, data: () => Promise<Record<string, unknown>>): void {
  if (!webhookOf(key)) return;
  void (async () => {
    const snapshot = await data();
    await deliverWithRetries(key.id, async (k) => ((await scopedGame(k, gameId)) ? { event, data: snapshot } : null), { gameId });
  })().catch((err) => console.error("[partner] game webhook failed", err instanceof Error ? err.message : err));
}

/** How long a game job is followed at most (a job that outlives this sends no end event). */
const GAME_WATCH_MS = 12 * 60 * 60_000;

/**
 * Follows a build or change the key started (in this process): every saved
 * step sends game.step.completed (with the features' counts at that step), and
 * the end sends game.build.completed, game.build.failed or game.build.stopped.
 * Best effort, like the build webhook: a job carried on after a restart isn't
 * followed (GET /games/{id} shows how it ended).
 */
export function watchGameJob(key: Pick<PartnerKey, "id" | "webhook" | "resellerId">, gameId: string, jobId: string): void {
  if (!webhookOf(key)) return;
  const sent = new Set<string>();
  let ended = false;
  const stepData = async (stepId: string) => {
    const [job, game] = await Promise.all([db.gameJob.findUniqueOrThrow({ where: { id: jobId } }), db.gameProject.findUniqueOrThrow({ where: { id: gameId } })]);
    const view = await jobView(job);
    const index = view.steps.findIndex((s) => s.id === stepId);
    const step = view.steps[index];
    return {
      game: await gameCard(game),
      job: view,
      step: { index: index + 1, total: view.steps.length, id: step?.id ?? stepId, label: step?.label ?? "", seq: step?.seq ?? null, note: step?.note ?? null, features: step?.features ?? [] },
      features: featureCountsOf(asFeatures((game.plan as { features?: unknown } | null)?.features)),
    };
  };
  const unsubscribe = subscribeGame(gameId, (ev) => {
    if (ev.type === "steps" && ev.jobId === jobId) {
      for (const s of ev.steps) {
        if (s.status !== "done" || sent.has(s.id)) continue;
        sent.add(s.id);
        sendGameEvent(key, gameId, "game.step.completed", () => stepData(s.id));
      }
    }
    if (ev.type === "job" && ev.jobId === jobId && ev.status !== "running" && !ended) {
      ended = true;
      stop();
      const event = ev.status === "done" ? "game.build.completed" : ev.status === "cancelled" ? "game.build.stopped" : "game.build.failed";
      setTimeout(() => {
        sendGameEvent(key, gameId, event, async () => {
          const [job, game] = await Promise.all([db.gameJob.findUniqueOrThrow({ where: { id: jobId } }), db.gameProject.findUniqueOrThrow({ where: { id: gameId } })]);
          return { game: await gameView(game), job: await jobView(job) };
        });
      }, 250);
    }
  });
  const timer = setTimeout(() => stop(), GAME_WATCH_MS);
  timer.unref?.();
  function stop() {
    unsubscribe();
    clearTimeout(timer);
  }
}
