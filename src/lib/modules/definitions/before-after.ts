import type { ModuleDefinition } from "../types";

export const beforeAfter: ModuleDefinition = {
  id: "before-after",
  name: "Before / After Slider",
  tagline: "Drag the divider to compare two images",
  description:
    "Show off transformations. Each comparison has a 'before' and 'after' image; visitors drag a divider to wipe between them. Admin can add as many comparisons as they want. Great for renovations, fitness, hair, photo edits.",
  icon: "",
  color: "from-fuchsia-500 to-pink-700",
  category: "media",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Page heading", type: "text", default: "Before & after", required: true },
  ],
  tables: [
    {
      name: "comparisons",
      fields: [
        { name: "title", type: "text" },
        { name: "caption", type: "text" },
        { name: "before_url", type: "text" },
        { name: "after_url", type: "text" },
      ],
      seed: [
        { title: "Kitchen renovation", caption: "Three-day refresh", before_url: "https://picsum.photos/seed/before1/800/500", after_url: "https://picsum.photos/seed/after1/800/500" },
        { title: "Portrait edit", caption: "Color grade + skin retouch", before_url: "https://picsum.photos/seed/before2/800/500", after_url: "https://picsum.photos/seed/after2/800/500" },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List comparisons",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "comparisons", orderBy: "created_at desc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add",
      name: "Add a comparison",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "comparisons",
            values: {
              title: "{{trigger.title}}",
              caption: "{{trigger.caption}}",
              before_url: "{{trigger.before_url}}",
              after_url: "{{trigger.after_url}}",
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
      slug: "ba",
      title: "Before & after",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:880px;">
<h1 class="display-5 fw-bold">{{config.heading}}</h1>
<div data-nk-bind-flow-ref="list" data-nk-refresh="60000" id="nk-ba" class="mt-4">
  <div class="mb-5" data-nk-item>
    <h4 class="fw-bold" data-nk-field="title">Title</h4>
    <p class="small" style="color:var(--nk-text-muted);" data-nk-field="caption">Caption</p>
    <div class="nk-ba-frame" style="position:relative;overflow:hidden;user-select:none;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.15);aspect-ratio:16/10;background:#000;">
      <img style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" data-nk-src="after_url" src="https://picsum.photos/seed/a/800/500"/>
      <div class="nk-ba-before" style="position:absolute;inset:0;width:50%;overflow:hidden;"><img style="position:absolute;inset:0;width:200%;height:100%;object-fit:cover;" data-nk-src="before_url" src="https://picsum.photos/seed/b/800/500"/></div>
      <div class="nk-ba-handle" style="position:absolute;top:0;bottom:0;left:50%;width:4px;background:#fff;cursor:ew-resize;box-shadow:0 0 6px rgba(0,0,0,.4);"><div style="position:absolute;top:50%;left:-14px;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;">↔</div></div>
      <span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,.6);color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">BEFORE</span>
      <span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">AFTER</span>
    </div>
  </div>
</div>
<script>(function(){
  function init(frame){
    var before = frame.querySelector('.nk-ba-before'); var handle = frame.querySelector('.nk-ba-handle');
    var down = false;
    function setX(x){
      var r = frame.getBoundingClientRect(); var px = Math.max(0, Math.min(r.width, x - r.left));
      var pct = (px / r.width) * 100;
      before.style.width = pct + '%'; handle.style.left = pct + '%';
    }
    function move(e){ if(!down) return; var t = e.touches ? e.touches[0] : e; setX(t.clientX); e.preventDefault(); }
    function dn(e){ down = true; move(e); }
    function up(){ down = false; }
    frame.addEventListener('mousedown', dn); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    frame.addEventListener('touchstart', dn); window.addEventListener('touchmove', move, {passive:false}); window.addEventListener('touchend', up);
  }
  function refresh(){ document.querySelectorAll('#nk-ba .nk-ba-frame').forEach(function(f){ if(!f.dataset.nkInit){ init(f); f.dataset.nkInit='1'; } }); }
  new MutationObserver(refresh).observe(document.getElementById('nk-ba'), { childList:true, subtree:true });
  setTimeout(refresh, 500);
})();</script>
</div></section>`,
    },
    {
      slug: "ba-admin",
      title: "Add comparison",
      html: `<section class="py-5"><div class="container" style="max-width:560px;"><h1 class="fw-bold">Add before / after</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 shadow-sm mt-3">
  <div class="mb-2"><label class="form-label">Title</label><input name="title" class="form-control" required/></div>
  <div class="mb-2"><label class="form-label">Caption</label><input name="caption" class="form-control"/></div>
  <div class="mb-2"><label class="form-label">Before image URL</label><input name="before_url" type="url" class="form-control" required/></div>
  <div class="mb-2"><label class="form-label">After image URL</label><input name="after_url" type="url" class="form-control" required/></div>
  <button class="btn btn-primary mt-2" type="submit">Add</button>
</form>
</div></section>`,
    },
  ],
};
