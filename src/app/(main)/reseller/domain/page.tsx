import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformTargetHost, platformTargetIp } from "@/lib/reseller";
import { DomainSetup } from "@/components/reseller/domain-setup";

export const dynamic = "force-dynamic";

export default async function ResellerDomainPage() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");
  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">DOMAIN</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your own address</h1>
        <p className="mt-2 text-sm text-surface-400">
          Clients sign in and build at an address you own — for example <span className="font-mono text-surface-200">apps.youragency.com</span>. Their published apps are shared from it too.
        </p>
      </header>
      <DomainSetup
        initialDomain={reseller.domain}
        initialToken={reseller.domainToken}
        initiallyVerified={Boolean(reseller.domainVerifiedAt)}
        target={platformTargetHost()}
        ip={await platformTargetIp()}
        autoTls={process.env.NK_AUTO_TLS === "1"}
      />
    </div>
  );
}
