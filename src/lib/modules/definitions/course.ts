import type { ModuleDefinition } from "../types";

export const course: ModuleDefinition = {
  id: "course",
  name: "Online Course",
  tagline: "Lessons list with video embeds",
  description:
    "A mini e-learning platform: sequenced lessons, each with a title, description, video URL and optional duration. Great for micro-courses and tutorials.",
  icon: "",
  color: "from-blue-600 to-indigo-700",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "courseTitle", label: "Course title", type: "text", default: "My Course", required: true },
    { key: "instructor", label: "Instructor name", type: "text", default: "The instructor" },
  ],
  tables: [
    {
      name: "lessons",
      fields: [
        { name: "number", type: "int" },
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "video_url", type: "text" },
        { name: "duration_minutes", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Lesson list",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "lessons", orderBy: "number asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add lesson",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "lessons", values: {
          number: "{{trigger.number}}",
          title: "{{trigger.title}}",
          description: "{{trigger.description}}",
          video_url: "{{trigger.video_url}}",
          duration_minutes: "{{trigger.duration_minutes}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "course",
      title: "Course",
      html: `<section class="py-5" style="background:color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg));color:#fff;"><div class="container"><h1 class="display-4 fw-bold">{{config.courseTitle}}</h1><p class="lead" style="color:rgba(255,255,255,0.5);">Taught by {{config.instructor}}</p></div></section>
<section class="py-5"><div class="container" style="max-width:860px;">
<div data-nk-bind-flow-ref="feed">
  <div class="card border-0 shadow-sm mb-3" data-nk-item><div class="card-body p-4 d-flex gap-4 align-items-start"><div class="display-4 fw-bold" style="color:var(--nk-text-muted);min-width:70px;">0<span data-nk-field="number">1</span></div><div class="flex-grow-1"><h5 class="fw-bold" data-nk-field="title">Welcome & course overview</h5><p class="small mb-2" style="color:var(--nk-text-muted);" data-nk-field="description">What to expect, how to get the most out of this course.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> Video</span><span>⏱ <span data-nk-field="duration_minutes">8</span> min</span></div></div><button class="btn btn-outline-primary btn-sm">Watch</button></div></div>
  <div class="card border-0 shadow-sm mb-3"><div class="card-body p-4 d-flex gap-4 align-items-start"><div class="display-4 fw-bold" style="color:var(--nk-text-muted);min-width:70px;">02</div><div class="flex-grow-1"><h5 class="fw-bold">Core concepts explained</h5><p class="small mb-2" style="color:var(--nk-text-muted);">Foundational ideas we'll build on throughout the rest of the course.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> Video</span><span>⏱ 15 min</span></div></div><button class="btn btn-outline-primary btn-sm">Watch</button></div></div>
  <div class="card border-0 shadow-sm mb-3"><div class="card-body p-4 d-flex gap-4 align-items-start"><div class="display-4 fw-bold" style="color:var(--nk-text-muted);min-width:70px;">03</div><div class="flex-grow-1"><h5 class="fw-bold">Your first project</h5><p class="small mb-2" style="color:var(--nk-text-muted);">Hands-on walkthrough. Build something simple from scratch.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> Video</span><span>⏱ 22 min</span></div></div><button class="btn btn-outline-primary btn-sm">Watch</button></div></div>
  <div class="card border-0 shadow-sm mb-3"><div class="card-body p-4 d-flex gap-4 align-items-start"><div class="display-4 fw-bold" style="color:var(--nk-text-muted);min-width:70px;">04</div><div class="flex-grow-1"><h5 class="fw-bold">Going deeper</h5><p class="small mb-2" style="color:var(--nk-text-muted);">Advanced patterns and how to apply them to real-world problems.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> Video</span><span>⏱ 28 min</span></div></div><button class="btn btn-outline-primary btn-sm">Watch</button></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body p-4 d-flex gap-4 align-items-start"><div class="display-4 fw-bold" style="color:var(--nk-text-muted);min-width:70px;">05</div><div class="flex-grow-1"><h5 class="fw-bold">Wrap-up & next steps</h5><p class="small mb-2" style="color:var(--nk-text-muted);">Where to go from here, plus a quick recap of the main ideas.</p><div class="d-flex gap-3 small" style="color:var(--nk-text-muted);"><span> Video</span><span>⏱ 12 min</span></div></div><button class="btn btn-outline-primary btn-sm">Watch</button></div></div>
</div>
</div></section>`,
    },
  ],
};
