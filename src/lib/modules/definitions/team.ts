import type { ModuleDefinition } from "../types";

export const team: ModuleDefinition = {
  id: "team",
  name: "Team Directory",
  tagline: "Meet the team page",
  description:
    "A staff directory with photo, name, role and short bio. Perfect for about pages and internal intranets.",
  icon: "",
  color: "from-fuchsia-500 to-purple-600",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "heading", label: "Page heading", type: "text", default: "Meet the team", required: true },
  ],
  tables: [
    {
      name: "members",
      fields: [
        { name: "name", type: "text" },
        { name: "role", type: "text" },
        { name: "bio", type: "text" },
        { name: "photo_url", type: "text" },
        { name: "email", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Team feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "members", orderBy: "created_at asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add team member",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "members", values: {
          name: "{{trigger.name}}",
          role: "{{trigger.role}}",
          bio: "{{trigger.bio}}",
          photo_url: "{{trigger.photo_url}}",
          email: "{{trigger.email}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "team",
      title: "Team",
      html: `<section class="nk-hero">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-7">
        <span class="nk-eyebrow">WHO WE ARE</span>
        <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">{{config.heading}}</h1>
        <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:540px;">A small, passionate group of designers, engineers and operators building something we're proud of.</p>
        <div class="d-flex flex-wrap gap-3">
          <a href="#team" class="btn btn-primary btn-lg px-4">Meet everyone</a>
          <a href="/{{page.team-admin}}" class="btn btn-outline-primary btn-lg px-4">Add a member</a>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="nk-eyebrow mb-2">HIRING</div>
          <h3 class="h4 fw-bold mb-2">Join the team</h3>
          <p class="small mb-0" style="color:var(--nk-text-muted);">We're always looking for thoughtful, kind people who care about craft. Reach out anytime.</p>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6" id="team">
  <div class="container">
    <div class="nk-section-title">
      <span class="nk-eyebrow">THE TEAM</span>
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Say hello</h2>
      <p class="lead">The humans behind everything we build.</p>
    </div>
    <div data-nk-bind-flow-ref="feed" class="row g-4">
      <div class="col-md-6 col-lg-4" data-nk-item>
        <div class="nk-feature h-100 text-center">
          <div data-nk-src="photo_url" class="mx-auto mb-3" style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg, var(--nk-primary), var(--nk-accent));"></div>
          <h3 class="h5 fw-bold mb-1" data-nk-field="name">Team member</h3>
          <div class="small text-uppercase fw-semibold mb-3" style="color:var(--nk-primary);letter-spacing:0.12em;" data-nk-field="role">Role</div>
          <p class="mb-0" style="color:var(--nk-text-muted);font-size:.92rem;" data-nk-field="bio">A short bio about this person and what they work on.</p>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6">
  <div class="container">
    <div class="nk-cta-band">
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Want to join us?</h2>
      <p class="lead mb-4">We're growing — let's find out if there's a fit.</p>
      <a href="mailto:jobs@example.com" class="btn btn-lg px-4">See open roles</a>
    </div>
  </div>
</section>
<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">{{config.heading}}</div>
        <div class="small" style="color:var(--nk-text-muted);">Built by people who care.</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="small" href="/{{page.team-admin}}" style="color:var(--nk-text-muted);">Admin</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "team-admin",
      title: "Add member",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-9 col-xl-8">
        <span class="nk-eyebrow">NEW MEMBER</span>
        <h1 class="display-5 fw-bold mb-2" style="letter-spacing:-0.02em;">Add team member</h1>
        <p class="lead mb-5" style="color:var(--nk-text-muted);">Introduce someone new to the team directory.</p>
        <form data-nk-form="" data-nk-flow-ref="add" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="row g-4">
            <div class="col-md-6">
              <label class="form-label">Name</label>
              <input name="name" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Role</label>
              <input name="role" class="form-control form-control-lg"/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Photo URL</label>
              <input name="photo_url" type="url" class="form-control form-control-lg"/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <input name="email" type="email" class="form-control form-control-lg"/>
            </div>
            <div class="col-12">
              <label class="form-label">Bio</label>
              <textarea name="bio" class="form-control form-control-lg" rows="4"></textarea>
            </div>
            <div class="col-12 d-flex justify-content-end gap-2">
              <a href="/team" class="btn btn-outline-primary btn-lg px-4">Cancel</a>
              <button class="btn btn-primary btn-lg px-4" type="submit">Add member</button>
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
