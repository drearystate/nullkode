import type { ModuleDefinition } from "../types";

export const emergencyContacts: ModuleDefinition = {
  id: "emergency-contacts",
  name: "Emergency Contacts",
  tagline: "Quick-call emergency contact list",
  description:
    "A list of emergency contacts with name, relationship and phone. Tap-to-call on mobile. Great for schools, camps, office front desks and families.",
  icon: "",
  color: "from-red-500 to-rose-700",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Heading", type: "text", default: "Emergency contacts", required: true },
  ],
  tables: [
    {
      name: "contacts",
      fields: [
        { name: "name", type: "text" },
        { name: "relationship", type: "text" },
        { name: "phone", type: "text" },
        { name: "email", type: "text" },
        { name: "notes", type: "text" },
        { name: "priority", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "List contacts",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "contacts", orderBy: "priority asc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add contact",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "contacts", values: {
          name: "{{trigger.name}}",
          relationship: "{{trigger.relationship}}",
          phone: "{{trigger.phone}}",
          email: "{{trigger.email}}",
          notes: "{{trigger.notes}}",
          priority: "{{trigger.priority}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "emergency",
      title: "Emergency",
      html: `<section class="py-5 text-center" style="background:var(--nk-primary);color:#fff;"><div class="container"><h1 class="display-4 fw-bold">{{config.heading}}</h1><p class="lead">In an emergency, dial 911 first, then contact the people below.</p></div></section>
<section class="py-5"><div class="container" style="max-width:760px;">
<div data-nk-bind-flow-ref="feed" class="row g-3">
  <div class="col-md-6" data-nk-item><div class="card border-0 shadow-sm h-100"><div class="card-body p-4"><div class="d-flex justify-content-between align-items-start"><div><h5 class="fw-bold mb-0" data-nk-field="name">Marie Chen</h5><div class="small" style="color:var(--nk-text-muted);" data-nk-field="relationship">Mother</div></div><span class="badge" style="background:var(--nk-primary);">#<span data-nk-field="priority">1</span></span></div><a class="btn btn-primary w-100 mt-3" data-nk-href="phone" href="tel:+15551234567"> <span data-nk-field="phone">(555) 123-4567</span></a><div class="small mt-2" style="color:var(--nk-text-muted);" data-nk-field="notes">Primary contact, available 24/7</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm h-100"><div class="card-body p-4"><div class="d-flex justify-content-between align-items-start"><div><h5 class="fw-bold mb-0">Dr. Sarah Kim</h5><div class="small" style="color:var(--nk-text-muted);">Family doctor</div></div><span class="badge" style="background:var(--nk-primary);">#2</span></div><a class="btn btn-primary w-100 mt-3" href="tel:+15552345678"> (555) 234-5678</a><div class="small mt-2" style="color:var(--nk-text-muted);">Westside Medical, after-hours line available</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm h-100"><div class="card-body p-4"><div class="d-flex justify-content-between align-items-start"><div><h5 class="fw-bold mb-0">David Martinez</h5><div class="small" style="color:var(--nk-text-muted);">Neighbor</div></div><span class="badge" style="background:var(--nk-primary);">#3</span></div><a class="btn btn-primary w-100 mt-3" href="tel:+15553456789"> (555) 345-6789</a><div class="small mt-2" style="color:var(--nk-text-muted);">Has spare keys, knows the kids</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm h-100"><div class="card-body p-4"><div class="d-flex justify-content-between align-items-start"><div><h5 class="fw-bold mb-0">Poison Control</h5><div class="small" style="color:var(--nk-text-muted);">National hotline</div></div><span class="badge" style="background:color-mix(in srgb, var(--nk-text) 50%, var(--nk-bg));">#4</span></div><a class="btn btn-primary w-100 mt-3" href="tel:18002221222"> 1-800-222-1222</a><div class="small mt-2" style="color:var(--nk-text-muted);">24/7, free, confidential</div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
