import type { ModuleDefinition } from "../types";

export const deliveryTracking: ModuleDefinition = {
  id: "delivery-tracking",
  name: "Delivery Tracking",
  tagline: "Live driver location + status updates",
  description:
    "Track a delivery from pickup to dropoff. Drivers post lat/lng pings; customers see the latest pin on a map and a status timeline (assigned → picked up → on the way → delivered). Each delivery has a public tracking link.",
  icon: "",
  color: "from-blue-600 to-cyan-700",
  category: "utility",
  version: "1.0.0",
  provides: ["map"],
  worksWith: ["map", "sms"],
  config: [
    { key: "businessName", label: "Business name", type: "text", default: "Acme Delivery", required: true },
  ],
  tables: [
    {
      name: "deliveries",
      fields: [
        { name: "customer_name", type: "text" },
        { name: "customer_phone", type: "text" },
        { name: "pickup_address", type: "text" },
        { name: "dropoff_address", type: "text" },
        { name: "driver_name", type: "text" },
        { name: "status", type: "text" },
        { name: "last_lat", type: "float" },
        { name: "last_lng", type: "float" },
      ],
    },
    {
      name: "pings",
      fields: [
        { name: "delivery_id", type: "text" },
        { name: "lat", type: "float" },
        { name: "lng", type: "float" },
      ],
    },
    {
      name: "events",
      fields: [
        { name: "delivery_id", type: "text" },
        { name: "label", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create",
      name: "Create a delivery",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "deliveries",
            values: {
              customer_name: "{{trigger.customer_name}}",
              customer_phone: "{{trigger.customer_phone}}",
              pickup_address: "{{trigger.pickup_address}}",
              dropoff_address: "{{trigger.dropoff_address}}",
              driver_name: "{{trigger.driver_name}}",
              status: "assigned",
            },
            output: "d",
          },
        },
        { id: "n3", type: "insert", data: { table: "events", values: { delivery_id: "{{vars.d.id}}", label: "Order assigned to driver" } } },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true,"id":"{{vars.d.id}}","track_url":"/track?id={{vars.d.id}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "ping",
      name: "Driver position update",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: { table: "pings", values: { delivery_id: "{{trigger.id}}", lat: "{{trigger.lat}}", lng: "{{trigger.lng}}" } },
        },
        {
          id: "n3",
          type: "update",
          data: { table: "deliveries", where: { id: "{{trigger.id}}" }, values: { last_lat: "{{trigger.lat}}", last_lng: "{{trigger.lng}}" } },
        },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "set-status",
      name: "Update status",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "update", data: { table: "deliveries", where: { id: "{{trigger.id}}" }, values: { status: "{{trigger.status}}" } } },
        { id: "n3", type: "insert", data: { table: "events", values: { delivery_id: "{{trigger.id}}", label: "{{trigger.status}}" } } },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "get",
      name: "Get delivery (public tracking)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "deliveries", where: { id: "{{trigger.id}}" }, limit: 1, output: "d" } },
        { id: "n3", type: "query", data: { table: "events", where: { delivery_id: "{{trigger.id}}" }, orderBy: "created_at asc", limit: 50, output: "ev" } },
        { id: "n4", type: "response", data: { status: 200, body: '{"delivery":{{vars.d.0}},"events":{{vars.ev}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "list",
      name: "All deliveries (dispatcher)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "deliveries", orderBy: "created_at desc", limit: 100, output: "rows" } },
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
      slug: "dispatch",
      title: "Dispatch",
      isHome: true,
      html: `<section class="py-5"><div class="container">
<h1 class="display-5 fw-bold">{{config.businessName}} dispatch</h1>
<form data-nk-form="" data-nk-flow-ref="create" class="card p-3 shadow-sm mt-3">
<div class="row g-2"><div class="col-md-3"><input name="customer_name" class="form-control" placeholder="Customer name" required/></div><div class="col-md-3"><input name="customer_phone" class="form-control" placeholder="Phone"/></div><div class="col-md-3"><input name="driver_name" class="form-control" placeholder="Driver" required/></div><div class="col-md-3"><button class="btn btn-primary w-100" type="submit">Dispatch</button></div><div class="col-md-6"><input name="pickup_address" class="form-control" placeholder="Pickup address" required/></div><div class="col-md-6"><input name="dropoff_address" class="form-control" placeholder="Dropoff address" required/></div></div>
</form>
<h4 class="fw-bold mt-4">Live deliveries</h4>
<div data-nk-bind-flow-ref="list" data-nk-refresh="10000" class="row g-3 mt-2">
  <div class="col-md-6" data-nk-item><div class="card border-0 shadow-sm h-100"><div class="card-body"><div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold" data-nk-field="customer_name">Customer</div><div class="small" style="color:var(--nk-text-muted);">Driver: <span data-nk-field="driver_name">—</span></div></div><span class="badge bg-info" data-nk-field="status">assigned</span></div><div class="small mt-2" style="color:var(--nk-text-muted);">From <span data-nk-field="pickup_address">—</span><br/>To <span data-nk-field="dropoff_address">—</span></div></div></div></div>
</div>
</div></section>`,
    },
    {
      slug: "track",
      title: "Track delivery",
      html: `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<section class="py-4"><div class="container" style="max-width:680px;">
<h1 class="fw-bold"> Tracking your delivery</h1>
<div id="nk-tmap" style="height:340px;border-radius:14px;background:#e5e7eb;" class="mt-3"></div>
<div class="card p-3 mt-3 shadow-sm" id="nk-card">
  <div class="d-flex justify-content-between align-items-start"><div><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Status</div><div class="display-6 fw-bold" id="nk-status">—</div></div><div class="text-end small" style="color:var(--nk-text-muted);">Driver<div class="fw-bold fs-5" id="nk-driver">—</div></div></div>
  <hr/>
  <ol class="small mb-0" id="nk-events"></ol>
</div>
<script>(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  var id = new URLSearchParams(location.search).get('id') || '';
  var map = L.map('nk-tmap').setView([37.7749,-122.4194], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM' }).addTo(map);
  var marker = L.marker([37.7749,-122.4194]).addTo(map);
  function poll(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['get']||'get'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id:id}) })
      .then(function(r){return r.json();}).then(function(d){
        if(!d || !d.delivery) return;
        document.getElementById('nk-status').textContent = String(d.delivery.status||'').toUpperCase();
        document.getElementById('nk-driver').textContent = d.delivery.driver_name || '—';
        if(d.delivery.last_lat && d.delivery.last_lng){ var ll = [d.delivery.last_lat, d.delivery.last_lng]; marker.setLatLng(ll); map.setView(ll, 14); }
        document.getElementById('nk-events').innerHTML = (Array.isArray(d.events)?d.events:[]).map(function(e){ return '<li>'+esc(e.label)+'</li>'; }).join('');
      });
  }
  poll(); setInterval(poll, 6000);
})();</script>
</div></section>`,
    },
    {
      slug: "driver",
      title: "Driver app",
      html: `<section class="py-4"><div class="container" style="max-width:440px;">
<h1 class="fw-bold"> Driver console</h1>
<form data-nk-form="" data-nk-flow-ref="ping" class="card p-3 shadow-sm mt-3">
  <div class="mb-3"><label class="form-label">Delivery ID</label><input name="id" class="form-control" required/></div>
  <div class="row g-2"><div class="col-6"><input name="lat" type="number" step="0.000001" class="form-control" placeholder="Lat" required/></div><div class="col-6"><input name="lng" type="number" step="0.000001" class="form-control" placeholder="Lng" required/></div></div>
  <button class="btn btn-primary w-100 mt-3" type="submit">Send ping</button>
  <button class="btn btn-link w-100 mt-1" type="button" id="nk-geo">Use my current location</button>
</form>
<form data-nk-form="" data-nk-flow-ref="set-status" class="card p-3 shadow-sm mt-3">
  <div class="mb-3"><label class="form-label">Delivery ID</label><input name="id" class="form-control" required/></div>
  <select name="status" class="form-select"><option>picked up</option><option>on the way</option><option>delivered</option></select>
  <button class="btn btn-secondary w-100 mt-3" type="submit">Update status</button>
</form>
<script>document.getElementById('nk-geo').addEventListener('click',function(){navigator.geolocation.getCurrentPosition(function(p){document.querySelector('input[name="lat"]').value=p.coords.latitude.toFixed(6);document.querySelector('input[name="lng"]').value=p.coords.longitude.toFixed(6);});});</script>
</div></section>`,
    },
  ],
};
