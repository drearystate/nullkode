/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Isolate preview builds from the running production bundle.
  distDir: process.env.NK_BUILD_DIR || ".next",
  poweredByHeader: false,
  serverExternalPackages: ["argon2", "undici"],
  transpilePackages: [
    "@open-codesign/shared",
    "@open-codesign/artifacts",
    "@open-codesign/providers",
    "@open-codesign/templates",
    "@open-codesign/core",
    "@open-codesign/exporters",
    "@open-codesign/i18n",
    "@open-codesign/runtime",
    "@open-codesign/ui",
  ],
  experimental: {
    cpus: 2,
  },
  // Only the landing page's own pictures go through the image optimizer.
  // Uploads and every other path are refused, so files people upload never
  // reach the optimizer's image decoders.
  images: {
    localPatterns: [{ pathname: "/studio-preview/**" }, { pathname: "/nullkode-banner.png" }],
  },
  // The vendored @open-codesign/* packages write their TS source with `.js`
  // import suffixes (so tsc/Vite can resolve them post-compile). Next's
  // webpack needs this alias to find the .ts files at build time.
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    // Node 20+ supports the `node:` import protocol natively. The vendored
    // @open-codesign/* packages use it (e.g. `import 'node:fs/promises'`),
    // but Webpack on the server side has been bundling those into the
    // route output incorrectly, producing MODULE_NOT_FOUND at request
    // time. Mark every `node:*` specifier as an external so the runtime
    // require() resolves them natively.
    if (isServer) {
      const existing = config.externals;
      const externals = Array.isArray(existing) ? existing : existing ? [existing] : [];
      externals.push(({ request }, callback) => {
        if (typeof request === "string" && request.startsWith("node:")) {
          return callback(null, "commonjs " + request);
        }
        callback();
      });
      config.externals = externals;
      // The page-data collector still tries to statically import `node:*`
      // during "Collecting page data" and prints scary MODULE_NOT_FOUND
      // warnings. They're benign — the actual runtime uses our externals
      // resolver above — but they obscure real build problems. Silence them.
      config.ignoreWarnings = [
        ...(config.ignoreWarnings ?? []),
        /Cannot find module 'node:/,
      ];
    }
    return config;
  },
};

export default nextConfig;
