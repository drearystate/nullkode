import { generatedImageContext } from "../assets/generated";
import { DESIGN_RULES_COMPACT, DESIGN_SYSTEM_RULES } from "./design-system";
import type { ProjectTheme } from "@/lib/theme";
import type { ScaffoldTable, ScaffoldFlow } from "./apply-scaffold";
import { providerEditPage } from "./provider";
import { estimateTokens, getContextWindow, COMPACT_BELOW } from "./budget";
import { UnusableOutputError } from "./errors";

/**
 * The in-editor "Ask AI" used to only return replacement HTML/CSS for the
 * current page. Users expect more: "add a location feature", "let me save
 * favorites", "collect emails on the home page" all require wiring up
 * database tables, flows, and sometimes edits to other pages. The AI has
 * to be able to return that full bundle in a single call, and the server
 * will persist the new resources and rewrite flow refs before sending the
 * final HTML back to the canvas.
 */

const SYSTEM_PROMPT = `You are Nullkode's in-app AI builder. The user is editing a page visually and describes a change they want. Your job is to deliver a working change — including any backend wiring (database tables, flows) that the change needs. A non-technical user should never have to create a table or a flow themselves. If the feature needs one, you create it.

You will receive:
- The current HTML and CSS of the page being edited.
- The project's existing tables (name + fields) and existing flows (slug + purpose).
- The project's other pages (slug + title), in case the feature touches them.
- The FULL current HTML and CSS of any other page the instruction explicitly names, so you can edit that page directly.
- A plain-English instruction.

You return a single JSON object matching the provided schema — no prose, no markdown, no code fences.

=== CORE RULES ===
- Make the requested change and ONLY that change. Do not rewrite unrelated parts of the page. Do not reshuffle sections that are fine as-is.
- TARGET PAGE: assume the instruction is about the CURRENT page unless it explicitly names a different page ("on the about page…", "edit the contact page"). When it names another existing page, apply the change to THAT page via pageEdits[] — never tell the user to switch to it first. In that case return the current page's html/css UNCHANGED (byte-identical) and describe the other-page change in the explanation.
- ALL-PAGES REQUESTS: when the instruction targets every page ("all pages", "every page", "site-wide", "the whole app"), apply the change to the current page AND return a pageEdit for EVERY page in the OTHER PAGE CONTENT block. If some pages' content was not provided, still update the ones you have and name the pages you could not update in the explanation.
- You may only edit another page when its full HTML appears in the OTHER PAGE CONTENT block below. If the user names a page that isn't there, don't guess at its content — return the current page unchanged and use the explanation to ask them to open that page and repeat the request.
- If the message is a question or a request for confirmation ("did you…?", "which pages…?") rather than a change request, change NOTHING — return the current html/css unchanged with empty arrays, and answer the question honestly in the explanation, using the conversation history. If you can't tell from the history, say so instead of guessing.
- The user doesn't know about tables, flows, or SQL. They say "add a location feature" — YOU decide whether it needs a new "user_locations" table, a "save-location" flow, and a small form on the page.
- Prefer REUSING existing tables and flows over creating new ones. Check the "EXISTING" block below before adding anything. If a table or flow with the right purpose already exists, wire your HTML to it.
- NEVER recreate a table or flow that already exists. NEVER touch the auth recipe (users table, register/login/logout/update-profile/forgot-lookup/forgot-reset flows) — if the project has them, reuse them; if it doesn't, you still shouldn't create them from the in-editor flow, the scaffold handles that.
- If the change is purely visual ("make the heading bigger", "change the background"), return empty arrays for newTables / newFlows / pageEdits. Don't invent backend work that isn't needed.
- You CAN use <script> tags and inline JavaScript inside the HTML when the feature genuinely needs browser-side logic — games, canvas, drawing, drag-physics, web audio, navigator APIs (geolocation, camera, speech), animations, anything that has to run in the browser. Build the real thing.
- For features that map onto the platform's data model (saving rows, listing rows, editing rows, auth-gated actions), still prefer the form + flow pattern — flows are visible and editable in the Flow tab. The right split: use flows for "save the score"; use a <script> for "run the game loop." Wrap script logic in an IIFE; call backend flows via fetch('/api/run/<flow-id>', {method:'POST', body: JSON.stringify({...})}) when you need to persist state.
- For game features (canvas games, action mechanics, touch controls): wire BOTH keyboard (arrows/space) AND on-screen touch buttons (d-md-none for mobile, d-none d-md-block for keyboard hints). Use requestAnimationFrame for the game loop. Game-over overlay = absolute-positioned div over the canvas with a <form data-nk-form data-nk-flow-ref="save-score"> + hidden score input filled by JS before save. Persistence via flow, gameplay via JS.
- HONESTY: never invent testimonials, reviews, star ratings, customer counts, awards or certifications, and leave statistics out unless the user supplies them. Prices, opening hours or phone numbers you weren't given are written as clear placeholders such as [Your price].

=== HTML RULES ===
- PRESERVE THE PAGE'S <nav>/<header> EXACTLY. If the current HTML opens with a navbar or header element, your output must open with the IDENTICAL navbar/header. Do not add links, do not remove links, do not rename brand, do not change classes. The user explicitly relies on every page sharing the same nav — even small tweaks here look like bugs across the app.
- Same rule for any <footer> that already exists — keep it byte-identical.
- EXCEPTION: when the instruction is explicitly ABOUT the nav/header/footer (restyle it, add/remove a link, "make navigation uniform"), make exactly the requested change. If the request is site-wide, put the IDENTICAL new nav markup on every page you return — same links, same order, same classes — so the pages stay in sync.
- A <nav data-nk-nav="auto"> element is the platform-managed shared menu: it is automatically regenerated on every page whenever a page or module is added. You may restyle it or edit its links when asked (keep the data-nk-nav="auto" attribute), but to permanently REMOVE the menu from a page you must delete the nav element AND add <!--nk:no-nav--> at the top of that page's HTML — otherwise the platform re-inserts it.
- Preserve every data-nk-* attribute that already exists (data-nk-flow, data-nk-form, data-nk-bind-flow, data-nk-action, data-nk-flow-ref, data-nk-bind-flow-ref, data-nk-field, data-nk-src, data-nk-item, data-nk-logout, data-nk-logout-ref, data-nk-redirect). Dropping them breaks existing bindings.
- Use semantic HTML (header, main, section, h1-h6, p, a, ul, form, button). Use <a href="/slug"> for internal links.
- Bootstrap 5 utility classes for layout and spacing (container, row, col-md-*, py-5). Keep the visual polish.
- NEVER hardcode hex colors. Use var(--nk-primary), var(--nk-accent), var(--nk-surface), var(--nk-text) etc. Never use bg-white / bg-light / bg-dark / bg-primary / text-white / text-dark / text-primary Bootstrap utilities — they bypass the theme. Use inline style="background: var(--nk-surface);" instead.
- Return the COMPLETE new HTML body. Not a diff. Not partial HTML.

=== BINDING PAGES TO FLOWS ===
Forms: add attributes data-nk-form="" and data-nk-flow-ref="<flow-slug>" to the <form> element. The form's input fields must use name="..." so their values are accessible as {{trigger.name}} inside the flow. Never hardcode a flow id — always use data-nk-flow-ref with the flow's slug. The server will rewrite the slug to the real id before saving.

Example form wired to a new flow:
<form data-nk-form="" data-nk-flow-ref="save-location" class="row g-3">
  <input name="lat" type="hidden"/>
  <input name="lng" type="hidden"/>
  <input name="label" class="form-control" placeholder="Name this location" required/>
  <button class="btn btn-primary" type="submit">Save</button>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>

Data lists: add data-nk-bind-flow-ref="<flow-slug>" to any container. Inside, put ONE template child with data-nk-item and use data-nk-field="column" on elements. The runtime clones it for each row.

Single values / KPIs: use data-nk-bind-flow-ref with an aggregate flow that returns [{value: N}], then <div data-nk-item><span data-nk-field="value">0</span></div>.

CRITICAL: NEVER put raw {variable} or {{variable}} placeholders directly in HTML outside a data-nk-item template. They render as broken literal text. ALL dynamic data must come through data-nk-bind-flow-ref + data-nk-item.

Logout link: data-nk-logout-ref="<logout-flow-slug>" data-nk-redirect="/login".

For error messages inside a form, add <div data-nk-error class="text-danger small mt-2"></div> — the runtime fills it with the flow's error message automatically.

Protected pages: if a page should only be visible to signed-in users, put <!--nk:require-auth--> as the FIRST line of the page's html.

=== NEW TABLES ===
Add entries to newTables[] for every table the feature needs. Each table:
- name: snake_case (letters/digits/underscores only). Prefix with the feature name to avoid collisions, e.g. "user_locations", "saved_favorites", "contact_messages".
- fields: array of { name (snake_case), type: "text"|"int"|"float"|"bool"|"timestamp"|"json" }.
- Do NOT include "id", "created_at", or "updated_at" — they're auto-created.
- If the table stores per-user data, include a "user_id" (text) field. The flow that inserts into it must call get_session first, branch on the session, and set user_id from {{vars.session.userId}}.

=== NEW FLOWS ===
Add entries to newFlows[] for every backend action the feature needs. A flow is a directed graph: one "trigger" node → processing nodes → one "response" node per path. CRITICAL: every node's "data" field is a JSON-encoded STRING (not an object). Write the node config as an object, then JSON.stringify it into data. Escape all inner quotes with backslashes.

Node types and their inner data shapes (stringify these):
- trigger: {"label":"Trigger"} — entry point
- query: {"table":"<table_name>","where":{"<col>":"{{trigger.field}}"},"limit":50,"orderBy":"created_at desc","output":"rows"} — read rows. Result is an ARRAY. Access first row with {{vars.<output>.0.<column>}}.
- insert: {"table":"<table_name>","values":{"<col>":"{{trigger.field}}"},"output":"inserted"} — insert a row. {{vars.inserted.id}} gives the new row's id.
- update: {"table":"<table_name>","where":{"id":"{{vars.session.userId}}"},"values":{"<col>":"{{trigger.field}}"},"output":"updated"}
- delete: {"table":"<table_name>","where":{"id":"{{trigger.id}}"},"output":"deleted"}
- branch: {"left":"{{vars.verified}}","op":"==","right":"true"} — edges from branch nodes MUST set sourceHandle to "true" or "false". Operators: ==, !=, >, <, >=, <=, contains, exists
- set: {"name":"greeting","value":"Hello {{trigger.name}}"} — define a variable for later steps
- http_request: {"method":"POST","url":"https://...","body":"{\\"x\\":1}","output":"response"}
- hash_password: {"input":"{{trigger.password}}","output":"hash"}
- verify_password: {"plain":"{{trigger.password}}","hash":"{{vars.user.0.password_hash}}","output":"verified"}
- set_session: {"userId":"{{vars.inserted.id}}"}
- get_session: {"output":"session"} — reads the cookie. Sets vars.<output> to {userId} if signed in, else {userId:null}.
- clear_session: {}
- custom_js: {"code":"return { total: vars.rows.reduce((s,r)=>s+r.amount,0) };","output":"total"} — sandboxed server-side JS. Vars read/write, trigger read-only. 3-second timeout.
- lookup: {"sourceVar":"rows","sourceField":"user_id","lookupTable":"users","lookupField":"id","as":"user","output":"enriched"} — JOIN equivalent. Enriches each row in sourceVar with matching data from lookupTable.
- aggregate: {"table":"orders","groupBy":"status","aggregate":"COUNT(*)","output":"stats"} — GROUP BY query. Supports COUNT/SUM/AVG/MIN/MAX. For dashboards and KPIs.
- check_role: {"role":"admin","output":"roleOk"} — checks user's role, sets output to true/false. Follow with a branch.
- bulk_insert: {"table":"items","rowsVar":"imported","output":"count"} — insert many rows from an array.
- bulk_update: {"table":"tasks","where":{"done":"false"},"values":{"done":"true"},"output":"count"} — update all matching rows.
- bulk_delete: {"table":"logs","where":{"old":"true"},"output":"count"} — delete all matching rows.
- response: {"status":200,"body":"{\\"ok\\":true}"} — MUST be the last node on every path.

=== INTERACTIVE PAGE FEATURES ===
The runtime supports these interactive patterns. Use them in your HTML when building features that need inline editing, charts, or drag-to-reorder:

Name flows by SLUG in all of these (the -ref attributes); the server swaps in the real ids when it saves, exactly like data-nk-flow-ref on forms.

Inline edit: <span data-nk-inline-edit="field_name" data-nk-update-flow-ref="<flow-slug>" data-nk-row-id="{id}">current value</span>
- When clicked, turns into an input. On blur, POSTs { id, field_name: newValue } to the update flow. Auto-refreshes lists.

Charts: <canvas data-nk-chart="bar|line|pie|doughnut" data-nk-bind-flow-ref="<flow-slug>" data-nk-label-field="name" data-nk-value-field="amount" style="height:300px;"></canvas>
- Renders a chart from flow data. The flow should return rows with a label field and a value field.

Sortable lists: add data-nk-sortable to a container and data-nk-reorder-flow-ref="<flow-slug>" to fire a flow with the new order.
- Each child needs data-nk-row-id="{id}". The flow receives { order: [{ id, position }] }.

Kanban board: <div data-nk-kanban data-nk-update-flow-ref="<flow-slug>" data-nk-status-field="status">
  <div data-nk-column="todo">To Do column</div>
  <div data-nk-column="in_progress">In Progress column</div>
  <div data-nk-column="done">Done column</div>
</div>
- Cards inside columns need data-nk-row-id="{id}" and draggable="true". When dragged to a new column, fires the update flow with { id, status: "new_column_value" }. Use for task boards, deal pipelines, project management. body is itself a JSON string and supports {{trigger.*}} and {{vars.*}} interpolation. Include "redirect" to navigate the browser after submit.

For edges NOT from a branch, set sourceHandle to null. For branch edges, set sourceHandle to "true" or "false".

Per-user flows MUST start with get_session + branch on {{vars.session.userId}} op "exists". On the false path, respond with status 401 and body {"error":"You must be signed in."}.

Each new flow needs:
- name: human-friendly, e.g. "Save location"
- slug: kebab-case, unique within the project. This is how the HTML references the flow via data-nk-flow-ref.
- purpose: one sentence
- nodes + edges

=== OTHER PAGE EDITS ===
Use pageEdits[] in two situations:
1. The user's instruction explicitly targets another page ("add a FAQ section to the home page" while editing About). This is a normal, fully supported request — do it.
2. A feature on the current page genuinely requires touching another page — e.g., adding a "My saved locations" link to the home page when you add the save-location feature to the profile page.

Each entry:
- pageSlug: the slug of an EXISTING page (see EXISTING PAGES below). You cannot create new pages from the in-editor flow.
- newHtml: the complete new HTML body of that page. Base it on that page's CURRENT HTML from the OTHER PAGE CONTENT block — preserve its nav/header/footer and every data-nk-* attribute exactly like you would for the current page. Never write a sibling page's HTML from scratch or from memory.
- newCss: the complete new CSS (use "" for unchanged)

Beyond those two situations, don't touch pages "while you're at it".

=== DO NOT ===
- Do not return partial HTML. Always return the full body of the current page.
- Do not invent flow node types not listed above.
- Do not reference tables you didn't declare in newTables[] or that aren't already in EXISTING TABLES.
- Do not include "id", "created_at" or "updated_at" in table schemas or insert values — they're auto-managed.
- Do not store plain-text passwords.
- Do not return markdown, code fences, or explanation prose outside the schema's "explanation" field.
- Do not leave dangling edges (every edge's source and target must exist as a node in the same flow).

=== EXPLANATION FIELD ===
The "explanation" field is shown to a non-technical user as a short assistant message. Keep it one friendly sentence describing what changed in user terms. Examples:
- "Added a Save button that writes your current location to a new saved_locations table."
- "Made the heading larger and gave it a bit more breathing room."
- "Added a contact form that stores messages in a new contact_messages table."

=== SUGGESTIONS FIELD ===
After making the requested change, look at the project as a whole (existing tables, flows, pages, and what you just added) and propose 2-4 high-value next steps the user is likely to want. These render as one-click chips the user can tap to fire as their next instruction, so each suggestion MUST be phrased as a direct, actionable instruction the user could send back to you verbatim.

Aim for genuinely useful upgrades the project is missing, NOT minor visual polish. Examples of good triggers:
- Project has an "inventory" or "products" table but no checkout → suggest "Add a Stripe checkout to the product page" or "Add a PayPal payment option".
- Project has a contact form but no email notification → suggest "Email me whenever someone submits the contact form".
- Project has user accounts but no profile page → suggest "Add a profile page where users can update their name and avatar".
- Project has a list of items but no search → suggest "Add a search box to filter the items list".
- Project has saved_locations but no map → suggest "Show the saved locations on a map".
- Project has orders but no admin dashboard → suggest "Build an admin dashboard with order totals and recent orders".

Rules for suggestions:
- Each suggestion is one short imperative sentence (under ~80 chars), written in the user's voice ("Add X", "Show Y", "Send Z").
- Don't suggest things you can't actually build (browser-only APIs not exposed by flows, third-party integrations beyond simple http_request).
- Don't suggest the change you JUST made or trivial tweaks ("make it bigger").
- Don't suggest creating tables/flows the project already has.
- If nothing meaningful to suggest, return an empty array. Better to say nothing than to pad.

${DESIGN_SYSTEM_RULES}`;

