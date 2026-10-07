import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { lintDocs } from './check-docs.mjs';
const root = resolve(process.argv[2] || '.');
const required = [
  'Dockerfile','docker-compose.yml','install.sh','Start-Nullkode.bat','docs/install.md','prisma/schema.prisma','pnpm-lock.yaml',
  // Front page, security policy and community rules.
  'README.md','SECURITY.md','CODE_OF_CONDUCT.md','docs/security-audit-exceptions.md',
  'src/lib/ai/provider.ts','src/lib/design-studio/engine.ts','src/lib/flow/runtime.ts',
  // Original MIT starter designs (the templates the release ships) and their
  // generated pictures.
  'src/lib/templates/originals/index-a.ts','src/lib/templates/originals/index-b.ts','src/lib/assets/generated-catalog.json','public/media/generated',
  'src/app/(main)/projects/[id]/data',
  // Every studio language (messages/<locale>/<area>.json).
  'messages/en/common.json','messages/ar/common.json','messages/zh-Hans/common.json','src/i18n/request.ts',
  // Mobile apps: the build API (a folder named "build") and both native templates.
  'src/app/api/projects/[id]/native/build/route.ts','src/app/api/projects/[id]/native/build/download/route.ts',
  'native-templates/android-webview/gradlew','native-templates/android-webview/gradle/wrapper/gradle-wrapper.jar',
  'native-templates/capacitor-ios/ios/App/App.xcodeproj/project.pbxproj','native-templates/capacitor-ios/ios/App/CapApp-SPM/Package.swift',
  'native-templates/capacitor-ios/.github/workflows/ios.yml',
  // Native apps: the NullKode Native engine (source + npm lockfile), its build
  // templates, the emulator service, the phone preview and the operator tools.
  'native-runtime/package.json','native-runtime/package-lock.json','native-runtime/app.config.ts','native-runtime/index.ts','native-runtime/src/App.tsx','native-runtime/src/spec.ts','native-runtime/scripts/copy-web.mjs',
  'native-templates/expo-engine/app.config.js','native-templates/expo-engine/plugins/with-nk-build.js','native-templates/expo-engine/README-IOS.md','native-templates/expo-engine/github/ios-testflight.yml',
  'services/native-emulator/server.mjs','services/native-emulator/viewer.html',
  'src/lib/native/compile.ts','src/lib/native/engine-web.ts','src/app/nk-native/web/route.ts','src/app/(public)/nk-host/[host]/nk-native/web/route.ts',
  'scripts/native-web.mjs','scripts/native-engine.ts','scripts/native-fidelity.ts','scripts/e2e-native.ts','scripts/e2e-native-studio.ts',
  'messages/en/nativeStudio.json','messages/en/nativeEngine.json','docs/native-apps.md',
  // HTTPS mode (docker-compose mounts it) and custom domains / app origins.
  'Caddyfile','src/app/(public)/nk-host',
  // Backups: the nightly service, one-off backups, restores, and the
  // bare-metal (systemd) timer. docker-compose.yml builds the backup image.
  'scripts/backup.sh','scripts/backup-loop.sh','scripts/backup.Dockerfile','scripts/restore.sh','docs/deploy/RESTORE.md',
  'docs/deploy/systemd/nullkode.service','docs/deploy/systemd/nullkode-backup.service','docs/deploy/systemd/nullkode-backup.timer','docs/deploy/systemd/nullkode-backup.sh',
  'docs/deploy/logrotate/nullkode',
  // `pnpm test:e2e` and scripts that import the test harness.
  'scripts/e2e-harness.ts','scripts/check-generated-js.ts','scripts/secure-existing-apps.ts','scripts/upgrade-template-images.ts','scripts/smoke-install.cjs','scripts/check-docs.mjs',
];
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
// Every script a package.json command runs must be in the release.
for (const command of Object.values(pkg.scripts ?? {})) for (const m of String(command).matchAll(/scripts\/[\w.-]+/g)) required.push(m[0]);
for (const f of required) assert.ok((await stat(join(root,f)).catch(() => null)), `Missing ${f}`);
// The systemd unit checks the database before starting.
const unit = await readFile(join(root, 'docs/deploy/systemd/nullkode.service'), 'utf8');
for (const m of unit.matchAll(/^ExecStartPre=.*?\b(scripts\/[\w.-]+)/gm)) assert.ok(await stat(join(root, m[1])).catch(() => null), `docs/deploy/systemd/nullkode.service runs ${m[1]}, which is missing`);
const compose = await readFile(join(root, 'docker-compose.yml'), 'utf8');
assert.match(compose, /^\s+backup:\s*$/m, 'docker-compose.yml has no backup service');

