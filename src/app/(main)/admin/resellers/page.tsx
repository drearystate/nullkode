import Link from "next/link";
import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resellerPoolUsage } from "@/lib/ai-quota";
import { emailEnabled } from "@/lib/mailer";
import { TopBar } from "@/components/top-bar";
import { ResellersManager } from "@/components/admin/resellers-manager";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminResellersPage() {
  const real = await getRealUser();
  if (!real) redirect("/login");
  if (real.role !== "ADMIN") redirect("/dashboard");
  const resellers = await db.reseller.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { id: true, email: true, name: true, emailVerified: true } }, _count: { select: { clients: true } } },
  });
  const [appCounts, aiCounts] = await Promise.all([
    Promise.all(resellers.map((r) => db.project.count({ where: { OR: [{ ownerId: r.ownerId }, { owner: { resellerId: r.id } }] } }))),
    // This month's AI actions: every client's plus the reseller's own, the
    // same count their monthly AI limit is checked against.
    Promise.all(resellers.map((r) => resellerPoolUsage(r))),
  ]);
  const t = await getTranslations("admin");
  return (
    <main className="min-h-screen">
      <TopBar user={real}><span className="studio-workspace-label">{t("system.workspace")}</span></TopBar>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/admin" className="text-sm text-surface-400 hover:text-surface-100"><span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t("home.title")}</Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("resellers.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-surface-400">
          {t("resellers.intro")}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-surface-400">
          {t("resellers.aiNote")}
        </p>
        <ResellersManager
          emailOn={emailEnabled()}
          resellers={resellers.map((r, i) => ({
            id: r.id,
            name: r.name,
            ownerId: r.owner.id,
            ownerEmail: r.owner.email,
            ownerInvited: !r.owner.emailVerified,
            status: r.status,
            clients: r._count.clients,
            apps: appCounts[i],
            maxClients: r.maxClients,
            maxApps: r.maxApps,
            ai: aiCounts[i],
            maxAiActions: r.maxAiActions,
            domain: r.domain,
            domainVerified: Boolean(r.domainVerifiedAt),
          }))}
        />
        <section className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="max-w-2xl">
            <h2 className="font-semibold">{t("resellers.partnerCardTitle")}</h2>
            <p className="mt-1 text-sm text-surface-400">{t("resellers.partnerCardBody")}</p>
          </div>
          <Link href="/admin/partner-api" className="btn-secondary" data-help={t("resellers.partnerCardLinkHelp")}>{t("resellers.partnerCardLink")}</Link>
        </section>
      </div>
    </main>
  );
}
