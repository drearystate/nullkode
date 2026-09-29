import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { canReceiveApps, loadTransferAccount, transferProjectTo, workspaceKey } from "@/lib/project-transfer";

/**
 * Transfer an app to another registered account. Owner-only.
 *
 * Everything an app contains (pages, flows, data, domains, module installs)
 * is keyed by projectId, so one owner change moves the whole app (see
 * src/lib/project-transfer.ts, which also detaches Designer mirrors).
 *
 * Guard rails:
 * - Only within the sender's workspace (a reseller and its clients, or the
 *   platform's own customers); the operator may move apps anywhere.
 * - Never into a suspended account, or past the receiving account's plan.
 * - Unknown and ineligible emails get the same answer, and each account
 *   gets 10 tries an hour, so the form can't be used to find out who has an
 *   account here.
 * - Nobody acting as someone else (a reseller helping a client) can give
 *   that person's apps away; only the operator can.
 */

const Body = z.object({
  email: z.string().trim().email().max(320),
});

const TRIES_PER_HOUR = 10;

const NOT_ELIGIBLE =
  "We couldn't transfer the app to that email. Check the address: it must belong to an account here that can receive apps from you.";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, real] = await Promise.all([getCurrentUser(), getRealUser()]);
  if (!user || !real) return json({ error: "Unauthorized" }, { status: 401 });
  const operator = real.role === "ADMIN";
  if (real.id !== user.id && !operator) {
    return json(
      { error: "Only the app's owner can transfer it. Ask them to do it from their own account." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, name: true, ownerId: true },
  });
  if (!project || project.ownerId !== user.id) {
    return json({ error: "Project not found" }, { status: 404 });
  }

  if (!operator && !hitLimit(`transfer:${user.id}`, TRIES_PER_HOUR, 60 * 60_000).ok) {
    return json(
      { error: "That's a lot of transfer attempts. Please wait an hour and try again." },
      { status: 429 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const [target, sender] = await Promise.all([
    loadTransferAccount({ email: parsed.data.email }),
    loadTransferAccount({ id: user.id }),
  ]);
  if (target && target.id === user.id) {
    return json({ error: "You already own this app." }, { status: 400 });
  }
  const sameWorkspace = Boolean(target && sender && workspaceKey(target) === workspaceKey(sender));
  if (!target || !sender || !canReceiveApps(target) || (!sameWorkspace && !operator)) {
    return json({ error: NOT_ELIGIBLE }, { status: 400 });
  }

  const refused = await transferProjectTo(project.id, user.id, target, { sameWorkspace });
  if (refused) return refused;
  return json({ ok: true, newOwner: target.email });
}
