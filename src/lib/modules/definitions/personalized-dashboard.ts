import type { ModuleDefinition } from "../types";

export const personalizedDashboard: ModuleDefinition = {
  id: "personalized-dashboard",
  name: "Personalized Dashboard",
  tagline: "Per-user home page with custom widgets",
  description:
    "A personalized home page that greets the signed-in user by name and shows widgets they've pinned. Pin a widget (label + URL + icon) and it appears on your dashboard. Other modules can also auto-pin widgets (e.g. 'your unread inbox count') via the create-widget flow.",
  icon: "",
  color: "from-purple-500 to-indigo-700",
  category: "productivity",
  version: "1.0.0",
  requires: ["auth-session", "auth-users"],
  config: [
    { key: "greeting", label: "Greeting prefix", type: "text", default: "Welcome back", required: true },
  ],
  tables: [
    {
      name: "widgets",
      fields: [
        { name: "user_id", type: "text" },
        { name: "label", type: "text" },
        { name: "url", type: "text" },
        { name: "icon", type: "text" },
        { name: "color", type: "text" },
        { name: "sort_order", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "my-widgets",
      name: "My widgets",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "query", data: { table: "widgets", where: { user_id: "{{vars.session.userId}}" }, orderBy: "sort_order asc", limit: 50, output: "rows" } },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "create-widget",
      name: "Pin a widget",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "widgets",
            values: {
              user_id: "{{vars.session.userId}}",
              label: "{{trigger.label}}",
              url: "{{trigger.url}}",
              icon: "{{trigger.icon}}",
              color: "{{trigger.color}}",
              sort_order: "{{trigger.sort_order}}",
            },
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "remove-widget",
      name: "Remove a pinned widget",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "delete", data: { table: "widgets", where: { id: "{{trigger.id}}", user_id: "{{vars.session.userId}}" } } },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
  ],
  pages: [
    {
      slug: "dashboard",
      title: "Dashboard",
      isHome: true,
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:980px;">
<h1 class="display-5 fw-bold">{{config.greeting}}<span data-nk-bind-flow-ref="me" data-nk-refresh="0"><span data-nk-field="name">,</span></span> </h1>
<p style="color:var(--nk-text-muted);">Your personal home page. Pin the pages you use most.</p>

<div class="row g-3 mt-3" data-nk-bind-flow-ref="my-widgets" data-nk-refresh="15000">
  <div class="col-md-4 col-sm-6" data-nk-item data-nk-row-id="{id}">
    <a class="card border-0 shadow-sm h-100 p-3 text-decoration-none text-body" data-nk-href-from="url" href="#"><div class="fs-1" data-nk-field="icon"></div><div class="fw-bold mt-2" data-nk-field="label">Widget</div></a>
  </div>
</div>

<h4 class="fw-bold mt-5">Pin a new widget</h4>
<form data-nk-form="" data-nk-flow-ref="create-widget" class="card p-3 shadow-sm mt-2">
  <div class="row g-2"><div class="col-md-5"><input name="label" class="form-control" placeholder="Label (Inbox)" required/></div><div class="col-md-5"><input name="url" class="form-control" placeholder="/inbox" required/></div><div class="col-md-1"><input name="icon" class="form-control text-center" placeholder="" maxlength="2"/></div><div class="col-md-1"><button class="btn btn-primary w-100" type="submit">+</button></div></div>
</form>
</div></section>`,
    },
  ],
};
