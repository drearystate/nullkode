import type { ModuleDefinition } from "../types";

export const menu: ModuleDefinition = {
  id: "menu",
  name: "Restaurant Menu",
  tagline: "Show your menu with categories",
  description:
    "A restaurant or cafe menu grouped by category (Starters, Mains, Drinks) with item name, description and price. Admin page lets you add new items from your phone.",
  icon: "",
  color: "from-red-500 to-rose-600",
  category: "commerce",
  version: "1.0.0",
  provides: ["menu"],
  config: [
    { key: "restaurantName", label: "Restaurant name", type: "text", default: "Our Kitchen", required: true },
    { key: "currency", label: "Currency", type: "text", default: "$" },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "name", type: "text" },
        { name: "description", type: "text" },
        { name: "price", type: "float" },
        { name: "category", type: "text" },
        { name: "featured", type: "bool" },
      ],
      seed: [
        { name: "House salad", description: "Mixed greens, olive oil, lemon", price: 9.5, category: "Starters", featured: false },
        { name: "Daily pasta", description: "Ask your server for today's sauce", price: 16, category: "Mains", featured: true },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Menu feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "category asc, name asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add menu item",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          name: "{{trigger.name}}",
          description: "{{trigger.description}}",
          price: "{{trigger.price}}",
          category: "{{trigger.category}}",
          featured: "{{trigger.featured}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "menu",
      title: "Menu",
      html: `<section class="nk-hero">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-7">
        <span class="nk-eyebrow">THE KITCHEN</span>
        <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;font-family:var(--nk-font-display);">{{config.restaurantName}}</h1>
        <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:540px;">Seasonal ingredients, simple plates, and a few house favourites we can't take off the menu.</p>
        <div class="d-flex flex-wrap gap-3">
          <a href="#menu" class="btn btn-primary btn-lg px-4">See the menu</a>
          <a href="/{{page.menu-admin}}" class="btn btn-outline-primary btn-lg px-4">Add an item</a>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="nk-eyebrow mb-2">DAILY</div>
          <h3 class="h4 fw-bold mb-2">Fresh every morning</h3>
          <p class="small mb-0" style="color:var(--nk-text-muted);">We source from local growers and cook from scratch. The menu changes as the seasons do.</p>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6" id="menu">
  <div class="container">
    <div class="nk-section-title">
      <span class="nk-eyebrow">MENU</span>
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;font-family:var(--nk-font-display);">What's on today</h2>
      <p class="lead">Everything we're serving right now.</p>
    </div>
    <div class="row justify-content-center">
      <div class="col-lg-9 col-xl-8">
        <div class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div data-nk-bind-flow-ref="feed">
            <div class="d-flex justify-content-between align-items-start py-3" style="border-bottom:1px solid var(--nk-border);" data-nk-item>
              <div class="pe-3">
                <div class="fw-bold fs-5 mb-1" data-nk-field="name">Menu item</div>
                <div class="mb-1" style="color:var(--nk-text-muted);font-size:.92rem;" data-nk-field="description">A short description of this dish and what's in it.</div>
                <div class="small text-uppercase fw-semibold" style="color:var(--nk-primary);letter-spacing:0.12em;" data-nk-field="category">Category</div>
              </div>
              <div class="fw-bold fs-5" style="color:var(--nk-primary);">{{config.currency}}<span data-nk-field="price">0</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6">
  <div class="container">
    <div class="nk-cta-band">
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;font-family:var(--nk-font-display);">Come and eat</h2>
      <p class="lead mb-4">Walk-ins welcome. Reservations recommended on weekends.</p>
      <a href="tel:+10000000000" class="btn btn-lg px-4">Call to book</a>
    </div>
  </div>
</section>
<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">{{config.restaurantName}}</div>
        <div class="small" style="color:var(--nk-text-muted);">Cooked with care, served with a smile.</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="small" href="/{{page.menu-admin}}" style="color:var(--nk-text-muted);">Admin</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "menu-admin",
      title: "Add menu item",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-9 col-xl-8">
        <span class="nk-eyebrow">NEW ITEM</span>
        <h1 class="display-5 fw-bold mb-2" style="letter-spacing:-0.02em;">Add a menu item</h1>
        <p class="lead mb-5" style="color:var(--nk-text-muted);">Put something new on the menu at {{config.restaurantName}}.</p>
        <form data-nk-form="" data-nk-flow-ref="add" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="row g-4">
            <div class="col-md-8">
              <label class="form-label">Name</label>
              <input name="name" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-4">
              <label class="form-label">Price ({{config.currency}})</label>
              <input name="price" type="number" step="0.01" class="form-control form-control-lg"/>
            </div>
            <div class="col-md-8">
              <label class="form-label">Category</label>
              <input name="category" class="form-control form-control-lg" placeholder="Starters, Mains, Drinks..."/>
            </div>
            <div class="col-md-4 d-flex align-items-end">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" name="featured" value="true"/>
                <label class="form-check-label fw-semibold">Featured</label>
              </div>
            </div>
            <div class="col-12">
              <label class="form-label">Description</label>
              <textarea name="description" class="form-control form-control-lg" rows="4"></textarea>
            </div>
            <div class="col-12 d-flex justify-content-end gap-2">
              <a href="/{{page.menu}}" class="btn btn-outline-primary btn-lg px-4">Cancel</a>
              <button class="btn btn-primary btn-lg px-4" type="submit">Add item</button>
            </div>
          </div>
          <div data-nk-error class="text-danger small mt-3"></div>
        </form>
      </div>
    </div>
  </div>
</section>`,
    },
  ],
};
