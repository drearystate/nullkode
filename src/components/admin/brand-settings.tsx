import { getBrand } from "@/lib/brand";
import { BrandForm } from "@/components/reseller/brand-form";

/** The platform's own brand: name, logo, icon, colours, help email. */
export async function BrandSettings() {
  const b = await getBrand();
  return (
    <section id="brand" className="scroll-mt-40 space-y-3" aria-labelledby="brand-heading">
      <h2 id="brand-heading" className="text-xl font-semibold" data-help="White-label means your own name, logo and colours are shown everywhere instead of the platform's defaults.">White-label branding</h2>
      <p className="text-sm text-surface-400">Your platform&apos;s name, logo, browser icon, colours and help email. Everyone who isn&apos;t a reseller&apos;s client sees these. Resellers set their own brand in their dashboard.</p>
      <BrandForm
        endpoint="/api/admin/brand"
        savedText="Saved. Everyone sees the new branding on their next page."
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
