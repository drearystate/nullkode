/**
 * Erasing apps and accounts, used by every path that deletes an app or a
 * person's platform account (app delete, account delete, admin and reseller
 * deletes, failed template/import rollbacks, the empty-account cleanup).
 *
 * What erasing an app does:
 *  1. Its built-in tables (the `proj_<id>` schema in this server's own
 *     database) are renamed to `trash_proj_<id>_<yyyymmdd>`. Outside
 *     databases and Google Sheets are never touched.
 *  2. Its phone-app builds (`<private uploads>/<id>/`) are moved to
 *     `<private uploads>/.trash/<yyyymmdd>/<id>/`, and so is the folder of a
 *     copied website (`public/assets/cloned/<slug>/`), unless another app
 *     still uses that folder (an imported copy points at the same files).
 *  3. Its Google Play upload key folder is deleted. Its passwords are in the
 *     database row that goes with the app, so the file alone is useless;
 *     the delete screens ask the owner to download the key first.
 *  4. The app's row is deleted, which removes its pages, flows and their run
 *     logs, table records, domains, published versions and upload key record.
 *
 * The nightly maintenance deletes trash schemas and trash folders after 7
 * days. Files people uploaded (public/uploads) are shared between apps and
 * are never deleted here.
 */
import { cp, mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { User } from "@prisma/client";
import { db } from "./db";
import { projectSchemaName, renameSchemaToTrash } from "./datasources/postgres";
import { stripe, billingScopeFor } from "./stripe";
import { appendErasureLog } from "./privacy-store";

/**
 * Private storage for phone-app builds and upload keys. Must match
 * nativeDataRoot() in apk-build.ts (NK_NATIVE_DIR, default <cwd>/uploads).
 */
export function nativeDataRoot(): string {
  return process.env.NK_NATIVE_DIR || join(process.cwd(), "uploads");
}

/**
 * Where erased apps' files wait before the nightly maintenance removes them:
 * `<private uploads>/.trash/<yyyymmdd>/…` (UTC date of the erase).
 */
export function trashRoot(): string {
  return join(nativeDataRoot(), ".trash");
}

/** Copied websites keep their pictures here, one folder per app slug (see clone-site.ts). */
export function clonedAssetsRoot(): string {
  return join(process.cwd(), "public", "assets", "cloned");
}

/** Folder names a cloned site can have: an app slug, never a path. */
export const CLONED_FOLDER = /^[a-z0-9][a-z0-9_-]{0,119}$/i;

export function trashDay(when = new Date()): string {
  return when.toISOString().slice(0, 10).replace(/-/g, "");
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}

/**
 * Moves a folder to `dest` (adding -2, -3… if that name is taken). Docker
 * keeps the private uploads and the cloned sites on different volumes, where
 * a rename can't cross, so it falls back to copy-then-remove.
 */
export async function moveFolder(src: string, dest: string): Promise<string> {
  await mkdir(dirname(dest), { recursive: true, mode: 0o700 });
  let target = dest;
  for (let n = 2; await exists(target); n++) target = `${dest}-${n}`;
  try {
    await rename(src, target);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") throw err;
    await cp(src, target, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true });
    await rm(src, { recursive: true, force: true });
  }
  return target;
}

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

/**
 * Whether any app other than `exceptProjectId` still points at a copied
 * website's folder: its pages, published versions, icon or theme.
 */
export async function clonedFolderInUse(folder: string, exceptProjectId: string | null): Promise<boolean> {
  const pattern = likePattern(`/assets/cloned/${folder}/`);
  const except = exceptProjectId ?? "";
  const rows = await db.$queryRaw<Array<{ used: boolean }>>`
    SELECT (
      EXISTS (SELECT 1 FROM "Page" WHERE "projectId" <> ${except} AND ("html" LIKE ${pattern} OR "css" LIKE ${pattern}))
      OR EXISTS (SELECT 1 FROM "Deployment" WHERE "projectId" <> ${except} AND "snapshot"::text LIKE ${pattern})
      OR EXISTS (SELECT 1 FROM "Project" WHERE "id" <> ${except} AND ("icon" LIKE ${pattern} OR "theme"::text LIKE ${pattern}))
    ) AS "used"`;
  return Boolean(rows[0]?.used);
}