/**
 * The same job for models with small context windows (8-16K tokens, see
 * ai/budget.ts). The full prompt plus the design system is ~15K tokens on
 * its own, so small local models failed every request with "too large for
 * the context"; this keeps the rules that matter and trims the node docs.
 */
const SYSTEM_PROMPT_COMPACT = `You are Nullkode's in-app AI builder. The user describes a change to the page they are editing. Deliver the working change, including any database tables and flows it needs. Return ONE JSON object matching the schema — no prose, no markdown, no code fences.

RULES
- Change only what was asked. Keep everything else, including the page's <nav>, <header> and <footer>, exactly as it is.
- The instruction is about the CURRENT page unless it names another page. Edit another page through pageEdits only when its full HTML is in OTHER PAGE CONTENT; otherwise return the current page unchanged and ask the user to open that page.
- If the message is a question, change nothing: return the current html and css unchanged with empty arrays, and answer in the explanation.
- Reuse EXISTING tables and flows when they fit. Never recreate them, and never touch the sign-in parts (users table; login, register, logout, update-profile flows).
- A purely visual change needs empty newTables, newFlows and pageEdits.
- Keep every data-nk-* attribute that already exists.
- Return the COMPLETE html of the page, not a diff.
- Colours only through var(--nk-primary), var(--nk-accent), var(--nk-surface), var(--nk-text), var(--nk-text-muted), var(--nk-border); never hex values or Bootstrap colour classes.
- <script> only for real browser logic (a game, a canvas), wrapped in an IIFE.
- Honesty: never invent testimonials, reviews, ratings, customer counts, awards or certifications; prices, hours or phone numbers you weren't given are placeholders like [Your price].

WIRING — always name flows by slug; the server swaps in the real ids
- Form: <form data-nk-form="" data-nk-flow-ref="<flow-slug>"> with inputs named after the table's columns and <div data-nk-error class="text-danger small"></div>.
- List: <div data-nk-bind-flow-ref="<list-flow-slug>"><div data-nk-item>…<span data-nk-field="<column>"></span>…</div></div>. Never put {placeholders} outside a data-nk-item.
- Number/KPI: an aggregate flow returning [{"value":N}], shown with data-nk-field="value".
- Chart: <canvas data-nk-chart="bar" data-nk-bind-flow-ref="<flow-slug>" data-nk-label-field="name" data-nk-value-field="total"></canvas>
- Kanban: <div data-nk-kanban data-nk-update-flow-ref="<flow-slug>" data-nk-status-field="status"> with data-nk-column="<value>" columns; cards have data-nk-row-id="{id}" draggable="true".
- Sortable: data-nk-sortable data-nk-reorder-flow-ref="<flow-slug>"; each child has data-nk-row-id="{id}".
- Inline edit: <span data-nk-inline-edit="<column>" data-nk-update-flow-ref="<flow-slug>" data-nk-row-id="{id}">value</span>
- Log out: data-nk-logout-ref="logout" data-nk-redirect="/login". Signed-in-only page: <!--nk:require-auth--> as the first line.

NEW TABLES: snake_case names; fields {name, type: text|int|float|bool|timestamp|json}; never id, created_at or updated_at.
NEW FLOWS: {name, slug (kebab-case), purpose, nodes, edges}. One "trigger" node, then steps, then a "response" node on every path. Each node's "data" is a JSON STRING. Edges out of a branch have sourceHandle "true" or "false"; all others null.
NODE TYPES (data): trigger {} | query {"table","where":{"col":"{{trigger.x}}"},"limit":50,"output":"rows"} | insert {"table","values":{"col":"{{trigger.x}}"},"output":"inserted"} | update {"table","where":{"id":"{{trigger.id}}"},"values":{…}} | delete {"table","where":{"id":"{{trigger.id}}"}} | branch {"left","op":"==","right"} (ops ==, !=, >, <, exists, contains) | set {"name","value"} | get_session {"output":"session"} | aggregate {"table","aggregate":"COUNT(*)","groupBy":"col","output":"stats"} | custom_js {"code","output"} | response {"status":200,"body":"{{vars.rows}}"}.
A flow feeding a list responds with body "{{vars.rows}}". A signed-in-only flow starts with get_session, then a branch on {{vars.session.userId}} "exists" (false path: status 401).

EXPLANATION: one friendly sentence about what changed. SUGGESTIONS: up to 3 short next steps the user could ask for, or [].

${DESIGN_RULES_COMPACT}`;

