import type { ModuleDefinition } from "../types";

/**
 * Food Truck Finder — the reference "fully integrated" module.
 *
 * This is a whole small SaaS in a single module:
 *   - Customer signup/login with the full auth recipe (argon2 hash, JWT
 *     session cookie). Uses hash_password, verify_password, set_session,
 *     get_session and clear_session flow nodes.
 *   - Food-truck owner signup, separate from customer signup, that creates
 *     a user AND a truck linked via the session's userId.
 *   - Public discovery: Leaflet map with a pin per active truck, plus a
 *     grid of truck cards below.
 *   - Per-truck pages (loaded via ?id=<truckId> query param + client-side
 *     fetch) showing menu, coupons and reviews.
 *   - Owner dashboard (protected) where the logged-in owner can edit their
 *     truck's location, hours, menu items and coupons.
 *   - Review submission, coupon redemption-ready schema, cuisine filter.
 *
 * Combined with the module interop tags (provides + requires), this shows
 * what a fully integrated vertical SaaS built on Nullkode's primitives
 * looks like.
 */
export const foodTruckFinder: ModuleDefinition = {
  id: "food-truck-finder",
  name: "Food Truck Finder",
  tagline: "A Yelp-for-food-trucks with owner sign-ups and live maps",
  description:
    "Everything a food truck app needs. Truck owners sign up, put their truck on the map, keep their menu up to date and post deals. Customers see trucks near them on a map, read reviews and grab deals. Includes its own sign-up and sign-in.",
  icon: "",
  color: "from-orange-500 to-red-600",
  category: "commerce",
  version: "1.0.0",
  provides: ["auth-session", "auth-users", "map", "menu", "coupons", "reviews"],
  worksWith: ["push-notifications", "weather", "ai-assistant"],

  config: [
    { key: "brandName", label: "Site name", type: "text", default: "CityTrucks", required: true },
    { key: "cityName", label: "City / region name", type: "text", default: "Seattle", required: true },
    { key: "defaultLat", label: "City center latitude", type: "text", default: "47.6062" },
    { key: "defaultLng", label: "City center longitude", type: "text", default: "-122.3321" },
    { key: "defaultZoom", label: "Default map zoom", type: "number", default: 12 },
  ],

  tables: [
    {
      name: "users",
      fields: [
        { name: "email", type: "text" },
        { name: "password_hash", type: "text" },
        { name: "name", type: "text" },
        { name: "role", type: "text" },
      ],
    },
    {
      name: "trucks",
      fields: [
        { name: "owner_user_id", type: "text" },
        { name: "name", type: "text" },
        { name: "tagline", type: "text" },
        { name: "cuisine", type: "text" },
        { name: "description", type: "text" },
        { name: "phone", type: "text" },
        { name: "image_url", type: "text" },
        { name: "lat", type: "float" },
        { name: "lng", type: "float" },
        { name: "current_address", type: "text" },
        { name: "hours", type: "text" },
        { name: "active", type: "bool" },
      ],
    },
    {
      name: "menu_items",
      fields: [
        { name: "truck_id", type: "text" },
        { name: "name", type: "text" },
        { name: "description", type: "text" },
        { name: "price", type: "float" },
        { name: "category", type: "text" },
        { name: "image_url", type: "text" },
      ],
    },
    {
      name: "coupons",
      fields: [
        { name: "truck_id", type: "text" },
        { name: "code", type: "text" },
        { name: "discount_text", type: "text" },
        { name: "active", type: "bool" },
      ],
    },
    {
      name: "reviews",
      fields: [
        { name: "truck_id", type: "text" },
        { name: "reviewer_name", type: "text" },
        { name: "rating", type: "int" },
        { name: "comment", type: "text" },
      ],
    },
  ],

  flows: [
    // -- auth --
    {
      slug: "register",
      name: "Register new user",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "hash_password", data: { input: "{{trigger.password}}", output: "hash" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "users",
            values: {
              email: "{{trigger.email}}",
              password_hash: "{{vars.hash}}",
              name: "{{trigger.name}}",
              role: "{{trigger.role}}",
            },
            output: "user",
          },
        },
        { id: "n4", type: "set_session", data: { userId: "{{vars.user.id}}" } },
        {
          id: "n5",
          type: "response",
          data: { status: 200, body: '{"ok":true,"redirect":"/"}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "login",
      name: "Log in",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "users", where: { email: "{{trigger.email}}" }, limit: 1, output: "user" },
        },
        {
          id: "n3",
          type: "verify_password",
          data: {
            plain: "{{trigger.password}}",
            hash: "{{vars.user.0.password_hash}}",
            output: "ok",
          },
        },
        {
          id: "n4",
          type: "branch",
          data: { left: "{{vars.ok}}", op: "==", right: "true" },
        },
        { id: "n5", type: "set_session", data: { userId: "{{vars.user.0.id}}" } },
        {
          id: "n6",
          type: "response",
          data: { status: 200, body: '{"ok":true,"redirect":"/"}' },
        },
        {
          id: "n7",
          type: "response",
          data: { status: 401, body: '{"error":"Invalid email or password"}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "true" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n4", target: "n7", sourceHandle: "false" },
      ],
    },
    {
      slug: "logout",
      name: "Log out",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "clear_session", data: {} },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },

    // -- trucks --
    {
      slug: "register-truck",
      name: "Register a food truck (owner signup)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "hash_password", data: { input: "{{trigger.password}}", output: "hash" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "users",
            values: {
              email: "{{trigger.email}}",
              password_hash: "{{vars.hash}}",
              name: "{{trigger.name}}",
              role: "owner",
            },
            output: "user",
          },
        },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "trucks",
            values: {
              owner_user_id: "{{vars.user.id}}",
              name: "{{trigger.truck_name}}",
              tagline: "{{trigger.tagline}}",
              cuisine: "{{trigger.cuisine}}",
              description: "{{trigger.description}}",
              phone: "{{trigger.phone}}",
              image_url: "{{trigger.image_url}}",
              lat: "{{trigger.lat}}",
              lng: "{{trigger.lng}}",
              current_address: "{{trigger.current_address}}",
              hours: "{{trigger.hours}}",
              active: "true",
            },
            output: "truck",
          },
        },
        { id: "n5", type: "set_session", data: { userId: "{{vars.user.id}}" } },
        {
          id: "n6",
          type: "response",
          data: { status: 200, body: '{"ok":true,"redirect":"/my-truck"}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
      ],
    },
    {
      slug: "list-trucks",
      name: "List active trucks",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "trucks", where: { active: "true" }, orderBy: "created_at desc", limit: 500, output: "rows" },
        },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "get-my-truck",
      name: "Get the logged-in owner's truck",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "branch",
          data: { left: "{{vars.session.userId}}", op: "exists", right: "" },
        },
        {
          id: "n4",
          type: "query",
          data: {
            table: "trucks",
            where: { owner_user_id: "{{vars.session.userId}}" },
            limit: 1,
            output: "truck",
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: "{{vars.truck}}" } },
        { id: "n6", type: "response", data: { status: 401, body: '{"error":"Not signed in"}' } },
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
      slug: "update-my-truck",
      name: "Update truck details (location / hours)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "branch",
          data: { left: "{{vars.session.userId}}", op: "exists", right: "" },
        },
        {
          id: "n4",
          type: "update",
          data: {
            table: "trucks",
            where: { owner_user_id: "{{vars.session.userId}}" },
            values: {
              tagline: "{{trigger.tagline}}",
              cuisine: "{{trigger.cuisine}}",
              description: "{{trigger.description}}",
              phone: "{{trigger.phone}}",
              image_url: "{{trigger.image_url}}",
              lat: "{{trigger.lat}}",
              lng: "{{trigger.lng}}",
              current_address: "{{trigger.current_address}}",
              hours: "{{trigger.hours}}",
              active: "{{trigger.active}}",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"message":"Truck updated!"}' } },
        { id: "n6", type: "response", data: { status: 401, body: '{"error":"Not signed in"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },

    // -- menus --
    {
      slug: "list-menu",
      name: "List menu items for the owner's truck",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: { table: "trucks", where: { owner_user_id: "{{vars.session.userId}}" }, limit: 1, output: "truck" },
        },
        {
          id: "n4",
          type: "query",
          data: { table: "menu_items", where: { truck_id: "{{vars.truck.0.id}}" }, orderBy: "category asc, name asc", limit: 200, output: "items" },
        },
        { id: "n5", type: "response", data: { status: 200, body: "{{vars.items}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "add-menu-item",
      name: "Add a menu item to the owner's truck",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: { table: "trucks", where: { owner_user_id: "{{vars.session.userId}}" }, limit: 1, output: "truck" },
        },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "menu_items",
            values: {
              truck_id: "{{vars.truck.0.id}}",
              name: "{{trigger.name}}",
              description: "{{trigger.description}}",
              price: "{{trigger.price}}",
              category: "{{trigger.category}}",
              image_url: "{{trigger.image_url}}",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },

    // -- coupons --
    {
      slug: "list-my-coupons",
      name: "List coupons for the owner's truck",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: { table: "trucks", where: { owner_user_id: "{{vars.session.userId}}" }, limit: 1, output: "truck" },
        },
        {
          id: "n4",
          type: "query",
          data: { table: "coupons", where: { truck_id: "{{vars.truck.0.id}}" }, orderBy: "created_at desc", limit: 100, output: "items" },
        },
        { id: "n5", type: "response", data: { status: 200, body: "{{vars.items}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "add-coupon",
      name: "Publish a coupon for the owner's truck",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: { table: "trucks", where: { owner_user_id: "{{vars.session.userId}}" }, limit: 1, output: "truck" },
        },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "coupons",
            values: {
              truck_id: "{{vars.truck.0.id}}",
              code: "{{trigger.code}}",
              discount_text: "{{trigger.discount_text}}",
              active: "true",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },

    // -- public: active coupons across every truck --
    {
      slug: "list-public-coupons",
      name: "Public coupon feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "coupons", where: { active: "true" }, orderBy: "created_at desc", limit: 100, output: "rows" },
        },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },

    // -- public: submit a review --
    {
      slug: "submit-review",
      name: "Submit a review",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "reviews",
            values: {
              truck_id: "{{trigger.truck_id}}",
              reviewer_name: "{{trigger.reviewer_name}}",
              rating: "{{trigger.rating}}",
              comment: "{{trigger.comment}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks for the review!"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "recent-reviews",
      name: "Recent reviews across all trucks",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "reviews", orderBy: "created_at desc", limit: 20, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],

  pages: [
    // ---- Home ----
    {
      slug: "home",
      title: "Home",
      isHome: true,
      html: `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

<header class="py-3" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;">
  <div class="container d-flex justify-content-between align-items-center">
    <a href="/" class="text-decoration-none d-flex align-items-center gap-2" style="color:#fff;"><span style="font-size:28px;"></span> <strong>{{config.brandName}}</strong></a>
    <nav class="d-flex gap-3 small">
      <a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/trucks">All trucks</a>
      <a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/deals">Deals</a>
      <a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/register-truck">List your truck</a>
      <a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/login">Log in</a>
    </nav>
  </div>
</header>

<section class="py-5" style="background:var(--nk-surface-2);">
  <div class="container">
    <div class="row align-items-center g-4">
      <div class="col-lg-6">
        <h1 class="display-4 fw-bold">Find food trucks in {{config.cityName}}</h1>
        <p class="lead" style="color:var(--nk-text-muted);">Live locations, today's menus, and deals from your favorite trucks — all in one place.</p>
        <div class="d-flex gap-2 mt-4"><a href="/trucks" class="btn btn-primary btn-lg">Browse trucks</a><a href="/register-truck" class="btn btn-outline-primary btn-lg">I own a truck</a></div>
      </div>
      <div class="col-lg-6">
        <div data-nk-map data-nk-lat="{{config.defaultLat}}" data-nk-lng="{{config.defaultLng}}" data-nk-zoom="{{config.defaultZoom}}" data-nk-label="{{config.cityName}}" style="height:360px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.15);background:#e5e7eb;"></div>
      </div>
    </div>
  </div>
</section>

<section class="py-5">
  <div class="container">
    <h2 class="fw-bold mb-4">On the road today</h2>
    <div data-nk-bind-flow-ref="list-trucks" data-nk-refresh="60000" class="row g-4">
      <div class="col-md-4" data-nk-item>
        <a class="card h-100 border-0 shadow-sm text-decoration-none text-body" href="/truck">
          <div class="position-relative" style="aspect-ratio:16/10;overflow:hidden;">
            <img class="w-100 h-100" style="object-fit:cover;" data-nk-src="image_url" src="/media/generated/food-taco-truck.webp" alt=""/>
            <span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">Open</span>
          </div>
          <div class="card-body">
            <h5 class="fw-bold mb-1" data-nk-field="name">Tacos Borrachos</h5>
            <div class="small mb-2" style="color:var(--nk-text-muted);" data-nk-field="cuisine">Mexican · Street food</div>
            <p class="card-text small" style="color:var(--nk-text-muted);" data-nk-field="tagline">Slow-braised meats, fresh tortillas, smoky salsas.</p>
            <div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="current_address"> Pike Place Market · 1:00-7:00 PM</span></div>
          </div>
        </a>
      </div>
      <div class="col-md-4"><a class="card h-100 border-0 shadow-sm text-decoration-none text-body" href="/truck"><div class="position-relative" style="aspect-ratio:16/10;overflow:hidden;"><img class="w-100 h-100" style="object-fit:cover;" src="/media/generated/food-green-grain-bowl.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">Open</span></div><div class="card-body"><h5 class="fw-bold mb-1">Buddha Belly</h5><div class="small mb-2" style="color:var(--nk-text-muted);">Thai · Vegetarian</div><p class="card-text small" style="color:var(--nk-text-muted);">Pad thai, green curry, homemade spring rolls.</p><div class="small" style="color:var(--nk-text-muted);"> South Lake Union · 11:00-2:00 PM</div></div></a></div>
      <div class="col-md-4"><a class="card h-100 border-0 shadow-sm text-decoration-none text-body" href="/truck"><div class="position-relative" style="aspect-ratio:16/10;overflow:hidden;"><img class="w-100 h-100" style="object-fit:cover;" src="/media/generated/food-loaf-board.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">Open</span></div><div class="card-body"><h5 class="fw-bold mb-1">The Grilled Cheese Gang</h5><div class="small mb-2" style="color:var(--nk-text-muted);">American · Comfort</div><p class="card-text small" style="color:var(--nk-text-muted);">Fancy grilled cheese, tomato bisque, milkshakes.</p><div class="small" style="color:var(--nk-text-muted);"> Capitol Hill · All day</div></div></a></div>
      <div class="col-md-4"><a class="card h-100 border-0 shadow-sm text-decoration-none text-body" href="/truck"><div class="position-relative" style="aspect-ratio:16/10;overflow:hidden;"><img class="w-100 h-100" style="object-fit:cover;" src="/media/generated/food-garlic-oil-pasta.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">Open</span></div><div class="card-body"><h5 class="fw-bold mb-1">Nonna's Pasta</h5><div class="small mb-2" style="color:var(--nk-text-muted);">Italian · Pasta</div><p class="card-text small" style="color:var(--nk-text-muted);">Hand-made pasta, scratch sauces, family recipes.</p><div class="small" style="color:var(--nk-text-muted);"> University District · 5-9 PM</div></div></a></div>
      <div class="col-md-4"><a class="card h-100 border-0 shadow-sm text-decoration-none text-body" href="/truck"><div class="position-relative" style="aspect-ratio:16/10;overflow:hidden;"><img class="w-100 h-100" style="object-fit:cover;" src="/media/generated/food-truck-evening-market.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">Open</span></div><div class="card-body"><h5 class="fw-bold mb-1">Kimchi Kings</h5><div class="small mb-2" style="color:var(--nk-text-muted);">Korean · BBQ</div><p class="card-text small" style="color:var(--nk-text-muted);">Bulgogi, bibimbap bowls, spicy kimchi fries.</p><div class="small" style="color:var(--nk-text-muted);"> Fremont · Lunch + dinner</div></div></a></div>
      <div class="col-md-4"><a class="card h-100 border-0 shadow-sm text-decoration-none text-body" href="/truck"><div class="position-relative" style="aspect-ratio:16/10;overflow:hidden;"><img class="w-100 h-100" style="object-fit:cover;" src="/media/generated/food-croissant-tray.webp" alt=""/><span class="position-absolute top-0 start-0 m-2 badge" style="background:var(--nk-primary);">Open</span></div><div class="card-body"><h5 class="fw-bold mb-1">Donut Dealer</h5><div class="small mb-2" style="color:var(--nk-text-muted);">Dessert · Donuts</div><p class="card-text small" style="color:var(--nk-text-muted);">Brioche donuts with seasonal glazes. Weekends only.</p><div class="small" style="color:var(--nk-text-muted);"> Ballard Sunday Market</div></div></a></div>
    </div>
  </div>
</section>`,
    },

    // ---- Trucks list ----
    {
      slug: "trucks",
      title: "All trucks",
      html: `<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">All trucks in {{config.cityName}}</h1><p style="color:var(--nk-text-muted);">Every truck on the network.</p>
<div data-nk-bind-flow-ref="list-trucks" data-nk-refresh="60000" class="row g-4 mt-3">
  <div class="col-md-6 col-lg-4" data-nk-item>
    <a class="card h-100 border-0 shadow-sm text-decoration-none text-body" href="/truck">
      <img class="card-img-top" data-nk-src="image_url" src="/media/generated/food-taco-truck.webp" alt="" style="aspect-ratio:16/10;object-fit:cover;"/>
      <div class="card-body">
        <h5 class="fw-bold" data-nk-field="name">Tacos Borrachos</h5>
        <div class="small mb-1" style="color:var(--nk-text-muted);" data-nk-field="cuisine">Mexican</div>
        <p class="small" style="color:var(--nk-text-muted);" data-nk-field="tagline">Slow-braised meats and fresh tortillas.</p>
        <div class="small"><span data-nk-field="current_address"> Pike Place</span></div>
      </div>
    </a>
  </div>
</div>
</div></section>`,
    },

    // ---- Deals ----
    {
      slug: "deals",
      title: "Deals",
      html: `<section class="py-5"><div class="container" style="max-width:860px;"><h1 class="display-5 fw-bold">Today's deals</h1><p style="color:var(--nk-text-muted);">Fresh coupons from trucks around town.</p>
<div data-nk-bind-flow-ref="list-public-coupons" data-nk-refresh="120000" class="row g-3 mt-3">
  <div class="col-md-6" data-nk-item><div class="card border-0 shadow-sm h-100"><div class="card-body text-center"><div class="display-4"></div><h5 class="fw-bold mt-2" data-nk-field="discount_text">$2 off any taco plate</h5><code class="p-2 rounded d-inline-block mt-2" style="background:var(--nk-surface-2);" data-nk-field="code">TACO2</code><div class="small mt-2" style="color:var(--nk-text-muted);">Show this code to the truck</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm h-100"><div class="card-body text-center"><div class="display-4"></div><h5 class="fw-bold mt-2">Buy one, get one grilled cheese</h5><code class="p-2 rounded d-inline-block mt-2" style="background:var(--nk-surface-2);">MELT-BOGO</code><div class="small mt-2" style="color:var(--nk-text-muted);">Valid weekdays</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm h-100"><div class="card-body text-center"><div class="display-4"></div><h5 class="fw-bold mt-2">10% off your first order</h5><code class="p-2 rounded d-inline-block mt-2" style="background:var(--nk-surface-2);">NEW10</code><div class="small mt-2" style="color:var(--nk-text-muted);">Any truck, one-time use</div></div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm h-100"><div class="card-body text-center"><div class="display-4"></div><h5 class="fw-bold mt-2">Free donut with coffee</h5><code class="p-2 rounded d-inline-block mt-2" style="background:var(--nk-surface-2);">DONUTAM</code><div class="small mt-2" style="color:var(--nk-text-muted);">Before 10 AM</div></div></div></div>
</div>
</div></section>`,
    },

    // ---- Login ----
    {
      slug: "login",
      title: "Log in",
      html: `<section class="py-5"><div class="container" style="max-width:440px;"><div class="text-center"><h1 class="display-5 fw-bold">Welcome back</h1><p style="color:var(--nk-text-muted);">Log in to save trucks, leave reviews and manage your truck.</p></div>
<form data-nk-form="" data-nk-flow-ref="login" class="card p-4 mt-4 shadow-sm"><div class="mb-3"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="mb-3"><label class="form-label">Password</label><input name="password" type="password" class="form-control" required/></div><button class="btn btn-primary btn-lg w-100" type="submit">Log in</button><div data-nk-error class="text-danger small mt-2"></div></form>
<p class="small text-center mt-3" style="color:var(--nk-text-muted);">New here? <a href="/register">Create an account</a> · Food truck owner? <a href="/register-truck">List your truck</a></p>
</div></section>`,
    },

    // ---- Register customer ----
    {
      slug: "register",
      title: "Sign up",
      html: `<section class="py-5"><div class="container" style="max-width:440px;"><div class="text-center"><h1 class="display-5 fw-bold">Create an account</h1><p style="color:var(--nk-text-muted);">Save favorites, leave reviews, get deals.</p></div>
<form data-nk-form="" data-nk-flow-ref="register" class="card p-4 mt-4 shadow-sm"><input type="hidden" name="role" value="customer"/><div class="mb-3"><label class="form-label">Your name</label><input name="name" class="form-control" required/></div><div class="mb-3"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="mb-3"><label class="form-label">Password</label><input name="password" type="password" class="form-control" minlength="8" required/></div><button class="btn btn-primary btn-lg w-100" type="submit">Create account</button><div data-nk-error class="text-danger small mt-2"></div></form>
<p class="small text-center mt-3" style="color:var(--nk-text-muted);">Already have one? <a href="/login">Log in</a></p>
</div></section>`,
    },

    // ---- Register truck (owner signup) ----
    {
      slug: "register-truck",
      title: "List your truck",
      html: `<section class="py-5" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;"><div class="container text-center"><h1 class="display-4 fw-bold">List your food truck</h1><p class="lead" style="color:rgba(255,255,255,0.5);">Reach hungry customers in {{config.cityName}}. Free to sign up.</p></div></section>
<section class="py-5"><div class="container" style="max-width:720px;"><form data-nk-form="" data-nk-flow-ref="register-truck" class="card p-4 shadow-sm">
<h3 class="fw-bold mb-3">About you</h3>
<div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-12"><label class="form-label">Password</label><input name="password" type="password" class="form-control" minlength="8" required/></div></div>
<h3 class="fw-bold mt-5 mb-3">Your truck</h3>
<div class="row g-3"><div class="col-md-8"><label class="form-label">Truck name</label><input name="truck_name" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Cuisine</label><input name="cuisine" class="form-control" placeholder="Mexican, Thai..."/></div><div class="col-12"><label class="form-label">One-line tagline</label><input name="tagline" class="form-control" placeholder="Slow-braised meats and smoky salsas"/></div><div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="3"></textarea></div><div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control"/></div><div class="col-md-6"><label class="form-label">Image URL</label><input name="image_url" type="url" class="form-control"/></div><div class="col-md-6"><label class="form-label">Current latitude</label><input name="lat" type="number" step="0.000001" class="form-control" value="{{config.defaultLat}}"/></div><div class="col-md-6"><label class="form-label">Current longitude</label><input name="lng" type="number" step="0.000001" class="form-control" value="{{config.defaultLng}}"/></div><div class="col-12"><label class="form-label">Current address</label><input name="current_address" class="form-control" placeholder="Pike Place Market"/></div><div class="col-12"><label class="form-label">Hours</label><input name="hours" class="form-control" placeholder="Mon-Fri 11am-7pm"/></div></div>
<button class="btn btn-primary btn-lg w-100 mt-4" type="submit">Create my truck account</button>
<div data-nk-error class="text-danger small mt-2"></div>
</form></div></section>`,
    },

    // ---- Owner dashboard ----
    {
      slug: "my-truck",
      title: "My truck",
      html: `<!--nk:require-auth-->
<header class="py-3" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;">
  <div class="container d-flex justify-content-between align-items-center">
    <a href="/" class="text-decoration-none" style="color:#fff;"><span style="font-size:24px;"></span> <strong>{{config.brandName}} · Owner</strong></a>
    <nav class="d-flex gap-3 small">
      <a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-truck">Dashboard</a>
      <a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-menu">Menu</a>
      <a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-coupons">Coupons</a>
      <a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="#" data-nk-logout-ref="logout" data-nk-redirect="/">Log out</a>
    </nav>
  </div>
</header>
<section class="py-5"><div class="container" style="max-width:860px;"><h1 class="display-5 fw-bold">Manage your truck</h1><p style="color:var(--nk-text-muted);">Update your location, hours and details any time. Customers see changes immediately.</p>
<form data-nk-form="" data-nk-flow-ref="update-my-truck" class="card p-4 mt-4 shadow-sm"><div class="row g-3">
<div class="col-12"><label class="form-label">Tagline</label><input name="tagline" class="form-control"/></div>
<div class="col-md-6"><label class="form-label">Cuisine</label><input name="cuisine" class="form-control"/></div>
<div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control"/></div>
<div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="3"></textarea></div>
<div class="col-12"><label class="form-label">Image URL</label><input name="image_url" type="url" class="form-control"/></div>
<div class="col-md-6"><label class="form-label">Current latitude</label><input name="lat" type="number" step="0.000001" class="form-control"/></div>
<div class="col-md-6"><label class="form-label">Current longitude</label><input name="lng" type="number" step="0.000001" class="form-control"/></div>
<div class="col-12"><label class="form-label">Current address</label><input name="current_address" class="form-control"/></div>
<div class="col-md-8"><label class="form-label">Hours</label><input name="hours" class="form-control"/></div>
<div class="col-md-4 d-flex align-items-end"><div class="form-check"><input class="form-check-input" type="checkbox" name="active" value="true" checked/><label class="form-check-label">Open today</label></div></div>
<div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Save changes</button></div>
<div data-nk-error class="col-12 text-danger small mt-2"></div>
</div></form>
</div></section>`,
    },

    // ---- Owner menu management ----
    {
      slug: "my-menu",
      title: "My menu",
      html: `<!--nk:require-auth-->
<header class="py-3" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;">
  <div class="container d-flex justify-content-between align-items-center">
    <a href="/" class="text-decoration-none" style="color:#fff;"><span style="font-size:24px;"></span> <strong>{{config.brandName}} · Owner</strong></a>
    <nav class="d-flex gap-3 small"><a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-truck">Dashboard</a><a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-menu">Menu</a><a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-coupons">Coupons</a><a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="#" data-nk-logout-ref="logout" data-nk-redirect="/">Log out</a></nav>
  </div>
</header>
<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="display-5 fw-bold">My menu</h1>
<form data-nk-form="" data-nk-flow-ref="add-menu-item" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-5"><input name="name" class="form-control" placeholder="Item name" required/></div><div class="col-md-3"><input name="category" class="form-control" placeholder="Category"/></div><div class="col-md-2"><input name="price" type="number" step="0.01" class="form-control" placeholder="$" required/></div><div class="col-md-2"><button class="btn btn-primary w-100" type="submit">Add</button></div><div class="col-12"><input name="description" class="form-control" placeholder="Short description"/></div><div class="col-12"><input name="image_url" type="url" class="form-control" placeholder="Image URL (optional)"/></div></div></form>
<div data-nk-bind-flow-ref="list-menu" class="mt-4">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item><img class="rounded" style="width:64px;height:64px;object-fit:cover;" data-nk-src="image_url" src="/media/generated/thumbs/food-al-pastor-tacos.webp" alt=""/><div class="flex-grow-1"><div class="fw-bold" data-nk-field="name">Al pastor tacos</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="description">Pineapple, cilantro, onion, lime.</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="category">Tacos</div></div><div class="fw-bold fs-5">$<span data-nk-field="price">12</span></div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><img class="rounded" style="width:64px;height:64px;object-fit:cover;" src="/media/generated/thumbs/food-birria-quesadilla.webp" alt=""/><div class="flex-grow-1"><div class="fw-bold">Birria quesadilla</div><div class="small" style="color:var(--nk-text-muted);">Slow-cooked beef, melted Oaxaca cheese, consommé for dipping.</div><div class="small" style="color:var(--nk-text-muted);">Specials</div></div><div class="fw-bold fs-5">$14</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><img class="rounded" style="width:64px;height:64px;object-fit:cover;" src="/media/generated/thumbs/food-horchata.webp" alt=""/><div class="flex-grow-1"><div class="fw-bold">Horchata</div><div class="small" style="color:var(--nk-text-muted);">House-made, not too sweet.</div><div class="small" style="color:var(--nk-text-muted);">Drinks</div></div><div class="fw-bold fs-5">$4</div></div>
</div>
</div></section>`,
    },

    // ---- Owner coupon management ----
    {
      slug: "my-coupons",
      title: "My coupons",
      html: `<!--nk:require-auth-->
<header class="py-3" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;">
  <div class="container d-flex justify-content-between align-items-center">
    <a href="/" class="text-decoration-none" style="color:#fff;"><span style="font-size:24px;"></span> <strong>{{config.brandName}} · Owner</strong></a>
    <nav class="d-flex gap-3 small"><a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-truck">Dashboard</a><a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-menu">Menu</a><a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="/my-coupons">Coupons</a><a class="text-decoration-none" style="color:rgba(255,255,255,0.5);" href="#" data-nk-logout-ref="logout" data-nk-redirect="/">Log out</a></nav>
  </div>
</header>
<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="display-5 fw-bold">Coupons</h1><p style="color:var(--nk-text-muted);">Drive traffic with a timed promo. Coupons are public on the deals page.</p>
<form data-nk-form="" data-nk-flow-ref="add-coupon" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-4"><input name="code" class="form-control text-uppercase" placeholder="TACO2" required/></div><div class="col-md-6"><input name="discount_text" class="form-control" placeholder="$2 off any taco plate" required/></div><div class="col-md-2"><button class="btn btn-primary w-100" type="submit">Publish</button></div></div></form>
<div data-nk-bind-flow-ref="list-my-coupons" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body d-flex justify-content-between align-items-center"><div><code class="p-2 rounded" style="background:var(--nk-surface-2);" data-nk-field="code">TACO2</code><div class="small mt-1" style="color:var(--nk-text-muted);" data-nk-field="discount_text">$2 off any taco plate</div></div><span class="badge" style="background:var(--nk-primary);">active</span></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center"><div><code class="p-2 rounded" style="background:var(--nk-surface-2);">MELT-BOGO</code><div class="small mt-1" style="color:var(--nk-text-muted);">Buy one, get one grilled cheese (weekdays)</div></div><span class="badge" style="background:var(--nk-primary);">active</span></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body d-flex justify-content-between align-items-center"><div><code class="p-2 rounded" style="background:var(--nk-surface-2);">DONUT-AM</code><div class="small mt-1" style="color:var(--nk-text-muted);">Free donut with coffee before 10am</div></div><span class="badge" style="background:color-mix(in srgb, var(--nk-text) 50%, var(--nk-bg));">expired</span></div></div>
</div>
</div></section>`,
    },

    // ---- Public truck detail (simple version) ----
    {
      slug: "truck",
      title: "Truck",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container">
  <a href="/" class="small text-decoration-none" style="color:var(--nk-text-muted);">← Back to all trucks</a>
  <div class="row g-4 mt-2 align-items-start">
    <div class="col-lg-7"><img class="img-fluid rounded shadow-sm" src="/media/generated/food-taco-truck.webp" alt=""/></div>
    <div class="col-lg-5"><span class="badge" style="background:var(--nk-primary);">Open now</span><h1 class="display-5 fw-bold mt-2">Tacos Borrachos</h1><p class="lead" style="color:var(--nk-text-muted);">Slow-braised meats, fresh tortillas, smoky salsas.</p>
    <div class="mt-3"><span class="badge me-1" style="background:color-mix(in srgb, var(--nk-text) 50%, var(--nk-bg));">Mexican</span><span class="badge me-1" style="background:color-mix(in srgb, var(--nk-text) 50%, var(--nk-bg));">Tacos</span><span class="badge" style="background:color-mix(in srgb, var(--nk-text) 50%, var(--nk-bg));">Street food</span></div>
    <ul class="list-unstyled mt-4" style="color:var(--nk-text-muted);"><li> Pike Place Market, Seattle</li><li> (206) 555-0100</li><li> 1:00 PM – 7:00 PM</li></ul></div>
  </div>
</div></section>

<section class="py-5"><div class="container"><h2 class="fw-bold">Menu</h2>
<div class="row g-3 mt-3">
  <div class="col-md-6"><div class="d-flex justify-content-between align-items-start py-3 border-bottom"><div><div class="fw-bold">Al pastor tacos</div><div class="small" style="color:var(--nk-text-muted);">Pineapple, cilantro, onion, lime.</div></div><div class="fw-bold ms-3">$12</div></div></div>
  <div class="col-md-6"><div class="d-flex justify-content-between align-items-start py-3 border-bottom"><div><div class="fw-bold">Birria quesadilla</div><div class="small" style="color:var(--nk-text-muted);">Slow-cooked beef, melted cheese, dipping consommé.</div></div><div class="fw-bold ms-3">$14</div></div></div>
  <div class="col-md-6"><div class="d-flex justify-content-between align-items-start py-3 border-bottom"><div><div class="fw-bold">Carnitas burrito</div><div class="small" style="color:var(--nk-text-muted);">Beans, rice, guacamole, hot sauce.</div></div><div class="fw-bold ms-3">$13</div></div></div>
  <div class="col-md-6"><div class="d-flex justify-content-between align-items-start py-3 border-bottom"><div><div class="fw-bold">Horchata</div><div class="small" style="color:var(--nk-text-muted);">House-made, not too sweet.</div></div><div class="fw-bold ms-3">$4</div></div></div>
</div>
</div></section>

<section class="py-5" style="background:var(--nk-surface-2);"><div class="container"><h2 class="fw-bold">Current deals</h2>
<div class="row g-3 mt-3">
  <div class="col-md-6"><div class="card border-0 shadow-sm p-3"><div class="fw-bold fs-5">$2 off any taco plate</div><code class="p-2 rounded mt-2 d-inline-block" style="background:var(--nk-surface);">TACO2</code></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm p-3"><div class="fw-bold fs-5">Free horchata with burrito</div><code class="p-2 rounded mt-2 d-inline-block" style="background:var(--nk-surface);">BURRHORCH</code></div></div>
</div>
</div></section>

<section class="py-5"><div class="container" style="max-width:720px;"><h2 class="fw-bold">Reviews</h2>
<div data-nk-bind-flow-ref="recent-reviews" class="mt-3">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body"><div class="text-warning">★★★★★ <span class="small" style="color:var(--nk-text-muted);" data-nk-field="rating">5</span></div><p class="mb-1" data-nk-field="comment">"Best tacos in Seattle, hands down. The al pastor is unreal."</p><div class="small" style="color:var(--nk-text-muted);">— <span data-nk-field="reviewer_name">Alex K</span></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body"><div class="text-warning">★★★★★</div><p class="mb-1">"Fast, friendly, and the birria is a revelation. Line moves quick."</p><div class="small" style="color:var(--nk-text-muted);">— Jordan M</div></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body"><div class="text-warning">★★★★☆</div><p class="mb-1">"Solid tacos, great vibes. Would love more veggie options."</p><div class="small" style="color:var(--nk-text-muted);">— Taylor P</div></div></div>
</div>

<form data-nk-form="" data-nk-flow-ref="submit-review" class="card p-4 mt-4 shadow-sm"><h4 class="fw-bold">Leave a review</h4><input type="hidden" name="truck_id" value=""/><div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="reviewer_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Rating (1-5)</label><input name="rating" type="number" min="1" max="5" class="form-control" value="5" required/></div><div class="col-12"><label class="form-label">Comment</label><textarea name="comment" class="form-control" rows="3" required></textarea></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Post review</button></div><div data-nk-error class="col-12 text-danger small"></div></div></form>
</div></section>`,
    },
  ],
};
