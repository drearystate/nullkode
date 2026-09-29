import type { ModuleDefinition } from "../types";

export const petitions: ModuleDefinition = {
  id: "petitions",
  name: "Petition",
  tagline: "Collect signatures for a cause",
  description:
    "A petition page with a title, description and signature form. Tracks signers by name, email and optional comment; shows a signature count.",
  icon: "",
  color: "from-red-500 to-rose-600",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "title", label: "Petition title", type: "text", default: "Save our park", required: true },
    { key: "target", label: "Signature target", type: "number", default: 1000 },
  ],
  tables: [
    {
      name: "signatures",
      fields: [
        { name: "full_name", type: "text" },
        { name: "email", type: "text" },
        { name: "location", type: "text" },
        { name: "comment", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "sign",
      name: "Sign petition",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "signatures", values: {
          full_name: "{{trigger.full_name}}",
          email: "{{trigger.email}}",
          location: "{{trigger.location}}",
          comment: "{{trigger.comment}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thank you for signing!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "recent",
      name: "Recent signatures",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "signatures", orderBy: "created_at desc", limit: 20, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "petition",
      title: "Petition",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:760px;"><h1 class="display-4 fw-bold">{{config.title}}</h1><p class="lead" style="color:var(--nk-text-muted);">Your voice matters. Add your signature below.</p>
<div class="progress my-4" style="height:12px;"><div class="progress-bar bg-danger" style="width:68%;"></div></div>
<div class="d-flex justify-content-between small" style="color:var(--nk-text-muted);"><div><strong>1,247</strong> signatures</div><div>Goal: {{config.target}}</div></div>
<form data-nk-form="" data-nk-flow-ref="sign" class="card p-4 mt-5 shadow-sm"><div class="row g-3"><div class="col-md-6"><label class="form-label">Full name</label><input name="full_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-12"><label class="form-label">Where from?</label><input name="location" class="form-control" placeholder="City, state"/></div><div class="col-12"><label class="form-label">Why are you signing? (optional)</label><textarea name="comment" class="form-control" rows="3"></textarea></div><div class="col-12 text-end"><button class="btn btn-danger btn-lg" type="submit">Sign petition</button></div></div></form></div></section>
<section class="py-5"><div class="container" style="max-width:760px;"><h3 class="fw-bold">Recent signers</h3>
<div data-nk-bind-flow-ref="recent" class="mt-3">
  <div class="border-bottom py-3" data-nk-item><div class="fw-bold" data-nk-field="full_name">Sarah Kim</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="location">Portland, OR</div><p class="small mt-1 mb-0" data-nk-field="comment">This matters to my family and our community.</p></div>
  <div class="border-bottom py-3"><div class="fw-bold">David Martinez</div><div class="small" style="color:var(--nk-text-muted);">Chicago, IL</div><p class="small mt-1 mb-0">Thank you for organizing this.</p></div>
  <div class="border-bottom py-3"><div class="fw-bold">Emily Chen</div><div class="small" style="color:var(--nk-text-muted);">Brooklyn, NY</div><p class="small mt-1 mb-0">Proud to add my name.</p></div>
  <div class="py-3"><div class="fw-bold">Marcus Lee</div><div class="small" style="color:var(--nk-text-muted);">Oakland, CA</div><p class="small mt-1 mb-0">Spread the word, everyone.</p></div>
</div>
</div></section>`,
    },
  ],
};
