import type { ModuleDefinition } from "../types";

export const slider: ModuleDefinition = {
  id: "slider",
  name: "Image Slider",
  tagline: "Editable hero carousel",
  description:
    "A homepage hero carousel that an admin can edit without touching code. Add slides (image, headline, subhead, CTA button + link), reorder, and the public carousel autoplays. Built with vanilla JS — no carousel library dependency.",
  icon: "",
  color: "from-rose-400 to-orange-500",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "intervalMs", label: "Slide interval (ms)", type: "number", default: 5000 },
  ],
  tables: [
    {
      name: "slides",
      fields: [
        { name: "image_url", type: "text" },
        { name: "headline", type: "text" },
        { name: "subhead", type: "text" },
        { name: "cta_label", type: "text" },
        { name: "cta_url", type: "text" },
        { name: "sort_order", type: "int" },
      ],
      seed: [
        { image_url: "https://picsum.photos/seed/sl1/1600/700", headline: "Welcome to our shop", subhead: "Summer collection is here.", cta_label: "Shop now", cta_url: "/", sort_order: 1 },
        { image_url: "https://picsum.photos/seed/sl2/1600/700", headline: "Free delivery on orders $50+", subhead: "Across town, every day.", cta_label: "Browse", cta_url: "/", sort_order: 2 },
        { image_url: "https://picsum.photos/seed/sl3/1600/700", headline: "Build a custom set", subhead: "Pick three, save 20%.", cta_label: "Get started", cta_url: "/", sort_order: 3 },
      ],
    },
  ],
  flows: [
    {
      slug: "list",
      name: "List slides",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "slides", orderBy: "sort_order asc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "add",
      name: "Add slide",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "slides",
            values: {
              image_url: "{{trigger.image_url}}",
              headline: "{{trigger.headline}}",
              subhead: "{{trigger.subhead}}",
              cta_label: "{{trigger.cta_label}}",
              cta_url: "{{trigger.cta_url}}",
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
    {
      slug: "remove",
      name: "Remove slide",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "delete", data: { table: "slides", where: { id: "{{trigger.id}}" } } },
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
      slug: "slider",
      title: "Home",
      isHome: true,
      html: `<div id="nk-slider" data-nk-bind-flow-ref="list" style="position:relative;overflow:hidden;height:60vh;min-height:380px;background:#111;">
  <div data-nk-item style="position:absolute;inset:0;opacity:0;transition:opacity .6s;background-position:center;background-size:cover;" data-nk-bg-from="image_url">
    <div style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.6));"></div>
    <div class="container h-100 d-flex flex-column justify-content-center text-white position-relative">
      <h1 class="display-3 fw-bold" data-nk-field="headline">Headline</h1>
      <p class="lead" data-nk-field="subhead">Subhead</p>
      <a class="btn btn-light btn-lg mt-2 align-self-start" data-nk-href-from="cta_url" href="#"><span data-nk-field="cta_label">Learn more</span></a>
    </div>
  </div>
</div>
<script>(function(){
  function paint(){
    var slides = document.querySelectorAll('#nk-slider [data-nk-item]');
    slides.forEach(function(el){
      var src = (el.querySelector('[data-nk-field="image_url"]')||{}).textContent || el.getAttribute('data-nk-bg-from-url') || '';
      if(src && !el.dataset.nkBgSet){ el.style.backgroundImage = "url('"+src+"')"; el.dataset.nkBgSet='1'; }
      var u = (el.querySelector('[data-nk-href-from="cta_url"]'));
    });
    if(!slides.length) return;
    var idx = 0; slides[0].style.opacity = '1'; slides[0].style.zIndex = '2';
    setInterval(function(){
      slides[idx].style.opacity = '0'; slides[idx].style.zIndex = '1';
      idx = (idx + 1) % slides.length;
      slides[idx].style.opacity = '1'; slides[idx].style.zIndex = '2';
    }, {{config.intervalMs}});
  }
  setTimeout(paint, 600);
})();</script>
<section class="py-5"><div class="container"><h2 class="fw-bold">Welcome</h2><p style="color:var(--nk-text-muted);">Edit your slides at <a href="/slider-admin">/slider-admin</a>.</p></div></section>`,
    },
    {
      slug: "slider-admin",
      title: "Edit slides",
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="fw-bold">Edit hero slides</h1>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-3 shadow-sm mt-3">
  <div class="row g-3"><div class="col-md-8"><label class="form-label">Image URL</label><input name="image_url" type="url" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Sort order</label><input name="sort_order" type="number" class="form-control" value="99"/></div><div class="col-12"><label class="form-label">Headline</label><input name="headline" class="form-control" required/></div><div class="col-12"><label class="form-label">Subhead</label><input name="subhead" class="form-control"/></div><div class="col-md-6"><label class="form-label">Button label</label><input name="cta_label" class="form-control" placeholder="Shop now"/></div><div class="col-md-6"><label class="form-label">Button URL</label><input name="cta_url" type="url" class="form-control" placeholder="/products"/></div></div>
  <button class="btn btn-primary mt-3" type="submit">Add slide</button>
</form>
<h4 class="fw-bold mt-5">Current slides</h4>
<div data-nk-bind-flow-ref="list" data-nk-refresh="15000" class="mt-3">
  <div class="d-flex gap-3 align-items-center p-3 border rounded mb-2" style="background:var(--nk-surface);" data-nk-item><img style="width:120px;height:70px;object-fit:cover;border-radius:8px;" data-nk-src="image_url" src="https://picsum.photos/seed/x/300/180" alt=""/><div class="flex-grow-1"><div class="fw-bold" data-nk-field="headline">Headline</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="subhead">Subhead</div></div></div>
</div>
</div></section>`,
    },
  ],
};
