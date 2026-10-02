/**
 * Sanity checks for the in-app Help guides (src/lib/help/guides.ts).
 *
 * Run: pnpm check:guides   (or: npx tsx scripts/check-guides.ts)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { GUIDE_SLUGS, guideForPath } from "../src/lib/help/where";
import { GUIDES, GROUPS, allScreenshots, type Guide } from "../src/lib/help/guides";
import { allGuideMessages, flatten, fromMessage } from "../src/lib/help/guide-messages";

const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

/** Every piece of text a person reads in a guide, with where it is. */
function texts(g: Guide): Array<[string, string]> {
  const out: Array<[string, string]> = [["title", g.title], ["summary", g.summary]];
  g.sections.forEach((s, i) => {
    const at = `section ${i + 1} (${s.heading})`;
    out.push([`${at} heading`, s.heading]);
    s.body.forEach((p, j) => out.push([`${at} paragraph ${j + 1}`, p]));
    s.steps?.forEach((p, j) => out.push([`${at} step ${j + 1}`, p]));
    s.bullets?.forEach((p, j) => out.push([`${at} bullet ${j + 1}`, p]));
    if (s.screenshot) {
      out.push([`${at} screenshot alt`, s.screenshot.alt]);
      out.push([`${at} screenshot caption`, s.screenshot.caption]);
    }
  });
  return out;
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;
// Never in any guide: the product's own name (use {app}) or these vendors.
const BANNED_ALL: Array<[RegExp, string]> = [
  [/nullkode/i, "the product's name (write {app})"],
  [/claude/i, "“Claude”"],
  [/anthropic/i, "“Anthropic”"],
];
// Guides for everyone also never name an AI vendor or model.
const BANNED_EVERYONE: Array<[RegExp, string]> = [
  [/open\s*ai/i, "“OpenAI”"],
  [/\bgpt/i, "“GPT”"],
  [/\b(gemini|llama|mistral|qwen|ollama)\b/i, "an AI model name"],
];

const groups = new Set(GROUPS.map((g) => g.id));
const files = new Map<string, string>();

for (const slug of GUIDE_SLUGS) {
  const g = GUIDES[slug];
  if (!g) {
    fail(`${slug}: no guide for this slug`);
    continue;
  }
  if (g.slug !== slug) fail(`${slug}: guide has slug "${g.slug}"`);
  if (!groups.has(g.group)) fail(`${slug}: unknown group "${g.group}"`);
  if (!g.sections.length) fail(`${slug}: no sections`);
  if (!/[.!?]$/.test(g.summary.trim()) || /[.!?]\s+[A-Z]/.test(g.summary)) fail(`${slug}: the summary should be one sentence`);

  for (const r of g.related) {
    if (!(GUIDE_SLUGS as readonly string[]).includes(r)) fail(`${slug}: related guide "${r}" doesn't exist`);
    if (r === slug) fail(`${slug}: lists itself as related`);
  }

  const headings = new Set<string>();
  for (const s of g.sections) {
    if (headings.has(s.heading)) fail(`${slug}: two sections called "${s.heading}"`);
    headings.add(s.heading);
    if (!s.body.length && !s.steps?.length && !s.bullets?.length) fail(`${slug}: section "${s.heading}" is empty`);
  }

  for (const [where, text] of texts(g)) {
    const at = `${slug}, ${where}`;
    if (EMOJI.test(text)) fail(`${at}: contains an emoji`);
    for (const [re, what] of BANNED_ALL) if (re.test(text.split("{app}").join(""))) fail(`${at}: mentions ${what}`);
    if (g.audience === "everyone") for (const [re, what] of BANNED_EVERYONE) if (re.test(text)) fail(`${at}: mentions ${what}`);
    if ((text.match(/\*\*/g) ?? []).length % 2) fail(`${at}: unbalanced ** (bold)`);
    if (/\{(?!app\})[a-z]+\}/i.test(text)) fail(`${at}: unknown token ${text.match(/\{(?!app\})[a-z]+\}/i)?.[0]}`);
    if (/\s{2,}/.test(text)) fail(`${at}: double space`);
  }

  g.sections.forEach((s) => {
    const shot = s.screenshot;
    if (!shot) return;
    if (!new RegExp(`^${slug}-\\d+\\.webp$`).test(shot.file)) fail(`${slug}: screenshot "${shot.file}" should be named ${slug}-<n>.webp`);
    if (!shot.shot.path.startsWith("/")) fail(`${slug}: screenshot "${shot.file}" path should start with /`);
    const left = shot.shot.path.replace(/:(project|page|flow|design)\b/g, "").match(/:[a-z]+/i);
    if (left) fail(`${slug}: screenshot "${shot.file}" uses an unknown placeholder ${left[0]}`);
  });
}

for (const shot of allScreenshots()) {
  const other = files.get(shot.file);
  if (other) fail(`screenshot file "${shot.file}" is used by both ${other} and ${shot.guide}`);
  files.set(shot.file, shot.guide);
}

// Guides nobody can reach from their slug list.
for (const slug of Object.keys(GUIDES)) {
  if (!(GUIDE_SLUGS as readonly string[]).includes(slug)) fail(`${slug}: guide isn't listed in GUIDE_SLUGS`);
}

// Every screen the Help link maps to has a guide.
for (const p of ["/dashboard", "/new", "/designer", "/billing", "/account", "/admin", "/reseller", "/reseller/billing", "/reseller/branding", "/projects/x", "/projects/x/pages/y/edit", "/projects/x/native"]) {
  const slug = guideForPath(p);
  if (slug && !GUIDES[slug]) fail(`guideForPath("${p}") gives "${slug}", which has no guide`);
}

// "groups" is the message key for the group titles, so no guide may use it as a slug.
if ((GUIDE_SLUGS as readonly string[]).includes("groups")) fail(`"groups" can't be a guide slug (messages/*/guides.json uses it for group titles)`);

// messages/en/guides.json (what gets translated) matches guides.ts.
{
  const want = allGuideMessages();
  let have: Record<string, string> | null = null;
  try {
    have = flatten(JSON.parse(readFileSync(path.join(process.cwd(), "messages", "en", "guides.json"), "utf8")));
  } catch {
    fail("messages/en/guides.json is missing or not valid JSON: run pnpm guides:messages");
  }
  if (have) {
    const stale = [
      ...Object.keys(want).filter((k) => have![k] !== want[k]),
      ...Object.keys(have).filter((k) => !(k in want)),
    ];
    if (stale.length) fail(`messages/en/guides.json is out of date (${stale.length} message${stale.length === 1 ? "" : "s"}, e.g. ${stale.slice(0, 3).join(", ")}): run pnpm guides:messages`);
  }
  for (const [k, v] of Object.entries(want)) {
    if (fromMessage(v) === null) fail(`guides message ${k}: bold (**) doesn't survive as <b> tags`);
    if (/[<>]/.test(v.replace(/<\/?b>/g, ""))) fail(`guides message ${k}: contains < or >, which translation would read as a tag`);
  }
}

if (problems.length) {
  console.error(`check:guides found ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check:guides OK: ${GUIDE_SLUGS.length} guides, ${files.size} screenshots.`);
