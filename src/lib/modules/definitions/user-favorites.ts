import type { ModuleDefinition } from "../types";

/**
 * User Favorites — a module that REQUIRES auth-session.
 *
 * Demonstrates the module interop system: instead of bringing its own auth,
 * this module declares it needs `auth-session` and uses `get_session` to get
 * the logged-in user. The installer blocks install if no module provides
 * auth-session (e.g. Auth / Accounts hasn't been installed first).
 *
 * Every favorite is scoped to `user_id = session.userId`, so users only see
 * their own list. Install the Auth / Accounts module first, then install
 * this on top.
 */
export const userFavorites: ModuleDefinition = {
  id: "user-favorites",
  name: "User Favorites",
  tagline: "Logged-in users save items to a personal list",
  description:
    "Lets logged-in users favorite anything (a product, a truck, a post, an article) and browse their personal list. Uses whatever auth module is already installed in the project — you must install Auth / Accounts (or another auth-session provider) first.",
  icon: "",
  color: "from-amber-400 to-orange-500",
  category: "productivity",
  version: "1.0.0",
  requires: ["auth-session"],
  worksWith: ["auth", "food-truck-finder"],

  tables: [
    {
      name: "items",
      fields: [
        { name: "user_id", type: "text" },
        { name: "label", type: "text" },
        { name: "url", type: "text" },
        { name: "image_url", type: "text" },
        { name: "kind", type: "text" },
      ],
    },
  ],

  flows: [
    {
      slug: "add",
      name: "Add favorite",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "items",
            values: {
              user_id: "{{vars.session.userId}}",
              label: "{{trigger.label}}",
              url: "{{trigger.url}}",
              image_url: "{{trigger.image_url}}",
              kind: "{{trigger.kind}}",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"message":"Added to favorites"}' } },
        { id: "n6", type: "response", data: { status: 401, body: '{"error":"Log in to favorite items"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
    {
      slug: "my-list",
      name: "List my favorites",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: {
            table: "items",
            where: { user_id: "{{vars.session.userId}}" },
            orderBy: "created_at desc",
            limit: 200,
            output: "rows",
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
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
      slug: "favorites",
      title: "My favorites",
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:920px;"><h1 class="display-5 fw-bold">My favorites</h1><p style="color:var(--nk-text-muted);">Everything you've saved, in one place.</p>
<div data-nk-bind-flow-ref="my-list" class="row g-4 mt-3">
  <div class="col-md-4 col-6" data-nk-item>
    <a class="card h-100 text-body" data-nk-href="url" href="#">
      <img class="card-img-top" data-nk-src="image_url" src="/media/generated/ecommerce-celadon-bottles.webp" alt="" style="aspect-ratio:16/11;object-fit:cover;"/>
      <div class="card-body">
        <div class="small text-uppercase" style="color:var(--nk-text-muted);" data-nk-field="kind">Product</div>
        <h5 class="fw-bold mt-1" data-nk-field="label">Saved item name</h5>
      </div>
    </a>
  </div>
  <div class="col-md-4 col-6"><a class="card h-100 text-body" href="#"><img class="card-img-top" src="/media/generated/food-flat-white.webp" alt="" style="aspect-ratio:16/11;object-fit:cover;"/><div class="card-body"><div class="small text-uppercase" style="color:var(--nk-text-muted);">Restaurant</div><h5 class="fw-bold mt-1">Noon Coffee deli</h5></div></a></div>
  <div class="col-md-4 col-6"><a class="card h-100 text-body" href="#"><img class="card-img-top" src="/media/generated/food-loaf-board.webp" alt="" style="aspect-ratio:16/11;object-fit:cover;"/><div class="card-body"><div class="small text-uppercase" style="color:var(--nk-text-muted);">Article</div><h5 class="fw-bold mt-1">Mastering sourdough</h5></div></a></div>
</div>

<hr class="my-5"/>

<h5 class="fw-bold">Add a favorite</h5>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 shadow-sm mt-3"><div class="row g-2"><div class="col-md-4"><input name="label" class="form-control" placeholder="Name" required/></div><div class="col-md-3"><input name="kind" class="form-control" placeholder="Kind (product, article...)"/></div><div class="col-md-3"><input name="url" type="url" class="form-control" placeholder="URL"/></div><div class="col-md-2"><button class="btn btn-primary w-100" type="submit">Save</button></div><div class="col-12"><input name="image_url" type="url" class="form-control" placeholder="Image URL (optional)"/></div></div></form>
</div></section>`,
    },
  ],
};
