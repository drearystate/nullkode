# Application architecture

Nullkode is one Next.js server, a PostgreSQL database, and a bundled Vite Designer interface. The default Compose deployment runs one application process; Designer events and AI scaffold progress use in-process registries, so multi-replica hosting needs a shared job/event store before it can work reliably.

## Five building methods

- **AI Designer:** `apps/designer-renderer` is the workspace UI. Authenticated calls reach `src/app/api/designer/ipc`. The server owns authorization and persists designs, files, snapshots, chat, and generation jobs. API-backed generation plans a small set of files, produces one file per call, and mirrors HTML into normal project pages. Optional Claude CLI generation is in `src/lib/designer/claude-agent.ts`.
- **AI app builder:** `src/lib/ai/multi-pass.ts` creates a plan, pages, and flows in separate calls. Validation runs before `apply-scaffold.ts` creates the project and backend.
- **Templates:** `src/lib/templates` registers original starter designs and the deployment's optional theme packs. Modules add real tables, flows, and pages.
- **Website import:** `src/lib/clone-site.ts` uses Playwright to capture a site and its assets for visual editing.
- **Blank canvas:** `src/components/editor` integrates GrapesJS with persisted pages, feature modules, and visual flow/data editing.

## Projects, data, and publication

Prisma stores platform users, sessions, projects, pages, data-source metadata, flows, billing references, and encrypted settings. Internal application tables live in separate PostgreSQL schemas per project. Flow nodes execute on the server and must use data sources belonging to their project.

Published applications are served from `/app/[slug]` or a verified custom domain routed through `/_host`. Publication currently serves the latest saved pages and flows. Deployment snapshots record releases; they are not immutable production routing targets.

Builder sessions and published-app visitor sessions are separate. Project routes check builder ownership. Designer IPC checks design ownership before accessing file and generation operations. Administrative settings use the real signed-in administrator, including during impersonation.

## Configuration

`.env` bootstraps database, URL, session encryption, and installer ownership. A setup code protects the first administrator claim; the owner session protects later steps. Setup completes only when its owner finishes. Existing pre-wizard deployments remain installed.

Settings persist in PostgreSQL. AI and Stripe secret values are encrypted using AUTH_SECRET. Preserve that secret with database backups. API model selection, endpoint, JSON mode, and response budgets apply at request time. Stripe price IDs, display names, and plan limits belong to the installation operator.

## Builds and distribution

`pnpm designer:build` creates the SPA at `public/designer`. `pnpm build` generates Prisma and builds Next. Docker performs both, installs Chromium for imports, and starts Next after a non-destructive Prisma schema synchronization. First builds need network access to fetch dependencies.

`scripts/package-release.mjs` creates a clean source distribution with every platform subsystem. It excludes runtime data, secrets, generated output, development scratch scripts, and purchased third-party theme packs. Original MIT templates remain included. `START-HERE.md` documents installation, business configuration, backups, and recovery.

## Operational boundaries

The default API Designer does not execute model-written shell commands. Claude CLI is an advanced host integration and requires separate isolation and credentials before offering it to untrusted users. The default Docker package does not silently install or authenticate that CLI. Direct Android compilation similarly needs an optional JDK/Android toolchain; source export remains available.

The package includes the software. It does not include a domain, email delivery account, Stripe account, hosted AI credits, local model weights, or automatically managed custom-domain TLS.
