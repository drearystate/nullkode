import type { ModuleDefinition } from "../types";

export const pricing: ModuleDefinition = {
  id: "pricing",
  name: "Pricing Plans",
  tagline: "Display pricing tiers with a signup form",
  description:
    "A polished pricing page with three tiers (edit freely in the editor) and an interest form that captures emails for each selected plan.",
  icon: "",
  color: "from-emerald-500 to-green-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Page heading", type: "text", default: "Simple, fair pricing", required: true },
    { key: "sub", label: "Subheading", type: "text", default: "Pick a plan. Change any time." },
  ],
  tables: [
    {
      name: "leads",
      fields: [
        { name: "email", type: "text" },
        { name: "plan", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "interest",
      name: "Plan interest",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "leads", values: {
          email: "{{trigger.email}}",
          plan: "{{trigger.plan}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"We\'ll be in touch!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "leads-list",
      name: "List interested leads",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "leads", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "pricing",
      title: "Pricing",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.heading}}</h1><p class="lead" style="color:var(--nk-text-muted);">{{config.sub}}</p></div></section>
<section class="py-5"><div class="container"><div class="row g-4">
<div class="col-md-4"><div class="card h-100 p-4 shadow-sm"><h3 class="fw-bold">Starter</h3><div class="display-5 fw-bold my-3">$9<small class="fs-6" style="color:var(--nk-text-muted);">/mo</small></div><ul class="list-unstyled" style="color:var(--nk-text-muted);"><li>✓ Single user</li><li>✓ Core features</li><li>✓ Email support</li></ul><form data-nk-form="" data-nk-flow-ref="interest" class="mt-4"><input type="hidden" name="plan" value="Starter"/><input name="email" type="email" class="form-control mb-2" placeholder="you@example.com" required/><button class="btn btn-outline-primary w-100" type="submit">I'm interested</button></form></div></div>
<div class="col-md-4"><div class="card h-100 p-4 shadow" style="border-color:var(--nk-primary);"><span class="badge mb-2 align-self-start" style="background:var(--nk-primary);">Most popular</span><h3 class="fw-bold">Pro</h3><div class="display-5 fw-bold my-3">$29<small class="fs-6" style="color:var(--nk-text-muted);">/mo</small></div><ul class="list-unstyled" style="color:var(--nk-text-muted);"><li>✓ Up to 5 users</li><li>✓ Everything in Starter</li><li>✓ Priority support</li></ul><form data-nk-form="" data-nk-flow-ref="interest" class="mt-4"><input type="hidden" name="plan" value="Pro"/><input name="email" type="email" class="form-control mb-2" placeholder="you@example.com" required/><button class="btn btn-primary w-100" type="submit">Get Pro</button></form></div></div>
<div class="col-md-4"><div class="card h-100 p-4 shadow-sm"><h3 class="fw-bold">Team</h3><div class="display-5 fw-bold my-3">$99<small class="fs-6" style="color:var(--nk-text-muted);">/mo</small></div><ul class="list-unstyled" style="color:var(--nk-text-muted);"><li>✓ Unlimited users</li><li>✓ All Pro features</li><li>✓ Dedicated support</li></ul><form data-nk-form="" data-nk-flow-ref="interest" class="mt-4"><input type="hidden" name="plan" value="Team"/><input name="email" type="email" class="form-control mb-2" placeholder="you@example.com" required/><button class="btn btn-outline-primary w-100" type="submit">I'm interested</button></form></div></div>
</div></div></section>`,
    },
    {
      slug: "pricing-leads",
      title: "Pricing leads",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Pricing leads</h1><p style="color:var(--nk-text-muted);">Everyone who expressed interest.</p><div data-nk-bind-flow-ref="leads-list" class="mt-4"><div data-nk-item class="d-flex flex-wrap justify-content-between gap-2 py-2" style="border-bottom:1px solid var(--nk-border);"><a data-nk-attr-href="mailto:{email}" data-nk-field="email">email</a><span class="small" style="color:var(--nk-text-muted);"><span data-nk-field="plan"></span> · <span data-nk-field="created_at" data-nk-format="date"></span></span></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">No leads yet.</p></div></div></section>`,
    },
  ],
};
