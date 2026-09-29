/**
 * Renders the gallery preview of every original template exactly as a
 * visitor sees it: each template is created and published on a throwaway
 * install, then its home page is screenshotted (1200×825, JPEG q80) into
 * public/templates/<id>.jpg. Also fails if any home page scrolls sideways
 * on a 390px phone.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   node_modules/.bin/tsx scripts/render-original-templates.ts [template-id …]
 */
import { chromium } from "playwright";
import { TEMPLATE_STORE } from "../src/lib/templates/store";
import "../src/lib/templates/originals/index-a";
import "../src/lib/templates/originals/index-b";
import { startInstance, installOperator } from "./e2e-harness";

async function main() {
  const only = process.argv.slice(2);
  const templates = TEMPLATE_STORE.filter((t) => t.source === "original" && (only.length === 0 || only.includes(t.id)));
  const inst = await startInstance({ port: Number(process.env.E2E_PORT || 3129), buildDir: ".next-render-templates" });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const overflow: string[] = [];
  try {
    const op = await installOperator(inst, "Template Previews");
    const page = await browser.newPage({ viewport: { width: 1200, height: 825 }, deviceScaleFactor: 1 });
    for (const t of templates) {
      const created = await op.post("/api/templates/create", { templateId: t.id, name: t.name });
      if (created.status !== 200) throw new Error(`${t.id}: create failed (${created.status}) ${created.text.slice(0, 200)}`);
      await op.post(`/api/projects/${created.json.projectId}/publish`);
      const project = await inst.db.project.findUnique({ where: { id: created.json.projectId }, select: { slug: true } });
      await page.setViewportSize({ width: 1200, height: 825 });
      await page.goto(`${inst.base}/app/${project!.slug}`, { waitUntil: "networkidle", timeout: 120_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `public/templates/${t.id}.jpg`, type: "jpeg", quality: 80 });
      await page.setViewportSize({ width: 390, height: 844 });
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) overflow.push(t.id);
      console.log(`rendered ${t.id}`);
    }
    if (overflow.length) throw new Error(`Scrolls sideways on a phone: ${overflow.join(", ")}`);
    console.log(`Rendered ${templates.length} previews; none scroll sideways at 390px.`);
  } finally {
    await browser.close();
    await inst.stop();
  }
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
