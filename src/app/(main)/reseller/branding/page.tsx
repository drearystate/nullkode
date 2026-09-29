import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { resellerBrandConfig } from "@/lib/reseller";
import { BrandForm } from "@/components/reseller/brand-form";

export const dynamic = "force-dynamic";

export default async function ResellerBrandingPage() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");
  const brand = resellerBrandConfig(reseller, await getBrand());
  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">BRANDING</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Make it yours</h1>
        <p className="mt-2 text-sm text-surface-400">Your clients see this name, logo and colour on every screen, in emails, and on their sign-in page.</p>
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
        }}
      />
    </div>
  );
}
