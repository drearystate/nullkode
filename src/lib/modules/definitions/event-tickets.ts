import type { ModuleDefinition } from "../types";

export const eventTickets: ModuleDefinition = {
  id: "event-tickets",
  name: "Event Tickets",
  tagline: "Sell tickets, scan QR codes at the door",
  description:
    "Sell tickets for an event with multiple tiers (General, VIP, etc). Each issued ticket gets a unique code; render it as a QR for the holder. At the door, scan the QR to validate and mark the ticket as used.",
  icon: "",
  color: "from-purple-600 to-pink-700",
  category: "commerce",
  version: "1.0.0",
  worksWith: ["events", "qr-scanner", "stripe-checkout"],
  config: [
    { key: "eventName", label: "Event name", type: "text", default: "Summer Festival", required: true },
    { key: "eventDate", label: "Event date", type: "text", default: "2026-08-12" },
    { key: "venue", label: "Venue", type: "text", default: "Riverside Park" },
  ],
  tables: [
    {
      name: "tiers",
      fields: [
        { name: "name", type: "text" },
        { name: "price", type: "float" },
        { name: "capacity", type: "int" },
        { name: "sold", type: "int" },
      ],
      seed: [
        { name: "General Admission", price: 35, capacity: 500, sold: 0 },
        { name: "VIP", price: 95, capacity: 50, sold: 0 },
      ],
    },
    {
      name: "tickets",
      fields: [
        { name: "tier_id", type: "text" },
        { name: "code", type: "text" },
        { name: "holder_name", type: "text" },
        { name: "holder_email", type: "text" },
        { name: "used_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "tiers",
      name: "List ticket tiers",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tiers", orderBy: "price asc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "buy",
      name: "Issue a ticket",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tiers", where: { id: "{{trigger.tier_id}}" }, limit: 1, output: "t" } },
        { id: "n3", type: "branch", data: { left: "{{vars.t.0.sold}}", op: "<", right: "{{vars.t.0.capacity}}" } },
        { id: "n4", type: "math", data: { expression: "floor(random()*99999999)+10000000", output: "n" } },
        {
          id: "n5",
          type: "insert",
          data: {
            table: "tickets",
            values: {
              tier_id: "{{trigger.tier_id}}",
              code: "TKT-{{vars.n}}",
              holder_name: "{{trigger.holder_name}}",
              holder_email: "{{trigger.holder_email}}",
            },
            output: "ticket",
          },
        },
        {
          id: "n6",
          type: "update",
          data: { table: "tiers", where: { id: "{{vars.t.0.id}}" }, values: { sold: "{{vars.t.0.sold}}+1" } },
        },
        { id: "n7", type: "response", data: { status: 200, body: '{"ok":true,"ticket_code":"{{vars.ticket.code}}","redirect":"/ticket?code={{vars.ticket.code}}"}' } },
        { id: "n8", type: "response", data: { status: 409, body: '{"error":"Sold out"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n6", target: "n7" },
        { id: "e7", source: "n3", target: "n8", sourceHandle: "false" },
      ],
    },
    {
      slug: "get-ticket",
      name: "Look up a ticket by code",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tickets", where: { code: "{{trigger.code}}" }, limit: 1, output: "t" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.t.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "validate",
      name: "Validate (scan) a ticket at the door",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tickets", where: { code: "{{trigger.code}}" }, limit: 1, output: "t" } },
        { id: "n3", type: "branch", data: { left: "{{vars.t.0.id}}", op: "exists", right: "" } },
        { id: "n4", type: "branch", data: { left: "{{vars.t.0.used_at}}", op: "exists", right: "" } },
        {
          id: "n5",
          type: "update",
          data: { table: "tickets", where: { id: "{{vars.t.0.id}}" }, values: { used_at: "now" } },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"holder":"{{vars.t.0.holder_name}}","message":"Welcome in!"}' } },
        { id: "n7", type: "response", data: { status: 409, body: '{"error":"Ticket already used at {{vars.t.0.used_at}}"}' } },
        { id: "n8", type: "response", data: { status: 404, body: '{"error":"Unknown ticket"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n7", sourceHandle: "true" },
        { id: "e5", source: "n4", target: "n5", sourceHandle: "false" },
        { id: "e6", source: "n5", target: "n6" },
        { id: "e7", source: "n3", target: "n8", sourceHandle: "false" },
      ],
    },
  ],
  pages: [
    {
      slug: "tickets",
      title: "Get tickets",
      isHome: true,
      html: `<section class="py-5" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;"><div class="container text-center py-4"><div class="display-1"></div><h1 class="display-3 fw-bold">{{config.eventName}}</h1><p class="lead">{{config.eventDate}} · {{config.venue}}</p></div></section>
<section class="py-5"><div class="container" style="max-width:760px;"><h2 class="fw-bold">Pick your tier</h2>
<div data-nk-bind-flow-ref="tiers" data-nk-refresh="30000" class="row g-3 mt-2">
  <div class="col-md-6" data-nk-item data-nk-row-id="{id}">
    <div class="card border-0 shadow-sm h-100 p-4 text-center">
      <h4 class="fw-bold" data-nk-field="name">General Admission</h4>
      <div class="display-5 fw-bold my-3">$<span data-nk-field="price">35</span></div>
      <div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="sold">0</span> sold of <span data-nk-field="capacity">500</span></div>
      <form data-nk-form="" data-nk-flow-ref="buy" class="mt-3 text-start">
        <input type="hidden" name="tier_id" data-nk-bind-id/>
        <input name="holder_name" class="form-control mb-2" placeholder="Your name" required/>
        <input name="holder_email" type="email" class="form-control mb-2" placeholder="Email" required/>
        <button class="btn btn-primary w-100" type="submit">Buy ticket</button>
      </form>
    </div>
  </div>
</div>
<script>(function(){
  document.addEventListener('submit', function(e){
    var f = e.target.closest('form[data-nk-flow-ref="buy"]'); if(!f) return;
    var row = f.closest('[data-nk-item]'); var hid = f.querySelector('[data-nk-bind-id]');
    if(row && hid) hid.value = row.getAttribute('data-nk-row-id') || '';
  }, true);
})();</script>
</div></section>`,
    },
    {
      slug: "ticket",
      title: "Your ticket",
      html: `<section class="py-5"><div class="container" style="max-width:480px;">
<div class="card shadow text-center p-4">
<div data-nk-bind-flow-ref="get-ticket" data-nk-source="query:code"><div data-nk-item>
  <h3 class="fw-bold">{{config.eventName}}</h3>
  <p style="color:var(--nk-text-muted);">{{config.eventDate}} · {{config.venue}}</p>
  <div id="nk-qr" class="my-3"></div>
  <code class="fs-4 font-monospace" data-nk-field="code">TKT-XXXXXXXX</code>
  <div class="mt-3"><div class="fw-bold" data-nk-field="holder_name">Holder name</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="holder_email">email</div></div>
</div></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<script>(function(){
  var code = new URLSearchParams(location.search).get('code') || '';
  setTimeout(function(){
    var el = document.getElementById('nk-qr'); if(!el || !window.QRCode) return;
    QRCode.toCanvas(code, { width: 220 }, function(err, c){ if(!err && c){ el.innerHTML=''; el.appendChild(c); } });
  }, 400);
})();</script>
</div></section>`,
    },
    {
      slug: "scan",
      title: "Door scanner",
      html: `<section class="py-5"><div class="container" style="max-width:520px;">
<h1 class="fw-bold text-center"> Door scanner</h1>
<p class="text-center" style="color:var(--nk-text-muted);">Scan or paste a ticket code to validate entry.</p>

<form data-nk-form="" data-nk-flow-ref="validate" class="card p-3 mt-3 shadow-sm">
  <div class="d-flex gap-2"><input name="code" class="form-control font-monospace" placeholder="TKT-XXXXXXXX" required/><button class="btn btn-primary" type="submit">Validate</button></div>
  <div data-nk-success class="text-success mt-2 fw-bold"></div>
  <div data-nk-error class="text-danger mt-2"></div>
</form>
</div></section>`,
    },
  ],
};
