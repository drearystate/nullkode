import type { ModuleDefinition } from "../types";

export const birthdays: ModuleDefinition = {
  id: "birthdays",
  name: "Birthdays",
  tagline: "Collect DOBs, auto-celebrate users",
  description:
    "Collect users' birthdays, then auto-email anyone whose birthday is today. Useful for customer love (a 'happy birthday' note + discount code) or for team/HR pages. Pair with a daily cron pointing at /api/run/send-today.",
  icon: "",
  color: "from-pink-400 to-rose-600",
  category: "community",
  version: "1.0.0",
  requires: ["email"],
  config: [
    { key: "fromEmail", label: "Send from", type: "text", default: "no-reply@example.com", required: true },
    { key: "subject", label: "Email subject", type: "text", default: "Happy birthday ", required: true },
    { key: "body", label: "Email body (use {{name}} placeholder)", type: "textarea", default: "Hi {{name}}, wishing you an amazing birthday! Use code BDAY20 for 20% off anything today.", required: true },
  ],
  tables: [
    {
      name: "people",
      fields: [
        { name: "name", type: "text" },
        { name: "email", type: "text" },
        { name: "birthday", type: "text" },
      ],
    },
    {
      name: "sent",
      fields: [
        { name: "person_id", type: "text" },
        { name: "year", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "add",
      name: "Add a person",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "people",
            values: { name: "{{trigger.name}}", email: "{{trigger.email}}", birthday: "{{trigger.birthday}}" },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"You\\u2019re on the list."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "All birthdays",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "people", orderBy: "birthday asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "today",
      name: "Whose birthday is today",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "people", where: { "month_day(birthday)": "today" }, limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "send-today",
      name: "Email everyone whose birthday is today",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "people", where: { "month_day(birthday)": "today" }, limit: 1, output: "p" } },
        { id: "n3", type: "branch", data: { left: "{{vars.p.0.id}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "email",
          data: {
            from: "{{config.fromEmail}}",
            to: "{{vars.p.0.email}}",
            subject: "{{config.subject}}",
            body: "{{config.body|name={{vars.p.0.name}}}}",
          },
        },
        { id: "n5", type: "insert", data: { table: "sent", values: { person_id: "{{vars.p.0.id}}", year: "year(now)" } } },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"sent":1}' } },
        { id: "n7", type: "response", data: { status: 200, body: '{"ok":true,"sent":0}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n3", target: "n7", sourceHandle: "false" },
      ],
    },
  ],
  pages: [
    {
      slug: "birthdays",
      title: "Birthdays",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:680px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">Tell us when to celebrate</h1><p class="lead" style="color:var(--nk-text-muted);">We'll send you something nice on the day.</p></div>
<form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm">
  <div class="row g-3"><div class="col-md-6"><label class="form-label">Name</label><input name="name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-12"><label class="form-label">Birthday</label><input name="birthday" type="date" class="form-control" required/></div></div>
  <button class="btn btn-primary btn-lg w-100 mt-4" type="submit">Add me </button>
</form>

<h4 class="fw-bold mt-5"> Today</h4>
<div data-nk-bind-flow-ref="today" data-nk-refresh="60000" class="mt-2">
  <div class="d-flex align-items-center gap-3 p-3 border rounded mb-2 bg-warning bg-opacity-10" data-nk-item><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold" data-nk-field="name">Friend's name</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="email">email</div></div></div>
  <div class="small" style="color:var(--nk-text-muted);">No one's birthday today.</div>
</div>
</div></section>`,
    },
  ],
};
