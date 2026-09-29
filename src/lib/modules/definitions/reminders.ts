import type { ModuleDefinition } from "../types";

export const reminders: ModuleDefinition = {
  id: "reminders",
  name: "Reminders",
  tagline: "Schedule one-off email reminders",
  description:
    "Let users (or admins) schedule a reminder: 'email me X at 4pm Friday.' Reminders are stored with a due-at time and an email body; a separate worker (or manual 'send due now' flow) fires them when they're due.",
  icon: "⏰",
  color: "from-amber-500 to-yellow-600",
  category: "productivity",
  version: "1.0.0",
  requires: ["email"],
  config: [
    { key: "fromEmail", label: "Send from", type: "text", default: "no-reply@example.com", required: true },
  ],
  tables: [
    {
      name: "reminders",
      fields: [
        { name: "email", type: "text" },
        { name: "subject", type: "text" },
        { name: "body", type: "text" },
        { name: "due_at", type: "timestamp" },
        { name: "sent_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "schedule",
      name: "Schedule a reminder",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "reminders",
            values: {
              email: "{{trigger.email}}",
              subject: "{{trigger.subject}}",
              body: "{{trigger.body}}",
              due_at: "{{trigger.due_at}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Reminder scheduled."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "send-due",
      name: "Send all reminders that are due (cron / manual)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "reminders", where: { sent_at: "", "due_at <=": "now" }, limit: 50, output: "rows" },
        },
        {
          id: "n3",
          type: "email",
          data: {
            from: "{{config.fromEmail}}",
            to: "{{vars.rows.0.email}}",
            subject: "{{vars.rows.0.subject}}",
            body: "{{vars.rows.0.body}}",
          },
        },
        {
          id: "n4",
          type: "update",
          data: { table: "reminders", where: { id: "{{vars.rows.0.id}}" }, values: { sent_at: "now" } },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"sent":1}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "list",
      name: "List upcoming reminders",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "reminders", orderBy: "due_at asc", limit: 100, output: "rows" } },
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
      slug: "reminders",
      title: "Reminders",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:720px;">
<div class="text-center"><div class="display-1">⏰</div><h1 class="display-4 fw-bold">Set a reminder</h1><p class="lead" style="color:var(--nk-text-muted);">We'll email you when it's time.</p></div>

<form data-nk-form="" data-nk-flow-ref="schedule" class="card p-4 mt-4 shadow-sm">
  <div class="row g-3">
    <div class="col-md-6"><label class="form-label">Send to</label><input name="email" type="email" class="form-control" required/></div>
    <div class="col-md-6"><label class="form-label">When</label><input name="due_at" type="datetime-local" class="form-control" required/></div>
    <div class="col-12"><label class="form-label">Subject</label><input name="subject" class="form-control" placeholder="Pick up dry cleaning" required/></div>
    <div class="col-12"><label class="form-label">Note (sent in the email body)</label><textarea name="body" class="form-control" rows="3"></textarea></div>
    <div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Schedule reminder</button></div>
    <div data-nk-error class="col-12 text-danger small"></div>
  </div>
</form>

<h4 class="fw-bold mt-5">Upcoming</h4>
<div data-nk-bind-flow-ref="list" data-nk-refresh="30000" class="mt-3">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item>
    <div class="fs-3">⏰</div>
    <div class="flex-grow-1"><div class="fw-bold" data-nk-field="subject">Submit timesheet</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="email">you@example.com</span> · due <span data-nk-field="due_at">Fri 4pm</span></div></div>
  </div>
</div>

<div class="card mt-4 p-3 border-0" style="background:var(--nk-surface-2);">
  <p class="small mb-0" style="color:var(--nk-text-muted);"><strong>How to deliver:</strong> point an external cron at <code>/api/run/send-due</code> every minute (or hit it from your worker). Each call sends one due reminder; loop the endpoint to drain the queue.</p>
</div>
</div></section>`,
    },
  ],
};
