import Link from "next/link";
import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailEnabled } from "@/lib/mailer";
import { TopBar } from "@/components/top-bar";
import { ResellersManager } from "@/components/admin/resellers-manager";

export const dynamic = "force-dynamic";

export default async function AdminResellersPage() {
  const real = await getRealUser();
  if (!real) redirect("/login");
  if (real.role !== "ADMIN") redirect("/dashboard");
  const resellers = await db.reseller.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { id: true, email: true, name: true, emailVerified: true } }, _count: { select: { clients: true } } },
  });
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [appCounts, aiCounts] = await Promise.all([
    Promise.all(resellers.map((r) => db.project.count({ where: { OR: [{ ownerId: r.ownerId }, { owner: { resellerId: r.id } }] } }))),
    Promise.all(resellers.map((r) => db.aiUsage.count({ where: { createdAt: { gte: monthStart }, user: { resellerId: r.id } } }))),
  ]);
  return (
    <main className="min-h-screen">
      <TopBar user={real}><span className="studio-workspace-label">Administration</span></TopBar>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/admin" className="text-sm text-surface-400 hover:text-surface-100">← Admin</Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Resellers</h1>
        <p className="mt-2 max-w-2xl text-sm text-surface-400">
          Resellers sell your platform under their own brand. Each gets a dashboard to invite clients, brand the experience, connect their own domain and bill clients on their own Stripe account. You set how many clients and apps each reseller can have.
        </p>
        <ResellersManager
          emailOn={emailEnabled()}
          resellers={resellers.map((r, i) => ({
            id: r.id,
            name: r.name,
            ownerId: r.owner.id,
            ownerEmail: r.owner.email,
            ownerInvited: !r.owner.emailVerified,
            status: r.status,
            clients: r._count.clients,
            apps: appCounts[i],
            maxClients: r.maxClients,
            maxApps: r.maxApps,
            ai: aiCounts[i],
            maxAiActions: r.maxAiActions,
            domain: r.domain,
            domainVerified: Boolean(r.domainVerifiedAt),
          }))}
        />
      </div>
    </main>
  );
}
