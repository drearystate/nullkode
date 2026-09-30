import type { ModuleDefinition } from "../types";

export const readingList: ModuleDefinition = {
  id: "reading",
  name: "Reading List",
  tagline: "Track books want-to-read / reading / read",
  description:
    "Your personal book tracker. Each book has a title, author, cover, status and an optional rating once you finish it.",
  icon: "",
  color: "from-amber-600 to-orange-700",
  category: "productivity",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "books",
      fields: [
        { name: "title", type: "text" },
        { name: "author", type: "text" },
        { name: "cover_url", type: "text" },
        { name: "status", type: "text" },
        { name: "rating", type: "int" },
        { name: "notes", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Reading list feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "books", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add book",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "books", values: {
          title: "{{trigger.title}}",
          author: "{{trigger.author}}",
          cover_url: "{{trigger.cover_url}}",
          status: "{{trigger.status}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "reading-list",
      title: "Reading list",
      html: `<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">My reading list</h1><p style="color:var(--nk-text-muted);">Books I'm reading, want to read, and loved.</p>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-5"><input name="title" class="form-control" placeholder="Title" required/></div><div class="col-md-4"><input name="author" class="form-control" placeholder="Author"/></div><div class="col-md-3"><select name="status" class="form-select"><option>want</option><option>reading</option><option>read</option></select></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add book</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="row g-4 mt-3">
  <div class="col-md-3 col-6" data-nk-item><div class="card border-0 shadow-sm h-100"><img class="card-img-top" style="aspect-ratio:2/3;object-fit:cover;" data-nk-src="cover_url" src="/media/generated/creative-no-33.webp" alt=""/><div class="card-body p-3"><div class="fw-bold small" data-nk-field="title">The Creative Act</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="author">Rick Rubin</div><span class="badge mt-2" style="background:var(--nk-primary);" data-nk-field="status">reading</span></div></div></div>
  <div class="col-md-3 col-6"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" style="aspect-ratio:2/3;object-fit:cover;" src="/media/generated/legal-columns.webp" alt=""/><div class="card-body p-3"><div class="fw-bold small">Sapiens</div><div class="small" style="color:var(--nk-text-muted);">Yuval Noah Harari</div><span class="badge mt-2" style="background:var(--nk-primary);">read</span><div class="text-warning small mt-1">★★★★★</div></div></div></div>
  <div class="col-md-3 col-6"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" style="aspect-ratio:2/3;object-fit:cover;" src="/media/generated/travel-ridge-above-clouds.webp" alt=""/><div class="card-body p-3"><div class="fw-bold small">Project Hail Mary</div><div class="small" style="color:var(--nk-text-muted);">Andy Weir</div><span class="badge bg-secondary mt-2">want</span></div></div></div>
  <div class="col-md-3 col-6"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" style="aspect-ratio:2/3;object-fit:cover;" src="/media/generated/corporate-data-centre.webp" alt=""/><div class="card-body p-3"><div class="fw-bold small">The Pragmatic Programmer</div><div class="small" style="color:var(--nk-text-muted);">Hunt & Thomas</div><span class="badge mt-2" style="background:var(--nk-primary);">read</span><div class="text-warning small mt-1">★★★★★</div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
