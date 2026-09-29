import { readFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { autoBridgeProviders } from "@/lib/designer/auto-bridge";
import { getRequestBrand } from "@/lib/reseller";

// Serves the vendored Open CoDesign renderer (built to public/designer/) at
// the /designer URL with auth gating. We intentionally don't wrap it in a
// Next.js layout — the renderer fills the viewport itself, and its own
// fonts/tokens/Tailwind v4 styles must not collide with the main app's
// Tailwind v3 layer.
//
// Static assets under /designer/assets/* are served by Next directly from
// public/ and don't need a route handler. The bundles themselves are not
// sensitive; the gated thing is the API surface they call into.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // First-load bridge: if Nullkode admin has a global OpenAI key but the
  // user has no DesignerProvider yet, seed one so generation works without
  // a second onboarding. Idempotent — exits early if any provider exists.
  await autoBridgeProviders(user.id).catch((err) => {
    console.error("designer auto-bridge failed:", err);
  });

  const file = path.join(process.cwd(), "public", "designer", "index.html");
  let html: string;
  try {
    html = await readFile(file, "utf8");
  } catch {
    return new NextResponse(
      "Designer bundle is not built. Run `pnpm -C apps/designer-renderer build`.",
      { status: 503, headers: { "content-type": "text/plain" } },
    );
  }

  // Belt-and-suspenders cache bust: aggressive no-store + a meta tag
  // injected before </head> so any proxy/CDN/extension that ignores
  // headers still revalidates. Plus a build-time timestamp comment so
  // each deploy's HTML differs (defeats stale-but-revalidate caches).
  const META =
    `<meta http-equiv="cache-control" content="no-cache, no-store, must-revalidate, max-age=0" />` +
    `<meta http-equiv="pragma" content="no-cache" />` +
    `<meta http-equiv="expires" content="0" />` +
    `<!-- nk-build:${Date.now()} -->`;
  // White-label tab title: the brand this person sees everywhere else.
  let title = "Designer";
  try {
    const { brand } = await getRequestBrand(user);
    if (brand.appName) title = `${brand.appName} Designer`;
  } catch {
    /* keep the neutral title */
  }
  const safeTitle = title.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const stamped = html
    .replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(/<\/head>/i, `${META}</head>`);

  return new NextResponse(stamped, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      pragma: "no-cache",
      expires: "0",
      // Tell intermediate caches to keep their hands off.
      "surrogate-control": "no-store",
      vary: "*",
    },
  });
}
