import type { ModuleDefinition } from "../types";

export const guestbook: ModuleDefinition = {
  id: "guestbook",
  name: "Guestbook",
  tagline: "Visitors leave a note",
  description:
    "A classic guestbook where visitors leave their name and a short message. Newest first. Perfect for personal sites, memorials and event pages.",
  icon: "",
  color: "from-amber-600 to-yellow-700",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Heading", type: "text", default: "Sign the guestbook", required: true },
  ],
  tables: [
    {
      name: "entries",
      fields: [
        { name: "name", type: "text" },
        { name: "location", type: "text" },
        { name: "message", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "sign",
      name: "Sign guestbook",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "entries", values: {
          name: "{{trigger.name}}",
          location: "{{trigger.location}}",
          message: "{{trigger.message}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks for signing!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "feed",
      name: "Guestbook feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "entries", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "guestbook",
      title: "Guestbook",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="display-5 fw-bold">{{config.heading}}</h1><p style="color:var(--nk-text-muted);">Leave a note, say hello, or share a memory.</p>
<form data-nk-form="" data-nk-flow-ref="sign" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Where from?</label><input name="location" class="form-control" placeholder="City, country"/></div><div class="col-12"><label class="form-label">Message</label><textarea name="message" class="form-control" rows="4" required></textarea></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Sign the guestbook</button></div></div></form>
<div data-nk-bind-flow-ref="feed" class="mt-5">
  <div class="border-bottom py-4" data-nk-item><div class="d-flex justify-content-between align-items-baseline mb-1"><div class="fw-bold" data-nk-field="name">Marie from Paris</div><div class="small" style="color:var(--nk-text-muted);">2 hours ago</div></div><p class="mb-0" style="color:var(--nk-text-muted);" data-nk-field="message">Thank you for everything. Your work has meant so much to our family.</p></div>
  <div class="border-bottom py-4"><div class="d-flex justify-content-between align-items-baseline mb-1"><div class="fw-bold">Chen from Tokyo</div><div class="small" style="color:var(--nk-text-muted);">Yesterday</div></div><p class="mb-0" style="color:var(--nk-text-muted);">Just found this site and wanted to say hi. The stories here are amazing.</p></div>
  <div class="border-bottom py-4"><div class="d-flex justify-content-between align-items-baseline mb-1"><div class="fw-bold">Ana from Buenos Aires</div><div class="small" style="color:var(--nk-text-muted);">3 days ago</div></div><p class="mb-0" style="color:var(--nk-text-muted);">Saludos desde Argentina. Keep writing — it inspires so many of us.</p></div>
  <div class="py-4"><div class="d-flex justify-content-between align-items-baseline mb-1"><div class="fw-bold">James from New York</div><div class="small" style="color:var(--nk-text-muted);">Last week</div></div><p class="mb-0" style="color:var(--nk-text-muted);">Stumbled across this place by accident. I'm so glad I did.</p></div>
</div>
</div></section>`,
    },
  ],
};