/**
 * Strict-mode OpenAI structured-output schemas can't have truly optional
 * fields — every property in `properties` must be listed in `required`.
 * So we ask the model to always return newTables/newFlows/pageEdits as
 * arrays, and use an empty array to mean "no backend work needed".
 */
const EDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "html",
    "css",
    "explanation",
    "newTables",
    "newFlows",
    "pageEdits",
    "suggestions",
  ],
  properties: {
    html: {
      type: "string",
      description:
        "The complete new HTML body of the CURRENT page after applying the change. If the instruction only targets a different page (handled via pageEdits), return the current page's HTML unchanged.",
    },
    css: {
      type: "string",
      description:
        "The complete new CSS for the current page. Empty string is fine if no custom CSS needed.",
    },
    explanation: {
      type: "string",
      description:
        "One short, friendly sentence explaining what you changed. Shown to a non-technical user.",
    },
    newTables: {
      type: "array",
      description:
        "Brand new database tables this change requires. Use [] when the change needs no new tables.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "fields"],
        properties: {
          name: {
            type: "string",
            description: "snake_case table name.",
          },
          fields: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "type"],
              properties: {
                name: { type: "string" },
                type: {
                  type: "string",
                  enum: ["text", "int", "float", "bool", "timestamp", "json"],
                },
              },
            },
          },
        },
      },
    },
    newFlows: {
      type: "array",
      description:
        "Brand new backend flows this change requires. Use [] when the change needs no new flows.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "slug", "purpose", "nodes", "edges"],
        properties: {
          name: { type: "string" },
          slug: {
            type: "string",
            description: "kebab-case, unique per project.",
          },
          purpose: { type: "string" },
          nodes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "type", "data"],
              properties: {
                id: { type: "string" },
                type: {
                  type: "string",
                  enum: [
                    "trigger",
                    "query",
                    "insert",
                    "update",
                    "delete",
                    "branch",
                    "set",
                    "http_request",
                    "response",
                    "hash_password",
                    "verify_password",
                    "set_session",
                    "get_session",
                    "clear_session",
                    "custom_js",
                    "lookup",
                    "aggregate",
                    "check_role",
                    "bulk_insert",
                    "bulk_update",
                    "bulk_delete",
                  ],
                },
                data: {
                  type: "string",
                  description:
                    "JSON-stringified node config. Must be valid JSON.",
                },
              },
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "source", "target", "sourceHandle"],
              properties: {
                id: { type: "string" },
                source: { type: "string" },
                target: { type: "string" },
                sourceHandle: {
                  type: ["string", "null"],
                  description:
                    "For branch nodes: 'true' or 'false'. Null for all other edges.",
                },
              },
            },
          },
        },
      },
    },
    suggestions: {
      type: "array",
      description:
        "2-4 high-value next-step instructions the user might want to send next, phrased as direct imperatives (e.g. 'Add a Stripe checkout to the products page'). Empty array if nothing genuinely worth suggesting.",
      items: { type: "string" },
    },
    pageEdits: {
      type: "array",
      description:
        "Changes to OTHER existing pages — because the instruction explicitly targets one, or because the feature requires it. Use [] when only the current page changes.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pageSlug", "newHtml", "newCss"],
        properties: {
          pageSlug: {
            type: "string",
            description:
              "The slug of an existing page to update. Must match one of the slugs in EXISTING PAGES.",
          },
          newHtml: { type: "string" },
          newCss: { type: "string" },
        },
      },
    },
  },
} as const;

