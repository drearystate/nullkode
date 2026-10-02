import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { emailEnabled } from "@/lib/mailer";
import { getRequestBrand } from "@/lib/reseller";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const { brand } = await getRequestBrand(null);
  const t = await getTranslations("auth.forgot");
  const back = <Link href="/login" className="font-medium text-brand-300 hover:text-brand-200">{t("back")}</Link>;
  if (!emailEnabled()) {
    return (
      <AuthShell
        title={t("title")}
        subtitle={brand.supportEmail
          ? t.rich("noEmailSupport", { email: brand.supportEmail, link: (c) => <a className="underline" dir="ltr" href={`mailto:${brand.supportEmail}`}>{c}</a> })
          : t("noEmail")}
        footer={back}
      >
        <span />
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")} footer={back}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
