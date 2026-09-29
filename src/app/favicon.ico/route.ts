// Dynamic favicon. Serves the brand-uploaded icon when present; otherwise
// falls back to the static public/nullkode.png so users always see SOME
// icon (and never get a 500).

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

// A reseller's uploaded icon can be an SVG. Opened directly, an SVG is a
// document that could run script on the reseller's address, so icons are
// served sandboxed (no scripts) and never content-sniffed.
const ICON_SAFETY = {
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  "x-content-type-options": "nosniff",
};

export const runtime = "nodejs";

function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  try {
    const m = /^data:([^;,]+)(?:;base64)?,(.*)$/i.exec(dataUrl);
    if (!m) return null;
    const mime = m[1] ?? "image/x-icon";
    const payload = m[2] ?? "";
    const isBase64 = dataUrl.toLowerCase().includes(";base64,");
    const bytes = isBase64
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
    return { mime, bytes };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const { getBrand } = await import("@/lib/brand");
    const { requestHost, resellerForHost, resellerBrandConfig } = await import("@/lib/reseller");
    const platform = await getBrand();
    const reseller = await resellerForHost(await requestHost());
    const brand = reseller ? resellerBrandConfig(reseller, platform) : platform;
    if (reseller && !brand.faviconDataUrl) {
      // A reseller without an icon gets its initial on its colour — never ours.
      const initial = (brand.appName.trim()[0] ?? "A").toUpperCase().replace(/[<>&"']/g, "");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${brand.colorPrimary}"/><text x="32" y="44" font-family="system-ui,sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="#fff">${initial}</text></svg>`;
      return new NextResponse(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600", ...ICON_SAFETY } });
    }
    if (brand.faviconDataUrl) {
      const parsed = parseDataUrl(brand.faviconDataUrl);
      if (parsed) {
        return new NextResponse(new Uint8Array(parsed.bytes), {
          headers: {
            "content-type": parsed.mime,
            "cache-control": "public, max-age=3600",
            ...ICON_SAFETY,
          },
        });
      }
    }
  } catch {
    // brand lookup failed (e.g. install not complete) — fall through to
    // the static asset.
  }
  // Fallback chain.
  for (const fname of ["favicon-64.png", "nullkode.png"]) {
    try {
      const bytes = await readFile(path.join(process.cwd(), "public", fname));
      const mime = fname.endsWith(".ico") ? "image/x-icon" : "image/png";
      return new NextResponse(new Uint8Array(bytes), {
        headers: { "content-type": mime, "cache-control": "public, max-age=3600" },
      });
    } catch {
      /* try next */
    }
  }
  return new NextResponse(null, { status: 204 });
}
