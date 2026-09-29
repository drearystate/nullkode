import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(process.argv[2] || '.');
const required = [
  'Dockerfile','docker-compose.yml','install.sh','Start-Nullkode.bat','START-HERE.md','prisma/schema.prisma','pnpm-lock.yaml',
  'src/lib/ai/provider.ts','src/lib/designer/compatible-agent.ts','src/lib/flow/runtime.ts',
  // Original MIT starter designs (the templates the release ships).
  'src/lib/templates/originals/index-a.ts','src/lib/templates/originals/index-b.ts',
  'src/app/(main)/projects/[id]/data','apps/designer-renderer/src','packages/core/src',
  // Mobile apps: the build API (a folder named "build") and both native templates.
  'src/app/api/projects/[id]/native/build/route.ts','src/app/api/projects/[id]/native/build/download/route.ts',
  'native-templates/android-webview/gradlew','native-templates/android-webview/gradle/wrapper/gradle-wrapper.jar',
  'native-templates/capacitor-ios/ios/App/App.xcodeproj/project.pbxproj','native-templates/capacitor-ios/ios/App/CapApp-SPM/Package.swift',
  'native-templates/capacitor-ios/.github/workflows/ios.yml',
  // HTTPS mode (docker-compose mounts it) and custom domains / app origins.
  'Caddyfile','src/app/(public)/nk-host',
  // `pnpm test:e2e` and scripts that import the test harness.
  'scripts/e2e-harness.ts','scripts/check-generated-js.ts','scripts/secure-existing-apps.ts','scripts/smoke-install.cjs',
];
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
for (const m of String(pkg.scripts?.['test:e2e'] ?? '').matchAll(/scripts\/[\w.-]+/g)) required.push(m[0]);
for (const f of required) assert.ok((await stat(join(root,f)).catch(() => null)), `Missing ${f}`);
async function walk(dir='') {
  for(const item of await readdir(join(root,dir),{withFileTypes:true})) {
    const rel=join(dir,item.name);
    assert.ok(item.name !== '.env' && !(item.name.startsWith('.env.') && item.name !== '.env.example'), `Secret environment file: ${rel}`);
    assert.ok(!/^themeforest-|^(crafto|litho)-/.test(item.name), `Purchased asset: ${rel}`);
    assert.ok(!['node_modules','.git','.next','uploads'].includes(item.name), `Runtime files: ${rel}`);
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
console.log('Release contents verified: full platform source, original templates, native build API and templates, no environment secrets, keys or runtime folders.');
