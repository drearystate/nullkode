import type { ModuleDefinition } from "../types";

export const newsletter: ModuleDefinition = {
  id: "newsletter",
  name: "Newsletter",
  tagline: "Collect email signups",
  description:
    "A bold signup page with a single email field, a growing subscriber list, and an admin page showing every signup with timestamps.",
  icon: "",
  color: "from-cyan-500 to-brand-500",
  category: "communication",
  version: "1.0.0",

  config: [
    {
      key: "title",
      label: "Headline",
      type: "text",
      default: "Join the list",
      required: true,
    },
    {
      key: "pitch",
      label: "One-line pitch",
      type: "text",
      default: "Get our latest updates delivered to your inbox. No spam.",
    },
    {
      key: "buttonText",
      label: "Button text",
      type: "text",
      default: "Subscribe",
    },
  ],

  tables: [
    {
      name: "subscribers",
      fields: [
        { name: "email", type: "text" },
        { name: "source", type: "text" },
      ],
    },
  ],

  flows: [
    {
      slug: "subscribe",
      name: "Subscribe to newsletter",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: { label: "New subscriber" } },
        {
          id: "n2",
          type: "insert",
          data: {
            label: "Save email",
            table: "subscribers",
            values: {
              email: "{{trigger.email}}",
              source: "website",
            },
            output: "saved",
          },
        },
        {
          id: "n3",
          type: "response",
          data: {
            label: "Welcome response",
            status: 200,
            body: '{"ok":true,"message":"You\'re on the list!"}',
          },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "List subscribers",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: { label: "Load list" } },
        {
          id: "n2",
          type: "query",
          data: {
            table: "subscribers",
            orderBy: "created_at desc",
            limit: 500,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],

  pages: [
    {
      slug: "join",
      title: "Join",
      html: `<section class="py-5" style="color:#fff;background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));">
  <div class="container py-5">
    <div class="row justify-content-center text-center">
      <div class="col-lg-8">
        <h1 class="display-3 fw-bold">{{config.title}}</h1>
        <p class="lead mt-3" style="color:rgba(255,255,255,0.5);">{{config.pitch}}</p>
        <form data-nk-form="" data-nk-flow-ref="subscribe" class="row g-2 justify-content-center mt-5">
          <div class="col-auto" style="min-width:260px;">
            <input name="email" type="email" class="form-control form-control-lg" placeholder="you@example.com" required/>
          </div>
          <div class="col-auto">
            <button class="btn btn-primary btn-lg" type="submit">{{config.buttonText}}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</section>`,
    },
    {
      slug: "subscribers",
      title: "Subscribers",
      html: `<section class="py-5">
  <div class="container">
    <h1 class="fw-bold mb-1">Subscribers</h1>
    <p style="color:var(--nk-text-muted);">Everyone who has joined your list.</p>
    <div data-nk-bind-flow-ref="list" class="mt-4">
      <div data-nk-item class="d-flex flex-wrap justify-content-between gap-2 py-2" style="border-bottom:1px solid var(--nk-border);"><a data-nk-attr-href="mailto:{email}" data-nk-field="email">email</a><span class="small" style="color:var(--nk-text-muted);"><span data-nk-field="source"></span> · <span data-nk-field="created_at" data-nk-format="date"></span></span></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">No subscribers yet.</p>
    </div>
  </div>
</section>`,
    },
  ],
};
