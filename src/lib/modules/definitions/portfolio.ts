import type { ModuleDefinition } from "../types";

export const portfolio: ModuleDefinition = {
  id: "portfolio",
  name: "Portfolio",
  tagline: "Showcase your work",
  description:
    "A project portfolio with title, image, description and optional external link. Great for designers, developers, photographers and agencies.",
  icon: "",
  color: "from-rose-500 to-pink-600",
  category: "content",
  version: "1.0.0",
  config: [
    { key: "name", label: "Your name or brand", type: "text", default: "My Work", required: true },
    { key: "intro", label: "Intro line", type: "text", default: "Recent projects and case studies." },
  ],
  tables: [
    {
      name: "projects",
      fields: [
        { name: "title", type: "text" },
        { name: "summary", type: "text" },
        { name: "image_url", type: "text" },
        { name: "project_url", type: "text" },
        { name: "tags", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Portfolio feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "projects", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add project",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "projects", values: {
          title: "{{trigger.title}}",
          summary: "{{trigger.summary}}",
          image_url: "{{trigger.image_url}}",
          project_url: "{{trigger.project_url}}",
          tags: "{{trigger.tags}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "portfolio",
      title: "Portfolio",
      html: `<section class="nk-hero">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-7">
        <span class="nk-eyebrow">SELECTED WORK</span>
        <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">{{config.name}}</h1>
        <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:540px;">{{config.intro}}</p>
        <div class="d-flex flex-wrap gap-3">
          <a href="#work" class="btn btn-primary btn-lg px-4">See the work</a>
          <a href="/portfolio-admin" class="btn btn-outline-primary btn-lg px-4">Add a project</a>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="nk-eyebrow mb-2">AVAILABLE</div>
          <h3 class="h4 fw-bold mb-2">Taking on new projects</h3>
          <p class="small mb-0" style="color:var(--nk-text-muted);">Branding, web, mobile, product design — let's make something remarkable together.</p>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6" id="work">
  <div class="container">
    <div class="nk-section-title">
      <span class="nk-eyebrow">CASE STUDIES</span>
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Recent projects</h2>
      <p class="lead">A selection of things I've worked on lately.</p>
    </div>
    <div data-nk-bind-flow-ref="feed" class="row g-4">
      <div class="col-md-6" data-nk-item>
        <a class="nk-feature h-100 d-block" data-nk-href="project_url" href="#" style="padding:0;overflow:hidden;text-decoration:none;color:inherit;">
          <div data-nk-src="image_url" style="aspect-ratio:16/10;background:linear-gradient(135deg, var(--nk-primary), var(--nk-accent));"></div>
          <div class="p-4">
            <h3 class="h4 fw-bold mb-2" data-nk-field="title">Project title</h3>
            <p class="mb-3" style="color:var(--nk-text-muted);" data-nk-field="summary">A short case study summary — the problem, the approach and the outcome.</p>
            <div class="small text-uppercase fw-semibold" style="color:var(--nk-primary);letter-spacing:0.12em;" data-nk-field="tags">branding · identity</div>
          </div>
        </a>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6">
  <div class="container">
    <div class="nk-cta-band">
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Let's work together</h2>
      <p class="lead mb-4">Have a project in mind? I'd love to hear about it.</p>
      <a href="mailto:hello@example.com" class="btn btn-lg px-4">Start a project</a>
    </div>
  </div>
</section>
<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">{{config.name}}</div>
        <div class="small" style="color:var(--nk-text-muted);">{{config.intro}}</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="small" href="/portfolio-admin" style="color:var(--nk-text-muted);">Admin</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "portfolio-admin",
      title: "Add project",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-9 col-xl-8">
        <span class="nk-eyebrow">NEW PROJECT</span>
        <h1 class="display-5 fw-bold mb-2" style="letter-spacing:-0.02em;">Add a project</h1>
        <p class="lead mb-5" style="color:var(--nk-text-muted);">Give each piece of work its own showcase on your portfolio.</p>
        <form data-nk-form="" data-nk-flow-ref="add" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="row g-4">
            <div class="col-12">
              <label class="form-label">Title</label>
              <input name="title" class="form-control form-control-lg" required/>
            </div>
            <div class="col-12">
              <label class="form-label">Summary</label>
              <textarea name="summary" class="form-control form-control-lg" rows="4"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">Image URL</label>
              <input name="image_url" type="url" class="form-control form-control-lg"/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Project URL</label>
              <input name="project_url" type="url" class="form-control form-control-lg"/>
            </div>
            <div class="col-12">
              <label class="form-label">Tags (comma separated)</label>
              <input name="tags" class="form-control form-control-lg" placeholder="branding, web, mobile"/>
            </div>
            <div class="col-12 d-flex justify-content-end gap-2">
              <a href="/portfolio" class="btn btn-outline-primary btn-lg px-4">Cancel</a>
              <button class="btn btn-primary btn-lg px-4" type="submit">Add project</button>
            </div>
          </div>
          <div data-nk-error class="text-danger small mt-3"></div>
        </form>
      </div>
    </div>
  </div>
</section>`,
    },
  ],
};
