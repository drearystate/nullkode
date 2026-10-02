import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { ownedProject } from "@/lib/guard";
import { listAppAdmins, setAppAdmin } from "@/lib/app-admin";
import { json } from "@/lib/utils";
import { db } from "@/lib/db";

/** The owner's admin login for their app (see lib/app-admin.ts). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const [admins, pages] = await Promise.all([
    listAppAdmins(id),
    db.page.findMany({ where: { projectId: id }, select: { slug: true, title: true, html: true }, orderBy: { createdAt: "asc" } }),
  ]);
  // Pages only the app's team can open (they carry a role marker).
  const adminPages = pages.filter((p) => /<!--\s*nk:require-role:/.test(p.html)).map((p) => ({ slug: p.slug, title: p.title }));
  return json({ hasSignIn: admins !== null, admins: admins ?? [], adminPages, published: r.project.published });
}

type T = Awaited<ReturnType<typeof getTranslations<"project.appAdminApi">>>;

const body = (t: T) =>
  z.object({
    email: z.string().trim().email(t("invalidEmail")).max(200),
    password: z.string().min(10, t("shortPassword", { min: 10 })).max(200),
    name: z.string().trim().max(80).optional(),
  });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const t = await getTranslations({ locale: await requestLocale(), namespace: "project.appAdminApi" });
  const parsed = body(t).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? t("checkDetails") }, { status: 400 });
  try {
    const result = await setAppAdmin(id, parsed.data);
    return json({ ok: true, result, admins: (await listAppAdmins(id)) ?? [] });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : t("saveFailed") }, { status: 400 });
  }
}
