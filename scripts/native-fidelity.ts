/**
 * Native fidelity harness: how close the NullKode Native render of each page
 * is to the published web page.
 *
 * For each published app (from this install's database) and each page:
 *  - the web page in Chromium at 390 px, as a signed-out visitor, without the
 *    shared menu (the native app draws that as its own navigation), flows
 *    not run (lists show their row templates, as the compiled spec does);
 *  - the native render: the engine's web build (react-native-web,
 *    /nk-native/web?…&bare=1) drawing the page's compiled spec;
 *  - a side-by-side PNG (web | native | difference) and a pixel score:
 *    the share of pixels that match (pixelmatch, threshold 0.1) over the
 *    taller of the two pages.
 * Writes output/native-fidelity/<app>/<page>.png and summary.md / summary.json.
 *
 * Needs the server running and the engine's web build (pnpm native:web).
 *   pnpm native:fidelity --base http://127.0.0.1:3060 --apps harbour-kitchen-yitexy,bakery-e85upy
 *   pnpm native:fidelity --limit 5 --pages 3
 * Run with the install's .env (AUTH_SECRET signs an owner session so
 * members-only pages can be compared too): tsx --env-file=.env scripts/native-fidelity.ts …
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import { comparePageUrls, fidelityContext, fidelityUrls, launchFidelityBrowser } from "@/lib/native/fidelity";
import type { NativeApp } from "@/lib/native/spec";

type Args = { base: string; apps: string[]; limit: number; pages: number; out: string; lang?: string };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (name: string) => {
    const i = a.indexOf(`--${name}`);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return {
    base: (get("base") ?? process.env.NK_INTERNAL_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, ""),
    apps: (get("apps") ?? "").split(",").filter(Boolean),
    limit: Number(get("limit") ?? 5),
    pages: Number(get("pages") ?? 99),
    out: get("out") ?? join(process.cwd(), "output", "native-fidelity"),
    lang: get("lang"),
  };
}

async function getJson<T>(url: string, cookie: string): Promise<T> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(url, { headers: { cookie } });
    if (res.status === 503) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return (await res.json()) as T;
  }
  throw new Error(`${url} kept answering 503`);
}

type Row = { app: string; page: string; score: number; webHeight: number; nativeHeight: number; nodes: number; islands: number; file: string };

async function main() {
  const args = parseArgs();
  const projects = args.apps.length
    ? await db.project.findMany({ where: { slug: { in: args.apps }, published: true } })
    : await db.project.findMany({ where: { published: true, liveDeploymentId: { not: null } }, orderBy: { updatedAt: "desc" }, take: args.limit });
  mkdirSync(args.out, { recursive: true });
  const browser = await launchFidelityBrowser();
  const rows: Row[] = [];
  try {
    for (const project of projects) {
      const q = args.lang ? `?lang=${encodeURIComponent(args.lang)}` : "";
      const appUrl = `${args.base}/app/${project.slug}/nk-native/app.json${q}`;
      let app: NativeApp;
      try {
        app = await getJson<NativeApp>(appUrl, "");
      } catch (err) {
        console.error(`${project.slug}: ${err instanceof Error ? err.message : err}`);
        continue;
      }
      const ctx = await fidelityContext(browser, { base: args.base, projectId: project.id, ownerId: project.ownerId, locale: app.locale });
      const cookie = (await ctx.cookies(args.base)).map((c) => `${c.name}=${c.value}`).join("; ");
      const dir = join(args.out, project.slug);
      mkdirSync(dir, { recursive: true });
      for (const ref of app.pages.slice(0, args.pages)) {
        const { webUrl, nativeUrl } = fidelityUrls(args.base, project.slug, app, ref, args.lang);
        try {
          const { score, webHeight, nativeHeight, png } = await comparePageUrls(ctx, webUrl, nativeUrl);
          const file = join(dir, `${ref.slug}.png`);
          writeFileSync(file, png);
          const spec = await getJson<{ stats: { nodes: number; islands: number } }>(`${args.base}/app/${project.slug}/${ref.spec}`, cookie).catch(() => ({ stats: { nodes: 0, islands: 0 } }));
          rows.push({ app: project.slug, page: ref.slug, score, webHeight, nativeHeight, nodes: spec.stats.nodes, islands: spec.stats.islands, file });
          console.log(`${project.slug}/${ref.slug}: ${score}% (web ${webHeight}px, native ${nativeHeight}px, ${spec.stats.islands} islands)`);
        } catch (err) {
          console.error(`${project.slug}/${ref.slug}: ${err instanceof Error ? err.message : err}`);
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.score, 0) / rows.length) * 10) / 10 : 0;
  const md = [
    `# Native fidelity (${new Date().toISOString()})`,
    "",
    `Pixel match of the native render (react-native-web) against the web page at 390 px. Average: **${avg}%** over ${rows.length} pages.`,
    "",
    "| App | Page | Match | Web height | Native height | Nodes | Islands |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((r) => `| ${r.app} | ${r.page} | ${r.score}% | ${r.webHeight} | ${r.nativeHeight} | ${r.nodes} | ${r.islands} |`),
    "",
  ].join("\n");
  writeFileSync(join(args.out, "summary.md"), md);
  writeFileSync(join(args.out, "summary.json"), JSON.stringify({ average: avg, rows }, null, 2));
  console.log(md);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
