import type { ModuleDefinition } from "../types";

export const linkTracker: ModuleDefinition = {
  id: "link-tracker",
  name: "Link Tracker",
  tagline: "Track clicks on outbound links",
  description:
    "Create trackable links for your marketing campaigns. Each click is logged with a timestamp so you can see which channels drive the most traffic.",
  icon: "",
  color: "from-blue-500 to-cyan-600",
  category: "utility",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "links",
      fields: [
        { name: "label", type: "text" },
        { name: "code", type: "text" },
        { name: "destination", type: "text" },
        { name: "clicks", type: "int" },
      ],
    },
    {
      name: "clicks",
      fields: [
        { name: "link_code", type: "text" },
        { name: "user_agent", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "create",
      name: "Create tracked link",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "links",
            values: {
              label: "{{trigger.label}}",
              code: "{{trigger.code}}",
              destination: "{{trigger.destination}}",
              clicks: "0",
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
      slug: "list",
      name: "List links",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "links", orderBy: "clicks desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "go",
      name: "Record click and redirect",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "links",
            where: { code: "{{trigger.code}}" },
            limit: 1,
            output: "match",
          },
        },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "clicks",
            values: {
              link_code: "{{trigger.code}}",
              user_agent: "{{trigger.user_agent}}",
            },
          },
        },
        {
          id: "n4",
          type: "response",
          data: { status: 200, body: '{"redirect":"{{vars.match.0.destination}}"}' },
        },
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
      slug: "links-admin",
      title: "Tracked links",
      html: `<section class="py-5"><div class="container" style="max-width:820px;"><h1 class="display-5 fw-bold">Tracked links</h1><p style="color:var(--nk-text-muted);">Create a new short code, paste the destination URL, share it, see the clicks.</p>
<form data-nk-form="" data-nk-flow-ref="create" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-3"><input name="label" class="form-control" placeholder="Label (Twitter, LinkedIn...)" required/></div><div class="col-md-2"><input name="code" class="form-control text-uppercase" placeholder="tw1" required/></div><div class="col-md-5"><input name="destination" type="url" class="form-control" placeholder="https://..." required/></div><div class="col-md-2"><button class="btn btn-primary w-100" type="submit">Create</button></div></div></form>
<div data-nk-bind-flow-ref="list" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body d-flex align-items-center gap-3"><div class="flex-grow-1"><div class="fw-bold" data-nk-field="label">Twitter campaign</div><div class="small font-monospace" style="color:var(--nk-text-muted);">/l/<span data-nk-field="code">tw1</span> → <span data-nk-field="destination" style="word-break:break-all;">https://example.com/spring-sale</span></div></div><div class="text-end"><div class="fs-4 fw-bold"><span data-nk-field="clicks">247</span></div><div class="small" style="color:var(--nk-text-muted);">clicks</div></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex align-items-center gap-3"><div class="flex-grow-1"><div class="fw-bold">LinkedIn post</div><div class="small font-monospace" style="color:var(--nk-text-muted);">/l/li1 → https://example.com/case-study</div></div><div class="text-end"><div class="fs-4 fw-bold">182</div><div class="small" style="color:var(--nk-text-muted);">clicks</div></div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex align-items-center gap-3"><div class="flex-grow-1"><div class="fw-bold">Newsletter April</div><div class="small font-monospace" style="color:var(--nk-text-muted);">/l/nl-apr → https://example.com/landing</div></div><div class="text-end"><div class="fs-4 fw-bold">96</div><div class="small" style="color:var(--nk-text-muted);">clicks</div></div></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body d-flex align-items-center gap-3"><div class="flex-grow-1"><div class="fw-bold">Podcast sponsor</div><div class="small font-monospace" style="color:var(--nk-text-muted);">/l/pod → https://example.com/promo</div></div><div class="text-end"><div class="fs-4 fw-bold">58</div><div class="small" style="color:var(--nk-text-muted);">clicks</div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
