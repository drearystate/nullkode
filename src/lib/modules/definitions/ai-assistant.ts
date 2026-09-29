import type { ModuleDefinition } from "../types";

export const aiAssistant: ModuleDefinition = {
  id: "ai-assistant",
  name: "AI Assistant",
  tagline: "Chat with GPT-5 on your site",
  description:
    "Drop an AI chatbox onto your site. Visitors ask questions, the flow calls GPT-5 with a system prompt you set, and the answer comes back. Full chat history is stored.",
  icon: "",
  color: "from-brand-500 to-cyan-500",
  category: "community",
  version: "1.0.0",
  provides: ["ai"],
  requires: ["ai"],
  config: [
    { key: "assistantName", label: "Assistant name", type: "text", default: "Ask me anything", required: true },
    { key: "systemPrompt", label: "System prompt", type: "textarea", default: "You are a friendly assistant for this site. Be helpful and concise." },
  ],
  tables: [
    {
      name: "conversations",
      fields: [
        { name: "visitor_name", type: "text" },
        { name: "question", type: "text" },
        { name: "answer", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "ask",
      name: "Ask the assistant",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "ai_prompt",
          data: {
            label: "Call GPT-5",
            system: "{{config.systemPrompt}}",
            prompt: "{{trigger.question}}",
            output: "answer",
          },
        },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "conversations",
            values: {
              visitor_name: "{{trigger.visitor_name}}",
              question: "{{trigger.question}}",
              answer: "{{vars.answer}}",
            },
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: '{"ok":true,"answer":"{{vars.answer}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "history",
      name: "Conversation history",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "conversations", orderBy: "created_at desc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "assistant",
      title: "Assistant",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><div class="text-center"><div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width:72px;height:72px;background:linear-gradient(135deg,var(--nk-accent),var(--nk-primary));color:#fff;font-size:32px;"></div><h1 class="display-5 fw-bold">{{config.assistantName}}</h1><p style="color:var(--nk-text-muted);">Ask a question and I'll do my best to help.</p></div>
<form data-nk-form="" data-nk-flow-ref="ask" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-4"><label class="form-label">Your name</label><input name="visitor_name" class="form-control"/></div><div class="col-md-8"><label class="form-label">Your question</label><input name="question" class="form-control" placeholder="How can I get started?" required/></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit"> Ask</button></div><div data-nk-error class="col-12 text-danger small"></div></div></form>
<h3 class="fw-bold mt-5">Recent questions</h3>
<div data-nk-bind-flow-ref="history" class="mt-3">
  <div class="card border-0 shadow-sm mb-3" data-nk-item><div class="card-body p-4"><div class="small mb-2" style="color:var(--nk-text-muted);"><span data-nk-field="visitor_name">Sarah</span> asked:</div><p class="fw-bold" data-nk-field="question">How does the free plan compare to paid?</p><div class="small mt-3 mb-2" style="color:var(--nk-text-muted);"> Assistant replied:</div><p class="mb-0" data-nk-field="answer">The free plan is great for trying things out — you get one project with one page. The Starter plan adds custom domains and unlimited pages for $19/month, and Pro adds more projects and priority support.</p></div></div>
  <div class="card border-0 shadow-sm mb-3"><div class="card-body p-4"><div class="small mb-2" style="color:var(--nk-text-muted);">David asked:</div><p class="fw-bold">Can I use my own database?</p><div class="small mt-3 mb-2" style="color:var(--nk-text-muted);"> Assistant replied:</div><p class="mb-0">Yes — you can connect an external Postgres database via a connection string, or use Google Sheets as a lightweight backend. The built-in option is also one click.</p></div></div>
</div>
</div></section>`,
    },
  ],
};
