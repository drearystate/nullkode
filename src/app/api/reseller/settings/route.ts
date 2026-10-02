import { z } from "zod";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { parsePlanLimits } from "@/lib/plan-limits";
import { requireReseller } from "@/lib/reseller-admin";

const Body = z.object({ allowSignup: z.boolean().optional(), planLimits: z.unknown().optional() });

/** Self-signup on the reseller's domain, and the limits each plan gives clients. */
export async function PATCH(req: Request) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: (await getTranslations({ locale: await requestLocale(), namespace: "reseller.api" }))("invalidSettings") }, { status: 400 });
  let planLimits: object | undefined;
  if (parsed.data.planLimits !== undefined) {
    const limits = parsePlanLimits(parsed.data.planLimits);
    if (!limits.ok) return json({ error: limits.error }, { status: 400 });
    planLimits = limits.value;
  }
  await db.reseller.update({
    where: { id: r.reseller.id },
    data: {
      ...(parsed.data.allowSignup !== undefined ? { allowSignup: parsed.data.allowSignup } : {}),
      ...(planLimits ? { planLimits } : {}),
    },
  });
  return json({ ok: true });
}
