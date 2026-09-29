import type { ModuleDefinition } from "../types";

export const quiz: ModuleDefinition = {
  id: "quiz",
  name: "Quiz",
  tagline: "Trivia or pop quiz with scoring",
  description:
    "A single-page quiz with multiple questions. Each submission is stored with the user's name, their answers and a score you can compute client-side or in a flow.",
  icon: "",
  color: "from-amber-500 to-orange-600",
  category: "productivity",
  version: "1.0.0",
  config: [
    { key: "title", label: "Quiz title", type: "text", default: "Pop Quiz", required: true },
  ],
  tables: [
    {
      name: "attempts",
      fields: [
        { name: "player_name", type: "text" },
        { name: "email", type: "text" },
        { name: "answers", type: "text" },
        { name: "score", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "submit",
      name: "Submit quiz",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "attempts", values: {
          player_name: "{{trigger.player_name}}",
          email: "{{trigger.email}}",
          answers: "{{trigger.answers}}",
          score: "{{trigger.score}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks for playing!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "leaderboard",
      name: "Leaderboard",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "attempts", orderBy: "score desc", limit: 20, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "quiz",
      title: "Quiz",
      html: `<section class="py-5"><div class="container" style="max-width:680px;"><h1 class="fw-bold text-center">{{config.title}}</h1><form data-nk-form="" data-nk-flow-ref="submit" class="card p-4 mt-4 shadow-sm"><div class="mb-3"><label class="form-label">Your name</label><input name="player_name" class="form-control" required/></div><div class="mb-3"><label class="form-label">Email (optional)</label><input name="email" type="email" class="form-control"/></div><hr/><div class="mb-3"><label class="form-label">Q1: Edit this question in the editor</label><input name="answers" class="form-control" placeholder="Your answer"/></div><div class="mb-3"><label class="form-label">Your score (computed in editor, 0-100)</label><input name="score" type="number" class="form-control" value="0"/></div><div class="text-end"><button class="btn btn-primary btn-lg" type="submit">Submit</button></div></form></div></section>`,
    },
    {
      slug: "leaderboard",
      title: "Leaderboard",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:680px;"><h1 class="fw-bold text-center"> Leaderboard</h1>
<div data-nk-bind-flow-ref="leaderboard" class="mt-4">
  <div class="d-flex align-items-center gap-3 p-3 rounded shadow-sm mb-2" style="background:var(--nk-surface);" data-nk-item>
    <div class="fs-3"></div>
    <div class="flex-grow-1">
      <div class="fw-bold" data-nk-field="player_name">Alex Rivera</div>
      <div class="small" style="color:var(--nk-text-muted);">Just now</div>
    </div>
    <div class="fs-4 fw-bold" style="color:var(--nk-primary);"><span data-nk-field="score">98</span></div>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 rounded shadow-sm mb-2" style="background:var(--nk-surface);"><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold">Jordan Park</div><div class="small" style="color:var(--nk-text-muted);">3 min ago</div></div><div class="fs-4 fw-bold" style="color:var(--nk-primary);">94</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded shadow-sm mb-2" style="background:var(--nk-surface);"><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold">Morgan Lee</div><div class="small" style="color:var(--nk-text-muted);">7 min ago</div></div><div class="fs-4 fw-bold" style="color:var(--nk-primary);">89</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded shadow-sm mb-2" style="background:var(--nk-surface);"><div class="fs-4 fw-bold text-center" style="width:24px;color:var(--nk-text-muted);">4</div><div class="flex-grow-1"><div class="fw-bold">Sam Chen</div><div class="small" style="color:var(--nk-text-muted);">12 min ago</div></div><div class="fs-4 fw-bold">82</div></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded shadow-sm" style="background:var(--nk-surface);"><div class="fs-4 fw-bold text-center" style="width:24px;color:var(--nk-text-muted);">5</div><div class="flex-grow-1"><div class="fw-bold">Taylor Kim</div><div class="small" style="color:var(--nk-text-muted);">25 min ago</div></div><div class="fs-4 fw-bold">78</div></div>
</div>
</div></section>`,
    },
  ],
};
