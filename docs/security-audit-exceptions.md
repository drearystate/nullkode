# Dependency audit: accepted exceptions

CI and `scripts/verify-release.mjs` run `pnpm audit --prod --audit-level=high`.
It must pass. Advisories that are fixed upstream are fixed with
`pnpm.overrides` in `package.json`. The advisories below have no fix we can
apply yet, and no attacker-controlled input can reach the vulnerable code in
Nullkode, so they are listed in `pnpm.auditConfig.ignoreGhsas`. JSON has no
comments, so the reasons live here.

Checked on 29 September 2026 against the lockfile (Next.js 15.5.26,
React 19.1.9). Every entry says what would make it matter; when that
happens, remove the ID from `ignoreGhsas` and fix it properly.

| Advisory | Package (version) | Reached through | Why it can't be reached |
|---|---|---|---|
| [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | deepmerge-ts 7.1.5 | `prisma` → `@prisma/config` | Build and start-up tooling only |
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | zod 3.25.76 | API request validation | **Can be reached** — accepted only until the zod 4 move (below) |

## deepmerge-ts (stack exhaustion on recursive objects)

`deepmerge-ts` is used in one place: `@prisma/config`'s config loader
(`loadConfigTsOrJs`) merges a project's `prisma.config.ts` with its defaults.
That loader runs only in the Prisma command-line tool (`prisma generate`,
`prisma db push` at build time and in `scripts/container-start.sh`), and it
reads the operator's own config file (this repository has none). The
database client the app runs with (`@prisma/client` runtime) contains no copy
of it and never loads `@prisma/config`. A visitor can't supply the object
being merged.

Would matter if: the app started loading Prisma's config at runtime, or
merged request data with `deepmerge-ts`. Fixed in deepmerge-ts 8, which
Prisma 6 doesn't accept yet; revisit when Prisma is upgraded.

## Not gated (moderate and low)

The gate stops at `high`, so these don't fail it, but they are tracked:

- `qs` 6.15.1 (three moderate advisories) and `uuid` 9/10 (moderate), through
  `googleapis` and `resend`. The app doesn't parse query strings with this
  copy of `qs`, and doesn't pass its own buffers to `uuid`. They go away when
  those libraries update.

## Checking again

```sh
pnpm audit --prod --audit-level=high          # the gate (exit 0 = pass)
pnpm audit --prod --json                       # everything, with paths
pnpm why -r deepmerge-ts qs uuid
```

When a new high or critical advisory appears, fix it with an update or a
`pnpm.overrides` entry first. Add an ID to `ignoreGhsas` only with a section
here that explains why it can't be reached.

## zod (memory exhaustion on large arrays)

Unlike the other entries, this one can be reached: zod checks API request
bodies, six API routes validate arrays, and a request body can be large. A
request with a very large array that fails validation makes zod collect one
issue per element, which can exhaust the process's memory and restart it
(denial of service, no data exposure). There is no fixed release on the zod 3
line; the fix is zod 4.6.6 or later, a major upgrade of every schema.

Until then: keep `.max(n)` on every array schema that reads request data, and
keep request bodies capped at the proxy. Remove this ID from `ignoreGhsas` as
soon as the project is on zod ≥ 4.6.6.

