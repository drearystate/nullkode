import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailEnabled } from "@/lib/mailer";
import { ClientsManager } from "@/components/reseller/clients-manager";

export const dynamic = "force-dynamic";

export default async function ResellerClientsPage() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");
  const clients = await db.user.findMany({
    where: { resellerId: reseller.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, plan: true, subscriptionStatus: true, emailVerified: true, suspendedAt: true, createdAt: true, lastSeenAt: true,
      _count: { select: { projects: true } },
    },
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">CLIENTS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your clients</h1>
        <p className="mt-2 text-sm text-surface-400">
          Invite clients, set their plan, and open their workspace to help them.
          {reseller.maxClients !== null && <> You're using {clients.length} of {reseller.maxClients} client seats.</>}
        </p>
      </header>
      <ClientsManager
        emailOn={emailEnabled()}
        atLimit={reseller.maxClients !== null && clients.length >= reseller.maxClients}
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          plan: c.plan,
          paying: c.subscriptionStatus === "ACTIVE" || c.subscriptionStatus === "TRIALING",
          invited: !c.emailVerified,
          suspended: Boolean(c.suspendedAt),
          apps: c._count.projects,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
