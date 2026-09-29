import type { ModuleDefinition } from "../types";

export const userGroups: ModuleDefinition = {
  id: "user-groups",
  name: "User Groups",
  tagline: "Premium / Beta / VIP / Staff multi-group membership",
  description:
    "Add multi-group membership on top of the auth module's single role field. Define groups (Premium, Beta, VIP, Staff…) and attach any user to one or more. Other modules can check membership via the in-group flow before gating a feature.",
  icon: "",
  color: "from-purple-600 to-indigo-800",
  category: "utility",
  version: "1.0.0",
  requires: ["auth-session", "auth-users"],
  tables: [
    {
      name: "groups",
      fields: [
        { name: "name", type: "text" },
        { name: "slug", type: "text" },
        { name: "color", type: "text" },
        { name: "description", type: "text" },
      ],
      seed: [
        { name: "Premium", slug: "premium", color: "#f59e0b", description: "Paid subscribers" },
        { name: "Beta testers", slug: "beta", color: "#3b82f6", description: "Early-access feature pool" },
        { name: "Staff", slug: "staff", color: "#10b981", description: "Internal team" },
      ],
    },
    {
      name: "memberships",
      fields: [
        { name: "group_id", type: "text" },
        { name: "user_id", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "groups",
      name: "All groups",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "groups", orderBy: "name asc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "create-group",
      name: "Create a group",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "groups",
            values: {
              name: "{{trigger.name}}",
              slug: "{{trigger.slug}}",
              color: "{{trigger.color}}",
              description: "{{trigger.description}}",
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
      slug: "assign",
      name: "Add a user to a group",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "memberships", values: { group_id: "{{trigger.group_id}}", user_id: "{{trigger.user_id}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "remove",
      name: "Remove a user from a group",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "delete", data: { table: "memberships", where: { group_id: "{{trigger.group_id}}", user_id: "{{trigger.user_id}}" } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "my-groups",
      name: "Groups the current user belongs to",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "query", data: { table: "memberships", where: { user_id: "{{vars.session.userId}}" }, limit: 50, output: "mine" } },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.mine}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "in-group",
      name: "Is the current user in a given group (slug)?",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "query", data: { table: "groups", where: { slug: "{{trigger.slug}}" }, limit: 1, output: "g" } },
        {
          id: "n4",
          type: "query",
          data: { table: "memberships", where: { group_id: "{{vars.g.0.id}}", user_id: "{{vars.session.userId}}" }, limit: 1, output: "m" },
        },
        { id: "n5", type: "branch", data: { left: "{{vars.m.0.id}}", op: "exists", right: "" } },
        { id: "n6", type: "response", data: { status: 200, body: '{"in":true,"group":"{{vars.g.0.name}}"}' } },
        { id: "n7", type: "response", data: { status: 200, body: '{"in":false}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6", sourceHandle: "true" },
        { id: "e6", source: "n5", target: "n7", sourceHandle: "false" },
      ],
    },
    {
      slug: "members",
      name: "Members of a group",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "memberships", where: { group_id: "{{trigger.group_id}}" }, limit: 500, output: "rows" } },
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
      slug: "groups",
      title: "Groups",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:760px;">
<h1 class="fw-bold">User groups</h1>

<form data-nk-form="" data-nk-flow-ref="create-group" class="card p-3 shadow-sm mt-3">
  <h5 class="fw-bold">New group</h5>
  <div class="row g-2"><div class="col-md-4"><input name="name" class="form-control" placeholder="Name" required/></div><div class="col-md-3"><input name="slug" class="form-control" placeholder="slug" required/></div><div class="col-md-1"><input name="color" type="color" class="form-control form-control-color w-100" value="#3b82f6"/></div><div class="col-md-4"><input name="description" class="form-control" placeholder="Description"/></div></div>
  <button class="btn btn-primary mt-3" type="submit">Create</button>
</form>

<div data-nk-bind-flow-ref="groups" data-nk-refresh="20000" class="row g-3 mt-2">
  <div class="col-md-4 col-sm-6" data-nk-item>
    <div class="card border-0 shadow-sm h-100 p-3" style="border-left:6px solid var(--nk-primary);">
      <h5 class="fw-bold mb-1" data-nk-field="name">Group</h5>
      <code class="small" data-nk-field="slug">slug</code>
      <p class="small mt-2 mb-0" style="color:var(--nk-text-muted);" data-nk-field="description">Description</p>
    </div>
  </div>
</div>

<div class="card p-3 mt-5" style="background:var(--nk-surface-2);">
<div class="fw-bold mb-2">Gate a feature with this flow</div>
<pre class="m-0 small" style="white-space:pre-wrap;">// Other modules can check the signed-in user's group:
fetch('/api/run/in-group', {
  method:'POST',
  headers:{'content-type':'application/json'},
  body: JSON.stringify({ slug: 'premium' })
}).then(r =&gt; r.json()).then(d =&gt; {
  if(d.in) showPremiumFeature();
});</pre>
</div>
</div></section>`,
    },
  ],
};
