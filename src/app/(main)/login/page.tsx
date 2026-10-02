import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestBrand } from "@/lib/reseller";
import { safeNext, withNext } from "@/lib/safe-next";
import { getTranslations } from "next-intl/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { brand, reseller } = await getRequestBrand(null);
  const t = await getTranslations("auth.login");
  const canSignUp = !reseller || reseller.allowSignup;
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle", { app: brand.appName })}
      footer={canSignUp ? (
        t.rich("noAccount", { link: (c) => <Link href={withNext("/signup", next)} className="font-medium text-brand-300 hover:text-brand-200">{c}</Link> })
      ) : null}
    >
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
