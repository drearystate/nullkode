import type { ModuleDefinition } from "../types";

export const eSignature: ModuleDefinition = {
  id: "e-signature",
  name: "E-Signature",
  tagline: "Send a doc, get it signed online",
  description:
    "Send any text-based document (terms, NDA, quote) to a recipient by email, and let them sign it in-browser with a drawn signature. Stores the signed signature image, the signer's name + IP, and a signed-at timestamp.",
  icon: "",
  color: "from-slate-600 to-zinc-700",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "companyName", label: "Your company name", type: "text", default: "Acme Inc.", required: true },
  ],
  tables: [
    {
      name: "documents",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "recipient_name", type: "text" },
        { name: "recipient_email", type: "text" },
        { name: "status", type: "text" },
        { name: "signature_data_url", type: "text" },
        { name: "signed_name", type: "text" },
        { name: "signed_ip", type: "text" },
        { name: "signed_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "create",
      name: "Create a document for signature",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "documents",
            values: {
              title: "{{trigger.title}}",
              body: "{{trigger.body}}",
              recipient_name: "{{trigger.recipient_name}}",
              recipient_email: "{{trigger.recipient_email}}",
              status: "pending",
            },
            output: "doc",
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Document created. Share /sign?id={{vars.doc.id}} with the signer."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "get",
      name: "Get document for signing",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "documents", where: { id: "{{trigger.id}}" }, limit: 1, output: "doc" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.doc.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "sign",
      name: "Submit signature",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "update",
          data: {
            table: "documents",
            where: { id: "{{trigger.id}}" },
            values: {
              status: "signed",
              signature_data_url: "{{trigger.signature_data_url}}",
              signed_name: "{{trigger.signed_name}}",
              signed_ip: "{{trigger.signed_ip}}",
              signed_at: "now",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks — your signature was recorded."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "List documents (admin)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "documents", orderBy: "created_at desc", limit: 200, output: "rows" } },
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
      slug: "documents",
      title: "Documents",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:880px;"><h1 class="display-5 fw-bold">{{config.companyName}} — Signatures</h1><p style="color:var(--nk-text-muted);">Send a document for signature. Share the resulting /sign?id=... link with the recipient.</p>
<form data-nk-form="" data-nk-flow-ref="create" class="card p-4 mt-4 shadow-sm"><h4 class="fw-bold mb-3">New document</h4>
<div class="row g-3"><div class="col-md-6"><label class="form-label">Title</label><input name="title" class="form-control" placeholder="Mutual NDA" required/></div><div class="col-md-6"><label class="form-label">Recipient name</label><input name="recipient_name" class="form-control" required/></div><div class="col-12"><label class="form-label">Recipient email</label><input name="recipient_email" type="email" class="form-control" required/></div><div class="col-12"><label class="form-label">Document text</label><textarea name="body" class="form-control" rows="10" required placeholder="Paste the contract or terms here..."></textarea></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Create</button></div><div data-nk-error class="col-12 text-danger small"></div></div></form>
<h4 class="fw-bold mt-5">Sent documents</h4>
<div data-nk-bind-flow-ref="list" class="mt-3">
  <div class="card p-3 mb-2 border-0 shadow-sm" data-nk-item><div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold" data-nk-field="title">Mutual NDA</div><div class="small" style="color:var(--nk-text-muted);">→ <span data-nk-field="recipient_name">Jordan</span> &lt;<span data-nk-field="recipient_email">jordan@example.com</span>&gt;</div></div><span class="badge bg-warning text-dark" data-nk-field="status">pending</span></div></div>
</div>
</div></section>`,
    },
    {
      slug: "sign",
      title: "Sign document",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:760px;">
<div class="card p-4 shadow-sm">
<div data-nk-bind-flow-ref="get" data-nk-source="query:id">
  <div data-nk-item>
    <h1 class="fw-bold" data-nk-field="title">Document title</h1>
    <p class="small" style="color:var(--nk-text-muted);">For <span data-nk-field="recipient_name">recipient</span></p>
    <hr/>
    <pre class="p-3 rounded" style="background:var(--nk-surface);white-space:pre-wrap;font-family:inherit;" data-nk-field="body">Document body…</pre>
  </div>
</div>

<h4 class="fw-bold mt-4">Sign below</h4>
<div class="border rounded p-2" style="background:#fff;"><canvas id="nk-sig" width="700" height="200" style="touch-action:none;display:block;width:100%;height:200px;cursor:crosshair;"></canvas></div>
<div class="d-flex justify-content-between mt-2"><button type="button" class="btn btn-link btn-sm" id="nk-sig-clear">Clear signature</button></div>

<form data-nk-form="" data-nk-flow-ref="sign" class="mt-3" id="nk-sig-form">
  <input type="hidden" name="id" id="nk-sig-id"/>
  <input type="hidden" name="signature_data_url" id="nk-sig-data"/>
  <input type="hidden" name="signed_ip" value="self"/>
  <div class="row g-3 align-items-end">
    <div class="col-md-8"><label class="form-label">Type your full legal name</label><input name="signed_name" class="form-control" required/></div>
    <div class="col-md-4"><button class="btn btn-primary btn-lg w-100" type="submit">Sign &amp; submit</button></div>
    <div data-nk-error class="col-12 text-danger small"></div>
  </div>
</form>
</div>

<script>(function(){
  var c = document.getElementById('nk-sig'); if(!c) return;
  var ctx = c.getContext('2d'); var down = false; var last = null;
  function resize(){ var r = c.getBoundingClientRect(); c.width = r.width; c.height = 200; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; }
  resize(); window.addEventListener('resize', resize);
  function pt(e){ var r = c.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
  function start(e){ down = true; last = pt(e); e.preventDefault(); }
  function move(e){ if(!down) return; var p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; e.preventDefault(); }
  function end(){ down = false; }
  c.addEventListener('mousedown', start); c.addEventListener('mousemove', move); c.addEventListener('mouseup', end); c.addEventListener('mouseleave', end);
  c.addEventListener('touchstart', start); c.addEventListener('touchmove', move); c.addEventListener('touchend', end);
  document.getElementById('nk-sig-clear').addEventListener('click', function(){ ctx.clearRect(0,0,c.width,c.height); });
  var id = new URLSearchParams(location.search).get('id') || '';
  document.getElementById('nk-sig-id').value = id;
  document.getElementById('nk-sig-form').addEventListener('submit', function(){ document.getElementById('nk-sig-data').value = c.toDataURL('image/png'); });
})();</script>
</div></section>`,
    },
  ],
};
