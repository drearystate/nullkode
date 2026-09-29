import type { ModuleDefinition } from "../types";

export const shop: ModuleDefinition = {
  id: "shop",
  name: "Simple Shop",
  tagline: "Product catalog with a real cart",
  description:
    "Product listing with a client-side cart. Visitors add items to their basket, review the cart, and submit an order that captures their details, the full cart contents, and the computed total. Orders land in an admin table you can browse.",
  icon: "",
  color: "from-emerald-500 to-teal-600",
  category: "commerce",
  version: "1.1.0",
  config: [
    {
      key: "storeName",
      label: "Store name",
      type: "text",
      default: "My Shop",
      required: true,
    },
    {
      key: "currency",
      label: "Currency symbol",
      type: "text",
      default: "$",
    },
  ],
  tables: [
    {
      name: "products",
      fields: [
        { name: "name", type: "text" },
        { name: "description", type: "text" },
        { name: "price", type: "float" },
        { name: "image_url", type: "text" },
        { name: "in_stock", type: "bool" },
      ],
      // Believable starter products so a new shop looks real; owners edit or
      // remove them from the shop's admin page.
      seed: [
        { name: "Everyday Canvas Tote", description: "Sturdy organic cotton with an inside pocket. Fits a laptop.", price: 24, image_url: "", in_stock: true },
        { name: "Stoneware Coffee Mug", description: "Hand-glazed, 350 ml, dishwasher safe.", price: 18, image_url: "", in_stock: true },
        { name: "Gift Card", description: "Delivered by email. Never expires.", price: 50, image_url: "", in_stock: true },
      ],
    },
    {
      name: "orders",
      fields: [
        { name: "customer_name", type: "text" },
        { name: "email", type: "text" },
        { name: "phone", type: "text" },
        { name: "items", type: "text" },
        { name: "total", type: "float" },
        { name: "notes", type: "text" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "list-products",
      name: "List products",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "products",
            where: { in_stock: "true" },
            orderBy: "created_at desc",
            limit: 100,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add-product",
      name: "Add product",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "products",
            values: {
              name: "{{trigger.name}}",
              description: "{{trigger.description}}",
              price: "{{trigger.price}}",
              image_url: "{{trigger.image_url}}",
              in_stock: "true",
            },
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: '{"ok":true,"message":"Product added."}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "place-order",
      name: "Place order",
      httpMethod: "POST",
      purpose:
        "Accepts a cart JSON from the client (pre-built by the runtime cart helper) plus customer details, and stores the full order for later fulfilment.",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "orders",
            values: {
              customer_name: "{{trigger.customer_name}}",
              email: "{{trigger.email}}",
              phone: "{{trigger.phone}}",
              items: "{{trigger.items}}",
              total: "{{trigger.total}}",
              notes: "{{trigger.notes}}",
              status: "new",
            },
          },
        },
        {
          id: "n3",
          type: "response",
          data: {
            status: 200,
            body: '{"ok":true,"message":"Thanks! Your order is in.","clearCart":true}',
          },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list-orders",
      name: "List orders",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "orders",
            orderBy: "created_at desc",
            limit: 200,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "shop",
      title: "Shop",
      html: `<section class="nk-hero"><div class="container">
  <div class="row align-items-center g-5">
    <div class="col-lg-7">
      <span class="nk-eyebrow">THE SHOP</span>
      <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">{{config.storeName}}</h1>
      <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:540px;">A curated collection of products. Tap to add to your cart, review below, and check out in one go.</p>
      <div class="d-flex flex-wrap gap-3">
        <a href="#catalog" class="btn btn-primary btn-lg px-4">Shop the catalog</a>
        <a href="#cart" class="btn btn-outline-primary btn-lg px-4">View cart (<span data-nk-cart-count>0</span>)</a>
      </div>
    </div>
    <div class="col-lg-5">
      <div class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
        <div class="nk-eyebrow mb-2">YOUR CART</div>
        <h3 class="h4 fw-bold mb-2"><span data-nk-cart-count>0</span> items</h3>
        <p class="small mb-0" style="color:var(--nk-text-muted);">Total: {{config.currency}}<span data-nk-cart-total>0.00</span></p>
      </div>
    </div>
  </div>
</div></section>

<section class="py-5 py-lg-6" id="catalog"><div class="container">
  <div class="nk-section-title">
    <span class="nk-eyebrow">CATALOG</span>
    <h2 class="display-5 fw-bold mb-2">Featured products</h2>
    <p class="lead">Everything currently in stock.</p>
  </div>
  <div data-nk-bind-flow-ref="list-products" class="row g-4">
    <div class="col-md-6 col-lg-4" data-nk-item>
      <div class="nk-feature h-100 d-flex flex-column" style="padding:0;overflow:hidden;">
        <div data-nk-src="image_url" style="aspect-ratio:4/3;background:linear-gradient(135deg, var(--nk-primary), var(--nk-accent));"></div>
        <div class="p-4 d-flex flex-column flex-grow-1">
          <h3 class="h5 fw-bold mb-2" data-nk-field="name">Product name</h3>
          <p class="mb-3 flex-grow-1" style="color:var(--nk-text-muted);font-size:.92rem;" data-nk-field="description">Description…</p>
          <div class="d-flex align-items-center justify-content-between">
            <div class="h4 fw-bold mb-0" style="color:var(--nk-primary);">{{config.currency}}<span data-nk-field="price">0.00</span></div>
            <button type="button" class="btn btn-primary btn-sm" data-nk-cart-add
                    data-nk-attr-data-nk-id="{id}"
                    data-nk-attr-data-nk-name="{name}"
                    data-nk-attr-data-nk-price="{price}"
                    data-nk-attr-data-nk-image="{image_url}">
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div></section>

<section class="py-5 py-lg-6" id="cart" style="background:var(--nk-surface-2);"><div class="container" style="max-width:820px;">
  <div class="nk-section-title">
    <span class="nk-eyebrow">YOUR CART</span>
    <h2 class="display-5 fw-bold mb-2">Review &amp; check out</h2>
  </div>
  <div data-nk-cart-list data-nk-empty='<div class="card p-4 text-center" style="color:var(--nk-text-muted);">Your cart is empty — add some products above.</div>'>
    <div data-nk-item class="card mb-2">
      <div class="card-body d-flex align-items-center gap-3">
        <div class="flex-grow-1">
          <div class="fw-bold" data-nk-field="name">Item name</div>
          <div class="small" style="color:var(--nk-text-muted);">Qty <span data-nk-field="quantity">1</span></div>
        </div>
        <div class="fw-bold">{{config.currency}}<span data-nk-field="price">0.00</span></div>
        <button type="button" class="btn btn-sm btn-outline-danger" data-nk-attr-data-nk-cart-remove="{product_id}">Remove</button>
      </div>
    </div>
  </div>

  <div class="d-flex justify-content-between align-items-center py-3 mt-3 border-top border-bottom">
    <div class="fw-bold">Total</div>
    <div class="h4 fw-bold mb-0">{{config.currency}}<span data-nk-cart-total>0.00</span></div>
  </div>

  <form data-nk-form="" data-nk-flow-ref="place-order" data-nk-cart-checkout class="card p-4 mt-4 shadow-sm">
    <h4 class="fw-bold mb-3">Your details</h4>
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Your name</label><input name="customer_name" class="form-control" required/></div>
      <div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div>
      <div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control"/></div>
      <div class="col-12"><label class="form-label">Notes (optional)</label><textarea name="notes" class="form-control" rows="3"></textarea></div>
      <input type="hidden" name="items" value="[]"/>
      <input type="hidden" name="total" value="0"/>
      <div class="col-12 d-flex justify-content-between align-items-center">
        <button type="button" class="btn btn-link" style="color:var(--nk-text-muted);" data-nk-cart-clear>Clear cart</button>
        <button type="submit" class="btn btn-primary btn-lg px-4">Place order</button>
      </div>
    </div>
    <div data-nk-error class="text-danger small mt-3"></div>
  </form>
</div></section>

<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">{{config.storeName}}</div>
        <div class="small" style="color:var(--nk-text-muted);">Thanks for shopping with us.</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="small me-3" data-nk-attr-href="./{{page.products-admin}}" href="#" style="color:var(--nk-text-muted);">Manage products</a>
        <a class="small" data-nk-attr-href="./{{page.orders}}" href="#" style="color:var(--nk-text-muted);">View orders</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "products-admin",
      title: "Products",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);"><div class="container">
  <span class="nk-eyebrow">ADMIN</span>
  <h1 class="display-5 fw-bold mb-2">Products</h1>
  <p class="lead mb-0">Add the items you want to sell.</p>
  <a class="small mt-2 d-inline-block" data-nk-attr-href="./{{page.shop}}" href="#">← Back to shop</a>
</div></section>
<section class="py-5"><div class="container" style="max-width:720px;">
  <h3 class="fw-bold mb-3">Add a new product</h3>
  <form data-nk-form="" data-nk-flow-ref="add-product" class="card p-4 shadow-sm">
    <div class="row g-3">
      <div class="col-md-8"><label class="form-label">Name</label><input name="name" class="form-control" required/></div>
      <div class="col-md-4"><label class="form-label">Price</label><input name="price" type="number" step="0.01" class="form-control" required/></div>
      <div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="3"></textarea></div>
      <div class="col-12"><label class="form-label">Image URL</label><input name="image_url" class="form-control"/></div>
      <div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add product</button></div>
    </div>
    <div data-nk-error class="text-danger small mt-3"></div>
  </form>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:720px;">
  <h3 class="fw-bold mb-3">Current products</h3>
  <div data-nk-bind-flow-ref="list-products">
    <div data-nk-item class="card mb-2">
      <div class="card-body d-flex align-items-center gap-3">
        <div class="flex-grow-1">
          <div class="fw-bold" data-nk-field="name">Product</div>
          <div class="small" style="color:var(--nk-text-muted);" data-nk-field="description">Description…</div>
        </div>
        <div class="fw-bold">{{config.currency}}<span data-nk-field="price">0</span></div>
      </div>
    </div>
  </div>
</div></section>`,
    },
    {
      slug: "orders",
      title: "Orders",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);"><div class="container">
  <span class="nk-eyebrow">ADMIN</span>
  <h1 class="display-5 fw-bold mb-2">Orders</h1>
  <p class="lead mb-0">Every order placed on {{config.storeName}}, newest first.</p>
  <a class="small mt-2 d-inline-block" data-nk-attr-href="./{{page.shop}}" href="#">← Back to shop</a>
</div></section>
<section class="py-5"><div class="container">
  <div data-nk-bind-flow-ref="list-orders">
    <div data-nk-item class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold" data-nk-field="customer_name">Customer</div>
            <div class="small" style="color:var(--nk-text-muted);" data-nk-field="email">email</div>
          </div>
          <div class="text-end">
            <div class="fw-bold">{{config.currency}}<span data-nk-field="total">0</span></div>
            <span class="badge" style="background:var(--nk-primary);" data-nk-field="status">new</span>
          </div>
        </div>
        <div class="mt-3 small font-monospace" style="color:var(--nk-text-muted);word-break:break-all;" data-nk-field="items">[]</div>
        <div class="mt-2 small" data-nk-field="notes"></div>
      </div>
    </div>
  </div>
</div></section>`,
    },
  ],
};
