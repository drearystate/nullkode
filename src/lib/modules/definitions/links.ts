import type { ModuleDefinition } from "../types";

export const links: ModuleDefinition = {
  id: "links",
  name: "Link Directory",
  tagline: "A Linktree-style list of links",
  description:
    "A simple curated list of external links with title, icon and description. Perfect for Linktree-style pages, curated resource lists or link-in-bio apps.",
  icon: "",
  color: "from-teal-500 to-emerald-600",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Heading", type: "text", default: "My Links", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "label", type: "text" },
        { name: "url", type: "text" },
        { name: "description", type: "text" },
        { name: "sort_order", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Link feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "sort_order asc, created_at asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add link",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          label: "{{trigger.label}}",
          url: "{{trigger.url}}",
          description: "{{trigger.description}}",
          sort_order: "{{trigger.sort_order}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "links",
      title: "Links",
      html: `<section class="py-5" style="background:linear-gradient(180deg,#0a0a14 0%,#1a1032 100%);min-height:100vh;"><div class="container" style="max-width:520px;"><h1 class="display-5 fw-bold text-center" style="color:#fff;">{{config.heading}}</h1>
<div data-nk-bind-flow-ref="feed" class="mt-5 d-grid gap-3">
  <a class="btn btn-light btn-lg text-start py-3" data-nk-item data-nk-href="url" href="#">
    <div class="fw-bold" data-nk-field="label">My latest project</div>
    <div class="small" data-nk-field="description" style="color:var(--nk-text-muted);">A new thing I'm working on</div>
  </a>
  <a class="btn btn-light btn-lg text-start py-3" href="#"><div class="fw-bold">Twitter / X</div><div class="small" style="color:var(--nk-text-muted);">Follow me for updates</div></a>
  <a class="btn btn-light btn-lg text-start py-3" href="#"><div class="fw-bold">YouTube channel</div><div class="small" style="color:var(--nk-text-muted);">Weekly videos and tutorials</div></a>
  <a class="btn btn-light btn-lg text-start py-3" href="#"><div class="fw-bold">Newsletter</div><div class="small" style="color:var(--nk-text-muted);">Monthly notes and thoughts</div></a>
  <a class="btn btn-light btn-lg text-start py-3" href="#"><div class="fw-bold">GitHub</div><div class="small" style="color:var(--nk-text-muted);">Open source projects</div></a>
</div>
</div></section>`,
    },
    {
      slug: "links-admin",
      title: "Manage links",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Add a link</h1><form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-8"><label class="form-label">Label</label><input name="label" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Order</label><input name="sort_order" type="number" class="form-control" value="0"/></div><div class="col-12"><label class="form-label">URL</label><input name="url" type="url" class="form-control" required/></div><div class="col-12"><label class="form-label">Description</label><input name="description" class="form-control"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add</button></div></div></form></div></section>`,
    },
  ],
};
