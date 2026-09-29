import type { ModuleDefinition } from "../types";

export const claims: ModuleDefinition = {
  id: "claims",
  name: "Claims & Receipts",
  tagline: "Submit a claim with a photo, track its status",
  description:
    "Customers (or employees) submit a claim or receipt with a description, amount and a photo URL. Staff move it through a status workflow (received → reviewing → approved/rejected) and post a public reply. Great for warranty claims, expense reimbursements, or insurance receipts.",
  icon: "",
  color: "from-stone-500 to-amber-700",
  category: "productivity",
  version: "1.0.0",
  worksWith: ["file-upload", "expenses"],
  config: [
    { key: "queueName", label: "Queue heading", type: "text", default: "Claims", required: true },
  ],
  tables: [
    {
      name: "claims",
      fields: [
        { name: "claimant_name", type: "text" },
        { name: "claimant_email", type: "text" },
        { name: "description", type: "text" },
        { name: "amount", type: "float" },
        { name: "photo_url", type: "text" },
        { name: "status", type: "text" },
        { name: "reply", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "submit",
      name: "Submit a claim",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "claims",
            values: {
              claimant_name: "{{trigger.claimant_name}}",
              claimant_email: "{{trigger.claimant_email}}",
              description: "{{trigger.description}}",
              amount: "{{trigger.amount}}",
              photo_url: "{{trigger.photo_url}}",
              status: "received",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Claim submitted. We will reply by email."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "All claims (staff)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "claims", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "update",
      name: "Update claim (status, reply)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "update",
          data: {
            table: "claims",
            where: { id: "{{trigger.id}}" },
            values: { status: "{{trigger.status}}", reply: "{{trigger.reply}}" },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "claims",
      title: "Submit a claim",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:640px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-5 fw-bold">{{config.queueName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Tell us what happened. Attach a photo of your receipt or item.</p></div>
<form data-nk-form="" data-nk-flow-ref="submit" class="card p-4 mt-4 shadow-sm">
  <div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="claimant_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="claimant_email" type="email" class="form-control" required/></div><div class="col-md-8"><label class="form-label">Photo URL (upload first, paste link)</label><input name="photo_url" type="url" class="form-control" placeholder="https://…"/></div><div class="col-md-4"><label class="form-label">Amount ($)</label><input name="amount" type="number" step="0.01" class="form-control"/></div><div class="col-12"><label class="form-label">What happened?</label><textarea name="description" class="form-control" rows="5" required></textarea></div></div>
  <button class="btn btn-primary btn-lg w-100 mt-4" type="submit">Submit claim</button>
  <div data-nk-success class="text-success small mt-2"></div>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>
</div></section>`,
    },
    {
      slug: "claims-admin",
      title: "Claims admin",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Claims queue</h1>
<div data-nk-bind-flow-ref="list" data-nk-refresh="20000" class="mt-3">
  <div class="card border-0 shadow-sm mb-3" data-nk-item><div class="card-body"><div class="d-flex gap-3"><img class="rounded" style="width:96px;height:96px;object-fit:cover;flex-shrink:0;" data-nk-src="photo_url" src="https://picsum.photos/seed/r/200/200" alt=""/><div class="flex-grow-1"><div class="d-flex justify-content-between align-items-start"><div><div class="fw-bold" data-nk-field="claimant_name">Customer</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="claimant_email">email</div></div><div class="text-end"><span class="badge bg-warning text-dark" data-nk-field="status">received</span><div class="fw-bold fs-5 mt-1">$<span data-nk-field="amount">0</span></div></div></div><p class="mt-2 mb-0" data-nk-field="description">Description…</p></div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
