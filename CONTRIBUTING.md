# Contributing to Nullkode

Thanks for considering a contribution. Nullkode is built by people who
ship — keep PRs small, focused, and honest about scope.

## Quick orientation

- **Main app**: Next.js 15 (App Router), Tailwind v3, Prisma 6, TS 5.7
  strict.
- **Designer subsystem**: vendored from [Open CoDesign](https://github.com/OpenCoworkAI/open-codesign)
  (MIT). Lives at `apps/designer-renderer/` (Vite SPA) and uses Tailwind
  v4 internally. Don't mix its CSS into the main app.
- **Vendored packages**: `packages/` — keep them as close to upstream as
  feasible so we can pull future Open CoDesign updates without conflict.
- **Database**: schema in `prisma/schema.prisma`. Migrations via
  `pnpm db:push` for local dev; consider `prisma migrate` for production
  work.

## Setting up

```bash
git clone https://github.com/drearystate/nullkode.git
cd nullkode
pnpm install
cp .env.example .env  # fill at least DATABASE_URL + AUTH_SECRET
pnpm db:push
pnpm -C apps/designer-renderer build
pnpm dev              # starts Next on http://localhost:3001
```

## Branches + PRs

- Branch from `main`. Name branches `<scope>/<short-description>`,
  e.g. `designer/clarify-skip-button` or `fix/argon2-rebuild`.
- One concern per PR. If you find yourself making unrelated changes,
  split them.
- Describe what changed AND why in the PR body. Screenshots for
  user-facing changes.
- Run `pnpm exec tsc --noEmit` before pushing.
- For the Designer subsystem, also run
  `pnpm -C apps/designer-renderer build` and verify it compiles.

## Code style

- **No new comments that explain WHAT code does.** Names should do that.
  Only comment WHY when it's non-obvious — a workaround, a constraint
  the reader couldn't infer, a subtle invariant.
- **Don't introduce abstractions for hypothetical future cases.** Three
  similar lines is fine. Add a helper only when there are two real
  callers.
- **Don't add error handling for impossible states.** Trust internal
  guarantees. Validate at system boundaries (user input, external APIs).
- **Match existing patterns.** If you're not sure how something should
  look, find the closest existing example and follow its shape.

## Tests

- Unit tests for non-trivial logic (Vitest).
- Smoke scripts under `scripts/` for end-to-end verification.
- The Designer subsystem inherits upstream's Vitest suite — try not to
  break it.

## Filing issues

- One issue per bug. Include reproduction steps, expected vs actual,
  versions (Node, Postgres, Claude CLI if relevant).
- For feature requests, describe the user need first, the proposed
  solution second.

## License

By contributing you agree your contributions are licensed under MIT
(the project license).

## New features and templates

The quickest way to contribute: `pnpm new:module "Name"` or `pnpm new:template "Name" --category x`, then `pnpm check:extensions`. Guide: [docs/extending.md](docs/extending.md).
