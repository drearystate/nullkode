import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestBrand } from "@/lib/reseller";
import { safeNext, withNext } from "@/lib/safe-next";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { brand, reseller } = await getRequestBrand(null);
  const canSignUp = !reseller || reseller.allowSignup;
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  return (
    <AuthShell
      title="Welcome back"
      subtitle={`Log in to your ${brand.appName} account.`}
      footer={canSignUp ? (
        <>
          No account?{" "}
          <Link href={withNext("/signup", next)} className="font-medium text-brand-300 hover:text-brand-200">Create one</Link>
        </>
      ) : null}
    >
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
