import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { PartnerSsoRedeemer } from "@/components/partner/sso-redeemer";

export const dynamic = "force-dynamic";

// "same-origin", not "no-referrer": under no-referrer the browser sends `Origin: null` with the ticket form's
// same-site POST, and middleware refuses that as a cross-site write. The ticket lives in the #fragment, which is
// never part of a Referer, and other sites still get no referrer at all.
export const metadata: Metadata = { referrer: "same-origin", robots: { index: false, follow: false } };

/**
 * Landing page of a partner's one-time sign-in link (/partner-sso#t=…).
 * The ticket is in the #fragment, so it never reaches a server log; the page
 * posts it to /api/partner-sso, which signs the person in and redirects.
 */
export default async function PartnerSsoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const t = await getTranslations("partner.sso");
  if (error) {
    const which = error === "blocked" ? "blocked" : error === "busy" ? "busy" : "expired";
    return (
      <AuthShell
        title={t(`${which}Title`)}
        subtitle={t(`${which}Body`)}
        footer={<Link href="/login" className="font-medium text-brand-300 hover:text-brand-200">{t("signIn")}</Link>}
      >
        <span />
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t("title")} subtitle={t("body")}>
      <PartnerSsoRedeemer missing={t("missing")} />
    </AuthShell>
  );
}
