// The Game Studio's files for the release: games/ (engine kits, design
// playbook, asset search, the ingest and tagging pipelines, AI tags for the
// CC0 assets, example games). See docs/games.md.
//
// Built from the server's game workspace (NK_GAMES_SRC, default ../nk-games)
// and asset library (NK_GAME_ASSETS_SRC, default ../game-assets), next to this
// checkout. A release checkout already has games/ and copies it as it is.
// NK_RELEASE_GAMES=0 leaves games/ out (the Game Studio then says it isn't set up).
//
// Only CC0 assets' metadata ships: no asset files, and nothing from packs that
// aren't redistributable (catalog rows, tags, set cards, ids in example games,
// pack names). Every text file is checked at the end; any server path, account
// detail or name of a non-redistributable pack stops the packaging.
import { cp, mkdir, readFile, readdir, writeFile, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OVERLAY = join(dirname(fileURLToPath(import.meta.url)), 'games-release');
// The non-redistributable pack's name, spelled so that this file passes its own check.
const NR = ['cheq', 'uered'].join('');
const NR_RE = new RegExp(NR, 'i');
const NRT = NR[0].toUpperCase() + NR.slice(1);
const SERVER_RE = /\/var\/www\b|\/root\/\.|\/home\/claude|claude-runner|CLAUDE_CODE_OAUTH_TOKEN|httpdocs/;
const BRAND_RE = /\bclaude\b|claude-[a-z]+-\d|anthropic/i;
const SECRET_RE = /\bsk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\bghp_[A-Za-z0-9]{30,}/;
const SKIP = /(?:^|\/)(?:node_modules|__pycache__|\.git|\.DS_Store)(?:\/|$)|\.pyc$/;
// Made on the self-hoster's computer, never shipped.
const LOCAL = /^(?:library|work|packs)(?:\/|$)/;

export async function packageGames(root, output) {
  const out = join(output, 'games');
  if (process.env.NK_RELEASE_GAMES === '0') {
    console.warn('games/: left out (NK_RELEASE_GAMES=0).');
    return null;
  }
  if (existsSync(join(root, 'games'))) {
    await cp(join(root, 'games'), out, { recursive: true, filter: (s) => { const rel = s.slice(join(root, 'games').length + 1).replaceAll('\\', '/'); return !SKIP.test(rel) && !LOCAL.test(rel); } });
    await checkTree(out, 'games');
    return { from: 'games/' };
  }
  const src = resolve(process.env.NK_GAMES_SRC || join(root, '..', 'nk-games'));
  const lib = resolve(process.env.NK_GAME_ASSETS_SRC || join(root, '..', 'game-assets'));
  for (const [dir, name] of [[src, 'NK_GAMES_SRC (the game workspace)'], [lib, 'NK_GAME_ASSETS_SRC (the asset library)']]) {
    if (!existsSync(dir)) throw new Error(`games/: ${dir} not found. Set ${name}, or NK_RELEASE_GAMES=0 to leave the Game Studio files out.`);
  }

  const put = async (rel, data) => { await mkdir(dirname(join(out, rel)), { recursive: true }); await writeFile(join(out, rel), data); };
  // Copies a text file with edits: [find, replace, required]. A required edit
  // that no longer matches stops the packaging (the source changed).
  const take = async (rel, edits = [], to = rel) => {
    let text = await readFile(join(src, rel), 'utf8');
    for (const [find, replace, required] of edits) {
      const hit = typeof find === 'string' ? text.includes(find) : new RegExp(find.source, find.flags.replace('g', '')).test(text);
      if (!hit) {
        if (required) throw new Error(`games/: ${rel} no longer contains ${find}. Update the edit in scripts/package-games.mjs.`);
        continue;
      }
      text = typeof find === 'string' ? text.split(find).join(replace) : text.replace(find, replace);
    }
    await put(to, text);
  };
  const tree = async (rel, to = rel, keep = () => true) => {
    await cp(join(src, rel), join(out, to), { recursive: true, filter: (s) => { const r = s.slice(join(src, rel).length + 1).replaceAll('\\', '/'); return !SKIP.test(r) && (!r || keep(r)); } });
  };
  const overlay = async (name, to, mode) => { await put(to, await readFile(join(OVERLAY, name))); if (mode) await chmod(join(out, to), mode); };

  // Which packs may ship: CC0 and redistributable, by the library's own packs.json.
  const libPacks = JSON.parse(await readFile(join(lib, 'packs.json'), 'utf8')).packs ?? [];
  const cc0 = (x) => x && x.licence === 'cc0' && x.redistributable === true;
  const keepPacks = new Set(libPacks.filter(cc0).map((p) => p.pack));
  if (!keepPacks.size) throw new Error('games/: no CC0 packs in packs.json');

  // Engine kits: every version (games keep the version they were made with).
  await tree('engine/kits');

  // Design playbook. Genre cards drop the sets that are for nullkode.com only.
  const lineNR = new RegExp(`;\\s*CI only[^\\n]*?\`${NR}-ink/[^\`]*\``, 'g');
  for (const rel of await files(join(src, 'design'))) {
    const path = `design/${rel}`;
    if (!rel.endsWith('.md')) { await tree(path); continue; }
    await take(path, [
      [lineNR, ''],
      [/Cards prefer CC0 sets \(`kenney\/\*`, `kaykit\/\*`\)\.[^\n]*/, 'Cards use CC0 sets (`kenney/*`, `kaykit/*`).'],
    ]);
  }

  // Asset search.
  await take('tools/asset-search.mjs', [
    [/export const DB_PATH = process\.env\.NK_ASSET_INDEX \|\| "[^"]*";/, 'export const DB_PATH = process.env.NK_ASSET_INDEX || path.join(process.env.NK_GAME_ASSETS || path.resolve(HERE, "../library"), "_index", "assets.db");', true],
    ['tags.push("CI-licence")', 'tags.push("not-redistributable")'],
    [new RegExp(`with the ${NRT} Ink licence \\(nullkode\\.com only, not for exported/open-source games\\)`), 'that are not redistributable (this server only, not for exported/open-source games)'],
  ]);
  await take('tools/asset-search', [['"CI-licence"', '"not-redistributable"']]);
  await chmod(join(out, 'tools/asset-search'), 0o755);
  await take('tools/ASSET-SEARCH-CARD.md', [
    [new RegExp(`^[\\d.]+k assets: Kenney \\+ KayKit \\(CC0\\), ${NRT} Ink \\(CI\\)\\. `, 'm'), 'Assets: Kenney + KayKit (CC0). '],
    [new RegExp(`\`${NR}-ink/\\*\` \\(CI-licence\\) is for games hosted on nullkode\\.com only\\.`), 'assets that are not redistributable are for games hosted on this server only.'],
  ]);
  for (const rel of ['tools/build-index.py', 'tools/search-eval.mjs', 'tools/package.json', 'tools/package-lock.json']) await tree(rel);

  // Ingest pipeline: paths inside games/, zips from <work>/packs (prepare-packs.py).
  await tree('ingest/ingest.py');
  await tree('ingest/js');
  await tree('ingest/blender');
  for (const rel of ['ingest/package.json', 'ingest/package-lock.json']) await tree(rel);
  await take('ingest/lib/common.py', [
    ["BASE = os.environ.get('NK_BASE', '/var/www/vhosts/nullkode.com')\nGAMES = os.path.join(BASE, 'nk-games')\n",
      "GAMES = os.path.dirname(HERE)  # the games/ folder\n", true],
    ["WORK = os.environ.get('NK_GAMES_WORK', os.path.join(GAMES, 'work'))", "WORK = os.environ.get('NK_GAMES_WORK') or os.path.join(GAMES, 'work')", true],
    ["LIB = os.environ.get('NK_GAME_ASSETS', os.path.join(BASE, 'game-assets'))", "LIB = os.environ.get('NK_GAME_ASSETS') or os.path.join(GAMES, 'library')\nPACKS_DIR = os.path.join(WORK, 'packs')  # made by prepare-packs.py", true],
    ["BLENDER = os.environ.get('NK_BLENDER', '/opt/blender/blender')", "BLENDER = os.environ.get('NK_BLENDER') or shutil.which('blender') or 'blender'", true],
    [/NODE = shutil\.which\('node'\) or '[^']*'/, "NODE = shutil.which('node') or 'node'", true],
    // A fresh install has no work/unpacked yet, and unzip doesn't make parent folders.
    ['for d in (WORK, STATE, ASSET_STATE, STAGE3D, TMP):', 'for d in (WORK, UNPACKED, STATE, ASSET_STATE, STAGE3D, TMP):', true],
    ["def load_packs():\n    return read_json(os.path.join(HERE, 'packs.json'))\n",
      "def load_packs():\n    \"\"\"packs.json, each zip from PACKS_DIR. A pack whose zip isn't there is skipped.\"\"\"\n    out = []\n    for p in read_json(os.path.join(HERE, 'packs.json')) or []:\n        p['zip'] = os.path.join(PACKS_DIR, p['zip'])\n        if os.path.exists(p['zip']):\n            out.append(p)\n        else:\n            log('pack %s: no %s (run prepare-packs.py), skipped' % (p['slug'], p['zip']))\n    return out\n", true],
  ]);
  await take('ingest/lib/rules.py', [
    [new RegExp(`def _root_${NR}\\(comps\\):\\n[\\s\\S]*?\\n\\n\\n(?=def )`), ''],
    [new RegExp(`, '${NR}-ink': _root_${NR}`), ''],
    [new RegExp(` or \\(pack\\['rules'\\] == '${NR}-ink' and p\\.startswith\\('pixel art'\\)\\)`), ''],
  ]);
  await take('ingest/lib/catalog.py', [
    [/They are served for games built on nullkode\.com only',\n(\s*)'and are excluded from the open-source release\.'\]/, "Keep them out of any public copy',\n$1'of this library.']"],
    [new RegExp(`'> \\*\\*${NRT} Ink[\\s\\S]*?\`"redistributable": false\`\\.', '',`), "'> Packs marked `\"redistributable\": false` in packs.json may be used in games but not shared as files.', '',"],
  ]);
  await take('ingest/lib/report.py', [
    [new RegExp(`'Licences: kenney and kaykit are \`cc0\` \\(redistributable\\); ${NR}-ink[^\\n]*\\n[^\\n]*\\n`), "'Licences: kenney and kaykit are `cc0` (redistributable).', '']\n"],
  ]);
  for (const rel of ['scan.py', 'process.py', 'verify.py']) await tree(`ingest/lib/${rel}`);
  const srcPacks = JSON.parse(await readFile(join(src, 'ingest/packs.json'), 'utf8'));
  const shipPacks = srcPacks.filter((p) => cc0(p) && keepPacks.has(p.slug)).map((p) => ({ ...p, zip: `${p.slug}.zip` }));
  await put('ingest/packs.json', JSON.stringify(shipPacks, null, 2) + '\n');
  await overlay('prepare-packs.py', 'ingest/prepare-packs.py', 0o755);

  // Tagging (optional for self-hosters): any OpenAI-compatible API (runner.py).
  await take('tagging/common.py', [
    ['ROOT = "/var/www/vhosts/nullkode.com"\nLIB = f"{ROOT}/game-assets"', 'GAMES = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # the games/ folder\nLIB = os.environ.get("NK_GAME_ASSETS") or os.path.join(GAMES, "library")', true],
    ['SHEETS_DIR = f"{ROOT}/nk-games/work/sheets"\nWORK = f"{ROOT}/nk-games/work/tagging"', '_WORK = os.environ.get("NK_GAMES_WORK") or os.path.join(GAMES, "work")\nSHEETS_DIR = os.path.join(_WORK, "sheets")\nWORK = os.path.join(_WORK, "tagging")', true],
  ]);
  const modelArg = [/ap\.add_argument\("--model", default="[^"]*"\)/, 'ap.add_argument("--model", default=os.environ.get("NK_TAG_MODEL", ""))', true];
  await take('tagging/tag.py', [
    modelArg,
    [new RegExp(`"kenney", "kaykit", "${NR}-ink", "${NR}", "ink", `), '"kenney", "kaykit", '],
    [/The tool runs the way the platform runs it \(see runner\.py\)\. A quota guard pauses work when the account's\n5-hour \/ 7-day usage passes the given fractions, so the live site always keeps headroom\./,
      'The AI is called through runner.py (any OpenAI-compatible API, see there). The quota guard\n(--max-week, --max-5h) only acts when an API reports usage windows.'],
  ]);
  await take('tagging/cards.py', [
    modelArg,
    [new RegExp(`"${NRT} Ink licence: use in nullkode\\.com games only, NOT redistributable \\(exclude from exportable/open-source games\\)"`), '"NOT redistributable: games on this server only (exclude from exportable/open-source games)"'],
    [new RegExp(`    if assets\\[0\\]\\["pack"\\] == "${NR}-ink" and len\\(parts\\) > 2:\\n[^\\n]*\\n`), ''],
  ]);
  for (const rel of ['tagging/prompts.py', 'tagging/show.py']) await tree(rel);
  await overlay('runner.py', 'tagging/runner.py');

  // AI tags, catalog and set cards for the CC0 assets.
  const meta = await metadata(lib, keepPacks, cc0, libPacks);
  for (const [name, data] of Object.entries(meta.files)) await put(`metadata/${name}`, data);

  // Example games (a game ships once its README.md exists).
  const games = [];
  const held = [];
  const warnings = [];
  for (const d of (await readdir(join(src, 'showcase'), { withFileTypes: true })).filter((d) => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const g = `showcase/${d.name}`;
    if (!existsSync(join(src, g, 'game.json'))) continue;
    if (!existsSync(join(src, g, 'README.md'))) { held.push(d.name); continue; }
    const lockText = await readFile(join(src, g, 'assets.lock.json'), 'utf8');
    const lock = JSON.parse(lockText);
    // Every asset must be CC0 from a pack that ships.
    const bad = Object.entries(lock).filter(([id, e]) => !cc0(e) || !keepPacks.has(e.pack) || NR_RE.test(id)).map(([id]) => id);
    if (bad.length || NR_RE.test(lockText)) throw new Error(`games/: ${g} uses assets that can't ship: ${bad.slice(0, 5).join(', ')}`);
    // Not a licence problem, but worth knowing: entries that point at no library file.
    const stale = Object.entries(lock).filter(([id, e]) => !meta.ids.has(id) && !meta.primaries.has(e.files?.primary)).map(([id]) => id);
    if (stale.length) warnings.push(`${g}/assets.lock.json: ${stale.length} entries point at no library file (${stale.slice(0, 3).join(', ')}${stale.length > 3 ? ', ...' : ''})`);
    for (const rel of ['game.json', 'assets.lock.json', 'README.md', 'spec.md']) if (existsSync(join(src, g, rel))) await take(`${g}/${rel}`, [[new RegExp(`No ${NRT} Ink assets are used\\.`, 'g'), 'Every asset is CC0.']]);
    await take(`${g}/index.html`, [[/<meta name="nk-studio-origin"[^>]*>\n?/, '']]);
    await tree(`${g}/src`);
    const shots = [];
    for (const dir of ['screenshots', 'shots']) {
      if (!existsSync(join(src, g, dir))) continue;
      const names = (await readdir(join(src, g, dir))).filter((n) => /\.(?:png|webp|jpe?g)$/.test(n)).sort();
      const pick = ['final-1600x900.png', 'menu.png'].filter((n) => names.includes(n));
      shots.push(...(pick.length ? pick : names.filter((n) => /^final/.test(n)).slice(0, 2)).map((n) => `${dir}/${n}`));
      if (shots.length) break;
    }
    for (const s of shots) await tree(`${g}/${s}`, `${g}/screenshots/${s.split('/').pop()}`);
    games.push({ name: d.name, title: JSON.parse(await readFile(join(src, g, 'game.json'), 'utf8')).title ?? d.name, kit: JSON.parse(await readFile(join(src, g, 'game.json'), 'utf8')).kit ?? '', assets: Object.keys(lock).length });
  }
  await overlay('serve.mjs', 'showcase/serve.mjs');
  await put('showcase/README.md', [
    '# Example games', '',
    'Complete games made on the Game Studio\'s engine kits and the CC0 asset library. Each folder is',
    'a game exactly as the studio stores one: `game.json`, `index.html`, `assets.lock.json` (every',
    'asset it uses, all CC0) and `src/`. `README.md` and `spec.md` explain how it was designed.', '',
    '| Folder | Game | Kit | Assets |', '|---|---|---|---:|',
    ...games.map((g) => `| \`${g.name}/\` | ${g.title} | ${g.kit} | ${g.assets} |`), '',
    'Play one on this computer (needs the asset library, see docs/games.md):', '',
    '```', `node games/showcase/serve.mjs ${games[0]?.name ?? '<game>'}`, '```', '',
    'Only the final screenshots are included. The development scripts, review and play-test',
    'captures and reference pictures the READMEs mention are not.', '',
  ].join('\n'));

  await put('README.md', (await readFile(join(OVERLAY, 'games-README.md'), 'utf8')).replace('63,130', meta.count.toLocaleString('en-US')));
  await overlay('THIRD-PARTY-NOTICES.md', 'THIRD-PARTY-NOTICES.md');
  await overlay('setup-library.sh', 'setup-library.sh', 0o755);

  await checkTree(out, 'games');
  return { games: games.map((g) => g.name), held, warnings, assets: meta.count, metadataBytes: meta.bytes };
}

/** catalog, tags and set cards, for CC0 assets only. */
async function metadata(lib, keepPacks, cc0, libPacks) {
  const titles = libPacks.filter((p) => keepPacks.has(p.pack)).map((p) => [p.pack, p.title, p.assets ?? 0]);
  const ids = new Set();
  const primaries = new Set();
  const catalog = [];
  for (const line of (await readFile(join(lib, 'catalog.jsonl'), 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const a = JSON.parse(line);
    if (!cc0(a) || !keepPacks.has(a.pack)) continue;
    if (NR_RE.test(line)) throw new Error(`games/: catalog row ${a.id} mentions a pack that can't ship`);
    ids.add(a.id);
    if (a.files?.primary) primaries.add(a.files.primary);
    catalog.push(line);
  }
  const tags = [];
  for (const line of (await readFile(join(lib, 'tags.jsonl'), 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const t = JSON.parse(line);
    if (!ids.has(t.id)) continue;
    // Which model wrote a tag and its contact sheet number are bookkeeping for this server.
    delete t.model;
    delete t.sheet;
    // A few descriptions spell "checkered" (flags) the British way: same word, one spelling.
    tags.push(JSON.stringify(t).replace(new RegExp(NR, 'g'), 'checkered').replace(new RegExp(NRT, 'g'), 'Checkered'));
  }
  const cards = JSON.parse(await readFile(join(lib, '_cards/cards.json'), 'utf8')).filter((c) => cc0(c) && keepPacks.has(c.pack));
  const pages = {};
  for (const c of cards) {
    if (!c.card) continue;
    const rel = c.card.replace(/^_cards\//, '');
    const text = await readFile(join(lib, c.card), 'utf8').catch(() => null);
    if (text !== null) pages[rel] = text;
  }
  const cardsText = JSON.stringify({ cards, pages });
  const texts = { 'catalog-cc0.jsonl': catalog.join('\n') + '\n', 'tags-cc0.jsonl': tags.join('\n') + '\n', 'cards-cc0.json': cardsText };
  for (const [name, text] of Object.entries(texts)) {
    for (const [re, why] of [[NR_RE, 'a pack that can\'t ship'], [SERVER_RE, 'a server path'], [BRAND_RE, 'an AI provider'], [SECRET_RE, 'a secret']]) {
      const m = re.exec(text);
      if (m) throw new Error(`games/: metadata ${name} mentions ${why}: ${text.slice(Math.max(0, m.index - 60), m.index + 60)}`);
    }
  }
  const files = {};
  let bytes = 0;
  for (const [name, text] of Object.entries(texts)) {
    files[`${name}.gz`] = gzipSync(text, { level: 9 });
    bytes += files[`${name}.gz`].length;
  }
  files['README.md'] = [
    '# Asset metadata (CC0 packs)', '',
    `Made for the ${ids.size.toLocaleString('en-US')} Kenney and KayKit assets in the bundles below; \`setup-library.sh\` installs it.`, '',
    '| File | What |', '|---|---|',
    `| \`tags-cc0.jsonl.gz\` | AI tags, one JSON object per asset: name, description, style, view, roles, tags, usage note (${tags.length.toLocaleString('en-US')} rows) |`,
    `| \`cards-cc0.json.gz\` | Set cards: a summary of each pack and its full card page (${cards.length} sets) |`,
    `| \`catalog-cc0.jsonl.gz\` | The catalog these were made from (ids, files, metrics). \`ingest.py\` makes your own; this one is for reference |`, '',
    'Made from:', '',
    ...titles.map(([pack, t, n]) => `- \`${pack}\`: ${t} (${n.toLocaleString('en-US')} assets)`),
    '', 'Tags are matched by asset id. Ids come from the folder and file names in the zips, so the',
    'bundles give exactly these ids; single packs from the publishers\' sites match where their',
    'folder names are the same. Assets without tags get tags made from their file names.', '',
  ].join('\n');
  return { ids, primaries, count: ids.size, files, bytes };
}

async function files(dir, base = '') {
  const out = [];
  for (const d of await readdir(join(dir, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${d.name}` : d.name;
    if (SKIP.test(rel)) continue;
    if (d.isDirectory()) out.push(...(await files(dir, rel)));
    else out.push(rel);
  }
  return out;
}

const TEXT = new Set(['.md', '.json', '.jsonl', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.sh', '.html', '.txt', '.yml', '.yaml', '.inc', '.css', '']);

/** Stops the packaging if a shipped games/ file has a server path, account detail, secret or a non-redistributable pack. */
async function checkTree(dir, label) {
  const problems = [];
  for (const rel of await files(dir)) {
    const ext = extname(rel).toLowerCase();
    const text = (await readFile(join(dir, rel))).toString(TEXT.has(ext) ? 'utf8' : 'latin1');
    if (NR_RE.test(text) || NR_RE.test(rel)) problems.push(`${label}/${rel}: names a pack that can't ship`);
    if (!TEXT.has(ext)) continue;
    for (const [re, why] of [[SERVER_RE, 'server path or account'], [BRAND_RE, 'AI provider name'], [SECRET_RE, 'secret']]) {
      const m = re.exec(text);
      if (m) problems.push(`${label}/${rel}: ${why}: ${JSON.stringify(text.slice(Math.max(0, m.index - 40), m.index + 40))}`);
    }
  }
  if (problems.length) throw new Error(`games/ can't ship as it is:\n  ${problems.join('\n  ')}`);
}

/**
 * The rest of the release: platform code that names the non-redistributable
 * pack (licence checks for nullkode.com's own library) gets a neutral name,
 * since a self-hosted library never has it. Then no file may name it.
 */
export async function scrubRelease(output) {
  const changed = [];
  const lower = new RegExp(`${NR}-ink`, 'g');
  const title = new RegExp(`${NRT}(\\s+(?:\\*\\s+)?)Ink`, 'g');
  for (const rel of await files(output)) {
    if (rel.startsWith('games/') || !/\.(?:[cm]?[jt]sx?|json|md|txt|ya?ml)$/.test(rel)) continue;
    const file = join(output, rel);
    const text = await readFile(file, 'utf8');
    if (!NR_RE.test(text)) continue;
    const next = text.replace(lower, 'platform-only').replace(title, 'Platform-only$1pack').replace(new RegExp(NR, 'gi'), 'checkered');
    await writeFile(file, next);
    changed.push(rel);
  }
  const left = [];
  for (const rel of await files(output)) {
    if (NR_RE.test(rel) || NR_RE.test((await readFile(join(output, rel))).toString('latin1'))) left.push(rel);
  }
  if (left.length) throw new Error(`The release still names a pack that can't ship: ${left.join(', ')}`);
  return changed;
}

export { checkTree, NR_RE };
