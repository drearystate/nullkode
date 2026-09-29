import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicBaseUrlFor } from "@/lib/reseller";
import { OpenAppButton } from "@/components/reseller/open-app-button";
import { GiveToClientButton } from "@/components/reseller/give-to-client-button";

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
  // Clients an app of the reseller's own can be given to (suspended ones can't receive apps).
  const clients = (
    await db.user.findMany({
      where: { resellerId: reseller.id, suspendedAt: null },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    })
  ).map((c) => ({ id: c.id, label: c.name ? `${c.name} (${c.email})` : c.email }));
  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">APPS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Every client app</h1>
        <p className="mt-2 text-sm text-surface-400">
          {apps.length} app{apps.length === 1 ? "" : "s"}{reseller.maxApps !== null && <> of {reseller.maxApps} included in your plan</>}. Open one to edit it in the client's workspace, or give an app you built to one of your clients.
        </p>
      </header>
      <section className="card overflow-hidden" aria-label="Apps">
        {apps.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">When your clients create apps, they'll be listed here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-surface-400">
                <tr><th className="px-4 py-3 font-medium">App</th><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Updated</th><th className="px-4 py-3 text-right font-medium" /></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {apps.map((a) => {
                  const own = a.owner.id === reseller.ownerId;
                  const url = a.domains[0] ? `https://${a.domains[0].host}` : `${base}/app/${a.slug}`;
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3"><span className="block font-medium">{a.name}</span><span className="block text-xs text-surface-400">{a._count.pages} page{a._count.pages === 1 ? "" : "s"}{a.kind === "DESIGNER" ? " · Designer" : ""}</span></td>
                      <td className="px-4 py-3 text-surface-300">{own ? "You" : a.owner.name || a.owner.email}</td>
                      <td className="px-4 py-3">
                        {a.published
                          ? <a href={url} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300 hover:underline">Live ↗</a>
                          : <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-surface-400">Draft</span>}
                      </td>
                      <td className="px-4 py-3 text-surface-400">{a.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td className="px-4 py-3 text-right">
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
