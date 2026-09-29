import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Setup — Nullkode",
  robots: { index: false, follow: false },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
