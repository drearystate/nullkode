import type { ModuleDefinition } from "../types";

export const scratchCard: ModuleDefinition = {
  id: "scratch-card",
  name: "Scratch Card",
  tagline: "Gamified scratch-to-reveal prize",
  description:
    "A scratch-off promo. Visitors enter their email, get a virtual scratch card; scratching reveals a random prize from your prize pool (weighted by stock). Each prize awarded is logged with the winner's email and code to claim it.",
  icon: "",
  color: "from-yellow-400 to-orange-600",
  category: "commerce",
  version: "1.0.0",
  config: [
    { key: "campaignName", label: "Campaign name", type: "text", default: "Black Friday scratch & win", required: true },
  ],
  tables: [
    {
      name: "prizes",
      fields: [
        { name: "label", type: "text" },
        { name: "code_prefix", type: "text" },
        { name: "weight", type: "int" },
        { name: "stock", type: "int" },
      ],
      seed: [
        { label: "10% off", code_prefix: "SAVE10", weight: 60, stock: 1000 },
        { label: "$5 store credit", code_prefix: "CREDIT5", weight: 30, stock: 300 },
        { label: "Free shipping", code_prefix: "FREESHIP", weight: 9, stock: 100 },
        { label: " Free gift!", code_prefix: "GIFT", weight: 1, stock: 5 },
      ],
    },
    {
      name: "wins",
      fields: [
        { name: "email", type: "text" },
        { name: "prize_id", type: "text" },
        { name: "code", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "spin",
      name: "Pick a random prize",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "prizes", where: { "stock >": "0" }, orderBy: "weight desc", limit: 100, output: "prizes" } },
        { id: "n3", type: "math", data: { expression: "weighted_random({{vars.prizes}}, 'weight')", output: "pick" } },
        { id: "n4", type: "math", data: { expression: "floor(random()*999999)+100000", output: "n" } },
        {
          id: "n5",
          type: "insert",
          data: {
            table: "wins",
            values: { email: "{{trigger.email}}", prize_id: "{{vars.pick.id}}", code: "{{vars.pick.code_prefix}}-{{vars.n}}" },
            output: "win",
          },
        },
        {
          id: "n6",
          type: "update",
          data: { table: "prizes", where: { id: "{{vars.pick.id}}" }, values: { stock: "{{vars.pick.stock}}-1" } },
        },
        { id: "n7", type: "response", data: { status: 200, body: '{"prize":"{{vars.pick.label}}","code":"{{vars.win.code}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n6", target: "n7" },
      ],
    },
    {
      slug: "winners",
      name: "Recent winners",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "wins", orderBy: "created_at desc", limit: 50, output: "rows" } },
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
      slug: "scratch",
      title: "Scratch & win",
      isHome: true,
      html: `<section class="py-5" style="background:linear-gradient(135deg,#f59e0b,#ef4444);min-height:80vh;color:#fff;"><div class="container py-4" style="max-width:480px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-3 fw-bold">{{config.campaignName}}</h1><p class="lead">Enter your email and scratch the card to reveal your prize.</p></div>
<form id="nk-scratch-form" class="card p-3 mt-4 shadow text-body"><div class="mb-2"><label class="form-label" for="nk-email">Email</label><input id="nk-email" type="email" class="form-control" autocomplete="email" required/></div><button class="btn btn-warning w-100 fw-bold" id="nk-start" type="button">Get my card</button></form>

<div id="nk-card-wrap" class="card p-3 mt-3 shadow text-center text-body" style="display:none;">
  <div class="position-relative" style="margin:auto;max-width:320px;">
    <div id="nk-prize" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;background:#fff;border-radius:12px;text-align:center;padding:1rem;">…</div>
    <canvas id="nk-scratch" width="320" height="200" style="display:block;border-radius:12px;background:#9ca3af;cursor:grab;touch-action:none;"></canvas>
  </div>
  <p class="mt-2 small" style="color:var(--nk-text-muted);">Scratch with your finger or mouse.</p>
  <div id="nk-code" class="mt-2 fw-bold fs-4 font-monospace"></div>
</div>
</div>
<script>(function(){
  document.getElementById('nk-start').addEventListener('click', function(){
    var email = document.getElementById('nk-email').value; if(!email){ (window.nkToast||alert)('Please enter your email first.'); return; }
    fetch('/api/run/' + ((window.__nkFlowSlugMap||{})['spin']||'spin'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email:email}) })
      .then(function(r){return r.json();}).then(function(d){
        if(!d || d.error){ (window.nkToast||alert)(d && typeof d.error === 'string' ? d.error : "Sorry, that didn't work. Please try again."); return; }
        document.getElementById('nk-scratch-form').style.display = 'none';
        document.getElementById('nk-card-wrap').style.display = 'block';
        document.getElementById('nk-prize').textContent = d.prize || '—';
        document.getElementById('nk-code').textContent = d.code || '';
        setTimeout(initScratch, 100);
      });
  });
  function initScratch(){
    var c = document.getElementById('nk-scratch'); var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0,0,c.width,c.height);
    g.addColorStop(0,'#cbd5e1'); g.addColorStop(1,'#94a3b8');
    ctx.fillStyle = g; ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign='center';
    ctx.fillText('Scratch here!', c.width/2, c.height/2 + 8);
    ctx.globalCompositeOperation = 'destination-out';
    var down = false;
    function pt(e){ var r = c.getBoundingClientRect(); var t = e.touches?e.touches[0]:e; return {x:t.clientX-r.left, y:t.clientY-r.top}; }
    function draw(p){ ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI*2); ctx.fill(); }
    c.addEventListener('mousedown', function(e){ down=true; draw(pt(e)); });
    c.addEventListener('mousemove', function(e){ if(down) draw(pt(e)); });
    c.addEventListener('touchstart', function(e){ down=true; draw(pt(e)); e.preventDefault(); }, {passive:false});
    c.addEventListener('touchmove', function(e){ if(down) draw(pt(e)); e.preventDefault(); }, {passive:false});
    ['mouseup','mouseleave','touchend'].forEach(function(ev){ c.addEventListener(ev, function(){ down=false; }); });
  }
})();</script>
</div></section>`,
    },
    {
      slug: "scratch-winners",
      title: "Winners",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="fw-bold">Recent winners</h1>
<div data-nk-bind-flow-ref="winners" data-nk-refresh="15000" class="mt-3">
  <div class="d-flex justify-content-between p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><span data-nk-field="email">winner@example.com</span><code data-nk-field="code">SAVE10-123456</code></div>
</div>
</div></section>`,
    },
  ],
};
