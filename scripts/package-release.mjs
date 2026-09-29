import { cp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = process.cwd();
const output = resolve(process.argv[2] || '/tmp/nullkode-release');
if (output === root || root.startsWith(output + '/') || output.startsWith(root + '/')) throw new Error('Choose an output directory outside the source checkout.');
try { await stat(output); throw new Error('Output already exists. Choose a new directory; packaging never overwrites an existing copy.'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await mkdir(output, { recursive: true });
// Build output only: a bare "build" would also drop the APK build API
// (src/app/api/projects/[id]/native/build). Keystores are never shipped.
const excluded = /(?:^|\/)(?:node_modules|\.git|\.next[^/]*|\.claude|\.vscode|dist|\.gradle|uploads|backups)(?:\/|$)|^native-templates\/.+\/build(?:\/|$)|^native-templates\/.+\/local\.properties$|\.(?:jks|keystore)$|(?:^|\/)\.env(?:\..*)?$|\.tsbuildinfo$|\.log$|(?:^|\/)\.DS_Store$/;
const top = ['src','apps','packages','prisma','native-templates','docs','scripts','public','.github','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','next.config.mjs','postcss.config.mjs','tailwind.config.ts','tsconfig.json','tsconfig.check.json','tsconfig.base.json','Dockerfile','docker-compose.yml','Caddyfile','.dockerignore','.gitignore','.env.example','install.sh','Start-Nullkode.command','Start-Nullkode.bat','START-HERE.md','README.md','INSTALL.md','CONTRIBUTING.md','LICENSE','LICENSE-THIRD-PARTY.md','NOTICE.md','ARCHITECTURE.md'];
for (const name of top) {
  await cp(join(root,name), join(output,name), { recursive: true, filter: source => {
    const rel = source.slice(root.length + 1).replaceAll('\\','/');
    if (rel === '.env.example') return true;
    if (excluded.test(rel)) return false;
    if (/^public\/(?:assets|designer|screenshots|dl-[^/]+)(?:\/|$)/.test(rel) || /^public\/[^/]+\.jpe?g$/.test(rel)) return false;
    if (/^public\/templates\//.test(rel) && !rel.startsWith("public/templates/original-")) return false;
    if (/^src\/lib\/templates\/(?:crafto|litho)-/.test(rel)) return false;
    // Scripts the release uses: install/runtime helpers, packaging, and the
    // test suite (`pnpm test:e2e`: check-generated-js.ts, e2e-*.ts and their harness).
    if (/^scripts\//.test(rel) && !['container-start.sh','Install-Nullkode.ps1','backup.sh','package-release.mjs','verify-release.mjs','render-original-templates.ts','scheduler.mjs','smoke-install.cjs','secure-existing-apps.ts','check-generated-js.ts','new-module.ts','new-template.ts','check-extensions.ts'].includes(rel.slice(8)) && !/^scripts\/e2e-[\w-]+\.ts$/.test(rel)) return false;
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
await writeFile(join(output,'RELEASE-CONTENTS.md'), 'All application, Designer, flow, data, billing, native export, and installer source is included. Runtime customer data, secrets, generated bundles, local maintenance scripts, and purchased third-party Crafto/Litho theme packs are excluded. Original MIT starter designs are included. Dependencies are downloaded at build time.\n');
console.log(`Release source prepared at ${output}`);
