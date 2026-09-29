import { runFlow } from "@/lib/flow/runtime";
import { json } from "@/lib/utils";
import { db } from "@/lib/db";
import { fromBuilderPage } from "@/lib/deployments";
import { getCurrentUser } from "@/lib/auth";
import { projectForHost } from "@/lib/app-hosts";

function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
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

function isCrossSite(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin === null) return false;
  try {
    return new URL(origin).host.toLowerCase() !== (req.headers.get("host") ?? "").trim().toLowerCase();
  } catch {
    return true;
  }
}

async function handle(req: Request, flowIdOrSlug: string) {
  // Accept either flow id (cuid) or flow slug. AI-generated pages often emit
  // inline scripts like `fetch('/api/run/create-game')` using the slug, which
  // the attribute rewriter can't substitute inside <script> blocks. Resolving
  // slugs server-side means both addressing schemes work — scoped to the
  // calling project so cross-project slug collisions are impossible.
  let flow = await db.flow.findUnique({ where: { id: flowIdOrSlug } });
  if (!flow) {
    const projectId = await projectIdFromRequest(req);
    if (projectId) {
      flow = await db.flow.findFirst({
        where: { projectId, slug: flowIdOrSlug },
      });
    }
  }
  if (!flow || !flow.enabled) return json({ error: "Flow not found or disabled" }, { status: 404 });
  const flowId = flow.id;

  // The published app, webhooks and everyone else run the live version.
  // Only the project's owner, signed in and working in the builder, runs the
  // draft; an app that isn't published runs for nobody else.
  const project = await db.project.findUnique({ where: { id: flow.projectId }, select: { ownerId: true, published: true } });
  const crossSite = isCrossSite(req);
  const viewer = crossSite ? null : await getCurrentUser().catch(() => null);
  const isOwner = Boolean(viewer && project && viewer.id === project.ownerId);
  if (!project || (!project.published && !isOwner)) return json({ error: "Flow not found or disabled" }, { status: 404 });
  const draft = isOwner && (await fromBuilderPage(req));

  let trigger: unknown = null;
  if (req.method !== "GET") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      trigger = await req.json().catch(() => ({}));
    } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const obj: Record<string, unknown> = {};
      form.forEach((v, k) => (obj[k] = v));
      trigger = obj;
    } else {
      trigger = await req.text().catch(() => "");
    }
  } else {
    const url = new URL(req.url);
    const obj: Record<string, unknown> = {};
    url.searchParams.forEach((v, k) => (obj[k] = v));
    trigger = obj;
  }

  // A call from another site runs as an anonymous visitor: the app's sign-in
  // cookie isn't used and none is set, so other sites can't act for a
  // signed-in user.
  const cookies = crossSite ? {} : parseCookieHeader(req.headers.get("cookie"));

  try {
    const result = await runFlow(flowId, trigger, cookies, { live: !draft, trusted: draft });
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
    return json(
      { error: err instanceof Error ? err.message : "Flow error" },
      { status: 500 }
    );
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
