import type { ModuleDefinition } from "../types";

export const inventory: ModuleDefinition = {
  id: "inventory",
  name: "Inventory",
  tagline: "SKUs, stock counts, low-stock alerts",
  description:
    "Track stock per SKU. Adjust quantities (receive new stock, log a sale, manual adjustment), see what's low, and download a CSV. Pairs with the shop module to keep your storefront's stock honest.",
  icon: "",
  color: "from-amber-600 to-orange-800",
  category: "commerce",
  version: "1.0.0",
  worksWith: ["shop", "marketplace"],
  config: [
    { key: "lowThreshold", label: "Low-stock threshold", type: "number", default: 5 },
  ],
  tables: [
    {
      name: "skus",
      fields: [
        { name: "sku", type: "text" },
        { name: "title", type: "text" },
        { name: "qty_on_hand", type: "int" },
        { name: "cost", type: "float" },
        { name: "location", type: "text" },
      ],
      seed: [
        { sku: "TEE-S-BLK", title: "T-shirt (Small, Black)", qty_on_hand: 42, cost: 6.5, location: "Bin A" },
        { sku: "TEE-M-BLK", title: "T-shirt (Medium, Black)", qty_on_hand: 3, cost: 6.5, location: "Bin A" },
        { sku: "MUG-WHT", title: "Ceramic mug (White)", qty_on_hand: 17, cost: 4.0, location: "Bin C" },
      ],
    },
    {
      name: "movements",
      fields: [
        { name: "sku_id", type: "text" },
        { name: "qty_change", type: "int" },
        { name: "reason", type: "text" },
        { name: "note", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List all SKUs",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "skus", orderBy: "sku asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "low-stock",
      name: "List low-stock SKUs",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "skus", where: { "qty_on_hand <=": "{{config.lowThreshold}}" }, orderBy: "qty_on_hand asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "create-sku",
      name: "Create a new SKU",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "skus",
            values: {
              sku: "{{trigger.sku}}",
              title: "{{trigger.title}}",
              qty_on_hand: "{{trigger.qty_on_hand}}",
              cost: "{{trigger.cost}}",
              location: "{{trigger.location}}",
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
      slug: "adjust",
      name: "Adjust stock (receive, sell, count)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "skus", where: { id: "{{trigger.sku_id}}" }, limit: 1, output: "s" } },
        { id: "n3", type: "math", data: { expression: "{{vars.s.0.qty_on_hand}} + ({{trigger.qty_change}})", output: "next" } },
        {
          id: "n4",
          type: "update",
          data: { table: "skus", where: { id: "{{trigger.sku_id}}" }, values: { qty_on_hand: "{{vars.next}}" } },
        },
        {
          id: "n5",
          type: "insert",
          data: {
            table: "movements",
            values: {
              sku_id: "{{trigger.sku_id}}",
              qty_change: "{{trigger.qty_change}}",
              reason: "{{trigger.reason}}",
              note: "{{trigger.note}}",
            },
          },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"qty":{{vars.next}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
      ],
    },
  ],
  pages: [
    {
      slug: "inventory",
      title: "Inventory",
      isHome: true,
      html: `<section class="py-5"><div class="container">
<h1 class="display-5 fw-bold">Inventory</h1>
<p style="color:var(--nk-text-muted);">Tracking <strong><span id="nk-inv-count">—</span></strong> SKUs · Low-stock threshold: {{config.lowThreshold}}</p>

<div class="row g-3 mt-3">
  <div class="col-md-4"><form data-nk-form="" data-nk-flow-ref="create-sku" class="card p-3 shadow-sm h-100"><h6 class="fw-bold">New SKU</h6>
    <input name="sku" class="form-control mb-2 font-monospace" placeholder="SKU-001" required/>
    <input name="title" class="form-control mb-2" placeholder="Title" required/>
    <div class="row g-2"><div class="col-6"><input name="qty_on_hand" type="number" class="form-control" placeholder="Qty" required/></div><div class="col-6"><input name="cost" type="number" step="0.01" class="form-control" placeholder="Cost"/></div></div>
    <input name="location" class="form-control my-2" placeholder="Location (Bin A)"/>
    <button class="btn btn-primary w-100" type="submit">Add SKU</button></form></div>
  <div class="col-md-8">
    <h6 class="fw-bold"> Low stock</h6>
    <div data-nk-bind-flow-ref="low-stock" data-nk-refresh="30000">
      <div class="d-flex align-items-center gap-3 p-2 border rounded mb-2 bg-warning bg-opacity-10" data-nk-item><code data-nk-field="sku">TEE-M-BLK</code><div class="flex-grow-1" data-nk-field="title">T-shirt Medium Black</div><div class="fw-bold">qty <span data-nk-field="qty_on_hand">3</span></div></div>
    </div>
  </div>
</div>

<h4 class="fw-bold mt-5">All SKUs</h4>
<div data-nk-bind-flow-ref="list" data-nk-refresh="15000" class="table-responsive mt-2"><table class="table align-middle"><thead><tr><th>SKU</th><th>Title</th><th>Qty</th><th>Cost</th><th>Location</th><th>Adjust</th></tr></thead><tbody>
  <tr data-nk-item data-nk-row-id="{id}"><td><code data-nk-field="sku">SKU</code></td><td data-nk-field="title">Title</td><td class="fw-bold" data-nk-field="qty_on_hand">0</td><td>$<span data-nk-field="cost">0</span></td><td data-nk-field="location">—</td><td><form data-nk-form="" data-nk-flow-ref="adjust" class="d-flex gap-1"><input type="hidden" name="sku_id" data-nk-bind-id/><input name="qty_change" type="number" class="form-control form-control-sm" style="width:80px;" placeholder="±" required/><input type="hidden" name="reason" value="manual"/><button class="btn btn-sm btn-outline-primary" type="submit">Apply</button></form></td></tr>
</tbody></table></div>
<script>(function(){
  function update(){ var n = document.querySelectorAll('[data-nk-bind-flow-ref="list"] [data-nk-item]').length; var el = document.getElementById('nk-inv-count'); if(el) el.textContent = n; }
  var mo = new MutationObserver(update); var c = document.querySelector('[data-nk-bind-flow-ref="list"]'); if(c){ mo.observe(c, {childList:true,subtree:true}); }
  document.addEventListener('change', function(e){ var i=e.target.closest('[data-nk-bind-id]'); if(i){ var row=i.closest('[data-nk-item]'); if(row) i.value = row.getAttribute('data-nk-row-id') || ''; }});
  document.addEventListener('submit', function(e){ var form=e.target.closest('form[data-nk-flow-ref="adjust"]'); if(!form) return; var row=form.closest('[data-nk-item]'); var hid=form.querySelector('[data-nk-bind-id]'); if(row && hid) hid.value = row.getAttribute('data-nk-row-id') || '';});
})();</script>
</div></section>`,
    },
  ],
};
