import type { ModuleDefinition } from "../types";

export const leaderboard: ModuleDefinition = {
  id: "leaderboard",
  name: "Leaderboard",
  tagline: "Generic ranking over any score column",
  description:
    "A generic leaderboard. Add scores against a user_label (any string — email, name, gym member, employee), the leaderboard ranks descending. Filter by category to maintain multiple boards (steps, sales, points). Submit-score endpoint can be called from any other module.",
  icon: "",
  color: "from-yellow-400 to-orange-600",
  category: "community",
  version: "1.0.0",
  worksWith: ["gym", "loyalty-card", "habit-tracker", "quiz"],
  config: [
    { key: "boardTitle", label: "Board title", type: "text", default: "Leaderboard", required: true },
    { key: "defaultCategory", label: "Default category", type: "text", default: "points" },
  ],
  tables: [
    {
      name: "scores",
      fields: [
        { name: "category", type: "text" },
        { name: "user_label", type: "text" },
        { name: "avatar_url", type: "text" },
        { name: "score", type: "float" },
      ],
      seed: [
        { category: "points", user_label: "Marcus", avatar_url: "/media/generated/thumbs/finance-advisor-marcus.webp", score: 4820 },
        { category: "points", user_label: "Sarah", avatar_url: "/media/generated/thumbs/education-instructor-laura.webp", score: 4100 },
        { category: "points", user_label: "Priya", avatar_url: "/media/generated/thumbs/people-priya.webp", score: 3870 },
        { category: "points", user_label: "Devon", avatar_url: "/media/generated/thumbs/people-devon.webp", score: 3120 },
      ],
    },
  ],
  flows: [
    {
      slug: "submit",
      name: "Submit / update a score",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "scores", where: { category: "{{trigger.category}}", user_label: "{{trigger.user_label}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "branch", data: { left: "{{vars.row.0.id}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "update",
          data: { table: "scores", where: { id: "{{vars.row.0.id}}" }, values: { score: "{{trigger.score}}", avatar_url: "{{trigger.avatar_url}}" } },
        },
        {
          id: "n5",
          type: "insert",
          data: {
            table: "scores",
            values: {
              category: "{{trigger.category}}",
              user_label: "{{trigger.user_label}}",
              avatar_url: "{{trigger.avatar_url}}",
              score: "{{trigger.score}}",
            },
          },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n6" },
        { id: "e5", source: "n3", target: "n5", sourceHandle: "false" },
        { id: "e6", source: "n5", target: "n6" },
      ],
    },
    {
      slug: "top",
      name: "Top scores in a category",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "scores", where: { category: "{{trigger.category}}" }, orderBy: "score desc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "categories",
      name: "Distinct categories",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "scores", limit: 5000, output: "rows" } },
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
      slug: "leaderboard",
      title: "Leaderboard",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:680px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">{{config.boardTitle}}</h1></div>

<div class="d-flex justify-content-center gap-2 mt-3 flex-wrap" id="nk-cats"></div>

<div id="nk-board" class="mt-4">Loading…</div>

<form data-nk-form="" data-nk-flow-ref="submit" class="card p-3 shadow-sm mt-5">
  <h5 class="fw-bold">Submit a score</h5>
  <div class="row g-2"><div class="col-md-4"><input name="category" class="form-control" placeholder="Category" aria-label="Category" value="{{config.defaultCategory}}"/></div><div class="col-md-4"><input name="user_label" class="form-control" placeholder="Player name" aria-label="Player name"/></div><div class="col-md-3"><input name="score" type="number" step="0.01" class="form-control" placeholder="Score" aria-label="Score"/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit" aria-label="Add score">+</button></div></div>
</form>

<script>(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function safeUrl(u){u=String(u||'');return /^(https?:|\\/|data:image\\/)/i.test(u)?u:'#'}
  var cat = \`{{config.defaultCategory}}\`;
  function paint(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['top']||'top'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({category:cat}) })
      .then(function(r){return r.json();}).then(function(rows){
        var medals = ['','',''];
        document.getElementById('nk-board').innerHTML = (Array.isArray(rows)?rows:[]).map(function(r, i){
          var m = medals[i] || (i+1)+'.';
          return '<div class="d-flex align-items-center gap-3 p-3 border rounded mb-2" style="background:var(--nk-surface);"><div class="fs-3" style="width:40px;text-align:center;">'+m+'</div><img class="rounded-circle" style="width:48px;height:48px;object-fit:cover;" src="'+esc(safeUrl(r.avatar_url||'/media/generated/thumbs/people-sam-patel.webp'))+'" alt=""/><div class="flex-grow-1 fw-bold">'+esc(r.user_label)+'</div><div class="fs-4 fw-bold" style="color:var(--nk-primary);">'+esc(r.score)+'</div></div>';
        }).join('') || '<div class="alert alert-light">No scores yet.</div>';
      });
  }
  function paintCats(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['categories']||'categories'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      .then(function(r){return r.json();}).then(function(rows){
        var set = {}; (Array.isArray(rows)?rows:[]).forEach(function(r){ if(r.category) set[r.category]=1; });
        document.getElementById('nk-cats').innerHTML = Object.keys(set).map(function(c){ return '<button type="button" class="btn btn-sm '+(c===cat?'btn-primary':'btn-outline-primary')+' nk-cat" data-c="'+esc(c)+'">'+esc(c)+'</button>'; }).join('');
        document.querySelectorAll('.nk-cat').forEach(function(b){ b.addEventListener('click', function(){ cat = b.getAttribute('data-c'); paint(); paintCats(); }); });
      });
  }
  paint(); paintCats(); setInterval(paint, 10000);
})();</script>
</div></section>`,
    },
  ],
};
