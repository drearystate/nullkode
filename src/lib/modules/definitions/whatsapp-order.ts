import type { ModuleDefinition } from "../types";

export const whatsappOrder: ModuleDefinition = {
  id: "whatsapp-order",
  name: "WhatsApp Order",
  tagline: "Order via WhatsApp with a pre-filled cart",
  description:
    "Let customers build a small cart on a public page, then 'order via WhatsApp' opens a chat with your business with the whole order pre-typed. Orders are also logged server-side so you have a record beyond the WhatsApp thread.",
  icon: "",
  color: "from-emerald-400 to-green-700",
  category: "commerce",
  version: "1.0.0",
  worksWith: ["menu", "shop"],
  config: [
    { key: "businessName", label: "Business name", type: "text", default: "Our shop", required: true },
    { key: "whatsappNumber", label: "WhatsApp number (digits only, with country code)", type: "text", placeholder: "15551234567", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "name", type: "text" },
        { name: "price", type: "float" },
        { name: "image_url", type: "text" },
        { name: "description", type: "text" },
      ],
      seed: [
        { name: "Margherita pizza", price: 12, image_url: "https://picsum.photos/seed/pizza/300/200", description: "Tomato, mozzarella, basil" },
        { name: "Pepperoni pizza", price: 14, image_url: "https://picsum.photos/seed/pep/300/200", description: "Pepperoni, mozzarella, oregano" },
        { name: "Garden salad", price: 8, image_url: "https://picsum.photos/seed/salad/300/200", description: "Mixed greens, vinaigrette" },
      ],
    },
    {
      name: "orders",
      fields: [
        { name: "customer_name", type: "text" },
        { name: "phone", type: "text" },
        { name: "items_json", type: "text" },
        { name: "total", type: "float" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "menu",
      name: "List menu items",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "name asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "place-order",
      name: "Log the order (before WhatsApp redirect)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "orders",
            values: {
              customer_name: "{{trigger.customer_name}}",
              phone: "{{trigger.phone}}",
              items_json: "{{trigger.items_json}}",
              total: "{{trigger.total}}",
              status: "sent-to-whatsapp",
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
      slug: "orders",
      name: "Recent orders (admin)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "orders", orderBy: "created_at desc", limit: 100, output: "rows" } },
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
      slug: "order",
      title: "Order online",
      isHome: true,
      html: `<header class="py-3" style="background:#075e54;color:#fff;"><div class="container d-flex justify-content-between align-items-center"><span class="fw-bold">{{config.businessName}}</span><span class="small">Order via WhatsApp</span></div></header>
<section class="py-4"><div class="container" style="max-width:880px;">
<div class="row g-4">
  <div class="col-md-7">
    <h2 class="fw-bold">Menu</h2>
    <div data-nk-bind-flow-ref="menu" class="row g-3 mt-1" id="nk-menu">
      <div class="col-md-6" data-nk-item data-nk-row-id="{id}"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" data-nk-src="image_url" src="https://picsum.photos/seed/x/300/200" style="aspect-ratio:3/2;object-fit:cover;" alt=""/><div class="card-body"><h6 class="fw-bold" data-nk-field="name">Item</h6><div class="small" style="color:var(--nk-text-muted);" data-nk-field="description">—</div><div class="d-flex justify-content-between align-items-center mt-2"><div class="fw-bold">$<span data-nk-field="price">0</span></div><button class="btn btn-sm btn-success nk-add" type="button">+ Add</button></div></div></div></div>
    </div>
  </div>
  <div class="col-md-5">
    <div class="card shadow-sm sticky-top" style="top:1rem;">
      <div class="card-body">
        <h5 class="fw-bold"> Your order</h5>
        <ul class="list-unstyled small" id="nk-cart" aria-live="polite"><li style="color:var(--nk-text-muted);">Nothing in your cart yet.</li></ul>
        <div class="d-flex justify-content-between fw-bold border-top pt-2"><span>Total</span><span>$<span id="nk-total">0</span></span></div>
        <input id="nk-name" class="form-control mt-3" placeholder="Your name" aria-label="Your name" autocomplete="name"/>
        <input id="nk-phone" class="form-control mt-2" placeholder="Phone" aria-label="Phone" autocomplete="tel"/>
        <button class="btn btn-success btn-lg w-100 mt-3" id="nk-send" type="button">Order via WhatsApp →</button>
      </div>
    </div>
  </div>
</div>
</div></section>
<script>(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  var cart = {};
  function refresh(){
    var ul = document.getElementById('nk-cart'); var total = 0;
    var keys = Object.keys(cart);
    ul.innerHTML = keys.length ? keys.map(function(k){
      var it = cart[k]; total += it.qty * it.price;
      return '<li class="d-flex justify-content-between py-1"><span>'+esc(it.qty)+'× '+esc(it.name)+'</span><span>$'+(it.qty*it.price).toFixed(2)+'</span></li>';
    }).join('') : '<li style="color:var(--nk-text-muted);">Nothing in your cart yet.</li>';
    document.getElementById('nk-total').textContent = total.toFixed(2);
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('.nk-add'); if(!b) return;
    var card = b.closest('[data-nk-item]'); if(!card) return;
    var id = card.getAttribute('data-nk-row-id') || ('x' + Math.random());
    var name = card.querySelector('[data-nk-field="name"]').textContent.trim();
    var price = parseFloat(card.querySelector('[data-nk-field="price"]').textContent.trim()) || 0;
    cart[id] = cart[id] || { name:name, price:price, qty:0 };
    cart[id].qty += 1;
    refresh();
  });
  document.getElementById('nk-send').addEventListener('click', function(){
    var keys = Object.keys(cart); if(!keys.length){ (window.nkToast||alert)('Add something to your order first.'); return; }
    var total = 0; var lines = keys.map(function(k){ var it = cart[k]; total += it.qty * it.price; return '• '+it.qty+'× '+it.name+' — $'+(it.qty*it.price).toFixed(2); });
    var name = document.getElementById('nk-name').value || 'Customer';
    var phone = document.getElementById('nk-phone').value || '';
    var msg = encodeURIComponent('Hi! New order from '+name)+'%0A%0A' + encodeURIComponent(lines.join('\\n')) + '%0A%0ATotal: $'+total.toFixed(2)+'%0APhone: '+encodeURIComponent(phone);
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['place-order']||'place-order'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ customer_name:name, phone:phone, items_json: JSON.stringify(cart), total: total }) }).finally(function(){
      location.href = 'https://wa.me/{{config.whatsappNumber}}?text=' + msg;
    });
  });
})();</script>`,
    },
    {
      slug: "wa-orders",
      title: "Orders",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">WhatsApp orders</h1>
<div data-nk-bind-flow-ref="orders" data-nk-refresh="15000" class="mt-3">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body"><div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold" data-nk-field="customer_name">Customer</div><div class="small font-monospace" style="color:var(--nk-text-muted);" data-nk-field="phone">phone</div></div><div class="fs-5 fw-bold">$<span data-nk-field="total">0</span></div></div><pre class="small mt-2 mb-0 p-2 rounded" style="background:var(--nk-surface-2);max-height:150px;overflow:auto;" data-nk-field="items_json">{}</pre></div></div>
</div>
</div></section>`,
    },
  ],
};
