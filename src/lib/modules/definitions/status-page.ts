import type { ModuleDefinition } from "../types";

export const statusPage: ModuleDefinition = {
  id: "status-page",
  name: "Status Page",
  tagline: "Public service status + incident history",
  description:
    "A status page like statuspage.io. Define a list of services (API, Web, Database…), each with a current status indicator. Post incidents that progress through investigating → identified → resolved, with public updates pinned to the affected services.",
  icon: "",
  color: "from-emerald-500 to-green-700",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "appName", label: "App / service name", type: "text", default: "Acme", required: true },
  ],
  tables: [
    {
      name: "services",
      fields: [
        { name: "name", type: "text" },
        { name: "status", type: "text" },
        { name: "description", type: "text" },
      ],
      seed: [
        { name: "Web app", status: "operational", description: "The main web app." },
        { name: "API", status: "operational", description: "Public REST API." },
        { name: "Database", status: "operational", description: "Primary Postgres." },
      ],
    },
    {
      name: "incidents",
      fields: [
        { name: "title", type: "text" },
        { name: "status", type: "text" },
        { name: "affected_services", type: "text" },
        { name: "summary", type: "text" },
        { name: "resolved_at", type: "timestamp" },
      ],
    },
    {
      name: "updates",
      fields: [
        { name: "incident_id", type: "text" },
        { name: "body", type: "text" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "summary",
      name: "Status summary",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "services", orderBy: "name asc", limit: 50, output: "services" } },
        { id: "n3", type: "query", data: { table: "incidents", where: { resolved_at: "" }, orderBy: "created_at desc", limit: 10, output: "active" } },
        { id: "n4", type: "query", data: { table: "incidents", orderBy: "created_at desc", limit: 20, output: "recent" } },
        { id: "n5", type: "response", data: { status: 200, body: '{"services":{{vars.services}},"active":{{vars.active}},"recent":{{vars.recent}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "set-service-status",
      name: "Update a service's status",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "update", data: { table: "services", where: { id: "{{trigger.id}}" }, values: { status: "{{trigger.status}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "open-incident",
      name: "Open a new incident",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "incidents",
            values: {
              title: "{{trigger.title}}",
              status: "investigating",
              affected_services: "{{trigger.affected_services}}",
              summary: "{{trigger.summary}}",
            },
            output: "inc",
          },
        },
        {
          id: "n3",
          type: "insert",
          data: { table: "updates", values: { incident_id: "{{vars.inc.id}}", body: "{{trigger.summary}}", status: "investigating" } },
        },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.inc}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "post-update",
      name: "Post incident update",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: { table: "updates", values: { incident_id: "{{trigger.incident_id}}", body: "{{trigger.body}}", status: "{{trigger.status}}" } },
        },
        {
          id: "n3",
          type: "update",
          data: {
            table: "incidents",
            where: { id: "{{trigger.incident_id}}" },
            values: { status: "{{trigger.status}}", resolved_at: "{{trigger.resolved_at}}" },
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
  ],
  pages: [
    {
      slug: "status",
      title: "Status",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="display-5 fw-bold">{{config.appName}} status</h1>
<div id="nk-overall" class="card p-4 mt-3 text-center" style="background:#10b981;color:#fff;border:none;"><div class="fs-2 fw-bold"> All systems operational</div></div>

<h4 class="fw-bold mt-5">Services</h4>
<div data-nk-bind-flow-ref="summary" data-nk-refresh="20000" id="nk-svc-host"></div>

<h4 class="fw-bold mt-5">Recent incidents</h4>
<div id="nk-inc-host"></div>

<script>(function(){
  function dot(s){
    var c = s === 'operational' ? '#10b981' : s === 'degraded' ? '#f59e0b' : s === 'partial-outage' ? '#f97316' : '#ef4444';
    return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+c+';"></span>';
  }
  function poll(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['summary']||'summary'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      .then(function(r){return r.json();}).then(function(d){
        var anyDown = (d.services||[]).some(function(s){ return s.status !== 'operational'; }) || (d.active||[]).length > 0;
        var box = document.getElementById('nk-overall');
        if(anyDown){ box.style.background = '#ef4444'; box.querySelector('.fw-bold').textContent = ' Some services are affected'; }
        else { box.style.background = '#10b981'; box.querySelector('.fw-bold').textContent = ' All systems operational'; }
        document.getElementById('nk-svc-host').innerHTML = (d.services||[]).map(function(s){
          return '<div class="d-flex justify-content-between align-items-center p-3 border rounded mb-2" style="background:var(--nk-surface);"><div><div class="fw-bold">'+s.name+'</div><div class="small" style="color:var(--nk-text-muted);">'+(s.description||'')+'</div></div><div>'+dot(s.status)+' <span class="small text-capitalize">'+(s.status||'').replace('-',' ')+'</span></div></div>';
        }).join('');
        document.getElementById('nk-inc-host').innerHTML = (d.recent||[]).map(function(i){
          return '<div class="card border-0 shadow-sm mb-2 p-3"><div class="d-flex justify-content-between"><div class="fw-bold">'+i.title+'</div><span class="badge bg-secondary">'+i.status+'</span></div><div class="small mt-1" style="color:var(--nk-text-muted);">'+(i.summary||'')+'</div></div>';
        }).join('') || '<div class="small" style="color:var(--nk-text-muted);">No incidents reported.</div>';
      });
  }
  poll(); setInterval(poll, 20000);
})();</script>
</div></section>`,
    },
    {
      slug: "status-admin",
      title: "Admin",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="fw-bold">Status admin</h1>
<form data-nk-form="" data-nk-flow-ref="open-incident" class="card p-3 shadow-sm mt-3">
  <h5 class="fw-bold">Open incident</h5>
  <input name="title" class="form-control mb-2" placeholder="Brief title" required/>
  <input name="affected_services" class="form-control mb-2" placeholder="Service IDs (comma sep)"/>
  <textarea name="summary" class="form-control" rows="3" placeholder="What's happening" required></textarea>
  <button class="btn btn-warning mt-3" type="submit">Open</button>
</form>
<form data-nk-form="" data-nk-flow-ref="post-update" class="card p-3 shadow-sm mt-3">
  <h5 class="fw-bold">Post update</h5>
  <input name="incident_id" class="form-control mb-2" placeholder="Incident ID" required/>
  <select name="status" class="form-select mb-2"><option>investigating</option><option>identified</option><option>monitoring</option><option>resolved</option></select>
  <textarea name="body" class="form-control" rows="3" required></textarea>
  <input name="resolved_at" type="datetime-local" class="form-control mt-2"/>
  <button class="btn btn-primary mt-3" type="submit">Post</button>
</form>
</div></section>`,
    },
  ],
};
