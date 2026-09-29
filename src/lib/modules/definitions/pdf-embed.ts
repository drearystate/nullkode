import type { ModuleDefinition } from "../types";

export const pdfEmbed: ModuleDefinition = {
  id: "pdf-embed",
  name: "PDF Library",
  tagline: "Upload PDFs, browse and view them inline",
  description:
    "Maintain a small library of PDF documents (price lists, brochures, manuals, contracts). Each PDF gets a public viewer page with the browser's built-in PDF renderer embedded. Visitors can open them inline or download.",
  icon: "",
  color: "from-red-600 to-rose-800",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Library heading", type: "text", default: "Documents", required: true },
  ],
  tables: [
    {
      name: "documents",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "url", type: "text" },
        { name: "size_kb", type: "int" },
      ],
      seed: [
        { title: "Product catalog 2026", description: "Full catalog with prices.", url: "https://www.africau.edu/images/default/sample.pdf", size_kb: 320 },
        { title: "Spec sheet — Model X", description: "Technical specifications.", url: "https://www.africau.edu/images/default/sample.pdf", size_kb: 84 },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List documents",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "documents", orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "get",
      name: "Get one document",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "documents", where: { id: "{{trigger.id}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.row.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add",
      name: "Add a document",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "documents",
            values: {
              title: "{{trigger.title}}",
              description: "{{trigger.description}}",
              url: "{{trigger.url}}",
              size_kb: "{{trigger.size_kb}}",
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
      slug: "documents",
      title: "Documents",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="display-5 fw-bold">{{config.heading}}</h1>
<div data-nk-bind-flow-ref="list" data-nk-refresh="60000" class="mt-3">
  <div class="d-flex gap-3 align-items-center p-3 border rounded mb-2" style="background:var(--nk-surface);" data-nk-item data-nk-row-id="{id}">
    <div class="fs-1"></div>
    <div class="flex-grow-1">
      <a class="fw-bold text-decoration-none" data-nk-href-template="/view-pdf?id={id}" href="#"><span data-nk-field="title">PDF title</span></a>
      <div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="description">Short description</span> · <span data-nk-field="size_kb">120</span> KB</div>
    </div>
    <a class="btn btn-sm btn-outline-primary" data-nk-href-from="url" href="#" target="_blank">Open</a>
  </div>
</div>
</div></section>`,
    },
    {
      slug: "view-pdf",
      title: "PDF viewer",
      html: `<section class="py-3"><div class="container" style="max-width:1080px;">
<a href="/documents" class="small text-decoration-none" style="color:var(--nk-text-muted);">← Library</a>
<div data-nk-bind-flow-ref="get" data-nk-source="query:id" class="mt-2">
  <div data-nk-item>
    <h3 class="fw-bold" data-nk-field="title">Title</h3>
    <iframe style="width:100%;height:80vh;border:1px solid var(--nk-border);border-radius:8px;" data-nk-src-attr="url" src="about:blank"></iframe>
  </div>
</div>
</div></section>
<script>(function(){
  // Map data-nk-src-attr to iframe src once data binds
  function refresh(){ document.querySelectorAll('[data-nk-src-attr="url"]').forEach(function(f){
    var card = f.closest('[data-nk-item]'); if(!card) return;
    var url = (card.getAttribute('data-nk-row-url') || card.dataset.nkRowUrl || '');
    if(!url){ var t = card.innerHTML.match(/https?:[^"' <>]+\.pdf[^"' <>]*/); if(t) url = t[0]; }
    if(url) f.src = url;
  });}
  setTimeout(refresh, 800); setTimeout(refresh, 2000);
})();</script>`,
    },
    {
      slug: "documents-admin",
      title: "Add document",
      html: `<section class="py-5"><div class="container" style="max-width:520px;"><h1 class="fw-bold">Add a PDF</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 shadow-sm mt-3">
  <div class="mb-2"><label class="form-label">Title</label><input name="title" class="form-control" required/></div>
  <div class="mb-2"><label class="form-label">Description</label><input name="description" class="form-control"/></div>
  <div class="mb-2"><label class="form-label">PDF URL (hosted somewhere)</label><input name="url" type="url" class="form-control" required/></div>
  <div class="mb-2"><label class="form-label">Approx. size (KB)</label><input name="size_kb" type="number" class="form-control"/></div>
  <button class="btn btn-primary mt-2" type="submit">Add</button>
</form>
</div></section>`,
    },
  ],
};
