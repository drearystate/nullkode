import type { Flow } from "@prisma/client";
import { runFlow, runnableFlow, flowWrites, flowChecksPassword, HIDDEN_TRIGGERS, VISITOR_ERROR } from "@/lib/flow/runtime";
import { flowAccess, moduleFlowForPage, resolveModuleFlow } from "@/lib/flow/access";
import { hitLimit, undoHit, requestIp } from "@/lib/rate-limit";
import { json } from "@/lib/utils";
import { db } from "@/lib/db";
import { fromBuilderPage } from "@/lib/deployments";
import { getCurrentUser } from "@/lib/auth";
import { projectForHost } from "@/lib/app-hosts";

/** JSON, form posts and plain text. */
const BODY_LIMIT = 1024 * 1024;
/** Forms with files (the same size /api/upload takes). */
const MULTIPART_LIMIT = 20 * 1024 * 1024;

/** Flows anyone can call that save or send something: per visitor, per flow. */
const WRITE_LIMIT = 30;
/**
 * The same for flows only signed-in members can run (an inbox thread that
 * marks messages read each time it refreshes) and for flows no page uses
 * (webhooks from a service's few addresses).
 */
const LOOSE_WRITE_LIMIT = 300;
const WRITE_WINDOW_MS = 10 * 60_000;
/** Wrong passwords: per visitor and per account. */
const SIGN_IN_LIMIT = 10;
const SIGN_IN_WINDOW_MS = 15 * 60_000;
/** Forms sent back faster than a person could fill them in. */
const TOO_FAST_MS = 1500;

function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function buildSetCookie(
  name: string,
  value: string,
  opts: { expires?: Date; maxAge?: number } = {}
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.startsWith("https://") : process.env.NODE_ENV === "production") parts.push("Secure");
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  return parts.join("; ");
}

/**
 * Resolve a project id from the request — used to scope slug-based flow
 * lookups so two apps with the same `create-game` slug don't collide.
 * Prefers the Referer (which holds the calling app's URL on browser fetches);
 * falls back to the Host header for custom-domain projects.
 */
async function projectIdFromRequest(req: Request): Promise<string | null> {
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      const m = u.pathname.match(/^\/app\/([^/]+)/);
      if (m) {
        const p = await db.project.findUnique({ where: { slug: m[1] }, select: { id: true } });
        if (p) return p.id;
      }
      const project = await projectForHost(u.host.toLowerCase().split(":")[0]);
      if (project) return project.id;
    } catch {
      /* fallthrough */
    }
  }
  const reqHost = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (reqHost) {
    const project = await projectForHost(reqHost);
    if (project) return project.id;
  }
  return null;
}

/** The slug of the app page that made the call (from the Referer), or null. */
async function callingPageSlug(req: Request, projectId: string): Promise<string | null> {
  const referer = req.headers.get("referer");
  if (!referer) return null;
  let parts: string[];
  try {
    parts = new URL(referer).pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  } catch {
    return null;
  }
  // /app/<app>/<page> on the studio's address, /<page> on the app's own.
  const slug = parts[0] === "app" && parts.length >= 2 ? parts[2] : parts[0];
  if (slug === undefined) {
    const home = await db.page.findFirst({ where: { projectId, isHome: true }, select: { slug: true } });
    return home?.slug ?? null;
  }
  return /^[a-z0-9][a-z0-9-]{0,100}$/i.test(slug) ? slug.toLowerCase() : null;
}

/**
 * Accept either flow id (cuid) or flow slug. AI-generated pages often emit
 * inline scripts like `fetch('/api/run/create-game')` using the slug, which
 * the attribute rewriter can't substitute inside <script> blocks. Resolving
 * slugs server-side means both addressing schemes work — scoped to the
 * calling project so cross-project slug collisions are impossible. Feature
 * pages call their flows by the short name they have inside the feature
 * (`__nkFlowSlugMap['summary']`), which finds the installed
 * "analytics-dashboard-summary".
 */
async function findFlow(req: Request, idOrSlug: string): Promise<Flow | null> {
  const byId = await db.flow.findUnique({ where: { id: idOrSlug } });
  if (byId) return byId;
  const projectId = await projectIdFromRequest(req);
  if (!projectId) return null;
  const page = await callingPageSlug(req, projectId);
  return (
    (await moduleFlowForPage(projectId, idOrSlug, page)) ??
    (await db.flow.findFirst({ where: { projectId, slug: idOrSlug } })) ??
    (await resolveModuleFlow(projectId, idOrSlug))
  );
}

