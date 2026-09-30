import type { ModuleDefinition } from "../types";

export const marketplace: ModuleDefinition = {
  id: "marketplace",
  name: "Marketplace",
  tagline: "Multi-vendor sellers on top of your shop",
  description:
    "Turn a single-vendor shop into a multi-vendor marketplace. Sellers sign up, list products under their store, and an admin sees orders + commissions across all stores. Each product is owned by a seller, with an automatic commission split.",
  icon: "",
  color: "from-orange-500 to-amber-700",
  category: "commerce",
  version: "1.0.0",
  requires: ["auth-session", "auth-users"],
  worksWith: ["shop", "stripe-checkout", "inventory"],
  config: [
    { key: "marketName", label: "Marketplace name", type: "text", default: "Our Market", required: true },
    { key: "commissionPct", label: "Platform commission %", type: "number", default: 10 },
  ],
  tables: [
    {
      name: "stores",
      fields: [
        { name: "owner_user_id", type: "text" },
        { name: "name", type: "text" },
        { name: "slug", type: "text" },
        { name: "logo_url", type: "text" },
        { name: "tagline", type: "text" },
        { name: "approved", type: "bool" },
      ],
    },
    {
      name: "listings",
      fields: [
        { name: "store_id", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "price", type: "float" },
        { name: "image_url", type: "text" },
        { name: "active", type: "bool" },
      ],
    },
    {
      name: "orders",
      fields: [
        { name: "store_id", type: "text" },
        { name: "listing_id", type: "text" },
        { name: "buyer_email", type: "text" },
        { name: "amount", type: "float" },
        { name: "commission", type: "float" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create-store",
      name: "Apply to become a seller",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "stores",
            values: {
              owner_user_id: "{{vars.session.userId}}",
              name: "{{trigger.name}}",
              slug: "{{trigger.slug}}",
              logo_url: "{{trigger.logo_url}}",
              tagline: "{{trigger.tagline}}",
              approved: "false",
            },
            output: "store",
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"message":"Your store is pending approval."}' } },
        { id: "n6", type: "response", data: { status: 401, body: '{"error":"Sign in first"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
    {
      slug: "add-listing",
      name: "Add a listing to my store",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: { table: "stores", where: { owner_user_id: "{{vars.session.userId}}" }, limit: 1, output: "store" },
        },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "listings",
            values: {
              store_id: "{{vars.store.0.id}}",
              title: "{{trigger.title}}",
              description: "{{trigger.description}}",
              price: "{{trigger.price}}",
              image_url: "{{trigger.image_url}}",
              active: "true",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "browse",
      name: "Browse all listings",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "listings", where: { active: "true" }, orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "stores",
      name: "Browse all stores",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "stores", where: { approved: "true" }, orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "buy",
      name: "Record a purchase",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "listings", where: { id: "{{trigger.listing_id}}" }, limit: 1, output: "l" } },
        { id: "n3", type: "math", data: { expression: "{{vars.l.0.price}} * {{config.commissionPct}} / 100", output: "fee" } },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "orders",
            values: {
              store_id: "{{vars.l.0.store_id}}",
              listing_id: "{{vars.l.0.id}}",
              buyer_email: "{{trigger.buyer_email}}",
              amount: "{{vars.l.0.price}}",
              commission: "{{vars.fee}}",
              status: "paid",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"message":"Order placed."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "admin-orders",
      name: "Admin: all orders",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "orders", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "marketplace",
      title: "Marketplace",
      isHome: true,
      html: `<header class="py-3" style="background:var(--nk-text);color:#fff;"><div class="container d-flex justify-content-between align-items-center"><a href="/" class="text-decoration-none fw-bold" style="color:#fff;">{{config.marketName}}</a><nav class="d-flex gap-3 small"><a class="text-decoration-none" style="color:rgba(255,255,255,0.65);" href="/marketplace">Browse</a><a class="text-decoration-none" style="color:rgba(255,255,255,0.65);" href="/stores">Stores</a><a class="text-decoration-none" style="color:rgba(255,255,255,0.65);" href="/sell">Sell on {{config.marketName}}</a></nav></div></header>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container"><h1 class="display-4 fw-bold">Discover</h1><p class="lead" style="color:var(--nk-text-muted);">Goods from independent sellers around the network.</p></div></section>
<section class="py-5"><div class="container"><div data-nk-bind-flow-ref="browse" class="row g-4">
  <div class="col-md-3 col-sm-6" data-nk-item><div class="card border-0 shadow-sm h-100"><img class="card-img-top" data-nk-src="image_url" src="/media/generated/ecommerce-fog-mug.webp" style="aspect-ratio:4/3;object-fit:cover;" alt=""/><div class="card-body"><h6 class="fw-bold mb-1" data-nk-field="title">Handmade ceramic mug</h6><div class="fw-bold">$<span data-nk-field="price">24</span></div></div></div></div>
</div></div></section>`,
    },
    {
      slug: "stores",
      title: "Stores",
      html: `<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">Stores</h1><div data-nk-bind-flow-ref="stores" class="row g-4 mt-2">
  <div class="col-md-4" data-nk-item><div class="card border-0 shadow-sm h-100 p-3 text-center"><img class="rounded-circle mx-auto" style="width:80px;height:80px;object-fit:cover;" data-nk-src="logo_url" src="/media/generated/thumbs/ecommerce-wheel-hands.webp" alt=""/><h5 class="fw-bold mt-3" data-nk-field="name">Maker Studio</h5><div class="small" style="color:var(--nk-text-muted);" data-nk-field="tagline">Hand-thrown ceramics and homewares.</div></div></div>
</div></div></section>`,
    },
    {
      slug: "sell",
      title: "Sell on the marketplace",
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:600px;"><h1 class="display-5 fw-bold">Sell on {{config.marketName}}</h1><p style="color:var(--nk-text-muted);">{{config.commissionPct}}% platform commission per sale. Free to apply.</p>
<form data-nk-form="" data-nk-flow-ref="create-store" class="card p-4 mt-3 shadow-sm">
  <div class="mb-3"><label class="form-label">Store name</label><input name="name" class="form-control" required/></div>
  <div class="mb-3"><label class="form-label">URL slug</label><input name="slug" class="form-control" placeholder="my-store" required/></div>
  <div class="mb-3"><label class="form-label">Tagline</label><input name="tagline" class="form-control"/></div>
  <div class="mb-3"><label class="form-label">Logo URL</label><input name="logo_url" type="url" class="form-control"/></div>
  <button class="btn btn-primary btn-lg w-100" type="submit">Apply to sell</button>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>

<h4 class="fw-bold mt-5">Once approved — add a listing</h4>
<form data-nk-form="" data-nk-flow-ref="add-listing" class="card p-4 mt-3 shadow-sm">
  <div class="mb-3"><label class="form-label">Title</label><input name="title" class="form-control" required/></div>
  <div class="row g-3"><div class="col-md-6"><label class="form-label">Price ($)</label><input name="price" type="number" step="0.01" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Image URL</label><input name="image_url" type="url" class="form-control"/></div></div>
  <div class="mt-3"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="3"></textarea></div>
  <button class="btn btn-primary mt-3" type="submit">Publish listing</button>
</form>
</div></section>`,
    },
    {
      slug: "admin-marketplace",
      title: "Admin",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Marketplace admin</h1>
<div data-nk-bind-flow-ref="admin-orders" class="table-responsive mt-3"><table class="table align-middle"><thead><tr><th>Store</th><th>Buyer</th><th>Amount</th><th>Commission</th><th>Status</th></tr></thead><tbody>
  <tr data-nk-item><td data-nk-field="store_id">42</td><td data-nk-field="buyer_email">b@example.com</td><td>$<span data-nk-field="amount">29</span></td><td>$<span data-nk-field="commission">2.90</span></td><td data-nk-field="status">paid</td></tr>
</tbody></table></div>
</div></section>`,
    },
  ],
};
