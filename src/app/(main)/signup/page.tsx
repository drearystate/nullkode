import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestBrand } from "@/lib/reseller";

export default async function SignupPage() {
  const { reseller } = await getRequestBrand(null);
  if (reseller && !reseller.allowSignup) {
    return (
      <AuthShell
        title="Accounts are by invitation"
        subtitle={`Ask ${reseller.name} to send you an invitation link.`}
        footer={<>Already have an account? <Link href="/login" className="text-brand-600 hover:text-brand-500 font-medium">Log in</Link></>}
      >
        <span />
      </AuthShell>
    );
  }
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start on the free plan. Upgrade any time."
      footer={<>Already have an account? <Link href="/login" className="text-brand-600 hover:text-brand-500 font-medium">Log in</Link></>}
    >
      <AuthForm mode="signup" variant="light" />
    </AuthShell>
  );
}
