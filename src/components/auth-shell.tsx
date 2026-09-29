import Link from "next/link";
import { getRequestBrand } from "@/lib/reseller";
import { BRAND_DEFAULTS } from "@/lib/brand";

/**
 * Frame for the sign-in, sign-up and password screens. Shows whichever brand
 * the visitor is under — a reseller's on its own domain, the operator's
 * otherwise — so white-labelled clients never see the platform's name.
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
  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-white text-surface-900" style={{ ["--nk-brand-primary" as string]: brand.colorPrimary }}>
      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto mb-6 flex items-center justify-center" aria-label={`${brand.appName} home`}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={brand.appName} className="h-12 w-auto max-w-[260px] object-contain" />
          ) : isStockBrand ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/nullkode-banner.png" alt={brand.appName} width={260} height={52} className="h-12 w-auto" />
          ) : (
            <span className="text-2xl font-semibold tracking-tight" style={{ color: brand.colorPrimary }}>{brand.appName}</span>
          )}
        </Link>
        <div className="rounded-2xl border border-surface-200 bg-white shadow-xl shadow-black/5 p-8">
          <h1 className="text-2xl font-semibold text-surface-900">{title}</h1>
          {subtitle && <p className="text-sm text-surface-500 mt-1">{subtitle}</p>}
          {children}
          {footer && <div className="mt-6 text-sm text-surface-500">{footer}</div>}
        </div>
        {brand.supportEmail && (
          <p className="mt-6 text-center text-xs text-surface-500">
            Need help? <a className="underline" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
          </p>
        )}
      </div>
    </main>
  );
}
