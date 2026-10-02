import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { resellerBrandConfig } from "@/lib/reseller";
import { BrandForm } from "@/components/reseller/brand-form";
import { getTranslations } from "next-intl/server";
import { resellerDefaultLocale } from "@/i18n/server-locale";

export const dynamic = "force-dynamic";

export default async function ResellerBrandingPage() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");
  const brand = resellerBrandConfig(reseller, await getBrand());
  const t = await getTranslations("reseller.brandingPage");
  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-surface-400">{t("intro")}</p>
      </header>
      <BrandForm
        initial={{
          name: reseller.name,
          tagline: brand.tagline,
          logoDataUrl: brand.logoDataUrl,
          faviconDataUrl: brand.faviconDataUrl,
          colorPrimary: brand.colorPrimary,
          colorAccent: brand.colorAccent,
          supportEmail: brand.supportEmail ?? "",
          homepageUrl: brand.homepageUrl ?? "",
          defaultLocale: resellerDefaultLocale(reseller) ?? "",
        }}
        showLocale
      />
    </div>
  );
}
