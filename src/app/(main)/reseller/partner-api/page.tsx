import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PartnerKeysManager } from "@/components/partner/partner-keys-manager";
import { listKeys } from "@/lib/partner/manage";
import { partnerApiAddresses } from "@/lib/partner/addresses";

export const dynamic = "force-dynamic";

/** Reseller → Partner API: keys for the reseller's own clients. */
export default async function ResellerPartnerApiPage() {
  const user = await getRealUser();
  if (!user || user.role !== "RESELLER") redirect("/dashboard");
  const reseller = await db.reseller.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!reseller) redirect("/dashboard");
  const keys = await listKeys({ kind: "reseller", userId: user.id, resellerId: reseller.id });
  const t = await getTranslations("partner.page");
  return (
    <div>
      <header>
        <p className="studio-eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-surface-400">{t("introReseller")}</p>
      </header>
      <PartnerKeysManager mode="reseller" initial={keys} {...partnerApiAddresses()} />
    </div>
  );
}
