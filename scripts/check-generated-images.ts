import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { generatedAssets, searchGeneratedAssets, withGeneratedTemplateImages, generatedImageContext } from "../src/lib/assets/generated";
import { listTemplates } from "../src/lib/templates/registry";

async function main() {
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
  console.log(`Verified ${generatedAssets.length} unique WebP images and thumbnails, ${generatedAssets.filter(a => a.replaces).length} exact template assignments, and relevant local search.`);
}
main().catch(error => { console.error(error); process.exit(1); });
