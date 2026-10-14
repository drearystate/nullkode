import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MailCheck, MailX } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { withNext } from "@/lib/safe-next";
import { inviteByToken, normalizeEmail } from "@/lib/sharing/collaborators";
import { targetInfo, type ShareKind } from "@/lib/sharing/access";
import { AcceptInviteButton } from "@/components/sharing/accept-invite";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("sharing");
  return { title: t("invite.eyebrow"), robots: { index: false, follow: false } };
}

/**
 * The link in an invitation email (docs/sharing.md): signed in with the
 * invited address, "Accept invitation" adds the app, design or game to
 * Shared with me and opens it.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(withNext("/login", `/invites/${encodeURIComponent(token)}`));
  const t = await getTranslations("sharing");
  const invite = await inviteByToken(token);
  const target = invite ? await targetInfo(invite.kind as ShareKind, invite.targetId) : null;
  const from = invite ? invite.owner.name?.trim() || invite.owner.email : "";
  const shell = (body: React.ReactNode) => <main className="studio-shell min-h-screen"><TopBar user={user} /><div className="mx-auto max-w-xl px-4 py-16 sm:px-6">{body}</div></main>;

  if (!invite || !target || invite.status !== "pending" || target.ownerId !== invite.ownerId) {
    return shell(<div className="card p-8 text-center" data-testid="invite-problem" data-problem="gone"><MailX size={32} className="mx-auto text-surface-400" aria-hidden /><h1 className="mt-4 text-xl font-semibold">{t("invite.goneTitle")}</h1><p className="mt-2 text-sm text-surface-400">{t("invite.gone")}</p><Link href="/dashboard#shared-with-me" className="btn-ghost mt-6 inline-flex">{t("page.backToDashboard")}</Link></div>);
  }
  if (invite.expiresAt && invite.expiresAt <= new Date()) {
    return shell(<div className="card p-8 text-center" data-testid="invite-problem" data-problem="expired"><MailX size={32} className="mx-auto text-surface-400" aria-hidden /><h1 className="mt-4 text-xl font-semibold">{t("invite.expiredTitle")}</h1><p className="mt-2 text-sm text-surface-400">{t("invite.expired", { from })}</p><Link href="/dashboard" className="btn-ghost mt-6 inline-flex">{t("page.backToDashboard")}</Link></div>);
  }
  const role = invite.role === "viewer" ? "viewer" : "editor";
  const wrongAccount = normalizeEmail(user.email) !== invite.email;
  return shell(<div className="card p-8" data-testid="invite-page">
    <MailCheck size={30} className="text-brand-300" aria-hidden />
    <p className="studio-eyebrow mt-4 text-brand-300">{t("invite.eyebrow")}</p>
    <h1 className="mt-2 text-2xl font-semibold" dir="auto">{t("invite.title", { title: target.name })}</h1>
    <p className="mt-3 text-sm text-surface-300" dir="auto">{t("invite.body", { from, title: target.name, kind: invite.kind, role })}</p>
    <p className="mt-2 text-sm text-surface-400">{t(role === "viewer" ? "invite.viewer" : "invite.editor")}</p>
    {wrongAccount
      ? <div role="alert" className="mt-6 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-4 text-sm text-amber-100" data-testid="invite-wrong-account"><p>{t("invite.wrongAccount", { email: invite.email, me: user.email })}</p><form action="/api/auth/logout" method="post" className="mt-3"><button type="submit" className="btn-ghost">{t("invite.signOut")}</button></form></div>
      : <AcceptInviteButton token={token} />}
  </div>);
}
