import webpush from "web-push";
import { db } from "./db";
import { getSetting, setSetting } from "./settings";
import { getAdapter } from "./datasources";
import https from "node:https";
import { assertPublicUrl, publicOnlyLookup } from "./public-url";

// Push services are public; the connection itself refuses private addresses.
const pushAgent = new https.Agent({ lookup: publicOnlyLookup as never, keepAlive: true });

/**
 * Web push for published apps. Visitors subscribe from an app's
 * "Turn on notifications" button (the push-notifications module stores their
 * subscription); owners send from the app's Notifications screen or a flow's
 * send_push step. One VAPID key pair identifies this server to the browsers'
 * push services — created automatically the first time it's needed.
 */

const KEYS = { publicKey: "push.vapidPublicKey", privateKey: "push.vapidPrivateKey" };

export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const [pub, priv] = await Promise.all([getSetting<string>(KEYS.publicKey), getSetting<string>(KEYS.privateKey)]);
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  const generated = webpush.generateVAPIDKeys();
  await setSetting(KEYS.privateKey, generated.privateKey);
  await setSetting(KEYS.publicKey, generated.publicKey);
  return generated;
}

function vapidSubject(): string {
  const contact = process.env.VAPID_SUBJECT || process.env.PUBLIC_BASE_URL || "https://example.com";
  return /^(mailto:|https:)/.test(contact) ? contact : `mailto:${contact}`;
}

type Target = { source: Awaited<ReturnType<typeof getAdapter>>["source"]; adapter: Awaited<ReturnType<typeof getAdapter>>["adapter"]; table: string };

/** Tables in this app that store push subscriptions (a "subscription" column). */
async function subscriberTables(projectId: string): Promise<Target[]> {
  const tables = await db.dataTable.findMany({
    where: { datasource: { projectId, kind: "POSTGRES_INTERNAL" } },
    select: { name: true, schema: true, datasourceId: true },
  });
  const out: Target[] = [];
  for (const t of tables) {
    const fields = ((t.schema as { fields?: Array<{ name: string }> })?.fields ?? []).map((f) => f.name);
    if (!fields.includes("subscription")) continue;
    const { source, adapter } = await getAdapter(t.datasourceId);
    out.push({ source, adapter, table: t.name });
  }
  return out;
}

export async function subscriberCount(projectId: string): Promise<number> {
  let n = 0;
  for (const t of await subscriberTables(projectId)) n += (await t.adapter.list(t.source, t.table, { limit: 100000 })).length;
  return n;
}

export type PushPayload = { title: string; body?: string; url?: string; icon?: string };

/**
 * Sends to every subscriber of the app. Subscriptions the push service says
 * are gone (the visitor unsubscribed or cleared their browser) are deleted.
 */
export async function sendPushToProject(projectId: string, payload: PushPayload): Promise<{ sent: number; failed: number; removed: number }> {
  const keys = await getVapidKeys();
  const vapidDetails = { subject: vapidSubject(), publicKey: keys.publicKey, privateKey: keys.privateKey };
  const body = JSON.stringify({ title: payload.title.slice(0, 120), body: (payload.body ?? "").slice(0, 400), url: payload.url, icon: payload.icon });
  let sent = 0, failed = 0, removed = 0;
  for (const target of await subscriberTables(projectId)) {
    const rows = (await target.adapter.list(target.source, target.table, { limit: 100000 })) as Array<{ id: unknown; subscription?: string }>;
    const seen = new Set<string>();
    // Small batches keep a large list from opening thousands of connections.
    for (let i = 0; i < rows.length; i += 20) {
      await Promise.all(rows.slice(i, i + 20).map(async (row) => {
        let sub: webpush.PushSubscription;
        try {
          sub = JSON.parse(String(row.subscription ?? ""));
          if (!sub?.endpoint || seen.has(sub.endpoint)) return;
          seen.add(sub.endpoint);
        } catch {
          return;
        }
        // Visitors supply the endpoint, so it must be a public HTTPS push
        // service — never an address inside this server's network.
        if (!(await isDeliverable(sub.endpoint))) {
          await target.adapter.remove(target.source, target.table, { id: String(row.id) }).catch(() => {});
          removed++;
          return;
        }
        try {
          await webpush.sendNotification(sub, body, { vapidDetails, TTL: 60 * 60 * 24, urgency: "normal", ...(process.env.NK_PUSH_ALLOW_PRIVATE === "1" ? {} : { agent: pushAgent }) });
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await target.adapter.remove(target.source, target.table, { id: String(row.id) }).catch(() => {});
            removed++;
          } else {
            failed++;
            console.warn("[push] delivery failed", status ?? "", err instanceof Error ? err.message : err);
          }
        }
      }));
    }
  }
  return { sent, failed, removed };
}

async function isDeliverable(endpoint: string): Promise<boolean> {
  // Test harnesses point subscriptions at a local mock push service.
  if (process.env.NK_PUSH_ALLOW_PRIVATE === "1") return /^https?:\/\//.test(endpoint);
  try {
    const url = await assertPublicUrl(endpoint);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
