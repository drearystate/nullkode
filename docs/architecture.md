# Application architecture

Nullkode is one Next.js server and a PostgreSQL database. The default Compose deployment runs one application process; Designer build progress and AI scaffold progress use in-process registries, so multi-replica hosting needs a shared job/event store before it can work reliably.

## Six ways to start an app

- **Describe it (AI app builder):** `src/lib/ai/multi-pass.ts` creates a plan, pages, and flows in separate calls. The owner reviews the plan first. Validation runs before `apply-scaffold.ts` creates the project and backend.
- **AI Designer:** `/designer` (`src/components/designer`, API under `src/app/api/designs`). `src/lib/design-studio` stores designs, files, versions and chat, and `engine.ts` builds with any OpenAI-compatible model (or the configured AI provider): a plan, then one file per call, with small changes made as find/replace edits (`patches.ts`) and checked before anything is saved. Pages are mirrored into a normal project (`src/lib/design-studio/pages-mirror.ts`, `post-run-scaffold.ts`), and the preview is served sandboxed.
- **Templates:** `src/lib/templates` registers original starter designs and the deployment's optional theme packs. Their pictures are original generated images in `public/media/generated/`, listed in `src/lib/assets/generated-catalog.json`. Modules add real tables, flows, and pages.
- **Copy a website:** `src/lib/clone-site.ts` uses Playwright to capture a site and its assets (`public/assets/cloned`) for visual editing.
- **Blank app:** `src/components/editor` integrates GrapesJS with persisted pages, feature modules, and visual flow/data editing.
- **Import an app:** `src/lib/app-import.ts` recreates an app (pages, flows, tables, rows, theme, uploaded files) from the backup `.zip` that the Publish page's "Download code" makes, on this server or another.

Every path that creates pages keeps the app's menus in step through `syncProjectNav` (`src/lib/nav-sync.ts`).

## Projects, data, and publication

Prisma stores platform users, sessions, projects, pages, data-source metadata, flows, deployments, billing references, and encrypted settings. Internal application tables live in separate PostgreSQL schemas per project (`proj_<id>`). Flow nodes execute on the server and must use data sources belonging to their project.

Publishing freezes the app's pages, flows, and theme into an immutable `Deployment` snapshot (`src/lib/deployments.ts`). Visitors see the live deployment while the owner keeps editing a draft; the signed-in owner sees the draft at `/preview/<project id>`, and any earlier deployment can be made live again (rollback). Apps published before deployments existed keep serving their saved pages until they next publish.

Published apps are served from `/app/[slug]` on the studio's address, from `<label>.<APPS_DOMAIN>` when `APPS_DOMAIN` is set (each app its own web origin), or from a verified custom domain. `src/middleware.ts` rewrites requests on those app addresses to `/nk-host/<host>/<path>` (including the app's manifest, service worker, `robots.txt` and `sitemap.xml`), passing the original host in a header signed with `AUTH_SECRET`; the `nk-host` routes refuse unsigned requests. (App Router ignores folders whose name starts with `_`, so the route can't be called `_host`.) Reseller dashboard domains are served by the normal app under the reseller's brand.

Builder sessions and published-app visitor sessions are separate. Project routes check builder ownership. Designer routes check design ownership before every file, version and build operation. Administrative settings use the real signed-in administrator, including during impersonation. The app has no Server Actions, so requests carrying a `Next-Action` header are refused with 404 in the middleware (and in the Caddyfile).

## Configuration

`.env` bootstraps database, URL, session encryption, and installer ownership. A setup code protects the first administrator claim; the owner session protects later steps. Setup completes only when its owner finishes. Existing pre-wizard deployments remain installed.

Settings persist in PostgreSQL. AI, email, and Stripe secret values are encrypted using AUTH_SECRET. Preserve that secret with database backups. API model selection, endpoint, JSON mode, and response budgets apply at request time. Stripe price IDs, display names, and plan limits belong to the installation operator.

## Builds and distribution

`pnpm build` generates Prisma and builds Next. Docker does this, installs Chromium for website import, and on start checks the database against the schema, applying additive changes only (`scripts/check-schema.mjs`), before starting Next. First builds need network access to fetch dependencies.

`scripts/package-release.mjs` creates a clean source distribution with every platform subsystem. It excludes runtime data, backups, secrets, generated output, local maintenance scripts, and purchased third-party theme packs. Original MIT templates and their photos remain included. `scripts/verify-release.mjs` checks the result, lints the documentation, and runs the dependency audit (`pnpm audit --prod --audit-level=high`; accepted exceptions in `docs/security-audit-exceptions.md`). `START-HERE.md` documents installation, business configuration, backups, and recovery.

## Operations

- **HTTPS.** In Docker's HTTPS mode, Caddy gets certificates on demand (`on_demand_tls`) for the studio's address, verified custom and reseller domains, and published apps' addresses, after asking the app (`/api/internal/tls-allow`). Behind your own proxy, the proxy handles certificates.
- **Backups.** The Compose `backup` service (`scripts/backup-loop.sh`, image `scripts/backup.Dockerfile`) takes a live `pg_dump` at a consistent snapshot every night, archives the upload volumes read-only, keeps 7 daily and 4 weekly backups, and records the result in the `Setting` row `backup.last`. `scripts/restore.sh` restores into an empty installation and can test a backup in a throwaway Compose project. Servers without Docker use `docs/deploy/systemd/nullkode-backup.*`.
- **Logs.** Compose services keep at most 5 x 10 MB of logs each. The systemd unit logs to the journal.

## Operational boundaries

The AI Designer never runs model-written code on the server; the pages it writes run only in a sandboxed preview and in the published app. Direct Android compilation similarly needs an optional JDK/Android toolchain; source export remains available.

The package includes the software. It does not include a domain, email delivery account, Stripe account, hosted AI credits, or local model weights. Certificates for your addresses are obtained automatically in HTTPS mode, but DNS records and open ports 80 and 443 are yours to provide.
