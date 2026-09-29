import type { ModuleDefinition } from "../types";

export const acknowledgments: ModuleDefinition = {
  id: "acknowledgments",
  name: "Acknowledgments",
  tagline: "Force-read messages with audit trail",
  description:
    "Publish a message (policy update, terms change, safety notice) that every visitor must explicitly acknowledge to dismiss. Each acknowledgment is logged with timestamp and (optional) user_id for audit. Admin sees real-time compliance counts.",
  icon: "",
  color: "from-red-600 to-rose-800",
  category: "communication",
  version: "1.0.0",
  worksWith: ["auth"],
  tables: [
    {
      name: "messages",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "active", type: "bool" },
      ],
      seed: [
        { title: "Updated Code of Conduct", body: "We've updated our community code of conduct effective today. Please review and acknowledge.", active: true },
      ],
    },
    {
      name: "acks",
      fields: [
        { name: "message_id", type: "text" },
        { name: "user_id", type: "text" },
        { name: "user_email", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "active",
      name: "Active messages",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "messages", where: { active: "true" }, orderBy: "created_at desc", limit: 20, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "ack",
      name: "Record an acknowledgment",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "acks",
            values: {
              message_id: "{{trigger.message_id}}",
              user_id: "{{trigger.user_id}}",
              user_email: "{{trigger.user_email}}",
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
      slug: "publish",
      name: "Publish a new message",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: { table: "messages", values: { title: "{{trigger.title}}", body: "{{trigger.body}}", active: "true" } },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "log",
      name: "Audit log",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "acks", orderBy: "created_at desc", limit: 500, output: "rows" } },
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
      slug: "acks",
      title: "Acknowledgments",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:560px;">
<h1 class="fw-bold">Required acknowledgments</h1>
<p style="color:var(--nk-text-muted);">You must acknowledge each message below before continuing.</p>
<div data-nk-bind-flow-ref="active" id="nk-ack-list">
  <div class="card p-4 shadow-sm mb-3" data-nk-item data-nk-row-id="{id}">
    <h4 class="fw-bold" data-nk-field="title">Title</h4>
    <p data-nk-field="body">Body of the message…</p>
    <form data-nk-form="" data-nk-flow-ref="ack" class="d-flex gap-2 align-items-end mt-2">
      <input type="hidden" name="message_id" data-nk-bind-id/>
      <div class="flex-grow-1"><label class="form-label small">Your email</label><input name="user_email" type="email" class="form-control" required/></div>
      <button class="btn btn-danger" type="submit">I acknowledge</button>
    </form>
  </div>
</div>
<script>document.addEventListener('submit', function(e){ var f=e.target.closest('form[data-nk-flow-ref="ack"]'); if(!f) return; var row=f.closest('[data-nk-item]'); var h=f.querySelector('[data-nk-bind-id]'); if(row && h) h.value = row.getAttribute('data-nk-row-id')||''; });</script>
</div></section>`,
    },
    {
      slug: "acks-admin",
      title: "Acknowledgment admin",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Compliance log</h1>
<form data-nk-form="" data-nk-flow-ref="publish" class="card p-3 shadow-sm mt-3">
  <h5 class="fw-bold">Publish a new required message</h5>
  <input name="title" class="form-control mb-2" placeholder="Title" required/>
  <textarea name="body" class="form-control" rows="3" placeholder="Body" required></textarea>
  <button class="btn btn-primary mt-2" type="submit">Publish</button>
</form>
<div data-nk-bind-flow-ref="log" data-nk-refresh="10000" class="mt-4 table-responsive"><table class="table align-middle small"><thead><tr><th>Email</th><th>Message #</th><th>When</th></tr></thead><tbody>
  <tr data-nk-item><td data-nk-field="user_email">email</td><td data-nk-field="message_id">1</td><td data-nk-field="created_at">just now</td></tr>
</tbody></table></div>
</div></section>`,
    },
  ],
};
