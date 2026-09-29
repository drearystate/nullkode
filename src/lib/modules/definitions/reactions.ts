import type { ModuleDefinition } from "../types";

export const reactions: ModuleDefinition = {
  id: "reactions",
  name: "Reactions",
  tagline: "Emoji reactions on any post, comment or item",
  description:
    "A polymorphic reactions system. Any row in any table can have emoji reactions attached (     …). Each reaction is one row referencing (entity_table, entity_id, emoji, optional user_id). Fanwall, forum, blog, gallery — any module can opt in.",
  icon: "",
  color: "from-pink-500 to-red-600",
  category: "community",
  version: "1.0.0",
  tables: [
    {
      name: "reactions",
      fields: [
        { name: "entity_table", type: "text" },
        { name: "entity_id", type: "text" },
        { name: "emoji", type: "text" },
        { name: "user_id", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "react",
      name: "Add a reaction",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "reactions",
            values: {
              entity_table: "{{trigger.entity_table}}",
              entity_id: "{{trigger.entity_id}}",
              emoji: "{{trigger.emoji}}",
              user_id: "{{trigger.user_id}}",
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
      slug: "unreact",
      name: "Remove a reaction",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "delete", data: { table: "reactions", where: { id: "{{trigger.id}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "for-entity",
      name: "List reactions for one entity",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "reactions",
            where: { entity_table: "{{trigger.entity_table}}", entity_id: "{{trigger.entity_id}}" },
            limit: 500,
            output: "rows",
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "top",
      name: "Top reactions overall",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "reactions", limit: 5000, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "reactions",
      title: "Reactions",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:680px;">
<h1 class="fw-bold">Reactions</h1>
<p style="color:var(--nk-text-muted);">Drop the snippet into any page to let visitors react to a row. Pass <code>entity_table</code> and <code>entity_id</code>.</p>

<div class="card p-4 mt-3 shadow-sm">
  <h5 class="fw-bold">Demo</h5>
  <div class="p-3 rounded" style="background:var(--nk-surface);">
    <p>"This is a sample post. React below."</p>
    <div data-nk-reactions data-entity-table="demo" data-entity-id="1" class="d-flex gap-2 flex-wrap mt-2"></div>
  </div>
</div>

<div class="card p-3 mt-4" style="background:var(--nk-surface-2);"><div class="fw-bold mb-2">Snippet</div><pre class="m-0 small" style="white-space:pre-wrap;">&lt;div data-nk-reactions
     data-entity-table="posts"
     data-entity-id="42"&gt;&lt;/div&gt;</pre></div>

<h4 class="fw-bold mt-5">Trending reactions</h4>
<div id="nk-trend" class="d-flex flex-wrap gap-3 fs-3 mt-3">—</div>

<script>(function(){
  var EMOJIS = ['','','','','',''];
  function paint(host){
    var et = host.getAttribute('data-entity-table'); var eid = host.getAttribute('data-entity-id');
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['for-entity']||'for-entity'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({entity_table:et, entity_id:eid}) })
      .then(function(r){return r.json();}).then(function(rows){
        var counts = {}; (rows||[]).forEach(function(r){ counts[r.emoji]=(counts[r.emoji]||0)+1; });
        host.innerHTML = EMOJIS.map(function(e){
          var c = counts[e] || 0;
          return '<button type="button" class="btn btn-sm '+(c?'btn-primary':'btn-outline-secondary')+' nk-react" data-emoji="'+e+'">'+e+' <span class="badge bg-light text-dark ms-1">'+c+'</span></button>';
        }).join('');
        host.querySelectorAll('.nk-react').forEach(function(b){
          b.addEventListener('click', function(){
            fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['react']||'react'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({entity_table:et, entity_id:eid, emoji:b.getAttribute('data-emoji'), user_id:''}) }).then(function(){ paint(host); });
          });
        });
      });
  }
  document.querySelectorAll('[data-nk-reactions]').forEach(paint);
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['top']||'top'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
    .then(function(r){return r.json();}).then(function(rows){
      var c={}; (rows||[]).forEach(function(r){ c[r.emoji]=(c[r.emoji]||0)+1; });
      document.getElementById('nk-trend').innerHTML = Object.entries(c).sort(function(a,b){return b[1]-a[1];}).slice(0,8).map(function(p){ return '<div class="text-center">'+p[0]+'<div class="small">'+p[1]+'</div></div>'; }).join('') || '<span style="color:var(--nk-text-muted);">No reactions yet.</span>';
    });
})();</script>
</div></section>`,
    },
  ],
};
