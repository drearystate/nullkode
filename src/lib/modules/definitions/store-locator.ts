import type { ModuleDefinition } from "../types";

export const storeLocator: ModuleDefinition = {
  id: "store-locator",
  name: "Store Locator",
  tagline: "Find a store near me",
  description:
    "Multi-location store finder with hours, services, distance-sort from the user's location, and a one-tap 'directions' link to Google/Apple Maps. Distinct from generic `places` — purpose-built for retail chains, franchises, branches, and partner locations.",
  icon: "",
  color: "from-cyan-600 to-blue-800",
  category: "commerce",
  version: "1.0.0",
  worksWith: ["map", "places"],
  config: [
    { key: "brandName", label: "Brand name", type: "text", default: "Acme Stores", required: true },
  ],
  tables: [
    {
      name: "stores",
      fields: [
        { name: "name", type: "text" },
        { name: "address", type: "text" },
        { name: "city", type: "text" },
        { name: "phone", type: "text" },
        { name: "hours", type: "text" },
        { name: "services", type: "text" },
        { name: "lat", type: "float" },
        { name: "lng", type: "float" },
        { name: "image_url", type: "text" },
      ],
      seed: [
        { name: "Acme Downtown", address: "100 Main St", city: "Seattle, WA", phone: "(206) 555-0100", hours: "Mon-Sat 9-9, Sun 11-7", services: "Pickup, Returns, Repairs", lat: 47.6062, lng: -122.3321, image_url: "https://picsum.photos/seed/store1/600/400" },
        { name: "Acme Ballard", address: "5500 22nd Ave NW", city: "Seattle, WA", phone: "(206) 555-0101", hours: "Mon-Sat 10-8, Sun closed", services: "Pickup", lat: 47.6685, lng: -122.3848, image_url: "https://picsum.photos/seed/store2/600/400" },
        { name: "Acme Bellevue", address: "200 Bellevue Way NE", city: "Bellevue, WA", phone: "(425) 555-0102", hours: "Daily 10-9", services: "Pickup, Returns", lat: 47.6101, lng: -122.2015, image_url: "https://picsum.photos/seed/store3/600/400" },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "All stores",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "stores", orderBy: "name asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add",
      name: "Add a store",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "stores",
            values: {
              name: "{{trigger.name}}",
              address: "{{trigger.address}}",
              city: "{{trigger.city}}",
              phone: "{{trigger.phone}}",
              hours: "{{trigger.hours}}",
              services: "{{trigger.services}}",
              lat: "{{trigger.lat}}",
              lng: "{{trigger.lng}}",
              image_url: "{{trigger.image_url}}",
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
      slug: "stores",
      title: "Find a store",
      isHome: true,
      html: `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<section class="py-4"><div class="container">
<h1 class="display-5 fw-bold">{{config.brandName}} — Find a store</h1>
<button class="btn btn-primary mt-2" id="nk-sl-loc" type="button"> Use my location</button>

<div class="row g-4 mt-3">
  <div class="col-lg-5" id="nk-sl-list">Loading…</div>
  <div class="col-lg-7"><div id="nk-sl-map" style="height:560px;border-radius:10px;background:#e5e7eb;"></div></div>
</div>
<script>(function(){
  var map = L.map('nk-sl-map').setView([47.6,-122.3], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM' }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var userLoc = null;
  function dist(a,b,c,d){ var R=6371,toR=function(x){return x*Math.PI/180;}; var dLat=toR(c-a),dLng=toR(d-b); var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)*Math.sin(dLng/2); return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
  function paint(stores){
    layer.clearLayers();
    var sorted = (stores||[]).slice();
    if(userLoc) sorted.sort(function(a,b){ return dist(userLoc.lat, userLoc.lng, a.lat, a.lng) - dist(userLoc.lat, userLoc.lng, b.lat, b.lng); });
    document.getElementById('nk-sl-list').innerHTML = sorted.map(function(s){
      var d = userLoc ? '<div class="small fw-bold" style="color:var(--nk-primary);">'+dist(userLoc.lat,userLoc.lng,s.lat,s.lng).toFixed(1)+' km away</div>' : '';
      var mapsUrl = 'https://www.google.com/maps/dir/?api=1&destination='+s.lat+','+s.lng;
      return '<div class="card border-0 shadow-sm mb-3"><div class="card-body"><div class="fw-bold fs-5">'+s.name+'</div>'+d+'<div class="small mt-1"> '+s.address+', '+s.city+'</div><div class="small"> '+s.hours+'</div><div class="small"> '+s.phone+'</div><div class="small"> '+s.services+'</div><div class="mt-2"><a class="btn btn-outline-primary btn-sm" target="_blank" href="'+mapsUrl+'"> Directions</a></div></div></div>';
    }).join('');
    sorted.forEach(function(s){ L.marker([s.lat, s.lng]).bindPopup('<b>'+s.name+'</b><br/>'+s.address).addTo(layer); });
    if(sorted.length){ var b = L.latLngBounds(sorted.map(function(s){return [s.lat, s.lng];})); if(userLoc) b.extend([userLoc.lat, userLoc.lng]); map.fitBounds(b, { padding:[40,40] }); }
  }
  function load(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['list']||'list'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      .then(function(r){return r.json();}).then(paint);
  }
  document.getElementById('nk-sl-loc').addEventListener('click', function(){
    if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(function(p){ userLoc = { lat:p.coords.latitude, lng:p.coords.longitude }; L.marker([userLoc.lat, userLoc.lng], { title:'You' }).addTo(layer); load(); });
  });
  load();
})();</script>
</div></section>`,
    },
    {
      slug: "stores-admin",
      title: "Manage stores",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="fw-bold">Stores</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 shadow-sm mt-3">
  <div class="row g-2"><div class="col-md-8"><input name="name" class="form-control" placeholder="Store name" required/></div><div class="col-md-4"><input name="phone" class="form-control" placeholder="Phone"/></div><div class="col-md-8"><input name="address" class="form-control" placeholder="Address" required/></div><div class="col-md-4"><input name="city" class="form-control" placeholder="City, ST"/></div><div class="col-md-3"><input name="lat" type="number" step="0.000001" class="form-control" placeholder="Lat" required/></div><div class="col-md-3"><input name="lng" type="number" step="0.000001" class="form-control" placeholder="Lng" required/></div><div class="col-md-6"><input name="hours" class="form-control" placeholder="Hours"/></div><div class="col-12"><input name="services" class="form-control" placeholder="Services (Pickup, Returns…)"/></div><div class="col-12"><input name="image_url" type="url" class="form-control" placeholder="Photo URL"/></div></div>
  <button class="btn btn-primary mt-3" type="submit">Add store</button>
</form>
</div></section>`,
    },
  ],
};
