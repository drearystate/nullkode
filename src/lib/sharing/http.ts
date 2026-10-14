import type { User } from "@prisma/client";
import { getCurrentUser } from "../auth";
import { json } from "../utils";
import { requestErrorsT, type ErrT } from "../errors-i18n";
import { accessError, isShareKind, roleOn, targetInfo, type Role, type ShareKind } from "./access";
import { resolveShareTarget } from "./links";

/** Shared bits of the /api/share routes: errors in the person's language, the owner check. */

export async function sharingT(user?: User | null): Promise<ErrT> {
  const t = await requestErrorsT(user);
  return (key, values) => t(`sharing.${key}`, values);
}

export function fail(status: number, error: string, code?: string): Response {
  return json({ error, ...(code ? { code } : {}) }, { status });
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export type Held = { user: User; kind: ShareKind; target: { id: string; ownerId: string; name: string }; role: Role };

/**
 * The signed-in person and their role on {kind, id}; an app made from a
 * design or a game counts as that design or game (resolveShareTarget) when
 * `resolve` is set. 401 / 404 like every other route; 403 when `owner` is
 * required and they're a collaborator.
 */
export async function holder(kindRaw: unknown, idRaw: unknown, opts: { owner?: boolean; resolve?: boolean } = {}): Promise<Held | { error: Response }> {
  const user = await getCurrentUser();
  if (!user) return { error: await accessError(401) };
  if (!isShareKind(kindRaw)) return { error: fail(400, (await sharingT(user))("badKind")) };
  if (typeof idRaw !== "string" || !idRaw || idRaw.length > 64) return { error: await accessError(404) };
  const { kind, id } = opts.resolve ? await resolveShareTarget(kindRaw, idRaw) : { kind: kindRaw, id: idRaw };
  const target = await targetInfo(kind, id);
  if (!target) return { error: await accessError(404) };
  const role = await roleOn(kind, target, user.id);
  if (!role) return { error: await accessError(404) };
  if (opts.owner && role !== "owner") return { error: await accessError(403, "owner") };
  return { user, kind, target, role };
}

/** The errors.json key for a link that can't be used. */
export function problemKey(problem: "gone" | "expired" | "revoked" | "workspace"): string {
  return problem === "expired" ? "linkExpired" : problem === "revoked" ? "linkRevoked" : problem === "workspace" ? "linkWorkspace" : "linkGone";
}
