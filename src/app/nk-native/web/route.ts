import { engineWebResponse } from "@/lib/native/engine-web";

export const dynamic = "force-dynamic";

/**
 * /nk-native/web?app=<app.json URL> on the studio's own address: the NullKode
 * Native engine built for the browser (lib/native/engine-web.ts), for apps
 * on /app/<slug> of this same address (the fidelity harness, tests). The
 * studio's phone preview opens each app on its own address instead
 * (/app/<slug>/nk-native/web, <app host>/nk-native/web). App hosts never
 * reach this route: the middleware sends them to /nk-host/<host>/….
 */
export async function GET(req: Request) {
  return engineWebResponse(req, {
    publicPath: "/nk-native/web",
    host: req.headers.get("host") ?? new URL(req.url).host,
    canonicalApp: null,
    appPath: (p) => /^\/app\/[a-z0-9][a-z0-9-]*\/nk-native\/app\.json$/i.test(p),
    frameAncestors: [],
  });
}
