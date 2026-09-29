import type { ModuleDefinition } from "../types";

export const blog: ModuleDefinition = {
  id: "blog",
  name: "Blog",
  tagline: "Post and publish articles",
  description:
    "A blog home page with a list of recent posts, an admin page to publish new posts, and a flow that returns the post feed. Wire up a per-post detail page later by editing in the visual editor.",
  icon: "",
  color: "from-fuchsia-500 to-brand-600",
  category: "content",
  version: "1.0.0",

  config: [
    {
      key: "blogTitle",
      label: "Blog title",
      type: "text",
      default: "The Blog",
      required: true,
    },
    {
      key: "author",
      label: "Default author name",
      type: "text",
      default: "The team",
    },
  ],

  tables: [
    {
      name: "posts",
      fields: [
        { name: "title", type: "text" },
        { name: "slug", type: "text" },
        { name: "excerpt", type: "text" },
        { name: "body", type: "text" },
        { name: "author", type: "text" },
        { name: "published", type: "bool" },
      ],
      seed: [
        {
          title: "Welcome to {{config.blogTitle}}",
          slug: "welcome",
          excerpt: "This is your first post. Edit or delete it from the admin.",
          body: "This is your first post. Head into the admin page to publish more, or open this page in the visual editor to customize the layout.",
          author: "{{config.author}}",
          published: true,
        },
      ],
    },
  ],

  flows: [
    {
      slug: "create-post",
      name: "Create blog post",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: { label: "New post" } },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "posts",
            values: {
              title: "{{trigger.title}}",
              slug: "{{trigger.slug}}",
              excerpt: "{{trigger.excerpt}}",
              body: "{{trigger.body}}",
              author: "{{trigger.author}}",
              published: "{{trigger.published}}",
            },
            output: "post",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: '{"ok":true}' },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "feed",
      name: "Blog feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: { label: "Load feed" } },
        {
          id: "n2",
          type: "query",
          data: {
            table: "posts",
            where: { published: "true" },
            orderBy: "created_at desc",
            limit: 50,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
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
      slug: "home",
      title: "Blog",
      html: `<section class="nk-hero">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-7">
        <span class="nk-eyebrow">THE JOURNAL</span>
        <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">{{config.blogTitle}}</h1>
        <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:540px;">Thoughts, tutorials, product updates and stories from {{config.author}}.</p>
        <div class="d-flex flex-wrap gap-3">
          <a href="#latest" class="btn btn-primary btn-lg px-4">Read the latest</a>
          <a href="/admin" class="btn btn-outline-primary btn-lg px-4">Write a post</a>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="nk-eyebrow mb-2">SUBSCRIBE</div>
          <h3 class="h4 fw-bold mb-2">Never miss a post</h3>
          <p class="small mb-3" style="color:var(--nk-text-muted);">Get new articles in your inbox. No spam, unsubscribe anytime.</p>
          <div class="d-flex gap-2">
            <input type="email" class="form-control form-control-lg" placeholder="you@example.com"/>
            <button class="btn btn-primary btn-lg px-3">Join</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6" id="latest">
  <div class="container">
    <div class="nk-section-title">
      <span class="nk-eyebrow">LATEST POSTS</span>
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Fresh from the team</h2>
      <p class="lead">New stories every week.</p>
    </div>
    <div data-nk-bind-flow-ref="feed" class="row g-4">
      <div class="col-md-6 col-lg-4" data-nk-item>
        <a class="card h-100 hoverable" href="#" data-nk-href="slug" style="text-decoration:none;">
          <div style="aspect-ratio:16/10;background:linear-gradient(135deg, var(--nk-primary), var(--nk-accent));border-top-left-radius:var(--nk-radius);border-top-right-radius:var(--nk-radius);"></div>
          <div class="card-body p-4">
            <div class="small text-uppercase fw-semibold mb-2" style="color:var(--nk-primary);letter-spacing:0.12em;" data-nk-field="author">{{config.author}}</div>
            <h3 class="h5 fw-bold mb-2" data-nk-field="title">Post title</h3>
            <p class="mb-0" style="color:var(--nk-text-muted);font-size:.92rem;" data-nk-field="excerpt">A short preview of this post that makes you want to keep reading.</p>
          </div>
        </a>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6">
  <div class="container">
    <div class="nk-cta-band">
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Have a story to share?</h2>
      <p class="lead mb-4">Write your first post and publish it to the world.</p>
      <a href="/admin" class="btn btn-lg px-4">Write a post</a>
    </div>
  </div>
</section>
<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">{{config.blogTitle}}</div>
        <div class="small" style="color:var(--nk-text-muted);">Written by {{config.author}}.</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="me-3 small" href="/admin" style="color:var(--nk-text-muted);">Admin</a>
        <a class="small" href="#" style="color:var(--nk-text-muted);">RSS</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "admin",
      title: "Blog admin",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-9 col-xl-8">
        <span class="nk-eyebrow">NEW POST</span>
        <h1 class="display-5 fw-bold mb-2" style="letter-spacing:-0.02em;">Publish an article</h1>
        <p class="lead mb-5" style="color:var(--nk-text-muted);">Share something with the readers of {{config.blogTitle}}.</p>
        <form data-nk-form="" data-nk-flow-ref="create-post" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow);">
          <div class="row g-4">
            <div class="col-md-8">
              <label class="form-label">Title</label>
              <input name="title" class="form-control form-control-lg" placeholder="A compelling headline" required/>
            </div>
            <div class="col-md-4">
              <label class="form-label">URL slug</label>
              <input name="slug" class="form-control form-control-lg" placeholder="my-post"/>
            </div>
            <div class="col-12">
              <label class="form-label">Excerpt</label>
              <input name="excerpt" class="form-control form-control-lg" placeholder="A one-line preview shown on the home page"/>
            </div>
            <div class="col-12">
              <label class="form-label">Body</label>
              <textarea name="body" class="form-control form-control-lg" rows="10" placeholder="Write your post here..." required></textarea>
            </div>
            <div class="col-md-8">
              <label class="form-label">Author</label>
              <input name="author" class="form-control form-control-lg" value="{{config.author}}"/>
            </div>
            <div class="col-md-4 d-flex align-items-end">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" name="published" value="true" checked/>
                <label class="form-check-label fw-semibold">Publish now</label>
              </div>
            </div>
            <div class="col-12 d-flex justify-content-end gap-2">
              <a href="/" class="btn btn-outline-primary btn-lg px-4">Cancel</a>
              <button class="btn btn-primary btn-lg px-4" type="submit">Publish</button>
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