function isCrossSite(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin === null) return false;
  try {
    return new URL(origin).host.toLowerCase() !== (req.headers.get("host") ?? "").trim().toLowerCase();
  } catch {
    return true;
  }
}

const notFound = () => json({ error: "Flow not found or disabled" }, { status: 404 });

function tooMany(message: string, retryAfterSec: number) {
  return json({ error: message }, { status: 429, headers: { "retry-after": String(Math.max(1, retryAfterSec)) } });
}

type Read = { bytes: Uint8Array<ArrayBuffer> } | { tooBig: true } | { broken: true };

/** The request body, refusing it once it passes `limit` bytes (declared or actually sent). */
async function readCapped(req: Request, limit: number): Promise<Read> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return { tooBig: true };
  if (!req.body) return { bytes: new Uint8Array(0) };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => {});
        return { tooBig: true };
      }
      chunks.push(value);
    }
  } catch {
    return { broken: true };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { bytes };
}

/** What the request sent, as the flow's trigger; or the response to send instead. */
async function readTrigger(req: Request): Promise<{ trigger: unknown } | { response: Response }> {
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  const multipart = ct.includes("multipart/form-data");
  const read = await readCapped(req, multipart ? MULTIPART_LIMIT : BODY_LIMIT);
  if ("tooBig" in read) {
    return {
      response: json(
        { error: multipart ? "Those files are too big to send together. Please keep them under 20 MB in total." : "That's too much to send at once. Please send less and try again." },
        { status: 413 },
      ),
    };
  }
  if ("broken" in read) return { response: json({ error: "We couldn't read what was sent. Please try again." }, { status: 400 }) };
  const text = () => new TextDecoder().decode(read.bytes);
  if (ct.includes("application/json")) {
    try {
      return { trigger: read.bytes.length ? JSON.parse(text()) : {} };
    } catch {
      return { trigger: {} };
    }
  }
  if (ct.includes("application/x-www-form-urlencoded") || multipart) {
    const obj: Record<string, unknown> = {};
    try {
      if (multipart) {
        const form = await new Response(read.bytes, { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData();
        form.forEach((v, k) => (obj[k] = v));
      } else {
        new URLSearchParams(text()).forEach((v, k) => (obj[k] = v));
      }
    } catch {
      return { response: json({ error: "We couldn't read that form. Please try again." }, { status: 400 }) };
    }
    return { trigger: obj };
  }
  return { trigger: text() };
}

/**
 * The spam trap the app's forms carry: `_nk_hp` is a hidden field people
 * never fill in, `_nk_t` the time the form was shown. Both are taken out of
 * the trigger in every case. Returns true when a bot sent the form. Neither
 * field is required: flows are also called from scripts and other features.
 */
function takeSpamTrap(trigger: unknown): boolean {
  if (!trigger || typeof trigger !== "object" || Array.isArray(trigger)) return false;
  const t = trigger as Record<string, unknown>;
  const trap = t._nk_hp;
  const shownAt = t._nk_t;
  delete t._nk_hp;
  delete t._nk_t;
  if (trap !== undefined && trap !== null && String(trap).trim() !== "") return true;
  if (shownAt !== undefined && shownAt !== null && shownAt !== "") {
    const elapsed = Date.now() - Number(shownAt);
    // A time from the future is a visitor's clock being ahead, not a bot.
    if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < TOO_FAST_MS) return true;
  }
  return false;
}

/** Who a sign-in attempt is for: the email (or username or phone) it names. */
function signInName(trigger: unknown): string | null {
  if (!trigger || typeof trigger !== "object") return null;
  const t = trigger as Record<string, unknown>;
  for (const key of ["email", "username", "user", "login", "phone"]) {
    const v = t[key];
    if (typeof v === "string" && v.trim()) return v.trim().toLowerCase().slice(0, 200);
  }
  return null;
}

async function handle(req: Request, flowIdOrSlug: string) {
  const flow = await findFlow(req, flowIdOrSlug);
  if (!flow || !flow.enabled) return notFound();
  const flowId = flow.id;

  // The published app, webhooks and everyone else run the live version.
  // Only the project's owner, signed in and working in the builder, runs the
  // draft; an app that isn't published runs for nobody else.
  const project = await db.project.findUnique({ where: { id: flow.projectId }, select: { ownerId: true, published: true } });
  const crossSite = isCrossSite(req);
  const viewer = crossSite ? null : await getCurrentUser().catch(() => null);
  const isOwner = Boolean(viewer && project && viewer.id === project.ownerId);
  if (!project || (!project.published && !isOwner)) return notFound();
  const draft = isOwner && (await fromBuilderPage(req));

  // Scheduled and event flows are started by the platform, never by a
  // request; the owner can still test them from the builder.
  const runnable = await runnableFlow(flow, !draft);
  if (!draft && (HIDDEN_TRIGGERS.has(flow.trigger) || HIDDEN_TRIGGERS.has(runnable.trigger))) return notFound();

  let trigger: unknown = null;
  if (req.method !== "GET") {
    const read = await readTrigger(req);
    if ("response" in read) return read.response;
    trigger = read.trigger;
  } else {
    const url = new URL(req.url);
    const obj: Record<string, unknown> = {};
    url.searchParams.forEach((v, k) => (obj[k] = v));
    trigger = obj;
  }
  const bot = takeSpamTrap(trigger);

  // A call from another site runs as an anonymous visitor: the app's sign-in
  // cookie isn't used and none is set, so other sites can't act for a
  // signed-in user.
  const cookies = crossSite ? {} : parseCookieHeader(req.headers.get("cookie"));
  const ip = requestIp(req);

  // Limits for visitors (the owner testing in the builder has none). Flows
  // that only read are never limited, so live lists can keep refreshing.
  const signInKeys: string[] = [];
  if (!draft) {
    const writes = flowWrites(runnable.graph);
    if (writes && bot) return json({ ok: true, message: "Thanks!" });
    const access = writes ? await flowAccess(flow, true) : null;
    // Flows only the app's staff can run (admin screens) aren't limited:
    // visitors are turned away from them before anything runs.
    if (access && !access.roles?.length) {
      const limit = access.signIn || access.unused ? LOOSE_WRITE_LIMIT : WRITE_LIMIT;
      const r = hitLimit(`run:${flow.projectId}:${flowId}:${ip}`, limit, WRITE_WINDOW_MS);
      if (!r.ok) return tooMany("You're sending this too often. Please wait a few minutes and try again.", r.retryAfterSec);
    }
    if (flowChecksPassword(runnable.graph)) {
      // Every attempt counts up front (so a burst can't slip through), and
      // attempts with the right password are taken back afterwards.
      const name = signInName(trigger);
      signInKeys.push(`sign-in:ip:${flow.projectId}:${ip}`);
      if (name) signInKeys.push(`sign-in:name:${flow.projectId}:${name}`);
      let wait = 0;
      for (const key of signInKeys) {
        const r = hitLimit(key, SIGN_IN_LIMIT, SIGN_IN_WINDOW_MS);
        if (!r.ok) wait = Math.max(wait, r.retryAfterSec);
      }
      if (wait) return tooMany("Too many sign-in attempts. Please wait 15 minutes and try again.", wait);
    }
  }

  try {
    const result = await runFlow(flowId, trigger, cookies, {
      live: !draft,
      trusted: draft,
      clientIp: ip,
      source: draft ? "test" : "live",
      graph: runnable.graph,
    });
    if (!result.authFailed) for (const key of signInKeys) undoHit(key);
    const headers = new Headers({ "content-type": "application/json" });
    for (const c of crossSite ? [] : result.setCookies) {
      headers.append(
        "set-cookie",
        buildSetCookie(c.name, c.value, { expires: c.expires, maxAge: c.maxAge })
      );
    }
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers,
    });
  } catch (err) {
    for (const key of signInKeys) undoHit(key);
    const message = err instanceof Error ? err.message : "Flow error";
    console.error(`[run] ${flowId} failed:`, message);
    // Visitors get a plain apology; the owner testing in the builder sees why.
    return json({ error: draft ? message : VISITOR_ERROR }, { status: 500 });
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await ctx.params;
  return handle(req, flowId);
}
export async function POST(req: Request, ctx: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await ctx.params;
  return handle(req, flowId);
}
export async function PUT(req: Request, ctx: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await ctx.params;
  return handle(req, flowId);
}
export async function DELETE(req: Request, ctx: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await ctx.params;
  return handle(req, flowId);
}
export async function PATCH(req: Request, ctx: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await ctx.params;
  return handle(req, flowId);
}
