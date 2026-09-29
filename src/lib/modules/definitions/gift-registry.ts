import type { ModuleDefinition } from "../types";

export const giftRegistry: ModuleDefinition = {
  id: "gift-registry",
  name: "Gift Registry",
  tagline: "Wedding / baby registry with reserve",
  description:
    "A gift registry where guests can browse items and mark them as reserved. Each item has a name, price, store link and whether it's still available.",
  icon: "",
  color: "from-rose-500 to-pink-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "occasion", label: "Occasion", type: "text", default: "Our Wedding Registry", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "name", type: "text" },
        { name: "description", type: "text" },
        { name: "store_url", type: "text" },
        { name: "image_url", type: "text" },
        { name: "price", type: "float" },
        { name: "reserved_by", type: "text" },
        { name: "available", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Registry feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "available desc, price desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "reserve",
      name: "Reserve item",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "update", data: { table: "items", where: { id: "{{trigger.id}}" }, values: {
          reserved_by: "{{trigger.reserved_by}}",
          available: "false",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thank you!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "registry",
      title: "Registry",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-3 fw-bold">{{config.occasion}}</h1><p class="lead" style="color:var(--nk-text-muted);">Your presence is the best gift, but if you'd like to contribute, here are some things we love.</p></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-4" data-nk-item><div class="card border-0 shadow-sm h-100"><img class="card-img-top" data-nk-src="image_url" src="https://picsum.photos/seed/gift1/480/360" alt=""/><div class="card-body"><h5 class="card-title fw-bold" data-nk-field="name">KitchenAid mixer</h5><p class="card-text small" style="color:var(--nk-text-muted);" data-nk-field="description">In almond cream. We've been dreaming of this for years.</p><div class="fw-bold">$<span data-nk-field="price">399</span></div><div class="d-flex gap-2 mt-3"><a class="btn btn-outline-primary btn-sm flex-grow-1" data-nk-href="store_url" href="#">View</a><button class="btn btn-primary btn-sm flex-grow-1">Reserve</button></div></div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="https://picsum.photos/seed/gift2/480/360" alt=""/><div class="card-body"><h5 class="card-title fw-bold">Ceramic dinnerware set (8)</h5><p class="card-text small" style="color:var(--nk-text-muted);">Handmade from a local potter. Plates, bowls, mugs.</p><div class="fw-bold">$285</div><div class="d-flex gap-2 mt-3"><a class="btn btn-outline-primary btn-sm flex-grow-1" href="#">View</a><button class="btn btn-primary btn-sm flex-grow-1">Reserve</button></div></div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm h-100 opacity-50"><img class="card-img-top" src="https://picsum.photos/seed/gift3/480/360" alt=""/><div class="card-body"><h5 class="card-title fw-bold">Weekend luggage set</h5><p class="card-text small" style="color:var(--nk-text-muted);">For all the adventures ahead.</p><div class="fw-bold">$210</div><div class="mt-3"><span class="badge w-100 p-2" style="background:color-mix(in srgb, var(--nk-text) 50%, var(--nk-bg));">Already reserved</span></div></div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="https://picsum.photos/seed/gift4/480/360" alt=""/><div class="card-body"><h5 class="card-title fw-bold">Copper cookware set</h5><p class="card-text small" style="color:var(--nk-text-muted);">The good stuff. 5-piece set.</p><div class="fw-bold">$650</div><div class="d-flex gap-2 mt-3"><a class="btn btn-outline-primary btn-sm flex-grow-1" href="#">View</a><button class="btn btn-primary btn-sm flex-grow-1">Reserve</button></div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
