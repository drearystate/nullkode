import type { ModuleDefinition } from "../types";

export const coupons: ModuleDefinition = {
  id: "coupons",
  name: "Coupons",
  tagline: "Discount codes and redemption",
  description:
    "Create discount codes customers can redeem on a public page. Tracks which codes have been used, their discount amount, and the redemption history.",
  icon: "",
  color: "from-orange-500 to-amber-600",
  category: "commerce",
  version: "1.0.0",
  provides: ["coupons"],
  config: [
    { key: "brand", label: "Brand name", type: "text", default: "our store", required: true },
  ],
  tables: [
    {
      name: "codes",
      fields: [
        { name: "code", type: "text" },
        { name: "discount_percent", type: "int" },
        { name: "description", type: "text" },
        { name: "active", type: "bool" },
        { name: "uses", type: "int" },
      ],
    },
    {
      name: "redemptions",
      fields: [
        { name: "code", type: "text" },
        { name: "customer_email", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create-code",
      name: "Create coupon code",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "codes", values: {
          code: "{{trigger.code}}",
          discount_percent: "{{trigger.discount_percent}}",
          description: "{{trigger.description}}",
          active: "true",
          uses: "0",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "redeem",
      name: "Redeem coupon",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "redemptions", values: {
          code: "{{trigger.code}}",
          customer_email: "{{trigger.email}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Code applied"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "list-codes",
      name: "List active codes",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "codes", where: { active: "true" }, orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "redeem",
      title: "Redeem coupon",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:560px;"><div class="text-center"><h1 class="display-5 fw-bold">Got a code?</h1><p class="lead" style="color:var(--nk-text-muted);">Redeem it below to get your discount at {{config.brand}}.</p></div><form data-nk-form="" data-nk-flow-ref="redeem" class="card p-4 mt-4 shadow-sm"><div class="mb-3"><label class="form-label">Coupon code</label><input name="code" class="form-control form-control-lg text-uppercase" required/></div><div class="mb-3"><label class="form-label">Your email</label><input name="email" type="email" class="form-control" required/></div><div class="text-end"><button class="btn btn-primary btn-lg" type="submit">Redeem</button></div></form></div></section>`,
    },
    {
      slug: "coupons-admin",
      title: "Coupons admin",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Manage coupons</h1><form data-nk-form="" data-nk-flow-ref="create-code" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-4"><label class="form-label">Code</label><input name="code" class="form-control text-uppercase" required/></div><div class="col-md-3"><label class="form-label">Discount %</label><input name="discount_percent" type="number" min="0" max="100" class="form-control" required/></div><div class="col-md-5"><label class="form-label">Description</label><input name="description" class="form-control"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Create</button></div></div></form><div class="mt-5"><h4>Active codes</h4><div data-nk-bind-flow-ref="list-codes" class="mt-3"><div data-nk-item class="p-3 mb-2" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><div class="d-flex flex-wrap justify-content-between gap-2"><code class="fs-6" data-nk-field="code">CODE</code><span class="fw-semibold"><span data-nk-field="discount_percent"></span>% off</span></div><div class="small mt-1" style="color:var(--nk-text-muted);"><span data-nk-field="description"></span></div><div class="small mt-1">Used <span data-nk-field="uses">0</span> times · Active: <span data-nk-field="active"></span></div></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">No codes yet.</p></div></div></div></section>`,
    },
  ],
};
