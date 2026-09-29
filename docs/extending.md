# Add features and templates

Nullkode grows in two ways, and both take one command to start:

| You want to add | What it is | Command |
|---|---|---|
| **A feature** | Something an app can *do*: bookings, a shop, a waitlist, reviews. It brings its own pages, database tables and backend steps. | `pnpm new:module "Pet Adoption"` |
| **A template** | A finished design for a kind of business, which people start an app from. It can install features too. | `pnpm new:template "Coffee Shop" --category food` |

Each command writes one file with a working starter and registers it, so it
appears in the product straight away. Change the file, check it, and try it:

```bash
pnpm new:module "Pet Adoption"   # or: pnpm new:template "Coffee Shop" --category food
pnpm check:extensions            # finds mistakes before anyone installs it
pnpm dev                         # open any app → Features → Pet Adoption → Add to my app
```

`pnpm check:extensions` checks all 135+ features and every template in a few
seconds. It fails on steps that aren't connected, pages calling a flow that
doesn't exist, settings nobody can fill in, owner pages that visitors could
open, repeated HTML attributes, and templates that ask for missing features.
Run it before every commit.

---

## Features

A feature is one file in `src/lib/modules/definitions/`. The starter that
`pnpm new:module` writes is a complete example. It has four parts.

### 1. Settings (`config`)

Questions the owner answers when adding the feature. Use the answers in pages
as `{{config.key}}`.

```ts
config: [
  { key: "heading", label: "Heading", type: "text", default: "Adopt a friend", required: true },
  { key: "intro", label: "Intro text", type: "textarea" },
],
```

Types: `text`, `textarea`, `url`, `number`, `color`, `select`.

### 2. Tables (`tables`)

Where the feature saves things. Every table automatically gets `id`,
`created_at`, `updated_at` and `created_by`, so don't list those.

```ts
tables: [
  { name: "entries", fields: [
    { name: "name", type: "text" },
    { name: "email", type: "text" },
  ] },
],
```

Field types: `text`, `int`, `float`, `bool`, `timestamp`, `json`. Add `seed`
rows to fill the table with examples on install.

### 3. Flows (`flows`)

The backend: steps that run on the server when a page calls them. A flow starts
with a `trigger`, does its work, and ends with a `response`. `edges` connect
the steps in order.

```ts
{
  slug: "submit",
  name: "Send request",
  nodes: [
    { id: "n1", type: "trigger", data: {} },
    { id: "n2", type: "insert", data: { table: "entries", values: { name: "{{trigger.name}}" } } },
    { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks!"}' } },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
  ],
}
```

- `{{trigger.x}}` is what the page sent (a form field named `x`).
- `{{vars.x}}` is what an earlier step saved with `output: "x"`.
- Return a list to a page with `body: "{{vars.rows}}"`.

| Step | What it does |
|---|---|
| `query` | Find rows (`table`, `where`, `orderBy`, `limit`, `output`) |
| `insert` / `update` / `delete` | Add, change or remove rows. An update or delete with a blank `id` changes nothing. |
| `branch` | If this, otherwise that (`left`, `op`, `right`). Connect edges with `sourceHandle: "true"` / `"false"`. |
| `set`, `math`, `parse_json` | Work out values |
| `email` | Send an email |
| `http_request` | Call another service |
| `ai_prompt` | Ask the app's AI a question |
| `sheets_read` / `sheets_append` | Google Sheets |
| `hash_password`, `verify_password`, `set_session`, `get_session`, `clear_session` | Sign-in (see the `auth` feature) |
| `delay` | Wait |
| `response` | Answer the page (`status`, `body`) |

### 4. Pages (`pages`)

Plain HTML with Bootstrap 5 classes. Use the theme colours
(`var(--nk-primary)`, `var(--nk-text)`, `var(--nk-text-muted)`,
`var(--nk-surface)`, `var(--nk-border)`, `var(--nk-radius)`) so the feature
matches every template and dark mode.

These attributes connect a page to its flows. No JavaScript is needed:

| Attribute | What it does |
|---|---|
| `<form data-nk-form data-nk-flow-ref="submit">` | Sends the form to the `submit` flow and shows the result |
| `<div data-nk-error>` | Where the success or error message appears (added for you if missing) |
| `<div data-nk-bind-flow-ref="list">` | Fills this element from the `list` flow |
| `<div data-nk-item>` | The template repeated for each row |
| `<span data-nk-field="name">` | Shows the row's `name` as text |
| `data-nk-format="date"` | `date`, `datetime`, `time`, `number` or `money` |
| `href="/details?id={id}"` | Any `{field}` inside a row is filled in. Links are made safe, and event handlers are never filled. |
| `<p data-nk-empty hidden>` | Shown when the list has no rows |

Mark pages for the app's owner (admin screens, inboxes, lists of people) with
`ownerOnly: true`. They're installed behind sign-in as an admin, and the flows
only they use are locked too, so visitors can't read that data.

When installed, page and flow slugs get the feature id in front
(`pet-adoption-form`), and every `data-nk-*-ref` is wired to the real flow. You
write the short names.

### Good features

- Do one job well. Two small features beat one feature with a switch.
- Put visitor pages and owner pages in the same feature, so an owner never has
  to build their own admin screen.
- Write for someone who has never built an app. Short, friendly text.
- Never name an AI provider in text people see.

---

## Templates

A template is one file in `src/lib/templates/originals/`. `pnpm new:template`
writes a themed starter with a home page and an about page, and installs the
contact form feature.

```ts
const template: StarterTemplate = {
  id: "original-coffee-shop",
  name: "Coffee Shop",
  tagline: "A starter for food",
  category: "food",
  tags: ["cafe", "coffee"],
  source: "original",
  modules: ["contact-form", "menu"],   // features to install with it
  theme: { mode: "light", primary: "#6b3e26", /* … */ dark: { /* … */ } },
  pages: [
    { title: "Home", slug: "home", isHome: true, html: HOME, css: CSS },
    { title: "About", slug: "about", isHome: false, html: ABOUT, css: CSS },
  ],
};
```

- **Theme:** set `primary`, `accent`, `bg`, `surface`, `text`, the fonts
  (`googleFonts`) and the corner `radius`, plus a `dark` version. In page CSS,
  use the tokens (`var(--nk-primary)` …) instead of fixed colours, so owners
  can re-theme it in one click.
- **Features:** list feature ids in `modules`. Their pages, tables and forms
  come with the template. Use `moduleSeeds` to give their tables sample rows
  that fit your template (a coffee menu, not a pizza menu).
- **Images:** put them in `public/templates/originals/<id>/` and list every
  file in its `CREDITS.md`. Only use images you may redistribute: your own
  photos or CC0 (public domain) images.
- **Preview:** make the gallery picture with
  `tsx scripts/render-original-templates.ts original-coffee-shop`
  (needs Docker). It also fails if the home page scrolls sideways on a phone.
- **Categories:** saas, restaurant, portfolio, corporate, ecommerce, health,
  creative, hospitality, education, fitness, nonprofit, personal, finance,
  beauty, realestate, travel, legal, food.

The 18 templates in `src/lib/templates/originals/` are complete examples.
`original-legal.ts` and `original-restaurant.ts` show how a full
multi-page design is organised.

---

## Share it

Features and templates are the easiest way to contribute. Open a pull request
with the new file (and its images), after `pnpm check:extensions` passes. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
