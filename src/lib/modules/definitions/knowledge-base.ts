import type { ModuleDefinition } from "../types";

export const knowledgeBase: ModuleDefinition = {
  id: "kb",
  name: "Knowledge Base",
  tagline: "Help articles your customers can browse",
  description:
    "A help center with categorized articles. Includes a public article list and a simple admin page to publish new articles.",
  icon: "",
  color: "from-violet-500 to-purple-600",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "title", label: "Help center title", type: "text", default: "Help Center", required: true },
  ],
  tables: [
    {
      name: "articles",
      fields: [
        { name: "title", type: "text" },
        { name: "slug", type: "text" },
        { name: "category", type: "text" },
        { name: "body", type: "text" },
        { name: "published", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "List articles",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "articles", where: { published: "true" }, orderBy: "category asc, title asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "create",
      name: "Create article",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "articles", values: {
          title: "{{trigger.title}}",
          slug: "{{trigger.slug}}",
          category: "{{trigger.category}}",
          body: "{{trigger.body}}",
          published: "{{trigger.published}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "help",
      title: "Help Center",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.title}}</h1><p class="lead" style="color:var(--nk-text-muted);">Browse articles to find answers fast.</p></div></section>
<section class="py-5"><div class="container" style="max-width:820px;">
<div data-nk-bind-flow-ref="feed">
  <a class="d-block card border-0 shadow-sm mb-3 text-decoration-none text-body p-4" data-nk-item data-nk-href="slug" href="#">
    <div class="small text-uppercase fw-bold" data-nk-field="category" style="color:var(--nk-primary);">Getting started</div>
    <h5 class="fw-bold mt-1" data-nk-field="title">How to install your first module</h5>
    <p class="small mb-0" style="color:var(--nk-text-muted);">A step-by-step guide to picking a module, configuring it and opening it in the editor.</p>
  </a>
  <a class="d-block card border-0 shadow-sm mb-3 text-decoration-none text-body p-4" href="#"><div class="small text-uppercase fw-bold" style="color:var(--nk-primary);">Editor</div><h5 class="fw-bold mt-1">Editing pages in the visual builder</h5><p class="small mb-0" style="color:var(--nk-text-muted);">Drag, drop, style. Everything you need to know about the page editor.</p></a>
  <a class="d-block card border-0 shadow-sm mb-3 text-decoration-none text-body p-4" href="#"><div class="small text-uppercase fw-bold" style="color:var(--nk-primary);">Data</div><h5 class="fw-bold mt-1">Creating and managing database tables</h5><p class="small mb-0" style="color:var(--nk-text-muted);">Everything your project stores lives in an isolated Postgres schema you control.</p></a>
  <a class="d-block card border-0 shadow-sm mb-3 text-decoration-none text-body p-4" href="#"><div class="small text-uppercase fw-bold" style="color:var(--nk-primary);">Flows</div><h5 class="fw-bold mt-1">Building a backend flow</h5><p class="small mb-0" style="color:var(--nk-text-muted);">Wire up triggers, data nodes, branches and responses without writing code.</p></a>
  <a class="d-block card border-0 shadow-sm text-decoration-none text-body p-4" href="#"><div class="small text-uppercase fw-bold" style="color:var(--nk-primary);">Publishing</div><h5 class="fw-bold mt-1">Publishing and custom domains</h5><p class="small mb-0" style="color:var(--nk-text-muted);">Put your project live at its own web address, or point your own domain at it.</p></a>
</div>
</div></section>`,
    },
    {
      slug: "help-admin",
      title: "Write article",
      html: `<section class="py-5"><div class="container" style="max-width:820px;"><h1 class="fw-bold">Write an article</h1><form data-nk-form="" data-nk-flow-ref="create" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-8"><label class="form-label">Title</label><input name="title" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Slug</label><input name="slug" class="form-control"/></div><div class="col-md-8"><label class="form-label">Category</label><input name="category" class="form-control"/></div><div class="col-md-4 d-flex align-items-end"><div class="form-check"><input class="form-check-input" type="checkbox" name="published" value="true" checked/><label class="form-check-label">Publish</label></div></div><div class="col-12"><label class="form-label">Body</label><textarea name="body" class="form-control" rows="10" required></textarea></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Publish</button></div></div></form></div></section>`,
    },
  ],
};
