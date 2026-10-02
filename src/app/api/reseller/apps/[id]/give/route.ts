import { z } from "zod";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

const tr = async () => getTranslations({ locale: await requestLocale(), namespace: "reseller.api" });
import { requireReseller } from "@/lib/reseller-admin";
import { canReceiveApps, loadTransferAccount, transferProjectTo } from "@/lib/project-transfer";

const Body = z.object({ clientId: z.string().min(1).max(64) });

/**
 * "Give to client": a reseller hands one of its own apps to one of its
 * clients, picked from its client list by id. Same checks as a transfer
 * (never a suspended account, never past the client's plan), same move
 * (src/lib/project-transfer.ts). The app stays in the reseller's workspace,
 * so the reseller's app quota doesn't apply: the app is already counted.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const { reseller } = r;
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: (await tr())("pickClient") }, { status: 400 });

  const project = await db.project.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!project || project.ownerId !== reseller.ownerId) {
    return json({ error: (await tr())("appNotFound") }, { status: 404 });
  }
  const client = await loadTransferAccount({ id: parsed.data.clientId });
  if (!client || client.resellerId !== reseller.id) {
    return json({ error: (await tr())("clientNotFound") }, { status: 404 });
  }
  if (!canReceiveApps(client)) {
    return json({ error: (await tr())("clientSuspended") }, { status: 409 });
  }

  const refused = await transferProjectTo(project.id, reseller.ownerId, client, { sameWorkspace: true });
  if (refused) return refused;
  return json({ ok: true, client: { id: client.id, email: client.email, name: client.name } });
}
