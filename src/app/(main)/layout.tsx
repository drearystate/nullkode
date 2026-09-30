import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import "../globals.css";
import { isInstallComplete } from "@/lib/install";
import { brandCssVars } from "@/lib/brand";
import { getCurrentUser } from "@/lib/auth";
import { getRequestBrand } from "@/lib/reseller";
import { themeBootScript, themePref } from "@/lib/theme/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { brand, reseller } = await getRequestBrand(await getCurrentUser());
  return {
    title: brand.tagline ? `${brand.appName} — ${brand.tagline}` : brand.appName,
    description: brand.tagline || undefined,
    applicationName: brand.appName,
    // The platform's install manifest names the platform; resellers' clients don't get it.
    ...(reseller ? {} : { manifest: "/site.webmanifest" }),
    // /favicon.ico is host-aware: the brand's icon, or its initial on its colour.
    icons: brand.faviconDataUrl ? { icon: brand.faviconDataUrl } : { icon: [{ url: "/favicon.ico" }, { url: "/favicon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
};

// Inline boot script that registers the platform service worker on first load.
// Wrapped in feature detection so older browsers / SSR don't choke. Kept tiny
// because it runs on every authenticated page in the editor.
const SW_BOOT = `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/nk-platform-sw.js',{scope:'/'}).catch(function(){});});}`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // First-run gate: when the deployment hasn't been set up yet, divert
  // everything to /install so the operator sees the wizard, not a 500
  // (or a login page they can't sign up for without a verified email).
  if (!(await isInstallComplete())) redirect("/install");

  const user = await getCurrentUser();
  const { brand } = await getRequestBrand(user);
  const theme = await themePref(user);
  return (
    // The boot script sets data-theme before paint; the server can only
    // know it for an explicit choice, not for "match my device".
    <html lang="en" data-theme-pref={theme} data-theme={theme === "system" ? undefined : theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(theme) }} />
        <style dangerouslySetInnerHTML={{ __html: brandCssVars(brand) }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: SW_BOOT }} />
      </body>
    </html>
  );
}
