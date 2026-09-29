import type { ModuleDefinition } from "../types";

export const reviews: ModuleDefinition = {
  id: "reviews",
  name: "Reviews",
  tagline: "Collect customer reviews with ratings",
  description:
    "A review submission page with a star rating and comment, plus a public page that lists every approved review. Perfect for adding social proof to your site.",
  icon: "",
  color: "from-yellow-500 to-amber-600",
  category: "community",
  version: "1.0.0",
  provides: ["reviews"],

  config: [
    {
      key: "brand",
      label: "Brand / business name",
      type: "text",
      default: "our service",
      required: true,
    },
  ],

  tables: [
    {
      name: "reviews",
      fields: [
        { name: "reviewer_name", type: "text" },
        { name: "rating", type: "int" },
        { name: "comment", type: "text" },
        { name: "approved", type: "bool" },
      ],
    },
  ],

  flows: [
    {
      slug: "submit",
      name: "Submit review",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "reviews",
            values: {
              reviewer_name: "{{trigger.reviewer_name}}",
              rating: "{{trigger.rating}}",
              comment: "{{trigger.comment}}",
              approved: "false",
            },
            output: "review",
          },
        },
        {
          id: "n3",
          type: "response",
          data: {
            status: 200,
            body: '{"ok":true,"message":"Thanks! Your review is pending approval."}',
          },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "approved",
      name: "Approved reviews",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "reviews",
            where: { approved: "true" },
            orderBy: "created_at desc",
            limit: 100,
            output: "rows",
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
  ],

  pages: [
    {
      slug: "reviews",
      title: "Reviews",
      html: `<section class="py-5" style="background:var(--nk-surface-2);">
  <div class="container">
    <div class="row justify-content-center text-center">
      <div class="col-lg-8">
        <h1 class="display-4 fw-bold">What people say about {{config.brand}}</h1>
        <p class="lead mt-3" style="color:var(--nk-text-muted);">Honest reviews from real customers.</p>
      </div>
    </div>
    <div data-nk-bind-flow-ref="approved" class="row g-4 mt-4">
      <div class="col-md-4" data-nk-item>
        <div class="card h-100 border-0 shadow-sm"><div class="card-body">
          <div class="text-warning mb-2">★★★★★</div>
          <p class="card-text" data-nk-field="comment">"Really impressed with the quality and speed. Will definitely be back."</p>
          <div class="fw-bold" data-nk-field="reviewer_name">Alex Morgan</div>
        </div></div>
      </div>
      <div class="col-md-4"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="text-warning mb-2">★★★★★</div><p class="card-text">"Fantastic experience from start to finish. Highly recommend to anyone."</p><div class="fw-bold">Jamie Taylor</div></div></div></div>
      <div class="col-md-4"><div class="card h-100 border-0 shadow-sm"><div class="card-body"><div class="text-warning mb-2">★★★★★</div><p class="card-text">"Exactly what I was looking for. The team went above and beyond."</p><div class="fw-bold">Chris Lee</div></div></div></div>
    </div>
  </div>
</section>`,
    },
    {
      slug: "leave-review",
      title: "Leave a review",
      html: `<section class="py-5">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-6">
        <h1 class="fw-bold">Share your experience</h1>
        <p style="color:var(--nk-text-muted);">How was {{config.brand}}? Your feedback helps others.</p>
        <form data-nk-form="" data-nk-flow-ref="submit" class="card p-4 mt-4 shadow-sm">
          <div class="mb-3">
            <label class="form-label">Your name</label>
            <input name="reviewer_name" class="form-control" required/>
          </div>
          <div class="mb-3">
            <label class="form-label">Rating (1-5)</label>
            <input name="rating" type="number" min="1" max="5" class="form-control" required/>
          </div>
          <div class="mb-3">
            <label class="form-label">Your review</label>
            <textarea name="comment" class="form-control" rows="5" required></textarea>
          </div>
          <div class="text-end">
            <button class="btn btn-primary" type="submit">Submit review</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</section>`,
    },
  ],
};
