import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { PartnerKeysManager } from "@/components/partner/partner-keys-manager";
import { listKeys } from "@/lib/partner/manage";
import { partnerApiAddresses } from "@/lib/partner/addresses";

export const dynamic = "force-dynamic";

/** Admin → Partner API: keys that let other services manage accounts and build apps. */
export default async function AdminPartnerApiPage() {
  const real = await getRealUser();
  if (!real) redirect("/login");
  if (real.role !== "ADMIN") redirect("/dashboard");
  const [keys, resellers] = await Promise.all([
    listKeys({ kind: "admin", userId: real.id }),
    db.reseller.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const t = await getTranslations("partner.page");
  const ta = await getTranslations("admin");
  return (
    <main className="min-h-screen">
      <TopBar user={real}><span className="studio-workspace-label">{ta("system.workspace")}</span></TopBar>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/admin" className="text-sm text-surface-400 hover:text-surface-100"><span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {ta("home.title")}</Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-surface-400">{t("introAdmin")}</p>
        <PartnerKeysManager mode="admin" initial={keys} resellers={resellers} {...partnerApiAddresses()} />
      </div>
    </main>
  );
}
