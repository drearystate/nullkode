import type { ModuleDefinition } from "../types";

export const catalog: ModuleDefinition = {
  id: "catalog",
  name: "Product Catalog",
  tagline: "Showcase products without checkout",
  description:
    "A clean product catalog with name, price, image and description. Great for menus, brochures and showroom-style pages where customers enquire rather than buy online.",
  icon: "",
  color: "from-indigo-500 to-brand-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "title", label: "Catalog title", type: "text", default: "Our Catalog", required: true },
    { key: "currency", label: "Currency symbol", type: "text", default: "$" },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "name", type: "text" },
        { name: "description", type: "text" },
        { name: "price", type: "float" },
        { name: "image_url", type: "text" },
        { name: "category", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Catalog feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "category asc, name asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add catalog item",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          name: "{{trigger.name}}",
          description: "{{trigger.description}}",
          price: "{{trigger.price}}",
          image_url: "{{trigger.image_url}}",
          category: "{{trigger.category}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "catalog",
      title: "Catalog",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.title}}</h1></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-4" data-nk-item>
    <div class="card h-100 border-0 shadow-sm">
      <img class="card-img-top" data-nk-src="image_url" src="https://picsum.photos/seed/cat1/480/360" alt=""/>
      <div class="card-body">
        <div class="small text-uppercase" style="color:var(--nk-text-muted);" data-nk-field="category">Category</div>
        <h5 class="card-title fw-bold mt-1" data-nk-field="name">First product</h5>
        <p class="card-text small" style="color:var(--nk-text-muted);" data-nk-field="description">A short friendly description that tells the customer what this is.</p>
        <div class="fw-bold fs-5">{{config.currency}}<span data-nk-field="price">29</span></div>
      </div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card h-100 border-0 shadow-sm">
      <img class="card-img-top" src="https://picsum.photos/seed/cat2/480/360" alt=""/>
      <div class="card-body">
        <div class="small text-uppercase" style="color:var(--nk-text-muted);">Featured</div>
        <h5 class="card-title fw-bold mt-1">Second product</h5>
        <p class="card-text small" style="color:var(--nk-text-muted);">Describe the look and feel in a single sentence. Keep it snappy.</p>
        <div class="fw-bold fs-5">{{config.currency}}49</div>
      </div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card h-100 border-0 shadow-sm">
      <img class="card-img-top" src="https://picsum.photos/seed/cat3/480/360" alt=""/>
      <div class="card-body">
        <div class="small text-uppercase" style="color:var(--nk-text-muted);">Accessory</div>
        <h5 class="card-title fw-bold mt-1">Third product</h5>
        <p class="card-text small" style="color:var(--nk-text-muted);">A third option for visitors to compare.</p>
        <div class="fw-bold fs-5">{{config.currency}}19</div>
      </div>
    </div>
  </div>
</div>
</div></section>`,
    },
    {
      slug: "catalog-admin",
      title: "Add item",
      html: `<section class="py-5"><div class="container" style="max-width:760px;"><h1 class="fw-bold">Add catalog item</h1><form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-8"><label class="form-label">Name</label><input name="name" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Category</label><input name="category" class="form-control"/></div><div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="3"></textarea></div><div class="col-md-6"><label class="form-label">Price ({{config.currency}})</label><input name="price" type="number" step="0.01" class="form-control"/></div><div class="col-md-6"><label class="form-label">Image URL</label><input name="image_url" type="url" class="form-control"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add</button></div></div></form></div></section>`,
    },
  ],
};
