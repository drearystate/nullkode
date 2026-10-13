# AI in apps: each app brings its own AI key

NullKode's own AI (the one set in **Admin → Settings → AI**) plans, builds and
edits apps. Once an app is **published or previewed**, its AI parts (chat,
companions, agents, search by meaning, reading aloud…) run with the **app's own
AI connection** ("AI keys"), never with the platform's AI — with one exception:
apps of the **platform owner**.

## Who is the platform owner

`isPlatformOwner(user)` in `src/lib/app-ai/connections.ts`: every account with
the **ADMIN** role, plus the install wizard's owner (`Setting install.ownerId`,
who is created as an ADMIN anyway). Admins already control the platform's AI
settings and keys, so letting their apps use that AI grants them nothing new.
Resellers, reseller clients and every other account bring their own key.

On nullkode.com that is the operator account (role ADMIN). On a self-host it is
whoever ran the install wizard (and any admin they made).

For the platform owner's apps: when the app has its own key, the key is used;
otherwise the platform's AI is used and counted like before (`AiUsage` kind
`flow`, lib/ai-quota.ts).

## Where keys live

Table `AppAiConnection` (prisma/schema.prisma; additive SQL in
`nk-plan/additive-schema.sql`): per app, one or more named connections
(`default` unless the owner adds more), each with

| field | meaning |
| --- | --- |
| `provider` | `openai`, `anthropic` (shown as "Messages API"), `xai`, `gemini`, `openrouter`, `custom` (any OpenAI-compatible server: Ollama, LM Studio, vLLM…) |
| `baseUrl` | the API address (required for `custom`, optional otherwise) |
| `apiKeyEnc` | the key, AES-256-GCM encrypted with the AUTH_SECRET-derived key (`encryptSecret`, the same as reseller Stripe keys) |
| `keyHint` | `sk-p…wxyz`: the only thing screens and APIs ever show |
| `model`, `chatModel`, `visionModel`, `speechModel` + `voice`, `embedModel` | the models steps use |
| `isDefault`, `lastTestAt/Ok/Error` | |

Keys are **write-only**: they come in on save, are decrypted only in memory
when a step runs, are added to the run's secret list (masked in stored runs,
`lib/flow/redact.ts`), and every provider error is scrubbed of them
(`scrub()` in `lib/app-ai/providers.ts`). They never reach pages, published
HTML, flow replies, logs, exports or the partner API.

