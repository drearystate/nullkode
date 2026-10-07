# Partner API

The partner API lets another service (your booking system, CRM, agency
portal, or anything else) work with the platform on behalf of its people:

- create accounts (or find existing ones),
- sign a person straight into their workspace with a one-time link,
- plan and build apps for them, and follow the build,
- list their apps with live, preview and editor links, and publish them,
- make games for them with the Game Studio: build, follow, steer, stop,
  change, restore, publish and download them,
- read this month's AI usage.

Everything a key does counts exactly as if the person had done it in the
studio: the same plan limits, the same monthly AI allowance (and a reseller's
monthly cap), the same refunds when a build fails.

The machine-readable description is [`partner-api.openapi.json`](partner-api.openapi.json)
(OpenAPI 3.1), also served by every install at `GET /api/partner/v1/openapi.json`.

## Contents

- [Keys](#keys)
- [Where to call it: network rules](#where-to-call-it-network-rules)
- [Requests and responses](#requests-and-responses)
- [Errors](#errors)
- [Rate limits](#rate-limits)
- [Idempotency](#idempotency)
- [Pagination](#pagination)
- [Endpoints](#endpoints)
- [Games](#games)
- [Reference images](#reference-images)
- [The build rule](#the-build-rule)
- [Webhooks](#webhooks)
- [A typical integration](#a-typical-integration)
- [Security notes for operators](#security-notes-for-operators)

## Keys

Keys are made in the studio:

- **Admin → Partner API** (the operator): a key for one reseller's clients,
  or for the platform's own customers.
- **Reseller → Partner API** (a reseller): a key for that reseller's own
  clients.

A key looks like `nk_live_` followed by 43 letters and digits. It is shown
**once**, when it is made or rotated; only a SHA-256 hash is stored, so a lost
key can't be recovered, only rotated. The lists show the first characters
(`nk_live_Ab12Cd34…`), the scope, permissions, network rule, and when the key
was made and last used.

Send it on every request:

```
Authorization: Bearer nk_live_...
```

### Scope

Each key reaches exactly one group of people, chosen when it is made:

| Scope | Reaches | Never reaches |
| --- | --- | --- |
| A reseller | That reseller's clients | Other resellers' clients, the reseller's own login, direct customers, operators |
| The platform | The platform's own customers (ordinary accounts that belong to no reseller) | Any reseller's clients, resellers' logins, operators |

Anything outside the scope (a user, app or run) answers `404 not_found`, the
same as an id that doesn't exist.

### Permissions

All on by default; switch off what a key doesn't need.

| Permission | Endpoints |
| --- | --- |
| `users` | `POST /users`, `GET /users`, `GET /users/{id}`, `GET /users/{id}/projects` |
| `sso` | `POST /sso` |
| `build` | `POST /plan`, `POST /builds`, `GET /runs/{id}`, and every `/games` endpoint except publishing |
| `publish` | `POST /projects/{id}/publish`, `POST /games/{id}/publish` |
| `usage` | `GET /usage` |

### Rotate and revoke

**Rotate** gives the key a new secret; the old one stops working at once.
**Revoke** turns the key off for good (it stays listed as revoked), and any
sign-in links it made that weren't used yet stop working too. A reseller that
is suspended or deleted takes its keys with it.

## Where to call it: network rules

Each key has a network rule:

- **This server only** (the default). For software running on the same
  machine as the platform. Call the app directly, for example
  `http://127.0.0.1:3001/api/partner/v1` (the address is shown on the Partner
  API page). Any request that came in through the reverse proxy (it carries
  `X-Real-IP`, or an `X-Forwarded-For` naming anything but this machine) is
  refused with `403 network_not_allowed`, even with the right key.
- **Only from these IP addresses or ranges**. For software on other
  machines: list their addresses (`203.0.113.10`, `198.51.100.0/24`,
  `2001:db8::/32`) and call the public address
  (`https://<your studio address>/api/partner/v1`). The client address is the
  one the reverse proxy puts in `X-Real-IP`; `X-Forwarded-For` is never
  trusted. A call made on the server itself counts as `127.0.0.1`, so list
  that too if the same key is also used locally.

Allowlisted keys travel over the internet: always use HTTPS for them.

## Requests and responses

- Base path: `/api/partner/v1`.
- Request bodies are JSON (`Content-Type: application/json`).
- Responses are JSON, never cached (`Cache-Control: no-store`), and carry
  `X-Request-Id` (quote it when reporting a problem).
- Times are ISO 8601 in UTC.
- Error messages are in English, or in the language of `Accept-Language`
  when the platform speaks it. Progress messages of a build are in the
  person's own language (their profile, else their reseller's or the
  platform's default), as they would see them in the studio.

## Errors

Every error has the same shape:

```json
{ "error": { "code": "not_found", "message": "Not found." } }
```

Codes are stable; messages are for people and may change.

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `invalid_request` | A field is missing or wrong (the message says which). |
| 400 | `invalid_json` | The body isn't a JSON object. |
| 400 | `invalid_idempotency_key` | `Idempotency-Key` isn't 1–200 visible characters. |
| 400 | `images_not_supported` | Reference images were sent, but the platform's AI can't read images. They are never ignored silently: send the request without `images` (and describe the look in words). |
| 400 | `image_type` | An image isn't a PNG, JPEG, WebP or GIF (the file's real bytes are checked, not its name or `mediaType`), or it can't be opened. |
| 400 | `too_many_images` | More than 6 images. |
| 400 | `image_fetch_failed` | An image `url` isn't a public `https://` link to the image, or it couldn't be downloaded. |
| 400 | `references_not_found` | The `referenceId` is unknown, belongs to someone else, or its images were deleted (after 7 days without use). |
| 401 | `unauthorized` | No key, an unknown key, or a revoked key. |
| 403 | `network_not_allowed` | The key can't be used from where the request came from. |
| 403 | `permission_denied` | The key doesn't have the permission for this endpoint. |
| 403 | `suspended` | The key's reseller is suspended. |
| 403 | `user_suspended` | The person's account is suspended. |
| 403 | `seats_full` | The reseller has no client seats left. |
| 403 | `plan_limit` | The person's plan doesn't allow it (more apps, more live apps). |
| 404 | `not_found` | No such id, or it is outside the key's scope. |
| 413 | `image_too_large` | An image is over 5 MB. |
| 409 | `email_taken` | The address has an account this key doesn't manage. |
| 409 | `idempotency_in_progress` | The first request with this Idempotency-Key is still running. |
| 409 | `already_building` | Games: a build or change is already running (send a note instead, or stop it). |
| 409 | `still_building` | Games: can't restore or publish while the AI works on the game. |
| 409 | `not_running` | Games: nothing is running to take a note or to stop (send a change instead). |
| 409 | `not_built` | Games: build the game first (publish, download). |
| 409 | `too_many_notes` | Games: this build has taken 25 notes, the most one build takes. |
| 422 | `idempotency_key_reused` | The Idempotency-Key was used for a different request. |
| 422 | `build_not_allowed` | The platform doesn't build this kind of app (see [The build rule](#the-build-rule)). The message is the sentence to show the person, in their language. |
| 429 | `rate_limited` | Too many requests; see `Retry-After`. |
| 429 | `ai_quota_exceeded` | The person's monthly AI allowance (or the reseller's cap) is used up. |
| 500 | `internal` | Something went wrong on the platform's side. Retry later. |
| 503 | `games_unavailable` | The game engines and asset library aren't installed on this server. |

Game errors that come from the Game Studio (`already_building`, `not_built`,
`ai_quota_exceeded` and the like) carry the studio's own message, in the
person's language.

## Rate limits

Every response carries the key's current window:

```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 597
X-RateLimit-Reset: 1790000000      (Unix seconds)
```

| Limit | Per key |
| --- | --- |
| All requests | 600 a minute |
| `POST /users` | 120 a minute |
| `POST /sso` | 120 a minute |
| `POST /projects/{id}/publish` | 120 a minute |
| `POST /plan` | 300 an hour (and 30 an hour per person, as in the studio) |
| `POST /builds` | 300 an hour |
| `POST /games` and `POST /games/{id}/changes` | 300 an hour, together |
| `POST /games/{id}/publish` | 120 a minute (shared with `POST /projects/{id}/publish`) |
| `POST /games/{id}/notes` | 120 a minute (and 10 a minute per person, as in the studio) |
| `POST /games/clarify` | 300 an hour (and 20 an hour per person) |
| `GET /games/{id}/export` | 60 an hour (and 20 an hour per person) |
| `GET /games/assets/search` | 600 an hour |

Over a limit you get `429 rate_limited` with `Retry-After` (seconds). Builds
are also bounded by each person's monthly AI allowance (`429
ai_quota_exceeded`, which `Retry-After` doesn't apply to: it resets at the
start of the next month, UTC).

## Idempotency

`POST /users`, `POST /plan`, `POST /builds`, `POST /projects/{id}/publish`,
`POST /games`, `POST /games/{id}/changes`, `POST /games/{id}/notes`,
`POST /games/{id}/versions/{seq}/restore` and `POST /games/{id}/publish` accept an
`Idempotency-Key` header (any unique value up to 200 characters, such as a
UUID). Retrying with the same key and the same body within 24 hours returns
the first answer again, with `Idempotent-Replayed: true`, instead of doing the
work twice; so a network error on `POST /builds` never charges a second build.

- Same Idempotency-Key, different body: `422 idempotency_key_reused`.
- The first request still running: `409 idempotency_in_progress`.
- Answers worth retrying (`429`, `5xx`) aren't saved, so a retry runs again.
- Keys are per partner key.
- The whole body counts, reference `images` included: the same Idempotency-Key
  with other images is a different request (`422 idempotency_key_reused`).

## Pagination

List endpoints take `limit` (1–100, default 50) and `cursor`, and answer:

```json
{ "data": [ ... ], "nextCursor": "clx..." }
```

Pass `nextCursor` as `cursor` for the next page; it is `null` on the last page.
Lists are newest first.

## Endpoints

Examples use `$KEY` for the key and `$API` for the base URL
(`http://127.0.0.1:3001/api/partner/v1`).

### POST /users

Creates a person in the key's scope, or returns them when they already are.

```bash
curl -s -X POST "$API/users" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -H "Idempotency-Key: 6f1c..." \
  -d '{"email":"ana@example.com","name":"Ana Lima","plan":"STARTER"}'
```

| Field | | |
| --- | --- | --- |
| `email` | required | The person's address (case doesn't matter). |
| `name` | optional | Up to 100 characters. |
| `plan` | optional | `FREE` (default), `STARTER`, `PRO` or `TEAM`. Only used when the account is created. |

`201 Created` for a new account, `200 OK` when it already was in the key's
scope (returned unchanged):

```json
{
  "user": {
    "id": "clx1abc...", "email": "ana@example.com", "name": "Ana Lima", "plan": "STARTER",
    "suspended": false, "createdAt": "2026-10-03T09:12:00.000Z", "lastActiveAt": null
  },
  "created": true
}
```

**An account is never taken over**: an address that belongs to anyone outside
the key's scope (another reseller's client, a direct customer for a reseller
key, a reseller's client for a platform key, a reseller's login, an operator)
answers `409 email_taken`. A reseller key also respects the reseller's client
seats (`403 seats_full`).

The person has no password; they sign in through `POST /sso` links (or can
ask for a password reset on the sign-in page).

### GET /users

The people in the key's scope. `?email=` finds one address. Paginated.

```json
{ "data": [ { "id": "clx1abc...", "email": "ana@example.com", "...": "..." } ], "nextCursor": null }
```

### GET /users/{id}

```json
{ "user": { "id": "clx1abc...", "email": "ana@example.com", "...": "..." } }
```

### GET /users/{id}/projects

The person's apps (and Designer designs), newest first. Paginated.

```json
{
  "data": [
    {
      "id": "clx9xyz...", "name": "Rise Bakery", "kind": "app",
      "published": true, "publishedAt": "2026-10-03T09:40:00.000Z",
      "createdAt": "2026-10-03T09:30:00.000Z", "updatedAt": "2026-10-03T09:40:00.000Z",
      "links": {
        "live": "https://rise-bakery.apps.example.com",
        "preview": "https://studio.example.com/preview/clx9xyz...",
        "editor": "https://studio.example.com/projects/clx9xyz.../pages"
      },
      "paths": { "preview": "/preview/clx9xyz...", "editor": "/projects/clx9xyz.../pages", "overview": "/projects/clx9xyz..." }
    }
  ],
  "nextCursor": null
}
```

`links.live` is public (null until published). `preview` and `editor` need the
person signed in: to open them for the person, make a sign-in link with the
matching `paths` value as `to`.

### POST /sso

A one-time link that signs the person into their workspace.

```bash
curl -s -X POST "$API/sso" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"userId":"clx1abc...","to":"/projects/clx9xyz.../pages"}'
```

| Field | | |
| --- | --- | --- |
| `userId` | required | A person in the key's scope. |
| `to` | optional | Where to land: a path on the studio's own site, starting with a single `/` (default `/dashboard`). Anything else is refused with `400`. |

`201 Created`:

```json
{ "url": "https://studio.example.com/partner-sso#t=Q2x...", "expiresAt": "2026-10-03T09:13:00.000Z" }
```

Send the person's browser to `url` straight away (a redirect or a link they
click). The link:

- works **once**, within **60 seconds**;
- carries its ticket after `#`, which browsers never send to servers, so it
  doesn't appear in access logs or `Referer` headers;
- is bound to the person and to your key: it stops working if the key is
  revoked or loses the `sso` permission, or if the person leaves the key's
  scope or is suspended;
- opens on the person's own studio address (their reseller's domain when the
  reseller has one).

The page posts the ticket back to the studio, which signs the person in and
redirects to `to`. An expired or used link shows a page saying so, with a
sign-in link. Make a new link every time; don't store them.

### POST /plan

Proposes an app plan (pages, data, assumptions) for the person to review,
like the studio's planning step. Same checks as the studio: the person's AI
allowance must not be used up and their plan must allow another app;
planning itself isn't charged (the build is), and it is limited to 30 an hour
per person.

```json
{ "userId": "clx1abc...", "prompt": "Bread pre-orders for a small bakery", "locale": "es" }
```

| Field | | |
| --- | --- | --- |
| `userId` | required | |
| `prompt` | required | 5–2000 characters. |
| `locale` | optional | The app's language (`en`, `es`, `fr`, `de`, `ar`, ...). |
| `change` + `previous` | optional | Revise an earlier plan (`previous`) with a change (3–1000 characters). |
| `images` | optional | Up to 6 [reference images](#reference-images) of how the app should look. |
| `referenceId` | optional | Reuse images sent before (instead of `images`), e.g. for a revision. |

`202 Accepted`: `{ "runId": "8d3e..." }`, plus `"referenceId"` when images
were sent. Poll `GET /runs/{runId}`; the finished run's `plan` is the
proposal. A request the [build rule](#the-build-rule) refuses gets
`422 build_not_allowed` right away; when only the plan the AI made gives it
away, the run ends with `status: "error"` and `errorCode: "build_not_allowed"`.

### POST /builds

Builds an app for the person, like the studio's builder: one AI action from
the person's allowance (and the reseller's cap), refunded if the build fails.

```json
{ "userId": "clx1abc...", "prompt": "Bread pre-orders for a small bakery", "plan": { "...": "from a plan run" } }
```

| Field | | |
| --- | --- | --- |
| `userId` | required | |
| `prompt` | required | 5–2000 characters. |
| `plan` | optional | A reviewed plan from `POST /plan`, built exactly. Without one the platform plans and builds in one go. |
| `locale` | optional | The app's language (default: the plan's, else the person's). |
| `images` | optional | Up to 6 [reference images](#reference-images). |
| `referenceId` | optional | The plan run's `referenceId`, to build with the images the plan was made from. |

`202 Accepted`: `{ "runId": "8d3e..." }` (plus `"referenceId"` with images).
A request the [build rule](#the-build-rule) refuses gets `422 build_not_allowed`
before anything is charged. Builds take from about a minute to
several minutes. Poll `GET /runs/{runId}` every few seconds, or set a webhook.
Send an `Idempotency-Key` so a retried request never starts a second build.

### GET /runs/{id}

A plan or build started for someone in the key's scope (kept 7 days; runs
continue and are kept across server restarts, and a build interrupted by a
restart ends as failed and refunded).

```json
{
  "run": {
    "id": "8d3e...", "kind": "build", "userId": "clx1abc...", "status": "success",
    "message": "Final touches...",
    "progress": [ { "step": "plan", "message": "Thinking about your app..." }, { "step": "pages", "message": "Built page: Home", "name": "Home" } ],
    "plan": null,
    "project": { "id": "clx9xyz...", "name": "Rise Bakery", "links": { "live": null, "preview": "...", "editor": "..." }, "paths": { "...": "..." } },
    "references": { "id": "5b0c...", "count": 2, "brief": { "summary": "Dark, warm bakery look with large photos", "palette": [ { "hex": "#1f1a17", "role": "background" } ], "fonts": { "display": "Fraunces", "body": "Inter", "style": "serif editorial" }, "mood": ["warm", "artisanal"], "layout": ["split hero"], "components": ["pill buttons"], "screens": [ { "name": "Menu", "purpose": "Breads to pre-order", "imageIndex": 0 } ], "suggestedTheme": "Warm Earth" } },
    "error": null, "errorCode": null, "refunded": false,
    "createdAt": "2026-10-03T09:30:00.000Z", "updatedAt": "2026-10-03T09:33:10.000Z", "endedAt": "2026-10-03T09:33:10.000Z"
  }
}
```

`status` is `running`, `success` or `error`. On `error`, `error` says what
went wrong in the person's language, `errorCode` is `build_not_allowed` when
the [build rule](#the-build-rule) stopped it (else `failed`), and `refunded`
tells whether the AI action was given back. `references` is set when the run
had reference images: their `id` (send it as `referenceId`), how many, and
`brief`, a summary of what the AI saw in them (palette, fonts, mood, layout,
components, the screens with the image each is in, and the closest theme), or
`null` until they have been read. `progress` holds the latest 50 steps.

### POST /projects/{id}/publish

Publishes the app's current draft to its live address, like the studio's
Publish button (the person's plan limit on live apps applies, except to an app
that is already live). Accepts `Idempotency-Key`.

```json
{ "ok": true, "version": 2, "project": { "id": "clx9xyz...", "published": true, "links": { "live": "https://rise-bakery.apps.example.com", "...": "..." } } }
```

### GET /usage

This month's AI actions (UTC calendar month): for the key's whole scope, and
per person (paginated, newest people first).

```json
{
  "month": "2026-10",
  "resetsAt": "2026-11-01T00:00:00.000Z",
  "scope": { "type": "reseller", "resellerId": "clr...", "used": 37, "limit": 500, "games": 6 },
  "users": {
    "data": [ { "userId": "clx1abc...", "email": "ana@example.com", "plan": "STARTER", "used": 4, "games": 2, "limit": 300 } ],
    "nextCursor": null
  }
}
```

For a reseller key, `scope.used` is the reseller's whole pool (its clients'
use plus the reseller's own), the number its monthly cap (`scope.limit`,
`null` = no cap) applies to. Each person's `limit` is their plan's monthly
allowance (`null` = unlimited). `games` (for the scope and each person) is
how many of these actions were Game Studio builds and changes; they are
already counted in `used`.

### GET /openapi.json

The OpenAPI 3.1 description. No key needed.

## Games

The Game Studio (`/games` in the studio) builds browser games from a
description: 2D (Phaser) or 3D (three.js), with art and sound from the
platform's asset library. A key can do everything with games that the person
can do in the workspace, for a person in the key's scope: make a game and
build it, follow the build step by step, steer it while it builds, stop it,
change it later, go back to an earlier version, publish it as an app, download
it as a .zip, and delete it. It is the studio's own code, with the same
checks, limits and allowance:

- **One AI action per build and per change** from the person's monthly
  allowance (and the reseller's cap), however many steps it takes. It is
  given back when the build or change delivers nothing (it fails, or is
  stopped, before its first step is saved, or the build rule refuses it).
  Once a step is saved the person has a better game, so a later failure
  isn't refunded. Reading reference images is one more action, as for apps.
  Notes, their replies, clarifying questions, restores, publishing and
  downloads are free.
- **The build rule** applies to games too (see [The build rule](#the-build-rule)).
- Endpoints need the `build` permission, except publishing (`publish`).

### How a build runs

A build is a **job** that runs in the background (it survives server
restarts and carries on from its step):

1. **Plan** (`job.phase: "plan"`): a game design brief (genre, core loop,
   controls, levels, art direction), library searches, the assets it will use,
   **3-8 planned features**, each with a real test, and 4-12 build steps.
2. **Steps** (`job.phase: "steps"`): every step edits the game, is checked
   (syntax, allowed APIs, asset licences) and played in a headless browser
   (it must load, start and run without errors; a screenshot is taken), and
   the tests of every feature built so far run on it (real key presses in
   game time). A failing step or feature gets one repair. Each step that
   passes is saved as a **version**.
3. After the level, enemies and polish steps a playtester checks the game;
   problems it finds get a fix step. Before the end, a core feature that
   still fails gets up to two "Feature fixes" steps. So `progress.total` can
   grow while it runs.

A **change** ("make the jump higher") is a short change plan, then the same
steps, checks and tests. Feature status: `planned` (not built yet) → `built`
(built, no usable test) → `passing` | `failing`, with `last`, the newest test
result.

Job `status`: `running`, `done`, `error` (`errorCode`: `build_not_allowed`
or `failed`), or `cancelled` (stopped). `refunded` says whether the AI action
was given back.

### POST /games

Makes a game for the person and starts its first build. Accepts
`Idempotency-Key` (a retry never starts a second build).

```bash
curl -s -X POST "$API/games" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -H "Idempotency-Key: $(uuidgen)" \
  -d '{"userId":"clx1abc...","prompt":"A cat platformer: collect 10 fish to open the door","engine":"2d"}'
```

| Field | | |
| --- | --- | --- |
| `userId` | required | A person in the key's scope. |
| `prompt` | required (or `images`) | The game, in the person's words (up to 6000 characters). |
| `engine` | optional | `2d`, `3d` or `auto` (default: the AI chooses from the idea). |
| `locale` | optional | The language of the game and of its progress messages (`en`, `es`, `ar`, ...). Default: the person's. |
| `name` | optional | Up to 120 characters. Default: the first words of the prompt, then the plan's title once the plan is made. |
| `images` | optional | Up to 6 [reference images](#reference-images) (concept art, screenshots of games they like). |
| `referenceId` | optional | Images sent before (instead of `images`). |

`202 Accepted`: `{ "game": { ... as GET /games/{id} }, "job": { ... } }`, plus
`referenceId` with images. Right after it starts the job is in its plan phase:
`job.phase: "plan"`, `job.steps: []`, `job.progress: { "step": 0, "total": 0, "done": 0, "label": null, "running": false }`,
`game.plan: null`, `game.versions.count: 1` (the empty start, `seq` 0). A request the build rule refuses gets
`422 build_not_allowed` before anything is charged, and no game is left
behind; `429 ai_quota_exceeded` when the allowance is used up. Builds take a
few minutes to an hour, depending on the game and the AI model.

### POST /games/clarify

The studio asks up to 3 quick questions before a first build when the idea
leaves big choices open. Free, 20 an hour per person (over that, no
questions).

```json
{ "userId": "clx1abc...", "prompt": "a fun game" }
```

`200 OK`: `{ "questions": [ { "id": "kind", "label": "What kind of game?", "options": ["Platformer", "Puzzle"] } ] }`
(`options` may be empty: a free answer). The build never waits for answers:
to use them, add one line per answer, `<label> <answer>`, after a blank line
at the end of the prompt (as the studio does), then `POST /games`. An empty
list means: build straight away.

### GET /games?userId=

The person's games, newest first. Paginated.

```json
{
  "data": [
    {
      "id": "cmg1...", "userId": "clx1abc...", "name": "Whisker Dash", "engine": "2d",
      "status": "ready", "seq": 9, "published": true,
      "app": { "projectId": "clx9...", "published": true, "url": "https://whisker-dash-x1y2z3.apps.example.com" },
      "screenshot": { "seq": 9, "path": "/games/cmg1.../versions/9/shot" },
      "links": { "workspace": "https://studio.example.com/games/cmg1..." },
      "paths": { "workspace": "/games/cmg1..." },
      "createdAt": "2026-10-07T09:00:00.000Z", "updatedAt": "2026-10-07T09:40:00.000Z"
    }
  ],
  "nextCursor": null
}
```

`status`: `new`, `building`, `ready` (playable) or `error` (the first build
failed). `seq` is the newest version. `screenshot.path` (and every
`screenshotPath`) is under the API's base: GET it with the key (an
`image/webp`). `links.workspace` needs the person signed in: make a sign-in
link with `to` = `paths.workspace` ([POST /sso](#post-sso)).

### GET /games/{id}

Everything about one game: the fields above, plus

```json
{
  "game": {
    "id": "cmg1...", "name": "Whisker Dash", "engine": "2d", "status": "building", "seq": 3, "kitVersion": "1.1.0",
    "plan": {
      "title": "Whisker Dash",
      "message": "A cheerful platformer: a cat collecting fish across two levels.",
      "brief": { "genre": "side-scrolling platformer", "pitch": "...", "coreLoop": "...", "controls": "...", "levels": "...", "winLose": "...", "artStyle": "...", "audio": "..." },
      "visual": { "camera": "side view", "palette": [ { "hex": "#c3e3ff", "role": "sky" } ], "...": "..." },
      "assets": [ { "key": "tiles", "id": "kenney/new-platformer-pack/spritesheet-tiles", "use": "ground, coins, flag" } ],
      "steps": [ { "id": "s1", "label": "Sky and ground", "status": "done", "features": [] }, { "id": "s4", "label": "Hero and controls", "status": "todo", "features": ["run-jump"] } ],
      "features": [
        {
          "id": "run-jump", "name": "Run and jump", "priority": "core", "how": "Arrows run, Space jumps.",
          "status": "passing",
          "test": { "start": true, "steps": [ { "key": "ArrowRight", "holdMs": 400 }, { "key": "Space", "holdMs": 250 } ], "expect": ["track.maxX > start.player.x + 60"] },
          "last": { "seq": 4, "ok": true, "text": "track.maxX > start.player.x + 60 → true" }
        }
      ]
    },
    "features": { "total": 3, "passing": 1, "failing": 0, "built": 0, "planned": 2 },
    "job": {
      "id": "6c1f...", "gameId": "cmg1...", "kind": "build", "status": "running", "phase": "steps",
      "prompt": "A cat platformer: collect 10 fish to open the door",
      "progress": { "step": 4, "total": 8, "done": 3, "label": "Hero and controls", "running": true },
      "steps": [ { "id": "s1", "label": "Sky and ground", "status": "done", "seq": 1, "note": "Sky and ground are in.", "added": false, "kind": null, "features": [] } ],
      "stopAfterStep": false, "references": null,
      "error": null, "errorCode": null, "refunded": false,
      "startedAt": "2026-10-07T09:00:00.000Z", "finishedAt": null
    },
    "versions": { "count": 4, "latest": { "seq": 3, "label": "First level", "note": "...", "kind": "step", "ok": true, "features": { "passing": 1, "failing": 0, "total": 3 }, "screenshotPath": "/games/cmg1.../versions/3/shot", "createdAt": "..." } },
    "lastMessage": { "seq": 6, "kind": "assistant", "text": "Features: 1 passing.", "versionSeq": 3, "createdAt": "..." },
    "...": "and the fields of the list"
  }
}
```

- `plan` is `null` until the plan is made; `plan.steps` are the first build's
  steps, `plan.features` the game's features now (a change can add some).
- `job` is the newest build or change (running or ended). `progress.step` is
  the step running now (1-based), or the number of finished steps when none
  runs; `label` is that step's. A step's `kind` is `playtest-fix` or
  `feature-fix` for steps the checks added, `added: true` for steps added
  for notes or checks; `error` is set on a step that failed.
- `features` counts are `null` for a game without planned features.
- `versions.latest.ok` is whether the headless check passed (`null` = not run).

### GET /games/{id}/jobs/{jobId}

One build or change (the `job.id` from `POST /games` or `/changes`): `{ "job": { ... } }`.

### GET /games/{id}/events

What happened in the game, as the workspace's chat shows it: the person's
requests and notes, the plan message, replies, one feature line per step,
playtest results, the end message, errors. Poll it to show progress:

```bash
curl -s "$API/games/cmg1.../events?after=12" -H "Authorization: Bearer $KEY"
```

```json
{
  "data": [
    { "seq": 13, "kind": "user", "text": "make the hero orange", "versionSeq": null, "createdAt": "...", "note": { "status": "applied", "step": 3, "label": "First level", "planned": null } },
    { "seq": 14, "kind": "assistant", "text": "Noted: I'll make the hero orange from the next step.", "versionSeq": null, "createdAt": "..." },
    { "seq": 15, "kind": "assistant", "text": "Features: 2 passing.", "versionSeq": 5, "createdAt": "..." }
  ],
  "lastSeq": 15,
  "more": false,
  "game": { "id": "cmg1...", "status": "building", "seq": 5 },
  "job": { "...": "the newest job, as in GET /games/{id}" }
}
```

`after` (default 0) is the last `seq` you have; send the answer's `lastSeq`
next time. `limit` 1-100 (default 100); `more: true` means there is more to
read now. `kind` is `user`, `assistant` or `error`. A note's `note.status`:
`new`/`checking` (being read), `accepted` (will be built; `planned` names the
step), `question` (answered, nothing to build), `refused` (the build rule),
`applied` (in step `step`, `label`), `dropped` (the build ended first).
Messages are in the person's language.

### POST /games/{id}/notes

Steer while building: a message for the running build or change, as if the
person typed it in the chat. The build rule checks it, the AI answers it at
once, and the build takes it in before its next step (a note the plan
doesn't cover gets a step of its own; a note sent during the last step gets a
follow-up step). Free. Accepts `Idempotency-Key`.

```json
{ "text": "make the hero orange", "images": [ { "url": "https://example.com/hero.png" } ], "wait": true }
```

| Field | | |
| --- | --- | --- |
| `text` | required (or `images`) | Up to 2000 characters. |
| `images` | optional | Reference images for this note (read as one AI action when the build uses them). |
| `wait` | optional | `true` (default): wait up to 30 seconds for the answer and return it. `false`: return at once. |

`201 Created`:

```json
{ "note": { "id": "cmh2...", "status": "accepted", "chatSeq": 13, "reply": { "status": "accepted", "kind": "change", "text": "Noted: I'll make the hero orange from the next step.", "chatSeq": 14 } } }
```

`reply` is `null` when it took longer (it still arrives in the events);
`reply.status` is `refused` (with the build rule's sentence as `text`) when
the rule refuses the note. `409 not_running` when nothing is running: send a
change instead. `409 too_many_notes` after 25 notes on one build. 10 notes a
minute per person.

### POST /games/{id}/stop

```json
{ "mode": "after-step" }
```

`after-step` ends the build once the step running now is saved (`continue`
takes that back); `now` cancels the running AI call at once and keeps the
versions already saved. A build stopped before its first saved step gives
the AI action back. `200 OK`: `{ "ok": true, "mode": "after-step", "job": { ... } }`;
`409 not_running` when nothing runs. The job ends with `status: "cancelled"`.

### POST /games/{id}/changes

A change to a built game, as if the person typed it in the chat.

```json
{ "prompt": "make the jump higher and add a meow when the cat jumps" }
```

`prompt` (or `images` / `referenceId`) as for `POST /games`. One AI action.
Accepts `Idempotency-Key`. `202 Accepted`: `{ "job": { "kind": "change", ... } }`.
`409 already_building` while a build or change runs (send a note instead).

### GET /games/{id}/versions

Every saved step, restore and the empty start (`seq` 0), newest first.
Paginated; `cursor` is a `seq`.

```json
{
  "data": [
    { "seq": 5, "label": "Fish and score", "note": "Fish and score are in.", "kind": "step", "ok": true, "features": { "passing": 2, "failing": 0, "total": 2 }, "screenshotPath": "/games/cmg1.../versions/5/shot", "createdAt": "..." }
  ],
  "nextCursor": "3"
}
```

`kind`: `start`, `step` or `restore`.

### GET /games/{id}/versions/{seq}/shot

The version's screenshot from the headless check (`image/webp`); `404` when it has none.

### POST /games/{id}/versions/{seq}/restore

Makes an earlier version the current one. It is saved as a new version, so
nothing is lost, and the features come back with the status they had then.
Free. `409 still_building` while the AI works on the game. Accepts
`Idempotency-Key`.

```json
{ "ok": true, "seq": 9, "restoredFrom": 3, "game": { "...": "as GET /games/{id}" } }
```

### POST /games/{id}/publish

Publishes the game as an app whose home page is the game, on its own
address, like the workspace's Publish button. The first time it makes the app
(the person's plan limits on apps and on live apps apply: `403 plan_limit`);
after that it updates the live game with a new version. `409 not_built`
before the first build, `409 still_building` while the AI works on it.
Needs the `publish` permission. Accepts `Idempotency-Key`. Sends
`game.published`.

```json
{
  "ok": true,
  "url": "https://whisker-dash-x1y2z3.apps.example.com",
  "version": 1,
  "project": { "id": "clx9...", "kind": "design", "published": true, "links": { "live": "https://whisker-dash-x1y2z3.apps.example.com", "...": "..." }, "...": "..." },
  "game": { "...": "as in GET /games" }
}
```

The app is also listed in `GET /users/{id}/projects` (kind `design`).

### GET /games/{id}/export

The game as a .zip for any static web host: its code, the engine, the assets
it uses, and a README. 20 an hour per person; `409 not_built` before the
first build.

```bash
curl -s -o game.zip "$API/games/cmg1.../export" -H "Authorization: Bearer $KEY"
```

Licences: most library assets are CC0 and are copied in. Some may be used in
games hosted on the platform but never handed out as files ("hosted only":
Platform-only pack, the Quaternius pack); a download leaves them out
(the game shows nothing where they were) and README.txt lists them.
`?check=1` answers, as JSON, what a download would leave out:

```json
{ "excluded": [ { "id": "platform-only/audio-arcade-sound-fx/animal-cat", "name": "Animal Cat" } ], "included": 7 }
```

### DELETE /games/{id}

Deletes the game (a running build stops) and the app it was published as.
`200 OK`: `{ "ok": true, "id": "cmg1..." }`.

### GET /games/assets/search

The workspace's asset library search, to show what a game could use.

```bash
curl -s "$API/games/assets/search?q=fish&dim=2d&limit=10" -H "Authorization: Bearer $KEY"
```

| Parameter | |
| --- | --- |
| `q` | Words to search for. |
| `dim` | `2d`, `3d`, `audio` or `font`. |
| `kind` | `sprite`, `spritesheet`, `tileset`, `model`, `sfx`, `music`... (comma-separated). |
| `set` | A pack's id prefix (`kenney/new-platformer-pack`): lists it, or searches it with `q`. |
| `exportable` | `1`: only assets a download may contain. |
| `limit` | 1-100 (default 48). |

```json
{
  "data": [
    {
      "id": "kenney/new-platformer-pack/sprites/fish", "name": "Fish", "kind": "sprite", "style": "cartoon",
      "set": "kenney/new-platformer-pack", "licence": "cc0", "redistributable": true, "hostedOnly": false,
      "preview": "https://studio.example.com/game-assets/_previews/kenney/new-platformer-pack/sprites/fish.png",
      "url": "https://studio.example.com/game-assets/kenney/new-platformer-pack/sprites/fish.png",
      "metrics": "64x64", "use": "pickup"
    }
  ]
}
```

`hostedOnly: true` (= `redistributable: false`): usable in games on the
platform, never in a download. Nothing is returned without `q` or `set`.

### Following a game

Poll `GET /games/{id}` (or `/events`) every few seconds until `job.status`
isn't `running`, or set a webhook: a key with a webhook gets these events for
builds and changes it started ([Webhooks](#webhooks)):

| Event | When | `data` |
| --- | --- | --- |
| `game.step.completed` | A step was saved as a version | `game` (as in the list), `job`, `step` (`index`, `total`, `id`, `label`, `seq`, `note`, `features`), `features` (counts: `total`, `passing`, `failing`, `built`, `planned`, or `null`) |
| `game.build.completed` | A build or change finished | `game` (as GET /games/{id}), `job` |
| `game.build.failed` | It ended with an error | `game`, `job` (`error`, `errorCode`, `refunded`) |
| `game.build.stopped` | It was stopped (`POST /stop`) | `game`, `job` |
| `game.published` | `POST /games/{id}/publish` published it | `game`, `url`, `version`, `project` |

`job.kind` tells a build from a change. The data is what was true when the
event happened (it isn't read again on retries).

### A game in five calls

1. `POST /games` with `userId` and `prompt` (and an `Idempotency-Key`); keep
   `game.id`. Optionally `POST /games/clarify` first.
2. Show progress: poll `GET /games/{id}/events?after=<lastSeq>` (or use the
   webhooks); show `job.progress` ("step 4 of 8: Hero and controls").
3. Pass the person's messages while it builds to `POST /games/{id}/notes`
   (show `note.reply.text`); afterwards to `POST /games/{id}/changes`.
4. Show `game.screenshot` and `game.plan.features` with their status; open
   the workspace with `POST /sso` and `to` = `game.paths.workspace`.
5. `POST /games/{id}/publish` and share `url`.

## Reference images

`POST /plan`, `POST /builds`, `POST /games`, `POST /games/{id}/changes` and
`POST /games/{id}/notes` take reference images: concept art, sketches,
screenshots of apps the person likes, or mood boards. The AI reads them once
(one vision call, counted as one AI action from the person's allowance, like
any other) and turns them into a visual brief: a palette with roles, fonts,
mood, layout patterns, components and the screens they show. The plan gets a
page for each screen in the images, the theme starts from the closest built-in
look with the images' own colours, and every page is built with the brief
(and, on large models, with the image of its own screen).

```json
{
  "userId": "clx1abc...",
  "prompt": "Bread pre-orders for a small bakery",
  "images": [
    { "url": "https://example.com/concept/menu.png" },
    { "data": "data:image/jpeg;base64,/9j/4AAQ...", "name": "home sketch" },
    { "data": "iVBORw0KGgo...", "mediaType": "image/png" }
  ]
}
```

| Field | | |
| --- | --- | --- |
| `url` | one of `url`/`data` | A public `https://` link to the image. It is downloaded by the platform (never from private or local addresses, also after redirects). |
| `data` | one of `url`/`data` | The image itself: a `data:` URL or plain base64. |
| `mediaType` | optional | `image/png`, `image/jpeg`, `image/webp` or `image/gif`. The file's real bytes decide; a wrong type is refused. |
| `name` | optional | A label (up to 120 characters). |

Limits: at most 6 images, each at most 5 MB. Images are shrunk to at most
1600 pixels on their longest side, stripped of their metadata (EXIF, GPS),
and kept privately for the person who sent them; a set nobody used for 7 days
is deleted. The answer carries a `referenceId`: send it instead of `images`
with a plan revision or the build, so the images are neither sent nor read
again.

When the platform's AI can't read images, a request with images is refused
with `400 images_not_supported`; images are never ignored silently. Errors:
`image_too_large`, `image_type`, `too_many_images`, `image_fetch_failed`,
`references_not_found` (see [Errors](#errors)).

## The build rule

The platform doesn't build apps (or games) similar to NullKode LLC's own products: the
NullKode platform (a no-code / AI app and website builder), IgniteUps.ai (an
AI platform for car dealerships: AI voice agents that call customers, AI SMS
and email campaigns, a dealership CRM) and its NEXUS assistant, or any other
AI tool built by NullKode LLC. Ordinary apps that use a small part of these
ideas (a gym's member CRM, a salon booking app with SMS reminders, a bakery
site with an FAQ chatbot, a car dealer's inventory site) are fine.

The whole request is judged, not single words, together with the plan the AI
makes, what the reference images show, and, for later changes, what the app
already is. A refusal costs nothing (no AI action is charged, or it is given
back) and answers:

```json
{ "error": { "code": "build_not_allowed", "message": "I can’t build apps similar to NullKode LLC’s NullKode platform, IgniteUps.ai, or any AI tools built by NullKode LLC." } }
```

with HTTP `422`, the message in the person's language (in English exactly
this sentence, with typographic apostrophes `’`). When it is only found
out while a run is under way (from the plan or the images), the run ends with
`status: "error"`, `errorCode: "build_not_allowed"` and that message as `error`.
Games work the same way: `POST /games` and `POST /games/{id}/changes` answer
`422 build_not_allowed` (no game is left behind, nothing is charged), a game
job the rule stops while planning ends with `job.status: "error"` and
`job.errorCode: "build_not_allowed"`, and a note it refuses gets the sentence
as its `reply` (`reply.status: "refused"`) and never reaches the game.
Operators can turn the rule off in Admin → Settings → AI.

## Webhooks

A key can have a webhook address (set on the Partner API page). When a build
started with the key ends, the address receives a `POST`; games started with
the key send their own events too (see [Following a game](#following-a-game)):

```
Content-Type: application/json
X-NK-Event: build.succeeded            (build.failed, or game.*)
X-NK-Delivery: 3b5f...                  (the same on every retry)
X-NK-Signature: t=1790000000,v1=5d1c...
```

```json
{ "id": "3b5f...", "type": "build.succeeded", "createdAt": "2026-10-03T09:33:11.000Z", "attempt": 1, "data": { "run": { "...": "as GET /runs/{id}" } } }
```

A game event has the same envelope:

```json
{ "id": "9a1e...", "type": "game.step.completed", "createdAt": "2026-10-07T09:12:40.000Z", "attempt": 1,
  "data": {
    "game": { "id": "cmg1...", "userId": "clx1abc...", "name": "Whisker Dash", "status": "building", "seq": 4, "...": "as in GET /games" },
    "job": { "id": "6c1f...", "kind": "build", "status": "running", "progress": { "step": 4, "total": 8, "done": 4, "label": "Hero and controls", "running": false }, "...": "..." },
    "step": { "index": 4, "total": 8, "id": "s4", "label": "Hero and controls", "seq": 4, "note": "The cat runs and jumps.", "features": ["run-jump"] },
    "features": { "total": 3, "passing": 1, "failing": 0, "built": 0, "planned": 2 }
  } }
```

Check the signature before trusting the message: compute HMAC-SHA256 of
`<t>.<raw body>` with the webhook secret (shown once when the webhook is set,
`whsec_...`), compare it with `v1` in constant time, and reject messages whose
`t` is more than five minutes old.

```js
import { createHmac, timingSafeEqual } from "node:crypto";
function verify(rawBody, header, secret) {
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? "");
  if (!m || Math.abs(Date.now() / 1000 - Number(m[1])) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${m[1]}.${rawBody}`).digest();
  return timingSafeEqual(expected, Buffer.from(m[2], "hex"));
}
```

Answer any `2xx` quickly. Other answers (or no answer within 10 seconds) are
retried after about 10 seconds, 1 minute, 5 minutes and 30 minutes. Use
`X-NK-Delivery` to ignore duplicates. Delivery is best effort: keep polling
`GET /runs/{id}` (or `GET /games/{id}`) as a fallback (for example, a build
that a server restart interrupted is reported only there; a game build
carries on after a restart, but without webhooks).

Webhooks on keys made by a reseller must use a public `https://` address.
The operator's keys may also use `http://` and private addresses.

## A typical integration

1. When a customer first uses the feature in your product, call
   `POST /users` with their email (and an `Idempotency-Key`). Store the
   returned `user.id`. A `409 email_taken` means the address already has an
   account you don't manage: ask the customer to use another address.
2. To build: `POST /plan`, poll `GET /runs/{id}` until `success`, show the
   plan, then `POST /builds` with `plan` (or skip the plan step).
3. Follow the build with `GET /runs/{id}` (or the webhook) and show
   `message` as progress.
4. To open the studio for them: `POST /sso` with `to` = the app's
   `paths.editor`, then redirect their browser to `url`.
5. List their apps with `GET /users/{id}/projects`; publish with
   `POST /projects/{id}/publish`.
6. For games: see [A game in five calls](#a-game-in-five-calls).
7. Show usage with `GET /usage`.

## Security notes for operators

- Prefer **this server only** keys; give allowlisted keys the fewest
  addresses possible, and the fewest permissions.
- The reverse proxy must set `X-Real-IP` to the connecting address for every
  outside request (the bundled deployment configurations do). If you add your
  own proxy, make sure it does, or same-server keys can't tell outside
  requests apart.
- Optionally block `/api/partner/` at the proxy for addresses that never need
  it, as defence in depth (`/api/partner-sso`, which browsers use, must stay
  open).
- Every request writes one audit line to the server log
  (`[partner] {"key":"Ab12Cd34","path":...,"status":...}`): the key's prefix,
  scope, client address, route, status and the person or app involved. Keys,
  tickets and webhook secrets are never logged.
