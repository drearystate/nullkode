import type { ModuleDefinition } from "../types";

export const routes: ModuleDefinition = {
  id: "routes",
  name: "Routes & Itineraries",
  tagline: "Ordered list of stops with a route preview",
  description:
    "Build a multi-stop itinerary or route: add stops in order (name, address, lat/lng, notes), see them on a map with a connecting polyline, and share the finished route publicly via a clean printable page.",
  icon: "",
  color: "from-teal-500 to-cyan-700",
  category: "utility",
  version: "1.0.0",
  worksWith: ["map", "places"],
  config: [
    { key: "heading", label: "Heading", type: "text", default: "Our routes", required: true },
  ],
  tables: [
    {
      name: "trips",
      fields: [
        { name: "name", type: "text" },
        { name: "description", type: "text" },
      ],
      seed: [
        { name: "City highlights walking tour", description: "A 3-hour walking loop hitting the best spots downtown." },
      ],
    },
    {
      name: "stops",
      fields: [
        { name: "trip_id", type: "text" },
        { name: "label", type: "text" },
        { name: "address", type: "text" },
        { name: "lat", type: "float" },
        { name: "lng", type: "float" },
        { name: "notes", type: "text" },
        { name: "sort_order", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "trips",
      name: "List trips",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "trips", orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "stops",
      name: "Stops for a trip",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "stops", where: { trip_id: "{{trigger.trip_id}}" }, orderBy: "sort_order asc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "create-trip",
      name: "Create a trip",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: { table: "trips", values: { name: "{{trigger.name}}", description: "{{trigger.description}}" }, output: "trip" },
        },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.trip}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add-stop",
      name: "Add a stop",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "stops",
            values: {
              trip_id: "{{trigger.trip_id}}",
              label: "{{trigger.label}}",
              address: "{{trigger.address}}",
              lat: "{{trigger.lat}}",
              lng: "{{trigger.lng}}",
              notes: "{{trigger.notes}}",
              sort_order: "{{trigger.sort_order}}",
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
      slug: "routes",
      title: "Routes",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;"><h1 class="display-5 fw-bold">{{config.heading}}</h1>
<div data-nk-bind-flow-ref="trips" class="row g-3 mt-3">
  <div class="col-md-6" data-nk-item data-nk-row-id="{id}"><a class="card border-0 shadow-sm h-100 text-decoration-none text-body p-3" data-nk-href-template="/route?id={id}" href="#"><div class="fs-3"></div><div class="fw-bold mt-2" data-nk-field="name">Trip name</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="description">Description</div></a></div>
</div>
<form data-nk-form="" data-nk-flow-ref="create-trip" class="card p-3 shadow-sm mt-4">
  <h5 class="fw-bold">New trip</h5>
  <input name="name" class="form-control mb-2" placeholder="Trip name" required/>
  <textarea name="description" class="form-control" rows="2" placeholder="Description"></textarea>
  <button class="btn btn-primary mt-2" type="submit">Create</button>
</form>
</div></section>`,
    },
    {
      slug: "route",
      title: "Route",
      html: `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<section class="py-4"><div class="container" style="max-width:980px;">
<a href="/routes" class="small text-decoration-none" style="color:var(--nk-text-muted);">← All routes</a>
<h1 class="fw-bold mt-2" id="nk-trip-name">Route</h1>
<div id="nk-rmap" style="height:400px;border-radius:12px;background:#e5e7eb;" class="mt-3"></div>
<ol class="mt-4" id="nk-stops"></ol>

<form data-nk-form="" data-nk-flow-ref="add-stop" class="card p-3 shadow-sm mt-3">
  <h5 class="fw-bold">Add a stop</h5>
  <input type="hidden" name="trip_id" id="nk-add-trip"/>
  <input name="label" class="form-control mb-2" placeholder="Label" required/>
  <input name="address" class="form-control mb-2" placeholder="Address"/>
  <div class="row g-2"><div class="col-6"><input name="lat" type="number" step="0.000001" class="form-control" placeholder="Lat" required/></div><div class="col-6"><input name="lng" type="number" step="0.000001" class="form-control" placeholder="Lng" required/></div></div>
  <input name="sort_order" type="number" class="form-control mt-2" placeholder="Order"/>
  <textarea name="notes" class="form-control mt-2" rows="2" placeholder="Notes"></textarea>
  <button class="btn btn-primary mt-2" type="submit">Add stop</button>
</form>

<script>(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  var id = new URLSearchParams(location.search).get('id') || '';
  document.getElementById('nk-add-trip').value = id;
  var map = L.map('nk-rmap').setView([37.7749,-122.4194], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);
  var layer = L.layerGroup().addTo(map);
  function poll(){
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['stops']||'stops'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({trip_id:id}) })
      .then(function(r){return r.json();}).then(function(stops){
        layer.clearLayers();
        var coords = [];
        stops = Array.isArray(stops) ? stops : [];
        stops.forEach(function(s, i){
          if(!s.lat || !s.lng) return;
          L.marker([s.lat, s.lng]).bindPopup('<b>'+(i+1)+'. '+esc(s.label)+'</b><br/>'+esc(s.address||'')).addTo(layer);
          coords.push([s.lat, s.lng]);
        });
        if(coords.length > 1) L.polyline(coords, { color:'#0ea5e9', weight:4 }).addTo(layer);
        if(coords.length) map.fitBounds(coords, { padding:[40,40] });
        document.getElementById('nk-stops').innerHTML = stops.map(function(s){
          return '<li class="mb-2"><strong>'+esc(s.label)+'</strong>'+(s.address?' — <span style="color:var(--nk-text-muted);">'+esc(s.address)+'</span>':'')+(s.notes?'<div class="small">'+esc(s.notes)+'</div>':'')+'</li>';
        }).join('');
      });
  }
  poll(); setInterval(poll, 8000);
})();</script>
</div></section>`,
    },
  ],
};
