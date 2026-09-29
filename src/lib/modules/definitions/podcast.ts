import type { ModuleDefinition } from "../types";

export const podcast: ModuleDefinition = {
  id: "podcast",
  name: "Podcast",
  tagline: "Episode feed with audio player",
  description:
    "A podcast landing page with episodes list, each with a title, description, duration and audio URL. Visitors can play episodes right on the page.",
  icon: "",
  color: "from-purple-600 to-indigo-700",
  category: "media",
  version: "1.0.0",
  config: [
    { key: "showName", label: "Show name", type: "text", default: "The Podcast", required: true },
    { key: "tagline", label: "Show tagline", type: "text", default: "Conversations worth having" },
  ],
  tables: [
    {
      name: "episodes",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "audio_url", type: "text" },
        { name: "cover_url", type: "text" },
        { name: "duration", type: "text" },
        { name: "episode_number", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Episodes feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "episodes", orderBy: "episode_number desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add episode",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "episodes", values: {
          title: "{{trigger.title}}",
          description: "{{trigger.description}}",
          audio_url: "{{trigger.audio_url}}",
          cover_url: "{{trigger.cover_url}}",
          duration: "{{trigger.duration}}",
          episode_number: "{{trigger.episode_number}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "podcast",
      title: "Podcast",
      html: `<section class="py-5" style="background:radial-gradient(circle at top,#3b0d7a 0%,#0a0a14 70%);color:#fff;"><div class="container text-center"><h1 class="display-3 fw-bold">{{config.showName}}</h1><p class="lead" style="color:rgba(255,255,255,0.5);">{{config.tagline}}</p></div></section>
<section class="py-5"><div class="container" style="max-width:820px;">
<div data-nk-bind-flow-ref="feed">
  <div class="card border-0 shadow-sm mb-3" data-nk-item>
    <div class="card-body p-4 d-flex gap-4 align-items-start">
      <img class="rounded" style="width:100px;height:100px;object-fit:cover;" data-nk-src="cover_url" src="https://picsum.photos/seed/ep1/200/200" alt=""/>
      <div class="flex-grow-1">
        <div class="small" style="color:var(--nk-text-muted);">Episode #<span data-nk-field="episode_number">12</span> · <span data-nk-field="duration">42 min</span></div>
        <h5 class="fw-bold mt-1" data-nk-field="title">How we built our first product</h5>
        <p class="small mb-2" style="color:var(--nk-text-muted);" data-nk-field="description">A deep dive into the architecture, the tradeoffs and what we'd do differently.</p>
        <button class="btn btn-primary btn-sm">&#9654; Play episode</button>
      </div>
    </div>
  </div>
  <div class="card border-0 shadow-sm mb-3"><div class="card-body p-4 d-flex gap-4 align-items-start"><img class="rounded" style="width:100px;height:100px;object-fit:cover;" src="https://picsum.photos/seed/ep2/200/200" alt=""/><div class="flex-grow-1"><div class="small" style="color:var(--nk-text-muted);">Episode #11 · 38 min</div><h5 class="fw-bold mt-1">Interview: A founder's story</h5><p class="small mb-2" style="color:var(--nk-text-muted);">How one indie maker turned a side project into their full-time gig.</p><button class="btn btn-primary btn-sm">&#9654; Play episode</button></div></div></div>
  <div class="card border-0 shadow-sm mb-3"><div class="card-body p-4 d-flex gap-4 align-items-start"><img class="rounded" style="width:100px;height:100px;object-fit:cover;" src="https://picsum.photos/seed/ep3/200/200" alt=""/><div class="flex-grow-1"><div class="small" style="color:var(--nk-text-muted);">Episode #10 · 51 min</div><h5 class="fw-bold mt-1">No-code vs. no-limits</h5><p class="small mb-2" style="color:var(--nk-text-muted);">The tradeoffs of low-code tools and when code is still the right answer.</p><button class="btn btn-primary btn-sm">&#9654; Play episode</button></div></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body p-4 d-flex gap-4 align-items-start"><img class="rounded" style="width:100px;height:100px;object-fit:cover;" src="https://picsum.photos/seed/ep4/200/200" alt=""/><div class="flex-grow-1"><div class="small" style="color:var(--nk-text-muted);">Episode #9 · 34 min</div><h5 class="fw-bold mt-1">Shipping is a skill</h5><p class="small mb-2" style="color:var(--nk-text-muted);">Why the hardest part of building software is cutting scope.</p><button class="btn btn-primary btn-sm">&#9654; Play episode</button></div></div></div>
</div>
</div></section>`,
    },
  ],
};
