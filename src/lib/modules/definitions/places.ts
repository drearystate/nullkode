import type { ModuleDefinition } from "../types";

export const places: ModuleDefinition = {
  id: "places",
  name: "Places Directory",
  tagline: "Directory of businesses or locations",
  description:
    "A directory of places with name, category, address, description and an external 'open in maps' link. Great for local guides, store locators and resource directories.",
  icon: "",
  color: "from-rose-500 to-red-600",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "title", label: "Directory title", type: "text", default: "Local Directory", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "name", type: "text" },
        { name: "category", type: "text" },
        { name: "address", type: "text" },
        { name: "description", type: "text" },
        { name: "phone", type: "text" },
        { name: "website", type: "text" },
        { name: "lat", type: "float" },
        { name: "lng", type: "float" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Places feed",
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
      name: "Add place",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          name: "{{trigger.name}}",
          category: "{{trigger.category}}",
          address: "{{trigger.address}}",
          description: "{{trigger.description}}",
          phone: "{{trigger.phone}}",
          website: "{{trigger.website}}",
          lat: "{{trigger.lat}}",
          lng: "{{trigger.lng}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "places",
      title: "Places",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.title}}</h1></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-6" data-nk-item>
    <div class="card h-100 border-0 shadow-sm">
      <div class="card-body">
        <div class="small text-uppercase" style="color:var(--nk-text-muted);" data-nk-field="category">Cafe</div>
        <h5 class="card-title fw-bold mt-1" data-nk-field="name">Noon Coffee</h5>
        <p class="card-text small" style="color:var(--nk-text-muted);" data-nk-field="description">Cozy neighborhood roaster with single origins and great pastries.</p>
        <div class="small"><span data-nk-field="address">410 Elm St</span> · <a class="text-decoration-none" data-nk-href="website" href="#">Visit site</a></div>
      </div>
    </div>
  </div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="small text-uppercase" style="color:var(--nk-text-muted);">Bookshop</div><h5 class="card-title fw-bold mt-1">Margin Notes</h5><p class="card-text small" style="color:var(--nk-text-muted);">Independent bookseller with a strong fiction and poetry section.</p><div class="small">82 Oak Ave · <a class="text-decoration-none" href="#">Visit site</a></div></div></div></div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="small text-uppercase" style="color:var(--nk-text-muted);">Restaurant</div><h5 class="card-title fw-bold mt-1">Blue Ribbon Diner</h5><p class="card-text small" style="color:var(--nk-text-muted);">All-day breakfast, classic diner fare, open late on weekends.</p><div class="small">1 Main St · <a class="text-decoration-none" href="#">Visit site</a></div></div></div></div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="small text-uppercase" style="color:var(--nk-text-muted);">Gym</div><h5 class="card-title fw-bold mt-1">Northside Fitness</h5><p class="card-text small" style="color:var(--nk-text-muted);">Full gym, classes, sauna and personal training.</p><div class="small">500 Park Ave · <a class="text-decoration-none" href="#">Visit site</a></div></div></div></div>
</div>
</div></section>`,
    },
    {
      slug: "places-admin",
      title: "Add place",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="fw-bold">Add a place</h1><form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-8"><label class="form-label">Name</label><input name="name" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Category</label><input name="category" class="form-control"/></div><div class="col-12"><label class="form-label">Address</label><input name="address" class="form-control"/></div><div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="3"></textarea></div><div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control"/></div><div class="col-md-6"><label class="form-label">Website</label><input name="website" type="url" class="form-control"/></div><div class="col-md-6"><label class="form-label">Latitude</label><input name="lat" type="number" step="0.0000001" class="form-control"/></div><div class="col-md-6"><label class="form-label">Longitude</label><input name="lng" type="number" step="0.0000001" class="form-control"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add</button></div></div></form></div></section>`,
    },
  ],
};
