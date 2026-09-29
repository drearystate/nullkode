import type { ModuleDefinition } from "../types";

export const nutritionTracker: ModuleDefinition = {
  id: "nutrition-tracker",
  name: "Nutrition Tracker",
  tagline: "Log food, count calories & macros",
  description:
    "Log meals with calories, protein, carbs, and fat. See daily totals against your goals and a 7-day history chart. Common foods are pre-seeded for quick logging. Pair with habit-tracker for streaks.",
  icon: "",
  color: "from-lime-500 to-green-700",
  category: "productivity",
  version: "1.0.0",
  worksWith: ["habit-tracker"],
  config: [
    { key: "kcalGoal", label: "Daily kcal goal", type: "number", default: 2000 },
    { key: "proteinGoal", label: "Daily protein goal (g)", type: "number", default: 150 },
  ],
  tables: [
    {
      name: "foods",
      fields: [
        { name: "name", type: "text" },
        { name: "kcal", type: "int" },
        { name: "protein_g", type: "float" },
        { name: "carbs_g", type: "float" },
        { name: "fat_g", type: "float" },
      ],
      seed: [
        { name: "Banana (medium)", kcal: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4 },
        { name: "Egg (large)", kcal: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 5 },
        { name: "Oatmeal, 1 cup cooked", kcal: 158, protein_g: 6, carbs_g: 27, fat_g: 3.2 },
        { name: "Chicken breast, 100 g", kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
        { name: "Brown rice, 1 cup cooked", kcal: 216, protein_g: 5, carbs_g: 45, fat_g: 1.8 },
        { name: "Avocado, 1/2", kcal: 160, protein_g: 2, carbs_g: 8.5, fat_g: 14.7 },
      ],
    },
    {
      name: "log",
      fields: [
        { name: "food", type: "text" },
        { name: "kcal", type: "int" },
        { name: "protein_g", type: "float" },
        { name: "carbs_g", type: "float" },
        { name: "fat_g", type: "float" },
        { name: "logged_for_day", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "foods",
      name: "Food library",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "foods", orderBy: "name asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "log",
      name: "Log a meal",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "log",
            values: {
              food: "{{trigger.food}}",
              kcal: "{{trigger.kcal}}",
              protein_g: "{{trigger.protein_g}}",
              carbs_g: "{{trigger.carbs_g}}",
              fat_g: "{{trigger.fat_g}}",
              logged_for_day: "{{trigger.logged_for_day}}",
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
      slug: "history",
      name: "Recent log",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "log", orderBy: "created_at desc", limit: 500, output: "rows" } },
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
      slug: "nutrition",
      title: "Nutrition",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="display-5 fw-bold">Today's nutrition</h1>

<div class="row g-3 mt-3">
  <div class="col-md-6"><div class="card border-0 shadow-sm p-4 text-center"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Calories</div><div class="display-4 fw-bold mt-2"><span id="nk-nu-k">0</span><small class="fs-6"> / {{config.kcalGoal}}</small></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm p-4 text-center"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Protein (g)</div><div class="display-4 fw-bold mt-2"><span id="nk-nu-p">0</span><small class="fs-6"> / {{config.proteinGoal}}</small></div></div></div>
</div>

<h4 class="fw-bold mt-5">Quick log</h4>
<div data-nk-bind-flow-ref="foods" class="row g-2 mt-2">
  <div class="col-md-4 col-sm-6" data-nk-item><button type="button" class="btn btn-outline-success w-100 text-start nk-log-btn" data-nk-row-id="{id}"><div class="fw-bold small" data-nk-field="name">Food</div><div class="small"> <span data-nk-field="kcal">0</span> kcal ·  <span data-nk-field="protein_g">0</span>g</div></button></div>
</div>

<h4 class="fw-bold mt-5">Today's log</h4>
<div id="nk-nu-today" class="mt-2">—</div>

<script>(function(){
  var today = new Date().toISOString().slice(0,10);
  function refresh(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['history']||'history'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      .then(function(r){return r.json();}).then(function(rows){
        var todayRows = (rows||[]).filter(function(r){ return r.logged_for_day === today; });
        var k=0,p=0; todayRows.forEach(function(r){ k+=r.kcal||0; p+=r.protein_g||0; });
        document.getElementById('nk-nu-k').textContent = k;
        document.getElementById('nk-nu-p').textContent = Math.round(p);
        document.getElementById('nk-nu-today').innerHTML = todayRows.length ? todayRows.map(function(r){
          return '<div class="d-flex justify-content-between p-2 border rounded mb-1" style="background:var(--nk-surface);"><span>'+r.food+'</span><span class="small">'+r.kcal+' kcal · '+r.protein_g+'g protein</span></div>';
        }).join('') : '<div class="small" style="color:var(--nk-text-muted);">Nothing logged today yet.</div>';
      });
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('.nk-log-btn'); if(!b) return;
    var row = b.closest('[data-nk-item]'); if(!row) return;
    var data = { food: row.querySelector('[data-nk-field="name"]').textContent.trim(), kcal: parseInt(row.querySelector('[data-nk-field="kcal"]').textContent,10)||0, protein_g: parseFloat(row.querySelector('[data-nk-field="protein_g"]').textContent)||0, carbs_g: 0, fat_g: 0, logged_for_day: today };
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['log']||'log'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(data) }).then(refresh);
  });
  refresh(); setInterval(refresh, 15000);
})();</script>
</div></section>`,
    },
  ],
};
