import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SetPasswordForm } from "@/components/set-password-form";
import { peekAccountToken } from "@/lib/account-tokens";
import { getRequestBrand } from "@/lib/reseller";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const found = await peekAccountToken(token);
  const t = await getTranslations("auth.setPassword");
  if (!found) {
    return (
      <AuthShell
        title={t("expiredTitle")}
        subtitle={t("expiredSubtitle")}
        footer={<Link href="/forgot-password" className="font-medium text-brand-300 hover:text-brand-200">{t("resetMine")}</Link>}
      >
        <span />
      </AuthShell>
    );
  }
  const { brand } = await getRequestBrand(found.user);
  const invite = found.purpose === "invite";
  return (
    <AuthShell
      viewer={found.user}
      title={invite ? t("welcome", { app: brand.appName }) : t("chooseNew")}
      subtitle={invite ? t("inviteSubtitle", { email: found.user.email }) : t("forEmail", { email: found.user.email })}
    >
      <SetPasswordForm token={token} askName={invite && !found.user.name} />
    </AuthShell>
  );
}
