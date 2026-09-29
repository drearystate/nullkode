import type { ModuleDefinition } from "../types";

export const submissionsQueue: ModuleDefinition = {
  id: "submissions-queue",
  name: "Submissions Queue",
  tagline: "User submissions with admin moderation",
  description:
    "A Reddit-style submission flow: visitors submit content (title + body + optional image), it lands in a moderation queue, an admin approves/rejects, only approved items appear on the public feed. Tracks rejection reasons. Distinct from contact-form which is just an inbox.",
  icon: "",
  color: "from-blue-500 to-violet-700",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "feedHeading", label: "Public feed heading", type: "text", default: "From the community", required: true },
    { key: "guidelines", label: "Submission guidelines", type: "textarea", default: "Keep it friendly. Original content only. We review every submission before posting." },
  ],
  tables: [
    {
      name: "submissions",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "image_url", type: "text" },
        { name: "author_name", type: "text" },
        { name: "author_email", type: "text" },
        { name: "status", type: "text" },
        { name: "rejection_reason", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "submit",
      name: "Submit content",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "submissions",
            values: {
              title: "{{trigger.title}}",
              body: "{{trigger.body}}",
              image_url: "{{trigger.image_url}}",
              author_name: "{{trigger.author_name}}",
              author_email: "{{trigger.author_email}}",
              status: "pending",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks! Your submission is in the queue for review."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "approve",
      name: "Approve a submission",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "update", data: { table: "submissions", where: { id: "{{trigger.id}}" }, values: { status: "approved" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "reject",
      name: "Reject a submission",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "update",
          data: { table: "submissions", where: { id: "{{trigger.id}}" }, values: { status: "rejected", rejection_reason: "{{trigger.rejection_reason}}" } },
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
      name: "Public feed (approved only)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "submissions", where: { status: "approved" }, orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "queue",
      name: "Moderation queue (pending)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "submissions", where: { status: "pending" }, orderBy: "created_at asc", limit: 100, output: "rows" } },
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
      slug: "submissions",
      title: "Community feed",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="display-5 fw-bold">{{config.feedHeading}}</h1>
<a href="/submit" class="btn btn-primary mt-2">Submit something →</a>

<div data-nk-bind-flow-ref="feed" data-nk-refresh="60000" class="mt-4">
  <div class="card border-0 shadow-sm mb-3" data-nk-item><img class="card-img-top" data-nk-src="image_url" src="" alt="" onerror="this.style.display='none'"/><div class="card-body"><h5 class="fw-bold" data-nk-field="title">Title</h5><p data-nk-field="body">Body…</p><div class="small" style="color:var(--nk-text-muted);">— <span data-nk-field="author_name">author</span></div></div></div>
</div>
</div></section>`,
    },
    {
      slug: "submit",
      title: "Submit",
      html: `<section class="py-5"><div class="container" style="max-width:560px;">
<h1 class="fw-bold">Submit something</h1>
<div class="card p-3 mb-3" style="background:var(--nk-surface-2);"><p class="small mb-0" style="color:var(--nk-text-muted);">{{config.guidelines}}</p></div>
<form data-nk-form="" data-nk-flow-ref="submit" class="card p-4 shadow-sm">
  <div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="author_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="author_email" type="email" class="form-control" required/></div><div class="col-12"><label class="form-label">Title</label><input name="title" class="form-control" required/></div><div class="col-12"><label class="form-label">Image URL (optional)</label><input name="image_url" type="url" class="form-control"/></div><div class="col-12"><label class="form-label">Body</label><textarea name="body" class="form-control" rows="5" required></textarea></div></div>
  <button class="btn btn-primary btn-lg w-100 mt-4" type="submit">Submit for review</button>
  <div data-nk-success class="text-success small mt-2"></div>
</form>
</div></section>`,
    },
    {
      slug: "moderation",
      title: "Moderation queue",
      html: `<section class="py-5"><div class="container" style="max-width:880px;">
<h1 class="fw-bold">Moderation queue</h1>
<div data-nk-bind-flow-ref="queue" data-nk-refresh="10000" class="mt-3">
  <div class="card border-0 shadow-sm mb-3" data-nk-item data-nk-row-id="{id}"><div class="card-body"><div class="d-flex gap-3"><img class="rounded" style="width:80px;height:80px;object-fit:cover;flex-shrink:0;" data-nk-src="image_url" src="https://picsum.photos/seed/x/160/160" alt="" onerror="this.style.display='none'"/><div class="flex-grow-1"><h5 class="fw-bold" data-nk-field="title">Title</h5><div class="small" style="color:var(--nk-text-muted);">by <span data-nk-field="author_name">author</span></div><p class="mt-2" data-nk-field="body">Body</p></div></div>
  <div class="d-flex gap-2 mt-3">
    <form data-nk-form="" data-nk-flow-ref="approve"><input type="hidden" name="id" data-nk-bind-id/><button class="btn btn-success btn-sm" type="submit">✓ Approve</button></form>
    <form data-nk-form="" data-nk-flow-ref="reject" class="d-flex gap-2 flex-grow-1"><input type="hidden" name="id" data-nk-bind-id/><input name="rejection_reason" class="form-control form-control-sm" placeholder="Reason (sent to author)"/><button class="btn btn-outline-danger btn-sm" type="submit"> Reject</button></form>
  </div>
  </div></div>
</div>
<script>document.addEventListener('submit', function(e){ var f=e.target.closest('form[data-nk-form]'); if(!f) return; var row=f.closest('[data-nk-item]'); if(!row) return; var h=f.querySelector('[data-nk-bind-id]'); if(h) h.value = row.getAttribute('data-nk-row-id')||''; }, true);</script>
</div></section>`,
    },
  ],
};
