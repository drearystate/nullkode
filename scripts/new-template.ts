/**
 * Creates a new starter template and registers it in the template gallery.
 *
 *   pnpm new:template "Coffee Shop" --category food
 *
 * Writes src/lib/templates/originals/original-<id>.ts, imports it from
 * originals/index-b.ts, and makes public/templates/originals/original-<id>/
 * for its images (with a CREDITS.md to fill in). Then run
 * `pnpm check:extensions`, and render its gallery preview with
 * `tsx scripts/render-original-templates.ts original-<id>`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CATEGORIES = ["saas", "restaurant", "portfolio", "corporate", "ecommerce", "health", "creative", "hospitality", "education", "fitness", "nonprofit", "personal", "finance", "beauty", "realestate", "travel", "legal", "food"];
const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const category = flag("category");
const name = args.join(" ").trim();

if (!name) fail('Give the template a name: pnpm new:template "Coffee Shop" --category food');
if (!category || !CATEGORIES.includes(category)) fail(`Pick a category with --category: ${CATEGORIES.join(", ")}`);

const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const id = `original-${slug}`;
const root = process.cwd();
const file = join(root, "src/lib/templates/originals", `${id}.ts`);
const indexPath = join(root, "src/lib/templates/originals/index-b.ts");
const imgDir = join(root, "public/templates/originals", id);

if (!slug) fail("The name needs at least one letter or number.");
if (existsSync(file)) fail(`${file} already exists.`);

const safe = name.replace(/[`$\\<>]/g, "");
const q = (s: string) => JSON.stringify(s);
writeFileSync(file, `/**
 * ${safe} — ${category} starter (${id})
 *
 * A template is a theme plus finished pages, and a list of features to install
 * (their pages, tables and forms come with them). Use the theme tokens
 * (var(--nk-primary), var(--nk-text), var(--nk-surface) …) instead of fixed
 * colours, so owners can re-theme it and dark mode works. Images go in
 * public/templates/originals/${id}/ and must be free to redistribute (list
 * them in CREDITS.md there). Guide: docs/extending.md
 */
import { registerTemplate } from "../store";
import type { StarterTemplate } from "../types";

const CSS = \`
.st-wrap{width:min(1120px,100% - 40px);margin-inline:auto}
.st-hero{padding:clamp(72px,12vw,160px) 0;background:linear-gradient(135deg,color-mix(in srgb,var(--nk-primary) 14%,var(--nk-bg)),var(--nk-bg))}
.st-hero h1{font-family:var(--nk-font-display);font-size:clamp(2.6rem,6vw,4.6rem);line-height:1.05;margin:0 0 20px;color:var(--nk-text)}
.st-hero p{font-size:1.2rem;color:var(--nk-text-muted);max-width:620px}
.st-btn{display:inline-flex;align-items:center;min-height:50px;padding:0 26px;border-radius:var(--nk-radius);background:var(--nk-primary);color:#fff;font-weight:600;text-decoration:none}
.st-btn:hover{background:var(--nk-primary-2);color:#fff}
.st-sec{padding:clamp(56px,8vw,110px) 0}
.st-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}
.st-card{padding:28px;border:1px solid var(--nk-border);border-radius:var(--nk-radius);background:var(--nk-surface)}
.st-card h3{font-family:var(--nk-font-display);font-size:1.3rem;margin:0 0 8px;color:var(--nk-text)}
.st-card p{margin:0;color:var(--nk-text-muted)}
\`;

const HOME = \`<main>
<section class="st-hero"><div class="st-wrap">
  <h1>${safe}</h1>
  <p>One line about what makes this place worth a visit. Owners replace it in the editor.</p>
  <p class="mt-4"><a class="st-btn" href="/about">Learn more</a></p>
</div></section>
<section class="st-sec"><div class="st-wrap st-grid">
  <div class="st-card"><h3>First reason</h3><p>What people love most.</p></div>
  <div class="st-card"><h3>Second reason</h3><p>What sets it apart.</p></div>
  <div class="st-card"><h3>Third reason</h3><p>Why now is a good time.</p></div>
</div></section>
</main>\`;

const ABOUT = \`<main class="st-sec"><div class="st-wrap" style="max-width:760px;">
  <h1 style="font-family:var(--nk-font-display);color:var(--nk-text);">About ${safe}</h1>
  <p class="lead" style="color:var(--nk-text-muted);">The story, the people and what you can expect.</p>
</div></main>\`;

const FONT = \`"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif\`;

const template: StarterTemplate = {
  id: ${q(id)},
  name: ${q(name)},
  tagline: ${q(`A starter for ${category}`)},
  category: ${q(category)},
  tags: [${q(category)}],
  source: "original",
  // Features to install with the template (ids from src/lib/modules/definitions).
  modules: ["contact-form"],
  theme: {
    name: ${q(name)},
    mode: "light",
    primary: "#4f46e5",
    primary2: "#4338ca",
    accent: "#0ea5e9",
    bg: "#f8fafc",
    surface: "#ffffff",
    surface2: "#f1f5f9",
    border: "#e2e8f0",
    text: "#0f172a",
    textMuted: "#475569",
    font: FONT,
    fontDisplay: FONT,
    googleFonts: ["Inter:wght@400;600;800"],
    radius: "14px",
    radiusSm: "8px",
    dark: {
      name: ${q(`${name} Night`)},
      mode: "dark",
      primary: "#818cf8",
      primary2: "#a5b4fc",
      accent: "#38bdf8",
      bg: "#0b1020",
      surface: "#121a2e",
      surface2: "#18223a",
      border: "#26314d",
      text: "#e2e8f0",
      textMuted: "#94a3b8",
      font: FONT,
      fontDisplay: FONT,
      googleFonts: ["Inter:wght@400;600;800"],
      radius: "14px",
      radiusSm: "8px",
    },
  },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME, css: CSS },
    { title: "About", slug: "about", isHome: false, html: ABOUT, css: CSS },
  ],
};

registerTemplate(template);
export default template;
`);

const index = readFileSync(indexPath, "utf8");
writeFileSync(indexPath, index.replace(/\s*$/, "") + `\nimport "./${id}";\n`);
mkdirSync(imgDir, { recursive: true });
if (!existsSync(join(imgDir, "CREDITS.md"))) {
  writeFileSync(join(imgDir, "CREDITS.md"), `# Image credits: ${safe}\n\nEvery image in this folder must be free to redistribute (for example CC0 or your own photos).\nList each file with its source and license:\n\n| File | Source | License |\n|---|---|---|\n`);
}

console.log(`Created src/lib/templates/originals/${id}.ts and added it to the gallery.

Next:
  1. Design the pages and pick the theme colours in that file (see docs/extending.md).
  2. Put images in public/templates/originals/${id}/ and list them in CREDITS.md.
  3. pnpm check:extensions
  4. tsx scripts/render-original-templates.ts ${id}   (makes the gallery preview image)`);

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}
