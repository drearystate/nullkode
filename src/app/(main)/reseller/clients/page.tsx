import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailEnabled } from "@/lib/mailer";
import { loadClientRows } from "@/lib/reseller-clients";
import { ClientsManager } from "@/components/reseller/clients-manager";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ResellerClientsPage() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");
  const now = new Date();
  const clients = await loadClientRows(reseller, now);
  const paying = clients.filter((c) => c.paying).length;
  const pastDue = clients.filter((c) => c.subscriptionStatus === "PAST_DUE").length;
  const t = await getTranslations("reseller.clientsPage");
  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-surface-400">
          {t("intro")}
          {reseller.maxClients !== null && <> {t("seats", { used: clients.length, max: reseller.maxClients })}</>}
          {clients.length > 0 && <> {pastDue > 0 ? t("payingPastDue", { paying, pastDue }) : t("paying", { paying })}</>}
        </p>
      </header>
      <ClientsManager
        emailOn={emailEnabled()}
        seatsLeft={reseller.maxClients === null ? null : Math.max(0, reseller.maxClients - clients.length)}
        now={now.getTime()}
        clients={clients}
      />
    </div>
  );
}
