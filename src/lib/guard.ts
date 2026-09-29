import { db } from "./db";
import { getCurrentUser } from "./auth";
import { json } from "./utils";
import { limitsForUser } from "./plan-limits";
import type { User } from "@prisma/client";

export async function ownedProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: json({ error: "Unauthorized" }, { status: 401 }) };
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== user.id) {
    return { error: json({ error: "Not found" }, { status: 404 }) };
  }
  return { user, project };
}

/* ── Plan-limit enforcement helpers ─────────────────────────── */

/**
 * Operator-set quota on a reseller's total apps (the reseller's own plus all
 * of its clients'). Returns an error response when the quota is used up.
 */
async function checkResellerAppQuota(user: User) {
  const reseller = user.role === "RESELLER"
    ? await db.reseller.findUnique({ where: { ownerId: user.id } })
    : user.resellerId ? await db.reseller.findUnique({ where: { id: user.resellerId } }) : null;
  if (!reseller || reseller.maxApps === null) return null;
  const used = await db.project.count({
    where: { OR: [{ ownerId: reseller.ownerId }, { owner: { resellerId: reseller.id } }] },
  });
  if (used < reseller.maxApps) return null;
  return json(
    {
      error: user.role === "RESELLER"
        ? `Your reseller plan includes ${reseller.maxApps} apps across all clients, and they're all in use. Contact the platform operator to raise it.`
        : `This workspace has reached its app limit. Please contact ${reseller.name} to add more.`,
    },
    { status: 403 },
  );
}

export async function checkProjectLimit(user: User) {
  const quota = await checkResellerAppQuota(user);
  if (quota) return quota;
  const limits = await limitsForUser(user);
  if (limits.maxProjects === Infinity) return null;
  const count = await db.project.count({ where: { ownerId: user.id } });
  if (count >= limits.maxProjects) {
    return json(
      { error: `Your plan allows ${limits.maxProjects} apps. ${await moreHint(user)}` },
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
  const full = json({ error: "That account's plan has no room for another app." }, { status: 403 });
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
        { error: "That account's plan has no room for another live app. Unpublish this app first, or ask them to make room." },
        { status: 403 },
      );
    }
  }
  const domains = opts.domains ?? 0;
  if (domains > 0 && limits.maxCustomDomains !== Infinity) {
    const count = await db.domain.count({ where: { project: { ownerId: target.id } } });
    if (count + domains > limits.maxCustomDomains) {
      return json(
        {
          error: `That account's plan has no room for this app's own domain${domains === 1 ? "" : "s"}. Remove ${domains === 1 ? "it" : "them"} from the app first, or ask them to make room.`,
        },
        { status: 403 },
      );
    }
  }
  return null;
}

export async function checkPublishLimit(user: User) {
  const limits = await limitsForUser(user);
  if (limits.maxPublished === Infinity) return null;
  const count = await db.project.count({ where: { ownerId: user.id, published: true } });
  if (count >= limits.maxPublished) {
    return json(
      { error: `Your plan allows ${limits.maxPublished} published app${limits.maxPublished === 1 ? "" : "s"}. ${await moreHint(user)}` },
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
    return json(
      { error: `Your plan allows ${limits.maxPagesPerProject} page${limits.maxPagesPerProject === 1 ? "" : "s"} per app. ${await moreHint(user)}` },
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
    return json(
      {
        error: limits.maxCustomDomains === 0
          ? `Your plan doesn't include your own domains. ${await moreHint(user)}`
          : `Your plan allows ${limits.maxCustomDomains} domain${limits.maxCustomDomains === 1 ? "" : "s"} of your own. ${await moreHint(user)}`,
      },
      { status: 403 },
    );
  }
  return null;
}

export async function checkScheduledFlows(user: User) {
  const limits = await limitsForUser(user);
  if (!limits.scheduledFlows) {
    return json(
      { error: `Your plan doesn't include scheduled workflows. ${await moreHint(user)}` },
      { status: 403 },
    );
  }
  return null;
}

/**
 * What to do about a limit: "See plans" only when there is a plan to buy
 * (a fresh install often has none), otherwise who to ask.
 */
export async function moreHint(user: Pick<User, "resellerId">): Promise<string> {
  const { getPublicPlans, billingScopeFor } = await import("./stripe");
  const plans = await getPublicPlans(billingScopeFor(user)).catch(() => []);
  if (plans.some((p) => p.key !== "FREE")) return "See Billing to get more.";
  const reseller = user.resellerId ? await db.reseller.findUnique({ where: { id: user.resellerId }, select: { name: true } }) : null;
  const { getBrand } = await import("./brand");
  const name = reseller?.name ?? (await getBrand()).appName;
  return `Ask ${name} if you need more.`;
}
