import type { ModuleDefinition } from "../types";

export const video: ModuleDefinition = {
  id: "video",
  name: "Video Library",
  tagline: "Embed YouTube / Vimeo videos",
  description:
    "A video gallery that embeds YouTube and Vimeo videos. Visitors see the thumbnail grid; clicking opens the player inline. Edit each video's title and description in the admin.",
  icon: "",
  color: "from-red-500 to-pink-600",
  category: "media",
  version: "1.0.0",
  config: [
    { key: "title", label: "Library title", type: "text", default: "Videos", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "embed_url", type: "text" },
        { name: "thumbnail_url", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Video feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add video",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          title: "{{trigger.title}}",
          description: "{{trigger.description}}",
          embed_url: "{{trigger.embed_url}}",
          thumbnail_url: "{{trigger.thumbnail_url}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "videos",
      title: "Videos",
      html: `<section class="py-5" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;"><div class="container text-center"><h1 class="display-4 fw-bold">{{config.title}}</h1></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-4" data-nk-item>
    <div class="card h-100 border-0 shadow-sm" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;">
      <div class="position-relative" style="aspect-ratio:16/9;overflow:hidden;">
        <img class="w-100 h-100" style="object-fit:cover;" data-nk-src="thumbnail_url" src="/media/generated/saas-team-workspace.webp" alt=""/>
        <div class="position-absolute top-50 start-50 translate-middle rounded-circle bg-opacity-75 d-flex align-items-center justify-content-center" style="width:64px;height:64px;color:#000;font-size:24px;background:#fff;">&#9654;</div>
      </div>
      <div class="card-body">
        <h5 class="card-title fw-bold" data-nk-field="title">Product demo walkthrough</h5>
        <p class="card-text small" style="color:rgba(255,255,255,0.5);" data-nk-field="description">A 5-minute tour of the new features and how to get the most out of them.</p>
      </div>
    </div>
  </div>
  <div class="col-md-4"><div class="card h-100 border-0 shadow-sm" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;"><div class="position-relative" style="aspect-ratio:16/9;overflow:hidden;"><img class="w-100 h-100" style="object-fit:cover;" src="/media/generated/coworking-collaborative-table.webp" alt=""/><div class="position-absolute top-50 start-50 translate-middle rounded-circle bg-opacity-75 d-flex align-items-center justify-content-center" style="width:64px;height:64px;color:#000;font-size:24px;background:#fff;">&#9654;</div></div><div class="card-body"><h5 class="card-title fw-bold">Customer story: Acme</h5><p class="card-text small" style="color:rgba(255,255,255,0.5);">How Acme cut their onboarding from a week to an afternoon.</p></div></div></div>
  <div class="col-md-4"><div class="card h-100 border-0 shadow-sm" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;"><div class="position-relative" style="aspect-ratio:16/9;overflow:hidden;"><img class="w-100 h-100" style="object-fit:cover;" src="/media/generated/photography-portrait-studio.webp" alt=""/><div class="position-absolute top-50 start-50 translate-middle rounded-circle bg-opacity-75 d-flex align-items-center justify-content-center" style="width:64px;height:64px;color:#000;font-size:24px;background:#fff;">&#9654;</div></div><div class="card-body"><h5 class="card-title fw-bold">Behind the scenes</h5><p class="card-text small" style="color:rgba(255,255,255,0.5);">Our team walks through how we approach design and engineering.</p></div></div></div>
</div>
</div></section>`,
    },
    {
      slug: "videos-admin",
      title: "Add video",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">Add a video</h1><form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-12"><label class="form-label">Title</label><input name="title" class="form-control" required/></div><div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="3"></textarea></div><div class="col-12"><label class="form-label">Embed URL (YouTube or Vimeo)</label><input name="embed_url" type="url" class="form-control" placeholder="https://www.youtube.com/embed/..." required/></div><div class="col-12"><label class="form-label">Thumbnail URL</label><input name="thumbnail_url" type="url" class="form-control"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add</button></div></div></form></div></section>`,
    },
  ],
};
