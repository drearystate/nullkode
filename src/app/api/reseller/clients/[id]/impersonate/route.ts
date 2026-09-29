import { startImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";
import { requireReseller, resellerClient } from "@/lib/reseller-admin";

/** Open a client's workspace to help them (their apps, their editor). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const client = await resellerClient(r.reseller, id);
  if (!client) return json({ error: "Client not found." }, { status: 404 });
  await startImpersonation(client.id);
  return json({ ok: true });
}
