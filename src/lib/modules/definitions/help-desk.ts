import type { ModuleDefinition } from "../types";

export const helpDesk: ModuleDefinition = {
  id: "help-desk",
  name: "Help Desk",
  tagline: "Customer support tickets",
  description:
    "Customer submits a support ticket with subject, description and priority. You triage and resolve from an admin ticket list.",
  icon: "",
  color: "from-cyan-500 to-blue-600",
  category: "commerce",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "tickets",
      fields: [
        { name: "customer_name", type: "text" },
        { name: "email", type: "text" },
        { name: "subject", type: "text" },
        { name: "description", type: "text" },
        { name: "priority", type: "text" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create",
      name: "Submit ticket",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "tickets", values: {
          customer_name: "{{trigger.customer_name}}",
          email: "{{trigger.email}}",
          subject: "{{trigger.subject}}",
          description: "{{trigger.description}}",
          priority: "{{trigger.priority}}",
          status: "open",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Ticket received. We\'ll respond shortly."}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "feed",
      name: "List tickets",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tickets", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "support",
      title: "Support",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="display-5 fw-bold">Need help?</h1><p style="color:var(--nk-text-muted);">Open a ticket and we'll get back to you soon.</p><form data-nk-form="" data-nk-flow-ref="create" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="customer_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-md-8"><label class="form-label">Subject</label><input name="subject" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Priority</label><select name="priority" class="form-select"><option>low</option><option selected>medium</option><option>high</option><option>urgent</option></select></div><div class="col-12"><label class="form-label">Describe the issue</label><textarea name="description" class="form-control" rows="5" required></textarea></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Submit ticket</button></div></div></form></div></section>`,
    },
    {
      slug: "tickets",
      title: "Tickets",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Open tickets</h1>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold" data-nk-field="subject">Can't log in after password reset</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="customer_name">Sarah Kim</span> · <span data-nk-field="email">sarah@acme.co</span></div></div><div><span class="badge bg-danger me-1" data-nk-field="priority">urgent</span><span class="badge bg-warning" data-nk-field="status" style="color:var(--nk-text);">open</span></div></div><p class="small mt-2 mb-0" data-nk-field="description">Reset link worked but the new password doesn't let me in. Cache cleared, tried 3 times.</p></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold">Invoice showing wrong total</div><div class="small" style="color:var(--nk-text-muted);">David Martinez · david@bluebird.io</div></div><div><span class="badge bg-warning me-1" style="color:var(--nk-text);">high</span><span class="badge bg-warning" style="color:var(--nk-text);">open</span></div></div><p class="small mt-2 mb-0">Invoice 2026-002 shows $240 but the work agreement was $2,400.</p></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold">Feature request: dark mode</div><div class="small" style="color:var(--nk-text-muted);">Priya Patel · priya@daylight.studio</div></div><div><span class="badge bg-secondary me-1">low</span><span class="badge" style="background:var(--nk-primary);">in progress</span></div></div><p class="small mt-2 mb-0">Would love a dark mode for the admin dashboard. The rest of our tools all have one.</p></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold">Billing question</div><div class="small" style="color:var(--nk-text-muted);">Marcus Lee · marcus@nooncoffee.com</div></div><div><span class="badge bg-secondary me-1">medium</span><span class="badge" style="background:var(--nk-primary);">resolved</span></div></div><p class="small mt-2 mb-0">What's the difference between the Pro and Team plans? Need to pick the right one.</p></div></div>
</div>
</div></section>`,
    },
  ],
};
