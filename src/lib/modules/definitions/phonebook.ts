import type { ModuleDefinition } from "../types";

export const phonebook: ModuleDefinition = {
  id: "phonebook",
  name: "Phonebook / Directory",
  tagline: "Searchable contact directory",
  description:
    "A searchable staff or member directory. Each entry has a photo, name, title, department, email, phone, and a short bio. Filter by department, search by name. Great for company intranets, school staff pages, or chamber-of-commerce member lists.",
  icon: "",
  color: "from-cyan-600 to-blue-800",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Directory heading", type: "text", default: "Our team directory", required: true },
  ],
  tables: [
    {
      name: "people",
      fields: [
        { name: "name", type: "text" },
        { name: "title", type: "text" },
        { name: "department", type: "text" },
        { name: "email", type: "text" },
        { name: "phone", type: "text" },
        { name: "bio", type: "text" },
        { name: "photo_url", type: "text" },
      ],
      seed: [
        { name: "Avery Chen", title: "Director of Engineering", department: "Engineering", email: "avery@example.com", phone: "(415) 555-0143", bio: "Builds the platform.", photo_url: "https://i.pravatar.cc/200?img=12" },
        { name: "Sam Patel", title: "Customer Success Lead", department: "Customer Success", email: "sam@example.com", phone: "(415) 555-0177", bio: "On point for onboarding.", photo_url: "https://i.pravatar.cc/200?img=14" },
        { name: "Devon Ward", title: "Senior Designer", department: "Design", email: "devon@example.com", phone: "(415) 555-0192", bio: "Visual systems & illustration.", photo_url: "https://i.pravatar.cc/200?img=33" },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List all entries",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "people", orderBy: "name asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add",
      name: "Add an entry",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "people",
            values: {
              name: "{{trigger.name}}",
              title: "{{trigger.title}}",
              department: "{{trigger.department}}",
              email: "{{trigger.email}}",
              phone: "{{trigger.phone}}",
              bio: "{{trigger.bio}}",
              photo_url: "{{trigger.photo_url}}",
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
      slug: "directory",
      title: "Directory",
      isHome: true,
      html: `<section class="py-5"><div class="container">
<h1 class="display-5 fw-bold">{{config.heading}}</h1>
<div class="d-flex gap-2 mt-3 flex-wrap"><input id="nk-search" class="form-control" style="max-width:300px;" placeholder="Search by name…"/><select id="nk-dept" class="form-select" style="max-width:240px;"><option value="">All departments</option></select></div>

<div data-nk-bind-flow-ref="list" data-nk-refresh="60000" class="row g-3 mt-3" id="nk-grid">
  <div class="col-md-6 col-lg-4" data-nk-item>
    <div class="card border-0 shadow-sm h-100 p-3 d-flex flex-row gap-3 align-items-center">
      <img class="rounded-circle" style="width:64px;height:64px;object-fit:cover;flex-shrink:0;" data-nk-src="photo_url" src="https://i.pravatar.cc/200" alt=""/>
      <div class="flex-grow-1">
        <div class="fw-bold" data-nk-field="name">Name</div>
        <div class="small" style="color:var(--nk-text-muted);" data-nk-field="title">Title</div>
        <div class="small" data-nk-field="department">Dept</div>
        <div class="small mt-1"><a data-nk-href-template="mailto:{email}" href="#"><span data-nk-field="email">email</span></a> · <a data-nk-href-template="tel:{phone}" href="#"><span data-nk-field="phone">phone</span></a></div>
      </div>
    </div>
  </div>
</div>
<script>(function(){
  function filter(){
    var q = (document.getElementById('nk-search').value||'').toLowerCase();
    var dept = document.getElementById('nk-dept').value || '';
    document.querySelectorAll('#nk-grid [data-nk-item]').forEach(function(row){
      var n = (row.querySelector('[data-nk-field="name"]').textContent||'').toLowerCase();
      var d = (row.querySelector('[data-nk-field="department"]').textContent||'').trim();
      var ok = (!q || n.indexOf(q) >= 0) && (!dept || d === dept);
      row.style.display = ok ? '' : 'none';
    });
  }
  function refillDept(){
    var sel = document.getElementById('nk-dept'); var have = {};
    document.querySelectorAll('#nk-grid [data-nk-field="department"]').forEach(function(e){ var d=e.textContent.trim(); if(d && !have[d]){ have[d]=1; var o=document.createElement('option'); o.value=d; o.textContent=d; sel.appendChild(o);} });
  }
  document.getElementById('nk-search').addEventListener('input', filter);
  document.getElementById('nk-dept').addEventListener('change', filter);
  new MutationObserver(function(){ refillDept(); filter(); }).observe(document.getElementById('nk-grid'), { childList:true, subtree:true });
  setTimeout(refillDept, 600);
})();</script>
</div></section>`,
    },
    {
      slug: "directory-admin",
      title: "Add entry",
      html: `<section class="py-5"><div class="container" style="max-width:560px;"><h1 class="fw-bold">Add a directory entry</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 shadow-sm mt-3">
  <div class="row g-3"><div class="col-md-6"><label class="form-label">Name</label><input name="name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Title</label><input name="title" class="form-control"/></div><div class="col-md-6"><label class="form-label">Department</label><input name="department" class="form-control"/></div><div class="col-md-6"><label class="form-label">Photo URL</label><input name="photo_url" type="url" class="form-control"/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control"/></div><div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control"/></div><div class="col-12"><label class="form-label">Bio</label><textarea name="bio" class="form-control" rows="3"></textarea></div></div>
  <button class="btn btn-primary mt-3" type="submit">Add</button>
</form>
</div></section>`,
    },
  ],
};
