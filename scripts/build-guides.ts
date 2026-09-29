/**
 * Writes the in-app Help guides (src/lib/help/guides.ts) as Markdown, for
 * reading on GitHub or in the download: docs/guides/<slug>.md for each guide
 * plus docs/guides/README.md as the index.
 *
 * Run: pnpm guides:build   (or: npx tsx scripts/build-guides.ts)
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GROUPS, allGuides, withAppName, type Guide } from "../src/lib/help/guides";

const APP_NAME = "Nullkode";
const OUT = path.join(process.cwd(), "docs", "guides");
const GENERATED = "<!-- Generated from src/lib/help/guides.ts by `pnpm guides:build`. Edit that file, not this one. -->";

const AUDIENCE_NOTE: Record<Guide["audience"], string | null> = {
  everyone: null,
  operators: "For the platform's operator (admin) and for resellers.",
  admin: "For the platform's operator (admin).",
};

/** GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens. */
function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

const t = (s: string) => withAppName(s, APP_NAME);

function guideMarkdown(guide: Guide, bySlug: Map<string, Guide>): string {
  const out: string[] = [GENERATED, "", `# ${t(guide.title)}`, "", t(guide.summary), ""];
  const note = AUDIENCE_NOTE[guide.audience];
  if (note) out.push(`*${note}*`, "");
  if (guide.sections.length >= 4) {
    out.push("**On this page**", "");
    for (const s of guide.sections) out.push(`- [${t(s.heading)}](#${anchor(t(s.heading))})`);
    out.push("");
  }
  for (const s of guide.sections) {
    out.push(`## ${t(s.heading)}`, "");
    for (const p of s.body) out.push(t(p), "");
    if (s.steps?.length) {
      s.steps.forEach((step, i) => out.push(`${i + 1}. ${t(step)}`));
      out.push("");
    }
    if (s.bullets?.length) {
      for (const b of s.bullets) out.push(`- ${t(b)}`);
      out.push("");
    }
    if (s.screenshot) {
      out.push(`![${t(s.screenshot.alt)}](../../public/help/${s.screenshot.file})`, "", `*${t(s.screenshot.caption)}*`, "");
    }
  }
  const related = guide.related.map((r) => bySlug.get(r)).filter((g): g is Guide => Boolean(g));
  if (related.length) {
    out.push("## Related guides", "");
    for (const r of related) out.push(`- [${t(r.title)}](${r.slug}.md): ${t(r.summary)}`);
    out.push("");
  }
  out.push("[All guides](README.md)", "");
  return out.join("\n");
}

function indexMarkdown(guides: Guide[]): string {
  const out: string[] = [
    GENERATED,
    "",
    `# ${APP_NAME} guides`,
    "",
    `Step-by-step guides to everything in ${APP_NAME}. The same guides are in the app, under Help, where they show your platform's own name and screenshots.`,
    "",
  ];
  for (const group of GROUPS) {
    const list = guides.filter((g) => g.group === group.id);
    if (!list.length) continue;
    out.push(`## ${group.title}`, "");
    for (const g of list) {
      const note = g.audience === "everyone" ? "" : g.audience === "operators" ? " *(admins and resellers)*" : " *(admins)*";
      out.push(`- [${t(g.title)}](${g.slug}.md): ${t(g.summary)}${note}`);
    }
    out.push("");
  }
  return out.join("\n");
}

function main() {
  const guides = allGuides();
  const bySlug = new Map(guides.map((g) => [g.slug, g]));
  mkdirSync(OUT, { recursive: true });
  // Remove guides that no longer exist.
  const keep = new Set(["README.md", ...guides.map((g) => `${g.slug}.md`)]);
  for (const f of readdirSync(OUT)) if (f.endsWith(".md") && !keep.has(f)) rmSync(path.join(OUT, f));
  for (const g of guides) writeFileSync(path.join(OUT, `${g.slug}.md`), guideMarkdown(g, bySlug));
  writeFileSync(path.join(OUT, "README.md"), indexMarkdown(guides));
  console.log(`Wrote ${guides.length} guides and README.md to ${path.relative(process.cwd(), OUT)}/`);
}

main();
