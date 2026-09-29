import type { ModuleDefinition } from "../types";

export const timeline: ModuleDefinition = {
  id: "timeline",
  name: "Timeline",
  tagline: "Vertical timeline of dated milestones",
  description:
    "A changelog-style vertical timeline. Perfect for release notes, company history, project milestones or any list of dated events.",
  icon: "",
  color: "from-slate-500 to-zinc-600",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "title", label: "Timeline title", type: "text", default: "What's new", required: true },
    { key: "subtitle", label: "Subtitle", type: "text", default: "A running log of updates." },
  ],
  tables: [
    {
      name: "entries",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "label", type: "text" },
        { name: "occurred_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Timeline feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "entries", orderBy: "occurred_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add entry",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "entries", values: {
          title: "{{trigger.title}}",
          body: "{{trigger.body}}",
          label: "{{trigger.label}}",
          occurred_at: "{{trigger.occurred_at}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "timeline",
      title: "Timeline",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="display-5 fw-bold">{{config.title}}</h1><p class="lead" style="color:var(--nk-text-muted);">{{config.subtitle}}</p>
<div data-nk-bind-flow-ref="feed" class="mt-5">
  <div class="d-flex gap-3 pb-4" data-nk-item>
    <div class="flex-shrink-0 text-end" style="width:110px;">
      <div class="fw-bold">Apr 10</div>
      <div class="small" style="color:var(--nk-text-muted);">2026</div>
    </div>
    <div class="flex-grow-1 ps-4" style="border-left:2px solid var(--nk-border);position:relative;">
      <span style="position:absolute;left:-7px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--nk-primary);"></span>
      <span class="badge" style="background:var(--nk-primary);" data-nk-field="label">Release</span>
      <h5 class="fw-bold mt-2" data-nk-field="title">Version 1.0 is out</h5>
      <p style="color:var(--nk-text-muted);" data-nk-field="body">Our first major release is live, with support for modules, flows and the visual editor.</p>
    </div>
  </div>
  <div class="d-flex gap-3 pb-4">
    <div class="flex-shrink-0 text-end" style="width:110px;"><div class="fw-bold">Mar 22</div><div class="small" style="color:var(--nk-text-muted);">2026</div></div>
    <div class="flex-grow-1 ps-4" style="border-left:2px solid var(--nk-border);position:relative;"><span style="position:absolute;left:-7px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--nk-primary);"></span><span class="badge" style="background:var(--nk-primary);">Update</span><h5 class="fw-bold mt-2">New AI builder</h5><p style="color:var(--nk-text-muted);">Describe your app in plain English and have it scaffolded for you.</p></div>
  </div>
  <div class="d-flex gap-3">
    <div class="flex-shrink-0 text-end" style="width:110px;"><div class="fw-bold">Mar 1</div><div class="small" style="color:var(--nk-text-muted);">2026</div></div>
    <div class="flex-grow-1 ps-4" style="border-left:2px solid var(--nk-border);position:relative;"><span style="position:absolute;left:-7px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--nk-primary);"></span><span class="badge" style="background:var(--nk-primary);">Launch</span><h5 class="fw-bold mt-2">Public beta</h5><p style="color:var(--nk-text-muted);">Opened signups for the first public beta. Thanks to everyone who joined early.</p></div>
  </div>
</div>
</div></section>`,
    },
    {
      slug: "timeline-admin",
      title: "Add entry",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="fw-bold">New timeline entry</h1><form data-nk-form="" data-nk-flow-ref="add" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-md-8"><label class="form-label">Title</label><input name="title" class="form-control" required/></div><div class="col-md-4"><label class="form-label">Label</label><input name="label" class="form-control" placeholder="Release, Update..."/></div><div class="col-12"><label class="form-label">Date</label><input name="occurred_at" type="datetime-local" class="form-control"/></div><div class="col-12"><label class="form-label">Body</label><textarea name="body" class="form-control" rows="5"></textarea></div><div class="col-12 text-end"><button class="btn btn-primary" type="submit">Add entry</button></div></div></form></div></section>`,
    },
  ],
};
