import { z } from "zod";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

const tr = async () => getTranslations({ locale: await requestLocale(), namespace: "reseller.api" });
import { issueAccountLink, requireReseller, resellerClient } from "@/lib/reseller-admin";

const Body = z.object({ purpose: z.enum(["invite", "reset"]) });

/** A fresh invitation or password-reset link for one client. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const client = await resellerClient(r.reseller, id);
  if (!client) return json({ error: (await tr())("clientNotFound") }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: (await tr())("invalidRequest") }, { status: 400 });
  return json(await issueAccountLink(client, parsed.data.purpose, r.user.name || r.reseller.name));
}
