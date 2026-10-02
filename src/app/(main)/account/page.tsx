import { redirect } from "next/navigation";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { getTranslations } from "next-intl/server";
import { AppearanceCard, HelpPrefsCard, LanguageCard, PasswordCard, ProfileCard } from "@/components/account-settings";
import { DeleteAccountCard } from "@/components/delete-account";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("account");
  return { title: t("metaTitle") };
}

const LIVE_STATUS = new Set(["TRIALING", "ACTIVE", "PAST_DUE", "UNPAID"]);

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [impersonation, apps, reseller, admins] = await Promise.all([
    getImpersonation(),
    db.project.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, androidSigningKey: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.reseller.findUnique({ where: { ownerId: user.id }, select: { id: true } }),
    user.role === "ADMIN" ? db.user.count({ where: { role: "ADMIN" } }) : Promise.resolve(0),
  ]);
  const t = await getTranslations("account");
  const blocked = impersonation
    ? t("blocked.impersonating")
    : reseller
      ? t("blocked.reseller")
      : user.role === "ADMIN" && admins <= 1
        ? t("blocked.onlyOperator")
        : null;
  const helpTipsOn = (user.prefs as { helpTips?: boolean } | null)?.helpTips ?? true;

  return (
    <main className="min-h-screen">
      <TopBar user={user} />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-surface-400">{t("intro")}</p>
        </div>
        <ProfileCard name={user.name ?? ""} email={user.email} avatarUrl={user.avatarUrl} readOnly={Boolean(impersonation)} />
        <PasswordCard readOnly={Boolean(impersonation)} />
        <AppearanceCard />
        <LanguageCard />
        <HelpPrefsCard initialOn={helpTipsOn} />
        <DeleteAccountCard
          email={user.email}
          apps={apps.map((a) => ({ id: a.id, name: a.name, hasUploadKey: Boolean(a.androidSigningKey) }))}
          paying={LIVE_STATUS.has(user.subscriptionStatus)}
          blocked={blocked}
        />
      </div>
    </main>
  );
}
