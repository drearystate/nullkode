import type { ModuleDefinition } from "../types";

export const gallery: ModuleDefinition = {
  id: "gallery",
  name: "Photo Gallery",
  tagline: "Show off a collection of images",
  description:
    "A responsive image gallery with title, caption and image URL per item. Comes with an upload page for adding new photos by URL.",
  icon: "",
  color: "from-pink-500 to-rose-600",
  category: "media",
  version: "1.0.0",

  config: [
    {
      key: "galleryTitle",
      label: "Gallery title",
      type: "text",
      default: "Gallery",
      required: true,
    },
    {
      key: "galleryIntro",
      label: "Short intro",
      type: "text",
      default: "A collection of recent work.",
    },
  ],

  tables: [
    {
      name: "photos",
      fields: [
        { name: "title", type: "text" },
        { name: "caption", type: "text" },
        { name: "image_url", type: "text" },
      ],
    },
  ],

  flows: [
    {
      slug: "add",
      name: "Add photo",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "photos",
            values: {
              title: "{{trigger.title}}",
              caption: "{{trigger.caption}}",
              image_url: "{{trigger.image_url}}",
            },
            output: "photo",
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
      slug: "feed",
      name: "Photo feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "photos",
            orderBy: "created_at desc",
            limit: 200,
            output: "rows",
          },
        },
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
      slug: "gallery",
      title: "Gallery",
      html: `<section class="py-5">
  <div class="container">
    <div class="row justify-content-center text-center">
      <div class="col-lg-8">
        <h1 class="display-4 fw-bold">{{config.galleryTitle}}</h1>
        <p class="lead mt-3" style="color:var(--nk-text-muted);">{{config.galleryIntro}}</p>
      </div>
    </div>
    <div data-nk-bind-flow-ref="feed" class="row g-3 mt-4">
      <div class="col-md-4 col-6" data-nk-item>
        <figure class="m-0"><img class="img-fluid rounded shadow-sm" style="aspect-ratio:1/1;object-fit:cover;" data-nk-src="image_url" src="https://picsum.photos/seed/g1/400/400" alt=""/><figcaption class="small mt-2" style="color:var(--nk-text-muted);" data-nk-field="title">Sunset over the harbor</figcaption></figure>
      </div>
      <div class="col-md-4 col-6"><figure class="m-0"><img class="img-fluid rounded shadow-sm" style="aspect-ratio:1/1;object-fit:cover;" src="https://picsum.photos/seed/g2/400/400" alt=""/><figcaption class="small mt-2" style="color:var(--nk-text-muted);">City lights at night</figcaption></figure></div>
      <div class="col-md-4 col-6"><figure class="m-0"><img class="img-fluid rounded shadow-sm" style="aspect-ratio:1/1;object-fit:cover;" src="https://picsum.photos/seed/g3/400/400" alt=""/><figcaption class="small mt-2" style="color:var(--nk-text-muted);">Mountain reflections</figcaption></figure></div>
      <div class="col-md-4 col-6"><figure class="m-0"><img class="img-fluid rounded shadow-sm" style="aspect-ratio:1/1;object-fit:cover;" src="https://picsum.photos/seed/g4/400/400" alt=""/><figcaption class="small mt-2" style="color:var(--nk-text-muted);">Early morning fog</figcaption></figure></div>
      <div class="col-md-4 col-6"><figure class="m-0"><img class="img-fluid rounded shadow-sm" style="aspect-ratio:1/1;object-fit:cover;" src="https://picsum.photos/seed/g5/400/400" alt=""/><figcaption class="small mt-2" style="color:var(--nk-text-muted);">Autumn trail</figcaption></figure></div>
      <div class="col-md-4 col-6"><figure class="m-0"><img class="img-fluid rounded shadow-sm" style="aspect-ratio:1/1;object-fit:cover;" src="https://picsum.photos/seed/g6/400/400" alt=""/><figcaption class="small mt-2" style="color:var(--nk-text-muted);">Coastal cliffs</figcaption></figure></div>
    </div>
  </div>
</section>`,
    },
    {
      slug: "gallery-admin",
      title: "Add photo",
      html: `<section class="py-5">
  <div class="container">
    <h1 class="fw-bold">Add a photo</h1>
    <p style="color:var(--nk-text-muted);">Paste an image URL.</p>
    <form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Title</label>
          <input name="title" class="form-control" required/>
        </div>
        <div class="col-md-6">
          <label class="form-label">Caption</label>
          <input name="caption" class="form-control"/>
        </div>
        <div class="col-12">
          <label class="form-label">Image URL</label>
          <input name="image_url" type="url" class="form-control" placeholder="https://..." required/>
        </div>
        <div class="col-12 text-end">
          <button class="btn btn-primary" type="submit">Add to gallery</button>
        </div>
      </div>
    </form>
  </div>
</section>`,
    },
  ],
};
