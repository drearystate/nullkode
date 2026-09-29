import type { ModuleDefinition } from "../types";

export const survey: ModuleDefinition = {
  id: "survey",
  name: "Survey",
  tagline: "Multi-question feedback form",
  description:
    "A survey with multiple questions and free-text answers. Store responses as a JSON blob per submission and browse them in the admin.",
  icon: "",
  color: "from-orange-500 to-red-600",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "title", label: "Survey title", type: "text", default: "We'd love your feedback", required: true },
    { key: "intro", label: "Intro", type: "text", default: "This will take about two minutes." },
  ],
  tables: [
    {
      name: "responses",
      fields: [
        { name: "respondent_email", type: "text" },
        { name: "answers", type: "json" },
        { name: "summary", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "submit",
      name: "Submit survey",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "responses", values: {
          respondent_email: "{{trigger.email}}",
          summary: "{{trigger.q1}}",
          answers: "{{trigger.answers}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks for your feedback!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "list",
      name: "List responses",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "responses", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "survey",
      title: "Survey",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold">{{config.title}}</h1><p class="lead" style="color:var(--nk-text-muted);">{{config.intro}}</p><form data-nk-form="" data-nk-flow-ref="submit" class="card p-4 mt-4 shadow-sm"><div class="mb-3"><label class="form-label">Your email</label><input name="email" type="email" class="form-control"/></div><div class="mb-3"><label class="form-label">How did you hear about us?</label><input name="q1" class="form-control" required/></div><div class="mb-3"><label class="form-label">What would you improve?</label><textarea name="q2" class="form-control" rows="4"></textarea></div><div class="mb-3"><label class="form-label">Anything else?</label><textarea name="q3" class="form-control" rows="3"></textarea></div><div class="text-end"><button class="btn btn-primary btn-lg" type="submit">Submit</button></div></form></div></section>`,
    },
    {
      slug: "survey-admin",
      title: "Responses",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Survey responses</h1><div data-nk-bind-flow-ref="list" class="mt-4"><div data-nk-item class="p-3 mb-2" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><div class="d-flex flex-wrap justify-content-between gap-2"><span data-nk-field="respondent_email">Anonymous</span><span class="small" style="color:var(--nk-text-muted);" data-nk-field="created_at" data-nk-format="datetime"></span></div><p class="mb-0 mt-2" style="white-space:pre-wrap;" data-nk-field="summary"></p></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">No responses yet.</p></div></div></section>`,
    },
  ],
};
