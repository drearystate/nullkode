import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

// Replaces the electron-vite renderer config from the upstream desktop app
// (apps/desktop/electron.vite.config.ts). We build a plain static SPA into
// Nullkode's public/designer/ so Next.js serves it under /designer/*.
//
// Critical changes vs upstream:
//   - root is this app's dir (was apps/desktop/src/renderer)
//   - outDir writes into nullkode's public/ (Next serves it directly)
//   - base is '/designer/' so asset URLs match the Next.js mount point
//   - no electron-specific plugins/externals
export default defineConfig({
  root: __dirname,
  base: '/designer/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../../public/designer'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
});
