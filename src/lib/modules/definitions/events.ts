import type { ModuleDefinition } from "../types";

export const events: ModuleDefinition = {
  id: "events",
  name: "Events Calendar",
  tagline: "Upcoming events with RSVP",
  description:
    "List upcoming events with date, location and description. Visitors can RSVP with their name and email; RSVPs are saved to a table for the admin to review.",
  icon: "",
  color: "from-teal-500 to-cyan-600",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "calendarName", label: "Calendar name", type: "text", default: "Upcoming Events", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "starts_at", type: "timestamp" },
        { name: "location", type: "text" },
        { name: "image_url", type: "text" },
      ],
    },
    {
      name: "rsvps",
      fields: [
        { name: "event_title", type: "text" },
        { name: "attendee_name", type: "text" },
        { name: "email", type: "text" },
        { name: "guests", type: "int" },
      ],
    },
  ],
  flows: [
    {
      slug: "feed",
      name: "Events feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "items", orderBy: "starts_at asc", limit: 200, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "rsvp",
      name: "RSVP",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "rsvps", values: {
          event_title: "{{trigger.event_title}}",
          attendee_name: "{{trigger.attendee_name}}",
          email: "{{trigger.email}}",
          guests: "{{trigger.guests}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"You\'re on the list!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "create-event",
      name: "Create event",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "items", values: {
          title: "{{trigger.title}}",
          description: "{{trigger.description}}",
          starts_at: "{{trigger.starts_at}}",
          location: "{{trigger.location}}",
          image_url: "{{trigger.image_url}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "events",
      title: "Events",
      html: `<section class="nk-hero">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-7">
        <span class="nk-eyebrow">WHAT'S ON</span>
        <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">{{config.calendarName}}</h1>
        <p class="lead mb-4" style="color:var(--nk-text-muted);max-width:540px;">Meetups, launches and conferences. Browse what's coming up and save your spot.</p>
        <div class="d-flex flex-wrap gap-3">
          <a href="#feed" class="btn btn-primary btn-lg px-4">See the lineup</a>
          <a href="#rsvp" class="btn btn-outline-primary btn-lg px-4">RSVP now</a>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="nk-eyebrow mb-2">NEXT UP</div>
          <h3 class="h4 fw-bold mb-2">Don't miss a thing</h3>
          <p class="small mb-0" style="color:var(--nk-text-muted);">Events roll over continuously. Bookmark this page or subscribe below to stay in the loop.</p>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6" id="feed">
  <div class="container">
    <div class="nk-section-title">
      <span class="nk-eyebrow">UPCOMING</span>
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Mark your calendar</h2>
      <p class="lead">Dates, times and locations for every upcoming gathering.</p>
    </div>
    <div data-nk-bind-flow-ref="feed" class="row g-4">
      <div class="col-md-6 col-lg-4" data-nk-item>
        <div class="nk-feature h-100" style="padding:0;overflow:hidden;">
          <div data-nk-src="image_url" style="aspect-ratio:16/10;background:linear-gradient(135deg, var(--nk-primary), var(--nk-accent));"></div>
          <div class="p-4">
            <div class="small text-uppercase fw-semibold mb-2" style="color:var(--nk-primary);letter-spacing:0.12em;">Upcoming</div>
            <h3 class="h5 fw-bold mb-2" data-nk-field="title">Event title</h3>
            <p class="mb-3" style="color:var(--nk-text-muted);font-size:.92rem;" data-nk-field="description">A short description of what's happening at this event.</p>
            <div class="small" style="color:var(--nk-text-muted);" data-nk-field="location">Venue · Location</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-5 py-lg-6" id="rsvp" style="background:var(--nk-surface-2);">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-9 col-xl-8">
        <div class="nk-section-title">
          <span class="nk-eyebrow">RSVP</span>
          <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Save your spot</h2>
          <p class="lead">Let us know you're coming so we can plan accordingly.</p>
        </div>
        <form data-nk-form="" data-nk-flow-ref="rsvp" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Event</label>
              <input name="event_title" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Your name</label>
              <input name="attendee_name" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <input name="email" type="email" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-4">
              <label class="form-label">Guests</label>
              <input name="guests" type="number" min="1" class="form-control form-control-lg" value="1"/>
            </div>
            <div class="col-12 d-flex justify-content-end">
              <button class="btn btn-primary btn-lg px-4" type="submit">Save my spot</button>
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
      <h2 class="display-5 fw-bold mb-2" style="letter-spacing:-0.01em;">Hosting something?</h2>
      <p class="lead mb-4">Add your own event to {{config.calendarName}}.</p>
      <a href="/events-admin" class="btn btn-lg px-4">Create an event</a>
    </div>
  </div>
</section>
<footer class="py-5" style="border-top:1px solid var(--nk-border);">
  <div class="container">
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <div class="fw-bold mb-1">{{config.calendarName}}</div>
        <div class="small" style="color:var(--nk-text-muted);">Your guide to what's happening.</div>
      </div>
      <div class="col-md-6 text-md-end">
        <a class="small" href="/events-admin" style="color:var(--nk-text-muted);">Admin</a>
      </div>
    </div>
  </div>
</footer>`,
    },
    {
      slug: "events-admin",
      title: "Add event",
      html: `<section class="nk-hero" style="padding-block:clamp(3rem,6vw,5rem);">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-9 col-xl-8">
        <span class="nk-eyebrow">NEW EVENT</span>
        <h1 class="display-5 fw-bold mb-2" style="letter-spacing:-0.02em;">Create an event</h1>
        <p class="lead mb-5" style="color:var(--nk-text-muted);">Fill in the details and it will show up on {{config.calendarName}} immediately.</p>
        <form data-nk-form="" data-nk-flow-ref="create-event" class="p-4 p-lg-5" style="background:var(--nk-surface);border:1px solid var(--nk-border);border-radius:var(--nk-radius);box-shadow:var(--nk-shadow-lg);">
          <div class="row g-4">
            <div class="col-12">
              <label class="form-label">Title</label>
              <input name="title" class="form-control form-control-lg" required/>
            </div>
            <div class="col-12">
              <label class="form-label">Description</label>
              <textarea name="description" class="form-control form-control-lg" rows="4"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">Starts at</label>
              <input name="starts_at" type="datetime-local" class="form-control form-control-lg" required/>
            </div>
            <div class="col-md-6">
              <label class="form-label">Location</label>
              <input name="location" class="form-control form-control-lg"/>
            </div>
            <div class="col-12">
              <label class="form-label">Image URL</label>
              <input name="image_url" type="url" class="form-control form-control-lg"/>
            </div>
            <div class="col-12 d-flex justify-content-end gap-2">
              <a href="/events" class="btn btn-outline-primary btn-lg px-4">Cancel</a>
              <button class="btn btn-primary btn-lg px-4" type="submit">Create</button>
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
