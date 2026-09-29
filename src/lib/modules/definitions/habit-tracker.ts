import type { ModuleDefinition } from "../types";

export const habitTracker: ModuleDefinition = {
  id: "habits",
  name: "Habit Tracker",
  tagline: "Build streaks on daily habits",
  description:
    "Track daily habits with a name, current streak and last-checked date. Check in every day to grow your streak.",
  icon: "",
  color: "from-orange-500 to-red-600",
  category: "productivity",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "habits",
      fields: [
        { name: "name", type: "text" },
        { name: "description", type: "text" },
        { name: "streak", type: "int" },
        { name: "last_check", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "List habits",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "habits", orderBy: "streak desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add habit",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "habits", values: {
          name: "{{trigger.name}}",
          description: "{{trigger.description}}",
          streak: "0",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "habits",
      title: "Habits",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="display-5 fw-bold">Habits</h1><p style="color:var(--nk-text-muted);">Build streaks, one day at a time.</p>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 mt-4 shadow-sm"><div class="input-group"><input name="name" class="form-control" placeholder="e.g. Drink water" required/><button class="btn btn-primary" type="submit">Add habit</button></div></form>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body d-flex align-items-center gap-3"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold" data-nk-field="name">Morning run</div><div class="small" data-nk-field="description" style="color:var(--nk-text-muted);">30 minutes before breakfast</div></div><div class="text-end"><div class="fs-4 fw-bold text-danger"><span data-nk-field="streak">21</span> days</div><button class="btn btn-sm btn-outline-success">Check in</button></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex align-items-center gap-3"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold">Read 10 pages</div><div class="small" style="color:var(--nk-text-muted);">Any book, any time</div></div><div class="text-end"><div class="fs-4 fw-bold text-danger">14 days</div><button class="btn btn-sm btn-outline-success">Check in</button></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex align-items-center gap-3"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold">8 glasses of water</div><div class="small" style="color:var(--nk-text-muted);">Hydration matters</div></div><div class="text-end"><div class="fs-4 fw-bold text-danger">7 days</div><button class="btn btn-sm btn-outline-success">Check in</button></div></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body d-flex align-items-center gap-3"><div class="fs-2"></div><div class="flex-grow-1"><div class="fw-bold">Meditate</div><div class="small" style="color:var(--nk-text-muted);">10 minutes, anytime</div></div><div class="text-end"><div class="fs-4 fw-bold text-danger">3 days</div><button class="btn btn-sm btn-outline-success">Check in</button></div></div></div>
</div>
</div></section>`,
    },
  ],
};
