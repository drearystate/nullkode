import type { ModuleDefinition } from "../types";

export const properties: ModuleDefinition = {
  id: "properties",
  name: "Real Estate Listings",
  tagline: "Property listings with details",
  description:
    "A real estate listings page with photos, price, beds, baths, square footage and address. Plus an inquiry form so interested buyers can reach out.",
  icon: "",
  color: "from-amber-500 to-orange-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "agencyName", label: "Agency name", type: "text", default: "Our Realty", required: true },
  ],
  tables: [
    {
      name: "listings",
      fields: [
        { name: "title", type: "text" },
        { name: "address", type: "text" },
        { name: "price", type: "float" },
        { name: "beds", type: "int" },
        { name: "baths", type: "float" },
        { name: "sqft", type: "int" },
        { name: "image_url", type: "text" },
        { name: "description", type: "text" },
        { name: "status", type: "text" },
      ],
    },
    {
      name: "inquiries",
      fields: [
        { name: "listing_id", type: "int" },
        { name: "name", type: "text" },
        { name: "email", type: "text" },
        { name: "phone", type: "text" },
        { name: "message", type: "text" },
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
        { id: "n2", type: "query", data: { table: "listings", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "inquire",
      name: "Send inquiry",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "inquiries", values: {
          listing_id: "{{trigger.listing_id}}",
          name: "{{trigger.name}}",
          email: "{{trigger.email}}",
          phone: "{{trigger.phone}}",
          message: "{{trigger.message}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Your inquiry has been sent!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "listings",
      title: "Listings",
      html: `<section class="py-5" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;"><div class="container"><h1 class="display-4 fw-bold">{{config.agencyName}}</h1><p class="lead" style="color:rgba(255,255,255,0.5);">Homes for sale</p></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-6 col-lg-4" data-nk-item><div class="card border-0 shadow-sm h-100"><div class="position-relative"><img class="card-img-top" data-nk-src="image_url" src="/media/generated/realestate-klickitat-house.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);" data-nk-field="status">For sale</span></div><div class="card-body"><h5 class="fw-bold" data-nk-field="title">Modern 3BR Craftsman</h5><div class="display-6 fw-bold" style="color:var(--nk-primary);">$<span data-nk-field="price">620,000</span></div><div class="small mb-2" style="color:var(--nk-text-muted);" data-nk-field="address">1234 Elm St, Portland, OR</div><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> <span data-nk-field="beds">3</span> beds</span><span> <span data-nk-field="baths">2</span> baths</span><span> <span data-nk-field="sqft">1,800</span> sqft</span></div></div></div></div>
  <div class="col-md-6 col-lg-4"><div class="card border-0 shadow-sm h-100"><div class="position-relative"><img class="card-img-top" src="/media/generated/realestate-burrage-ranch.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">For sale</span></div><div class="card-body"><h5 class="fw-bold">Charming 2BR Bungalow</h5><div class="display-6 fw-bold" style="color:var(--nk-primary);">$445,000</div><div class="small mb-2" style="color:var(--nk-text-muted);">42 Maple Ave, Seattle, WA</div><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 2 beds</span><span> 1 bath</span><span> 1,200 sqft</span></div></div></div></div>
  <div class="col-md-6 col-lg-4"><div class="card border-0 shadow-sm h-100"><div class="position-relative"><img class="card-img-top" src="/media/generated/hospitality-courtyard-pool.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge bg-warning" style="color:var(--nk-text);">Pending</span></div><div class="card-body"><h5 class="fw-bold">Spacious 4BR with pool</h5><div class="display-6 fw-bold" style="color:var(--nk-primary);">$895,000</div><div class="small mb-2" style="color:var(--nk-text-muted);">890 Oak Dr, Austin, TX</div><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 4 beds</span><span> 3 baths</span><span> 2,900 sqft</span></div></div></div></div>
  <div class="col-md-6 col-lg-4"><div class="card border-0 shadow-sm h-100"><div class="position-relative"><img class="card-img-top" src="/media/generated/portfolio-vesterbro-loft.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">For sale</span></div><div class="card-body"><h5 class="fw-bold">Downtown loft</h5><div class="display-6 fw-bold" style="color:var(--nk-primary);">$525,000</div><div class="small mb-2" style="color:var(--nk-text-muted);">500 Main St, Brooklyn, NY</div><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 1 bed</span><span> 1 bath</span><span> 1,100 sqft</span></div></div></div></div>
  <div class="col-md-6 col-lg-4"><div class="card border-0 shadow-sm h-100"><div class="position-relative"><img class="card-img-top" src="/media/generated/realestate-woodstock-modern.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">For sale</span></div><div class="card-body"><h5 class="fw-bold">Mid-century modern</h5><div class="display-6 fw-bold" style="color:var(--nk-primary);">$780,000</div><div class="small mb-2" style="color:var(--nk-text-muted);">15 Hill Rd, Palm Springs, CA</div><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 3 beds</span><span> 2 baths</span><span> 2,100 sqft</span></div></div></div></div>
  <div class="col-md-6 col-lg-4"><div class="card border-0 shadow-sm h-100"><div class="position-relative"><img class="card-img-top" src="/media/generated/realestate-irving-townhome.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge bg-secondary">Sold</span></div><div class="card-body"><h5 class="fw-bold">Historic brick townhouse</h5><div class="display-6 fw-bold" style="color:var(--nk-primary);">$1,100,000</div><div class="small mb-2" style="color:var(--nk-text-muted);">701 Pine St, Philadelphia, PA</div><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 4 beds</span><span> 3 baths</span><span> 2,700 sqft</span></div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
