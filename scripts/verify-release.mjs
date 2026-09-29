import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { lintDocs } from './check-docs.mjs';
const root = resolve(process.argv[2] || '.');
const required = [
  'Dockerfile','docker-compose.yml','install.sh','Start-Nullkode.bat','START-HERE.md','prisma/schema.prisma','pnpm-lock.yaml',
  // Front page, security policy and community rules.
  'README.md','SECURITY.md','CODE_OF_CONDUCT.md','docs/security-audit-exceptions.md',
  'src/lib/ai/provider.ts','src/lib/design-studio/engine.ts','src/lib/flow/runtime.ts',
  // Original MIT starter designs (the templates the release ships) and their photos.
  'src/lib/templates/originals/index-a.ts','src/lib/templates/originals/index-b.ts','public/templates/originals',
  'src/app/(main)/projects/[id]/data',
  // Mobile apps: the build API (a folder named "build") and both native templates.
  'src/app/api/projects/[id]/native/build/route.ts','src/app/api/projects/[id]/native/build/download/route.ts',
  'native-templates/android-webview/gradlew','native-templates/android-webview/gradle/wrapper/gradle-wrapper.jar',
  'native-templates/capacitor-ios/ios/App/App.xcodeproj/project.pbxproj','native-templates/capacitor-ios/ios/App/CapApp-SPM/Package.swift',
  'native-templates/capacitor-ios/.github/workflows/ios.yml',
  // HTTPS mode (docker-compose mounts it) and custom domains / app origins.
  'Caddyfile','src/app/(public)/nk-host',
  // Backups: the nightly service, one-off backups, restores, and the
  // bare-metal (systemd) timer. docker-compose.yml builds the backup image.
  'scripts/backup.sh','scripts/backup-loop.sh','scripts/backup.Dockerfile','scripts/restore.sh','docs/deploy/RESTORE.md',
  'docs/deploy/systemd/nullkode.service','docs/deploy/systemd/nullkode-backup.service','docs/deploy/systemd/nullkode-backup.timer','docs/deploy/systemd/nullkode-backup.sh',
  'docs/deploy/logrotate/nullkode',
  // `pnpm test:e2e` and scripts that import the test harness.
  'scripts/e2e-harness.ts','scripts/check-generated-js.ts','scripts/secure-existing-apps.ts','scripts/smoke-install.cjs','scripts/check-docs.mjs',
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
    if(item.isDirectory())await walk(rel);
  }
}
await walk();
const registry=await readFile(join(root,'src/lib/templates/registry.ts'),'utf8');
assert.ok(!/import "\.\/(crafto|litho)-/.test(registry));
assert.match(registry,/originals\/index-a/);
assert.match(registry,/originals\/index-b/);

// Template photos: every picture an original template uses is in the
// release, next to the CREDITS.md that says where it comes from.
let photos = 0;
for (const folder of await readdir(join(root, 'public/templates/originals'), { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  const files = await readdir(join(root, 'public/templates/originals', folder.name));
  photos += files.filter((f) => f.endsWith('.webp')).length;
  assert.ok(files.includes('CREDITS.md'), `public/templates/originals/${folder.name} has no CREDITS.md`);
}
assert.ok(photos > 0, 'No template photos (.webp) under public/templates/originals');
let photoRefs = 0;
for (const file of (await readdir(join(root, 'src/lib/templates/originals'))).filter((f) => f.endsWith('.ts'))) {
  const code = await readFile(join(root, 'src/lib/templates/originals', file), 'utf8');
  const base = /const IMG = "([^"]+)"/.exec(code)?.[1];
  const refs = [
    ...(base ? [...code.matchAll(/\$\{IMG\}\/([\w./-]+\.(?:webp|jpe?g|png|avif|gif|svg))/g)].map((m) => `${base}/${m[1]}`) : []),
    ...[...code.matchAll(/["'(](\/templates\/[\w./-]+\.(?:webp|jpe?g|png|avif|gif|svg))/g)].map((m) => m[1]),
  ];
  for (const ref of new Set(refs)) {
    photoRefs++;
    assert.ok(await stat(join(root, 'public', ref)).catch(() => null), `src/lib/templates/originals/${file} shows ${ref}, which is not in the release`);
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
const audit = spawnSync('pnpm', ['audit', '--prod', '--audit-level=high'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
if (audit.error) throw new Error(`Could not run the dependency audit (pnpm audit): ${audit.error.message}. Install pnpm 10 (corepack enable) and try again.`);
const auditSummary = `${audit.stdout}\n${audit.stderr}`.trim().split('\n').filter((l) => /vulnerabilit|Severity|No known/i.test(l)).join(' ').trim();
assert.equal(audit.status, 0, `The dependency audit found high or critical advisories (pnpm audit --prod --audit-level=high):\n${audit.stdout}\n${audit.stderr}`);

console.log(`Release contents verified: full platform source, original templates with ${photos} photos (${photoRefs} references checked), backups, native build API and templates, current documentation, no environment secrets, database copies, keys or runtime folders.`);
console.log(`Nullkode ${pkg.version} on Next.js ${pkg.dependencies?.next}, React ${pkg.dependencies?.react}. Dependency audit (pnpm audit --prod --audit-level=high): passed. ${auditSummary}`);
