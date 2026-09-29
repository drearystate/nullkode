import type { ModuleDefinition } from "../types";

export const choreChart: ModuleDefinition = {
  id: "chores",
  name: "Chore Chart",
  tagline: "Family chore tracker with rewards",
  description:
    "A family chore chart: assign chores to kids, mark them done, earn stars. Turn everyday tasks into a visible, rewardable routine.",
  icon: "",
  color: "from-emerald-500 to-teal-600",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "familyName", label: "Family name", type: "text", default: "The Family", required: true },
  ],
  tables: [
    {
      name: "chores",
      fields: [
        { name: "title", type: "text" },
        { name: "assigned_to", type: "text" },
        { name: "reward_stars", type: "int" },
        { name: "done", type: "bool" },
        { name: "due_on", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "List chores",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "chores", orderBy: "done asc, due_on asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add chore",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "chores", values: {
          title: "{{trigger.title}}",
          assigned_to: "{{trigger.assigned_to}}",
          reward_stars: "{{trigger.reward_stars}}",
          done: "false",
          due_on: "{{trigger.due_on}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "chores",
      title: "Chores",
      html: `<section class="py-5"><div class="container" style="max-width:860px;"><h1 class="display-5 fw-bold">{{config.familyName}} chore chart</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-5"><input name="title" class="form-control" placeholder="What needs doing?" required/></div><div class="col-md-3"><input name="assigned_to" class="form-control" placeholder="Who?"/></div><div class="col-md-2"><input name="reward_stars" type="number" min="1" max="5" class="form-control" placeholder="" value="1"/></div><div class="col-md-2"><button class="btn btn-primary w-100" type="submit">Add</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item>
    <input type="checkbox" class="form-check-input fs-4 m-0"/>
    <div class="flex-grow-1">
      <div class="fw-bold" data-nk-field="title">Take out the trash</div>
      <div class="small" style="color:var(--nk-text-muted);">Assigned to <span data-nk-field="assigned_to">Ella</span></div>
    </div>
    <div class="text-warning fs-4"><span data-nk-field="reward_stars">3</span></div>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><input type="checkbox" class="form-check-input fs-4 m-0" checked/><div class="flex-grow-1"><div class="fw-bold text-decoration-line-through" style="color:var(--nk-text-muted);">Make your bed</div><div class="small" style="color:var(--nk-text-muted);">Assigned to Max</div></div><div class="text-warning fs-4">1</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><input type="checkbox" class="form-check-input fs-4 m-0"/><div class="flex-grow-1"><div class="fw-bold">Feed the dog</div><div class="small" style="color:var(--nk-text-muted);">Assigned to Ella</div></div><div class="text-warning fs-4">2</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><input type="checkbox" class="form-check-input fs-4 m-0"/><div class="flex-grow-1"><div class="fw-bold">Load the dishwasher</div><div class="small" style="color:var(--nk-text-muted);">Assigned to Max</div></div><div class="text-warning fs-4">2</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><input type="checkbox" class="form-check-input fs-4 m-0"/><div class="flex-grow-1"><div class="fw-bold">Vacuum the living room</div><div class="small" style="color:var(--nk-text-muted);">Assigned to Ella</div></div><div class="text-warning fs-4">4</div></div>
</div>
</div></section>`,
    },
  ],
};
