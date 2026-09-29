import type { ModuleDefinition } from "../types";

export const fanwall: ModuleDefinition = {
  id: "fanwall",
  name: "Fanwall",
  tagline: "Public wall of posts from your community",
  description:
    "A single-thread public wall where visitors post short messages with their name and an optional image. Newest first. Similar to a Twitter/Facebook wall but without accounts.",
  icon: "",
  color: "from-pink-500 to-rose-600",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "wallTitle", label: "Wall title", type: "text", default: "Community Wall", required: true },
  ],
  tables: [
    {
      name: "posts",
      fields: [
        { name: "author", type: "text" },
        { name: "body", type: "text" },
        { name: "image_url", type: "text" },
        { name: "likes", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Wall feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "posts", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "post",
      name: "Post to wall",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "posts", values: {
          author: "{{trigger.author}}",
          body: "{{trigger.body}}",
          image_url: "{{trigger.image_url}}",
          likes: "0",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "wall",
      title: "Wall",
      html: `<section class="py-5"><div class="container" style="max-width:640px;"><h1 class="fw-bold">{{config.wallTitle}}</h1><p style="color:var(--nk-text-muted);">Say hi. Leave a message. Your post is public.</p><form data-nk-form="" data-nk-flow-ref="post" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-4"><input name="author" class="form-control" placeholder="Your name" required/></div><div class="col-md-8"><input name="body" class="form-control" placeholder="What's on your mind?" required/></div><div class="col-12"><input name="image_url" type="url" class="form-control" placeholder="Optional image URL"/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Post</button></div></div></form><div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="card border-0 shadow-sm mb-3" data-nk-item>
    <div class="card-body p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;background:var(--nk-primary);color:#fff;">A</div>
        <div class="fw-bold" data-nk-field="author">Alex</div>
        <div class="small ms-auto" style="color:var(--nk-text-muted);">2m ago</div>
      </div>
      <p class="mb-0" data-nk-field="body">Just joined! Excited to see what everyone's building around here.</p>
    </div>
  </div>
  <div class="card border-0 shadow-sm mb-3"><div class="card-body p-3"><div class="d-flex align-items-center gap-2 mb-2"><div class="rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;background:var(--nk-primary);color:#fff;">J</div><div class="fw-bold">Jordan</div><div class="small ms-auto" style="color:var(--nk-text-muted);">15m ago</div></div><p class="mb-0">Tried the shop module today — had a working store in 2 minutes. Actually amazed.</p></div></div>
  <div class="card border-0 shadow-sm mb-3"><div class="card-body p-3"><div class="d-flex align-items-center gap-2 mb-2"><div class="rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;background:var(--nk-primary);color:#fff;">T</div><div class="fw-bold">Taylor</div><div class="small ms-auto" style="color:var(--nk-text-muted);">1h ago</div></div><p class="mb-0">Anyone else building a personal portfolio? Would love to see what you've got.</p></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body p-3"><div class="d-flex align-items-center gap-2 mb-2"><div class="rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width:36px;height:36px;background:var(--nk-primary);color:#fff;">M</div><div class="fw-bold">Morgan</div><div class="small ms-auto" style="color:var(--nk-text-muted);">3h ago</div></div><p class="mb-0">Happy Friday everyone! Share what you shipped this week </p></div></div>
</div></div></section>`,
    },
  ],
};
