import type { ModuleDefinition } from "../types";

export const queue: ModuleDefinition = {
  id: "queue",
  name: "Virtual Queue",
  tagline: "Get-in-line for service: 'now serving #42'",
  description:
    "A virtual waiting line. Customers join the queue from their phone, see their number and a live position counter. Staff page calls 'next' to advance, and the now-serving number broadcasts to all waiting visitors.",
  icon: "",
  color: "from-rose-500 to-red-700",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "businessName", label: "Business name", type: "text", default: "Our shop", required: true },
  ],
  tables: [
    {
      name: "tickets",
      fields: [
        { name: "number", type: "int" },
        { name: "name", type: "text" },
        { name: "phone", type: "text" },
        { name: "status", type: "text" },
      ],
    },
    {
      name: "state",
      fields: [
        { name: "now_serving", type: "int" },
        { name: "last_issued", type: "int" },
      ],
      seed: [{ now_serving: 0, last_issued: 0 }],
    },
  ],
  flows: [
    {
      slug: "join",
      name: "Join the queue",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "state", limit: 1, output: "s" } },
        { id: "n3", type: "math", data: { expression: "({{vars.s.0.last_issued}}) + 1", output: "next" } },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "tickets",
            values: { number: "{{vars.next}}", name: "{{trigger.name}}", phone: "{{trigger.phone}}", status: "waiting" },
          },
        },
        {
          id: "n5",
          type: "update",
          data: { table: "state", where: { id: "{{vars.s.0.id}}" }, values: { last_issued: "{{vars.next}}" } },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"number":{{vars.next}},"redirect":"/wait?n={{vars.next}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
      ],
    },
    {
      slug: "status",
      name: "Get queue status",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "state", limit: 1, output: "s" } },
        { id: "n3", type: "query", data: { table: "tickets", where: { status: "waiting" }, orderBy: "number asc", limit: 1000, output: "waiting" } },
        { id: "n4", type: "response", data: { status: 200, body: '{"now_serving":{{vars.s.0.now_serving}},"last_issued":{{vars.s.0.last_issued}},"waiting":{{vars.waiting.length}},"queue":{{vars.waiting}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "next",
      name: "Call next (staff)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "state", limit: 1, output: "s" } },
        { id: "n3", type: "math", data: { expression: "({{vars.s.0.now_serving}}) + 1", output: "next" } },
        {
          id: "n4",
          type: "update",
          data: { table: "state", where: { id: "{{vars.s.0.id}}" }, values: { now_serving: "{{vars.next}}" } },
        },
        {
          id: "n5",
          type: "update",
          data: { table: "tickets", where: { number: "{{vars.next}}" }, values: { status: "served" } },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"now_serving":{{vars.next}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
      ],
    },
  ],
  pages: [
    {
      slug: "queue",
      title: "Join the queue",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:520px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">{{config.businessName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Skip the line — get a number on your phone.</p></div>
<form data-nk-form="" data-nk-flow-ref="join" class="card p-4 mt-4 shadow-sm">
  <div class="mb-3"><label class="form-label">Your name</label><input name="name" class="form-control" required/></div>
  <div class="mb-3"><label class="form-label">Phone (we'll text when you're up)</label><input name="phone" class="form-control" required/></div>
  <button class="btn btn-primary btn-lg w-100" type="submit">Get in line</button>
</form>
<div class="card p-4 mt-3 text-center">
  <div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Now serving</div>
  <div class="display-1 fw-bold" data-nk-bind-flow-ref="status" data-nk-refresh="3000"><span id="nk-now">0</span></div>
  <div class="small" style="color:var(--nk-text-muted);"><span id="nk-wait">0</span> people ahead of last issued.</div>
</div>
<script>(function(){
  function poll(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['status']||'status'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      .then(function(r){return r.json();}).then(function(d){
        document.getElementById('nk-now').textContent = d.now_serving || 0;
        document.getElementById('nk-wait').textContent = d.waiting || 0;
      }).catch(function(){});
  }
  poll(); setInterval(poll, 4000);
})();</script>
</div></section>`,
    },
    {
      slug: "wait",
      title: "You're in the queue",
      html: `<section class="py-5"><div class="container" style="max-width:520px;text-align:center;">
<div class="card p-5 shadow"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Your number</div>
<div class="display-1 fw-bold mt-2" id="nk-num">—</div>
<hr/>
<div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Now serving</div>
<div class="display-3 fw-bold" id="nk-now">—</div>
<div class="mt-3 small" style="color:var(--nk-text-muted);" id="nk-pos">Loading…</div></div>
<script>(function(){
  var n = parseInt(new URLSearchParams(location.search).get('n')||'0', 10);
  document.getElementById('nk-num').textContent = '#' + n;
  function poll(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['status']||'status'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      .then(function(r){return r.json();}).then(function(d){
        document.getElementById('nk-now').textContent = '#' + (d.now_serving || 0);
        var ahead = Math.max(0, n - (d.now_serving || 0) - 1);
        document.getElementById('nk-pos').textContent = ahead === 0 ? "You're next!" : ahead + ' people ahead of you.';
      });
  }
  poll(); setInterval(poll, 3000);
})();</script>
</div></section>`,
    },
    {
      slug: "queue-staff",
      title: "Staff",
      html: `<section class="py-5"><div class="container" style="max-width:520px;text-align:center;">
<h1 class="fw-bold">Staff console</h1>
<div class="card p-4 mt-3"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Now serving</div><div class="display-1 fw-bold" id="nk-now2">0</div>
<form data-nk-form="" data-nk-flow-ref="next"><button class="btn btn-primary btn-lg" type="submit">Call next →</button></form></div>
<script>(function(){ function p(){ fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['status']||'status'),{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(function(r){return r.json();}).then(function(d){ document.getElementById('nk-now2').textContent='#'+(d.now_serving||0);}); } p(); setInterval(p,3000);})();</script>
</div></section>`,
    },
  ],
};
