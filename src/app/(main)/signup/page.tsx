import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestBrand } from "@/lib/reseller";
import { ideaFromNext, safeNext, withNext } from "@/lib/safe-next";
import { getTranslations } from "next-intl/server";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { reseller } = await getRequestBrand(null);
  const t = await getTranslations("auth.signup");
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  const logIn = t.rich("haveAccount", { link: (c) => <Link href={withNext("/login", next)} className="font-medium text-brand-300 hover:text-brand-200">{c}</Link> });
  if (reseller && !reseller.allowSignup) {
    return (
      <AuthShell
        title={t("inviteOnlyTitle")}
        subtitle={t("inviteOnlySubtitle", { reseller: reseller.name })}
        footer={logIn}
      >
        <span />
      </AuthShell>
    );
  }
  // Someone who described their app on the home page sees its plan next.
  const hasIdea = Boolean(ideaFromNext(next));
  return (
    <AuthShell
      title={t("title")}
      subtitle={hasIdea ? t("subtitleIdea") : t("subtitle")}
      footer={logIn}
    >
      <AuthForm mode="signup" next={next} />
    </AuthShell>
  );
}
