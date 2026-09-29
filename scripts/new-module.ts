/**
 * Creates a new feature (module) with a working starter and registers it.
 *
 *   pnpm new:module "Pet Adoption"
 *   pnpm new:module "Pet Adoption" --category community
 *
 * Writes src/lib/modules/definitions/<id>.ts and adds it to the registry, so
 * it shows up in every app's Features tab. The starter already works: a
 * public form that saves to its own table, and an owner-only page listing
 * what was sent. Change it from there, then run `pnpm check:extensions`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CATEGORIES = ["communication", "content", "media", "commerce", "productivity", "community", "utility"];
const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const category = flag("category") ?? "utility";
const name = args.join(" ").trim();

if (!name) fail('Give the feature a name: pnpm new:module "Pet Adoption"');
if (!CATEGORIES.includes(category)) fail(`Unknown category "${category}". Use one of: ${CATEGORIES.join(", ")}`);

const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const ident = id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase()).replace(/^(\d)/, "m$1");
const root = process.cwd();
const file = join(root, "src/lib/modules/definitions", `${id}.ts`);
const registryPath = join(root, "src/lib/modules/registry.ts");
const registry = readFileSync(registryPath, "utf8");

if (!id) fail("The name needs at least one letter or number.");
if (existsSync(file)) fail(`${file} already exists.`);
if (new RegExp(`id: "${id}"`).test(registry) || registry.includes(`/definitions/${id}"`)) fail(`A feature called "${id}" is already registered.`);

const q = (s: string) => JSON.stringify(s);
writeFileSync(file, `import type { ModuleDefinition } from "../types";

/**
 * ${name}
 *
 * A feature is one file: settings the owner fills in when adding it, the
 * tables it saves to, the flows (backend steps) its pages call, and the pages
 * it adds to the app. Page and flow slugs are prefixed with the feature id
 * when installed ("${id}-list"), and flow-ref attributes are wired up for you.
 * Guide: docs/extending.md
 */
export const ${ident}: ModuleDefinition = {
  id: ${q(id)},
  name: ${q(name)},
  tagline: ${q(`Collect ${name.toLowerCase()} requests`)},
  description: ${q(`A form visitors fill in, saved to your app's database, with a private page where you see everything that came in.`)},
  icon: ${q(name.charAt(0).toUpperCase())},
  color: "from-violet-500 to-indigo-600",
  category: ${q(category)},
  version: "1.0.0",

  // Asked when the owner adds the feature. Use them in pages as {{config.key}}.
  config: [
    { key: "heading", label: "Heading", type: "text", default: ${q(name)}, required: true },
    { key: "intro", label: "Intro text", type: "textarea", default: "Tell us a little about yourself and we'll be in touch." },
  ],

  // Each table gets id, created_at, updated_at and created_by automatically.
  tables: [
    {
      name: "entries",
      fields: [
        { name: "name", type: "text" },
        { name: "email", type: "text" },
        { name: "message", type: "text" },
      ],
    },
  ],

  // Flows run on the server. Steps: trigger → work → response.
  // {{trigger.x}} is what the page sent; {{vars.x}} is what an earlier step saved.
  flows: [
    {
      slug: "submit",
      name: ${q(`Send ${name.toLowerCase()} request`)},
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "entries", values: { name: "{{trigger.name}}", email: "{{trigger.email}}", message: "{{trigger.message}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks! We got it."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: ${q(`${name} requests`)},
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "entries", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],

  // Pages use Bootstrap 5 classes and the app's theme colours (var(--nk-*)),
  // so they match any template. data-nk-form + data-nk-flow-ref sends a form
  // to a flow; data-nk-bind-flow-ref fills a list from one.
  pages: [
    {
      slug: "form",
      title: ${q(name)},
      html: \`<section class="py-5"><div class="container" style="max-width:640px;">
<h1 class="fw-bold">{{config.heading}}</h1>
<p class="lead" style="color:var(--nk-text-muted);">{{config.intro}}</p>
<form data-nk-form="" data-nk-flow-ref="submit" class="mt-4 d-grid gap-3">
  <input name="name" class="form-control form-control-lg" placeholder="Your name" required>
  <input name="email" type="email" class="form-control form-control-lg" placeholder="you@example.com" required>
  <textarea name="message" class="form-control" rows="4" placeholder="Anything we should know?"></textarea>
  <button class="btn btn-primary btn-lg" type="submit">Send</button>
  <div data-nk-error=""></div>
</form>
</div></section>\`,
    },
    {
      // ownerOnly: installed behind sign-in as an admin, and the flows only
      // this page uses are locked too. Visitors can't open it.
      slug: "admin",
      title: ${q(`${name} requests`)},
      ownerOnly: true,
      html: \`<section class="py-5"><div class="container">
<h1 class="fw-bold">${name.replace(/[`$\\]/g, "")} requests</h1>
<div data-nk-bind-flow-ref="list" class="mt-4">
  <div data-nk-item="" class="py-3" style="border-bottom:1px solid var(--nk-border);">
    <div class="fw-semibold" data-nk-field="name"></div>
    <a class="small" data-nk-attr-href="mailto:{email}" data-nk-field="email"></a>
    <p class="mb-1 mt-2" data-nk-field="message"></p>
    <div class="small" style="color:var(--nk-text-muted);" data-nk-field="created_at" data-nk-format="datetime"></div>
  </div>
  <p data-nk-empty="" hidden style="color:var(--nk-text-muted);">Nothing yet.</p>
</div>
</div></section>\`,
    },
  ],
};
`);

// Register it: import it and add it to MODULE_REGISTRY.
const start = registry.indexOf("export const MODULE_REGISTRY");
const close = registry.indexOf("\n];", start);
const lastImport = registry.lastIndexOf("\nimport ", start);
const importEnd = registry.indexOf("\n", lastImport + 1);
if (start < 0 || close < 0 || lastImport < 0) fail("Couldn't find MODULE_REGISTRY in src/lib/modules/registry.ts; add the feature there by hand.");
const updated =
  registry.slice(0, importEnd + 1) +
  `import { ${ident} } from "./definitions/${id}";\n` +
  registry.slice(importEnd + 1, close) +
  `\n  ${ident},` +
  registry.slice(close);
writeFileSync(registryPath, updated);

console.log(`Created src/lib/modules/definitions/${id}.ts and added it to the registry.

Next:
  1. Edit the file: settings, tables, flows and pages (see docs/extending.md).
  2. pnpm check:extensions   (catches mistakes before anyone installs it)
  3. pnpm dev, open any app → Features → "${name}" → Add to my app.`);

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}
