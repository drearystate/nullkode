import { redirect } from "next/navigation";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { AppearanceCard, HelpPrefsCard, PasswordCard, ProfileCard } from "@/components/account-settings";
import { DeleteAccountCard } from "@/components/delete-account";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

const LIVE_STATUS = new Set(["TRIALING", "ACTIVE", "PAST_DUE", "UNPAID"]);

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [impersonation, apps, reseller, admins] = await Promise.all([
    getImpersonation(),
    db.project.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, androidSigningKey: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.reseller.findUnique({ where: { ownerId: user.id }, select: { id: true } }),
    user.role === "ADMIN" ? db.user.count({ where: { role: "ADMIN" } }) : Promise.resolve(0),
  ]);
  const blocked = impersonation
    ? "Only the person who owns this account can delete it. As an admin you can delete accounts from Admin, under Users."
    : reseller
      ? "You run a reseller workspace, so your account can't be deleted here. Ask the platform's operator to remove the workspace first."
      : user.role === "ADMIN" && admins <= 1
        ? "You're the only operator of this platform, so your account can't be deleted."
        : null;
  const helpTipsOn = (user.prefs as { helpTips?: boolean } | null)?.helpTips ?? true;

  return (
    <main className="min-h-screen">
      <TopBar user={user} />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="mt-1 text-sm text-surface-400">Your photo, your details, and how the studio looks and works for you.</p>
        </div>
        <ProfileCard name={user.name ?? ""} email={user.email} avatarUrl={user.avatarUrl} readOnly={Boolean(impersonation)} />
        <PasswordCard readOnly={Boolean(impersonation)} />
        <AppearanceCard />
        <HelpPrefsCard initialOn={helpTipsOn} />
        <DeleteAccountCard
          email={user.email}
          apps={apps.map((a) => ({ id: a.id, name: a.name, hasUploadKey: Boolean(a.androidSigningKey) }))}
          paying={LIVE_STATUS.has(user.subscriptionStatus)}
          blocked={blocked}
        />
      </div>
    </main>
  );
}
