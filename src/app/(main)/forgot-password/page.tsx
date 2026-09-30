import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { emailEnabled } from "@/lib/mailer";
import { getRequestBrand } from "@/lib/reseller";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const { brand } = await getRequestBrand(null);
  const back = <Link href="/login" className="font-medium text-brand-300 hover:text-brand-200">Back to log in</Link>;
  if (!emailEnabled()) {
    return (
      <AuthShell
        title="Reset your password"
        subtitle={brand.supportEmail
          ? <>Password emails aren't set up here yet. Email <a className="underline" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> and they can send you a reset link.</>
          : "Password emails aren't set up here yet. Ask your administrator to send you a reset link."}
        footer={back}
      >
        <span />
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we'll send you a link to choose a new password." footer={back}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
