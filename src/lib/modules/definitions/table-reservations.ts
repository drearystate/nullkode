import type { ModuleDefinition } from "../types";

export const tableReservations: ModuleDefinition = {
  id: "table-reservations",
  name: "Table Reservations",
  tagline: "Restaurant table booking with capacity",
  description:
    "Restaurant-specific table booking (distinct from generic appointments). Define your tables (with seats), accept reservations for a date+time+party size, prevent double-booking. Host sees today's grid; diners get a confirmation page.",
  icon: "",
  color: "from-amber-600 to-red-700",
  category: "commerce",
  version: "1.0.0",
  worksWith: ["menu", "sms"],
  config: [
    { key: "restaurantName", label: "Restaurant name", type: "text", default: "La Trattoria", required: true },
    { key: "slotMinutes", label: "Service slot length (min)", type: "number", default: 90 },
  ],
  tables: [
    {
      name: "tables",
      fields: [
        { name: "label", type: "text" },
        { name: "seats", type: "int" },
        { name: "section", type: "text" },
      ],
      seed: [
        { label: "T1", seats: 2, section: "Window" },
        { label: "T2", seats: 4, section: "Main" },
        { label: "T3", seats: 4, section: "Main" },
        { label: "T4", seats: 6, section: "Patio" },
        { label: "T5", seats: 8, section: "Private" },
      ],
    },
    {
      name: "reservations",
      fields: [
        { name: "table_id", type: "text" },
        { name: "guest_name", type: "text" },
        { name: "guest_phone", type: "text" },
        { name: "party_size", type: "int" },
        { name: "starts_at", type: "timestamp" },
        { name: "notes", type: "text" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "tables",
      name: "List tables",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tables", orderBy: "seats asc, label asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "book",
      name: "Book a table",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "tables",
            where: { "seats >=": "{{trigger.party_size}}" },
            orderBy: "seats asc",
            limit: 50,
            output: "candidates",
          },
        },
        {
          id: "n3",
          type: "query",
          data: {
            table: "reservations",
            where: { starts_at: "{{trigger.starts_at}}", status: "confirmed" },
            limit: 200,
            output: "taken",
          },
        },
        {
          id: "n4",
          type: "math",
          data: { expression: "first_unused({{vars.candidates}}, 'id', {{vars.taken}}, 'table_id')", output: "pick" },
        },
        { id: "n5", type: "branch", data: { left: "{{vars.pick.id}}", op: "exists", right: "" } },
        {
          id: "n6",
          type: "insert",
          data: {
            table: "reservations",
            values: {
              table_id: "{{vars.pick.id}}",
              guest_name: "{{trigger.guest_name}}",
              guest_phone: "{{trigger.guest_phone}}",
              party_size: "{{trigger.party_size}}",
              starts_at: "{{trigger.starts_at}}",
              notes: "{{trigger.notes}}",
              status: "confirmed",
            },
            output: "res",
          },
        },
        { id: "n7", type: "response", data: { status: 200, body: '{"ok":true,"table":"{{vars.pick.label}}","redirect":"/booked?id={{vars.res.id}}"}' } },
        { id: "n8", type: "response", data: { status: 409, body: '{"error":"No table free at that time for that party size"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6", sourceHandle: "true" },
        { id: "e6", source: "n6", target: "n7" },
        { id: "e7", source: "n5", target: "n8", sourceHandle: "false" },
      ],
    },
    {
      slug: "today",
      name: "Today's reservations (host)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "reservations", orderBy: "starts_at asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "get",
      name: "Get a reservation by id",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "reservations", where: { id: "{{trigger.id}}" }, limit: 1, output: "r" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.r.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "book-table",
      title: "Reserve a table",
      isHome: true,
      html: `<section class="py-5" style="background:linear-gradient(135deg,#7c2d12,#991b1b);color:#fff;"><div class="container py-4 text-center"><h1 class="display-3 fw-bold">{{config.restaurantName}}</h1><p class="lead">Reserve your table.</p></div></section>
<section class="py-5"><div class="container" style="max-width:520px;">
<form data-nk-form="" data-nk-flow-ref="book" class="card p-4 shadow-sm">
  <div class="row g-3"><div class="col-md-6"><label class="form-label">Name</label><input name="guest_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Phone</label><input name="guest_phone" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Date &amp; time</label><input name="starts_at" type="datetime-local" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Party size</label><input name="party_size" type="number" min="1" max="20" value="2" class="form-control" required/></div><div class="col-12"><label class="form-label">Notes (allergies, occasion…)</label><textarea name="notes" class="form-control" rows="2"></textarea></div></div>
  <button class="btn btn-danger btn-lg w-100 mt-4" type="submit">Confirm reservation</button>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>
</div></section>`,
    },
    {
      slug: "booked",
      title: "Reservation confirmed",
      html: `<section class="py-5"><div class="container" style="max-width:520px;text-align:center;">
<div class="display-1"></div>
<h1 class="display-5 fw-bold">You're booked!</h1>
<div data-nk-bind-flow-ref="get" data-nk-source="query:id">
  <div data-nk-item class="card p-4 mt-4 shadow-sm">
    <div class="fw-bold fs-3"><span data-nk-field="guest_name">Name</span></div>
    <div class="small mt-1" style="color:var(--nk-text-muted);">Party of <span data-nk-field="party_size">2</span> · <span data-nk-field="starts_at">date</span></div>
    <div class="small mt-1">Phone: <span data-nk-field="guest_phone">—</span></div>
  </div>
</div>
</div></section>`,
    },
    {
      slug: "reservations",
      title: "Tonight",
      html: `<section class="py-5"><div class="container" style="max-width:760px;"><h1 class="fw-bold">Tonight's reservations</h1>
<div data-nk-bind-flow-ref="today" data-nk-refresh="20000" class="mt-3">
  <div class="d-flex justify-content-between align-items-center p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div><div class="fw-bold"><span data-nk-field="starts_at">7:00 PM</span> — <span data-nk-field="guest_name">Name</span></div><div class="small" style="color:var(--nk-text-muted);">Party of <span data-nk-field="party_size">2</span> · <span data-nk-field="guest_phone">—</span></div></div><span class="badge bg-success" data-nk-field="status">confirmed</span></div>
</div>
</div></section>`,
    },
  ],
};