export type EraseReport = {
  /** The trash schema the app's tables went to, or null when it had none. */
  schema: string | null;
  /** Folders moved to the trash. */
  moved: string[];
  signingKeyDeleted: boolean;
  /** The copied website's folder was left in place because another app uses it. */
  clonedKept: boolean;
  /** File steps that failed (logged; scripts/erase-orphans.ts finds what they left). */
  problems: string[];
};

/**
 * Erases one app: tables, files and its row (see the top of this file).
 * Safe to call again after a partial failure.
 */
export async function eraseProject(projectId: string, slug: string): Promise<EraseReport> {
  projectSchemaName(projectId); // refuses anything that isn't a plain app id
  const day = trashDay();
  const report: EraseReport = { schema: null, moved: [], signingKeyDeleted: false, clonedKept: false, problems: [] };
  const trashDir = join(trashRoot(), day, projectId);

  // The tables first: if the database can't be reached, stop here, before
  // anything else has changed.
  report.schema = await renameSchemaToTrash(projectId);

  // A folder that can't be moved (permissions, a full disk) mustn't make the
  // app impossible to delete: it's logged, and erase-orphans finds it later.
  const step = async (what: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch (err) {
      const problem = `${what}: ${err instanceof Error ? err.message : String(err)}`;
      report.problems.push(problem);
      console.error(`[erase] app ${projectId}: ${problem}`);
    }
  };

  // The app's private folder (phone-app builds live in its native/ folder).
  await step("phone-app builds", async () => {
    const builds = join(nativeDataRoot(), projectId);
    if (await exists(builds)) report.moved.push(await moveFolder(builds, join(trashDir, "private")));
  });

  await step("upload key", async () => {
    const signing = join(nativeDataRoot(), ".signing", projectId);
    if (await exists(signing)) {
      await rm(signing, { recursive: true, force: true });
      report.signingKeyDeleted = true;
    }
  });

  await step("copied website", async () => {
    if (!CLONED_FOLDER.test(slug)) return;
    const cloned = join(clonedAssetsRoot(), slug);
    if (!(await exists(cloned))) return;
    if (await clonedFolderInUse(slug, projectId)) report.clonedKept = true;
    else report.moved.push(await moveFolder(cloned, join(trashDir, `cloned-${slug}`)));
  });

  if (report.moved.length) {
    // A note for whoever looks in the trash within the week.
    await writeFile(
      join(trashDir, "erased.json"),
      JSON.stringify({ projectId, slug, erasedAt: new Date().toISOString(), schema: report.schema, moved: report.moved }, null, 2),
    ).catch(() => {});
  }

  await db.project.deleteMany({ where: { id: projectId } });
  // Per-app records kept in settings: privacy log, deletion requests, alerts…
  await db.setting.deleteMany({ where: { key: { endsWith: `:${projectId}` } } });
  return report;
}

/* ── Platform accounts ───────────────────────────────────────── */

export type AccountDeletionCode = "not-found" | "reseller" | "last-admin" | "billing" | "erase-failed";

export class AccountDeletionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: AccountDeletionCode,
  ) {
    super(message);
  }
}

/** The small part of the Stripe client used to cancel subscriptions. */
export type SubscriptionClient = {
  subscriptions: {
    list(params: { customer: string; status: "all"; limit: number }): Promise<{ data: Array<{ id: string; status: string }> }>;
    retrieve(id: string): Promise<{ id: string; status: string }>;
    cancel(id: string): Promise<unknown>;
  };
};

const FINISHED = new Set(["canceled", "incomplete_expired"]);
const isMissing = (err: unknown) => (err as { code?: string } | null)?.code === "resource_missing";

/**
 * Cancels every live subscription of a customer (and the one on record),
 * at once. Subscriptions or customers the payment provider no longer knows
 * count as cancelled; any other failure throws. Returns how many it cancelled.
 */
export async function cancelStripeSubscriptions(client: SubscriptionClient, ids: { customer: string | null; subscription: string | null }): Promise<number> {
  const live = new Set<string>();
  if (ids.customer) {
    try {
      const page = await client.subscriptions.list({ customer: ids.customer, status: "all", limit: 100 });
      for (const s of page.data) if (!FINISHED.has(s.status)) live.add(s.id);
    } catch (err) {
      if (!isMissing(err)) throw err;
    }
  }
  if (ids.subscription && !live.has(ids.subscription)) {
    try {
      const s = await client.subscriptions.retrieve(ids.subscription);
      if (!FINISHED.has(s.status)) live.add(s.id);
    } catch (err) {
      if (!isMissing(err)) throw err;
    }
  }
  let cancelled = 0;
  for (const id of live) {
    try {
      await client.subscriptions.cancel(id);
      cancelled++;
    } catch (err) {
      if (!isMissing(err)) throw err;
    }
  }
  return cancelled;
}

