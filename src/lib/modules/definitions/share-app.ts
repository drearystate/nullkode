import type { ModuleDefinition } from "../types";

export const shareApp: ModuleDefinition = {
  id: "share-app",
  name: "Share App",
  tagline: "Native-share buttons & shareable cards",
  description:
    "A drop-in 'Share this app' page with native Web Share API (mobile), copy-to-clipboard, and pre-built share links for Twitter/X, Facebook, WhatsApp, Email and LinkedIn. Tracks every share by destination so you can see which channels work.",
  icon: "",
  color: "from-sky-500 to-blue-700",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "appName", label: "App name", type: "text", default: "Our app", required: true },
    { key: "appUrl", label: "Share URL", type: "url", default: "https://example.com", required: true },
    { key: "shareText", label: "Default share text", type: "text", default: "Check out this app I'm using —" },
  ],
  tables: [
    {
      name: "shares",
      fields: [
        { name: "destination", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "log",
      name: "Log a share click",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "shares", values: { destination: "{{trigger.destination}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "stats",
      name: "Share stats",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "shares", limit: 5000, output: "rows" } },
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
      slug: "share",
      title: "Share",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:520px;text-align:center;">
<div class="display-1"></div>
<h1 class="display-4 fw-bold">Share {{config.appName}}</h1>
<p class="lead" style="color:var(--nk-text-muted);">Loved using it? Tell a friend.</p>

<div class="card p-4 mt-4 shadow-sm text-start">
  <div class="d-flex gap-2"><input id="nk-share-url" class="form-control font-monospace small" readonly value="{{config.appUrl}}"/><button class="btn btn-primary" id="nk-copy" type="button">Copy</button></div>
  <button class="btn btn-dark w-100 mt-3" id="nk-native" type="button"> Share via my device</button>
</div>

<div class="row g-2 mt-3">
  <div class="col-6"><a class="btn btn-outline-primary w-100" data-nk-share="twitter" target="_blank">𝕏 Twitter</a></div>
  <div class="col-6"><a class="btn btn-outline-primary w-100" data-nk-share="facebook" target="_blank"> Facebook</a></div>
  <div class="col-6"><a class="btn btn-outline-success w-100" data-nk-share="whatsapp" target="_blank"> WhatsApp</a></div>
  <div class="col-6"><a class="btn btn-outline-info w-100" data-nk-share="linkedin" target="_blank"> LinkedIn</a></div>
  <div class="col-12"><a class="btn btn-outline-secondary w-100" data-nk-share="email" target="_blank"> Email</a></div>
</div>

<h5 class="fw-bold mt-5">Share stats</h5>
<div id="nk-share-stats" class="small mt-2" style="color:var(--nk-text-muted);">Loading…</div>

<script>(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  // Backtick strings, so an apostrophe in the app's settings ("I'm") can't
  // break the script.
  var appUrl = \`{{config.appUrl}}\`, appName = \`{{config.appName}}\`, shareText = \`{{config.shareText}}\`;
  var u = encodeURIComponent(appUrl);
  var t = encodeURIComponent(shareText + ' ' + appName);
  var hrefs = {
    twitter: 'https://twitter.com/intent/tweet?text=' + t + '%20' + u,
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u,
    whatsapp: 'https://wa.me/?text=' + t + '%20' + u,
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u,
    email: 'mailto:?subject=' + t + '&body=' + t + '%0A%0A' + u,
  };
  document.querySelectorAll('[data-nk-share]').forEach(function(a){
    var d = a.getAttribute('data-nk-share'); a.href = hrefs[d] || '#';
    a.addEventListener('click', function(){ fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['log']||'log'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({destination:d}) }); });
  });
  document.getElementById('nk-copy').addEventListener('click', function(){ var inp = document.getElementById('nk-share-url'); inp.select(); document.execCommand('copy'); this.textContent='Copied!'; fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['log']||'log'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({destination:'copy'})}); });
  document.getElementById('nk-native').addEventListener('click', function(){
    if(navigator.share){ navigator.share({title: appName, text: shareText, url: appUrl}).then(function(){ fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['log']||'log'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({destination:'native'})}); }).catch(function(){}); }
    else { (window.nkToast||alert)("Sharing straight from this device isn't available here. Use one of the buttons below."); }
  });
  fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['stats']||'stats'), { method:'POST', headers:{'content-type':'application/json'}, body:'{}' })
    .then(function(r){return r.json();}).then(function(rows){
      var c={}; (Array.isArray(rows)?rows:[]).forEach(function(r){ c[r.destination]=(c[r.destination]||0)+1; });
      var html = Object.entries(c).map(function(p){ return '<div class="d-flex justify-content-between border-bottom py-1"><span>'+esc(p[0])+'</span><span class="fw-bold">'+esc(p[1])+'</span></div>'; }).join('');
      document.getElementById('nk-share-stats').innerHTML = html || 'No shares yet — be the first.';
    });
})();</script>
</div></section>`,
    },
  ],
};
