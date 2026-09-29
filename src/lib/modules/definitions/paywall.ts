import type { ModuleDefinition } from "../types";

export const paywall: ModuleDefinition = {
  id: "paywall",
  name: "Paywall",
  tagline: "Gate content behind a one-time code or login",
  description:
    "Lock premium content behind an access code or signed-in account. Define unlock codes (single-use or shared), and any page tagged data-nk-paywall is hidden until the visitor enters a valid code or signs in. Unlocks are remembered in localStorage for the visitor.",
  icon: "",
  color: "from-zinc-700 to-slate-900",
  category: "content",
  version: "1.0.0",
  worksWith: ["auth", "stripe-checkout"],
  config: [
    { key: "ctaCopy", label: "Lock screen heading", type: "text", default: "This content is for members only.", required: true },
    { key: "subCopy", label: "Lock screen subhead", type: "text", default: "Enter your access code to continue, or buy access." },
  ],
  tables: [
    {
      name: "codes",
      fields: [
        { name: "code", type: "text" },
        { name: "label", type: "text" },
        { name: "max_uses", type: "int" },
        { name: "uses", type: "int" },
      ],
      seed: [
        { code: "MEMBERS2026", label: "Annual members", max_uses: 1000, uses: 0 },
        { code: "PREVIEW", label: "Demo code", max_uses: 9999, uses: 0 },
      ],
    },
    {
      name: "redemptions",
      fields: [
        { name: "code_id", type: "text" },
        { name: "visitor_ip", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "verify",
      name: "Verify access code",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "codes", where: { code: "{{trigger.code}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "branch", data: { left: "{{vars.row.0.id}}", op: "exists", right: "" } },
        { id: "n4", type: "branch", data: { left: "{{vars.row.0.uses}}", op: "<", right: "{{vars.row.0.max_uses}}" } },
        {
          id: "n5",
          type: "update",
          data: { table: "codes", where: { id: "{{vars.row.0.id}}" }, values: { uses: "{{vars.row.0.uses}}+1" } },
        },
        {
          id: "n6",
          type: "insert",
          data: { table: "redemptions", values: { code_id: "{{vars.row.0.id}}", visitor_ip: "{{trigger.visitor_ip}}" } },
        },
        { id: "n7", type: "response", data: { status: 200, body: '{"ok":true,"label":"{{vars.row.0.label}}"}' } },
        { id: "n8", type: "response", data: { status: 410, body: '{"error":"Code limit reached"}' } },
        { id: "n9", type: "response", data: { status: 404, body: '{"error":"Invalid code"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "true" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n6", target: "n7" },
        { id: "e7", source: "n4", target: "n8", sourceHandle: "false" },
        { id: "e8", source: "n3", target: "n9", sourceHandle: "false" },
      ],
    },
    {
      slug: "create-code",
      name: "Mint a new code",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "codes",
            values: {
              code: "{{trigger.code}}",
              label: "{{trigger.label}}",
              max_uses: "{{trigger.max_uses}}",
              uses: "0",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "codes",
      name: "All codes",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "codes", orderBy: "created_at desc", limit: 50, output: "rows" } },
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
      slug: "premium",
      title: "Premium content",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:720px;">
<div data-nk-paywall>
  <h1 class="fw-bold">Members-only article</h1>
  <p class="lead">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse euismod erat at eros tincidunt, ac vehicula libero accumsan…</p>
  <p>Full article text continues here. Anyone with a valid code (or once a payment integration is wired up) sees this content unlocked.</p>
</div>

<div id="nk-lock-screen" class="card p-5 text-center shadow-sm">
  <div class="display-1"></div>
  <h2 class="fw-bold mt-3">{{config.ctaCopy}}</h2>
  <p style="color:var(--nk-text-muted);">{{config.subCopy}}</p>
  <form data-nk-form="" data-nk-flow-ref="verify" class="mt-3" id="nk-paywall-form">
    <div class="d-flex gap-2 justify-content-center"><input name="code" class="form-control text-center fw-bold" style="max-width:240px;" placeholder="Access code" required/><button class="btn btn-primary" type="submit">Unlock</button></div>
    <div data-nk-error class="text-danger small mt-2"></div>
  </form>
</div>
<script>(function(){
  var KEY = 'nk-paywall-' + location.pathname;
  function unlock(){ document.querySelectorAll('[data-nk-paywall]').forEach(function(el){ el.style.display=''; }); var l=document.getElementById('nk-lock-screen'); if(l) l.style.display='none'; }
  function lock(){ document.querySelectorAll('[data-nk-paywall]').forEach(function(el){ el.style.display='none'; }); }
  if(localStorage.getItem(KEY) === '1'){ unlock(); } else { lock(); }
  document.getElementById('nk-paywall-form').addEventListener('nk:success', function(){ localStorage.setItem(KEY, '1'); unlock(); });
})();</script>
</div></section>`,
    },
    {
      slug: "paywall-admin",
      title: "Codes",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Access codes</h1>
<form data-nk-form="" data-nk-flow-ref="create-code" class="card p-3 shadow-sm mt-3">
  <div class="row g-2"><div class="col-md-5"><input name="code" class="form-control text-uppercase font-monospace" placeholder="VIP2026" required/></div><div class="col-md-4"><input name="label" class="form-control" placeholder="Internal label"/></div><div class="col-md-2"><input name="max_uses" type="number" class="form-control" value="100"/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit">+</button></div></div>
</form>
<div data-nk-bind-flow-ref="codes" data-nk-refresh="15000" class="mt-3">
  <div class="d-flex justify-content-between p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div><code class="fw-bold fs-5" data-nk-field="code">CODE</code><div class="small" style="color:var(--nk-text-muted);" data-nk-field="label">Label</div></div><div class="text-end"><strong data-nk-field="uses">0</strong> / <span data-nk-field="max_uses">100</span></div></div>
</div>
</div></section>`,
    },
  ],
};
