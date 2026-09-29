import type { ModuleDefinition } from "../types";

export const todo: ModuleDefinition = {
  id: "todo",
  name: "Todo List",
  tagline: "Track tasks and check them off",
  description:
    "A personal or shared todo list with title, notes, priority and done state. Backed by a real tasks table you can query, filter and build on.",
  icon: "",
  color: "from-green-500 to-emerald-600",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "listName", label: "List name", type: "text", default: "Today", required: true },
  ],
  tables: [
    {
      name: "tasks",
      fields: [
        { name: "title", type: "text" },
        { name: "notes", type: "text" },
        { name: "priority", type: "text" },
        { name: "done", type: "bool" },
        { name: "due_on", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "List tasks",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "tasks", orderBy: "done asc, created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add task",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "tasks", values: {
          title: "{{trigger.title}}",
          notes: "{{trigger.notes}}",
          priority: "{{trigger.priority}}",
          due_on: "{{trigger.due_on}}",
          done: "false",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "todo",
      title: "Todo",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="display-5 fw-bold">{{config.listName}}</h1><p style="color:var(--nk-text-muted);">Add a task and check it off when you're done.</p><form data-nk-form="" data-nk-flow-ref="add" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-8"><input name="title" class="form-control" placeholder="What needs doing?" required/></div><div class="col-md-2"><select name="priority" class="form-select"><option>low</option><option selected>med</option><option>high</option></select></div><div class="col-md-2"><button class="btn btn-primary w-100" type="submit">Add</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item>
    <input type="checkbox" class="form-check-input fs-4 m-0"/>
    <div class="flex-grow-1">
      <div class="fw-bold" data-nk-field="title">Reply to Monday's emails</div>
      <div class="small" style="color:var(--nk-text-muted);" data-nk-field="notes">Include the team update</div>
    </div>
    <span class="badge bg-danger" data-nk-field="priority">high</span>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><input type="checkbox" class="form-check-input fs-4 m-0" checked/><div class="flex-grow-1"><div class="fw-bold text-decoration-line-through" style="color:var(--nk-text-muted);">Schedule dentist appointment</div><div class="small" style="color:var(--nk-text-muted);">Dr. Kim, before end of month</div></div><span class="badge bg-secondary">med</span></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><input type="checkbox" class="form-check-input fs-4 m-0"/><div class="flex-grow-1"><div class="fw-bold">Buy groceries</div><div class="small" style="color:var(--nk-text-muted);">Milk, bread, eggs, coffee</div></div><span class="badge bg-secondary">med</span></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><input type="checkbox" class="form-check-input fs-4 m-0"/><div class="flex-grow-1"><div class="fw-bold">Review PR #123</div><div class="small" style="color:var(--nk-text-muted);">Has the auth fix we've been waiting on</div></div><span class="badge" style="background:var(--nk-primary);color:var(--nk-text);">low</span></div>
</div>
</div></section>`,
    },
  ],
};
