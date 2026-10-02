import Link from "next/link";
import { Check } from "lucide-react";
import { getRequestBrand } from "@/lib/reseller";
import { BRAND_DEFAULTS } from "@/lib/brand";
import { BrandWordmark } from "./brand-wordmark";
import { ThemeToggle } from "./theme-toggle";
import { LanguagePicker } from "./language-picker";
import { getTranslations } from "next-intl/server";

/**
 * Frame for the sign-in, sign-up and password screens. Shows whichever brand
 * the visitor is under — a reseller's on its own domain, the operator's
 * otherwise — so white-labelled clients never see the platform's name.
 *
 * Wide screens get two halves: the form, and a panel about the product (the
 * studio's own screenshot only for the platform's stock brand). Phones get
 * the form alone. Colours follow the light/dark theme.
 */
export async function AuthShell({
  title,
  subtitle,
  children,
  footer,
  viewer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** The person the screen is for (an invitation), when known: a reseller's client sees the reseller's brand on any address. */
  viewer?: Parameters<typeof getRequestBrand>[0];
}) {
  const { brand, reseller } = await getRequestBrand(viewer ?? null);
  const logo = brand.logoWideDataUrl || brand.logoDataUrl;
  const isStockBrand = !reseller && brand.appName === BRAND_DEFAULTS.appName && !logo;
  const t = await getTranslations("auth.shell");
  const points = [t("points.describe"), t("points.data"), t("points.publish")];

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-surface-950 text-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      style={{ ["--nk-brand-primary" as string]: brand.colorPrimary }}
    >
      {/* Soft brand glow behind the form. */}
      <div aria-hidden="true" className="pointer-events-none absolute -start-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-500/10 blur-3xl" />

      <section className="relative flex min-h-screen flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-lg font-semibold tracking-tight" aria-label={t("home", { app: brand.appName })}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brand.appName} className="h-9 w-auto max-w-[200px] object-contain" />
            ) : (
              <BrandWordmark name={brand.appName} markSize={30} className="text-xl" />
            )}
          </Link>
          <div className="flex items-center gap-2">
            <LanguagePicker compact collapse />
            <ThemeToggle className="rounded-full border border-white/10 !p-2 hover:border-white/20" />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-surface-400">{subtitle}</p>}
            {children}
            {footer && <div className="mt-8 border-t border-white/10 pt-6 text-sm text-surface-400">{footer}</div>}
          </div>
        </div>

        {brand.supportEmail && (
          <p className="text-center text-xs text-surface-500 lg:text-start">
            {t.rich("needHelp", { email: brand.supportEmail, link: (c) => <a className="underline underline-offset-2 hover:text-surface-300" dir="ltr" href={`mailto:${brand.supportEmail}`}>{c}</a> })}
          </p>
        )}
      </section>

      <aside aria-hidden="true" className="relative hidden overflow-hidden border-s border-white/10 bg-surface-900 lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgb(var(--c-brand-500)/0.22),transparent_70%),radial-gradient(50%_45%_at_20%_90%,rgb(var(--c-sky-500)/0.16),transparent_70%)]" />
        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">{isStockBrand ? t("eyebrow") : brand.appName}</p>
          <p className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            {isStockBrand ? t.rich("headline", { accent: (c) => <span className="bg-gradient-to-r from-brand-400 to-sky-400 bg-clip-text text-transparent">{c}</span> }) : brand.tagline || t("fallbackTagline")}
          </p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-surface-300">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-300"><Check size={13} strokeWidth={3} /></span>
                {p}
              </li>
            ))}
          </ul>
          {isStockBrand && (
            <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-surface-950 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-surface-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-surface-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-surface-700" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/studio-preview/dashboard.png" alt="" className="block h-[300px] w-full object-cover object-top xl:h-[340px]" />
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}
