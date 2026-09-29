import type { ModuleDefinition } from "../types";

export const archive: ModuleDefinition = {
  id: "archive",
  name: "Content Archive",
  tagline: "Searchable, year-indexed long-term archive",
  description:
    "Long-term archive for finished projects, old posts, decommissioned products — anything you want to keep around but not show in active feeds. Browse by year/month, full-text search across title + body. A 'restore to main feed' flag is reserved for downstream modules.",
  icon: "",
  color: "from-stone-500 to-zinc-800",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Archive heading", type: "text", default: "Archive", required: true },
  ],
  tables: [
    {
      name: "entries",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "category", type: "text" },
        { name: "archived_year", type: "int" },
        { name: "source_url", type: "text" },
      ],
      seed: [
        { title: "Q1 2025 roadmap", body: "Original planning doc.", category: "Planning", archived_year: 2025, source_url: "" },
        { title: "Old pricing page", body: "Snapshot before the 2026 redesign.", category: "Marketing", archived_year: 2025, source_url: "" },
        { title: "Service A — retired", body: "Spec for the decommissioned Service A.", category: "Engineering", archived_year: 2024, source_url: "" },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List archive entries",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "entries", orderBy: "archived_year desc, created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add",
      name: "Archive something",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "entries",
            values: {
              title: "{{trigger.title}}",
              body: "{{trigger.body}}",
              category: "{{trigger.category}}",
              archived_year: "{{trigger.archived_year}}",
              source_url: "{{trigger.source_url}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "archive",
      title: "Archive",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:880px;">
<h1 class="display-5 fw-bold">{{config.heading}}</h1>
<input id="nk-arc-q" class="form-control mt-3" placeholder="Search the archive…" style="max-width:360px;"/>
<div data-nk-bind-flow-ref="list" data-nk-refresh="60000" id="nk-arc" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold" data-nk-field="title">Title</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="category">Category</span> · <span data-nk-field="archived_year">2025</span></div></div></div><p class="mt-2 mb-0 small" data-nk-field="body">Snippet…</p></div></div>
</div>
<script>(function(){
  document.getElementById('nk-arc-q').addEventListener('input', function(e){
    var q = (e.target.value || '').toLowerCase();
    document.querySelectorAll('#nk-arc [data-nk-item]').forEach(function(row){
      var hay = row.textContent.toLowerCase();
      row.style.display = (!q || hay.indexOf(q) >= 0) ? '' : 'none';
    });
  });
})();</script>
</div></section>`,
    },
    {
      slug: "archive-add",
      title: "Archive a record",
      html: `<section class="py-5"><div class="container" style="max-width:560px;"><h1 class="fw-bold">Archive a record</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 shadow-sm mt-3">
  <input name="title" class="form-control mb-2" placeholder="Title" required/>
  <input name="category" class="form-control mb-2" placeholder="Category"/>
  <input name="archived_year" type="number" min="1990" max="2099" class="form-control mb-2" placeholder="Year (e.g. 2024)" required/>
  <input name="source_url" type="url" class="form-control mb-2" placeholder="Original URL (optional)"/>
  <textarea name="body" class="form-control" rows="5" placeholder="Content / notes"></textarea>
  <button class="btn btn-primary mt-2" type="submit">Archive</button>
</form>
</div></section>`,
    },
  ],
};
