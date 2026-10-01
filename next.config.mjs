import { dirname } from "node:path";
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
  serverExternalPackages: ["argon2", "undici"],
  experimental: {
    cpus: 2,
  },
  // Only the landing page's own pictures go through the image optimizer.
  // Uploads and every other path are refused, so files people upload never
  // reach the optimizer's image decoders.
  images: {
    localPatterns: [{ pathname: "/studio-preview/**" }, { pathname: "/nullkode-banner.png" }],
  },
};

export default nextConfig;