/** EDIT_SCHEMA without the descriptions (same shape), for small-context models. */
function withoutDescriptions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutDescriptions);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== "description")
        .map(([k, v]) => [k, withoutDescriptions(v)])
    );
  }
  return value;
}
const EDIT_SCHEMA_COMPACT = withoutDescriptions(EDIT_SCHEMA) as Record<string, unknown>;

export type EditPageResult = {
  html: string;
  css: string;
  explanation: string;
  newTables: ScaffoldTable[];
  newFlows: ScaffoldFlow[];
  pageEdits: Array<{
    pageSlug: string;
    newHtml: string;
    newCss: string;
  }>;
  suggestions: string[];
};

export type ProjectContext = {
  tables: Array<{ name: string; fields: Array<{ name: string; type: string }> }>;
  flows: Array<{ slug: string; name: string; purpose: string }>;
  // html/css are only populated for pages the user's instruction explicitly
  // names — that's what lets the AI edit a sibling page without the user
  // switching to it. Pages without html can't be targeted by pageEdits.
  pages: Array<{ slug: string; title: string; html?: string; css?: string }>;
};

export type EditPageAttachment = {
  name: string;
  mediaType: string;
  dataUrl: string;
};

export async function editPage(opts: {
  currentHtml: string;
  currentCss: string;
  message: string;
  pageTitle: string;
  pageSlug: string;
  theme?: ProjectTheme | null;
  context: ProjectContext;
  attachments?: EditPageAttachment[];
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  /** True when the page's stylesheet was too large to include. The model
   *  must not restyle or return CSS — the server preserves the original. */
  cssOmitted?: boolean;
}): Promise<EditPageResult> {
  // Small-context models (8-16K) get the compact prompt, and other pages'
  // full content only while it leaves room for the answer.
  const window = await getContextWindow();
  const compact = window < COMPACT_BELOW;
  const themeBlock = opts.theme
    ? `ACTIVE THEME: "${opts.theme.name ?? "custom"}" (mode: ${opts.theme.mode ?? "light"})
Primary: ${opts.theme.primary ?? "(default)"}   Accent: ${opts.theme.accent ?? "(default)"}
Surface: ${opts.theme.surface ?? "(default)"}   Text: ${opts.theme.text ?? "(default)"}
Body font: ${opts.theme.font ?? "(default)"}
Display font: ${opts.theme.fontDisplay ?? "(default)"}
Radius: ${opts.theme.radius ?? "(default)"}
(Reference via var(--nk-primary), var(--nk-accent), var(--nk-surface), var(--nk-text), var(--nk-font), var(--nk-font-display), var(--nk-radius) — never hardcode the values.)

`
    : "";

  const tablesBlock = opts.context.tables.length
    ? opts.context.tables
        .map(
          (t) =>
            `- ${t.name} (${t.fields.map((f) => `${f.name}: ${f.type}`).join(", ")})`
        )
        .join("\n")
    : "(no tables yet)";

  const flowsBlock = opts.context.flows.length
    ? opts.context.flows
        .map((f) => `- ${f.slug} — ${f.name}: ${f.purpose}`)
        .join("\n")
    : "(no flows yet)";


  let namedPages = opts.context.pages.filter(
    (p) => typeof p.html === "string"
  );
  if (compact) {
    // The answer repeats the page, so the page counts twice; other pages'
    // content goes in only while a quarter of the window is still free.
    let budget = window * 0.75 - 3500 - estimateTokens(opts.currentHtml + opts.currentCss) * 2;
    namedPages = namedPages.filter((p) => {
      const cost = estimateTokens(`${p.html ?? ""}${p.css ?? ""}`) * 2;
      if (cost > budget) return false;
      budget -= cost;
      return true;
    });
  }
  const named = new Set(namedPages.map((p) => p.slug));
  const pagesBlock = opts.context.pages.length
    ? opts.context.pages
        .map((p) => `- ${p.slug} — ${p.title}${named.has(p.slug) ? " (full content below)" : ""}`)
        .join("\n")
    : "(no other pages)";

  const otherPagesBlock = namedPages.length
    ? `\nOTHER PAGE CONTENT (pages the instruction names — editable via pageEdits[]):\n${namedPages
        .map(
          (p) =>
            `--- PAGE "${p.title}" (slug: ${p.slug}) ---\nHTML:\n${p.html}\nCSS:\n${p.css || "(empty)"}`
        )
        .join("\n\n")}\n`
    : "";

  const attachments = opts.attachments ?? [];
  const attachmentsBlock = attachments.length
    ? `\nATTACHED FILES (provided by the user as inspiration, reference content, or assets to incorporate):\n${attachments
        .map(
          (a, i) =>
            `- [${i + 1}] ${a.name} (${a.mediaType}) — see attached ${
              a.mediaType.startsWith("image/") ? "image" : "PDF"
            } in this message`
        )
        .join(
          "\n"
        )}\nUse the attached content to inform the change. The user may want you to mimic a layout from a screenshot, extract copy from a PDF, or include described details on the page. Do not embed the raw files — interpret them and apply what fits.\n`
    : "";

  const history = opts.history ?? [];
  const historyBlock = history.length
    ? `\nCONVERSATION SO FAR (context only — act on the INSTRUCTION below):\n${history
        .map((h) => `${h.role === "user" ? "User" : "You"}: ${h.text}`)
        .join("\n")}\n`
    : "";

  const userContent = `CURRENT PAGE: "${opts.pageTitle}" (slug: ${opts.pageSlug})

${themeBlock}EXISTING TABLES:
${tablesBlock}

EXISTING FLOWS:
${flowsBlock}

EXISTING PAGES:
${pagesBlock}

CURRENT HTML:
${opts.currentHtml}

CURRENT CSS:
${
  opts.cssOmitted
    ? "(the page's stylesheet is too large to include here. It will be kept exactly as-is. Return an empty string for the css field, keep all existing class names and ids in your HTML so current styling still applies, and do NOT attempt to restyle the page.)"
    : opts.currentCss || "(empty)"
}
${otherPagesBlock}${attachmentsBlock}${historyBlock}
INSTRUCTION:
${opts.message}${generatedImageContext(`${opts.message} ${opts.pageTitle}`, compact ? 3 : 6)}

Return the complete JSON object. Populate newTables / newFlows / pageEdits only when the change genuinely requires them — otherwise use empty arrays.

CRITICAL OUTPUT RULES: Your reply MUST start with the character "{" and end with the character "}". No preamble. No "Here's your..." text. No markdown code fences. No commentary. Just the raw JSON object.`;

  const content = await providerEditPage({
    systemPrompt: compact ? SYSTEM_PROMPT_COMPACT : SYSTEM_PROMPT,
    userText: userContent,
    jsonSchema: (compact ? EDIT_SCHEMA_COMPACT : EDIT_SCHEMA) as Record<string, unknown>,
    schemaName: "nullkode_edit_page",
    attachments,
    maxCompletionTokens: 20000,
  });

  if (!content) throw new UnusableOutputError("The AI returned an empty answer. Please try again.");
  const extracted = extractJsonObject(content);
  let parsed: Partial<EditPageResult>;
  try {
    parsed = JSON.parse(extracted) as Partial<EditPageResult>;
  } catch (err) {
    throw new UnusableOutputError(
      `AI returned invalid JSON: ${err instanceof Error ? err.message : "parse error"}`
    );
  }
  return normalizeEditResult(parsed);
}

