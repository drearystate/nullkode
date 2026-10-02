import { startImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

const tr = async () => getTranslations({ locale: await requestLocale(), namespace: "reseller.api" });
import { requireReseller, resellerClient } from "@/lib/reseller-admin";

/** Open a client's workspace to help them (their apps, their editor). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const client = await resellerClient(r.reseller, id);
  if (!client) return json({ error: (await tr())("clientNotFound") }, { status: 404 });
  await startImpersonation(client.id);
  return json({ ok: true });
}
