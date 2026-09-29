import type { ModuleDefinition } from "../types";

export const bookings: ModuleDefinition = {
  id: "bookings",
  name: "Bookings",
  tagline: "Take reservations with slot checking",
  description:
    "A booking page where customers pick a date and time, add their details, and submit a reservation. Double-booking protection checks for an existing booking at the requested slot before accepting. Backed by a bookings table and an admin page to browse upcoming slots.",
  icon: "",
  color: "from-amber-500 to-orange-600",
  category: "commerce",
  version: "1.1.0",

  config: [
    {
      key: "businessName",
      label: "Business name",
      type: "text",
      default: "Your business",
      required: true,
    },
    {
      key: "serviceLabel",
      label: "What is being booked?",
      type: "text",
      default: "Service",
      help: "e.g. 'Haircut', 'Dog walk', 'Appointment'",
    },
  ],

  tables: [
    {
      name: "bookings",
      fields: [
        { name: "customer_name", type: "text" },
        { name: "email", type: "text" },
        { name: "phone", type: "text" },
        { name: "service", type: "text" },
        { name: "slot_at", type: "timestamp" },
        { name: "notes", type: "text" },
        { name: "status", type: "text" },
      ],
    },
  ],

  flows: [
    {
      slug: "book",
      name: "Make a booking",
      httpMethod: "POST",
      purpose:
        "Queries for any existing bookings at the requested slot and rejects the request if one is found. Race-safe enough for single-instance low-traffic deployments; for higher throughput, add a unique constraint on slot_at.",
      nodes: [
        { id: "n1", type: "trigger", data: { label: "Booking request" } },
        {
          id: "n2",
          type: "query",
          data: {
            label: "Check availability",
            table: "bookings",
            where: { slot_at: "{{trigger.slot_at}}" },
            limit: 10,
            output: "existing",
          },
        },
        {
          id: "n3",
          type: "branch",
          data: {
            label: "Slot taken?",
            left: "{{vars.existing.length}}",
            op: ">",
            right: "0",
          },
        },
        {
          id: "n4",
          type: "response",
          data: {
            label: "Slot already booked",
            status: 409,
            body: '{"error":"That slot is already booked. Please pick a different time."}',
          },
        },
        {
          id: "n5",
          type: "insert",
          data: {
            table: "bookings",
            values: {
              customer_name: "{{trigger.customer_name}}",
              email: "{{trigger.email}}",
              phone: "{{trigger.phone}}",
              service: "{{trigger.service}}",
              slot_at: "{{trigger.slot_at}}",
              notes: "{{trigger.notes}}",
              status: "pending",
            },
            output: "booking",
          },
        },
        {
          id: "n6",
          type: "response",
          data: {
            status: 200,
            body: '{"ok":true,"message":"Booking received. We\'ll confirm shortly."}',
          },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n3", target: "n5", sourceHandle: "false" },
        { id: "e5", source: "n5", target: "n6" },
      ],
    },
    {
      slug: "list",
      name: "List bookings",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: { label: "Load bookings" } },
        {
          id: "n2",
          type: "query",
          data: {
            table: "bookings",
            orderBy: "slot_at asc",
            limit: 200,
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
      slug: "book",
      title: "Book now",
      html: `<section class="nk-hero">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-6">
        <span class="nk-eyebrow">RESERVATIONS</span>
        <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">Book with {{config.businessName}}</h1>
        <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:520px;">Pick a day and time that works for you. We'll confirm your reservation by email within minutes.</p>
        <div class="d-flex flex-wrap gap-4 mb-2">
          <div>
            <div class="nk-eyebrow mb-1">INSTANT</div>
            <div class="fw-semibold">Online booking</div>
          </div>
          <div>
            <div class="nk-eyebrow mb-1">FLEXIBLE</div>
            <div class="fw-semibold">Reschedule anytime</div>
          </div>
          <div>
            <div class="nk-eyebrow mb-1">FAST</div>
            <div class="fw-semibold">Email confirmation</div>
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <form data-nk-form="" data-nk-flow-ref="book" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="nk-eyebrow mb-2">REQUEST A SLOT</div>
          <h3 class="h4 fw-bold mb-4">Reserve your time</h3>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Your name</label>
              <input name="customer_name" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Phone</label>
              <input name="phone" class="form-control form-control-lg"/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <input name="email" type="email" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-6">
              <label class="form-label">{{config.serviceLabel}}</label>
              <input name="service" class="form-control form-control-lg"/>
            </div>
            <div class="col-12">
              <label class="form-label">When</label>
              <input name="slot_at" type="datetime-local" class="form-control form-control-lg" required/>
            </div>
            <div class="col-12">
              <label class="form-label">Notes (optional)</label>
              <textarea name="notes" class="form-control form-control-lg" rows="3"></textarea>
            </div>
            <div class="col-12 d-grid">
              <button class="btn btn-primary btn-lg px-4" type="submit">Request booking</button>
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
    <div class="nk-section-title">
      <span class="nk-eyebrow">HOW IT WORKS</span>
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Three simple steps</h2>
      <p class="lead">From request to confirmed reservation, in minutes.</p>
    </div>
    <div class="row g-4">
      <div class="col-md-6 col-lg-4">
        <div class="nk-feature h-100">
          <div class="nk-icon-chip mb-3">1</div>
          <h3 class="h5 fw-bold mb-2">Pick your slot</h3>
          <p class="mb-0" style="color:var(--nk-text-muted);">Choose a date and time from the calendar that fits your schedule.</p>
        </div>
      </div>
      <div class="col-md-6 col-lg-4">
        <div class="nk-feature h-100">
          <div class="nk-icon-chip mb-3">2</div>
          <h3 class="h5 fw-bold mb-2">Share your details</h3>
          <p class="mb-0" style="color:var(--nk-text-muted);">Tell us who you are and how to reach you so we can confirm the booking.</p>
        </div>
      </div>
      <div class="col-md-6 col-lg-4">
        <div class="nk-feature h-100">
          <div class="nk-icon-chip mb-3">3</div>
          <h3 class="h5 fw-bold mb-2">Get confirmation</h3>
          <p class="mb-0" style="color:var(--nk-text-muted);">We'll review and confirm your reservation by email, usually within the hour.</p>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6">
  <div class="container">
    <div class="nk-cta-band">
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Ready to reserve?</h2>
      <p class="lead mb-4">Book your {{config.serviceLabel}} with {{config.businessName}} today.</p>
      <a href="#top" class="btn btn-lg px-4">Book now</a>
    </div>
  </div>
</section>
<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">{{config.businessName}}</div>
        <div class="small" style="color:var(--nk-text-muted);">Online reservations made simple.</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="small" href="/{{page.admin}}" style="color:var(--nk-text-muted);">Admin</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "admin",
      title: "Bookings admin",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <span class="nk-eyebrow">ADMIN</span>
    <h1 class="display-5 fw-bold mb-2" style="letter-spacing:-0.02em;">Upcoming bookings</h1>
    <p class="lead mb-0" style="color:var(--nk-text-muted);">Sorted by slot time, with the soonest appearing first.</p>
  </div>
</section>
<section class="py-5">
  <div class="container">
    <div data-nk-bind-flow-ref="list">
      <div data-nk-item class="p-3 mb-2" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><div class="d-flex flex-wrap justify-content-between gap-2"><strong data-nk-field="customer_name">Customer</strong><span class="fw-semibold" data-nk-field="slot_at" data-nk-format="datetime"></span></div><div class="small mt-1"><span data-nk-field="service"></span> · <span data-nk-field="status"></span></div><div class="small mt-1"><a data-nk-attr-href="mailto:{email}" data-nk-field="email">email</a> · <a data-nk-attr-href="tel:{phone}" data-nk-field="phone">phone</a></div><p class="small mb-0 mt-1" style="color:var(--nk-text-muted);" data-nk-field="notes"></p></div><p data-nk-empty hidden style="color:var(--nk-text-muted);">No bookings yet.</p>
    </div>
  </div>
</section>`,
    },
  ],
};
