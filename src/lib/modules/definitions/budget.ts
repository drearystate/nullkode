import type { ModuleDefinition } from "../types";

export const budget: ModuleDefinition = {
  id: "budget",
  name: "Personal Budget",
  tagline: "Track income and expenses",
  description:
    "A simple personal budget: log income and expenses by category, see recent transactions and build toward knowing where your money goes.",
  icon: "",
  color: "from-green-500 to-emerald-600",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "currency", label: "Currency", type: "text", default: "$" },
  ],
  tables: [
    {
      name: "transactions",
      fields: [
        { name: "description", type: "text" },
        { name: "category", type: "text" },
        { name: "kind", type: "text" },
        { name: "amount", type: "float" },
        { name: "spent_on", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Recent transactions",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "transactions", orderBy: "spent_on desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Log transaction",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "transactions", values: {
          description: "{{trigger.description}}",
          category: "{{trigger.category}}",
          kind: "{{trigger.kind}}",
          amount: "{{trigger.amount}}",
          spent_on: "{{trigger.spent_on}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "budget",
      title: "Budget",
      html: `<section class="py-5"><div class="container" style="max-width:860px;"><h1 class="display-5 fw-bold">Budget</h1>
<div class="row g-3 mt-3"><div class="col-md-4"><div class="card border-0 shadow-sm text-center p-4"><div class="small text-uppercase" style="color:var(--nk-text-muted);">Income</div><div class="display-6 fw-bold" style="color:var(--nk-primary);">{{config.currency}}4,250</div></div></div><div class="col-md-4"><div class="card border-0 shadow-sm text-center p-4"><div class="small text-uppercase" style="color:var(--nk-text-muted);">Expenses</div><div class="display-6 fw-bold text-danger">{{config.currency}}2,180</div></div></div><div class="col-md-4"><div class="card border-0 shadow-sm text-center p-4"><div class="small text-uppercase" style="color:var(--nk-text-muted);">Balance</div><div class="display-6 fw-bold" style="color:var(--nk-primary);">{{config.currency}}2,070</div></div></div></div>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-4"><input name="description" class="form-control" placeholder="Description" required/></div><div class="col-md-2"><select name="kind" class="form-select"><option>expense</option><option>income</option></select></div><div class="col-md-3"><select name="category" class="form-select"><option>Groceries</option><option>Rent</option><option>Transport</option><option>Bills</option><option>Fun</option><option>Salary</option><option>Other</option></select></div><div class="col-md-2"><input name="amount" type="number" step="0.01" class="form-control" placeholder="{{config.currency}}" required/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit">Add</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item><div class="flex-grow-1"><div class="fw-bold" data-nk-field="description">Weekly groceries</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="category">Groceries</span> · Apr 10</div></div><div class="fw-bold text-danger">-{{config.currency}}<span data-nk-field="amount">127.45</span></div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="flex-grow-1"><div class="fw-bold">Salary — April</div><div class="small" style="color:var(--nk-text-muted);">Salary · Apr 1</div></div><div class="fw-bold" style="color:var(--nk-primary);">+{{config.currency}}4,250.00</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="flex-grow-1"><div class="fw-bold">Rent</div><div class="small" style="color:var(--nk-text-muted);">Rent · Apr 1</div></div><div class="fw-bold text-danger">-{{config.currency}}1,600.00</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="flex-grow-1"><div class="fw-bold">Gas</div><div class="small" style="color:var(--nk-text-muted);">Transport · Apr 9</div></div><div class="fw-bold text-danger">-{{config.currency}}52.00</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><div class="flex-grow-1"><div class="fw-bold">Netflix</div><div class="small" style="color:var(--nk-text-muted);">Bills · Apr 5</div></div><div class="fw-bold text-danger">-{{config.currency}}15.99</div></div>
</div>
</div></section>`,
    },
  ],
};
