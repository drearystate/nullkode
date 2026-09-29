import type { ModuleDefinition } from "../types";

export const appWalkthrough: ModuleDefinition = {
  id: "app-walkthrough",
  name: "App Walkthrough",
  tagline: "First-run multi-step onboarding overlay",
  description:
    "An overlay that walks brand-new visitors through your app on first load. Define ordered steps (title, body, target selector); the overlay highlights each element with a spotlight and 'Next / Skip' controls. Skip state persists per browser so returning visitors aren't bothered.",
  icon: "",
  color: "from-violet-500 to-purple-700",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "skipLabel", label: "Skip button label", type: "text", default: "Skip tour" },
    { key: "doneLabel", label: "Final-step label", type: "text", default: "Got it!" },
  ],
  tables: [
    {
      name: "steps",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "target_selector", type: "text" },
        { name: "sort_order", type: "int" },
      ],
      seed: [
        { title: "Welcome aboard", body: "Let's take a quick tour of the app. It'll take about 30 seconds.", target_selector: "body", sort_order: 1 },
        { title: "Main navigation", body: "Use the top bar to jump between sections.", target_selector: "nav, header", sort_order: 2 },
        { title: "Your profile", body: "Click your avatar in the top-right to manage your account.", target_selector: "[data-nk-profile], .navbar-nav, header a:last-child", sort_order: 3 },
      ],
    },
    {
      name: "completions",
      fields: [
        { name: "fingerprint", type: "text" },
        { name: "completed", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "steps",
      name: "List walkthrough steps",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "steps", orderBy: "sort_order asc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "complete",
      name: "Mark walkthrough complete",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "completions", values: { fingerprint: "{{trigger.fingerprint}}", completed: "true" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add-step",
      name: "Add a step",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "steps",
            values: {
              title: "{{trigger.title}}",
              body: "{{trigger.body}}",
              target_selector: "{{trigger.target_selector}}",
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
      slug: "walkthrough-demo",
      title: "Walkthrough demo",
      isHome: true,
      html: `<header class="py-3" style="background:var(--nk-surface-2);"><div class="container d-flex justify-content-between"><strong>Demo app</strong><nav class="d-flex gap-3 small"><a href="#">Home</a><a href="#">Settings</a><a href="#" data-nk-profile> Profile</a></nav></div></header>
<section class="py-5"><div class="container"><h1 class="display-5 fw-bold">Walkthrough demo</h1><p style="color:var(--nk-text-muted);">First-time visitors see the tour automatically. Refresh after clicking "Got it!" — you won't see it again because the key is saved in your browser.</p>
<button class="btn btn-outline-primary mt-2" type="button" onclick="localStorage.removeItem('nk-wt-done');location.reload();">Reset and replay tour</button>
</div></section>

<div id="nk-wt-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:none;align-items:center;justify-content:center;">
  <div class="card shadow-lg" style="max-width:420px;border-radius:14px;">
    <div class="card-body">
      <div class="small text-uppercase fw-bold" style="color:var(--nk-text-muted);">Step <span id="nk-wt-cur">1</span> of <span id="nk-wt-total">1</span></div>
      <h4 class="fw-bold mt-1" id="nk-wt-title">Title</h4>
      <p id="nk-wt-body" class="mb-0">Body</p>
    </div>
    <div class="card-footer d-flex justify-content-between border-0" style="background:transparent;">
      <button class="btn btn-link btn-sm" type="button" id="nk-wt-skip">{{config.skipLabel}}</button>
      <button class="btn btn-primary btn-sm" type="button" id="nk-wt-next">Next →</button>
    </div>
  </div>
</div>
<div id="nk-wt-spot" style="position:fixed;pointer-events:none;border:3px solid #fff;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,.55), 0 0 14px rgba(255,255,255,.5);z-index:9998;display:none;transition:all .3s;"></div>

<script>(function(){
  if(localStorage.getItem('nk-wt-done') === '1') return;
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['steps']||'steps'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
    .then(function(r){return r.json();}).then(function(steps){
      if(!steps || !steps.length) return;
      var idx = 0;
      var overlay = document.getElementById('nk-wt-overlay');
      var spot = document.getElementById('nk-wt-spot');
      document.getElementById('nk-wt-total').textContent = steps.length;
      function paint(){
        var s = steps[idx]; if(!s) return done();
        document.getElementById('nk-wt-cur').textContent = idx + 1;
        document.getElementById('nk-wt-title').textContent = s.title || '';
        document.getElementById('nk-wt-body').textContent = s.body || '';
        document.getElementById('nk-wt-next').textContent = (idx === steps.length - 1) ? '{{config.doneLabel}}' : 'Next →';
        var t = s.target_selector ? document.querySelector(s.target_selector) : null;
        if(t && t !== document.body){
          var r = t.getBoundingClientRect();
          spot.style.display = 'block';
          spot.style.top = (r.top - 6) + 'px';
          spot.style.left = (r.left - 6) + 'px';
          spot.style.width = (r.width + 12) + 'px';
          spot.style.height = (r.height + 12) + 'px';
        } else { spot.style.display = 'none'; }
      }
      function done(){
        overlay.style.display = 'none'; spot.style.display = 'none';
        localStorage.setItem('nk-wt-done', '1');
        fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['complete']||'complete'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({fingerprint: navigator.userAgent.slice(0,80)}) });
      }
      document.getElementById('nk-wt-next').addEventListener('click', function(){ idx++; if(idx >= steps.length) done(); else paint(); });
      document.getElementById('nk-wt-skip').addEventListener('click', done);
      overlay.style.display = 'flex';
      paint();
    });
})();</script>`,
    },
    {
      slug: "walkthrough-admin",
      title: "Edit walkthrough",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Walkthrough steps</h1>
<form data-nk-form="" data-nk-flow-ref="add-step" class="card p-3 shadow-sm mt-3">
  <input name="title" class="form-control mb-2" placeholder="Step title" required/>
  <textarea name="body" class="form-control mb-2" rows="2" placeholder="Body copy" required></textarea>
  <input name="target_selector" class="form-control mb-2 font-monospace" placeholder="CSS selector (e.g. .nav-cta)"/>
  <input name="sort_order" type="number" class="form-control mb-2" placeholder="Sort order"/>
  <button class="btn btn-primary mt-1" type="submit">Add step</button>
</form>
<div data-nk-bind-flow-ref="steps" data-nk-refresh="15000" class="mt-3">
  <div class="d-flex gap-3 align-items-center p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div class="badge bg-info">#<span data-nk-field="sort_order">1</span></div><div class="flex-grow-1"><div class="fw-bold" data-nk-field="title">Title</div><div class="small" style="color:var(--nk-text-muted);"><code data-nk-field="target_selector">selector</code></div></div></div>
</div>
</div></section>`,
    },
  ],
};
