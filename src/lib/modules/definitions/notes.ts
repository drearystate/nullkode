import type { ModuleDefinition } from "../types";

export const notes: ModuleDefinition = {
  id: "notes",
  name: "Notes",
  tagline: "Quick sticky-note style notes",
  description:
    "Jot down short notes with tags. Great for capturing ideas, links, reminders and scraps that don't belong in a full document.",
  icon: "",
  color: "from-yellow-400 to-amber-600",
  category: "productivity",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "items",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "color", type: "text" },
        { name: "tags", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Notes feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add note",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          title: "{{trigger.title}}",
          body: "{{trigger.body}}",
          color: "{{trigger.color}}",
          tags: "{{trigger.tags}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "notes",
      title: "Notes",
      html: `<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">Notes</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-4"><input name="title" class="form-control" placeholder="Title"/></div><div class="col-md-8"><input name="body" class="form-control" placeholder="Your note..." required/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Save note</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="row g-3 mt-3">
  <div class="col-md-4 col-sm-6" data-nk-item><div class="p-3 rounded shadow-sm" style="background:#fff9c4;"><div class="fw-bold mb-1" data-nk-field="title">Book recommendation</div><p class="small mb-1" data-nk-field="body">Sarah mentioned "The Creative Act" — add to reading list.</p><div class="small" data-nk-field="tags" style="color:var(--nk-text-muted);">books, ideas</div></div></div>
  <div class="col-md-4 col-sm-6"><div class="p-3 rounded shadow-sm" style="background:#bbdefb;"><div class="fw-bold mb-1">Meeting notes — Mon 10am</div><p class="small mb-1">New timelines. Follow up with Alex about the launch plan.</p><div class="small" style="color:var(--nk-text-muted);">work</div></div></div>
  <div class="col-md-4 col-sm-6"><div class="p-3 rounded shadow-sm" style="background:#c8e6c9;"><div class="fw-bold mb-1">Gift idea for Dad</div><p class="small mb-1">That vintage fountain pen he was eyeing at the market.</p><div class="small" style="color:var(--nk-text-muted);">family</div></div></div>
  <div class="col-md-4 col-sm-6"><div class="p-3 rounded shadow-sm" style="background:#f8bbd0;"><div class="fw-bold mb-1">Recipe to try</div><p class="small mb-1">Lemon ricotta pancakes, saw on that cooking video.</p><div class="small" style="color:var(--nk-text-muted);">food</div></div></div>
  <div class="col-md-4 col-sm-6"><div class="p-3 rounded shadow-sm" style="background:#ffe0b2;"><div class="fw-bold mb-1">Blog draft</div><p class="small mb-1">Working title: "Why we rebuilt our editor from scratch." Start with the problem.</p><div class="small" style="color:var(--nk-text-muted);">writing</div></div></div>
  <div class="col-md-4 col-sm-6"><div class="p-3 rounded shadow-sm" style="background:#d1c4e9;"><div class="fw-bold mb-1">Passwords to rotate</div><p class="small mb-1">Work Google account, Figma, Stripe dashboard.</p><div class="small" style="color:var(--nk-text-muted);">security</div></div></div>
</div>
</div></section>`,
    },
  ],
};
