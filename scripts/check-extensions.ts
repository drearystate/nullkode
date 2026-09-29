/**
 * Checks every feature module and template before it reaches anyone.
 *
 *   pnpm check:extensions
 *
 * Catches the mistakes that otherwise only show up when someone installs the
 * feature: flows whose steps aren't connected, pages that call a flow that
 * doesn't exist, {{config.x}} values nobody can set, admin pages that anyone
 * could open, duplicate attributes, and templates that point at missing
 * modules. Exits 1 on any error; warnings are printed but don't fail.
 */
import { MODULE_REGISTRY } from "../src/lib/modules/registry";
import { OWNER_ONLY_PAGES, isOwnerOnlyPage } from "../src/lib/modules/owner-only";
import { TEMPLATE_STORE } from "../src/lib/templates/store";
import "../src/lib/templates/originals/index-a";
import "../src/lib/templates/originals/index-b";

const MODULE_CATEGORIES = ["communication", "content", "media", "commerce", "productivity", "community", "utility"];
const TEMPLATE_CATEGORIES = ["saas", "restaurant", "portfolio", "corporate", "ecommerce", "health", "creative", "hospitality", "education", "fitness", "nonprofit", "personal", "finance", "beauty", "realestate", "travel", "legal", "food"];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors: string[] = [];
const warnings: string[] = [];
const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
const warn = (where: string, msg: string) => warnings.push(`${where}: ${msg}`);

