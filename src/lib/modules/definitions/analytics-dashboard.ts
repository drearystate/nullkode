import type { ModuleDefinition } from "../types";

export const analyticsDashboard: ModuleDefinition = {
  id: "analytics-dashboard",
  name: "Analytics Dashboard",
  tagline: "Track page views and custom events",
  description:
    "Track page views and arbitrary custom events ('signup', 'purchase'). Includes a beacon endpoint to call from any page, a counters API, and an admin dashboard with totals, top pages, and a 7-day trend.",
  icon: "",
  color: "from-indigo-500 to-blue-700",
  category: "utility",
  version: "1.0.0",
  tables: [
    {
      name: "events",
      fields: [
        { name: "name", type: "text" },
        { name: "path", type: "text" },
        { name: "session_id", type: "text" },
        { name: "user_agent", type: "text" },
        { name: "referrer", type: "text" },
        { name: "value", type: "float" },
      ],
    },
  ],
  flows: [
    {
      slug: "track",
      name: "Record an event",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "events",
            values: {
              name: "{{trigger.name}}",
              path: "{{trigger.path}}",
              session_id: "{{trigger.session_id}}",
              user_agent: "{{trigger.user_agent}}",
              referrer: "{{trigger.referrer}}",
              value: "{{trigger.value}}",
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
      slug: "summary",
      name: "Totals + recent events",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "events", orderBy: "created_at desc", limit: 500, output: "recent" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.recent}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "analytics",
      title: "Analytics",
      isHome: true,
      html: `<section class="py-5"><div class="container">
<h1 class="display-5 fw-bold">Analytics</h1>
<p style="color:var(--nk-text-muted);">Live counts from the events table. Drop the snippet below into any page you want tracked.</p>

<div class="row g-4 mt-2">
  <div class="col-md-4"><div class="card border-0 shadow-sm p-4 text-center"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Total events</div><div class="display-4 fw-bold mt-2" id="nk-cnt-total">—</div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm p-4 text-center"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Page views (24h)</div><div class="display-4 fw-bold mt-2" id="nk-cnt-views">—</div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm p-4 text-center"><div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Unique sessions</div><div class="display-4 fw-bold mt-2" id="nk-cnt-sess">—</div></div></div>
</div>

<div class="row g-4 mt-3">
  <div class="col-md-6"><div class="card border-0 shadow-sm p-4"><h5 class="fw-bold">Top paths (7d)</h5><div id="nk-top-paths" class="mt-3 small">—</div></div></div>
  <div class="col-md-6"><div class="card border-0 shadow-sm p-4"><h5 class="fw-bold">Top events (7d)</h5><div id="nk-top-events" class="mt-3 small">—</div></div></div>
</div>

<div class="card mt-4 p-3 border-0" style="background:var(--nk-surface-2);"><div class="fw-bold mb-2">Tracking snippet</div><pre class="m-0" style="white-space:pre-wrap;">&lt;script&gt;
(function(){var k='nk-sid';var s=localStorage.getItem(k);if(!s){s=Math.random().toString(36).slice(2);localStorage.setItem(k,s);}
fetch('/api/run/track',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'pageview',path:location.pathname,session_id:s,user_agent:navigator.userAgent,referrer:document.referrer})});})();
&lt;/script&gt;</pre></div>

<script>(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function load(){
    var slug = (window.__nkFlowSlugMap && window.__nkFlowSlugMap['summary']) || 'summary';
    fetch('/api/run/' + slug, { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
      .then(function(r){ return r.json(); })
      .then(function(rows){
        if(!Array.isArray(rows)) return;
        document.getElementById('nk-cnt-total').textContent = rows.length;
        var dayAgo = Date.now() - 86400000;
        var views = rows.filter(function(r){ return r.name === 'pageview' && new Date(r.created_at).getTime() > dayAgo; }).length;
        document.getElementById('nk-cnt-views').textContent = views;
        var sess = {}; rows.forEach(function(r){ if(r.session_id) sess[r.session_id] = 1; });
        document.getElementById('nk-cnt-sess').textContent = Object.keys(sess).length;
        var weekAgo = Date.now() - 604800000;
        var recent = rows.filter(function(r){ return new Date(r.created_at).getTime() > weekAgo; });
        function topBy(key){
          var c={}; recent.forEach(function(r){var k=r[key]||'—';c[k]=(c[k]||0)+1;});
          return Object.entries(c).sort(function(a,b){return b[1]-a[1];}).slice(0,8).map(function(p){
            return '<div class="d-flex justify-content-between border-bottom py-1"><span>'+esc(p[0])+'</span><span class="fw-bold">'+esc(p[1])+'</span></div>';
          }).join('') || '<div style="color:var(--nk-text-muted);">No data yet.</div>';
        }
        document.getElementById('nk-top-paths').innerHTML = topBy('path');
        document.getElementById('nk-top-events').innerHTML = topBy('name');
      }).catch(function(){});
  }
  load();
  setInterval(load, 30000);
})();</script>
</div></section>`,
    },
  ],
};
