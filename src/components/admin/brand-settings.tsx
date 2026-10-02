import { getTranslations } from "next-intl/server";
import { getBrand } from "@/lib/brand";
import { BrandForm } from "@/components/reseller/brand-form";

/** The platform's own brand: name, logo, icon, colours, help email. */
export async function BrandSettings() {
  const b = await getBrand();
  const t = await getTranslations("admin.brandSettings");
  return (
    <section id="brand" className="scroll-mt-40 space-y-3" aria-labelledby="brand-heading">
      <h2 id="brand-heading" className="text-xl font-semibold" data-help={t("help")}>{t("title")}</h2>
      <p className="text-sm text-surface-400">{t("body")}</p>
      <BrandForm
        endpoint="/api/admin/brand"
        savedText={t("saved")}
        initial={{
          name: b.appName,
          tagline: b.tagline ?? "",
          logoDataUrl: b.logoWideDataUrl || b.logoDataUrl,
          faviconDataUrl: b.faviconDataUrl,
          colorPrimary: b.colorPrimary,
          colorAccent: b.colorAccent,
          supportEmail: b.supportEmail ?? "",
          homepageUrl: b.homepageUrl ?? "",
        }}
      />
    </section>
  );
}