/** Tags that repeat an attribute: the browser silently keeps only the first. */
function duplicateAttributes(html: string): string[] {
  const out: string[] = [];
  for (const tag of html.matchAll(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>"'/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g)) {
    const seen = new Set<string>();
    for (const a of tag[2].matchAll(/\s+([^\s=>"'/]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?/g)) {
      const name = a[1].toLowerCase();
      if (seen.has(name)) out.push(`<${tag[1]}> has "${name}" twice`);
      seen.add(name);
    }
  }
  return out;
}

function checkFlowGraph(where: string, nodes: Array<{ id: string; type: string }>, edges: Array<{ source?: string; target?: string; sourceHandle?: string | null }>) {
  const ids = new Set<string>();
  for (const n of nodes) {
    if (ids.has(n.id)) err(where, `two steps share the id "${n.id}"`);
    ids.add(n.id);
  }
  const triggers = nodes.filter((n) => n.type === "trigger").length;
  if (triggers !== 1) err(where, `needs exactly one "trigger" step (has ${triggers})`);
  if (!nodes.some((n) => n.type === "response")) err(where, `needs a "response" step`);
  for (const e of edges) {
    if (!e.source || !e.target || !ids.has(e.source) || !ids.has(e.target)) err(where, `a connection points at a step that doesn't exist (${e.source ?? "?"} → ${e.target ?? "?"})`);
  }
  for (const n of nodes) {
    if (n.type === "branch" && !edges.some((e) => e.source === n.id && e.sourceHandle === "true")) err(where, `branch step "${n.id}" has no "true" connection`);
    if (n.type !== "trigger" && !edges.some((e) => e.target === n.id)) err(where, `step "${n.id}" is never reached (nothing connects to it)`);
  }
}

// ── Modules ───────────────────────────────────────────────────────────
const moduleIds = new Set<string>();
// Flows every app can call once "Sign-in and accounts" is installed (its
// slugs aren't prefixed: /login, "me", "logout").
const SHARED_FLOWS = new Set((MODULE_REGISTRY.find((m) => m.bareSlugs && m.id === "auth")?.flows ?? []).map((f) => f.slug));
for (const m of MODULE_REGISTRY) {
  const at = `module "${m.id}"`;
  if (moduleIds.has(m.id)) err(at, "id is used twice");
  moduleIds.add(m.id);
  if (!KEBAB.test(m.id)) err(at, "id must be lowercase words joined by hyphens");
  if (!MODULE_CATEGORIES.includes(m.category)) err(at, `unknown category "${m.category}" (use one of: ${MODULE_CATEGORIES.join(", ")})`);
  if (!m.name?.trim() || !m.tagline?.trim() || !m.description?.trim()) err(at, "needs a name, tagline and description");
  if (/claude|anthropic/i.test(`${m.name} ${m.tagline} ${m.description}`)) err(at, "user-facing text must not name an AI provider");

  const configKeys = new Set((m.config ?? []).map((c) => c.key));
  const tables = new Set((m.tables ?? []).map((t) => t.name));
  const flowSlugs = new Set<string>();
  for (const t of m.tables ?? []) {
    if (!/^[a-z][a-z0-9_]*$/.test(t.name)) err(at, `table "${t.name}" must be lowercase letters, digits and underscores`);
    for (const f of t.fields) {
      if (["id", "created_at", "updated_at", "created_by"].includes(f.name)) err(at, `table "${t.name}": "${f.name}" is added automatically, remove it`);
    }
  }
  for (const f of m.flows ?? []) {
    const fat = `${at} flow "${f.slug}"`;
    if (flowSlugs.has(f.slug)) err(fat, "slug is used twice");
    flowSlugs.add(f.slug);
    checkFlowGraph(fat, f.nodes, f.edges);
    for (const n of f.nodes) {
      const table = (n.data as { table?: unknown })?.table;
      if (typeof table === "string" && !tables.has(table) && !table.includes("{{")) warn(fat, `step "${n.id}" uses table "${table}", which this module doesn't create (fine if another module does)`);
    }
  }
  const pageSlugs = new Set<string>();
  for (const p of m.pages ?? []) {
    const pat = `${at} page "${p.slug}"`;
    if (pageSlugs.has(p.slug)) err(pat, "slug is used twice");
    pageSlugs.add(p.slug);
    for (const ref of p.html.matchAll(/data-nk-(?:flow|bind-flow|update-flow|reorder-flow|logout|calendar-flow)-ref="([^"]+)"/g)) {
      if (!flowSlugs.has(ref[1]) && !SHARED_FLOWS.has(ref[1]) && !ref[1].startsWith("auth-") && !ref[1].includes("{{")) err(pat, `calls flow "${ref[1]}", which this module doesn't define`);
    }
    for (const c of p.html.matchAll(/\{\{config\.([a-zA-Z0-9_]+)\}\}/g)) {
      if (!configKeys.has(c[1])) err(pat, `uses {{config.${c[1]}}} but the module has no "${c[1]}" setting`);
    }
    for (const d of duplicateAttributes(p.html)) err(pat, d);
    if (/(^|-)(admin|manage|leads|subscribers)(-|$)/.test(p.slug) && !isOwnerOnlyPage(m.id, p) && !/<!--\s*nk:require-role:admin\s*-->/.test(p.html)) {
      warn(pat, `looks like a page for the owner; add ownerOnly: true so visitors can't open it`);
    }
  }
  for (const slug of OWNER_ONLY_PAGES[m.id] ?? []) {
    if (!pageSlugs.has(slug)) err(at, `OWNER_ONLY_PAGES lists page "${slug}", which the module doesn't have`);
  }
}

// ── Templates ─────────────────────────────────────────────────────────
const templateIds = new Set<string>();
for (const t of TEMPLATE_STORE) {
  const at = `template "${t.id}"`;
  if (templateIds.has(t.id)) err(at, "id is used twice");
  templateIds.add(t.id);
  if (!KEBAB.test(t.id)) err(at, "id must be lowercase words joined by hyphens");
  if (!TEMPLATE_CATEGORIES.includes(t.category)) err(at, `unknown category "${t.category}" (use one of: ${TEMPLATE_CATEGORIES.join(", ")})`);
  for (const id of t.modules) if (!moduleIds.has(id)) err(at, `wants feature "${id}", which doesn't exist`);
  const homes = t.pages.filter((p) => p.isHome).length;
  if (homes !== 1) err(at, `needs exactly one home page (has ${homes})`);
  const slugs = new Set<string>();
  for (const p of t.pages) {
    if (slugs.has(p.slug)) err(at, `page slug "${p.slug}" is used twice`);
    slugs.add(p.slug);
    for (const d of duplicateAttributes(p.html)) err(`${at} page "${p.slug}"`, d);
  }
  if (t.source === "original" && t.pages.some((p) => /\/templates\/(?:crafto|litho)/.test(p.html))) err(at, "uses images from a purchased template pack");
}

for (const w of warnings) console.log(`  warning  ${w}`);
for (const e of errors) console.log(`  ERROR    ${e}`);
console.log(`\nChecked ${MODULE_REGISTRY.length} features and ${TEMPLATE_STORE.length} templates: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
