# Nullkode

A self-hosted app builder with five ways to start, a visual editor, real databases, workflows, and publishing. Run your own independent installation, welcome customers, and set your own subscription prices.

**[Start here: easy installation](START-HERE.md)**

## Build your way

1. **AI Designer** — an iterative workspace with files, previews, and saved snapshots.
2. **Build with AI** — describe an app; the builder creates pages, tables, and workflows in smaller steps.
3. **Templates** — begin with an original starter and add working feature modules.
4. **Import a website** — capture a site and continue editing visually.
5. **Blank canvas** — create pages in the drag-and-drop editor.

All paths use the same project tools: pages, features, flows, data, themes, preview, domains, and publishing. AI can connect to OpenAI or a compatible hosted/local endpoint. There is no requirement for an expensive model and no automatic upgrade to one.

## Your installation, your business

- Your own brand, owner account, customers, and database.
- Your own Stripe account, plan names, recurring prices, currencies, and limits.
- Encrypted provider/payment settings and customer billing management.
- Web publishing, PWA/offline support, and native source exports.
- Full source under MIT, with third-party notices retained. No license server or separate paid core.

External services and server resources can cost money. Local model weights and optional native build toolchains are separate dependencies. See [START-HERE.md](START-HERE.md) for supported setup and operational limits.

## For developers

Node 20 and pnpm 10 are pinned by the Docker build. Install PostgreSQL, copy `.env.example` to `.env`, supply random secrets and DATABASE_URL, then:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm db:push
pnpm designer:build
pnpm dev
```

Open `http://localhost:3001/install`. The setup code is INSTALL_TOKEN in your `.env`.

```sh
pnpm typecheck
pnpm build
node scripts/package-release.mjs /tmp/nullkode-release
node scripts/verify-release.mjs /tmp/nullkode-release
```

Read [architecture](ARCHITECTURE.md), [contributing](CONTRIBUTING.md), [third-party licenses](LICENSE-THIRD-PARTY.md), and [installation/recovery](START-HERE.md).

The release package contains 83 original MIT starter variants across 18 categories and all 135 module definition files. The variants share a design system and reusable layouts; they are not 83 separately commissioned designs. Purchased Crafto/Litho theme packs present in a private installation are not part of the public distribution. They are not needed to run any of the five building methods.
