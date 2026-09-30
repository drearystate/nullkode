import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { generatedAssets, searchGeneratedAssets } from "../src/lib/assets/generated";
import { listTemplates } from "../src/lib/templates/registry";
import { startInstance, installOperator } from "./e2e-harness";

async function main() {
  const inst = await startInstance({ port: 3137, buildDir: ".next-image-review", env: { APPS_DOMAIN: "", UNSPLASH_ACCESS_KEY: "", PEXELS_API_KEY: "", PIXABAY_API_KEY: "" } });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const report: Array<{ id: string; pages: number; generatedPhotos: number }> = [];
  await mkdir("output/image-review", { recursive: true });
  try {
    const op = await installOperator(inst, "Image Review");
    const page = await browser.newPage({ viewport: { width: 1200, height: 825 } });
    page.setDefaultTimeout(60000);
    const assetsOnly = process.argv.includes("--assets-only");
    for (const id of assetsOnly ? [] : new Set(generatedAssets.map(a => a.templateId).filter(Boolean))) {
      const photos = generatedAssets.filter(a => a.templateId === id);
      // Allows this browser review to run alongside generation; no missing photo
      // is accepted. Regular reruns find all files immediately.
      let ready = false;
      for (let attempt = 0; attempt < 360; attempt++) {
        try { await Promise.all(photos.flatMap(a => [access(`public${a.url}`), access(`public${a.thumb}`)])); ready = true; break; }
        catch { await new Promise(r => setTimeout(r, 1000)); }
      }
      assert.ok(ready, `Images missing for ${id}`);
      const template = listTemplates().find(t => t.id === id)!;
      const created = await op.post("/api/templates/create", { templateId: id, name: template.name });
      assert.equal(created.status, 200, created.text);
      const published = await op.post(`/api/projects/${created.json.projectId}/publish`);
      assert.equal(published.status, 200, published.text);
      const project = await inst.db.project.findUniqueOrThrow({ where: { id: created.json.projectId }, select: { slug: true } });
      for (const design of template.pages) {
        await page.setViewportSize({ width: 1200, height: 825 });
        const response = await page.goto(`${inst.base}/app/${project.slug}${design.isHome ? "" : "/" + design.slug}`, { waitUntil: "networkidle", timeout: 120000 });
        assert.equal(response?.status(), 200, `${id}/${design.slug}: ${page.url()}`);
        const expectedImages = [...design.html.matchAll(/src="(\/media\/generated\/[^"]+)"/g)].map(m => m[1]);
        for (const src of expectedImages) assert.ok(await page.locator(`img[src="${src}"]`).count(), `Missing expected image ${src}`);
        await page.evaluate(async () => {
          await document.fonts.ready;
          for (const image of document.images) image.loading = "eager";
          await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
        });
        await page.addStyleTag({ content: "nextjs-portal { display:none!important }" });
        const broken = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
        assert.deepEqual(broken, [], `${id}/${design.slug} has broken images`);
        if (design.isHome) {
          await page.screenshot({ path: `public/templates/${id}.jpg`, type: "jpeg", quality: 85 });
          await page.screenshot({ path: `output/image-review/${id}-desktop.png`, fullPage: true });
          await page.setViewportSize({ width: 390, height: 844 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id} scrolls sideways`);
          await page.screenshot({ path: `output/image-review/${id}-mobile.png`, fullPage: true });
        }
      }
      report.push({ id, pages: template.pages.length, generatedPhotos: photos.length });
      console.log(`Checked ${id}: ${template.pages.length} pages, desktop/mobile images load.`);
    }
    const all = await op.get('/api/assets/search?source=generated');
    assert.equal(all.status, 200);
    assert.equal(all.json.assets.length, generatedAssets.length);
    assert.ok(all.json.assets.every((a: {source: string}) => a.source === 'generated'));
    const food = await op.get('/api/assets/search?source=generated&q=restaurant');
    assert.ok(food.json.assets.length > 0);
    assert.ok(food.json.assets.every((a: {category: string}) => ['restaurant','food'].includes(a.category)));
    const none = await op.get('/api/assets/search?source=generated&q=zzzz-no-matching-subject');
    assert.deepEqual(none.json.assets, []);
    for (const category of new Set(generatedAssets.map(a => a.category))) {
      const result = await op.get(`/api/assets/search?source=generated&q=${encodeURIComponent(category)}`);
      for (const asset of generatedAssets.filter(a => a.category === category)) {
        assert.ok(result.json.assets.some((a: {id: string}) => a.id === asset.id), `${asset.id} missing from category search`);
      }
    }
    await page.goto(inst.base + '/media/generated/index.html');
    await page.locator('#category').selectOption('restaurant');
    assert.equal(await page.locator('article:visible').count(), generatedAssets.filter(a => a.category === 'restaurant').length);
    await page.locator('#search').fill('bread');
    assert.equal(await page.locator('article:visible').count(), 1);
    await page.locator('#search').fill('');
    await page.locator('#category').selectOption('');
    assert.equal(await page.locator('article').count(), generatedAssets.length);
    await page.evaluate(async () => {
      for (const image of document.images) image.loading = 'eager';
      await Promise.all([...document.images].map(i => i.decode()));
    });
    assert.equal(await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).length), 0);
    if (assetsOnly) {
      const created = await op.post('/api/templates/create', { templateId: 'original-ecommerce', name: 'Asset picker check' });
      assert.equal(created.status, 200, created.text);
      const projectId = created.json.projectId;
      const home = await inst.db.page.findFirstOrThrow({ where: { projectId, isHome: true } });
      await page.context().addCookies([...op.jar].map(([name, value]) => ({ name, value, url: inst.base })));
      await page.goto(`${inst.base}/projects/${projectId}/pages/${home.id}/edit`, { waitUntil: 'networkidle', timeout: 180000 });
      await page.getByRole('button', { name: 'assets', exact: true }).click();
      await page.getByRole('button', { name: 'Originals', exact: true }).click();
      await page.waitForFunction(count => document.querySelectorAll('.studio-editor-library img[src^="/media/generated/thumbs/"]').length === count, generatedAssets.length);
      await page.getByPlaceholder('Search photos...').fill('plumbing');
      await page.waitForFunction(count => document.querySelectorAll('.studio-editor-library img[src^="/media/generated/thumbs/"]').length === count, searchGeneratedAssets('plumbing').length);
      const photo = page.locator('.studio-editor-library img[src="/media/generated/thumbs/water-water-filter.webp"]');
      await photo.waitFor({ state: 'visible' });
      await photo.click();
      await page.frameLocator('.gjs-frame').locator('img[src="/media/generated/water-water-filter.webp"]').last().waitFor({ state: 'attached' });
      await page.frameLocator('.gjs-frame').locator('img[src="/media/generated/water-water-filter.webp"]').last().evaluate(async (image) => { await (image as HTMLImageElement).decode(); });
      await page.addStyleTag({ content: 'nextjs-portal { display:none!important }' });
      await page.screenshot({ path: 'output/image-review/asset-picker.png' });
      console.log('PASS: editor Originals shows the complete collection; plumbing search and insertion of a new water-filter image work.');
    }
    await writeFile(assetsOnly ? 'output/image-review/assets-report.json' : 'output/image-review/report.json', JSON.stringify({ ok: true, templates: report, generatedImages: generatedAssets.length, search: 'passed' }, null, 2));
    console.log(assetsOnly ? `PASS: ${generatedAssets.length} images, ${new Set(generatedAssets.map(a => a.category)).size} categories, gallery filtering and editor insertion.` : `PASS: ${report.length} original templates, ${report.reduce((n,t)=>n+t.pages,0)} designed pages, gallery filtering and generated asset search.`);
  } catch(error) {
    await writeFile('output/image-review/server.log', inst.log());
    throw error;
  } finally { await browser.close(); await inst.stop(); }
}
main().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