Changing `AUTH_SECRET` makes saved keys unreadable (the step then says "enter
it again"), like every other stored secret.

Private network addresses (a local Ollama at `http://127.0.0.1:11434/v1`) are
refused for apps unless the operator sets `NK_APP_AI_ALLOW_PRIVATE=1` (useful on
a single-user self-host) or the app belongs to the platform owner. Calls never
follow redirects (a key must not reach another host).

## Screens

- **AI keys** tab of every app (`/projects/<id>/ai`): add/change/remove
  connections, **Test connection** (also before saving, with the typed key, in
  memory only), make default, and the app's AI limits.
- A **banner** on every screen of an app (the editor included) that has AI
  steps and no key, unless the owner is the platform owner.
- A **dashboard notice** listing the person's apps that need a key.
- **Notices** in the build wizard's plan ("This app has AI features…") and at
  the end of the build (the build waits on a card with "Add an AI key" instead
  of jumping to the editor), after installing a feature with AI steps, and in
  Ask AI's reply when an edit adds AI steps. The platform owner sees none of
  them. Text: `messages/*/ai.json` `aiApps.*`, `aiKeys.json`.
- **Email**, once per app (`lib/app-ai/notify.ts`, Setting
  `appai.notified:<projectId>`): the first time a visitor reaches an AI step
  without a key, and by `scripts/notify-ai-keys.ts` for apps that had AI steps
  before this change (run once at deploy; `--dry-run` lists them).

## When there is no key

The step fails with `AppAiError("not_set_up")`: the run log says "No AI key:
this app's AI steps use the app's own AI connection…" and visitors get
**"This app's AI isn't set up yet."** (`runtime.json` `aiNotSetUp`, HTTP 503).
There is never a silent fallback to the platform's AI. `ai_speech` is the one
exception: reading aloud needs no AI, so the page falls back to the browser's
voice (with a warning in the run log).

## Limits and charging

Calls with the app's own key are **not** charged to anyone's AI allowance
(it's their key). Abuse protection stays, per app, in **AI keys → Limits**
(Setting `appai.limits:<projectId>`): AI requests per hour for the whole app
(default `AI_FLOW_HOURLY_LIMIT` or 300) and per visitor address (default
`AI_FLOW_VISITOR_HOURLY_LIMIT` or 120). Each model call counts (an agent run can
make several). Over the limit, visitors read "This app is receiving too many AI
requests right now" (HTTP 429).

## The AI flow steps

All in `src/lib/app-ai/nodes.ts`; every one takes `connection` (a connection
name; default the app's default), `model` (override), `maxTokens`,
`temperature`, `output` (the variable name).

| step | data | result (`vars.<output>`) |
| --- | --- | --- |
| `ai_prompt` | `system`, `prompt` | text (default `ai`) |
| `ai_chat` | `system` (persona), `message`, `context` (extra facts: memories, mood), `safety` (`standard` default, or `none`), `table` + `where` (the conversation's rows; columns `roleField`=role and `contentField`=content), `historyLimit` (20), `save` (default true: saves the message and the reply with the `where` values and `extra`) | the reply text (default `reply`) |
| `ai_structured` | `system`, `prompt`, `schema` (a JSON example or a JSON schema) | the parsed object (default `data`); missing required keys fail the step |
| `ai_vision` | `image` (a `/uploads/…` file, an https address or an image data URL; 6 MB max), `prompt`, `system` | text (default `vision`) |
| `ai_embed` | `input`, `mode` (`single` or `chunks`), `chunkSize` (1200), `extra` | a vector (default `embedding`), or rows `{…extra, content, chunk_index, embedding}` (embedding as JSON text) ready for **Add many rows** (default `chunks`) |
| `ai_search` | `query`, `table`, `field` (`embedding`), `where`, `topK` (5), `minScore`, `scanLimit` (≤1000) | the closest rows without the embedding, each with `score` (default `matches`) |
| `ai_speech` | `text`, `voice` | `{ audio: "data:audio/mpeg;base64,…" or null, browser: bool, text, voice, lang }` (default `speech`); `browser: true` means the page reads it with `speechSynthesis` |
| `ai_agent` | `system`, `prompt` (the goal; starts a task), `message` (a follow-up, added to a continued task), `tools`, `maxSteps` (6, ≤12), `state` (continue from), `decision` (`approve`/`reject` for a waiting action), optional approvals `table` + `extra` | `{ status: "done" \| "needs_approval" \| "step_limit", answer, steps, pending, approvalId, state }` (default `agent`) |

Search by meaning is brute force in memory (cosine over the stored vectors):
it reads at most 1,000 rows per search (filter with `where` to search part of
a bigger table), which suits a knowledge bot of up to about 1,000 pieces of
text. Bigger collections need an outside vector database called over HTTP.

### Agents and approvals

An agent works in a loop: each turn the model answers with one JSON object,
either `{"action":"tool","tool":"…","args":{…},"note":"…"}` or
`{"action":"final","answer":"…"}`. The same protocol works with every provider
and with the platform's AI. Tools:

```json
{ "name": "send_reply", "description": "Send an email reply", "kind": "flow", "flow": "send-reply",
  "params": "to, subject, body", "needsApproval": true }
{ "name": "search_web", "kind": "http", "method": "POST", "url": "https://my-muse.example.com/api/run",
  "headers": { "authorization": "Bearer …" }, "body": "{\"task\":\"{{args.task}}\"}", "params": "task" }
```

A `flow` tool runs another flow of the same app **as the same visitor, with
the same sign-in and role checks** (a visitor's agent can only do what the
visitor could), at most 3 flows deep. An `http` tool calls a public address
(the owner's own services: their self-hosted OpenMuse, a mail provider's API,
a webhook); its headers can carry the service's key (only the owner sees
flows). A tool with `needsApproval` stops the run with `status:
"needs_approval"` and `pending` (and a row in the approvals `table` when one
is set: `tool, args, note, status="pending", state`). A later run with the
saved `state` and `decision: "approve"` runs it (or `reject` skips it) and
carries on. The state is signed for the app (AUTH_SECRET), so a changed or
invented state is refused (400). Save `state`, `steps`, `status` on your task row to show live
progress and to pause, resume or cancel between runs.

### What apps can't do (and the builder says so)

A NullKode app is pages plus server flows. It has no computer, web browser or
terminal of its own, so it can't click through websites, read a mailbox by
itself or run programs the way OpenAI's dots or OpenMuse can. Those parts call
an outside service the owner runs (their self-hosted OpenMuse, a mail
provider's API, an inbound-email webhook) over HTTP, or are left out. Long
work runs a few steps at a time (a scheduled flow, or while the page is open),
not continuously. Replies don't stream to the page: a flow answers when it is
done.

## Building AI products

The planner, flow builder, page builder and Ask AI use the playbook in
`src/lib/ai/ai-products-guide.ts` whenever an idea or a plan is about AI: AI
companions (like Grok's Ani), personal agents (like OpenAI's dots),
OpenMuse-style agent apps, chatbots and knowledge bots. Plans list
`aiFeatures`, AI flows have kind `ai`, and honest limits go in the plan's
assumptions. The features **AI companion**, **Personal AI agent** and
**Knowledge bot** (`src/lib/modules/definitions/ai-*.ts`, `knowledge-bot.ts`)
are ready-made versions.

The build rule (`src/lib/ai/build-policy.ts`) allows AI companions, chatbots
and personal agents; it still refuses app/website/AI-app builders, clones of
NullKode LLC's named products and IgniteUps-style AI dealership, calling,
SMS and CRM suites.

## Partner API

`GET/POST/DELETE /api/partner/v1/projects/{id}/ai-connection` (key
write-only), and an `ai` block on plan and build runs (`usesAi`, `needsKey`,
`notice`). See docs/partner-api.md.
