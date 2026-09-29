import type { ModuleDefinition } from "../types";

export const projectPortfolio: ModuleDefinition = {
  id: "project-portfolio",
  name: "Project Portfolio",
  tagline: "Track many projects with status & % complete",
  description:
    "Portfolio view across multiple projects. Each project has a name, owner, status (planned/active/blocked/done), % complete, due date, and a tasks count. Use it to run a small team or freelance pipeline. Distinct from the single-board kanban module.",
  icon: "",
  color: "from-blue-500 to-cyan-700",
  category: "productivity",
  version: "1.0.0",
  worksWith: ["kanban", "todo", "leads"],
  config: [
    { key: "portfolioName", label: "Portfolio name", type: "text", default: "Projects", required: true },
  ],
  tables: [
    {
      name: "projects",
      fields: [
        { name: "name", type: "text" },
        { name: "owner", type: "text" },
        { name: "status", type: "text" },
        { name: "percent_complete", type: "int" },
        { name: "due_at", type: "timestamp" },
        { name: "client", type: "text" },
        { name: "color", type: "text" },
      ],
      seed: [
        { name: "Website redesign", owner: "Avery", status: "active", percent_complete: 65, due_at: "2026-06-15", client: "Acme Co.", color: "#3b82f6" },
        { name: "Mobile app v2", owner: "Sam", status: "planned", percent_complete: 5, due_at: "2026-09-01", client: "Internal", color: "#10b981" },
        { name: "Onboarding flow", owner: "Devon", status: "blocked", percent_complete: 40, due_at: "2026-06-30", client: "Pebble", color: "#ef4444" },
      ],
    },
    {
      name: "tasks",
      fields: [
        { name: "project_id", type: "text" },
        { name: "label", type: "text" },
        { name: "done", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "projects",
      name: "All projects",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "projects", orderBy: "due_at asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "create",
      name: "Create a project",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "projects",
            values: {
              name: "{{trigger.name}}",
              owner: "{{trigger.owner}}",
              status: "planned",
              percent_complete: 0,
              due_at: "{{trigger.due_at}}",
              client: "{{trigger.client}}",
              color: "{{trigger.color}}",
            },
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
      slug: "update",
      name: "Update project status / progress",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "update",
          data: {
            table: "projects",
            where: { id: "{{trigger.id}}" },
            values: { status: "{{trigger.status}}", percent_complete: "{{trigger.percent_complete}}" },
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
      slug: "portfolio",
      title: "Portfolio",
      isHome: true,
      html: `<section class="py-5"><div class="container">
<h1 class="display-5 fw-bold">{{config.portfolioName}}</h1>

<form data-nk-form="" data-nk-flow-ref="create" class="card p-3 shadow-sm mt-3">
  <div class="row g-2"><div class="col-md-4"><input name="name" class="form-control" placeholder="Project name" required/></div><div class="col-md-2"><input name="owner" class="form-control" placeholder="Owner"/></div><div class="col-md-2"><input name="client" class="form-control" placeholder="Client"/></div><div class="col-md-2"><input name="due_at" type="date" class="form-control"/></div><div class="col-md-1"><input name="color" type="color" class="form-control form-control-color w-100" value="#3b82f6"/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit">+</button></div></div>
</form>

<div data-nk-bind-flow-ref="projects" data-nk-refresh="15000" class="row g-3 mt-3">
  <div class="col-md-6 col-lg-4" data-nk-item data-nk-row-id="{id}">
    <div class="card border-0 shadow-sm h-100">
      <div data-nk-field-style="background-color:{color}" style="height:8px;background:#3b82f6;"></div>
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start"><div><h5 class="fw-bold mb-1" data-nk-field="name">Project</h5><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="client">Client</span> · <span data-nk-field="owner">Owner</span></div></div><span class="badge text-uppercase" data-nk-field="status">active</span></div>
        <div class="progress mt-3" style="height:8px;"><div class="progress-bar" role="progressbar" data-nk-style-from="width:{percent_complete}%" style="width:50%;background:var(--nk-primary);"></div></div>
        <div class="d-flex justify-content-between small mt-1"><span><span data-nk-field="percent_complete">0</span>%</span><span style="color:var(--nk-text-muted);">due <span data-nk-field="due_at">—</span></span></div>
      </div>
    </div>
  </div>
</div>
<script>(function(){
  // Apply the inline style hooks that the runtime doesn't natively understand.
  function paint(){
    document.querySelectorAll('[data-nk-style-from]').forEach(function(el){
      var row = el.closest('[data-nk-item]'); if(!row) return;
      var tpl = el.getAttribute('data-nk-style-from');
      var pct = (row.querySelector('[data-nk-field="percent_complete"]')||{}).textContent || '0';
      el.style.width = pct + '%';
    });
    document.querySelectorAll('[data-nk-field-style]').forEach(function(el){
      var row = el.closest('[data-nk-item]'); if(!row) return;
      var c = (row.querySelector('[data-nk-field="color"]')||{}).textContent || '#3b82f6';
      if(c) el.style.background = c;
    });
    document.querySelectorAll('.badge[data-nk-field="status"]').forEach(function(b){
      var s = (b.textContent||'').trim().toLowerCase();
      b.classList.remove('bg-secondary','bg-success','bg-danger','bg-info');
      b.classList.add(s === 'done' ? 'bg-success' : s === 'blocked' ? 'bg-danger' : s === 'active' ? 'bg-info' : 'bg-secondary');
      b.classList.add('text-white');
    });
  }
  new MutationObserver(paint).observe(document.body, {childList:true, subtree:true});
  setTimeout(paint, 600);
})();</script>
</div></section>`,
    },
  ],
};
