import type { ModuleDefinition } from "../types";

export const countdown: ModuleDefinition = {
  id: "countdown",
  name: "Countdown Timer",
  tagline: "Live countdown to launches, sales, events",
  description:
    "A live-updating countdown timer page targeting a future timestamp. Renders days/hours/minutes/seconds in a big hero, with optional headline, subhead, and post-zero CTA. Multiple campaigns can run in parallel; pick one with ?id=...",
  icon: "⏱",
  color: "from-amber-500 to-red-700",
  category: "content",
  version: "1.0.0",
  tables: [
    {
      name: "campaigns",
      fields: [
        { name: "headline", type: "text" },
        { name: "subhead", type: "text" },
        { name: "target_at", type: "timestamp" },
        { name: "cta_label", type: "text" },
        { name: "cta_url", type: "text" },
        { name: "image_url", type: "text" },
      ],
      seed: [
        { headline: "Summer sale starts in", subhead: "30% off everything for 72 hours.", target_at: "2026-06-21 00:00:00", cta_label: "Shop now", cta_url: "/", image_url: "/media/generated/hospitality-courtyard-pool.webp" },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List campaigns",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "campaigns", orderBy: "target_at asc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "get",
      name: "Get one campaign",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "campaigns", where: { id: "{{trigger.id}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.row.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "create",
      name: "Create a campaign",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "campaigns",
            values: {
              headline: "{{trigger.headline}}",
              subhead: "{{trigger.subhead}}",
              target_at: "{{trigger.target_at}}",
              cta_label: "{{trigger.cta_label}}",
              cta_url: "{{trigger.cta_url}}",
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
      slug: "countdown",
      title: "Countdown",
      isHome: true,
      html: `<section id="nk-cd-bg" style="background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.7)), url('/media/generated/hospitality-courtyard-pool.webp') center/cover #111;color:#fff;min-height:80vh;display:flex;align-items:center;">
<div class="container text-center py-5">
<h1 class="display-3 fw-bold" id="nk-cd-head">Loading…</h1>
<p class="lead" id="nk-cd-sub">—</p>

<div class="d-flex justify-content-center gap-3 mt-4 flex-wrap" id="nk-cd-grid">
  <div class="text-center"><div class="display-1 fw-bold" id="nk-cd-d">00</div><div class="small text-uppercase">Days</div></div>
  <div class="text-center"><div class="display-1 fw-bold" id="nk-cd-h">00</div><div class="small text-uppercase">Hours</div></div>
  <div class="text-center"><div class="display-1 fw-bold" id="nk-cd-m">00</div><div class="small text-uppercase">Min</div></div>
  <div class="text-center"><div class="display-1 fw-bold" id="nk-cd-s">00</div><div class="small text-uppercase">Sec</div></div>
</div>
<a id="nk-cd-cta" class="btn btn-light btn-lg mt-4" href="#" style="display:none;">Go</a>
</div></section>
<script>(function(){
  var id = new URLSearchParams(location.search).get('id') || '';
  var slug = (window.__nkFlowSlugMap||{})['get'] || 'get';
  fetch('/api/run/' + slug, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id:id}) })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(c){
      if(!c){
        // fall back to first campaign
        return fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['list']||'list'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
          .then(function(r){return r.json();}).then(function(rows){ return (rows||[])[0]; });
      }
      return c;
    })
    .then(function(c){
      if(!c){ document.getElementById('nk-cd-head').textContent = 'Nothing scheduled.'; return; }
      document.getElementById('nk-cd-head').textContent = c.headline || '';
      document.getElementById('nk-cd-sub').textContent = c.subhead || '';
      if(c.image_url) document.getElementById('nk-cd-bg').style.background = "linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.7)), url('"+c.image_url+"') center/cover #111";
      if(c.cta_url && c.cta_label){ var a = document.getElementById('nk-cd-cta'); a.href = c.cta_url; a.textContent = c.cta_label; }
      var target = new Date(c.target_at).getTime();
      function tick(){
        var diff = Math.max(0, target - Date.now());
        var d = Math.floor(diff / 86400000); diff -= d*86400000;
        var h = Math.floor(diff / 3600000); diff -= h*3600000;
        var m = Math.floor(diff / 60000); diff -= m*60000;
        var s = Math.floor(diff / 1000);
        document.getElementById('nk-cd-d').textContent = String(d).padStart(2,'0');
        document.getElementById('nk-cd-h').textContent = String(h).padStart(2,'0');
        document.getElementById('nk-cd-m').textContent = String(m).padStart(2,'0');
        document.getElementById('nk-cd-s').textContent = String(s).padStart(2,'0');
        if(d+h+m+s === 0 && c.cta_url){ document.getElementById('nk-cd-cta').style.display = 'inline-block'; }
      }
      tick(); setInterval(tick, 1000);
    });
})();</script>`,
    },
    {
      slug: "countdown-admin",
      title: "Campaigns",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Countdown campaigns</h1>
<form data-nk-form="" data-nk-flow-ref="create" class="card p-3 shadow-sm mt-3">
  <input name="headline" class="form-control mb-2" placeholder="Headline" required/>
  <input name="subhead" class="form-control mb-2" placeholder="Subhead"/>
  <input name="target_at" type="datetime-local" class="form-control mb-2" required/>
  <input name="image_url" type="url" class="form-control mb-2" placeholder="Background image URL"/>
  <div class="row g-2"><div class="col-6"><input name="cta_label" class="form-control" placeholder="Button text"/></div><div class="col-6"><input name="cta_url" type="url" class="form-control" placeholder="Button URL"/></div></div>
  <button class="btn btn-primary mt-2" type="submit">Create</button>
</form>
<div data-nk-bind-flow-ref="list" data-nk-refresh="20000" class="mt-4">
  <div class="d-flex justify-content-between p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div><div class="fw-bold" data-nk-field="headline">Headline</div><div class="small" style="color:var(--nk-text-muted);">Targets <span data-nk-field="target_at">—</span></div></div></div>
</div>
</div></section>`,
    },
  ],
};
