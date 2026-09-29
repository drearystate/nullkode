import type { ModuleDefinition } from "../types";

export const abandonedCart: ModuleDefinition = {
  id: "abandoned-cart",
  name: "Abandoned Cart Recovery",
  tagline: "Email reminders to people who didn't check out",
  description:
    "Capture cart state when a visitor adds items but leaves before checkout. A reminder flow emails them an hour later with a one-click 'resume cart' link. Per-cart token-based recovery URL; logs whether they came back.",
  icon: "",
  color: "from-orange-500 to-rose-700",
  category: "commerce",
  version: "1.0.0",
  requires: ["email"],
  worksWith: ["shop", "stripe-checkout"],
  config: [
    { key: "fromEmail", label: "Send from", type: "text", default: "no-reply@example.com", required: true },
    { key: "subject", label: "Email subject", type: "text", default: "You left some items in your cart ", required: true },
    { key: "delayMinutes", label: "Delay before reminder (minutes)", type: "number", default: 60 },
  ],
  tables: [
    {
      name: "carts",
      fields: [
        { name: "token", type: "text" },
        { name: "email", type: "text" },
        { name: "items_json", type: "text" },
        { name: "total", type: "float" },
        { name: "reminded_at", type: "timestamp" },
        { name: "recovered_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "save",
      name: "Save / update a cart snapshot",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "math", data: { expression: "floor(random()*900000000)+100000000", output: "n" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "carts",
            values: {
              token: "ac_{{vars.n}}",
              email: "{{trigger.email}}",
              items_json: "{{trigger.items_json}}",
              total: "{{trigger.total}}",
            },
            output: "row",
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true,"token":"{{vars.row.token}}","resume_url":"/resume-cart?t={{vars.row.token}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "send-reminders",
      name: "Send reminders for carts past the delay (cron)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "carts",
            where: { reminded_at: "", recovered_at: "", "created_at <=": "minus_minutes({{config.delayMinutes}})" },
            limit: 1,
            output: "c",
          },
        },
        { id: "n3", type: "branch", data: { left: "{{vars.c.0.id}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "email",
          data: {
            from: "{{config.fromEmail}}",
            to: "{{vars.c.0.email}}",
            subject: "{{config.subject}}",
            body: "Your cart of ${{vars.c.0.total}} is still waiting. Resume here: /resume-cart?t={{vars.c.0.token}}",
          },
        },
        { id: "n5", type: "update", data: { table: "carts", where: { id: "{{vars.c.0.id}}" }, values: { reminded_at: "now" } } },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"sent":1}' } },
        { id: "n7", type: "response", data: { status: 200, body: '{"ok":true,"sent":0}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n3", target: "n7", sourceHandle: "false" },
      ],
    },
    {
      slug: "resume",
      name: "Load a cart by token",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "carts", where: { token: "{{trigger.t}}" }, limit: 1, output: "c" } },
        { id: "n3", type: "update", data: { table: "carts", where: { token: "{{trigger.t}}" }, values: { recovered_at: "now" } } },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.c.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "stats",
      name: "Recovery stats",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "carts", orderBy: "created_at desc", limit: 500, output: "rows" } },
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
      slug: "cart-recovery",
      title: "Cart recovery",
      isHome: true,
      html: `<section class="py-5"><div class="container">
<h1 class="fw-bold"> Abandoned carts</h1>
<p style="color:var(--nk-text-muted);">Reminder is sent {{config.delayMinutes}} minutes after a cart goes idle. Hit <code>/api/run/send-reminders</code> from cron every few minutes.</p>

<div class="row g-3 mt-3">
  <div class="col-md-4"><div class="card border-0 shadow-sm p-3 text-center"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Captured</div><div class="display-5 fw-bold" id="nk-ac-total">—</div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm p-3 text-center"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Reminded</div><div class="display-5 fw-bold" id="nk-ac-rem">—</div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm p-3 text-center"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Recovered</div><div class="display-5 fw-bold" id="nk-ac-rec">—</div></div></div>
</div>

<h4 class="fw-bold mt-5">Recent carts</h4>
<div data-nk-bind-flow-ref="stats" data-nk-refresh="20000" class="mt-2">
  <div class="d-flex justify-content-between align-items-center p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div><div class="fw-bold" data-nk-field="email">email</div><div class="small" style="color:var(--nk-text-muted);"><code data-nk-field="token">ac_xxx</code></div></div><div class="fw-bold fs-5">$<span data-nk-field="total">0</span></div></div>
</div>
<script>(function(){
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['stats']||'stats'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
    .then(function(r){return r.json();}).then(function(rows){
      document.getElementById('nk-ac-total').textContent = (rows||[]).length;
      document.getElementById('nk-ac-rem').textContent = (rows||[]).filter(function(r){return r.reminded_at;}).length;
      document.getElementById('nk-ac-rec').textContent = (rows||[]).filter(function(r){return r.recovered_at;}).length;
    });
})();</script>
</div></section>`,
    },
    {
      slug: "resume-cart",
      title: "Resume cart",
      html: `<section class="py-5"><div class="container" style="max-width:520px;">
<h1 class="fw-bold">Welcome back </h1>
<p style="color:var(--nk-text-muted);">Your cart was right where you left it.</p>
<div data-nk-bind-flow-ref="resume" data-nk-source="query:t" class="card p-3 shadow-sm">
  <div data-nk-item>
    <div class="fs-4 fw-bold">Total: $<span data-nk-field="total">0</span></div>
    <pre class="p-2 rounded mt-3 small" style="background:var(--nk-surface-2);white-space:pre-wrap;" data-nk-field="items_json">{}</pre>
    <a href="/" class="btn btn-primary btn-lg w-100 mt-3">Continue to checkout →</a>
  </div>
</div>
</div></section>`,
    },
  ],
};
