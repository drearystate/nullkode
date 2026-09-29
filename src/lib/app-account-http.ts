import type { Project } from "@prisma/client";
import { db } from "./db";
import { projectForHost } from "./app-hosts";
import { normalizeHost } from "./hosts";
import { sessionCookieName, verifyAppSession } from "./flow/session";

/**
 * Request helpers for /api/app-account/*: the endpoints a published app's
 * visitors use to download their data or delete their account.
 */

/**
 * The published app a request came from, found the way /api/run finds it:
 * the calling page's address (Referer: /app/<slug>/… or the app's own
 * domain), then the host the request came in on, then the id the page sends
 * (x-nk-project-id). The app sign-in cookie still has to be for this same
 * app, so a wrong guess can't reach anyone's account.
 */
export async function appProjectFromRequest(req: Request): Promise<Project | null> {
  let project: Project | null = null;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      const m = /^\/app\/([^/?#]+)/.exec(u.pathname);
      if (m) project = await db.project.findUnique({ where: { slug: decodeURIComponent(m[1]) } });
      if (!project) project = await projectForHost(normalizeHost(u.host));
    } catch {
      /* not a usable address */
    }
  }
  if (!project) {
    const host = normalizeHost(req.headers.get("host"));
    if (host) project = await projectForHost(host);
  }
  if (!project) {
    const id = (req.headers.get("x-nk-project-id") ?? "").trim();
    if (/^[a-z0-9]{10,40}$/.test(id)) project = await db.project.findUnique({ where: { id } });
  }
  return project?.published ? project : null;
}

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** The visitor's sign-in for this app, if any. */
export async function appSession(req: Request, projectId: string) {
  return verifyAppSession(projectId, readCookie(req, sessionCookieName()));
}

/** A Set-Cookie value that signs the visitor out of the app. */
export function clearSessionCookie(req: Request): string {
  const secure =
    (process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.startsWith("https://") : process.env.NODE_ENV === "production") ||
    req.headers.get("x-forwarded-proto") === "https";
  return [`${sessionCookieName()}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT", ...(secure ? ["Secure"] : [])].join("; ");
}

/** The visitor's address, from the proxy's X-Real-IP (X-Forwarded-For can be forged). */
export function visitorIp(req: Request): string {
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}
