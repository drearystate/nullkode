import type { ModuleDefinition } from "../types";

export const faq: ModuleDefinition = {
  id: "faq",
  name: "FAQ",
  tagline: "Frequently asked questions",
  description:
    "A question-and-answer page grouped by category. Comes with an admin form to add new Q&A items and a public feed that lists everything published.",
  icon: "",
  color: "from-sky-500 to-blue-600",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Page heading", type: "text", default: "Frequently asked questions", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "question", type: "text" },
        { name: "answer", type: "text" },
        { name: "category", type: "text" },
        { name: "sort_order", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "FAQ feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "sort_order asc, created_at asc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add FAQ item",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          question: "{{trigger.question}}",
          answer: "{{trigger.answer}}",
          category: "{{trigger.category}}",
          sort_order: "{{trigger.sort_order}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "faq",
      title: "FAQ",
      html: `<section class="py-5"><div class="container" style="max-width:780px;"><h1 class="display-5 fw-bold text-center">{{config.heading}}</h1><p class="lead text-center" style="color:var(--nk-text-muted);">Everything you might want to know.</p>
<div data-nk-bind-flow-ref="feed" class="mt-5">
  <details class="py-3 border-bottom" data-nk-item>
    <summary class="fw-bold fs-5" style="cursor:pointer;list-style:none;"><span data-nk-field="question">How do I get started?</span></summary>
    <p class="mt-3" style="color:var(--nk-text-muted);" data-nk-field="answer">Sign up, install a module, and click through the pages. Everything is pre-wired and you can edit any of it in the visual builder.</p>
  </details>
  <details class="py-3 border-bottom"><summary class="fw-bold fs-5" style="cursor:pointer;list-style:none;">How much does it cost?</summary><p class="mt-3" style="color:var(--nk-text-muted);">There's a free tier that covers most hobby use. Paid plans start when you need custom domains or more projects.</p></details>
  <details class="py-3 border-bottom"><summary class="fw-bold fs-5" style="cursor:pointer;list-style:none;">Can I use my own domain?</summary><p class="mt-3" style="color:var(--nk-text-muted);">Yes. Add a domain in the project settings, verify it with a DNS record, and traffic is routed to your project.</p></details>
  <details class="py-3 border-bottom"><summary class="fw-bold fs-5" style="cursor:pointer;list-style:none;">What happens to my data?</summary><p class="mt-3" style="color:var(--nk-text-muted);">Each project gets an isolated Postgres schema. You own your data and can export it at any time.</p></details>
  <details class="py-3"><summary class="fw-bold fs-5" style="cursor:pointer;list-style:none;">How do I contact support?</summary><p class="mt-3" style="color:var(--nk-text-muted);">Use the contact form on this site, or email us directly. We read every message.</p></details>
</div>
</div></section>`,
    },
    {
      slug: "faq-admin",
      title: "FAQ admin",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="fw-bold">Add an FAQ</h1><form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm"><div class="mb-3"><label class="form-label">Question</label><input name="question" class="form-control" required/></div><div class="mb-3"><label class="form-label">Answer</label><textarea name="answer" class="form-control" rows="5" required></textarea></div><div class="row g-3 mb-3"><div class="col-md-8"><label class="form-label">Category</label><input name="category" class="form-control"/></div><div class="col-md-4"><label class="form-label">Order</label><input name="sort_order" type="number" class="form-control" value="0"/></div></div><div class="text-end"><button class="btn btn-primary" type="submit">Add</button></div></form></div></section>`,
    },
  ],
};
