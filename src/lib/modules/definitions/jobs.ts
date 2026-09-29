import type { ModuleDefinition } from "../types";

export const jobs: ModuleDefinition = {
  id: "jobs",
  name: "Jobs Board",
  tagline: "Post openings, receive applications",
  description:
    "A careers page with open roles and an apply form. Candidates submit name, email, resume link and a cover message; applications land in a table you can review in the admin.",
  icon: "",
  color: "from-blue-500 to-indigo-600",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "companyName", label: "Company name", type: "text", default: "Our Company", required: true },
  ],
  tables: [
    {
      name: "openings",
      fields: [
        { name: "title", type: "text" },
        { name: "location", type: "text" },
        { name: "department", type: "text" },
        { name: "description", type: "text" },
        { name: "active", type: "bool" },
      ],
    },
    {
      name: "applications",
      fields: [
        { name: "opening_title", type: "text" },
        { name: "applicant_name", type: "text" },
        { name: "email", type: "text" },
        { name: "resume_url", type: "text" },
        { name: "cover_message", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "list-openings",
      name: "List openings",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "openings", where: { active: "true" }, orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "apply",
      name: "Submit application",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "applications", values: {
          opening_title: "{{trigger.opening_title}}",
          applicant_name: "{{trigger.applicant_name}}",
          email: "{{trigger.email}}",
          resume_url: "{{trigger.resume_url}}",
          cover_message: "{{trigger.cover_message}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Thanks! We\'ll be in touch."}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "list-applications",
      name: "List applications",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "applications", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "careers",
      title: "Careers",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">Join {{config.companyName}}</h1><p class="lead" style="color:var(--nk-text-muted);">Current openings</p></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="list-openings" class="row g-4">
  <div class="col-md-6" data-nk-item>
    <div class="card h-100 border-0 shadow-sm"><div class="card-body">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h5 class="card-title fw-bold mb-0" data-nk-field="title">Senior Software Engineer</h5>
          <div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="department">Engineering</span> · <span data-nk-field="location">Remote</span></div>
        </div>
        <span class="badge" style="background:var(--nk-primary);">Open</span>
      </div>
      <p class="card-text small mt-3" data-nk-field="description" style="color:var(--nk-text-muted);">Work across the stack on a small, senior team. Ship product end-to-end.</p>
      <a class="btn btn-outline-primary btn-sm" href="#apply">Apply now</a>
    </div></div>
  </div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><h5 class="card-title fw-bold mb-0">Product Designer</h5><div class="small" style="color:var(--nk-text-muted);">Design · Hybrid (SF)</div></div><span class="badge" style="background:var(--nk-primary);">Open</span></div><p class="card-text small mt-3" style="color:var(--nk-text-muted);">Own visual and interaction design for a product used by thousands.</p><a class="btn btn-outline-primary btn-sm" href="#apply">Apply now</a></div></div></div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><h5 class="card-title fw-bold mb-0">Customer Support Lead</h5><div class="small" style="color:var(--nk-text-muted);">Operations · Remote</div></div><span class="badge" style="background:var(--nk-primary);">Open</span></div><p class="card-text small mt-3" style="color:var(--nk-text-muted);">Be the voice of our customers and the bridge between support and product.</p><a class="btn btn-outline-primary btn-sm" href="#apply">Apply now</a></div></div></div>
  <div class="col-md-6"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><h5 class="card-title fw-bold mb-0">Marketing Generalist</h5><div class="small" style="color:var(--nk-text-muted);">Marketing · Remote</div></div><span class="badge" style="background:var(--nk-primary);">Open</span></div><p class="card-text small mt-3" style="color:var(--nk-text-muted);">Write, ship campaigns, analyze results, repeat. First marketing hire.</p><a class="btn btn-outline-primary btn-sm" href="#apply">Apply now</a></div></div></div>
</div>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:680px;"><h2 class="fw-bold">Apply now</h2><form data-nk-form="" data-nk-flow-ref="apply" class="card p-4 mt-4 shadow-sm"><div class="row g-3"><div class="col-12"><label class="form-label">Role</label><input name="opening_title" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Your name</label><input name="applicant_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-12"><label class="form-label">Resume / LinkedIn URL</label><input name="resume_url" type="url" class="form-control"/></div><div class="col-12"><label class="form-label">Cover message</label><textarea name="cover_message" class="form-control" rows="4"></textarea></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Send application</button></div></div></form></div></section>`,
    },
    {
      slug: "careers-admin",
      title: "Applications",
      html: `<section class="py-5"><div class="container"><h1 class="fw-bold">Applications</h1><p style="color:var(--nk-text-muted);">Everyone who applied, newest first.</p><div data-nk-bind-flow-ref="list-applications" class="mt-4"><div data-nk-item class="p-3 mb-2" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><div class="d-flex flex-wrap justify-content-between gap-2"><strong data-nk-field="applicant_name">Applicant</strong><span class="small" style="color:var(--nk-text-muted);" data-nk-field="created_at" data-nk-format="date"></span></div><div class="small mt-1">For: <span data-nk-field="opening_title"></span></div><div class="small mt-1"><a data-nk-attr-href="mailto:{email}" data-nk-field="email">email</a> · <a data-nk-href="resume_url" target="_blank" rel="noopener">Resume</a></div><p class="small mb-0 mt-2" style="white-space:pre-wrap;" data-nk-field="cover_message"></p></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">No applications yet.</p></div></div></section>`,
    },
  ],
};
