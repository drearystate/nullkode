import type { Metadata } from "next";
import "../globals.css";
import { themeBootScript, themePref } from "@/lib/theme/theme";
import { getLocale, getTranslations } from "next-intl/server";
import { ScopedIntl } from "@/i18n/scoped-intl";
import { localeDir } from "@/i18n/locales";
import { TZ_BOOT } from "@/i18n/time-zone";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("install");
  return { title: t("metaTitle", { app: "Nullkode" }), robots: { index: false, follow: false } };
}

export default async function InstallLayout({ children }: { children: React.ReactNode }) {
  const theme = await themePref(null);
  const locale = await getLocale();
  return (
    <html lang={locale} dir={localeDir(locale)} data-theme-pref={theme} data-theme={theme === "system" ? undefined : theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(theme) + TZ_BOOT }} />
      </head>
      <body><ScopedIntl segment="install">{children}</ScopedIntl></body>
    </html>
  );
}
