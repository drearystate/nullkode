import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestBrand } from "@/lib/reseller";

export default async function LoginPage() {
  const { brand, reseller } = await getRequestBrand(null);
  const canSignUp = !reseller || reseller.allowSignup;
  return (
    <AuthShell
      title="Welcome back"
      subtitle={`Log in to your ${brand.appName} account.`}
      footer={canSignUp ? (
        <>
          No account?{" "}
          <Link href="/signup" className="text-brand-600 hover:text-brand-500 font-medium">Create one</Link>
        </>
      ) : null}
    >
      <AuthForm mode="login" variant="light" />
    </AuthShell>
  );
}
