import { db } from "./db";
import { getCurrentUser } from "./auth";
import { json } from "./utils";
import { limitsForUser } from "./plan-limits";
import type { User } from "@prisma/client";
import { requestErrorsT, type ErrT } from "./errors-i18n";

export async function ownedProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: json({ error: (await requestErrorsT())("common.unauthorized") }, { status: 401 }) };
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== user.id) {
    return { error: json({ error: (await requestErrorsT(user))("common.notFound") }, { status: 404 }) };
  }
  return { user, project };
}

/* ── Plan-limit enforcement helpers ─────────────────────────── */

/**
 * Operator-set quota on a reseller's total apps (the reseller's own plus all
 * of its clients'). Returns an error response when the quota is used up.
 */
async function checkResellerAppQuota(user: User, t?: ErrT) {
  const reseller = user.role === "RESELLER"
    ? await db.reseller.findUnique({ where: { ownerId: user.id } })
    : user.resellerId ? await db.reseller.findUnique({ where: { id: user.resellerId } }) : null;
  if (!reseller || reseller.maxApps === null) return null;
  const used = await db.project.count({
    where: { OR: [{ ownerId: reseller.ownerId }, { owner: { resellerId: reseller.id } }] },
  });
  if (used < reseller.maxApps) return null;
  t ??= await requestErrorsT(user);
  return json(
    {
      error: user.role === "RESELLER"
        ? t("guard.resellerQuota", { count: reseller.maxApps })
        : t("guard.workspaceFull", { reseller: reseller.name }),
    },
    { status: 403 },
  );
}

/** `t`: the language to word the refusal in (default: the request's). */
export async function checkProjectLimit(user: User, t?: ErrT) {
  const quota = await checkResellerAppQuota(user, t);
  if (quota) return quota;
  const limits = await limitsForUser(user);
  if (limits.maxProjects === Infinity) return null;
  const count = await db.project.count({ where: { ownerId: user.id } });
  if (count >= limits.maxProjects) {
    t ??= await requestErrorsT(user);
    return json(
      { error: t("guard.appLimit", { count: limits.maxProjects, hint: await moreHint(user, t) }) },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Whether `target` can receive an existing app (a transfer, or a hand-off
 * from a reseller to a client), worded for the person sending it. Applies
 * the target's plan: its app count, its live-app count when the app is
 * published, and its own-domain count when the app has domains. The
 * reseller's app quota only applies to moves between workspaces: within one
 * workspace the app is already counted in the reseller's total, so a
 * hand-off must not be refused just because the reseller is at its quota.
 */
export async function checkProjectLimitFor(
  target: User,
  opts: { sameWorkspace: boolean; published?: boolean; domains?: number },
) {
  const t = await requestErrorsT();
  const full = json({ error: t("guard.targetFull") }, { status: 403 });
  if (!opts.sameWorkspace && (await checkResellerAppQuota(target))) return full;
  const limits = await limitsForUser(target);
  if (limits.maxProjects !== Infinity) {
    const count = await db.project.count({ where: { ownerId: target.id } });
    if (count >= limits.maxProjects) return full;
  }
  if (opts.published && limits.maxPublished !== Infinity) {
    const count = await db.project.count({ where: { ownerId: target.id, published: true } });
    if (count >= limits.maxPublished) {
      return json(
        { error: t("guard.targetLiveFull") },
        { status: 403 },
      );
    }
  }
  const domains = opts.domains ?? 0;
  if (domains > 0 && limits.maxCustomDomains !== Infinity) {
    const count = await db.domain.count({ where: { project: { ownerId: target.id } } });
    if (count + domains > limits.maxCustomDomains) {
      return json(
        { error: t("guard.targetDomains", { count: domains }) },
        { status: 403 },
      );
    }
  }
  return null;
}

export async function checkPublishLimit(user: User, t?: ErrT) {
  const limits = await limitsForUser(user);
  if (limits.maxPublished === Infinity) return null;
  const count = await db.project.count({ where: { ownerId: user.id, published: true } });
  if (count >= limits.maxPublished) {
    t ??= await requestErrorsT(user);
    return json(
      { error: t("guard.publishLimit", { count: limits.maxPublished, hint: await moreHint(user, t) }) },
      { status: 403 },
    );
  }
  return null;
}

export async function checkPageLimit(user: User, projectId: string) {
  const limits = await limitsForUser(user);
  if (limits.maxPagesPerProject === Infinity) return null;
  const count = await db.page.count({ where: { projectId } });
  if (count >= limits.maxPagesPerProject) {
    const t = await requestErrorsT(user);
    return json(
      { error: t("guard.pageLimit", { count: limits.maxPagesPerProject, hint: await moreHint(user, t) }) },
      { status: 403 },
    );
  }
  return null;
}

export async function checkDomainLimit(user: User) {
  const limits = await limitsForUser(user);
  if (limits.maxCustomDomains === Infinity) return null;
  const count = await db.domain.count({
    where: { project: { ownerId: user.id } },
  });
  if (count >= limits.maxCustomDomains) {
    const t = await requestErrorsT(user);
    const hint = await moreHint(user, t);
    return json(
      {
        error: limits.maxCustomDomains === 0
          ? t("guard.noDomains", { hint })
          : t("guard.domainLimit", { count: limits.maxCustomDomains, hint }),
      },
      { status: 403 },
    );
  }
  return null;
}

export async function checkScheduledFlows(user: User) {
  const limits = await limitsForUser(user);
  if (!limits.scheduledFlows) {
    const t = await requestErrorsT(user);
    return json(
      { error: t("guard.noScheduled", { hint: await moreHint(user, t) }) },
      { status: 403 },
    );
  }
  return null;
}

/**
 * What to do about a limit: "See plans" only when there is a plan to buy
 * (a fresh install often has none), otherwise who to ask.
 */
export async function moreHint(user: Pick<User, "resellerId">, t?: ErrT): Promise<string> {
  const { getPublicPlans, billingScopeFor } = await import("./stripe");
  t ??= await requestErrorsT(user);
  const plans = await getPublicPlans(billingScopeFor(user), t).catch(() => []);
  if (plans.some((p) => p.key !== "FREE")) return t("guard.hintBilling");
  const reseller = user.resellerId ? await db.reseller.findUnique({ where: { id: user.resellerId }, select: { name: true } }) : null;
  const { getBrand } = await import("./brand");
  const name = reseller?.name ?? (await getBrand()).appName;
  return t("guard.hintAsk", { name });
}
