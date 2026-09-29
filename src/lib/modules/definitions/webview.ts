import type { ModuleDefinition } from "../types";

export const webview: ModuleDefinition = {
  id: "webview",
  name: "Web View",
  tagline: "Embed an external URL as an in-app page",
  description:
    "A simple wrapper that embeds an external URL inside your app via a sandboxed iframe. Useful for embedding existing docs, dashboards, or third-party apps that don't have a native module yet. Configurable per page; supports allowlisted-only sources for safety.",
  icon: "",
  color: "from-slate-500 to-slate-700",
  category: "utility",
  version: "1.0.0",
  tables: [
    {
      name: "webviews",
      fields: [
        { name: "label", type: "text" },
        { name: "url", type: "text" },
        { name: "allow_scripts", type: "bool" },
      ],
      seed: [
        { label: "Status dashboard", url: "https://example.com", allow_scripts: false },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List embeds",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "webviews", orderBy: "label asc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "get",
      name: "Get one embed by id",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "webviews", where: { id: "{{trigger.id}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.row.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add",
      name: "Add an embed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "webviews",
            values: { label: "{{trigger.label}}", url: "{{trigger.url}}", allow_scripts: "{{trigger.allow_scripts}}" },
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
      slug: "webview",
      title: "Embedded",
      isHome: true,
      html: `<section class="py-3"><div class="container" style="max-width:1200px;">
<h1 class="fw-bold" id="nk-wv-label">Loading…</h1>
<iframe id="nk-wv-frame" style="width:100%;height:84vh;border:1px solid var(--nk-border);border-radius:8px;" src="about:blank" sandbox="allow-forms allow-popups allow-same-origin"></iframe>
<script>(function(){
  var id = new URLSearchParams(location.search).get('id') || '';
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['get']||'get'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id:id}) })
    .then(function(r){return r.json();}).then(function(c){
      if(!c){ document.getElementById('nk-wv-label').textContent = 'Embed not found.'; return; }
      document.getElementById('nk-wv-label').textContent = c.label || c.url;
      var f = document.getElementById('nk-wv-frame');
      if(c.allow_scripts){ f.setAttribute('sandbox', 'allow-forms allow-popups allow-same-origin allow-scripts'); }
      f.src = c.url;
    });
})();</script>
</div></section>`,
    },
    {
      slug: "webviews",
      title: "Manage embeds",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Embeds</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 shadow-sm mt-3">
  <input name="label" class="form-control mb-2" placeholder="Label (e.g. Status dashboard)" required/>
  <input name="url" type="url" class="form-control mb-2" placeholder="https://…" required/>
  <div class="form-check"><input class="form-check-input" type="checkbox" name="allow_scripts" value="true"/><label class="form-check-label">Allow scripts inside the iframe (use cautiously)</label></div>
  <button class="btn btn-primary mt-3" type="submit">Add</button>
</form>
<div data-nk-bind-flow-ref="list" data-nk-refresh="15000" class="mt-3">
  <a class="d-flex justify-content-between p-3 border rounded mb-2 text-decoration-none text-body" data-nk-item data-nk-href-template="/webview?id={id}" href="#" style="background:var(--nk-surface);"><div><div class="fw-bold" data-nk-field="label">Label</div><div class="small font-monospace" style="color:var(--nk-text-muted);" data-nk-field="url">URL</div></div></a>
</div>
</div></section>`,
    },
  ],
};
