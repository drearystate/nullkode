import { createHash } from "crypto";
import { cookies } from "next/headers";
import type { Project } from "@prisma/client";
import { db } from "@/lib/db";
import { sessionCookieName, verifyAppSession } from "@/lib/flow/session";
import { liveLanguages } from "@/lib/public-page";
import { nativeAppTexts } from "@/lib/app-locale";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locales";
import { normalizeHost } from "@/lib/hosts";
import { cachedNativePage, nativeSpec } from "./compile";
import type { NativeApp, NativePage, NativePageRef } from "./spec";

/**
 * Serves the native spec of a published app: GET <app>/nk-native/app.json
 * and <app>/nk-native/pages/<slug>.json, on /app/<slug> and on the app's own
 * addresses (nk-host). Public like the app's web pages; members-only pages
 * follow the same rules as on the web (lib/public-page.tsx renderPublicPage):
 * signed-out visitors are asked to sign in, the wrong role is refused, and an
 * app without a sign-in page shows them to its owner only. Only the live
 * deployment is ever compiled, never the draft.
 */

export type Route = { kind: "path"; slug: string } | { kind: "host"; host: string };

// How long a request waits for a compile before answering "come back soon".
const WAIT_MS = 25_000;

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...headers },
  });
}

/**
 * The app's address as this request reached it. On the app's own host the
 * Host header is the one the middleware checked and signed (X-Forwarded-Host
 * would come from the visitor there), and the proxy in front of app hosts
 * may not say which scheme was used: app addresses are https whenever the
 * studio's is (lib/app-hosts.ts appOrigin, lib/reseller.ts appPublicUrl), so
 * the phone app and the preview never call an http:// address from https.
 */
export function addressOf(req: Request, route: Route): { origin: string; base: string } {
  const url = new URL(req.url);
  const forwarded = (req.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  let proto: string;
  let host: string;
  if (route.kind === "host") {
    const raw = (req.headers.get("host") ?? "").trim().toLowerCase();
    host = normalizeHost(raw) === normalizeHost(route.host) ? raw : normalizeHost(route.host);
    // Next itself fills in X-Forwarded-Proto ("http") when the proxy didn't send
    // one, so a forwarded "http" proves nothing here: the studio's scheme wins.
    const studioHttps = (process.env.PUBLIC_BASE_URL ?? "").startsWith("https://");
    proto = studioHttps ? "https" : forwarded || url.protocol.replace(/:$/, "");
  } else {
    proto = forwarded || url.protocol.replace(/:$/, "") || "https";
    host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host).split(",")[0].trim();
  }
  const origin = `${proto}://${host}`;
  return { origin, base: route.kind === "path" ? `${origin}/app/${route.slug}` : origin };
}

type Ready = { app: NativeApp; pages: Record<string, NativePage> | null };

async function ready(project: Project, req: Request): Promise<Ready | Response> {
  if (!project.published || !project.liveDeploymentId) return json({ error: "This app isn't published." }, 404);
  const { app: locale, offered } = await liveLanguages(project.id);
  const asked = new URL(req.url).searchParams.get("lang");
  const lang = asked && offered.includes(asked as never) ? asked : locale.locale;
  const job = nativeSpec(project.id, lang, project.liveDeploymentId);
  const timeout = new Promise<"wait">((r) => setTimeout(() => r("wait"), WAIT_MS));
  try {
    const r = await Promise.race([job, timeout]);
    if (r === "wait") return json({ status: "preparing" }, 503, { "retry-after": "5", "cache-control": "no-store" });
    return { app: r.app, pages: r.pages && Object.keys(r.pages).length ? r.pages : null };
  } catch (err) {
    console.error("[native] compile failed:", err instanceof Error ? err.message : err);
    return json({ error: "This app couldn't be prepared for the phone app. Please try again later." }, 503, { "retry-after": "30", "cache-control": "no-store" });
  }
}

function etagOf(parts: string[]): string {
  return `"${createHash("sha1").update(parts.join("|")).digest("base64url")}"`;
}

function notModified(req: Request, etag: string, headers: Record<string, string>): Response | null {
  const inm = req.headers.get("if-none-match");
  if (inm && inm.split(",").some((t) => t.trim() === etag)) return new Response(null, { status: 304, headers: { etag, ...headers } });
  return null;
}

