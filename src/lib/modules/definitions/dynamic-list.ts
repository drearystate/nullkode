import type { ModuleDefinition } from "../types";

export const dynamicList: ModuleDefinition = {
  id: "dynamic-list",
  name: "Dynamic List (Mini-CMS)",
  tagline: "Define a list schema, get an editable page",
  description:
    "A mini-CMS: admin defines a 'list' (with a name and a JSON schema of fields), then adds rows through a generated form. Each list gets a public read page and an admin edit page. The 'make your own module' module — perfect when nothing else fits.",
  icon: "",
  color: "from-purple-500 to-fuchsia-700",
  category: "utility",
  version: "1.0.0",
  tables: [
    {
      name: "lists",
      fields: [
        { name: "slug", type: "text" },
        { name: "name", type: "text" },
        { name: "description", type: "text" },
        { name: "schema_json", type: "text" },
      ],
      seed: [
        { slug: "books", name: "Books we love", description: "A reading list anyone can contribute to.", schema_json: '[{"key":"title","label":"Title","type":"text","required":true},{"key":"author","label":"Author","type":"text"},{"key":"why","label":"Why we like it","type":"textarea"},{"key":"cover_url","label":"Cover image URL","type":"url"}]' },
      ],
    },
    {
      name: "rows",
      fields: [
        { name: "list_id", type: "text" },
        { name: "data_json", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create-list",
      name: "Create a list",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "lists",
            values: {
              slug: "{{trigger.slug}}",
              name: "{{trigger.name}}",
              description: "{{trigger.description}}",
              schema_json: "{{trigger.schema_json}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"redirect":"/list?slug={{trigger.slug}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "lists",
      name: "All lists",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "lists", orderBy: "name asc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "by-slug",
      name: "Load a list by slug",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "lists", where: { slug: "{{trigger.slug}}" }, limit: 1, output: "list" } },
        { id: "n3", type: "query", data: { table: "rows", where: { list_id: "{{vars.list.0.id}}" }, orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n4", type: "response", data: { status: 200, body: '{"list":{{vars.list.0}},"rows":{{vars.rows}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "add-row",
      name: "Add a row to a list",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: { table: "rows", values: { list_id: "{{trigger.list_id}}", data_json: "{{trigger.data_json}}" } },
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
      slug: "lists",
      title: "Lists",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="display-5 fw-bold">Dynamic lists</h1>
<p style="color:var(--nk-text-muted);">Spin up a quick editable list — like a mini database table with a UI — in seconds.</p>

<form data-nk-form="" data-nk-flow-ref="create-list" class="card p-3 shadow-sm mt-3">
  <h5 class="fw-bold">New list</h5>
  <div class="row g-2"><div class="col-md-7"><input name="name" class="form-control" placeholder="List name (e.g. Office tools)" required/></div><div class="col-md-5"><input name="slug" class="form-control" placeholder="url-slug" required/></div><div class="col-12"><input name="description" class="form-control" placeholder="One-line description"/></div><div class="col-12"><label class="form-label small mb-1">Schema (JSON array of {key, label, type, required?})</label><textarea name="schema_json" class="form-control font-monospace small" rows="4" required>[{"key":"name","label":"Name","type":"text","required":true},{"key":"note","label":"Note","type":"textarea"}]</textarea></div></div>
  <button class="btn btn-primary mt-3" type="submit">Create list</button>
</form>

<h4 class="fw-bold mt-5">Your lists</h4>
<div data-nk-bind-flow-ref="lists" data-nk-refresh="20000" class="row g-3 mt-2">
  <div class="col-md-6" data-nk-item><a class="card border-0 shadow-sm h-100 p-3 text-decoration-none text-body" data-nk-href-template="/list?slug={slug}" href="#"><h5 class="fw-bold" data-nk-field="name">List name</h5><div class="small" style="color:var(--nk-text-muted);" data-nk-field="description">Description</div></a></div>
</div>
</div></section>`,
    },
    {
      slug: "list",
      title: "List",
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<a href="/lists" class="small text-decoration-none" style="color:var(--nk-text-muted);">← All lists</a>
<h1 class="fw-bold mt-2" id="nk-list-name">List</h1>
<p style="color:var(--nk-text-muted);" id="nk-list-desc">—</p>

<form id="nk-add-form" class="card p-3 shadow-sm mt-3"><h5 class="fw-bold mb-3">Add a row</h5><div id="nk-form-host"></div><button class="btn btn-primary mt-2" type="submit">Add</button></form>

<h4 class="fw-bold mt-5">Entries</h4>
<div id="nk-rows" class="mt-2">Loading…</div>

<script>(function(){
  var slug = new URLSearchParams(location.search).get('slug') || '';
  var listId = null; var schema = [];
  function field(f){
    var ctrl = f.type === 'textarea' ? '<textarea name="'+f.key+'" class="form-control" '+(f.required?'required':'')+'></textarea>' :
      '<input name="'+f.key+'" type="'+(f.type||'text')+'" class="form-control" '+(f.required?'required':'')+'/>';
    return '<div class="mb-2"><label class="form-label small mb-1">'+f.label+'</label>'+ctrl+'</div>';
  }
  function paintRows(rows){
    document.getElementById('nk-rows').innerHTML = (rows||[]).map(function(r){
      var d = {}; try { d = JSON.parse(r.data_json || '{}'); } catch(e){}
      var body = schema.map(function(f){
        var v = d[f.key]; if(v == null || v === '') return '';
        if(f.type === 'url' && /^https?:/.test(v)) return '<div class="small"><strong>'+f.label+':</strong> <a href="'+v+'" target="_blank">'+v+'</a></div>';
        return '<div class="small"><strong>'+f.label+':</strong> '+String(v).replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];})+'</div>';
      }).join('');
      return '<div class="card border-0 shadow-sm mb-2 p-3">'+body+'</div>';
    }).join('') || '<div class="alert alert-light">No entries yet.</div>';
  }
  function load(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['by-slug']||'by-slug'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({slug:slug}) })
      .then(function(r){return r.json();}).then(function(d){
        if(!d.list) return;
        listId = d.list.id;
        document.getElementById('nk-list-name').textContent = d.list.name;
        document.getElementById('nk-list-desc').textContent = d.list.description || '';
        try { schema = JSON.parse(d.list.schema_json || '[]'); } catch(e){ schema = []; }
        document.getElementById('nk-form-host').innerHTML = schema.map(field).join('');
        paintRows(d.rows);
      });
  }
  document.getElementById('nk-add-form').addEventListener('submit', function(e){
    e.preventDefault();
    var data = {}; schema.forEach(function(f){ var el = e.target.querySelector('[name="'+f.key+'"]'); if(el) data[f.key] = el.value; });
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['add-row']||'add-row'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({list_id:listId, data_json: JSON.stringify(data)}) })
      .then(function(){ e.target.reset(); load(); });
  });
  load(); setInterval(load, 10000);
})();</script>
</div></section>`,
    },
  ],
};
