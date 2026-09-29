import type { ModuleDefinition } from "../types";

export const kanban: ModuleDefinition = {
  id: "kanban",
  name: "Kanban Board",
  tagline: "Trello-style task board",
  description:
    "A Kanban board with To Do, In Progress and Done columns. Cards have title, description and priority. Move them by updating the column.",
  icon: "",
  color: "from-blue-600 to-indigo-700",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "boardName", label: "Board name", type: "text", default: "Project board", required: true },
  ],
  tables: [
    {
      name: "cards",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "column_name", type: "text" },
        { name: "priority", type: "text" },
        { name: "assignee", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Board feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "cards", orderBy: "created_at asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add card",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "cards", values: {
          title: "{{trigger.title}}",
          description: "{{trigger.description}}",
          column_name: "todo",
          priority: "{{trigger.priority}}",
          assignee: "{{trigger.assignee}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "board",
      title: "Board",
      html: `<section class="py-5"><div class="container-fluid"><h1 class="display-5 fw-bold">{{config.boardName}}</h1>
<div class="row g-3 mt-3">
  <div class="col-md-4">
    <div class="rounded p-3" style="background:var(--nk-surface-2);"><h5 class="fw-bold text-uppercase small" style="color:var(--nk-text-muted);">To Do · 3</h5>
      <div data-nk-bind-flow-ref="feed">
        <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold" data-nk-field="title">Write launch blog post</div><span class="badge bg-danger ms-2" data-nk-field="priority">high</span></div><p class="small mb-1 mt-1" data-nk-field="description" style="color:var(--nk-text-muted);">Cover what's new in v1.0 and link to the demo.</p><div class="small" data-nk-field="assignee" style="color:var(--nk-text-muted);">@alex</div></div></div>
        <div class="card border-0 shadow-sm mb-2"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold">Review PR #124</div><span class="badge bg-secondary ms-2">med</span></div><p class="small mb-1 mt-1" style="color:var(--nk-text-muted);">Auth fix that's been in review for 3 days.</p><div class="small" style="color:var(--nk-text-muted);">@jordan</div></div></div>
        <div class="card border-0 shadow-sm"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold">Fix header on mobile</div><span class="badge bg-warning ms-2" style="color:var(--nk-text);">low</span></div><p class="small mb-1 mt-1" style="color:var(--nk-text-muted);">Nav wraps weird on iPhone SE.</p><div class="small" style="color:var(--nk-text-muted);">@sam</div></div></div>
      </div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="rounded p-3" style="background:var(--nk-surface-2);"><h5 class="fw-bold text-uppercase small" style="color:var(--nk-text-muted);">In Progress · 2</h5>
      <div class="card border-0 shadow-sm mb-2"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold">Implement search</div><span class="badge bg-danger ms-2">high</span></div><p class="small mb-1 mt-1" style="color:var(--nk-text-muted);">Needs to search across pages + flows + tables.</p><div class="small" style="color:var(--nk-text-muted);">@alex</div></div></div>
      <div class="card border-0 shadow-sm"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-start"><div class="fw-bold">Design settings page</div><span class="badge bg-secondary ms-2">med</span></div><p class="small mb-1 mt-1" style="color:var(--nk-text-muted);">First pass based on the whiteboard sketch.</p><div class="small" style="color:var(--nk-text-muted);">@priya</div></div></div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="rounded p-3" style="background:var(--nk-surface-2);"><h5 class="fw-bold text-uppercase small" style="color:var(--nk-text-muted);">Done · 2</h5>
      <div class="card border-0 shadow-sm mb-2 opacity-75"><div class="card-body p-3"><div class="fw-bold text-decoration-line-through">Update dependencies</div><p class="small mb-1 mt-1" style="color:var(--nk-text-muted);">Next 15.1, React 19, Prisma 6.</p><div class="small" style="color:var(--nk-text-muted);">@marcus</div></div></div>
      <div class="card border-0 shadow-sm opacity-75"><div class="card-body p-3"><div class="fw-bold text-decoration-line-through">Set up CI pipeline</div><p class="small mb-1 mt-1" style="color:var(--nk-text-muted);">Tests + lint + build on every PR.</p><div class="small" style="color:var(--nk-text-muted);">@marcus</div></div></div>
    </div>
  </div>
</div>
</div></section>`,
    },
  ],
};
