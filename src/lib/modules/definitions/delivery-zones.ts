import type { ModuleDefinition } from "../types";

export const deliveryZones: ModuleDefinition = {
  id: "delivery-zones",
  name: "Delivery Zones",
  tagline: "Per-zone delivery cost & minimum order",
  description:
    "Define delivery zones by postal code or distance from your shop. Each zone has its own delivery fee and minimum-order requirement. A 'quote' flow accepts an address (or postal code) and returns whether delivery is available and the cost.",
  icon: "",
  color: "from-emerald-500 to-teal-700",
  category: "commerce",
  version: "1.0.0",
  worksWith: ["shop", "menu", "whatsapp-order", "delivery-tracking"],
  config: [
    { key: "shopLat", label: "Shop latitude", type: "text", default: "47.6062" },
    { key: "shopLng", label: "Shop longitude", type: "text", default: "-122.3321" },
  ],
  tables: [
    {
      name: "zones",
      fields: [
        { name: "label", type: "text" },
        { name: "kind", type: "text" },
        { name: "postal_codes", type: "text" },
        { name: "max_km", type: "float" },
        { name: "delivery_fee", type: "float" },
        { name: "min_order", type: "float" },
        { name: "eta_minutes", type: "int" },
      ],
      seed: [
        { label: "Inner ring (free)", kind: "distance", postal_codes: "", max_km: 3, delivery_fee: 0, min_order: 15, eta_minutes: 30 },
        { label: "Mid ring", kind: "distance", postal_codes: "", max_km: 8, delivery_fee: 4.99, min_order: 20, eta_minutes: 45 },
        { label: "Outer ring", kind: "distance", postal_codes: "", max_km: 15, delivery_fee: 9.99, min_order: 35, eta_minutes: 75 },
      ],
    },
    {
      name: "quotes",
      fields: [
        { name: "input_address", type: "text" },
        { name: "matched_zone", type: "text" },
        { name: "fee", type: "float" },
        { name: "order_total", type: "float" },
        { name: "accepted", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "zones",
      name: "List zones",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "zones", orderBy: "max_km asc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "quote",
      name: "Quote a delivery for a given location & order total",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "math",
          data: { expression: "haversine_km({{config.shopLat}}, {{config.shopLng}}, {{trigger.lat}}, {{trigger.lng}})", output: "km" },
        },
        {
          id: "n3",
          type: "query",
          data: {
            table: "zones",
            where: { kind: "distance", "max_km >=": "{{vars.km}}" },
            orderBy: "max_km asc",
            limit: 1,
            output: "z",
          },
        },
        { id: "n4", type: "branch", data: { left: "{{vars.z.0.id}}", op: "exists", right: "" } },
        {
          id: "n5",
          type: "branch",
          data: { left: "{{trigger.order_total}}", op: ">=", right: "{{vars.z.0.min_order}}" },
        },
        {
          id: "n6",
          type: "insert",
          data: {
            table: "quotes",
            values: {
              input_address: "{{trigger.address}}",
              matched_zone: "{{vars.z.0.label}}",
              fee: "{{vars.z.0.delivery_fee}}",
              order_total: "{{trigger.order_total}}",
              accepted: "true",
            },
          },
        },
        { id: "n7", type: "response", data: { status: 200, body: '{"ok":true,"zone":"{{vars.z.0.label}}","fee":{{vars.z.0.delivery_fee}},"eta_minutes":{{vars.z.0.eta_minutes}},"distance_km":{{vars.km}}}' } },
        { id: "n8", type: "response", data: { status: 400, body: '{"error":"Order below minimum of ${{vars.z.0.min_order}} for this zone"}' } },
        { id: "n9", type: "response", data: { status: 404, body: '{"error":"Sorry, we do not deliver to that location ({{vars.km}} km away)"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "true" },
        { id: "e5", source: "n5", target: "n6", sourceHandle: "true" },
        { id: "e6", source: "n6", target: "n7" },
        { id: "e7", source: "n5", target: "n8", sourceHandle: "false" },
        { id: "e8", source: "n4", target: "n9", sourceHandle: "false" },
      ],
    },
    {
      slug: "add-zone",
      name: "Create a zone",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "zones",
            values: {
              label: "{{trigger.label}}",
              kind: "{{trigger.kind}}",
              postal_codes: "{{trigger.postal_codes}}",
              max_km: "{{trigger.max_km}}",
              delivery_fee: "{{trigger.delivery_fee}}",
              min_order: "{{trigger.min_order}}",
              eta_minutes: "{{trigger.eta_minutes}}",
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
  ],
  pages: [
    {
      slug: "delivery-quote",
      title: "Delivery quote",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:520px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">Do you deliver?</h1><p class="lead" style="color:var(--nk-text-muted);">Enter your address — we'll quote delivery instantly.</p></div>
<div class="card p-4 mt-4 shadow-sm" id="nk-dz-card">
  <div class="mb-3"><label class="form-label">Your address</label><input id="nk-dz-addr" class="form-control" placeholder="123 Main St, Seattle" required/></div>
  <div class="row g-2"><div class="col-6"><input id="nk-dz-lat" type="number" step="0.000001" class="form-control" placeholder="Lat (auto)"/></div><div class="col-6"><input id="nk-dz-lng" type="number" step="0.000001" class="form-control" placeholder="Lng (auto)"/></div></div>
  <button class="btn btn-link btn-sm mt-1" id="nk-dz-geo" type="button"> Use my location</button>
  <div class="mb-3 mt-2"><label class="form-label">Order total ($)</label><input id="nk-dz-total" type="number" step="0.01" value="25" class="form-control" required/></div>
  <button class="btn btn-primary btn-lg w-100" id="nk-dz-go" type="button">Get quote</button>
  <div id="nk-dz-result" class="mt-3"></div>
</div>

<h4 class="fw-bold mt-5">Zones</h4>
<div data-nk-bind-flow-ref="zones" class="mt-2">
  <div class="d-flex justify-content-between p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div><div class="fw-bold" data-nk-field="label">Zone</div><div class="small" style="color:var(--nk-text-muted);">Up to <span data-nk-field="max_km">5</span> km · ETA <span data-nk-field="eta_minutes">30</span> min</div></div><div class="text-end"><div class="fw-bold">$<span data-nk-field="delivery_fee">0</span></div><div class="small">min $<span data-nk-field="min_order">15</span></div></div></div>
</div>

<script>(function(){
  document.getElementById('nk-dz-geo').addEventListener('click', function(){
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function(p){ document.getElementById('nk-dz-lat').value = p.coords.latitude.toFixed(6); document.getElementById('nk-dz-lng').value = p.coords.longitude.toFixed(6); });
  });
  document.getElementById('nk-dz-go').addEventListener('click', function(){
    var body = { address: document.getElementById('nk-dz-addr').value, lat: parseFloat(document.getElementById('nk-dz-lat').value), lng: parseFloat(document.getElementById('nk-dz-lng').value), order_total: parseFloat(document.getElementById('nk-dz-total').value) };
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['quote']||'quote'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) })
      .then(function(r){return r.json().then(function(d){ return {ok:r.ok, d:d}; });})
      .then(function(r){
        var el = document.getElementById('nk-dz-result');
        if(r.ok){ el.innerHTML = '<div class="alert alert-success"><div class="fw-bold fs-5"> We deliver to you!</div><div class="small">'+r.d.zone+' · $'+r.d.fee+' delivery · ETA '+r.d.eta_minutes+' min</div></div>'; }
        else { el.innerHTML = '<div class="alert alert-warning">'+(r.d.error || 'No quote')+'</div>'; }
      });
  });
})();</script>
</div></section>`,
    },
    {
      slug: "delivery-zones-admin",
      title: "Manage zones",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Delivery zones</h1>
<form data-nk-form="" data-nk-flow-ref="add-zone" class="card p-3 shadow-sm mt-3">
  <input name="label" class="form-control mb-2" placeholder="Zone label" required/>
  <select name="kind" class="form-select mb-2"><option value="distance">Distance-based</option><option value="postal">Postal-code based</option></select>
  <div class="row g-2"><div class="col-md-4"><input name="max_km" type="number" step="0.1" class="form-control" placeholder="Max km"/></div><div class="col-md-4"><input name="delivery_fee" type="number" step="0.01" class="form-control" placeholder="Fee ($)" required/></div><div class="col-md-4"><input name="min_order" type="number" step="0.01" class="form-control" placeholder="Min order ($)" required/></div><div class="col-md-6"><input name="eta_minutes" type="number" class="form-control" placeholder="ETA (min)"/></div><div class="col-md-6"><input name="postal_codes" class="form-control" placeholder="Postal codes (comma sep)"/></div></div>
  <button class="btn btn-primary mt-3" type="submit">Add zone</button>
</form>
</div></section>`,
    },
  ],
};