export async function serveNativeApp(req: Request, project: Project, route: Route): Promise<Response> {
  const r = await ready(project, req);
  if (r instanceof Response) return r;
  const { origin, base } = addressOf(req, route);
  // The engine's words (forms, lists, sign-in) in the app's language, from
  // messages/<locale>/runtime.json: added when served, so new wording
  // reaches phones without compiling the app again.
  const texts = nativeAppTexts(isLocale(r.app.locale) ? r.app.locale : DEFAULT_LOCALE);
  const app: NativeApp = { ...r.app, origin, base, texts: { ...texts, ...(r.app.texts ?? {}) } };
  const headers = { "cache-control": "public, max-age=0, must-revalidate", "access-control-allow-origin": "*", vary: "accept-encoding" };
  const etag = etagOf([app.deploymentId, app.locale, app.compiledAt, origin, base, createHash("sha1").update(JSON.stringify(app.texts)).digest("base64url")]);
  return notModified(req, etag, headers) ?? json(app, 200, { ...headers, etag });
}

/** Whether the visitor may see a members-only page (the web's rules). */
async function pageAccess(project: Project, ref: NativePageRef, app: NativeApp, req: Request): Promise<"ok" | "signin" | "forbidden"> {
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  const token = bearer ?? (await cookies()).get(sessionCookieName())?.value;
  const session = await verifyAppSession(project.id, token);
  const slugs = app.pages.map((p) => p.slug);
  const login = slugs.includes("login") ? "login" : slugs.find((s) => /(^|-)login$/.test(s));
  if (!login) return session?.owner ? "ok" : "forbidden";
  if (!session) return "signin";
  if (!ref.role || session.owner) return "ok";
  try {
    const ds = await db.dataSource.findFirst({ where: { projectId: project.id, kind: "POSTGRES_INTERNAL" }, select: { id: true } });
    if (!ds) return "forbidden";
    const { getAdapter } = await import("@/lib/datasources");
    const { source, adapter } = await getAdapter(ds.id);
    const rows = (await adapter.list(source, "auth_users", { where: { id: session.userId }, limit: 1 })) as Array<{ role?: string | null }>;
    return (rows[0]?.role ?? "").toLowerCase().trim() === ref.role.toLowerCase().trim() ? "ok" : "forbidden";
  } catch {
    return "forbidden";
  }
}

export async function serveNativePage(req: Request, project: Project, route: Route, file: string): Promise<Response> {
  const slug = decodeURIComponent(file).replace(/\.json$/i, "");
  const r = await ready(project, req);
  if (r instanceof Response) return r;
  const ref = r.app.pages.find((p) => p.slug === slug);
  if (!ref) return json({ error: "No such page." }, 404);
  let priv = false;
  if (ref.requiresAuth) {
    const access = await pageAccess(project, ref, r.app, req);
    if (access === "signin") return json({ error: "signin", login: r.app.pages.find((p) => /(^|-)login$/.test(p.slug))?.slug ?? "login" }, 401, { "cache-control": "no-store" });
    if (access === "forbidden") return json({ error: "forbidden" }, 403, { "cache-control": "no-store" });
    priv = true;
  }
  const page = r.pages?.[slug] ?? (await cachedNativePage(project.id, r.app.deploymentId, r.app.locale, slug));
  if (!page) return json({ error: "No such page." }, 404);
  // A page left as its web page for now (provisional) is compiled again in
  // the background: never stored by anyone, so the native page replaces it.
  const headers: Record<string, string> = priv
    ? { "cache-control": "private, no-store" }
    : page.provisional
      ? { "cache-control": "no-store", "access-control-allow-origin": "*", "x-nk-provisional": "1" }
      : { "cache-control": "public, max-age=0, must-revalidate", "access-control-allow-origin": "*", vary: "accept-encoding" };
  if (page.provisional) return json(page, 200, headers);
  const etag = etagOf([r.app.deploymentId, r.app.locale, r.app.compiledAt, slug]);
  return notModified(req, etag, headers) ?? json(page, 200, { ...headers, etag });
}
