import type { ModuleDefinition } from "../types";

export const testimonials: ModuleDefinition = {
  id: "testimonials",
  name: "Testimonials",
  tagline: "Customer quotes for social proof",
  description:
    "Collect and display customer quotes. Simpler than a review system — no rating stars, just name, photo and the quote text. Perfect to drop into a landing page.",
  icon: "",
  color: "from-cyan-500 to-sky-600",
  category: "content",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "items",
      fields: [
        { name: "author", type: "text" },
        { name: "role", type: "text" },
        { name: "quote", type: "text" },
        { name: "photo_url", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Testimonials feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "created_at desc", limit: 100, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "add",
      name: "Add testimonial",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          author: "{{trigger.author}}",
          role: "{{trigger.role}}",
          quote: "{{trigger.quote}}",
          photo_url: "{{trigger.photo_url}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "testimonials",
      title: "Testimonials",
      html: `<section class="nk-hero">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-7">
        <span class="nk-eyebrow">SOCIAL PROOF</span>
        <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">Loved by customers</h1>
        <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:540px;">Real words from real people. Here's what our customers have to say about working with us.</p>
        <div class="d-flex flex-wrap gap-3">
          <a href="#quotes" class="btn btn-primary btn-lg px-4">Read the quotes</a>
          <a href="/{{page.testimonials-admin}}" class="btn btn-outline-primary btn-lg px-4">Share yours</a>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="nk-eyebrow mb-2">★★★★★</div>
          <h3 class="h4 fw-bold mb-2">Trusted by teams everywhere</h3>
          <p class="small mb-0" style="color:var(--nk-text-muted);">From indie makers to established companies, people rely on us to ship faster.</p>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6" id="quotes">
  <div class="container">
    <div class="nk-section-title">
      <span class="nk-eyebrow">TESTIMONIALS</span>
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">What customers say</h2>
      <p class="lead">Every quote is from a real customer, shared with permission.</p>
    </div>
    <div data-nk-bind-flow-ref="feed" class="row g-4">
      <div class="col-md-6 col-lg-4" data-nk-item>
        <div class="nk-feature h-100">
          <div class="mb-3" style="color:var(--nk-primary);font-size:1.1rem;letter-spacing:0.1em;">★★★★★</div>
          <blockquote class="mb-4" style="font-size:1.05rem;line-height:1.6;">
            <p class="mb-0" data-nk-field="quote">"Everything changed for our team once we started using this. Highly recommended."</p>
          </blockquote>
          <div class="d-flex align-items-center">
            <div data-nk-src="photo_url" class="me-3" style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg, var(--nk-primary), var(--nk-accent));flex-shrink:0;"></div>
            <div>
              <div class="fw-bold" data-nk-field="author">Author name</div>
              <div class="small" style="color:var(--nk-text-muted);" data-nk-field="role">Role, Company</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6">
  <div class="container">
    <div class="nk-cta-band">
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Have a kind word?</h2>
      <p class="lead mb-4">We'd love to share your story too.</p>
      <a href="/{{page.testimonials-admin}}" class="btn btn-lg px-4">Leave a testimonial</a>
    </div>
  </div>
</section>
<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">Testimonials</div>
        <div class="small" style="color:var(--nk-text-muted);">Genuine stories from genuine users.</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="small" href="/{{page.testimonials-admin}}" style="color:var(--nk-text-muted);">Admin</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "testimonials-admin",
      title: "Add testimonial",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-9 col-xl-8">
        <span class="nk-eyebrow">NEW QUOTE</span>
        <h1 class="display-5 fw-bold mb-2" style="letter-spacing:-0.02em;">Add a testimonial</h1>
        <p class="lead mb-5" style="color:var(--nk-text-muted);">Capture a kind word from a customer and share it on your homepage.</p>
        <form data-nk-form="" data-nk-flow-ref="add" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="row g-4">
            <div class="col-md-6">
              <label class="form-label">Author name</label>
              <input name="author" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Role / company</label>
              <input name="role" class="form-control form-control-lg"/>
            </div>
            <div class="col-12">
              <label class="form-label">Photo URL</label>
              <input name="photo_url" type="url" class="form-control form-control-lg"/>
            </div>
            <div class="col-12">
              <label class="form-label">Quote</label>
              <textarea name="quote" class="form-control form-control-lg" rows="5" required></textarea>
            </div>
            <div class="col-12 d-flex justify-content-end gap-2">
              <a href="/testimonials" class="btn btn-outline-primary btn-lg px-4">Cancel</a>
              <button class="btn btn-primary btn-lg px-4" type="submit">Add testimonial</button>
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
