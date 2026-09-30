import catalog from "./generated-catalog.json";

/** Original generated photos, shipped locally so template images work offline. */
export const generatedAssets = catalog.map((asset) => ({ ...asset, source: "generated" as const }));

export function searchGeneratedAssets(query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return generatedAssets;
  return generatedAssets
    .map((asset) => {
      const tags = asset.tags.join(" ");
      const description = asset.alt.toLowerCase();
      const score = words.reduce((total, word) => total + (tags.includes(word) ? 3 : description.includes(word) ? 1 : 0), 0);
      return { asset, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ asset }) => asset);
}

const replacements = new Map(generatedAssets.filter((a) => a.replaces).map((a) => [
  `/templates/originals/${a.templateId}/${a.replaces}`, a.url,
]));

/**
 * The original templates used to show photos from /templates/originals/<id>/.
 * They now point at the generated library directly; this maps any of those
 * older paths (catalog `templateId` + `replaces`) to its generated picture.
 * Exact paths only: unrelated templates and customer uploads are never changed.
 */
export function withGeneratedTemplateImages(value: string): string {
  return value.replace(/\/templates\/originals\/[\w-]+\/[\w-]+\.webp/g, (path) => replacements.get(path) ?? path);
}

/** A small relevant shortlist, not the whole library, for affordable AI models. */
export function generatedImageContext(request: string, limit = 6): string {
  const stop = new Set(['the','and','for','with','this','that','our','your','from','make','build','create','want','need','please','website','page','pages','app','home','about','have','some','into','using','include','would','should','could','new','give','like']);
  const query = request.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stop.has(w)).join(' ');
  if (!query) return '';
  const images = searchGeneratedAssets(query).slice(0, limit);
  if (!images.length) return '';
  return '\n\nAVAILABLE LOCAL IMAGES (AI-generated illustrative stock, not evidence of real people, properties or outcomes). Use only a suitable subject; preserve supplied customer photos. Copy URLs exactly; do not invent other image URLs. Use descriptive alt text and responsive crops.\n' + images.map(a => `${a.url} — ${a.alt}`).join('\n');
}
