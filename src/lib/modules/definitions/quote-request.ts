import type { ModuleDefinition } from "../types";

export const quoteRequest: ModuleDefinition = {
  id: "quote-request",
  name: "Quote Request",
  tagline: "Service request form with pipeline",
  description:
    "A request-a-quote form for service businesses. Capture project details, budget and timeline. Admin sees all requests with a status column for triage.",
  icon: "",
  color: "from-teal-500 to-cyan-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "businessName", label: "Business name", type: "text", default: "Your Studio", required: true },
  ],
  tables: [
    {
      name: "requests",
      fields: [
        { name: "name", type: "text" },
        { name: "email", type: "text" },
        { name: "company", type: "text" },
        { name: "project_type", type: "text" },
        { name: "budget", type: "text" },
        { name: "timeline", type: "text" },
        { name: "details", type: "text" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "submit",
      name: "Submit quote request",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "requests", values: {
          name: "{{trigger.name}}",
          email: "{{trigger.email}}",
          company: "{{trigger.company}}",
          project_type: "{{trigger.project_type}}",
          budget: "{{trigger.budget}}",
          timeline: "{{trigger.timeline}}",
          details: "{{trigger.details}}",
          status: "new",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Request received. We\'ll reply within one business day."}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "feed",
      name: "List requests",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "requests", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "quote",
      title: "Request a quote",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:720px;"><h1 class="display-4 fw-bold">Let's work together</h1><p class="lead" style="color:var(--nk-text-muted);">Tell us about your project and we'll get back to you with a quote.</p><form data-nk-form="" data-nk-flow-ref="submit" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Company</label><input name="company" class="form-control"/></div><div class="col-md-6"><label class="form-label">Project type</label><select name="project_type" class="form-select"><option>Brand identity</option><option>Website</option><option>Mobile app</option><option>Consulting</option><option>Other</option></select></div><div class="col-md-6"><label class="form-label">Budget</label><select name="budget" class="form-select"><option>Under $5k</option><option>$5k – $15k</option><option>$15k – $50k</option><option>$50k+</option></select></div><div class="col-md-6"><label class="form-label">Timeline</label><select name="timeline" class="form-select"><option>ASAP</option><option>1–2 months</option><option>3–6 months</option><option>No rush</option></select></div><div class="col-12"><label class="form-label">Tell us more</label><textarea name="details" class="form-control" rows="5" required></textarea></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Send request</button></div></div></form></div></section>`,
    },
    {
      slug: "quote-admin",
      title: "Quote requests",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Quote requests</h1>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold" data-nk-field="name">Sarah Kim</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="company">Acme Co</span> · <span data-nk-field="project_type">Website</span> · <span data-nk-field="budget">$15k – $50k</span></div></div><span class="badge" style="background:var(--nk-primary);" data-nk-field="status">new</span></div><p class="small mt-2 mb-0" data-nk-field="details">Looking for a complete redesign of our marketing site. Need it live for our Q3 launch.</p></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold">David Martinez</div><div class="small" style="color:var(--nk-text-muted);">Bluebird Inc · Mobile app · $50k+</div></div><span class="badge bg-warning" style="color:var(--nk-text);">contacted</span></div><p class="small mt-2 mb-0">Building an iOS + Android app for our service. We have wireframes ready.</p></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold">Priya Patel</div><div class="small" style="color:var(--nk-text-muted);">Daylight Studio · Brand identity · $5k – $15k</div></div><span class="badge" style="background:var(--nk-primary);">quoted</span></div><p class="small mt-2 mb-0">Full brand refresh for a new direction. Logo, palette, type system, brand guide.</p></div></div>
</div>
</div></section>`,
    },
  ],
};
