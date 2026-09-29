import { cp, mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = process.cwd();
const output = resolve(process.argv[2] || '/tmp/nullkode-release');
if (output === root || root.startsWith(output + '/') || output.startsWith(root + '/')) throw new Error('Choose an output directory outside the source checkout.');
try { await stat(output); throw new Error('Output already exists. Choose a new directory; packaging never overwrites an existing copy.'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await mkdir(output, { recursive: true });
// Build output only: a bare "build" would also drop the APK build API
// (src/app/api/projects/[id]/native/build). Keystores are never shipped.
const excluded = /(?:^|\/)(?:node_modules|\.git|\.next[^/]*|\.claude|\.vscode|dist|\.gradle|uploads|backups)(?:\/|$)|^native-templates\/.+\/build(?:\/|$)|^native-templates\/.+\/local\.properties$|\.(?:jks|keystore)$|(?:^|\/)\.env(?:\..*)?$|\.tsbuildinfo$|\.log$|(?:^|\/)\.DS_Store$/;
const top = ['src','prisma','native-templates','docs','scripts','public','.github','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','next.config.mjs','postcss.config.mjs','tailwind.config.ts','tsconfig.json','tsconfig.check.json','tsconfig.base.json','Dockerfile','docker-compose.yml','Caddyfile','.dockerignore','.gitignore','.gitattributes','.env.example','install.sh','Start-Nullkode.command','Start-Nullkode.bat','START-HERE.md','README.md','INSTALL.md','CONTRIBUTING.md','SECURITY.md','CODE_OF_CONDUCT.md','LICENSE','LICENSE-THIRD-PARTY.md','ARCHITECTURE.md'];

// Scripts the release uses: install, runtime and backup helpers, packaging,
// upgrade steps for existing installs, every script a package.json command
// runs, the test suite (e2e-*.ts), and whatever those scripts import from
// scripts/. Local maintenance scripts stay out.
const shippedScripts = new Set([
  'container-start.sh','Install-Nullkode.ps1','scheduler.mjs','check-schema.mjs',
  'backup.sh','backup-loop.sh','backup.Dockerfile','restore.sh',
  'package-release.mjs','verify-release.mjs','check-docs.mjs','render-original-templates.ts','smoke-install.cjs',
  // One-time upgrade steps for installs made with an earlier version.
  'secure-existing-apps.ts','escape-module-scripts.ts','upgrade-account-deletion.ts','erase-orphans.ts',
]);
const scriptFiles = new Set(await readdir(join(root, 'scripts')));
for (const name of scriptFiles) if (/^e2e-[\w-]+\.ts$/.test(name)) shippedScripts.add(name);
const sourcePkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
for (const command of Object.values(sourcePkg.scripts ?? {})) {
  for (const m of String(command).matchAll(/scripts\/([\w.-]+)/g)) shippedScripts.add(m[1]);
}
for (const pending = [...shippedScripts]; pending.length; ) {
  const name = pending.pop();
  if (!scriptFiles.has(name) || !/\.(?:[cm]?[jt]s)$/.test(name)) continue;
  const code = await readFile(join(root, 'scripts', name), 'utf8');
  const wanted = [
    ...[...code.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]\.\/([\w.-]+?)(?:\.[cm]?[jt]s)?['"]/g)].map((m) => m[1]),
    // Scripts it runs by path, e.g. spawnSync(..., ["scripts/check-x.ts"]).
    ...[...code.matchAll(/["'`]scripts\/([\w.-]+\.(?:[cm]?[jt]s|sh))["'`]/g)].map((m) => m[1]),
  ];
  for (const want of wanted) {
    const found = [...scriptFiles].find((f) => f === want || f.replace(/\.[cm]?[jt]s$/, '') === want);
    if (found && !shippedScripts.has(found)) { shippedScripts.add(found); pending.push(found); }
  }
}

for (const name of top) {
  if (!(await stat(join(root, name)).catch(() => null))) throw new Error(`Missing ${name} in the source checkout.`);
  await cp(join(root,name), join(output,name), { recursive: true, filter: source => {
    const rel = source.slice(root.length + 1).replaceAll('\\','/');
    if (rel === '.env.example') return true;
    if (excluded.test(rel)) return false;
    if (/^public\/(?:assets|designer|screenshots|dl-[^/]+)(?:\/|$)/.test(rel) || /^public\/[^/]+\.jpe?g$/.test(rel)) return false;
    // Template photos: every original template's pictures and their
    // CREDITS.md (public/templates/originals/<template>/), plus the gallery
    // previews (public/templates/original-*.jpg). Purchased theme packs'
    // previews stay out.
    if (/^public\/templates\//.test(rel) && !/^public\/templates\/(?:originals(?:\/|$)|original-[\w-]+\.jpg$)/.test(rel)) return false;
    if (/^src\/lib\/templates\/(?:crafto|litho)-/.test(rel)) return false;
    if (/^scripts\/./.test(rel) && !shippedScripts.has(rel.slice(8))) return false;
    return true;
  } });
}
const registry = join(output,'src/lib/templates/registry.ts');
await writeFile(registry, (await readFile(registry,'utf8')).replace(/^import "\.\/(?:crafto|litho)-[^\n]+\n/gm,''));
const configPath = join(output,'tsconfig.json');
const config = JSON.parse(await readFile(configPath,'utf8'));
config.include = config.include.filter(p => !p.startsWith('.next-'));
await writeFile(configPath, JSON.stringify(config,null,2)+'\n');
const pkg = JSON.parse(await readFile(join(output,'package.json'),'utf8'));
for (const k of ['homepage','repository','bugs']) if (JSON.stringify(pkg[k]).includes('YOUR_ORG')) delete pkg[k];
await writeFile(join(output,'package.json'), JSON.stringify(pkg,null,2)+'\n');
// The package is the complete platform, with original MIT starter designs.
const deps = pkg.dependencies ?? {};
await writeFile(join(output,'RELEASE-CONTENTS.md'), [
  'All application, Designer, flow, data, billing, native export, backup, and installer source is included. Runtime customer data, backups, secrets, generated bundles, local maintenance scripts, and purchased third-party Crafto/Litho theme packs are excluded. Original MIT starter designs and their photos are included. Dependencies are downloaded at build time.',
  '',
  `Version ${pkg.version}. Built on Next.js ${deps.next}, React ${deps.react}. Dependency audit: \`pnpm audit --prod --audit-level=high\` (see docs/security-audit-exceptions.md).`,
  '',
].join('\n'));
console.log(`Release source prepared at ${output}`);
