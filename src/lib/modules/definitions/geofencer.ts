import type { ModuleDefinition } from "../types";

export const geofencer: ModuleDefinition = {
  id: "geofencer",
  name: "Geofencer",
  tagline: "Trigger content when a user enters a zone",
  description:
    "Define circular geofences (center lat/lng + radius). Visitors share their location; if they're inside a fence, the matching content/message shows. Logs every check-in so you can see hot zones. Pairs nicely with push-notifications or coupons.",
  icon: "",
  color: "from-emerald-500 to-teal-700",
  category: "utility",
  version: "1.0.0",
  worksWith: ["map", "push-notifications", "coupons"],
  config: [
    { key: "heading", label: "Heading", type: "text", default: "What's near you", required: true },
  ],
  tables: [
    {
      name: "fences",
      fields: [
        { name: "label", type: "text" },
        { name: "lat", type: "float" },
        { name: "lng", type: "float" },
        { name: "radius_m", type: "int" },
        { name: "message", type: "text" },
        { name: "cta_url", type: "text" },
      ],
      seed: [
        { label: "Pike Place Market", lat: 47.6097, lng: -122.3422, radius_m: 200, message: " Welcome to the market! Show this for $2 off any pastry today.", cta_url: "/coupons" },
        { label: "Main store", lat: 47.6131, lng: -122.3416, radius_m: 100, message: "Hi! You're outside our flagship store. Stop in for free samples.", cta_url: "/menu" },
      ],
    },
    {
      name: "checkins",
      fields: [
        { name: "fence_id", type: "text" },
        { name: "lat", type: "float" },
        { name: "lng", type: "float" },
      ],
    },
  ],
  flows: [
    {
      slug: "fences",
      name: "List fences",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "fences", orderBy: "label asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "checkin",
      name: "Log a location check",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "checkins", values: { fence_id: "{{trigger.fence_id}}", lat: "{{trigger.lat}}", lng: "{{trigger.lng}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add-fence",
      name: "Create a fence",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "fences",
            values: {
              label: "{{trigger.label}}",
              lat: "{{trigger.lat}}",
              lng: "{{trigger.lng}}",
              radius_m: "{{trigger.radius_m}}",
              message: "{{trigger.message}}",
              cta_url: "{{trigger.cta_url}}",
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
      slug: "near-me",
      title: "Near me",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:560px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">{{config.heading}}</h1><p class="lead" style="color:var(--nk-text-muted);">Allow location to see nearby offers.</p></div>
<button class="btn btn-primary btn-lg w-100 mt-3" id="nk-gf-go" type="button">Check my location</button>
<div id="nk-gf-result" class="mt-4"></div>
<script>(function(){
  function dist(a,b,c,d){ var R=6371000,toR=function(x){return x*Math.PI/180;}; var dLat=toR(c-a),dLng=toR(d-b); var x = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)*Math.sin(dLng/2); return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x)); }
  document.getElementById('nk-gf-go').addEventListener('click', function(){
    if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(function(p){
      var lat = p.coords.latitude, lng = p.coords.longitude;
      fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['fences']||'fences'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
        .then(function(r){return r.json();}).then(function(fences){
          var hits = (fences||[]).filter(function(f){ return dist(lat,lng,f.lat,f.lng) <= (f.radius_m || 100); });
          var html = hits.length ? hits.map(function(f){
            fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['checkin']||'checkin'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({fence_id:f.id, lat:lat, lng:lng}) });
            return '<div class="card border-0 shadow-sm mb-3 p-4"><h4 class="fw-bold">'+f.label+'</h4><p class="lead">'+f.message+'</p>'+(f.cta_url?'<a class="btn btn-primary" href="'+f.cta_url+'">Open</a>':'')+'</div>';
          }).join('') : '<div class="alert alert-light">No nearby offers — keep moving around.</div>';
          document.getElementById('nk-gf-result').innerHTML = html;
        });
    }, function(){ alert('Could not get your location.'); });
  });
})();</script>
</div></section>`,
    },
    {
      slug: "geofencer-admin",
      title: "Manage fences",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Geofences</h1>
<form data-nk-form="" data-nk-flow-ref="add-fence" class="card p-3 shadow-sm mt-3">
  <input name="label" class="form-control mb-2" placeholder="Fence label" required/>
  <div class="row g-2"><div class="col-4"><input name="lat" type="number" step="0.000001" class="form-control" placeholder="Lat" required/></div><div class="col-4"><input name="lng" type="number" step="0.000001" class="form-control" placeholder="Lng" required/></div><div class="col-4"><input name="radius_m" type="number" class="form-control" placeholder="Radius (m)" required/></div></div>
  <textarea name="message" class="form-control mt-2" rows="2" placeholder="Message shown when inside" required></textarea>
  <input name="cta_url" type="url" class="form-control mt-2" placeholder="Optional CTA URL"/>
  <button class="btn btn-primary mt-3" type="submit">Add fence</button>
</form>
<div data-nk-bind-flow-ref="fences" data-nk-refresh="20000" class="mt-4">
  <div class="d-flex gap-3 align-items-center p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold" data-nk-field="label">Label</div><div class="small font-monospace" style="color:var(--nk-text-muted);"><span data-nk-field="lat">0</span>, <span data-nk-field="lng">0</span> · <span data-nk-field="radius_m">100</span>m</div></div></div>
</div>
</div></section>`,
    },
  ],
};
