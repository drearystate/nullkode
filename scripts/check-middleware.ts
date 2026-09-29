/**
 * Checks src/middleware.ts directly, without a server:
 *  - any request carrying a Next-Action header gets a 404 (this app has no
 *    Server Actions, so such requests are probes);
 *  - on a published app's own address, /robots.txt and /sitemap.xml are
 *    rewritten to /nk-host/<host>/robots.txt and /nk-host/<host>/sitemap.xml
 *    with the signed x-nk-host header, like every other app page;
 *  - on the dashboard's own address they pass through to the platform's
 *    routes, and ordinary static files pass through on every address.
 *
 * Run from the repo root: node_modules/.bin/tsx scripts/check-middleware.ts
 */
import { createHmac } from "node:crypto";
import assert from "node:assert/strict";

const STUDIO = "studio.example.test";
const APPS = "apps.example.test";
const SECRET = "check-middleware-secret-0123456789abcdef";

async function main() {
  // hosts.ts reads these when it is first imported.
  process.env.PUBLIC_BASE_URL = `https://${STUDIO}`;
  process.env.APPS_DOMAIN = APPS;
  process.env.AUTH_SECRET = SECRET;
  // The reseller lookup for custom domains can't reach a server here, so
  // unknown domains count as published apps (the middleware's fallback).
  process.env.NK_INTERNAL_URL = "http://127.0.0.1:9";

  const { NextRequest } = await import("next/server");
  const { middleware } = await import("../src/middleware");

  const run = (host: string, path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
    middleware(new NextRequest(`https://${host}${path}`, { method: init.method ?? "GET", headers: { host, ...(init.headers ?? {}) } }));
  const sig = (host: string) => createHmac("sha256", SECRET).update(`nk-host:${host}`).digest("hex");
  const passes = (res: Response) => res.headers.get("x-middleware-next") === "1";
  const rewriteOf = (res: Response) => {
    const target = res.headers.get("x-middleware-rewrite");
    return target ? new URL(target).pathname : null;
  };

  let count = 0;
  const ok = (name: string, cond: unknown, detail?: unknown) => {
    assert.ok(cond, `${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
    count++;
    console.log(`  ok ${name}`);
  };

  const appHost = `bakery.${APPS}`;
  const customHost = "www.customer-shop.test";

  // Server Action probes.
  for (const [host, method] of [[STUDIO, "POST"], [STUDIO, "GET"], [appHost, "POST"], [customHost, "POST"]] as const) {
    const res = await run(host, "/", { method, headers: { "next-action": "7f3a9c" } });
    ok(`Next-Action ${method} on ${host} gets 404`, res.status === 404, res.status);
  }
  const plain = await run(STUDIO, "/dashboard", { method: "POST" });
  ok("a request without Next-Action is not refused", passes(plain), plain.status);

  // robots.txt and sitemap.xml.
  for (const host of [appHost, customHost]) {
    for (const file of ["/robots.txt", "/sitemap.xml"]) {
      const res = await run(host, file);
      ok(`${file} on ${host} goes to the app's own route`, rewriteOf(res) === `/nk-host/${host}${file}`, rewriteOf(res));
      ok(`${file} on ${host} carries the signed host`, res.headers.get("x-middleware-request-x-nk-host") === host && res.headers.get("x-middleware-request-x-nk-host-sig") === sig(host));
    }
  }
  for (const file of ["/robots.txt", "/sitemap.xml"]) {
    const res = await run(STUDIO, file);
    ok(`${file} on the dashboard's address reaches the platform route`, passes(res) && !rewriteOf(res));
  }

  // Existing behaviour that must not change.
  let res = await run(appHost, "/nk-public.css");
  ok("static files pass through on app addresses", passes(res) && !rewriteOf(res));
  res = await run(appHost, "/templates/originals/original-restaurant/embers.webp");
  ok("template photos pass through on app addresses", passes(res) && !rewriteOf(res));
  res = await run(appHost, "/manifest.webmanifest");
  ok("the app's manifest is still served per host", rewriteOf(res) === `/nk-host/${appHost}/manifest.webmanifest`);
  res = await run(appHost, "/menu");
  ok("app pages are still rewritten", rewriteOf(res) === `/nk-host/${appHost}/menu`);
  res = await run(appHost, "/api/run/abc", { method: "POST" });
  ok("API calls on app addresses are never rewritten", passes(res) && !rewriteOf(res));
  res = await run(STUDIO, "/uploads/page.html");
  ok("uploaded non-media files open sandboxed", /sandbox/.test(res.headers.get("content-security-policy") ?? "") && res.headers.get("content-disposition") === "attachment");
  res = await run(STUDIO, "/api/projects", { method: "POST", headers: { origin: "https://evil.example" } });
  ok("cross-site writes to the API are refused", res.status === 403, res.status);

  console.log(JSON.stringify({ ok: true, checks: count }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