async function walk(dir='') {
  for(const item of await readdir(join(root,dir),{withFileTypes:true})) {
    const rel=join(dir,item.name);
    assert.ok(item.name !== '.env' && !(item.name.startsWith('.env.') && item.name !== '.env.example'), `Secret environment file: ${rel}`);
    assert.ok(!/^themeforest-|^(crafto|litho)-/.test(item.name), `Purchased asset: ${rel}`);
    assert.ok(!['node_modules','.git','.next','uploads','backups'].includes(item.name), `Runtime files: ${rel}`);
    assert.ok(!/\.(?:dump|sql|sql\.gz)$|^env\.enc$/i.test(item.name), `Database copy or saved settings: ${rel}`);
    assert.ok(!(item.isDirectory() && item.name === '_host' && rel.startsWith('src/app')), `Private route folder (App Router ignores "_" folders; use nk-host): ${rel}`);
    assert.ok(!/\.(jks|keystore)$/i.test(item.name), `Signing key: ${rel}`);
    assert.ok(!(rel.startsWith('native-templates/') && item.isDirectory() && ['build','.gradle'].includes(item.name)), `Build output: ${rel}`);
    assert.ok(!/^native-runtime\/(?:\.expo|dist-web|web-build|android|ios)$/.test(rel) && rel !== 'public/nk-native' && rel !== 'output', `Generated native files: ${rel}`);
    assert.ok(!(item.isDirectory() && /^games\/(?:library|work|packs)$/.test(rel)), `Game asset files or pipeline scratch space: ${rel}`);
    if(item.isDirectory())await walk(rel);
  }
}
await walk();

// Game Studio (docs/games.md): kits, playbook, asset tools and CC0 metadata,
// with no asset files and nothing from packs that may not be shared.
assert.ok(await stat(join(root, 'docs/games.md')).catch(() => null), 'Missing docs/games.md');
if (await stat(join(root, 'games')).catch(() => null)) {
  assert.ok(!(await stat(join(root, 'games/showcase')).catch(() => null)), 'The official games must not ship (games/showcase)');
  for (const f of ['games/engine/kits/phaser-2d','games/engine/kits/three-3d','games/design/INDEX.json','games/tools/asset-search.mjs','games/tools/package-lock.json','games/ingest/ingest.py','games/ingest/prepare-packs.py','games/tagging/runner.py','games/metadata/tags-cc0.jsonl.gz','games/metadata/cards-cc0.json.gz','games/setup-library.sh','games/THIRD-PARTY-NOTICES.md']) {
    assert.ok(await stat(join(root, f)).catch(() => null), `Missing ${f}`);
  }
  const { checkTree } = await import('./package-games.mjs');
  await checkTree(join(root, 'games'), 'games');
  const assetFile = /\.(?:glb|gltf|ogg|mp3|wav)$/i;
  const found = [];
  const look = async (dir) => { for (const item of await readdir(join(root, dir), { withFileTypes: true })) { const rel = join(dir, item.name); if (item.isDirectory()) await look(rel); else if (assetFile.test(item.name)) found.push(rel); } };
  await look('games');
  assert.equal(found.length, 0, `Asset files in games/ (the library is built by each install): ${found.slice(0, 5).join(', ')}`);
}
{
  // No file anywhere names the packs nullkode.com may use but not share, or their licences.
  const { NR_RE, OTHER_NR_RE } = await import('./package-games.mjs');
  const names = (s) => NR_RE.test(s) || OTHER_NR_RE.test(s);
  const hits = [];
  const scan = async (dir) => { for (const item of await readdir(join(root, dir), { withFileTypes: true })) { const rel = join(dir, item.name); if (names(item.name)) hits.push(rel); if (item.isDirectory()) await scan(rel); else if (names((await readFile(join(root, rel))).toString('latin1'))) hits.push(rel); } };
  await scan('');
  assert.equal(hits.length, 0, `Files naming a pack that can't ship: ${hits.join(', ')}`);
}
// The engine's copy of the native spec contract is the server's.
assert.equal(await readFile(join(root,'native-runtime/src/spec.ts'),'utf8'), await readFile(join(root,'src/lib/native/spec.ts'),'utf8'), 'native-runtime/src/spec.ts differs from src/lib/native/spec.ts (run pnpm native:web)');
const registry=await readFile(join(root,'src/lib/templates/registry.ts'),'utf8');
assert.ok(!/import "\.\/(crafto|litho)-/.test(registry));
assert.match(registry,/originals\/index-a/);
assert.match(registry,/originals\/index-b/);

// Template pictures: every picture an original template shows is in the
// release. The built-in templates use the generated library
// (public/media/generated/). Pictures added for new templates live in
// public/templates/originals/<template>/ next to a CREDITS.md.
const generatedFiles = new Set(await readdir(join(root, 'public/media/generated')));
let photos = 0;
let photoRefs = 0;
for (const file of (await readdir(join(root, 'src/lib/templates/originals'))).filter((f) => f.endsWith('.ts'))) {
  const code = await readFile(join(root, 'src/lib/templates/originals', file), 'utf8');
  const base = /const IMG = "([^"]+)"/.exec(code)?.[1];
  const refs = [
    ...(base ? [...code.matchAll(/\$\{IMG\}\/([\w./-]+\.(?:webp|jpe?g|png|avif|gif|svg))/g)].map((m) => `${base}/${m[1]}`) : []),
    ...[...code.matchAll(/["'(`](\/(?:templates|media)\/[\w./-]+\.(?:webp|jpe?g|png|avif|gif|svg))/g)].map((m) => m[1]),
  ];
  for (const ref of new Set(refs)) {
    photoRefs++;
    assert.ok(await stat(join(root, 'public', ref)).catch(() => null), `src/lib/templates/originals/${file} shows ${ref}, which is not in the release`);
    if (ref.startsWith('/media/generated/')) {
      assert.ok(generatedFiles.has(ref.slice('/media/generated/'.length)), `src/lib/templates/originals/${file} shows ${ref}, which is not in the generated library`);
      photos++;
    } else {
      const folder = /^\/templates\/originals\/([\w-]+)\//.exec(ref)?.[1];
      assert.ok(folder, `src/lib/templates/originals/${file} shows ${ref}, outside public/media/generated/ and public/templates/originals/<template>/`);
      assert.ok(await stat(join(root, 'public/templates/originals', folder, 'CREDITS.md')).catch(() => null), `public/templates/originals/${folder} has no CREDITS.md`);
    }
  }
}
assert.ok(photoRefs > 0, 'Found no template photo references to check');

// Relative imports between shipped scripts resolve.
const scriptNames = await readdir(join(root, 'scripts'));
for (const name of scriptNames.filter((f) => /\.[cm]?[jt]s$/.test(f))) {
  const code = await readFile(join(root, 'scripts', name), 'utf8');
  for (const m of code.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]\.\/([\w.-]+?)(?:\.[cm]?[jt]s)?['"]/g)) {
    assert.ok(scriptNames.some((f) => f === m[1] || f.replace(/\.[cm]?[jt]s$/, '') === m[1]), `scripts/${name} imports ./${m[1]}, which is not in the release`);
  }
}

// Documentation describes this version.
const docProblems = await lintDocs(root);
assert.equal(docProblems.length, 0, `Outdated documentation:\n  ${docProblems.join('\n  ')}`);

// Dependency audit. It reads pnpm-lock.yaml (no node_modules needed) and asks
// the npm registry, so it needs internet access. Accepted exceptions are in
// package.json (pnpm.auditConfig.ignoreGhsas), explained in
// docs/security-audit-exceptions.md.

// Every relative import in a shipped script must be shipped too.
{
  const { readdirSync, readFileSync, existsSync, statSync } = await import('node:fs');
  const { join: pjoin, dirname: pdir } = await import('node:path');
  const missing = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = pjoin(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(?:[cm]?[jt]s)$/.test(f) && !/^new-(?:module|template)\.ts$/.test(f)) { // the generators' imports are text they write into new files
    for (const m of readFileSync(p, 'utf8').matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const base = pjoin(pdir(p), m[1]);
      if (![base, ...['.ts','.mjs','.cjs','.js','.tsx','.json'].map((e) => base + e), pjoin(base, 'index.ts')].some((c) => existsSync(c))) missing.push(`${p.slice(root.length + 1)} -> ${m[1]}`);
    } } } };
  walk(pjoin(root, 'scripts'));
  assert.ok(missing.length === 0, `Shipped scripts import files that are not in the release: ${missing.join(', ')}`);
}

