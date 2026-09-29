import type { ModuleDefinition } from "../types";

export const webhooksIn: ModuleDefinition = {
  id: "webhooks-in",
  name: "Incoming Webhooks",
  tagline: "Public endpoint for ingesting third-party JSON",
  description:
    "Expose a public webhook URL that captures any JSON payload from external services (Stripe events, GitHub hooks, Zapier, etc.) into a table. Browse and re-process payloads from the admin dashboard.",
  icon: "",
  color: "from-stone-600 to-stone-800",
  category: "utility",
  version: "1.0.0",
  tables: [
    {
      name: "endpoints",
      fields: [
        { name: "name", type: "text" },
        { name: "secret", type: "text" },
        { name: "active", type: "bool" },
      ],
    },
    {
      name: "deliveries",
      fields: [
        { name: "endpoint_id", type: "text" },
        { name: "headers", type: "text" },
        { name: "body", type: "text" },
        { name: "source_ip", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create-endpoint",
      name: "Create webhook endpoint",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "math", data: { expression: "floor(random()*9999999999)", output: "n" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "endpoints",
            values: { name: "{{trigger.name}}", secret: "whk_{{vars.n}}", active: "true" },
            output: "row",
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.row}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "ingest",
      name: "Ingest payload (point external service here)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "endpoints", where: { secret: "{{trigger.secret}}", active: "true" }, limit: 1, output: "ep" },
        },
        { id: "n3", type: "branch", data: { left: "{{vars.ep.0.id}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "deliveries",
            values: {
              endpoint_id: "{{vars.ep.0.id}}",
              headers: "{{trigger.headers}}",
              body: "{{trigger.body}}",
              source_ip: "{{trigger.source_ip}}",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"received":true}' } },
        { id: "n6", type: "response", data: { status: 404, body: '{"error":"Unknown endpoint"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
    {
      slug: "list-endpoints",
      name: "List endpoints",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "endpoints", orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list-deliveries",
      name: "Recent deliveries",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "deliveries", orderBy: "created_at desc", limit: 100, output: "rows" } },
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
      slug: "webhooks",
      title: "Incoming webhooks",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:880px;">
<h1 class="fw-bold">Incoming webhooks</h1>
<p style="color:var(--nk-text-muted);">Create an endpoint, point your external service at the ingest URL with the secret, then browse the deliveries below.</p>

<form data-nk-form="" data-nk-flow-ref="create-endpoint" class="card p-3 mt-3 shadow-sm">
  <div class="d-flex gap-2 align-items-end">
    <div class="flex-grow-1"><label class="form-label small mb-1">Endpoint name</label><input name="name" class="form-control" placeholder="Stripe events" required/></div>
    <button class="btn btn-primary" type="submit">Create endpoint</button>
  </div>
</form>

<h4 class="fw-bold mt-4">Your endpoints</h4>
<div data-nk-bind-flow-ref="list-endpoints" data-nk-refresh="20000" class="mt-2">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body"><div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold" data-nk-field="name">Stripe events</div><div class="small font-monospace" style="color:var(--nk-text-muted);">POST /api/run/ingest with <code>{ "secret": "<span data-nk-field="secret">whk_xxx</span>", "body": ... }</code></div></div></div></div></div>
</div>

<h4 class="fw-bold mt-5">Recent deliveries</h4>
<div data-nk-bind-flow-ref="list-deliveries" data-nk-refresh="10000" class="mt-2">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body"><div class="small" style="color:var(--nk-text-muted);">From <span data-nk-field="source_ip">1.2.3.4</span></div><pre class="m-0 small p-2 rounded mt-2" style="background:var(--nk-surface-2);white-space:pre-wrap;max-height:200px;overflow:auto;" data-nk-field="body">{"event":"payment.succeeded"}</pre></div></div>
</div>
</div></section>`,
    },
  ],
};
