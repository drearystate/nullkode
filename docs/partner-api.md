# Partner API

The partner API lets another service (your booking system, CRM, agency
portal, or anything else) work with the platform on behalf of its people:

- create accounts (or find existing ones),
- sign a person straight into their workspace with a one-time link,
- plan and build apps for them, and follow the build,
- list their apps with live, preview and editor links, and publish them,
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
- [Webhook: build finished](#webhook-build-finished)
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
| `build` | `POST /plan`, `POST /builds`, `GET /runs/{id}` |
| `publish` | `POST /projects/{id}/publish` |
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
| 401 | `unauthorized` | No key, an unknown key, or a revoked key. |
| 403 | `network_not_allowed` | The key can't be used from where the request came from. |
| 403 | `permission_denied` | The key doesn't have the permission for this endpoint. |
| 403 | `suspended` | The key's reseller is suspended. |
| 403 | `user_suspended` | The person's account is suspended. |
| 403 | `seats_full` | The reseller has no client seats left. |
| 403 | `plan_limit` | The person's plan doesn't allow it (more apps, more live apps). |
| 404 | `not_found` | No such id, or it is outside the key's scope. |
| 409 | `email_taken` | The address has an account this key doesn't manage. |
| 409 | `idempotency_in_progress` | The first request with this Idempotency-Key is still running. |
| 422 | `idempotency_key_reused` | The Idempotency-Key was used for a different request. |
| 429 | `rate_limited` | Too many requests; see `Retry-After`. |
| 429 | `ai_quota_exceeded` | The person's monthly AI allowance (or the reseller's cap) is used up. |
| 500 | `internal` | Something went wrong on the platform's side. Retry later. |

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

Over a limit you get `429 rate_limited` with `Retry-After` (seconds). Builds
are also bounded by each person's monthly AI allowance (`429
ai_quota_exceeded`, which `Retry-After` doesn't apply to: it resets at the
start of the next month, UTC).

## Idempotency

`POST /users`, `POST /builds` and `POST /projects/{id}/publish` accept an
`Idempotency-Key` header (any unique value up to 200 characters, such as a
UUID). Retrying with the same key and the same body within 24 hours returns
the first answer again, with `Idempotent-Replayed: true`, instead of doing the
work twice; so a network error on `POST /builds` never charges a second build.

- Same Idempotency-Key, different body: `422 idempotency_key_reused`.
- The first request still running: `409 idempotency_in_progress`.
- Answers worth retrying (`429`, `5xx`) aren't saved, so a retry runs again.
- Keys are per partner key.

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

`202 Accepted`: `{ "runId": "8d3e..." }`. Poll `GET /runs/{runId}`; the
finished run's `plan` is the proposal.

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

`202 Accepted`: `{ "runId": "8d3e..." }`. Builds take from about a minute to
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
    "error": null, "refunded": false,
    "createdAt": "2026-10-03T09:30:00.000Z", "updatedAt": "2026-10-03T09:33:10.000Z", "endedAt": "2026-10-03T09:33:10.000Z"
  }
}
```

`status` is `running`, `success` or `error`. On `error`, `error` says what
went wrong in the person's language and `refunded` tells whether the AI action
was given back. `progress` holds the latest 50 steps.

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
  "scope": { "type": "reseller", "resellerId": "clr...", "used": 37, "limit": 500 },
  "users": {
    "data": [ { "userId": "clx1abc...", "email": "ana@example.com", "plan": "STARTER", "used": 4, "limit": 300 } ],
    "nextCursor": null
  }
}
```

For a reseller key, `scope.used` is the reseller's whole pool (its clients'
use plus the reseller's own), the number its monthly cap (`scope.limit`,
`null` = no cap) applies to. Each person's `limit` is their plan's monthly
allowance (`null` = unlimited).

### GET /openapi.json

The OpenAPI 3.1 description. No key needed.

## Webhook: build finished

A key can have a webhook address (set on the Partner API page). When a build
started with the key ends, the address receives a `POST`:

```
Content-Type: application/json
X-NK-Event: build.succeeded            (or build.failed)
X-NK-Delivery: 3b5f...                  (the same on every retry)
X-NK-Signature: t=1790000000,v1=5d1c...
```

```json
{ "id": "3b5f...", "type": "build.succeeded", "createdAt": "2026-10-03T09:33:11.000Z", "attempt": 1, "data": { "run": { "...": "as GET /runs/{id}" } } }
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
`GET /runs/{id}` as a fallback (for example, a build that a server restart
interrupted is reported only there).

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
6. Show usage with `GET /usage`.

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
