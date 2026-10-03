import { cookies as nextCookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAppSession, sessionCookieName } from "@/lib/flow/session";
import { postgresAdapter } from "@/lib/datasources/postgres";
import { json } from "@/lib/utils";

/**
 * Client-side session probe for published apps. The page boots with
 * window.__nkProjectId set; the runtime calls this endpoint with that id
 * in a header, and we return the minimal signed-in state other pages need
 * to decide what to show (logout links, "my dashboard" links, greetings).
 *
 * Returns 200 with { signedIn: boolean, user?: {...} } — never errors,
 * so client code can treat a failed fetch as "signed out" safely.
 */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const projectId =
    req.headers.get("x-nk-project-id") ||
    new URL(req.url).searchParams.get("projectId") ||
    "";

  if (!projectId) return json({ signedIn: false });

  // The phone app (NullKode Native) sends the session as a bearer token
  // instead of the cookie; it is checked the same way.
  const bearer = /^Bearer\s+([A-Za-z0-9._~+/=-]{10,4096})\s*$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  const jar = await nextCookies();
  const token = bearer ?? jar.get(sessionCookieName())?.value;
  const session = await verifyAppSession(projectId, token);
  if (!session) return json({ signedIn: false });
  if (session.owner) return json({ signedIn: true, user: { id: session.userId, name: "Owner", role: "admin", owner: true } });

  // Look up the user row from the project's `users` table (installed by the
  // pre-built auth module). If the table or row is missing for any reason,
  // degrade gracefully — the cookie is still valid, we just can't enrich.
  try {
    const ds = await db.dataSource.findFirst({
      where: { projectId, kind: "POSTGRES_INTERNAL" },
    });
    if (!ds) return json({ signedIn: true, user: { id: session.userId } });
    // The auth module prefixes its tables (auth_users). Older/edited projects
    // may use the bare name "users". Try the conventional name first.
    let rows = await postgresAdapter.list(ds, "auth_users", {
      where: { id: session.userId },
      limit: 1,
    }).catch(() => [] as Record<string, unknown>[]);
    if (rows.length === 0) {
      rows = await postgresAdapter.list(ds, "users", {
        where: { id: session.userId },
        limit: 1,
      }).catch(() => [] as Record<string, unknown>[]);
    }
    const row = rows?.[0] ?? null;
    if (!row) return json({ signedIn: true, user: { id: session.userId } });
    // Strip anything sensitive before returning.
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (/password|secret|token/i.test(k)) continue;
      safe[k] = v;
    }
    return json({ signedIn: true, user: safe });
  } catch {
    return json({ signedIn: true, user: { id: session.userId } });
  }
}
