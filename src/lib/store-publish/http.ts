import { getTranslations } from "next-intl/server";
import type { FdroidRepo, Project, StoreAccount, User } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { requestLocale } from "@/i18n/request";
import { json } from "@/lib/utils";
import { accessError, checkProjectAccess } from "@/lib/sharing/access";
import { PlayError } from "./google-play";
import { FdroidError, repoAddLink, repoAddress } from "./fdroid";
import { ReleaseError } from "./releases";

/** Shared bits of the store-publishing routes (owner checks, errors in the person's language). */

export async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "storePublish.api" });
}

/** The signed-in person; with `write`, refuses while an admin acts as them (store accounts stay owner-only). */
export async function signedIn(opts: { write?: boolean } = {}): Promise<{ response: Response } | { user: User }> {
  const t = await tr();
  const user = await getCurrentUser();
  if (!user) return { response: json({ error: t("unauthorized") }, { status: 401 }) };
  if (opts.write && (await getImpersonation())) return { response: json({ error: t("ownerOnly") }, { status: 403 }) };
  return { user };
}

/** The app, owner only (lib/sharing/access.ts): store accounts and releases are never a collaborator's. */
export async function ownedProject(id: string, opts: { write?: boolean } = {}): Promise<{ response: Response } | { user: User; project: Project }> {
  const res = await signedIn(opts);
  if ("response" in res) return res;
  const r = await checkProjectAccess(id, "owner");
  if (!r.ok) return { response: r.status === 404 ? json({ error: (await tr())("notFound") }, { status: 404 }) : await accessError(r.status, r.need) };
  return { user: r.user, project: r.project };
}

const KNOWN = new Set([
  "appNotFound", "forbidden", "apiDisabled", "signInExpired", "badKey", "notAKey", "versionUsed", "wrongKey", "draftApp", "notSentForReview",
  "packageMismatch", "network", "noBuild", "badBuild", "noRepo", "badApk", "signFailed", "keyMissing", "restarted", "busy",
]);

/** A known error as { error (their language), code, detail (Google's own words) }; anything else is logged. */
export async function errorResponse(err: unknown, where: string): Promise<Response> {
  const t = await tr();
  if (err instanceof PlayError || err instanceof ReleaseError || err instanceof FdroidError) {
    const status = err instanceof PlayError ? (err.code === "network" || err.status >= 500 ? 502 : 400) : err.status;
    return json({ error: KNOWN.has(err.code) ? t(`errors.${err.code}`) : err.message, code: err.code, detail: err.message }, { status });
  }
  console.error(`[${where}]`, err);
  return json({ error: t("failed") }, { status: 500 });
}

export type AccountView = { id: string; kind: "oauth" | "service_account"; label: string; lastUsedAt: string | null; lastError: string | null };

export function accountView(a: StoreAccount): AccountView {
  return { id: a.id, kind: a.kind === "oauth" ? "oauth" : "service_account", label: a.label, lastUsedAt: a.lastUsedAt?.toISOString() ?? null, lastError: a.lastError };
}

export type RepoView = { name: string; description: string; address: string; fingerprint: string; addLink: string; appLink: string; pageUrl: string };

export async function repoView(repo: FdroidRepo): Promise<RepoView> {
  const { publicBaseUrlFor } = await import("@/lib/reseller");
  const user = await db.user.findUnique({ where: { id: repo.userId }, select: { id: true, role: true, resellerId: true } });
  const address = repoAddress(await publicBaseUrlFor(user as Parameters<typeof publicBaseUrlFor>[0]), repo);
  const link = repoAddLink(address, repo.fingerprint);
  return { name: repo.name, description: repo.description, address, fingerprint: repo.fingerprint, addLink: link.https, appLink: link.app, pageUrl: address };
}
