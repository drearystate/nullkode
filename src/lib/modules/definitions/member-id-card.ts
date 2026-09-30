import type { ModuleDefinition } from "../types";

export const memberIdCard: ModuleDefinition = {
  id: "member-id-card",
  name: "Member ID Card",
  tagline: "Digital ID card with photo, barcode, expiry",
  description:
    "Issue digital ID cards to members. Each card has a name, photo, unique member number, tier, issue/expiry date, and a scannable barcode (Code 128). Members open their card on a phone; staff scan it at the door to verify (uses the barcode/QR module's flow).",
  icon: "",
  color: "from-blue-600 to-indigo-800",
  category: "community",
  version: "1.0.0",
  worksWith: ["loyalty-card", "qr-scanner", "gym"],
  config: [
    { key: "orgName", label: "Organization name", type: "text", default: "Members Club", required: true },
    { key: "cardTagline", label: "Card tagline", type: "text", default: "MEMBER ACCESS · TIER A" },
  ],
  tables: [
    {
      name: "members",
      fields: [
        { name: "member_number", type: "text" },
        { name: "name", type: "text" },
        { name: "tier", type: "text" },
        { name: "photo_url", type: "text" },
        { name: "issued_at", type: "timestamp" },
        { name: "expires_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "issue",
      name: "Issue a member card",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "math", data: { expression: "floor(random()*90000000)+10000000", output: "n" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "members",
            values: {
              member_number: "M-{{vars.n}}",
              name: "{{trigger.name}}",
              tier: "{{trigger.tier}}",
              photo_url: "{{trigger.photo_url}}",
              issued_at: "now",
              expires_at: "{{trigger.expires_at}}",
            },
            output: "m",
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true,"member_number":"{{vars.m.member_number}}","redirect":"/card?n={{vars.m.member_number}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "get",
      name: "Get a card by member number",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "members", where: { member_number: "{{trigger.n}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.row.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "List members (staff)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "members", orderBy: "created_at desc", limit: 200, output: "rows" } },
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
      slug: "issue-card",
      title: "Issue card",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:520px;"><h1 class="fw-bold">Issue a member card</h1>
<form data-nk-form="" data-nk-flow-ref="issue" class="card p-3 shadow-sm mt-3">
  <input name="name" class="form-control mb-2" placeholder="Member name" required/>
  <input name="photo_url" type="url" class="form-control mb-2" placeholder="Photo URL"/>
  <select name="tier" class="form-select mb-2"><option>Standard</option><option>Premium</option><option>VIP</option></select>
  <input name="expires_at" type="date" class="form-control mb-2" required/>
  <button class="btn btn-primary mt-2 w-100" type="submit">Issue</button>
</form>
</div></section>`,
    },
    {
      slug: "card",
      title: "My card",
      html: `<section class="py-5" style="background:var(--nk-surface-2);min-height:100vh;"><div class="container" style="max-width:420px;">
<div class="card shadow text-white" style="background:linear-gradient(135deg,#1e3a8a,#0f172a);border-radius:18px;overflow:hidden;">
<div data-nk-bind-flow-ref="get" data-nk-source="query:n"><div data-nk-item class="p-4">
  <div class="d-flex justify-content-between align-items-start">
    <div>
      <div class="small text-uppercase" style="opacity:0.7;">{{config.orgName}}</div>
      <div class="fw-bold fs-5">{{config.cardTagline}}</div>
    </div>
    <img class="rounded" style="width:70px;height:90px;object-fit:cover;" data-nk-src="photo_url" src="/media/generated/thumbs/people-jordan-lee.webp" alt=""/>
  </div>
  <div class="display-6 fw-bold mt-4" data-nk-field="name">Member name</div>
  <div class="small mt-1" style="opacity:0.7;">Tier <span data-nk-field="tier">Standard</span></div>
  <hr style="border-color:rgba(255,255,255,.2);"/>
  <div class="d-flex justify-content-between"><div><div class="small" style="opacity:0.7;">Member #</div><div class="font-monospace fw-bold" data-nk-field="member_number">M-00000000</div></div><div class="text-end"><div class="small" style="opacity:0.7;">Expires</div><div class="fw-bold" data-nk-field="expires_at">—</div></div></div>
  <div id="nk-barcode" class="mt-3 d-flex justify-content-center" style="background:#fff;border-radius:6px;padding:8px;"></div>
</div></div></div>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
<script>(function(){
  var n = new URLSearchParams(location.search).get('n') || '';
  setTimeout(function(){
    if(!window.JsBarcode || !n) return;
    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    document.getElementById('nk-barcode').appendChild(svg);
    JsBarcode(svg, n, { format:'CODE128', height:60, displayValue:true });
  }, 500);
})();</script>
</div></section>`,
    },
    {
      slug: "members",
      title: "Members",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Members</h1>
<div data-nk-bind-flow-ref="list" data-nk-refresh="20000" class="row g-3 mt-3">
  <div class="col-md-6 col-lg-4" data-nk-item><a class="card border-0 shadow-sm h-100 text-decoration-none text-body" data-nk-href-template="/card?n={member_number}" href="#"><div class="card-body d-flex gap-3 align-items-center"><img class="rounded-circle" style="width:48px;height:48px;object-fit:cover;" data-nk-src="photo_url" src="/media/generated/thumbs/people-jordan-lee.webp" alt=""/><div class="flex-grow-1"><div class="fw-bold" data-nk-field="name">Name</div><code class="small" data-nk-field="member_number">M-00000000</code></div></div></a></div>
</div>
</div></section>`,
    },
  ],
};