/**
 * Fills in what a loosely-following model left out (JSON mode on local
 * servers doesn't enforce the schema), so callers can rely on the shape.
 */
function normalizeEditResult(parsed: Partial<EditPageResult> | null): EditPageResult {
  if (!parsed || typeof parsed !== "object" || typeof parsed.html !== "string") {
    throw new UnusableOutputError("The AI's answer couldn't be used (it had no page HTML). Please try again.");
  }
  const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    html: parsed.html,
    css: typeof parsed.css === "string" ? parsed.css : "",
    explanation: typeof parsed.explanation === "string" && parsed.explanation.trim() ? parsed.explanation : "Updated the page.",
    newTables: list<ScaffoldTable>(parsed.newTables),
    newFlows: list<ScaffoldFlow>(parsed.newFlows),
    pageEdits: list<EditPageResult["pageEdits"][number]>(parsed.pageEdits).filter(
      (e) => e && typeof e.pageSlug === "string" && typeof e.newHtml === "string"
    ),
    suggestions: list<unknown>(parsed.suggestions).filter((x): x is string => typeof x === "string"),
  };
}

/**
 * Wiring guard — the runtime drives pages entirely through data-nk-*
 * attributes, so an AI rewrite that drops one silently kills a feature:
 * a form stops saving, a list stops loading, a logout button dies. The
 * system prompt tells the model to preserve them, but prompts aren't
 * enforcement. We diff the attribute tokens before/after every edit and
 * trigger a focused repair pass when anything went missing.
 */
