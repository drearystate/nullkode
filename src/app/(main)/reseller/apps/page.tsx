import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicBaseUrlFor } from "@/lib/reseller";
import { OpenAppButton } from "@/components/reseller/open-app-button";
import { GiveToClientButton } from "@/components/reseller/give-to-client-button";
import { getFormatter, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ResellerAppsPage() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");
  const apps = await db.project.findMany({
    where: { OR: [{ ownerId: reseller.ownerId }, { owner: { resellerId: reseller.id } }] },
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true, name: true, slug: true, published: true, updatedAt: true, kind: true,
      owner: { select: { id: true, name: true, email: true } },
      domains: { where: { status: "ACTIVE" }, select: { host: true }, take: 1 },
      _count: { select: { pages: true } },
    },
  });
  const base = await publicBaseUrlFor(user);
  const t = await getTranslations("reseller.apps");
  const format = await getFormatter();
  // Clients an app of the reseller's own can be given to (suspended ones can't receive apps).
  const clients = (
    await db.user.findMany({
      where: { resellerId: reseller.id, suspendedAt: null },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    })
  ).map((c) => ({ id: c.id, label: c.name ? t("clientLabel", { name: c.name, email: c.email }) : c.email }));
  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-surface-400">
          {reseller.maxApps !== null ? t("introMax", { count: apps.length, max: reseller.maxApps }) : t("intro", { count: apps.length })}
        </p>
      </header>
      <section className="card overflow-hidden" aria-label={t("label")}>
        {apps.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">{t("none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs uppercase tracking-wider text-surface-400">
                <tr><th className="px-4 py-3 text-start font-medium">{t("colApp")}</th><th className="px-4 py-3 text-start font-medium">{t("colClient")}</th><th className="px-4 py-3 text-start font-medium">{t("colStatus")}</th><th className="px-4 py-3 text-start font-medium">{t("colUpdated")}</th><th className="px-4 py-3 text-end font-medium" /></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {apps.map((a) => {
                  const own = a.owner.id === reseller.ownerId;
                  const url = a.domains[0] ? `https://${a.domains[0].host}` : `${base}/app/${a.slug}`;
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3"><span className="block font-medium">{a.name}</span><span className="block text-xs text-surface-400">{a.kind === "DESIGNER" ? t("pagesDesigner", { count: a._count.pages }) : t("pages", { count: a._count.pages })}</span></td>
                      <td className="px-4 py-3 text-surface-300">{own ? t("you") : a.owner.name || a.owner.email}</td>
                      <td className="px-4 py-3">
                        {a.published
                          ? <a href={url} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300 hover:underline">{t("live")} <span aria-hidden className="inline-block rtl:-scale-x-100">↗</span></a>
                          : <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-surface-400">{t("draft")}</span>}
                      </td>
                      <td className="px-4 py-3 text-surface-400">{format.dateTime(a.updatedAt, { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td className="px-4 py-3 text-end">
                        <div className="flex flex-wrap items-start justify-end gap-1">
                          {own && <GiveToClientButton projectId={a.id} projectName={a.name} clients={clients} />}
                          <OpenAppButton projectId={a.id} ownerId={own ? null : a.owner.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
