import type { ModuleDefinition } from "../types";

export const donations: ModuleDefinition = {
  id: "donations",
  name: "Donations",
  tagline: "Fundraising with a goal bar and donor wall",
  description:
    "A donation page with a cause description, progress bar toward your goal, and a public donor wall. Collects donor name, email, amount and an optional message. Payment integration is handled by a separate Stripe module.",
  icon: "",
  color: "from-pink-500 to-rose-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "causeName", label: "Cause name", type: "text", default: "Help fund our mission", required: true },
    { key: "goal", label: "Fundraising goal ($)", type: "number", default: 10000, required: true },
    { key: "currency", label: "Currency symbol", type: "text", default: "$" },
  ],
  tables: [
    {
      name: "pledges",
      fields: [
        { name: "donor_name", type: "text" },
        { name: "email", type: "text" },
        { name: "amount", type: "float" },
        { name: "message", type: "text" },
        { name: "public", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "pledge",
      name: "Pledge donation",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "pledges",
            values: {
              donor_name: "{{trigger.donor_name}}",
              email: "{{trigger.email}}",
              amount: "{{trigger.amount}}",
              message: "{{trigger.message}}",
              public: "{{trigger.public}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thank you for your support!"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "wall",
      name: "Public donor wall",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "pledges", where: { public: "true" }, orderBy: "created_at desc", limit: 100, output: "rows" },
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
      slug: "donate",
      title: "Donate",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:780px;"><div class="text-center"><h1 class="display-4 fw-bold">{{config.causeName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Every donation helps us reach our goal.</p></div>
<div class="card p-4 mt-4 shadow-sm"><div class="d-flex justify-content-between small mb-2"><div><strong>{{config.currency}}6,840</strong> raised</div><div style="color:var(--nk-text-muted);">Goal: {{config.currency}}{{config.goal}}</div></div><div class="progress" style="height:14px;"><div class="progress-bar" style="width:68%;background:var(--nk-primary);"></div></div><div class="small mt-2" style="color:var(--nk-text-muted);">137 supporters · 32 days to go</div></div>
<form data-nk-form="" data-nk-flow-ref="pledge" class="card p-4 mt-4 shadow-sm"><h3 class="fw-bold">Donate</h3><div class="row g-3 mt-2"><div class="col-md-6"><label class="form-label">Your name</label><input name="donor_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Amount ({{config.currency}})</label><input name="amount" type="number" min="1" step="0.01" class="form-control" required/></div><div class="col-md-6 d-flex align-items-end"><div class="form-check"><input class="form-check-input" type="checkbox" name="public" value="true" checked/><label class="form-check-label">Show my name on the donor wall</label></div></div><div class="col-12"><label class="form-label">Message (optional)</label><textarea name="message" class="form-control" rows="2"></textarea></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Make donation</button></div></div></form></div></section>
<section class="py-5"><div class="container" style="max-width:780px;"><h2 class="fw-bold">Donor wall</h2><p style="color:var(--nk-text-muted);">Thank you to everyone who's supported us.</p>
<div data-nk-bind-flow-ref="wall" class="row g-3 mt-3">
  <div class="col-md-6" data-nk-item><div class="card p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold" data-nk-field="donor_name">Sarah Kim</div><div class="fw-bold" style="color:var(--nk-primary);">{{config.currency}}<span data-nk-field="amount">250</span></div></div><p class="small mt-2 mb-0" style="color:var(--nk-text-muted);" data-nk-field="message">"Happy to support this cause. Keep up the great work!"</p></div></div>
  <div class="col-md-6"><div class="card p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold">David Martinez</div><div class="fw-bold" style="color:var(--nk-primary);">{{config.currency}}100</div></div><p class="small mt-2 mb-0" style="color:var(--nk-text-muted);">"For my grandmother."</p></div></div>
  <div class="col-md-6"><div class="card p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold">Priya Patel</div><div class="fw-bold" style="color:var(--nk-primary);">{{config.currency}}500</div></div><p class="small mt-2 mb-0" style="color:var(--nk-text-muted);">"Matching gift from my employer!"</p></div></div>
  <div class="col-md-6"><div class="card p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold">Anonymous</div><div class="fw-bold" style="color:var(--nk-primary);">{{config.currency}}50</div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
