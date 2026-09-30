import type { ModuleDefinition } from "../types";

export const rentals: ModuleDefinition = {
  id: "rentals",
  name: "Vacation Rentals",
  tagline: "Short-term rental listings",
  description:
    "Airbnb-style short-term rental listings. Each has photos, nightly price, sleeps count, amenities and a booking request form.",
  icon: "",
  color: "from-teal-500 to-green-600",
  category: "commerce",
  version: "1.0.0",
  config: [],
  tables: [
    {
      name: "listings",
      fields: [
        { name: "title", type: "text" },
        { name: "location", type: "text" },
        { name: "nightly_rate", type: "float" },
        { name: "sleeps", type: "int" },
        { name: "bedrooms", type: "int" },
        { name: "image_url", type: "text" },
        { name: "description", type: "text" },
        { name: "rating", type: "float" },
      ],
    },
    {
      name: "bookings",
      fields: [
        { name: "listing_id", type: "int" },
        { name: "guest_name", type: "text" },
        { name: "email", type: "text" },
        { name: "checkin", type: "timestamp" },
        { name: "checkout", type: "timestamp" },
        { name: "guests", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Rentals feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "listings", orderBy: "created_at desc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "book",
      name: "Request booking",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "bookings", values: {
          listing_id: "{{trigger.listing_id}}",
          guest_name: "{{trigger.guest_name}}",
          email: "{{trigger.email}}",
          checkin: "{{trigger.checkin}}",
          checkout: "{{trigger.checkout}}",
          guests: "{{trigger.guests}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Booking requested!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "rentals",
      title: "Rentals",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container text-center"><h1 class="display-4 fw-bold">Unique places to stay</h1><p class="lead" style="color:var(--nk-text-muted);">Hand-picked rentals for your next trip.</p></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-4" data-nk-item><div class="card border-0 shadow-sm h-100"><img class="card-img-top" data-nk-src="image_url" src="/media/generated/hospitality-lighthouse-loft.webp" alt=""/><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1" data-nk-field="title">Cozy cabin in the woods</h5><div class="small">★ <span data-nk-field="rating">4.9</span></div></div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="location">Big Sur, California</div><p class="card-text small mt-2 mb-2" data-nk-field="description">Off-grid cabin with woodstove, stargazing deck, and hiking trails right out the door.</p><div class="d-flex justify-content-between align-items-center"><div class="small" style="color:var(--nk-text-muted);">Sleeps <span data-nk-field="sleeps">4</span> · <span data-nk-field="bedrooms">2</span> beds</div><div class="fw-bold">$<span data-nk-field="nightly_rate">185</span>/night</div></div></div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="/media/generated/hospitality-dune-room.webp" alt=""/><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1">Beachfront bungalow</h5><div class="small">★ 4.8</div></div><div class="small" style="color:var(--nk-text-muted);">Tulum, Mexico</div><p class="card-text small mt-2 mb-2">Steps from the beach, hammock on the porch, outdoor shower.</p><div class="d-flex justify-content-between align-items-center"><div class="small" style="color:var(--nk-text-muted);">Sleeps 2 · 1 bed</div><div class="fw-bold">$145/night</div></div></div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="/media/generated/realestate-downtown-condo.webp" alt=""/><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1">Downtown loft with balcony</h5><div class="small">★ 4.7</div></div><div class="small" style="color:var(--nk-text-muted);">Montreal, Canada</div><p class="card-text small mt-2 mb-2">Walking distance to cafes, restaurants and the old town.</p><div class="d-flex justify-content-between align-items-center"><div class="small" style="color:var(--nk-text-muted);">Sleeps 3 · 1 bed</div><div class="fw-bold">$115/night</div></div></div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="/media/generated/travel-alpine-meadows.webp" alt=""/><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1">Mountain view chalet</h5><div class="small">★ 5.0</div></div><div class="small" style="color:var(--nk-text-muted);">Whistler, BC</div><p class="card-text small mt-2 mb-2">Ski-in / ski-out, hot tub, full kitchen and fireplace.</p><div class="d-flex justify-content-between align-items-center"><div class="small" style="color:var(--nk-text-muted);">Sleeps 8 · 4 beds</div><div class="fw-bold">$420/night</div></div></div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="/media/generated/realestate-woodstock-modern.webp" alt=""/><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1">Tiny house in wine country</h5><div class="small">★ 4.9</div></div><div class="small" style="color:var(--nk-text-muted);">Napa Valley, CA</div><p class="card-text small mt-2 mb-2">Peaceful vineyard retreat. Breakfast basket included.</p><div class="d-flex justify-content-between align-items-center"><div class="small" style="color:var(--nk-text-muted);">Sleeps 2 · 1 bed</div><div class="fw-bold">$225/night</div></div></div></div></div>
  <div class="col-md-4"><div class="card border-0 shadow-sm h-100"><img class="card-img-top" src="/media/generated/travel-tent-view.webp" alt=""/><div class="card-body"><div class="d-flex justify-content-between align-items-start"><h5 class="card-title fw-bold mb-1">Lakeside A-frame</h5><div class="small">★ 4.8</div></div><div class="small" style="color:var(--nk-text-muted);">Lake Tahoe, NV</div><p class="card-text small mt-2 mb-2">Paddleboards, kayaks and a private dock.</p><div class="d-flex justify-content-between align-items-center"><div class="small" style="color:var(--nk-text-muted);">Sleeps 6 · 3 beds</div><div class="fw-bold">$310/night</div></div></div></div></div>
</div>
</div></section>`,
    },
  ],
};
