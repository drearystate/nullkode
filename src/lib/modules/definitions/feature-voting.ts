import type { ModuleDefinition } from "../types";

export const featureVoting: ModuleDefinition = {
  id: "feature-voting",
  name: "Feature Voting",
  tagline: "Let users submit and upvote ideas",
  description:
    "Public feature request board where users post ideas and upvote others. Product teams use it to prioritize what to build next.",
  icon: "",
  color: "from-violet-500 to-purple-600",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "productName", label: "Product name", type: "text", default: "the product", required: true },
  ],
  tables: [
    {
      name: "features",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "author_name", type: "text" },
        { name: "status", type: "text" },
        { name: "votes", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Feature feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "features", orderBy: "votes desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "submit",
      name: "Submit feature",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "features", values: {
          title: "{{trigger.title}}",
          description: "{{trigger.description}}",
          author_name: "{{trigger.author_name}}",
          status: "open",
          votes: "1",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks for the idea!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "roadmap",
      title: "Roadmap",
      html: `<section class="py-5"><div class="container" style="max-width:800px;"><h1 class="display-5 fw-bold">What should we build next for {{config.productName}}?</h1><p class="lead" style="color:var(--nk-text-muted);">Submit an idea, upvote the ones you want, watch us build.</p>
<form data-nk-form="" data-nk-flow-ref="submit" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-5"><input name="title" class="form-control" placeholder="Your idea in one line" required/></div><div class="col-md-4"><input name="description" class="form-control" placeholder="Why is it important?"/></div><div class="col-md-2"><input name="author_name" class="form-control" placeholder="Your name"/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit">Post</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body d-flex gap-3 align-items-start"><button class="btn btn-outline-primary d-flex flex-column align-items-center" style="min-width:64px;"><span style="font-size:20px;">▲</span><span class="fw-bold" data-nk-field="votes">142</span></button><div class="flex-grow-1"><h5 class="fw-bold mb-1" data-nk-field="title">Dark mode for the dashboard</h5><p class="small mb-1" style="color:var(--nk-text-muted);" data-nk-field="description">The rest of our tools all have dark mode. It's 2026.</p><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="author_name">priya@daylight.studio</span> · <span class="badge" style="background:var(--nk-primary);" data-nk-field="status">planned</span></div></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex gap-3 align-items-start"><button class="btn btn-outline-primary d-flex flex-column align-items-center" style="min-width:64px;"><span style="font-size:20px;">▲</span><span class="fw-bold">98</span></button><div class="flex-grow-1"><h5 class="fw-bold mb-1">Bulk actions in the admin</h5><p class="small mb-1" style="color:var(--nk-text-muted);">Let me archive / delete / tag multiple items at once.</p><div class="small" style="color:var(--nk-text-muted);">sam@bluebird.io · <span class="badge" style="background:var(--nk-primary);">under review</span></div></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex gap-3 align-items-start"><button class="btn btn-outline-primary d-flex flex-column align-items-center" style="min-width:64px;"><span style="font-size:20px;">▲</span><span class="fw-bold">67</span></button><div class="flex-grow-1"><h5 class="fw-bold mb-1">Keyboard shortcuts for navigation</h5><p class="small mb-1" style="color:var(--nk-text-muted);">Cmd+K for search. Tab to cycle fields. J/K to navigate lists.</p><div class="small" style="color:var(--nk-text-muted);">alex@acme.co · <span class="badge" style="background:color-mix(in srgb, var(--nk-text) 50%, var(--nk-bg));">open</span></div></div></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body d-flex gap-3 align-items-start"><button class="btn btn-outline-primary d-flex flex-column align-items-center" style="min-width:64px;"><span style="font-size:20px;">▲</span><span class="fw-bold">34</span></button><div class="flex-grow-1"><h5 class="fw-bold mb-1">Native mobile apps</h5><p class="small mb-1" style="color:var(--nk-text-muted);">The web app is great but I'd love to have this on my phone home screen.</p><div class="small" style="color:var(--nk-text-muted);">marcus@noon.com · <span class="badge" style="background:var(--nk-primary);">shipped</span></div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
