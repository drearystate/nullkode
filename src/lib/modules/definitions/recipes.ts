import type { ModuleDefinition } from "../types";

export const recipes: ModuleDefinition = {
  id: "recipes",
  name: "Recipes",
  tagline: "Recipe collection with ingredients and steps",
  description:
    "A collection of recipes. Each has a title, cover image, ingredient list, instructions, prep time and serving count. Perfect for home cooks or a food blog.",
  icon: "",
  color: "from-orange-500 to-red-600",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "kitchenName", label: "Collection name", type: "text", default: "Our Kitchen", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "title", type: "text" },
        { name: "summary", type: "text" },
        { name: "image_url", type: "text" },
        { name: "ingredients", type: "text" },
        { name: "instructions", type: "text" },
        { name: "prep_minutes", type: "int" },
        { name: "servings", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Recipes feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add recipe",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          title: "{{trigger.title}}",
          summary: "{{trigger.summary}}",
          image_url: "{{trigger.image_url}}",
          ingredients: "{{trigger.ingredients}}",
          instructions: "{{trigger.instructions}}",
          prep_minutes: "{{trigger.prep_minutes}}",
          servings: "{{trigger.servings}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "recipes",
      title: "Recipes",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.kitchenName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Simple, seasonal, delicious.</p></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-4" data-nk-item><a class="card border-0 shadow-sm h-100 text-decoration-none text-body" href="#"><img class="card-img-top" data-nk-src="image_url" src="/media/generated/food-lemon-ricotta-pancakes.webp" alt=""/><div class="card-body"><h5 class="card-title fw-bold" data-nk-field="title">Lemon ricotta pancakes</h5><p class="card-text small" style="color:var(--nk-text-muted);" data-nk-field="summary">Fluffy, tangy and surprisingly easy. Weekend breakfast upgrade.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> <span data-nk-field="prep_minutes">25</span> min</span><span> <span data-nk-field="servings">4</span> servings</span></div></div></a></div>
  <div class="col-md-4"><a class="card border-0 shadow-sm h-100 text-decoration-none text-body" href="#"><img class="card-img-top" src="/media/generated/food-garlic-oil-pasta.webp" alt=""/><div class="card-body"><h5 class="card-title fw-bold">Weeknight pasta with garlic and oil</h5><p class="card-text small" style="color:var(--nk-text-muted);">Five ingredients, ten minutes, always a win.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 10 min</span><span> 2 servings</span></div></div></a></div>
  <div class="col-md-4"><a class="card border-0 shadow-sm h-100 text-decoration-none text-body" href="#"><img class="card-img-top" src="/media/generated/food-sheet-pan-salmon.webp" alt=""/><div class="card-body"><h5 class="card-title fw-bold">Sheet pan salmon with vegetables</h5><p class="card-text small" style="color:var(--nk-text-muted);">One pan, clean-up in ten. Dinner in under 30.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 30 min</span><span> 4 servings</span></div></div></a></div>
  <div class="col-md-4"><a class="card border-0 shadow-sm h-100 text-decoration-none text-body" href="#"><img class="card-img-top" src="/media/generated/food-chocolate-chip-cookies.webp" alt=""/><div class="card-body"><h5 class="card-title fw-bold">Chocolate chip cookies, the real way</h5><p class="card-text small" style="color:var(--nk-text-muted);">Brown butter, flaky salt, slightly underdone.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 45 min</span><span> 24 cookies</span></div></div></a></div>
  <div class="col-md-4"><a class="card border-0 shadow-sm h-100 text-decoration-none text-body" href="#"><img class="card-img-top" src="/media/generated/food-green-grain-bowl.webp" alt=""/><div class="card-body"><h5 class="card-title fw-bold">Green goddess grain bowl</h5><p class="card-text small" style="color:var(--nk-text-muted);">Farro, kale, herbs, tahini dressing. Meal prep friendly.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 35 min</span><span> 4 servings</span></div></div></a></div>
  <div class="col-md-4"><a class="card border-0 shadow-sm h-100 text-decoration-none text-body" href="#"><img class="card-img-top" src="/media/generated/food-tomato-soup.webp" alt=""/><div class="card-body"><h5 class="card-title fw-bold">Tomato soup like Grandma's</h5><p class="card-text small" style="color:var(--nk-text-muted);">Made from scratch but quick enough for a weeknight.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> 40 min</span><span> 6 servings</span></div></div></a></div>
</div>
</div></section>`,
    },
  ],
};
