import type { ModuleDefinition } from "../types";

export const waitlist: ModuleDefinition = {
  id: "waitlist",
  name: "Waitlist",
  tagline: "Pre-launch email capture",
  description:
    "A bold pre-launch page with a single email field to join the waitlist. Captures name, email and optional referral source. Great for landing pages before you ship.",
  icon: "⏳",
  color: "from-violet-500 to-indigo-600",
  category: "utility",
  version: "1.0.0",
  config: [
    { key: "productName", label: "Product name", type: "text", default: "Our New Thing", required: true },
    { key: "tagline", label: "Tagline", type: "text", default: "Launching soon. Be the first to know." },
  ],
  tables: [
    {
      name: "entries",
      fields: [
        { name: "name", type: "text" },
        { name: "email", type: "text" },
        { name: "source", type: "text" },
        { name: "position", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "join",
      name: "Join waitlist",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "entries", values: {
          name: "{{trigger.name}}",
          email: "{{trigger.email}}",
          source: "{{trigger.source}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"You\'re in. We\'ll be in touch!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "list",
      name: "Waitlist",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "entries", orderBy: "created_at asc", limit: 2000, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "waitlist",
      title: "Waitlist",
      html: `<section class="py-5" style="min-height:100vh;background:linear-gradient(180deg,color-mix(in srgb, var(--nk-text) 95%, var(--nk-bg)) 0%,color-mix(in srgb, var(--nk-primary) 30%, var(--nk-bg)) 100%);"><div class="container text-center" style="color:#fff;" style="max-width:640px;padding-top:12vh;"><h1 class="display-2 fw-bold">{{config.productName}}</h1><p class="lead mt-3" style="color:rgba(255,255,255,0.5);">{{config.tagline}}</p><form data-nk-form="" data-nk-flow-ref="join" class="row g-2 justify-content-center mt-5"><div class="col-md-5"><input name="name" class="form-control form-control-lg" placeholder="Your name" required/></div><div class="col-md-5"><input name="email" type="email" class="form-control form-control-lg" placeholder="you@example.com" required/></div><div class="col-md-10"><input name="source" class="form-control" placeholder="How did you hear about us? (optional)"/></div><div class="col-md-10 mt-3"><button class="btn btn-primary btn-lg w-100" type="submit">Join the waitlist</button></div></form></div></section>`,
    },
    {
      slug: "waitlist-admin",
      title: "Waitlist admin",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Waitlist signups</h1><p style="color:var(--nk-text-muted);">Everyone who joined, in order.</p><div data-nk-bind-flow-ref="list" class="mt-4"><div data-nk-item class="d-flex flex-wrap align-items-center gap-3 py-2" style="border-bottom:1px solid var(--nk-border);"><span class="fw-bold" style="min-width:2.5rem;">#<span data-nk-field="position"></span></span><span class="flex-grow-1"><span class="fw-semibold" data-nk-field="name">Name</span> <a class="small ms-2" data-nk-attr-href="mailto:{email}" data-nk-field="email">email</a></span><span class="small" style="color:var(--nk-text-muted);" data-nk-field="created_at" data-nk-format="date"></span></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">Nobody has joined yet.</p></div></div></section>`,
    },
  ],
};
