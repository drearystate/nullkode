import type { ModuleDefinition } from "../types";

export const contactForm: ModuleDefinition = {
  id: "contact-form",
  name: "Contact Form",
  tagline: "Collect messages from visitors",
  description:
    "A polished contact page with a full-width form that saves submissions to a database. Includes an admin inbox page where you can browse every message.",
  icon: "",
  color: "from-blue-500 to-brand-600",
  category: "communication",
  version: "1.0.0",

  config: [
    {
      key: "heading",
      label: "Page heading",
      type: "text",
      default: "Get in touch",
      required: true,
    },
    {
      key: "subheading",
      label: "Short subheading",
      type: "text",
      default: "We read every message. Drop us a note and we'll get back to you.",
    },
  ],

  tables: [
    {
      name: "messages",
      fields: [
        { name: "full_name", type: "text" },
        { name: "email", type: "text" },
        { name: "subject", type: "text" },
        { name: "body", type: "text" },
      ],
    },
  ],

  flows: [
    {
      slug: "submit",
      name: "Submit contact message",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: { label: "New contact submission" } },
        {
          id: "n2",
          type: "insert",
          data: {
            label: "Save message",
            table: "messages",
            values: {
              full_name: "{{trigger.full_name}}",
              email: "{{trigger.email}}",
              subject: "{{trigger.subject}}",
              body: "{{trigger.body}}",
            },
            output: "saved",
          },
        },
        {
          id: "n3",
          type: "response",
          data: {
            label: "Thanks response",
            status: 200,
            body: '{"ok":true,"message":"Thanks, we got it!"}',
          },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "list",
      name: "List contact messages",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: { label: "Load inbox" } },
        {
          id: "n2",
          type: "query",
          data: {
            label: "Fetch messages",
            table: "messages",
            orderBy: "created_at desc",
            limit: 200,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: {
            label: "Return rows",
            status: 200,
            body: "{{vars.rows}}",
          },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],

  pages: [
    {
      slug: "contact",
      title: "Contact",
      html: `<section class="nk-hero">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-6">
        <span class="nk-eyebrow">CONTACT</span>
        <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">{{config.heading}}</h1>
        <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:520px;">{{config.subheading}}</p>
        <div class="row g-4">
          <div class="col-sm-6">
            <div class="nk-feature h-100">
              <div class="nk-icon-chip mb-3">@</div>
              <h3 class="h6 fw-bold mb-1">Email us</h3>
              <p class="small mb-0" style="color:var(--nk-text-muted);">We reply within one business day.</p>
            </div>
          </div>
          <div class="col-sm-6">
            <div class="nk-feature h-100">
              <div class="nk-icon-chip mb-3">#</div>
              <h3 class="h6 fw-bold mb-1">Questions welcome</h3>
              <p class="small mb-0" style="color:var(--nk-text-muted);">Sales, support, partnerships — ask away.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <form data-nk-form="" data-nk-flow-ref="submit" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="nk-eyebrow mb-2">SEND A MESSAGE</div>
          <h3 class="h4 fw-bold mb-4">We'd love to hear from you</h3>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Your name</label>
              <input name="full_name" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <input name="email" type="email" class="form-control form-control-lg" required/>
            </div>
            <div class="col-12">
              <label class="form-label">Subject</label>
              <input name="subject" class="form-control form-control-lg"/>
            </div>
            <div class="col-12">
              <label class="form-label">Message</label>
              <textarea name="body" class="form-control form-control-lg" rows="5" required></textarea>
            </div>
            <div class="col-12 d-grid">
              <button class="btn btn-primary btn-lg px-4" type="submit">Send message</button>
            </div>
          </div>
          <div data-nk-error class="text-danger small mt-3"></div>
        </form>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6">
  <div class="container">
    <div class="nk-cta-band">
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Prefer something else?</h2>
      <p class="lead mb-4">Drop us a line whenever you're ready — no form required.</p>
      <a href="#top" class="btn btn-lg px-4">Write to us</a>
    </div>
  </div>
</section>
<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">{{config.heading}}</div>
        <div class="small" style="color:var(--nk-text-muted);">Your message lands straight in our inbox.</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="small" href="/{{page.inbox}}" style="color:var(--nk-text-muted);">Inbox</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "inbox",
      title: "Inbox",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <span class="nk-eyebrow">INBOX</span>
    <h1 class="display-5 fw-bold mb-2" style="letter-spacing:-0.02em;">Every message, in one place</h1>
    <p class="lead mb-0" style="color:var(--nk-text-muted);">Every contact submission, newest first.</p>
  </div>
</section>
<section class="py-5">
  <div class="container">
    <div data-nk-bind-flow-ref="list">
      <div data-nk-item class="p-3 mb-2" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><div class="d-flex flex-wrap justify-content-between gap-2"><strong data-nk-field="full_name">Name</strong><span class="small" style="color:var(--nk-text-muted);" data-nk-field="created_at" data-nk-format="datetime"></span></div><a class="small" data-nk-attr-href="mailto:{email}" data-nk-field="email">email</a><div class="fw-semibold mt-2" data-nk-field="subject">Subject</div><p class="mb-0 mt-1" style="white-space:pre-wrap;" data-nk-field="body">Message</p></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">No messages yet.</p>
    </div>
  </div>
</section>`,
    },
  ],
};
