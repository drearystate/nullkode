import type { ModuleDefinition } from "../types";

export const polls: ModuleDefinition = {
  id: "polls",
  name: "Polls",
  tagline: "Create and vote on polls",
  description:
    "A poll module: create a question with a list of options, visitors vote, results update live. Great for quick community decisions.",
  icon: "",
  color: "from-emerald-500 to-teal-600",
  category: "community",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "polls",
      fields: [
        { name: "question", type: "text" },
        { name: "options", type: "text" },
        { name: "total_votes", type: "int" },
      ],
    },
    {
      name: "votes",
      fields: [
        { name: "poll_id", type: "int" },
        { name: "option", type: "text" },
        { name: "voter_email", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "List polls",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "polls", orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "vote",
      name: "Cast vote",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "votes", values: {
          poll_id: "{{trigger.poll_id}}",
          option: "{{trigger.option}}",
          voter_email: "{{trigger.voter_email}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks for voting!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "create",
      name: "Create poll",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "polls", values: {
          question: "{{trigger.question}}",
          options: "{{trigger.options}}",
          total_votes: "0",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "polls",
      title: "Polls",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="display-5 fw-bold">Polls</h1><p style="color:var(--nk-text-muted);">Quick polls for the community.</p>
<div data-nk-bind-flow-ref="feed" class="mt-4">
  <div class="card border-0 shadow-sm mb-3" data-nk-item><div class="card-body p-4"><h5 class="fw-bold mb-3" data-nk-field="question">What should we build next?</h5>
    <div class="mb-2"><div class="d-flex justify-content-between small mb-1"><div>Dark mode</div><div style="color:var(--nk-text-muted);">42%</div></div><div class="progress" style="height:8px;"><div class="progress-bar" style="width:42%;background:var(--nk-primary);"></div></div></div>
    <div class="mb-2"><div class="d-flex justify-content-between small mb-1"><div>Bulk actions</div><div style="color:var(--nk-text-muted);">28%</div></div><div class="progress" style="height:8px;"><div class="progress-bar" style="width:28%;background:var(--nk-primary);"></div></div></div>
    <div class="mb-2"><div class="d-flex justify-content-between small mb-1"><div>Keyboard shortcuts</div><div style="color:var(--nk-text-muted);">18%</div></div><div class="progress" style="height:8px;"><div class="progress-bar" style="width:18%;background:var(--nk-primary);"></div></div></div>
    <div class="mb-2"><div class="d-flex justify-content-between small mb-1"><div>Mobile apps</div><div style="color:var(--nk-text-muted);">12%</div></div><div class="progress" style="height:8px;"><div class="progress-bar bg-warning" style="width:12%;"></div></div></div>
    <div class="small mt-3" style="color:var(--nk-text-muted);"><span data-nk-field="total_votes">187</span> votes</div>
  </div></div>
  <div class="card border-0 shadow-sm"><div class="card-body p-4"><h5 class="fw-bold mb-3">Friday team lunch — where?</h5>
    <div class="mb-2"><div class="d-flex justify-content-between small mb-1"><div>Noon Coffee deli</div><div style="color:var(--nk-text-muted);">55%</div></div><div class="progress" style="height:8px;"><div class="progress-bar" style="width:55%;background:var(--nk-primary);"></div></div></div>
    <div class="mb-2"><div class="d-flex justify-content-between small mb-1"><div>Burger place</div><div style="color:var(--nk-text-muted);">30%</div></div><div class="progress" style="height:8px;"><div class="progress-bar" style="width:30%;background:var(--nk-primary);"></div></div></div>
    <div class="mb-2"><div class="d-flex justify-content-between small mb-1"><div>Sushi</div><div style="color:var(--nk-text-muted);">15%</div></div><div class="progress" style="height:8px;"><div class="progress-bar" style="width:15%;background:var(--nk-primary);"></div></div></div>
    <div class="small mt-3" style="color:var(--nk-text-muted);">12 votes</div>
  </div></div>
</div>
</div></section>`,
    },
  ],
};
