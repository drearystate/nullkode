import type { ModuleDefinition } from "../types";

export const appointments: ModuleDefinition = {
  id: "appointments",
  name: "Appointments",
  tagline: "Services, providers, and slot bookings",
  description:
    "Structured appointments: a list of services with duration and price, assigned to providers, and customers book a specific slot. More flexible than Bookings — great for salons, clinics, and consultancies.",
  icon: "",
  color: "from-indigo-500 to-violet-600",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "currency", label: "Currency symbol", type: "text", default: "$" },
    { key: "businessName", label: "Business name", type: "text", default: "Your Business", required: true },
  ],
  tables: [
    {
      name: "services",
      fields: [
        { name: "name", type: "text" },
        { name: "duration_minutes", type: "int" },
        { name: "price", type: "float" },
        { name: "description", type: "text" },
      ],
    },
    {
      name: "providers",
      fields: [
        { name: "name", type: "text" },
        { name: "role", type: "text" },
      ],
    },
    {
      name: "appointments",
      fields: [
        { name: "customer_name", type: "text" },
        { name: "email", type: "text" },
        { name: "phone", type: "text" },
        { name: "service", type: "text" },
        { name: "provider", type: "text" },
        { name: "slot_at", type: "timestamp" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "list-services",
      name: "List services",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "services", orderBy: "name asc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "book",
      name: "Book appointment",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "appointments", values: {
          customer_name: "{{trigger.customer_name}}",
          email: "{{trigger.email}}",
          phone: "{{trigger.phone}}",
          service: "{{trigger.service}}",
          provider: "{{trigger.provider}}",
          slot_at: "{{trigger.slot_at}}",
          status: "pending",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Appointment booked!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "list-appointments",
      name: "List appointments",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "appointments", orderBy: "slot_at asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "appointments",
      title: "Book appointment",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.businessName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Book an appointment</p></div></section>
<section class="py-5"><div class="container"><h3 class="fw-bold">Services we offer</h3><div data-nk-bind-flow-ref="list-services" class="row g-4 mt-2"><div class="col-md-6 col-lg-4" data-nk-item><div class="h-100 p-4" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><h3 class="h5 fw-bold" data-nk-field="name">Service</h3><p style="color:var(--nk-text-muted);" data-nk-field="description"></p><div class="small fw-semibold"><span data-nk-field="duration_minutes">30</span> min · {{config.currency}}<span data-nk-field="price" data-nk-format="money">0.00</span></div></div></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">Services will appear here soon.</p></div></div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:720px;"><h2 class="fw-bold">Book now</h2><form data-nk-form="" data-nk-flow-ref="book" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="customer_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control"/></div><div class="col-12"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Service</label><input name="service" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Provider</label><input name="provider" class="form-control"/></div><div class="col-12"><label class="form-label">When</label><input name="slot_at" type="datetime-local" class="form-control" required/></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Request appointment</button></div></div></form></div></section>`,
    },
    {
      slug: "appointments-admin",
      title: "Appointments admin",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Appointments</h1><div data-nk-bind-flow-ref="list-appointments" class="mt-4"><div data-nk-item class="p-3 mb-2" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><div class="d-flex flex-wrap justify-content-between gap-2"><strong data-nk-field="customer_name">Customer</strong><span class="fw-semibold" data-nk-field="slot_at" data-nk-format="datetime"></span></div><div class="small mt-1"><span data-nk-field="service"></span> with <span data-nk-field="provider"></span> · <span data-nk-field="status"></span></div><div class="small mt-1"><a data-nk-attr-href="mailto:{email}" data-nk-field="email">email</a> · <a data-nk-attr-href="tel:{phone}" data-nk-field="phone">phone</a></div></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">No appointments yet.</p></div></div></section>`,
    },
  ],
};
