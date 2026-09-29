// Checks the documentation for wording that describes an older version of
// the product, and README.md for links and pictures that don't exist.
//
// Only documentation is checked: the Markdown files in the project folder,
// docs/ and .github/. Source files legitimately mention "_host" (the old
// private route folder that the middleware and tests guard against), so they
// are never scanned.
//
// Run on its own: node scripts/check-docs.mjs [folder]
// scripts/verify-release.mjs runs the same checks on a release folder.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STALE = [
  // Custom domains are served through /nk-host (App Router ignores folders
  // whose name starts with "_", so /_host never worked).
  { re: /\/_host\b/, why: 'custom domains are served through /nk-host, not /_host' },
  // There are six ways to start an app; "Import an app" is the sixth.
  { re: /\bfive\s+(?:building|ways)\b/i, why: 'there are six ways to start an app' },
];

async function markdownFiles(root) {
  const out = [];
  for (const item of await readdir(root, { withFileTypes: true })) {
    if (item.isFile() && item.name.endsWith('.md')) out.push(item.name);
  }
  async function walk(dir) {
    let items;
    try { items = await readdir(join(root, dir), { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      const rel = `${dir}/${item.name}`;
      if (item.isDirectory()) await walk(rel);
      else if (item.name.endsWith('.md')) out.push(rel);
    }
  }
  await walk('docs');
  await walk('.github');
  return out.sort();
}

/** Returns a list of problems, each "file:line: message". Empty means the docs pass. */
export async function lintDocs(rootDir) {
  const root = resolve(rootDir);
  const problems = [];
  for (const rel of await markdownFiles(root)) {
    const lines = (await readFile(join(root, rel), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      for (const { re, why } of STALE) {
        const m = re.exec(line);
        if (m) problems.push(`${rel}:${i + 1}: "${m[0]}": ${why}`);
      }
    });
  }
  // README.md is the project's front page on GitHub: every relative link and
  // picture in it must exist.
  const readme = await readFile(join(root, 'README.md'), 'utf8').catch(() => null);
  if (readme === null) problems.push('README.md: missing');
  else {
    const targets = [
      ...[...readme.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]),
      ...[...readme.matchAll(/<(?:img|source)\b[^>]*?\s(?:src|srcset)="([^"]+)"/gi)].map((m) => m[1]),
      ...[...readme.matchAll(/<a\b[^>]*?\shref="([^"]+)"/gi)].map((m) => m[1]),
    ];
    for (const target of new Set(targets)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue; // web links, mail links and anchors
      const file = decodeURIComponent(target.split('#')[0].split('?')[0]);
      if (!file) continue;
      if (!(await stat(join(root, file)).catch(() => null))) problems.push(`README.md: link to ${target}, which doesn't exist`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));
  const problems = await lintDocs(root);
  if (problems.length) {
    console.error(`The documentation needs updating:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Documentation checked: no outdated wording, and every link and picture in README.md exists.');
}
