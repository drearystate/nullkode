import type { ModuleDefinition } from "../types";

export const dripContent: ModuleDefinition = {
  id: "drip-content",
  name: "Drip Content",
  tagline: "Release lessons on day N from enrollment",
  description:
    "Build a sequence of lessons that unlock per-user based on how many days since they enrolled. Lesson 1 unlocks day 0, lesson 2 unlocks day 3, etc. Great for onboarding, training courses, and email drips that pair with the email module.",
  icon: "",
  color: "from-cyan-500 to-blue-700",
  category: "content",
  version: "1.0.0",
  worksWith: ["auth", "course", "email"],
  config: [
    { key: "programName", label: "Program name", type: "text", default: "Onboarding", required: true },
  ],
  tables: [
    {
      name: "lessons",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "day_offset", type: "int" },
        { name: "sort_order", type: "int" },
      ],
      seed: [
        { title: "Welcome", body: "Glad you're here. Here's how to get started…", day_offset: 0, sort_order: 1 },
        { title: "Your first goal", body: "By the end of week one, try to…", day_offset: 3, sort_order: 2 },
        { title: "Going deeper", body: "Now that you've found your footing…", day_offset: 7, sort_order: 3 },
      ],
    },
    {
      name: "enrollments",
      fields: [
        { name: "user_email", type: "text" },
        { name: "started_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "enroll",
      name: "Enroll a user",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: { table: "enrollments", values: { user_email: "{{trigger.user_email}}", started_at: "now" } },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"redirect":"/lessons?email={{trigger.user_email}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "available",
      name: "Lessons available for this user",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "enrollments", where: { user_email: "{{trigger.user_email}}" }, limit: 1, output: "e" } },
        { id: "n3", type: "math", data: { expression: "days_since({{vars.e.0.started_at}})", output: "days" } },
        { id: "n4", type: "query", data: { table: "lessons", where: { "day_offset <=": "{{vars.days}}" }, orderBy: "day_offset asc", limit: 200, output: "rows" } },
        { id: "n5", type: "response", data: { status: 200, body: '{"days":{{vars.days}},"lessons":{{vars.rows}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "all-lessons",
      name: "All lessons (admin)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "lessons", orderBy: "day_offset asc, sort_order asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add-lesson",
      name: "Add a lesson",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "lessons",
            values: {
              title: "{{trigger.title}}",
              body: "{{trigger.body}}",
              day_offset: "{{trigger.day_offset}}",
              sort_order: "{{trigger.sort_order}}",
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
  ],
  pages: [
    {
      slug: "drip",
      title: "Join program",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:520px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">{{config.programName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Sign up to get a lesson dripped every few days.</p></div>
<form data-nk-form="" data-nk-flow-ref="enroll" class="card p-4 mt-4 shadow-sm">
  <div class="mb-3"><label class="form-label">Your email</label><input name="user_email" type="email" class="form-control" required/></div>
  <button class="btn btn-primary btn-lg w-100" type="submit">Start program</button>
</form>
</div></section>`,
    },
    {
      slug: "lessons",
      title: "Your lessons",
      html: `<section class="py-5"><div class="container" style="max-width:720px;">
<h1 class="fw-bold">Your lessons</h1>
<p style="color:var(--nk-text-muted);">Day <span id="nk-day">—</span> of {{config.programName}}.</p>
<div id="nk-lessons" class="mt-3">Loading…</div>
<script>(function(){
  var email = new URLSearchParams(location.search).get('email') || '';
  if(!email){ document.getElementById('nk-lessons').innerHTML = '<div class="alert alert-info">Pass <code>?email=…</code> in the URL to view available lessons.</div>'; return; }
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['available']||'available'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({user_email:email}) })
    .then(function(r){return r.json();}).then(function(d){
      document.getElementById('nk-day').textContent = d.days || 0;
      var html = (d.lessons||[]).map(function(l, i){
        return '<div class="card border-0 shadow-sm mb-3"><div class="card-body"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Day '+l.day_offset+'</div><h4 class="fw-bold">'+l.title+'</h4><p>'+l.body+'</p></div></div>';
      }).join('') || '<div class="alert alert-light">No lessons unlocked yet — check back tomorrow.</div>';
      document.getElementById('nk-lessons').innerHTML = html;
    });
})();</script>
</div></section>`,
    },
    {
      slug: "drip-admin",
      title: "Manage lessons",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Lessons</h1>
<form data-nk-form="" data-nk-flow-ref="add-lesson" class="card p-3 shadow-sm mt-3">
  <div class="row g-2"><div class="col-md-8"><input name="title" class="form-control" placeholder="Lesson title" required/></div><div class="col-md-2"><input name="day_offset" type="number" min="0" class="form-control" placeholder="Day"/></div><div class="col-md-2"><input name="sort_order" type="number" class="form-control" placeholder="Order"/></div><div class="col-12"><textarea name="body" class="form-control" rows="4" placeholder="Body" required></textarea></div></div>
  <button class="btn btn-primary mt-3" type="submit">Add</button>
</form>
<div data-nk-bind-flow-ref="all-lessons" data-nk-refresh="20000" class="mt-4">
  <div class="d-flex gap-3 align-items-center p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div class="badge bg-info">Day <span data-nk-field="day_offset">0</span></div><div class="flex-grow-1"><div class="fw-bold" data-nk-field="title">Title</div></div></div>
</div>
</div></section>`,
    },
  ],
};