const LIVE_STATUS = new Set(["TRIALING", "ACTIVE", "PAST_DUE", "UNPAID"]);

/**
 * Stops a person's paid plan before their account goes: on the platform's
 * Stripe account, or their reseller's for a reseller's client. Throws an
 * AccountDeletionError (nothing has been deleted yet) when that fails.
 */
export async function cancelBilling(
  user: Pick<User, "id" | "resellerId" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionStatus">,
): Promise<number> {
  if (!user.stripeCustomerId && !user.stripeSubscriptionId) return 0;
  let client: SubscriptionClient;
  try {
    client = (await stripe(billingScopeFor(user))) as unknown as SubscriptionClient;
  } catch {
    // Payments are switched off, so nothing can be billing through them,
    // unless the account still shows a running subscription.
    if (!LIVE_STATUS.has(user.subscriptionStatus)) return 0;
    throw new AccountDeletionError(
      "The subscription couldn't be cancelled because payments aren't reachable right now, so nothing was deleted.",
      502,
      "billing",
    );
  }
  let cancelled: number;
  try {
    cancelled = await cancelStripeSubscriptions(client, { customer: user.stripeCustomerId, subscription: user.stripeSubscriptionId });
  } catch (err) {
    console.error("[erase] cancelling the subscription failed", err instanceof Error ? err.message : err);
    throw new AccountDeletionError("The subscription couldn't be cancelled with the payment provider, so nothing was deleted. Please try again in a minute.", 502, "billing");
  }
  if (cancelled > 0 || LIVE_STATUS.has(user.subscriptionStatus)) {
    await db.user.update({ where: { id: user.id }, data: { plan: "FREE", subscriptionStatus: "CANCELED" } });
  }
  return cancelled;
}

export type DeleteAccountOptions = {
  /** Who asked: the person, the operator, their reseller, or a cleanup script. */
  actor: "self" | "admin" | "reseller" | "cleanup";
  /** The operator confirmed they cancelled the subscription themselves. */
  skipBilling?: boolean;
  /** Record it in the erasure log (default true; cleanup of bot sign-ups doesn't). */
  log?: boolean;
};

/**
 * Deletes a platform account: cancels its subscription, erases every app it
 * owns, then deletes the user (sessions, designs and usage go with it).
 * Refuses when the person runs a reseller workspace (its clients would lose
 * their billing), or is the last operator.
 */
export async function deleteUserAccount(userId: string, opts: DeleteAccountOptions): Promise<{ apps: number }> {
  const user = await db.user.findUnique({ where: { id: userId }, include: { ownedReseller: { select: { id: true } } } });
  if (!user) throw new AccountDeletionError("That account doesn't exist any more.", 404, "not-found");
  if (user.ownedReseller) {
    throw new AccountDeletionError("This account runs a reseller workspace. The workspace has to be removed before the account can be deleted.", 409, "reseller");
  }
  if (user.role === "ADMIN" && (await db.user.count({ where: { role: "ADMIN" } })) <= 1) {
    throw new AccountDeletionError("This is the only operator account, so it can't be deleted.", 409, "last-admin");
  }
  if (!opts.skipBilling) await cancelBilling(user);

  const projects = await db.project.findMany({ where: { ownerId: userId }, select: { id: true, slug: true } });
  for (const p of projects) {
    try {
      await eraseProject(p.id, p.slug);
    } catch (err) {
      console.error(`[erase] erasing app ${p.id} failed`, err);
      throw new AccountDeletionError("Some apps couldn't be deleted, so the account was kept. Please try again.", 500, "erase-failed");
    }
  }
  await db.user.deleteMany({ where: { id: userId } });
  if (opts.log !== false) {
    await appendErasureLog({ email: user.email, actor: opts.actor, apps: projects.length }).catch((err) =>
      console.error("[erase] writing the erasure log failed", err instanceof Error ? err.message : err),
    );
  }
  return { apps: projects.length };
}
