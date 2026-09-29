import type { ModuleDefinition } from "../types";

export const classifieds: ModuleDefinition = {
  id: "classifieds",
  name: "Classifieds",
  tagline: "User-posted listings",
  description:
    "A Craigslist-style classifieds board. Visitors post listings with title, price and contact info; a feed page shows everything active.",
  icon: "",
  color: "from-amber-500 to-yellow-600",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "boardName", label: "Board name", type: "text", default: "Community Classifieds", required: true },
  ],
  tables: [
    {
      name: "listings",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "price", type: "float" },
        { name: "category", type: "text" },
        { name: "location", type: "text" },
        { name: "contact_email", type: "text" },
        { name: "active", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Listings feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "listings", where: { active: "true" }, orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "post",
      name: "Post listing",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "listings", values: {
          title: "{{trigger.title}}",
          description: "{{trigger.description}}",
          price: "{{trigger.price}}",
          category: "{{trigger.category}}",
          location: "{{trigger.location}}",
          contact_email: "{{trigger.contact_email}}",
          active: "true",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Your listing is up!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "classifieds",
      title: "Classifieds",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container"><h1 class="display-5 fw-bold">{{config.boardName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Browse and post listings.</p></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-6" data-nk-item>
    <div class="card h-100 border-0 shadow-sm"><div class="card-body">
      <div class="d-flex justify-content-between align-items-start">
        <h5 class="card-title fw-bold mb-1" data-nk-field="title">Vintage bicycle, good condition</h5>
        <div class="fw-bold" style="color:var(--nk-primary);">$<span data-nk-field="price">180</span></div>
      </div>
      <p class="card-text small" style="color:var(--nk-text-muted);" data-nk-field="description">1980s steel frame road bike, recently tuned up. Fits 5'8"-6'0" riders. Clean chain, fresh tires.</p>
      <div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="category">Sports</span> · <span data-nk-field="location">Seattle, WA</span></div>
    </div></div>
  </div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1">Mid-century sofa</h5><div class="fw-bold" style="color:var(--nk-primary);">$450</div></div><p class="card-text small" style="color:var(--nk-text-muted);">Teak legs, wool upholstery, minor wear on cushions. Must pick up.</p><div class="small" style="color:var(--nk-text-muted);">Furniture · Austin, TX</div></div></div></div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1">Kittens looking for homes</h5><div class="fw-bold" style="color:var(--nk-primary);">Free</div></div><p class="card-text small" style="color:var(--nk-text-muted);">Three tabby kittens, 8 weeks old, litter trained. Come meet them this weekend.</p><div class="small" style="color:var(--nk-text-muted);">Pets · Brooklyn, NY</div></div></div></div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1">Freelance web designer available</h5><div class="fw-bold" style="color:var(--nk-primary);">$80/hr</div></div><p class="card-text small" style="color:var(--nk-text-muted);">10 years experience. Portfolio available on request. Remote OK.</p><div class="small" style="color:var(--nk-text-muted);">Services · Remote</div></div></div></div>
</div>
</div></section>`,
    },
    {
      slug: "post-listing",
      title: "Post listing",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Post a listing</h1><form data-nk-form="" data-nk-flow-ref="post" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-12"><label class="form-label">Title</label><input name="title" class="form-control" required/></div><div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="4" required></textarea></div><div class="col-md-4"><label class="form-label">Price</label><input name="price" type="number" step="0.01" class="form-control"/></div><div class="col-md-4"><label class="form-label">Category</label><input name="category" class="form-control"/></div><div class="col-md-4"><label class="form-label">Location</label><input name="location" class="form-control"/></div><div class="col-12"><label class="form-label">Contact email</label><input name="contact_email" type="email" class="form-control" required/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Post listing</button></div></div></form></div></section>`,
    },
  ],
};
