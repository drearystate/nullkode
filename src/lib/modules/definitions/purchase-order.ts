import type { ModuleDefinition } from "../types";

export const purchaseOrder: ModuleDefinition = {
  id: "purchase-order",
  name: "Purchase Orders",
  tagline: "B2B PO workflow: request → approve → fulfill",
  description:
    "A lightweight B2B purchase order workflow. Employees submit a PO (vendor, line items, total, justification); approvers see a queue and approve/reject; finance marks fulfilled & paid. Each PO gets a sequential number for accounting reference.",
  icon: "",
  color: "from-zinc-600 to-slate-800",
  category: "productivity",
  version: "1.0.0",
  worksWith: ["expenses", "invoice", "auth"],
  config: [
    { key: "approverEmail", label: "Approver email", type: "text", default: "approver@example.com" },
  ],
  tables: [
    {
      name: "pos",
      fields: [
        { name: "po_number", type: "text" },
        { name: "requester_name", type: "text" },
        { name: "requester_email", type: "text" },
        { name: "vendor", type: "text" },
        { name: "items_json", type: "text" },
        { name: "total", type: "float" },
        { name: "justification", type: "text" },
        { name: "status", type: "text" },
        { name: "approver", type: "text" },
        { name: "approved_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "submit",
      name: "Submit a new PO",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "math", data: { expression: "floor(random()*899999)+100000", output: "n" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "pos",
            values: {
              po_number: "PO-{{vars.n}}",
              requester_name: "{{trigger.requester_name}}",
              requester_email: "{{trigger.requester_email}}",
              vendor: "{{trigger.vendor}}",
              items_json: "{{trigger.items_json}}",
              total: "{{trigger.total}}",
              justification: "{{trigger.justification}}",
              status: "pending_approval",
            },
            output: "po",
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true,"po_number":"{{vars.po.po_number}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "approve",
      name: "Approve a PO",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "update",
          data: {
            table: "pos",
            where: { id: "{{trigger.id}}" },
            values: { status: "approved", approver: "{{trigger.approver}}", approved_at: "now" },
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
      slug: "reject",
      name: "Reject a PO",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "update",
          data: { table: "pos", where: { id: "{{trigger.id}}" }, values: { status: "rejected", approver: "{{trigger.approver}}" } },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "mark-fulfilled",
      name: "Mark fulfilled / paid",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "update", data: { table: "pos", where: { id: "{{trigger.id}}" }, values: { status: "fulfilled" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "All POs (admin/approver)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "pos", orderBy: "created_at desc", limit: 200, output: "rows" } },
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
      slug: "po",
      title: "Submit a PO",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:680px;">
<h1 class="display-5 fw-bold">Submit a purchase order</h1>
<form data-nk-form="" data-nk-flow-ref="submit" class="card p-4 shadow-sm mt-3">
  <div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="requester_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="requester_email" type="email" class="form-control" required/></div><div class="col-md-8"><label class="form-label">Vendor</label><input name="vendor" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Total ($)</label><input name="total" type="number" step="0.01" class="form-control" required/></div><div class="col-12"><label class="form-label">Line items (one per line: qty × item — $price)</label><textarea name="items_json" class="form-control font-monospace" rows="4" required>2 × Keyboard — $79
1 × Office chair — $329</textarea></div><div class="col-12"><label class="form-label">Justification</label><textarea name="justification" class="form-control" rows="3" required></textarea></div></div>
  <button class="btn btn-primary btn-lg w-100 mt-4" type="submit">Submit for approval</button>
</form>
</div></section>`,
    },
    {
      slug: "po-queue",
      title: "Approval queue",
      html: `<section class="py-5"><div class="container">
<h1 class="fw-bold">Purchase order queue</h1>
<div data-nk-bind-flow-ref="list" data-nk-refresh="15000" class="mt-3">
  <div class="card border-0 shadow-sm mb-3" data-nk-item data-nk-row-id="{id}"><div class="card-body">
    <div class="d-flex justify-content-between align-items-center">
      <div><code class="fw-bold" data-nk-field="po_number">PO-000000</code> · <strong data-nk-field="vendor">Vendor</strong> · $<strong data-nk-field="total">0</strong></div>
      <span class="badge" data-nk-field="status">pending</span>
    </div>
    <div class="small mt-1" style="color:var(--nk-text-muted);">From <span data-nk-field="requester_name">requester</span></div>
    <pre class="small p-2 rounded mt-2" style="background:var(--nk-surface-2);white-space:pre-wrap;" data-nk-field="items_json">items</pre>
    <p class="small mb-2" data-nk-field="justification">Justification</p>
    <div class="d-flex gap-2">
      <form data-nk-form="" data-nk-flow-ref="approve"><input type="hidden" name="id" data-nk-bind-id/><input type="hidden" name="approver" value="{{config.approverEmail}}"/><button class="btn btn-success btn-sm" type="submit">Approve</button></form>
      <form data-nk-form="" data-nk-flow-ref="reject"><input type="hidden" name="id" data-nk-bind-id/><input type="hidden" name="approver" value="{{config.approverEmail}}"/><button class="btn btn-outline-danger btn-sm" type="submit">Reject</button></form>
      <form data-nk-form="" data-nk-flow-ref="mark-fulfilled"><input type="hidden" name="id" data-nk-bind-id/><button class="btn btn-outline-primary btn-sm" type="submit">Mark fulfilled</button></form>
    </div>
  </div></div>
</div>
<script>document.addEventListener('submit', function(e){ var f=e.target.closest('form[data-nk-form]'); if(!f) return; var row=f.closest('[data-nk-item]'); if(!row) return; var h=f.querySelector('[data-nk-bind-id]'); if(h) h.value = row.getAttribute('data-nk-row-id')||''; }, true);</script>
</div></section>`,
    },
  ],
};
