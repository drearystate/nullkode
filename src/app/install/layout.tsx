import type { Metadata } from "next";
import "../globals.css";
import { themeBootScript, themePref } from "@/lib/theme/theme";

export const metadata: Metadata = {
  title: "Setup — Nullkode",
  robots: { index: false, follow: false },
};

export default async function InstallLayout({ children }: { children: React.ReactNode }) {
  const theme = await themePref(null);
  return (
    <html lang="en" data-theme-pref={theme} data-theme={theme === "system" ? undefined : theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(theme) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
