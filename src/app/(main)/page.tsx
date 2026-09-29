import { getBrand } from "@/lib/brand";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requestHost, resellerForHost } from "@/lib/reseller";
import { LandingHero } from "@/components/landing/landing-hero";
import { FeatureBento } from "@/components/landing/feature-bento";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { LandingNav } from "@/components/landing/landing-nav";
import { MODULE_REGISTRY } from "@/lib/modules/registry";

export default async function HomePage() {
  const [user, brand] = await Promise.all([getCurrentUser(), getBrand()]);
  const authed = !!user;
  // On a reseller's own domain the front door is sign-in, not our marketing site.
  if (await resellerForHost(await requestHost())) redirect(authed ? "/dashboard" : "/login");

  return (
    <main className="min-h-screen bg-surface-100 text-surface-900">
      <LandingNav authed={authed} name={brand.appName} logo={brand.logoDataUrl} />
      <LandingHero authed={authed} moduleCount={MODULE_REGISTRY.length} />
      <FeatureBento name={brand.appName} moduleCount={MODULE_REGISTRY.length} autoTls={process.env.NK_AUTO_TLS === "1"} />
      <PricingSection authed={authed} />
      <FaqSection name={brand.appName} />

      {/* Final CTA */}
      <section className="bg-surface-100 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-surface-900">
            Build the thing you&apos;ve been{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              putting off.
            </span>
          </h2>
          <p className="mt-5 text-lg text-surface-500 max-w-2xl mx-auto">
            Stop wrestling with half-finished no-code tools that fall apart the
            moment you need real logic. {brand.appName} gives you the UI, the backend,
            and the data — all visual.
          </p>
          <div className="mt-8">
            <Link
              href={authed ? "/dashboard" : "/signup"}
              className="inline-flex items-center gap-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-white px-8 py-4 text-base font-semibold transition shadow-lg shadow-surface-900/20"
            >
              {authed ? "Open your dashboard" : "Start building — it\u2019s free"}
              <span aria-hidden className="text-surface-400">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-surface-50 border-t border-surface-200 text-surface-700">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Link href="/" aria-label={brand.appName} className="inline-flex">
              {brand.logoWideDataUrl || brand.logoDataUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={(brand.logoWideDataUrl || brand.logoDataUrl)!} alt={brand.appName} className="h-9 w-auto" />
                : brand.appName === "Nullkode"
                  ? <Image src="/nullkode-banner.png" alt={brand.appName} width={160} height={32} className="h-9 w-auto" />
                  : <span className="text-xl font-semibold tracking-tight">{brand.appName}</span>}
            </Link>
            <p className="text-sm text-surface-500 mt-3 max-w-sm">
              The visual app builder with a real backend. Ship complete
              products — not marketing pages.
            </p>
          </div>
          <div className="text-sm text-surface-400">
            &copy; {new Date().getFullYear()} {brand.appName}
          </div>
        </div>
      </footer>
    </main>
  );
}
