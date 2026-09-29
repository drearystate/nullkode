import type { ModuleDefinition } from "../types";

export const expenses: ModuleDefinition = {
  id: "expenses",
  name: "Expenses",
  tagline: "Track business expenses",
  description:
    "Log business expenses with date, category, amount and notes. Browse everything in one list for easy monthly review and tax prep.",
  icon: "",
  color: "from-red-500 to-rose-600",
  category: "commerce",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "items",
      fields: [
        { name: "description", type: "text" },
        { name: "category", type: "text" },
        { name: "amount", type: "float" },
        { name: "payment_method", type: "text" },
        { name: "spent_on", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "List expenses",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "spent_on desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Log expense",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          description: "{{trigger.description}}",
          category: "{{trigger.category}}",
          amount: "{{trigger.amount}}",
          payment_method: "{{trigger.payment_method}}",
          spent_on: "{{trigger.spent_on}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "expenses",
      title: "Expenses",
      html: `<section class="py-5"><div class="container" style="max-width:840px;"><h1 class="display-5 fw-bold">Expenses</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-4"><input name="description" class="form-control" placeholder="What was it?" required/></div><div class="col-md-3"><select name="category" class="form-select"><option>Software</option><option>Travel</option><option>Meals</option><option>Office</option><option>Hardware</option><option>Marketing</option><option>Other</option></select></div><div class="col-md-2"><input name="amount" type="number" step="0.01" class="form-control" placeholder="$" required/></div><div class="col-md-2"><input name="spent_on" type="date" class="form-control"/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit">Add</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item><div class="flex-grow-1"><div class="fw-bold" data-nk-field="description">Figma team plan</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="category">Software</span> · Apr 10, 2026</div></div><div class="fw-bold" style="color:var(--nk-primary);">-$<span data-nk-field="amount">180</span></div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="flex-grow-1"><div class="fw-bold">Team lunch at Noon Cafe</div><div class="small" style="color:var(--nk-text-muted);">Meals · Apr 8, 2026</div></div><div class="fw-bold" style="color:var(--nk-primary);">-$87.50</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="flex-grow-1"><div class="fw-bold">Flight to customer visit</div><div class="small" style="color:var(--nk-text-muted);">Travel · Apr 5, 2026</div></div><div class="fw-bold" style="color:var(--nk-primary);">-$412.20</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><div class="flex-grow-1"><div class="fw-bold">New monitor for studio</div><div class="small" style="color:var(--nk-text-muted);">Hardware · Apr 2, 2026</div></div><div class="fw-bold" style="color:var(--nk-primary);">-$549.00</div></div>
</div>
</div></section>`,
    },
  ],
};
