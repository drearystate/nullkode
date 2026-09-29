import type { ModuleDefinition } from "../types";

export const leads: ModuleDefinition = {
  id: "leads",
  name: "Mini CRM",
  tagline: "Track leads through a pipeline",
  description:
    "A lightweight CRM: capture leads with name, company, email and stage. Visualize your pipeline by stage and know who to follow up with.",
  icon: "",
  color: "from-sky-500 to-blue-600",
  category: "commerce",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "leads",
      fields: [
        { name: "full_name", type: "text" },
        { name: "company", type: "text" },
        { name: "email", type: "text" },
        { name: "phone", type: "text" },
        { name: "stage", type: "text" },
        { name: "value", type: "float" },
        { name: "notes", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "capture",
      name: "Capture lead",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "leads", values: {
          full_name: "{{trigger.full_name}}",
          company: "{{trigger.company}}",
          email: "{{trigger.email}}",
          phone: "{{trigger.phone}}",
          stage: "new",
          notes: "{{trigger.notes}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks! We\'ll be in touch."}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "feed",
      name: "List leads",
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
      slug: "leads",
      title: "Leads",
      html: `<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">Pipeline</h1>
<div data-nk-bind-flow-ref="feed" class="row g-4 mt-2">
  <div class="col-md-6" data-nk-item><div class="card border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold" data-nk-field="full_name">Sarah Kim</div><div class="small" data-nk-field="company" style="color:var(--nk-text-muted);">Acme Co</div></div><span class="badge" data-nk-field="stage" style="background:var(--nk-primary);">qualified</span></div><div class="small mt-2" data-nk-field="email" style="color:var(--nk-text-muted);">sarah@acme.co</div><div class="fw-bold mt-1">$<span data-nk-field="value">12,000</span> potential</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold">David Martinez</div><div class="small" style="color:var(--nk-text-muted);">Bluebird Inc</div></div><span class="badge" style="background:var(--nk-primary);">proposal</span></div><div class="small mt-2" style="color:var(--nk-text-muted);">david@bluebird.io</div><div class="fw-bold mt-1">$8,500 potential</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold">Priya Patel</div><div class="small" style="color:var(--nk-text-muted);">Daylight Studio</div></div><span class="badge bg-warning" style="color:var(--nk-text);">contacted</span></div><div class="small mt-2" style="color:var(--nk-text-muted);">priya@daylight.studio</div><div class="fw-bold mt-1">$5,000 potential</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold">Marcus Lee</div><div class="small" style="color:var(--nk-text-muted);">Noon Coffee</div></div><span class="badge bg-secondary">new</span></div><div class="small mt-2" style="color:var(--nk-text-muted);">marcus@nooncoffee.com</div><div class="fw-bold mt-1">$3,200 potential</div></div></div></div>
</div>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:680px;"><h3 class="fw-bold">Capture a new lead</h3><form data-nk-form="" data-nk-flow-ref="capture" class="card p-4 mt-3 shadow-sm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Full name</label><input name="full_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Company</label><input name="company" class="form-control"/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control"/></div><div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control"/></div><div class="col-12"><label class="form-label">Notes</label><textarea name="notes" class="form-control" rows="3"></textarea></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Save lead</button></div></div></form></div></section>`,
    },
  ],
};
