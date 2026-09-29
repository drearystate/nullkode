import type { ModuleDefinition } from "../types";

export const gym: ModuleDefinition = {
  id: "gym",
  name: "Gym / Membership",
  tagline: "Memberships, classes, check-ins",
  description:
    "A small gym or studio toolkit: membership plans (Monthly, 10-pack), class schedule with capacity, and a check-in flow that scans a member to log entry. Owner sees today's attendance and current active members.",
  icon: "",
  color: "from-green-600 to-lime-700",
  category: "commerce",
  version: "1.0.0",
  worksWith: ["loyalty-card", "qr-scanner"],
  config: [
    { key: "gymName", label: "Gym name", type: "text", default: "Iron House", required: true },
  ],
  tables: [
    {
      name: "members",
      fields: [
        { name: "name", type: "text" },
        { name: "email", type: "text" },
        { name: "phone", type: "text" },
        { name: "plan", type: "text" },
        { name: "active", type: "bool" },
      ],
    },
    {
      name: "classes",
      fields: [
        { name: "name", type: "text" },
        { name: "start_at", type: "timestamp" },
        { name: "capacity", type: "int" },
        { name: "booked", type: "int" },
        { name: "coach", type: "text" },
      ],
      seed: [
        { name: "Yoga Flow", start_at: "2026-05-23 09:00:00", capacity: 20, booked: 14, coach: "Mei L." },
        { name: "HIIT 45", start_at: "2026-05-23 17:30:00", capacity: 25, booked: 25, coach: "Devon R." },
      ],
    },
    {
      name: "bookings",
      fields: [
        { name: "class_id", type: "text" },
        { name: "member_id", type: "text" },
      ],
    },
    {
      name: "checkins",
      fields: [
        { name: "member_id", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "enroll",
      name: "Enroll a new member",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "members",
            values: {
              name: "{{trigger.name}}",
              email: "{{trigger.email}}",
              phone: "{{trigger.phone}}",
              plan: "{{trigger.plan}}",
              active: "true",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Welcome to the gym!"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "checkin",
      name: "Check in at the door",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "members", where: { email: "{{trigger.email}}", active: "true" }, limit: 1, output: "m" } },
        { id: "n3", type: "branch", data: { left: "{{vars.m.0.id}}", op: "exists", right: "" } },
        { id: "n4", type: "insert", data: { table: "checkins", values: { member_id: "{{vars.m.0.id}}" } } },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"message":"Welcome back, {{vars.m.0.name}}!"}' } },
        { id: "n6", type: "response", data: { status: 404, body: '{"error":"Member not found"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
    {
      slug: "schedule",
      name: "Upcoming classes",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "classes", orderBy: "start_at asc", limit: 50, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "book-class",
      name: "Book a class",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "classes", where: { id: "{{trigger.class_id}}" }, limit: 1, output: "c" } },
        { id: "n3", type: "branch", data: { left: "{{vars.c.0.booked}}", op: "<", right: "{{vars.c.0.capacity}}" } },
        { id: "n4", type: "insert", data: { table: "bookings", values: { class_id: "{{trigger.class_id}}", member_id: "{{trigger.member_id}}" } } },
        {
          id: "n5",
          type: "update",
          data: { table: "classes", where: { id: "{{vars.c.0.id}}" }, values: { booked: "{{vars.c.0.booked}}+1" } },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true}' } },
        { id: "n7", type: "response", data: { status: 409, body: '{"error":"Class is full"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n3", target: "n7", sourceHandle: "false" },
      ],
    },
    {
      slug: "members",
      name: "All members",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "members", orderBy: "name asc", limit: 500, output: "rows" } },
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
      slug: "gym",
      title: "Home",
      isHome: true,
      html: `<section class="nk-hero" style="padding-block:clamp(4rem,10vw,8rem);background:linear-gradient(135deg,color-mix(in srgb,var(--nk-primary) 88%,black),color-mix(in srgb,var(--nk-accent) 70%,black));color:#fff;">
  <div class="container text-center" style="max-width:820px;">
    <p class="text-uppercase small fw-semibold mb-3" style="letter-spacing:.14em;opacity:.8;">{{config.gymName}}</p>
    <h1 class="display-4 fw-bold mb-3">Train with people who show up.</h1>
    <p class="lead mb-4" style="opacity:.85;">Group classes, coaching and open gym. Book a class in seconds and check in with your phone.</p>
    <div class="d-flex flex-wrap justify-content-center gap-2">
      <a href="/{{page.join}}" class="btn btn-light btn-lg px-4">Become a member</a>
      <a href="/{{page.schedule}}" class="btn btn-outline-light btn-lg px-4">See the class schedule</a>
    </div>
  </div>
</section>
<section class="py-5">
  <div class="container">
    <div class="row g-3">
      <div class="col-md-4"><div class="h-100 p-4" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><h2 class="h5 fw-bold">Classes every day</h2><p class="mb-3" style="color:var(--nk-text-muted);">Strength, conditioning, yoga and more. See what's on and how many spots are left.</p><a href="/{{page.schedule}}" class="fw-semibold">View the schedule</a></div></div>
      <div class="col-md-4"><div class="h-100 p-4" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><h2 class="h5 fw-bold">Simple membership</h2><p class="mb-3" style="color:var(--nk-text-muted);">Sign up online in a minute. No paperwork at the front desk.</p><a href="/{{page.join}}" class="fw-semibold">Join now</a></div></div>
      <div class="col-md-4"><div class="h-100 p-4" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);"><h2 class="h5 fw-bold">Quick check-in</h2><p class="mb-3" style="color:var(--nk-text-muted);">Already a member? Check in when you arrive so we know you're here.</p><a href="/{{page.checkin}}" class="fw-semibold">Check in</a></div></div>
    </div>
  </div>
</section>`,
    },
    {
      slug: "schedule",
      title: "Class schedule",
      html: `<section class="py-5"><div class="container" style="max-width:760px;"><h1 class="display-5 fw-bold">Class schedule</h1>
<div data-nk-bind-flow-ref="schedule" data-nk-refresh="30000" class="mt-3">
  <div class="d-flex align-items-center gap-3 p-3 border rounded mb-2" style="background:var(--nk-surface);" data-nk-item><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold" data-nk-field="name">Yoga Flow</div><div class="small" style="color:var(--nk-text-muted);"><span data-nk-field="start_at">Today 9:00 AM</span> · Coach <span data-nk-field="coach">Mei</span></div></div><div class="text-end"><div class="small"><span data-nk-field="booked">14</span>/<span data-nk-field="capacity">20</span></div><button class="btn btn-outline-primary btn-sm">Book</button></div></div>
</div>
</div></section>`,
    },
    {
      slug: "join",
      title: "Join",
      html: `<section class="py-5"><div class="container" style="max-width:520px;"><h1 class="display-5 fw-bold">Become a member</h1>
<form data-nk-form="" data-nk-flow-ref="enroll" class="card p-4 mt-3 shadow-sm">
  <div class="row g-3"><div class="col-md-6"><label class="form-label">Name</label><input name="name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control"/></div><div class="col-md-6"><label class="form-label">Plan</label><select name="plan" class="form-select"><option>Monthly Unlimited</option><option>10-Class Pack</option><option>Drop-in</option></select></div></div>
  <button class="btn btn-primary btn-lg w-100 mt-4" type="submit">Sign me up</button>
</form>
</div></section>`,
    },
    {
      slug: "checkin",
      title: "Check in",
      html: `<section class="py-5"><div class="container" style="max-width:440px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-5 fw-bold">Check in</h1></div>
<form data-nk-form="" data-nk-flow-ref="checkin" class="card p-4 mt-4 shadow-sm">
  <div class="mb-3"><label class="form-label">Your email</label><input name="email" type="email" class="form-control" required autofocus/></div>
  <button class="btn btn-primary btn-lg w-100" type="submit">Check in</button>
  <div data-nk-success class="text-success fw-bold text-center mt-3 fs-5"></div>
  <div data-nk-error class="text-danger text-center mt-3"></div>
</form>
</div></section>`,
    },
  ],
};
