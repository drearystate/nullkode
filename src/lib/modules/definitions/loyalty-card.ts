import type { ModuleDefinition } from "../types";

export const loyaltyCard: ModuleDefinition = {
  id: "loyalty-card",
  name: "Loyalty Punch Card",
  tagline: "Punch card rewards — buy 10 get 1 free",
  description:
    "A digital punch card for your shop. Customers give their phone number at the counter, you punch their card, and when they reach the goal they get a free item. Tracks every customer and every punch.",
  icon: "",
  color: "from-yellow-500 to-amber-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "shopName", label: "Shop name", type: "text", default: "Our shop", required: true },
    { key: "rewardText", label: "Reward description", type: "text", default: "a free coffee", required: true },
    { key: "punchGoal", label: "Punches to reward", type: "number", default: 10, required: true },
  ],
  tables: [
    {
      name: "cards",
      fields: [
        { name: "customer_name", type: "text" },
        { name: "phone", type: "text" },
        { name: "punches", type: "int" },
        { name: "rewards_earned", type: "int" },
      ],
    },
    {
      name: "punches",
      fields: [
        { name: "phone", type: "text" },
        { name: "note", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "enroll",
      name: "Enroll new customer",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "cards",
            values: {
              customer_name: "{{trigger.customer_name}}",
              phone: "{{trigger.phone}}",
              punches: "0",
              rewards_earned: "0",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Welcome! Your card is ready."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "punch",
      name: "Add a punch",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "punches",
            values: { phone: "{{trigger.phone}}", note: "{{trigger.note}}" },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Punch added!"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "leaderboard",
      name: "Top customers",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "cards", orderBy: "punches desc", limit: 20, output: "rows" },
        },
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
      slug: "loyalty",
      title: "Rewards",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:680px;"><div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">{{config.shopName}} rewards</h1><p class="lead" style="color:var(--nk-text-muted);">Collect {{config.punchGoal}} punches, get {{config.rewardText}} on us.</p></div>
<form data-nk-form="" data-nk-flow-ref="enroll" class="card p-4 mt-4 shadow-sm"><h3 class="fw-bold">Join our rewards program</h3><div class="row g-3 mt-2"><div class="col-md-7"><label class="form-label">Your name</label><input name="customer_name" class="form-control" required/></div><div class="col-md-5"><label class="form-label">Phone</label><input name="phone" class="form-control" required/></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Get my card</button></div></div></form>
</div></section>
<section class="py-5"><div class="container" style="max-width:680px;"><h3 class="fw-bold">Top customers</h3>
<div data-nk-bind-flow-ref="leaderboard" class="mt-3">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" data-nk-item style="background:var(--nk-surface);"><div class="display-6"></div><div class="flex-grow-1"><div class="fw-bold" data-nk-field="customer_name">Marcus Lee</div><div class="small" style="color:var(--nk-text-muted);">Rewards earned: <span data-nk-field="rewards_earned">3</span></div></div><div class="fs-4 fw-bold" style="color:var(--nk-primary);"><span data-nk-field="punches">27</span></div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="display-6"></div><div class="flex-grow-1"><div class="fw-bold">Sarah Kim</div><div class="small" style="color:var(--nk-text-muted);">Rewards earned: 2</div></div><div class="fs-4 fw-bold" style="color:var(--nk-primary);">21</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="display-6"></div><div class="flex-grow-1"><div class="fw-bold">Priya Patel</div><div class="small" style="color:var(--nk-text-muted);">Rewards earned: 1</div></div><div class="fs-4 fw-bold" style="color:var(--nk-primary);">16</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><div class="fs-4 fw-bold text-center" style="width:40px;color:var(--nk-text-muted);">4</div><div class="flex-grow-1"><div class="fw-bold">David Martinez</div><div class="small" style="color:var(--nk-text-muted);">Rewards earned: 1</div></div><div class="fs-4 fw-bold">12</div></div>
</div>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:520px;"><h3 class="fw-bold">Staff: add a punch</h3>
<form data-nk-form="" data-nk-flow-ref="punch" class="card p-3 mt-3 shadow-sm"><div class="row g-2"><div class="col-md-7"><input name="phone" class="form-control" placeholder="Customer phone" required/></div><div class="col-md-5"><button class="btn btn-primary w-100" type="submit">+ Punch</button></div><div class="col-12"><input name="note" class="form-control" placeholder="Note (optional)"/></div></div></form></div></section>`,
    },
  ],
};
