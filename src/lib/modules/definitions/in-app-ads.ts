import type { ModuleDefinition } from "../types";

export const inAppAds: ModuleDefinition = {
  id: "in-app-ads",
  name: "In-App Ads",
  tagline: "House banner rotation with click tracking",
  description:
    "Rotate house banner ads on your pages without an external ad network. Admin uploads creatives (image + headline + click URL + active dates), the runtime picks one weighted at random per page view, and every impression + click is logged for CTR analysis. Drop the snippet anywhere.",
  icon: "",
  color: "from-yellow-500 to-amber-700",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "placement", label: "Default placement label", type: "text", default: "header" },
  ],
  tables: [
    {
      name: "ads",
      fields: [
        { name: "headline", type: "text" },
        { name: "image_url", type: "text" },
        { name: "click_url", type: "text" },
        { name: "weight", type: "int" },
        { name: "active", type: "bool" },
        { name: "placement", type: "text" },
      ],
      seed: [
        { headline: " Summer Sale — 30% off", image_url: "/media/generated/hospitality-courtyard-pool.webp", click_url: "/", weight: 80, active: true, placement: "header" },
        { headline: "New podcast — Episode 12 out now", image_url: "/media/generated/music-recording-studio.webp", click_url: "/", weight: 20, active: true, placement: "header" },
      ],
    },
    {
      name: "impressions",
      fields: [
        { name: "ad_id", type: "text" },
        { name: "placement", type: "text" },
      ],
    },
    {
      name: "clicks",
      fields: [
        { name: "ad_id", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "serve",
      name: "Serve a random active ad",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "ads", where: { active: "true", placement: "{{trigger.placement}}" }, limit: 50, output: "ads" } },
        { id: "n3", type: "math", data: { expression: "weighted_random({{vars.ads}}, 'weight')", output: "pick" } },
        { id: "n4", type: "insert", data: { table: "impressions", values: { ad_id: "{{vars.pick.id}}", placement: "{{trigger.placement}}" } } },
        { id: "n5", type: "response", data: { status: 200, body: "{{vars.pick}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "click",
      name: "Record a click",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "clicks", values: { ad_id: "{{trigger.ad_id}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "create",
      name: "Create an ad",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "ads",
            values: {
              headline: "{{trigger.headline}}",
              image_url: "{{trigger.image_url}}",
              click_url: "{{trigger.click_url}}",
              weight: "{{trigger.weight}}",
              placement: "{{trigger.placement}}",
              active: "true",
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
      slug: "stats",
      name: "All ads with impressions/clicks",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "ads", limit: 100, output: "ads" } },
        { id: "n3", type: "query", data: { table: "impressions", limit: 5000, output: "imps" } },
        { id: "n4", type: "query", data: { table: "clicks", limit: 5000, output: "clicks" } },
        { id: "n5", type: "response", data: { status: 200, body: '{"ads":{{vars.ads}},"impressions":{{vars.imps}},"clicks":{{vars.clicks}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
  ],
  pages: [
    {
      slug: "ads",
      title: "Ad rotation",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:880px;">
<h1 class="fw-bold">In-app ads</h1>
<p style="color:var(--nk-text-muted);">Drop this snippet into any page where you want an ad to appear. The runtime picks a random active ad weighted by your settings.</p>

<div class="card p-3 mt-3" style="background:var(--nk-surface-2);"><div class="fw-bold mb-2">Snippet</div><pre class="m-0 small" style="white-space:pre-wrap;">&lt;div data-nk-ad-slot data-placement="{{config.placement}}"&gt;&lt;/div&gt;</pre></div>

<h4 class="fw-bold mt-5">Live preview</h4>
<div data-nk-ad-slot data-placement="{{config.placement}}" class="mt-2"></div>

<h4 class="fw-bold mt-5">Performance</h4>
<div id="nk-ads-stats" class="table-responsive mt-2"><div class="small" style="color:var(--nk-text-muted);">Loading…</div></div>

<script>(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function safeUrl(u){u=String(u||'');return /^(https?:|\\/|data:image\\/)/i.test(u)?u:'#'}
  function serve(slot){
    var pl = slot.getAttribute('data-placement') || 'header';
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['serve']||'serve'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({placement:pl}) })
      .then(function(r){return r.json();}).then(function(ad){
        if(!ad || !ad.id){ slot.style.display='none'; return; }
        slot.innerHTML = '<a class="d-block position-relative text-decoration-none" data-ad-id="'+esc(ad.id)+'" href="'+esc(safeUrl(ad.click_url||'#'))+'" target="_blank" rel="noopener sponsored" style="border-radius:8px;overflow:hidden;">'+(ad.image_url?'<img style="width:100%;height:auto;display:block;" src="'+esc(safeUrl(ad.image_url))+'" alt=""/>':'')+'<div class="position-absolute bottom-0 start-0 end-0 p-2 text-white" style="background:linear-gradient(transparent, rgba(0,0,0,.6));"><strong>'+esc(ad.headline||'')+'</strong></div></a>';
        slot.querySelector('a').addEventListener('click', function(){
          fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['click']||'click'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ad_id:ad.id}) });
        });
      });
  }
  document.querySelectorAll('[data-nk-ad-slot]').forEach(serve);
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['stats']||'stats'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
    .then(function(r){return r.json();}).then(function(d){
      d = d || {};
      var list = function(x){ return Array.isArray(x) ? x : []; };
      var imps = {}; list(d.impressions).forEach(function(i){ imps[i.ad_id] = (imps[i.ad_id]||0)+1; });
      var clk = {}; list(d.clicks).forEach(function(c){ clk[c.ad_id] = (clk[c.ad_id]||0)+1; });
      var html = '<table class="table align-middle"><thead><tr><th>Ad</th><th>Imp</th><th>Clk</th><th>CTR</th></tr></thead><tbody>' +
        list(d.ads).map(function(a){
          var i = imps[a.id] || 0, c = clk[a.id] || 0;
          var ctr = i ? ((c/i*100).toFixed(1)+'%') : '—';
          return '<tr><td>'+esc(a.headline)+'</td><td>'+esc(i)+'</td><td>'+esc(c)+'</td><td><strong>'+ctr+'</strong></td></tr>';
        }).join('') + '</tbody></table>';
      document.getElementById('nk-ads-stats').innerHTML = html;
    });
})();</script>
</div></section>`,
    },
    {
      slug: "ads-admin",
      title: "Manage ads",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Create an ad</h1>
<form data-nk-form="" data-nk-flow-ref="create" class="card p-3 shadow-sm mt-3">
  <input name="headline" class="form-control mb-2" placeholder="Headline" required/>
  <input name="image_url" type="url" class="form-control mb-2" placeholder="Image URL" required/>
  <input name="click_url" type="url" class="form-control mb-2" placeholder="Click destination" required/>
  <div class="row g-2"><div class="col-6"><input name="weight" type="number" class="form-control" placeholder="Weight (1-100)" value="50" required/></div><div class="col-6"><input name="placement" class="form-control" placeholder="Placement" value="{{config.placement}}"/></div></div>
  <button class="btn btn-primary mt-3" type="submit">Publish</button>
</form>
</div></section>`,
    },
  ],
};
