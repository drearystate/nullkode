import type { ModuleDefinition } from "../types";

export const wishlist: ModuleDefinition = {
  id: "wishlist",
  name: "Wishlist",
  tagline: "A list of things you want",
  description:
    "A wishlist of products with name, price, store link and optional image. Share it for gift-giving or keep it private for later.",
  icon: "",
  color: "from-pink-500 to-rose-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Wishlist heading", type: "text", default: "My wishlist", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "name", type: "text" },
        { name: "url", type: "text" },
        { name: "image_url", type: "text" },
        { name: "price", type: "float" },
        { name: "notes", type: "text" },
        { name: "priority", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Wishlist feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "priority desc, created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add wish",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          name: "{{trigger.name}}",
          url: "{{trigger.url}}",
          image_url: "{{trigger.image_url}}",
          price: "{{trigger.price}}",
          notes: "{{trigger.notes}}",
          priority: "{{trigger.priority}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "wishlist",
      title: "Wishlist",
      html: `<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">{{config.heading}}</h1><p style="color:var(--nk-text-muted);">Things I'd love, sorted by priority.</p>
<div data-nk-bind-flow-ref="feed" class="row g-4 mt-3">
  <div class="col-md-3 col-6" data-nk-item><div class="card border-0 shadow-sm h-100"><img class="card-img-top" data-nk-src="image_url" src="https://picsum.photos/seed/w1/280/280" alt=""/><div class="card-body p-3"><div class="fw-bold small" data-nk-field="name">Mechanical keyboard</div><div class="small" style="color:var(--nk-text-muted);">$<span data-nk-field="price">180</span></div><span class="badge bg-danger mt-2" data-nk-field="priority">must have</span><a class="btn btn-outline-primary btn-sm w-100 mt-2" data-nk-href="url" href="#">View</a></div></div></div>
  <div class="col-md-3 col-6"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="https://picsum.photos/seed/w2/280/280" alt=""/><div class="card-body p-3"><div class="fw-bold small">Wool blanket</div><div class="small" style="color:var(--nk-text-muted);">$95</div><span class="badge mt-2" style="background:var(--nk-primary);color:var(--nk-text);">nice to have</span><a class="btn btn-outline-primary btn-sm w-100 mt-2" href="#">View</a></div></div></div>
  <div class="col-md-3 col-6"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="https://picsum.photos/seed/w3/280/280" alt=""/><div class="card-body p-3"><div class="fw-bold small">Leather notebook</div><div class="small" style="color:var(--nk-text-muted);">$45</div><span class="badge mt-2" style="background:var(--nk-primary);color:var(--nk-text);">nice to have</span><a class="btn btn-outline-primary btn-sm w-100 mt-2" href="#">View</a></div></div></div>
  <div class="col-md-3 col-6"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="https://picsum.photos/seed/w4/280/280" alt=""/><div class="card-body p-3"><div class="fw-bold small">Coffee grinder</div><div class="small" style="color:var(--nk-text-muted);">$220</div><span class="badge bg-danger mt-2">must have</span><a class="btn btn-outline-primary btn-sm w-100 mt-2" href="#">View</a></div></div></div>
</div>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:680px;"><h3 class="fw-bold">Add a wish</h3><form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-3 shadow-sm"><div class="row g-3"><div class="col-md-8"><label class="form-label">Name</label><input name="name" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Price</label><input name="price" type="number" step="0.01" class="form-control"/></div><div class="col-md-8"><label class="form-label">Link</label><input name="url" type="url" class="form-control"/></div><div class="col-md-4"><label class="form-label">Priority</label><select name="priority" class="form-select"><option>must have</option><option>nice to have</option><option>maybe</option></select></div><div class="col-12"><label class="form-label">Image URL</label><input name="image_url" type="url" class="form-control"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add to wishlist</button></div></div></form></div></section>`,
    },
  ],
};
