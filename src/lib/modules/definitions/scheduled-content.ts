import type { ModuleDefinition } from "../types";

export const scheduledContent: ModuleDefinition = {
  id: "scheduled-content",
  name: "Scheduled Content",
  tagline: "Draft now, publish at a future date",
  description:
    "Write content (title + body) in draft, set a publish_at timestamp, and it appears on the public feed only after that time. A 'publish-due' flow can be cron-pinged to physically flip drafts to live; the public feed also filters in real time.",
  icon: "⏳",
  color: "from-indigo-500 to-blue-700",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Feed heading", type: "text", default: "What's new", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "image_url", type: "text" },
        { name: "publish_at", type: "timestamp" },
        { name: "status", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "schedule",
      name: "Schedule a piece of content",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "items",
            values: {
              title: "{{trigger.title}}",
              body: "{{trigger.body}}",
              image_url: "{{trigger.image_url}}",
              publish_at: "{{trigger.publish_at}}",
              status: "scheduled",
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
      slug: "publish-due",
      name: "Flip everything that is due to live (cron)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "update",
          data: {
            table: "items",
            where: { status: "scheduled", "publish_at <=": "now" },
            values: { status: "live" },
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
      name: "Public feed (live items only)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", where: { status: "live", "publish_at <=": "now" }, orderBy: "publish_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "queue",
      name: "Admin: all items (drafts + live)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "publish_at desc", limit: 200, output: "rows" } },
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
      slug: "feed",
      title: "Feed",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">{{config.heading}}</h1>
<div data-nk-bind-flow-ref="feed" data-nk-refresh="60000" class="mt-3">
  <div class="card border-0 shadow-sm mb-3" data-nk-item><img class="card-img-top" data-nk-src="image_url" src="" alt="" onerror="this.style.display='none'"/><div class="card-body"><h4 class="fw-bold" data-nk-field="title">Title</h4><p data-nk-field="body">Body</p><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="publish_at">published</span></div></div></div>
</div>
</div></section>`,
    },
    {
      slug: "schedule",
      title: "Schedule content",
      html: `<section class="py-5"><div class="container" style="max-width:640px;"><h1 class="fw-bold">Schedule a post</h1>
<form data-nk-form="" data-nk-flow-ref="schedule" class="card p-3 shadow-sm mt-3">
  <input name="title" class="form-control mb-2" placeholder="Title" required/>
  <input name="image_url" type="url" class="form-control mb-2" placeholder="Image URL (optional)"/>
  <input name="publish_at" type="datetime-local" class="form-control mb-2" required/>
  <textarea name="body" class="form-control" rows="5" required></textarea>
  <button class="btn btn-primary mt-3" type="submit">Schedule</button>
</form>

<h4 class="fw-bold mt-5">Queue</h4>
<div data-nk-bind-flow-ref="queue" data-nk-refresh="15000" class="mt-2">
  <div class="d-flex justify-content-between align-items-center p-3 border rounded mb-2" data-nk-item style="background:var(--nk-surface);"><div><div class="fw-bold" data-nk-field="title">Title</div><div class="small" style="color:var(--nk-text-muted);">Publishes <span data-nk-field="publish_at">—</span></div></div><span class="badge" data-nk-field="status">scheduled</span></div>
</div>
<div class="card mt-4 p-3 border-0" style="background:var(--nk-surface-2);"><p class="small mb-0" style="color:var(--nk-text-muted);">Hit <code>/api/run/publish-due</code> from cron every minute to flip drafts to live as their time arrives.</p></div>
</div></section>`,
    },
  ],
};
