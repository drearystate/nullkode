import { dirname } from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import { fileURLToPath } from "node:url";

// The folder this file is in. Next otherwise guesses the workspace root from
// lockfiles in parent folders (and warns about it), which can pull files from
// outside the project into the build's file tracing.
const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Isolate preview builds from the running production bundle.
  distDir: process.env.NK_BUILD_DIR || ".next",
  // Each production build gets its own id (nk-plan/rebuild-live.sh sets it).
  // A browser tab still running an older build then reloads the page on its
  // next navigation instead of mixing old and new code (which crashes).
  deploymentId: process.env.NK_DEPLOYMENT_ID || undefined,
  outputFileTracingRoot: projectRoot,
  poweredByHeader: false,
  // better-sqlite3: the game asset search (nk-games/tools/asset-search.mjs, loaded at run time).
  serverExternalPackages: ["argon2", "undici", "better-sqlite3"],
  experimental: {
    cpus: 2,
    // Request bodies pass through the middleware, which keeps only the first
    // 10 MB by default (the rest is silently cut off). Reference images
    // (src/lib/ai/references.ts) may be up to 6 × 5 MB as base64 in one
    // partner API request, so allow that much.
    middlewareClientMaxBodySize: "45mb",
  },
  // Only the landing page's own pictures go through the image optimizer.
  // Uploads and every other path are refused, so files people upload never
  // reach the optimizer's image decoders.
  images: {
    localPatterns: [{ pathname: "/studio-preview/**" }, { pathname: "/nullkode-banner.png" }],
  },
};

// The studio's languages (src/i18n/request.ts picks one per request).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
