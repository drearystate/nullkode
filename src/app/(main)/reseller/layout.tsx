import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { ResellerNav } from "@/components/reseller/reseller-nav";
import { getTranslations } from "next-intl/server";
import { ScopedIntl } from "@/i18n/scoped-intl";

export const dynamic = "force-dynamic";

export default async function ResellerLayout({ children }: { children: React.ReactNode }) {
  const user = await getRealUser();
  if (!user) redirect("/login");
  if (user.role !== "RESELLER") redirect("/dashboard");
  const reseller = await db.reseller.findUnique({ where: { ownerId: user.id }, select: { name: true } });
  if (!reseller) redirect("/dashboard");
  const t = await getTranslations("reseller");
  return (
    <ScopedIntl segment="(main)/reseller">
    <main className="min-h-screen">
      <TopBar user={user}><span className="studio-workspace-label">{t("workspace")}</span></TopBar>
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ResellerNav name={reseller.name} />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
    </ScopedIntl>
  );
}
