import type { ModuleDefinition } from "../types";

export const journal: ModuleDefinition = {
  id: "journal",
  name: "Journal",
  tagline: "Daily journal with mood tracking",
  description:
    "A private daily journal with mood selector, tags and free-form entry. Browse past entries chronologically.",
  icon: "",
  color: "from-blue-500 to-indigo-600",
  category: "productivity",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "entries",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "mood", type: "text" },
        { name: "tags", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Journal feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "entries", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "New entry",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "entries", values: {
          title: "{{trigger.title}}",
          body: "{{trigger.body}}",
          mood: "{{trigger.mood}}",
          tags: "{{trigger.tags}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "journal",
      title: "Journal",
      html: `<section class="py-5"><div class="container" style="max-width:780px;"><h1 class="display-5 fw-bold">Journal</h1><p style="color:var(--nk-text-muted);">A quiet place for your thoughts.</p>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-8"><input name="title" class="form-control" placeholder="Title (optional)"/></div><div class="col-md-4"><select name="mood" class="form-select"><option> happy</option><option> neutral</option><option> sad</option><option> frustrated</option><option> excited</option><option> tired</option></select></div><div class="col-12"><textarea name="body" class="form-control" rows="5" placeholder="How are you feeling today?" required></textarea></div><div class="col-12"><input name="tags" class="form-control" placeholder="tags, separated, by, commas"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Save entry</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="mt-5">
  <article class="card border-0 shadow-sm mb-3" data-nk-item><div class="card-body p-4"><div class="d-flex justify-content-between align-items-start mb-2"><h5 class="fw-bold mb-0" data-nk-field="title">A quiet Saturday</h5><div class="fs-4" data-nk-field="mood"></div></div><div class="small mb-3" style="color:var(--nk-text-muted);">April 10, 2026</div><p class="card-text" data-nk-field="body">Woke up early, made coffee and sat on the porch. Read for an hour. Feels like the first time in weeks I wasn't in a rush.</p></div></article>
  <article class="card border-0 shadow-sm mb-3"><div class="card-body p-4"><div class="d-flex justify-content-between align-items-start mb-2"><h5 class="fw-bold mb-0">Shipped the thing</h5><div class="fs-4"></div></div><div class="small mb-3" style="color:var(--nk-text-muted);">April 9, 2026</div><p class="card-text">Finally pushed the feature that's been on my mind for two weeks. The relief is real.</p></div></article>
  <article class="card border-0 shadow-sm"><div class="card-body p-4"><div class="d-flex justify-content-between align-items-start mb-2"><h5 class="fw-bold mb-0">Tough day</h5><div class="fs-4"></div></div><div class="small mb-3" style="color:var(--nk-text-muted);">April 8, 2026</div><p class="card-text">One of those days where nothing quite clicks. Going to bed early and trying again tomorrow.</p></div></article>
</div>
</div></section>`,
    },
  ],
};