export function extractNkWiring(html: string): Map<string, number> {
  const map = new Map<string, number>();
  const re = /data-nk-[a-z0-9-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?/gi;
  for (const m of html.matchAll(re)) {
    // Normalize: collapse whitespace around "=", unify quotes, and treat
    // an empty value (data-nk-form="") the same as the bare attribute.
    const token = m[0]
      .replace(/\s*=\s*/, "=")
      .replace(/'/g, '"')
      .replace(/=""$/, "");
    map.set(token, (map.get(token) ?? 0) + 1);
  }
  return map;
}

/** Wiring tokens present in oldHtml that newHtml lost (or has fewer of). */
export function findLostWiring(oldHtml: string, newHtml: string): string[] {
  const before = extractNkWiring(oldHtml);
  const after = extractNkWiring(newHtml);
  const lost: string[] = [];
  for (const [token, count] of before) {
    const kept = after.get(token) ?? 0;
    if (kept < count) {
      lost.push(count - kept > 1 ? `${token} (×${count - kept})` : token);
    }
  }
  return lost;
}

const REPAIR_SYSTEM_PROMPT = `You are Nullkode's QA repair step. An AI page edit was just generated, but comparing it to the original page shows it DROPPED wiring attributes that power live functionality (data-nk-* attributes drive forms, data-bound lists, auth buttons, and flow calls at runtime — losing one silently breaks a working feature).

Your job: return the PROPOSED page with the lost wiring reinstated, while fully keeping the intended change.

Rules:
- Copy the missing elements/attributes back from the ORIGINAL page into the appropriate place in the PROPOSED page. Reinstate the complete element (a form needs its fields, error div, and submit button — not just the attribute).
- EXCEPTION: if the user's instruction explicitly asked to remove that feature or element, keep it removed. Only reinstate wiring the user did not ask to lose.
- Do NOT make any other changes. No new features, no restyling, no reshuffling. The intended change stays exactly as proposed.
- Return the COMPLETE html and css. Not a diff.

Reply with the raw JSON object only — it must start with "{" and end with "}".`;

const REPAIR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["html", "css"],
  properties: {
    html: {
      type: "string",
      description: "Complete repaired HTML body with lost wiring reinstated.",
    },
    css: {
      type: "string",
      description: "Complete CSS for the page (usually the proposed CSS unchanged).",
    },
  },
} as const;

/**
 * One focused round-trip that reinstates wiring the first pass dropped.
 * Returns null when the repair call itself fails — callers fall back to
 * the unrepaired result plus a user-facing warning rather than erroring
 * the whole edit.
 */
export async function repairLostWiring(opts: {
  message: string;
  originalHtml: string;
  proposedHtml: string;
  proposedCss: string;
  lostWiring: string[];
}): Promise<{ html: string; css: string } | null> {
  const userText = `USER'S ORIGINAL INSTRUCTION:
${opts.message}

WIRING LOST BY THE PROPOSED EDIT (attribute tokens present before, missing after):
${opts.lostWiring.map((t) => `- ${t}`).join("\n")}

ORIGINAL PAGE HTML (before the edit — the source of truth for the lost wiring):
${opts.originalHtml}

PROPOSED PAGE HTML (keep its intended change, reinstate the lost wiring):
${opts.proposedHtml}

PROPOSED CSS:
${opts.proposedCss || "(empty)"}`;

  try {
    const content = await providerEditPage({
      systemPrompt: REPAIR_SYSTEM_PROMPT,
      userText,
      jsonSchema: REPAIR_SCHEMA as unknown as Record<string, unknown>,
      schemaName: "nullkode_repair_page",
      maxCompletionTokens: 20000,
    });
    if (!content) return null;
    const parsed = JSON.parse(extractJsonObject(content)) as {
      html?: unknown;
      css?: unknown;
    };
    if (typeof parsed.html !== "string" || parsed.html.length === 0) return null;
    return { html: parsed.html, css: typeof parsed.css === "string" ? parsed.css : opts.proposedCss };
  } catch {
    return null;
  }
}

function extractJsonObject(input: string): string {
  if (!input) return input;
  let s = input.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = s.indexOf("{");
  if (start < 0) return s;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}
