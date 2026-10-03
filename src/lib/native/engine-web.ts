import { readFile, stat } from "fs/promises";
import { join } from "path";
import type { Project } from "@prisma/client";
import { db } from "@/lib/db";
import { appOrigin } from "@/lib/app-hosts";
import { resellerForUser } from "@/lib/reseller";
import { studioOrigins } from "@/lib/hosts";

/**
 * The NullKode Native engine's browser build (react-native-web, made by
 * `pnpm native:web` into public/nk-native/web) as a page:
 *
 *  - on the app's own address, <app>/nk-native/web (an app host, through the
 *    middleware's /nk-host rewrite) or /app/<slug>/nk-native/web: the studio's
 *    phone preview. Same origin as the app's /api/run and spec routes, so
 *    sign-in, forms and lists work exactly as on a phone; framed only by the
 *    studio (CSP frame-ancestors). The engine keeps the visitor's session in
 *    sessionStorage and never gets studio cookies (another site).
 *  - /nk-native/web on the studio's own address: the fidelity harness and
 *    tests (lib/native/fidelity.ts), apps on /app/<slug> of this address only.
 *
 * Its scripts and assets are plain files under /nk-native/web/… (the same on
 * every host; the middleware passes files with an extension through).
 * Which app it shows comes from `?app=<app.json URL>`: only the app this
 * address serves, never another site's spec, so nobody can make an app's
 * origin draw (and send its visitors' sessions to) someone else's app.
 */

const INDEX = () => join(process.cwd(), "public", "nk-native", "web", "index.html");

/** The engine's web build is on this server (pnpm native:web). */
export async function engineWebReady(): Promise<boolean> {
  try {
    return (await stat(INDEX())).isFile();
  } catch {
    return false;
  }
}

/**
 * Where the studio's phone preview opens an app: the engine page and the
 * app's spec on the app's own origin (<label>.<APPS_DOMAIN>) when the
 * operator set an apps domain, else under /app/<slug> on the studio's
 * address (`studioOrigin`, as the studio's request reached it).
 */
export async function previewAddresses(project: Pick<Project, "id" | "slug" | "hostLabel">, studioOrigin: string): Promise<{ engineUrl: string; appJsonUrl: string; webBase: string }> {
  const own = await appOrigin(project);
  const base = own ?? `${studioOrigin}/app/${project.slug}`;
  return { engineUrl: `${base}/nk-native/web`, appJsonUrl: `${base}/nk-native/app.json`, webBase: own ?? `/app/${project.slug}` };
}

/** Origins that may frame an app's engine page: the studio and the owner's reseller dashboard domain. */
export async function previewFrameAncestors(project: Pick<Project, "ownerId">): Promise<string[]> {
  const list = new Set(studioOrigins());
  const owner = await db.user.findUnique({ where: { id: project.ownerId }, select: { id: true, role: true, resellerId: true } });
  const reseller = await resellerForUser(owner).catch(() => null);
  if (reseller?.domain && reseller.domainVerifiedAt && reseller.status === "ACTIVE") {
    const scheme = (process.env.PUBLIC_BASE_URL ?? "").startsWith("http://") ? "http" : "https";
    list.add(`${scheme}://${reseller.domain}`);
  }
  return [...list];
}

const SIMPLE = /^[A-Za-z0-9._~-]{1,120}$/;

/** `?app=` names an app.json this address serves (`appPath` on the request's own host), with at most a language. */
function appParamOk(raw: string | null, host: string, appPath: (pathname: string) => boolean): boolean {
  if (!raw) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password || u.hash) return false;
  if (u.host.toLowerCase() !== host.toLowerCase()) return false;
  if (!appPath(u.pathname)) return false;
  for (const [k, v] of u.searchParams) if (k !== "lang" || !SIMPLE.test(v)) return false;
  return true;
}

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

export async function engineWebResponse(
  req: Request,
  opts: {
    /** The page's address as the browser sees it (/nk-native/web or /app/<slug>/nk-native/web). */
    publicPath: string;
    /** The host the browser used (with port). */
    host: string;
    /** This address's app.json, when it serves exactly one app (a wrong or missing ?app= is sent there). */
    canonicalApp: string | null;
    /** Accepted app.json paths. */
    appPath: (pathname: string) => boolean;
    /** CSP frame-ancestors sources besides 'self'. */
    frameAncestors: string[];
  },
): Promise<Response> {
  let html: string;
  try {
    html = await readFile(INDEX(), "utf8");
  } catch {
    return text("The native preview isn't built on this server yet (pnpm native:web).", 404);
  }
  const q = new URL(req.url).searchParams;
  if (!appParamOk(q.get("app"), opts.host, opts.appPath)) {
    if (!opts.canonicalApp) return text("This preview only shows apps published on this address.", 400);
    const next = new URLSearchParams({ app: opts.canonicalApp });
    for (const k of ["page", "bare"]) {
      const v = q.get(k);
      if (v && SIMPLE.test(v)) next.set(k, v);
    }
    return new Response(null, { status: 307, headers: { location: `${opts.publicPath}?${next}`, "cache-control": "no-store" } });
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
      "x-robots-tag": "noindex",
      "content-security-policy": `frame-ancestors ${["'self'", ...opts.frameAncestors].join(" ")}`,
    },
  });
}