const audit = spawnSync('pnpm', ['audit', '--prod', '--audit-level=high'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
if (audit.error) throw new Error(`Could not run the dependency audit (pnpm audit): ${audit.error.message}. Install pnpm 10 (corepack enable) and try again.`);
const auditSummary = `${audit.stdout}\n${audit.stderr}`.trim().split('\n').filter((l) => /vulnerabilit|Severity|No known/i.test(l)).join(' ').trim();
assert.equal(audit.status, 0, `The dependency audit found high or critical advisories (pnpm audit --prod --audit-level=high):\n${audit.stdout}\n${audit.stderr}`);

console.log(`Release contents verified: full platform source, original templates with ${photoRefs} pictures checked (${photos} from the generated library), backups, native build API and templates, current documentation, no environment secrets, database copies, keys or runtime folders.`);
console.log(`Nullkode ${pkg.version} on Next.js ${pkg.dependencies?.next}, React ${pkg.dependencies?.react}. Dependency audit (pnpm audit --prod --audit-level=high): passed. ${auditSummary}`);

const generated = JSON.parse(await readFile(join(root, 'src/lib/assets/generated-catalog.json'), 'utf8'));
for (const asset of generated) {
  for (const url of [asset.url, asset.thumb]) assert.ok(await stat(join(root, 'public', url)).catch(() => null), `Missing generated image ${url}`);
}
console.log(`Generated image library verified: ${generated.length} originals plus thumbnails.`);
