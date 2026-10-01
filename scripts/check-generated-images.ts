import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { generatedAssets, searchGeneratedAssets, withGeneratedTemplateImages, generatedImageContext } from "../src/lib/assets/generated";
import { listTemplates } from "../src/lib/templates/registry";

async function main() {
  const ids = new Set(generatedAssets.map(a => a.id));
  assert.equal(ids.size, generatedAssets.length, 'Duplicate catalog IDs');
  const additions = JSON.parse(await readFile('docs/assets/generated-image-business-100.json', 'utf8')) as Array<{id: string}>;
  assert.equal(additions.length, 100, 'The requested expansion must contain 100 images');
  for (const asset of additions) assert.ok(ids.has(asset.id), `Expansion image missing from Assets: ${asset.id}`);
  const hashes = new Set<string>();
  for (const asset of generatedAssets) {
    for (const url of [asset.url, asset.thumb]) assert.ok((await stat(`public${url}`)).size > 1000, `Missing or empty: ${url}`);
    const content = await readFile(`public${asset.url}`);
    assert.equal(content.subarray(8, 12).toString(), "WEBP");
    const hash = createHash("sha256").update(content).digest("hex");
    assert.ok(!hashes.has(hash), `Duplicate picture: ${asset.id}`);
    hashes.add(hash);
    if (asset.replaces) {
      const template = listTemplates().find(t => t.id === asset.templateId);
      assert.ok(template, `Missing template ${asset.templateId}`);
      const serialized = JSON.stringify(template);
      assert.ok(serialized.includes(asset.url), `Image not assigned: ${asset.id}`);
      assert.ok(!serialized.includes(`/templates/originals/${asset.templateId}/${asset.replaces}`), `Old image reference: ${asset.id}`);
    }
  }
  assert.equal(generatedImageContext("build a website for our app"), "");
  assert.match(generatedImageContext("a restaurant website", 3), /restaurant-dining-room/);
  assert.equal((generatedImageContext("medical health", 3).match(/\/media\/generated\//g) ?? []).length, 3);
  assert.equal(searchGeneratedAssets("zzzz-no-matching-subject").length, 0);
  assert.ok(searchGeneratedAssets("restaurant").every(a => a.category === "restaurant" || a.category === "food"));
  assert.ok(searchGeneratedAssets("medical").every(a => a.category === "health"));
  assert.equal(searchGeneratedAssets("originals").length, generatedAssets.length);
  assert.equal(withGeneratedTemplateImages('/uploads/my-photo.webp'), '/uploads/my-photo.webp');
  // Older template photo paths still map to their generated pictures.
  assert.equal(withGeneratedTemplateImages('/templates/originals/original-restaurant/embers.webp'), '/media/generated/restaurant-embers.webp');
  assert.equal(withGeneratedTemplateImages('/templates/originals/original-restaurant/dining-room.webp'), '/media/generated/restaurant-dining-room.webp');
  const additionsForTemplates = JSON.parse(await readFile('docs/assets/generated-image-templates.json', 'utf8')) as Array<{id: string}>;
  for (const asset of additionsForTemplates) assert.ok(ids.has(asset.id), `Template image missing from Assets: ${asset.id}`);
  // Every picture the original templates show is a generated picture with a
  // catalog entry, and no template points at the old photo folder.
  const byUrl = new Map(generatedAssets.map(a => [a.url, a]));
  const shown = new Set<string>();
  const originals = listTemplates().filter(t => t.source === "original");
  assert.equal(originals.length, 18, 'Expected the 18 original templates');
  for (const template of originals) {
    const serialized = JSON.stringify(template);
    assert.ok(!serialized.includes('/templates/originals/'), `${template.id} still shows an old template photo`);
    for (const [url] of serialized.matchAll(/\/media\/generated\/[\w-]+\.webp/g)) {
      const asset = byUrl.get(url);
      assert.ok(asset, `${template.id} shows ${url}, which is not in the catalog`);
      shown.add(`${template.id} ${url}`);
    }
  }
  const assignments = generatedAssets.filter(a => a.replaces);
  assert.equal(assignments.length, 134, 'Expected 134 template picture assignments');
  assert.equal(generatedAssets.length, 293, 'Expected 293 generated pictures');
  for (const asset of generatedAssets) assert.ok(asset.width > 0 && asset.height > 0, `Missing size: ${asset.id}`);
  // Editor blocks and modules show only our own pictures: no outside photo
  // sites, and every library picture they name exists.
  const thumbs = new Set(generatedAssets.map(a => a.thumb));
  const sources = ['src/components/editor/blocks.ts', ...(await readdir('src/lib/modules/definitions')).filter(f => f.endsWith('.ts')).map(f => `src/lib/modules/definitions/${f}`)];
  let pictures = 0;
  for (const file of sources) {
    const text = await readFile(file, 'utf8');
    const outside = text.match(/https?:\/\/(?:[\w-]+\.)*(?:picsum\.photos|pravatar\.cc|unsplash\.com|placehold\.co|placeholder\.com|loremflickr\.com|randomuser\.me|pexels\.com|pixabay\.com|dummyimage\.com)[^\s"'`)]*/g);
    assert.ok(!outside, `${file} links outside pictures: ${outside?.join(', ')}`);
    for (const [url] of text.matchAll(/\/media\/generated\/(?:thumbs\/)?[\w-]+\.webp/g)) {
      assert.ok(byUrl.has(url) || thumbs.has(url), `${file} shows ${url}, which is not in the catalog`);
      pictures++;
    }
  }
  console.log(`Verified ${generatedAssets.length} unique WebP images and thumbnails, ${assignments.length} exact template assignments, ${shown.size} template pictures in ${originals.length} original templates, ${pictures} library pictures in ${sources.length} block and module files, and relevant local search.`);
}
main().catch(error => { console.error(error); process.exit(1); });
