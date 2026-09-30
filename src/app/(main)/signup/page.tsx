import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestBrand } from "@/lib/reseller";
import { ideaFromNext, safeNext, withNext } from "@/lib/safe-next";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { reseller } = await getRequestBrand(null);
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  const logIn = <>Already have an account? <Link href={withNext("/login", next)} className="font-medium text-brand-300 hover:text-brand-200">Log in</Link></>;
  if (reseller && !reseller.allowSignup) {
    return (
      <AuthShell
        title="Accounts are by invitation"
        subtitle={`Ask ${reseller.name} to send you an invitation link.`}
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
      title="Create your account"
      subtitle={hasIdea ? "Create your account and you'll see a plan for your idea next." : "Start on the free plan. Upgrade any time."}
      footer={logIn}
    >
      <AuthForm mode="signup" next={next} />
    </AuthShell>
  );
}
