import { z } from "zod";
import { isLocale } from "@/i18n/locales";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { requestErrorsT } from "@/lib/errors-i18n";

/**
 * Per-user UI preferences, stored as loose JSON on the user row. PATCH
 * merges the given keys into the existing object so callers only send
 * what changed.
 */

const Body = z.object({
  helpTips: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  locale: z.string().refine(isLocale, "Unknown language").optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json({ prefs: (user.prefs as object | null) ?? {} });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const t = await requestErrorsT();
  if (!user) return json({ error: t("common.unauthorized") }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("common.invalidInput") }, { status: 400 });

  const current = (user.prefs as Record<string, unknown> | null) ?? {};
  const prefs = { ...current, ...parsed.data };
  await db.user.update({ where: { id: user.id }, data: { prefs } });
  return json({ prefs });
}
