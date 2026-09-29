import type { ModuleDefinition } from "../types";

export const invoice: ModuleDefinition = {
  id: "invoice",
  name: "Invoices",
  tagline: "Send invoices, track payment",
  description:
    "Create customer invoices with amount, due date and status. See which ones are paid, pending or overdue from a single admin page.",
  icon: "",
  color: "from-indigo-500 to-blue-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "businessName", label: "Business name", type: "text", default: "Your Business", required: true },
  ],
  tables: [
    {
      name: "invoices",
      fields: [
        { name: "number", type: "text" },
        { name: "customer_name", type: "text" },
        { name: "customer_email", type: "text" },
        { name: "amount", type: "float" },
        { name: "description", type: "text" },
        { name: "due_on", type: "timestamp" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create",
      name: "Create invoice",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "invoices", values: {
          number: "{{trigger.number}}",
          customer_name: "{{trigger.customer_name}}",
          customer_email: "{{trigger.customer_email}}",
          amount: "{{trigger.amount}}",
          description: "{{trigger.description}}",
          due_on: "{{trigger.due_on}}",
          status: "pending",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "feed",
      name: "List invoices",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "invoices", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "invoices",
      title: "Invoices",
      html: `<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">{{config.businessName}} invoices</h1>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body d-flex align-items-center"><div class="flex-grow-1"><div class="fw-bold">Invoice #<span data-nk-field="number">2026-001</span></div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="customer_name">Acme Co</span> · <span data-nk-field="description">Consulting services, 10 hours</span></div></div><div class="text-end"><div class="fs-4 fw-bold">$<span data-nk-field="amount">1,250</span></div><span class="badge" data-nk-field="status" style="background:var(--nk-primary);">paid</span></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex align-items-center"><div class="flex-grow-1"><div class="fw-bold">Invoice #2026-002</div><div class="small" style="color:var(--nk-text-muted);">Daylight Studio · Logo design package</div></div><div class="text-end"><div class="fs-4 fw-bold">$2,400</div><span class="badge bg-warning" style="color:var(--nk-text);">pending</span></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex align-items-center"><div class="flex-grow-1"><div class="fw-bold">Invoice #2026-003</div><div class="small" style="color:var(--nk-text-muted);">Bluebird Inc · Monthly retainer, April</div></div><div class="text-end"><div class="fs-4 fw-bold">$4,000</div><span class="badge bg-warning" style="color:var(--nk-text);">pending</span></div></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body d-flex align-items-center"><div class="flex-grow-1"><div class="fw-bold">Invoice #2026-004</div><div class="small" style="color:var(--nk-text-muted);">Noon Coffee · Website redesign, phase 1</div></div><div class="text-end"><div class="fs-4 fw-bold">$3,800</div><span class="badge bg-danger">overdue</span></div></div></div>
</div>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:720px;"><h3 class="fw-bold">New invoice</h3><form data-nk-form="" data-nk-flow-ref="create" class="card p-4 mt-3 shadow-sm"><div class="row g-3"><div class="col-md-4"><label class="form-label">Number</label><input name="number" class="form-control" placeholder="2026-005" required/></div><div class="col-md-8"><label class="form-label">Customer name</label><input name="customer_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Customer email</label><input name="customer_email" type="email" class="form-control"/></div><div class="col-md-3"><label class="form-label">Amount</label><input name="amount" type="number" step="0.01" class="form-control" required/></div><div class="col-md-3"><label class="form-label">Due</label><input name="due_on" type="date" class="form-control"/></div><div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="2"></textarea></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Create invoice</button></div></div></form></div></section>`,
    },
  ],
};
