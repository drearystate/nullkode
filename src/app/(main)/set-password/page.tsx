import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SetPasswordForm } from "@/components/set-password-form";
import { peekAccountToken } from "@/lib/account-tokens";
import { getRequestBrand } from "@/lib/reseller";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const found = await peekAccountToken(token);
  if (!found) {
    return (
      <AuthShell
        title="This link has expired"
        subtitle="Links work once and expire after a while. Ask whoever sent it for a new one, or reset your password yourself."
        footer={<Link href="/forgot-password" className="text-brand-600 hover:text-brand-500 font-medium">Reset my password</Link>}
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
      title={invite ? `Welcome to ${brand.appName}` : "Choose a new password"}
      subtitle={invite ? `Set a password to finish creating your account (${found.user.email}).` : `For ${found.user.email}.`}
    >
      <SetPasswordForm token={token} askName={invite && !found.user.name} />
    </AuthShell>
  );
}
