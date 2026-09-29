import type { ModuleDefinition } from "../types";

export const subscription: ModuleDefinition = {
  id: "subscription",
  name: "Subscription Box",
  tagline: "Monthly subscription signup",
  description:
    "A sign-up page for a monthly subscription with tier picker, shipping info and confirmation. Stores members in a table to charge and fulfill.",
  icon: "",
  color: "from-amber-500 to-orange-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "boxName", label: "Box name", type: "text", default: "The Monthly Box", required: true },
  ],
  tables: [
    {
      name: "members",
      fields: [
        { name: "full_name", type: "text" },
        { name: "email", type: "text" },
        { name: "tier", type: "text" },
        { name: "shipping_address", type: "text" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "subscribe",
      name: "Subscribe",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "members", values: {
          full_name: "{{trigger.full_name}}",
          email: "{{trigger.email}}",
          tier: "{{trigger.tier}}",
          shipping_address: "{{trigger.shipping_address}}",
          status: "active",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Welcome to the box!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "list",
      name: "List members",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "members", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "subscribe",
      title: "Subscribe",
      html: `<section class="py-5" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;"><div class="container text-center"><h1 class="display-3 fw-bold">{{config.boxName}}</h1><p class="lead" style="color:rgba(255,255,255,0.5);">A hand-picked box of our favorite things, delivered monthly.</p></div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:720px;"><h2 class="fw-bold text-center">Pick your tier</h2><form data-nk-form="" data-nk-flow-ref="subscribe" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-4 text-center"><label class="card h-100 p-3" style="border-color:var(--nk-primary);"><input type="radio" name="tier" value="starter" checked class="form-check-input"/><div class="fw-bold mt-2">Starter</div><div class="display-6 fw-bold">$19</div><div class="small" style="color:var(--nk-text-muted);">/ month</div><div class="small mt-2">3 items per box</div></label></div><div class="col-md-4 text-center"><label class="card h-100 p-3"><input type="radio" name="tier" value="classic" class="form-check-input"/><div class="fw-bold mt-2">Classic</div><div class="display-6 fw-bold">$39</div><div class="small" style="color:var(--nk-text-muted);">/ month</div><div class="small mt-2">6 items + a surprise</div></label></div><div class="col-md-4 text-center"><label class="card h-100 p-3"><input type="radio" name="tier" value="deluxe" class="form-check-input"/><div class="fw-bold mt-2">Deluxe</div><div class="display-6 fw-bold">$69</div><div class="small" style="color:var(--nk-text-muted);">/ month</div><div class="small mt-2">10 items, premium picks</div></label></div><div class="col-md-6"><label class="form-label">Your name</label><input name="full_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-12"><label class="form-label">Shipping address</label><textarea name="shipping_address" class="form-control" rows="3" required></textarea></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Start subscription</button></div></div></form></div></section>`,
    },
  ],
};
