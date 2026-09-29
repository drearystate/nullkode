import type { ModuleDefinition } from "../types";

export const weddingRsvp: ModuleDefinition = {
  id: "wedding",
  name: "Wedding RSVP",
  tagline: "Wedding website with RSVP form",
  description:
    "A beautiful wedding landing page with date, venue, story and an RSVP form that captures guest name, attending status, meal choice and plus-one.",
  icon: "",
  color: "from-rose-400 to-pink-500",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "coupleNames", label: "Couple's names", type: "text", default: "Anna & Ben", required: true },
    { key: "weddingDate", label: "Wedding date", type: "text", default: "September 14, 2026" },
    { key: "venue", label: "Venue", type: "text", default: "The Garden Pavilion" },
  ],
  tables: [
    {
      name: "rsvps",
      fields: [
        { name: "guest_name", type: "text" },
        { name: "email", type: "text" },
        { name: "attending", type: "bool" },
        { name: "meal", type: "text" },
        { name: "plus_one", type: "text" },
        { name: "note", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "rsvp",
      name: "Submit RSVP",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "insert", data: { table: "rsvps", values: {
          guest_name: "{{trigger.guest_name}}",
          email: "{{trigger.email}}",
          attending: "{{trigger.attending}}",
          meal: "{{trigger.meal}}",
          plus_one: "{{trigger.plus_one}}",
          note: "{{trigger.note}}",
        } } },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"We can\'t wait to celebrate with you!"}' } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
    {
      slug: "list",
      name: "List RSVPs",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "rsvps", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [ { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" } ],
    },
  ],
  pages: [
    {
      slug: "wedding",
      title: "Wedding",
      html: `<section class="py-5 text-center" style="min-height:90vh;background:linear-gradient(180deg,var(--nk-surface-2) 0%,var(--nk-surface) 100%);display:flex;align-items:center;"><div class="container"><div style="font-family:Georgia,serif;font-size:14px;letter-spacing:.3em;text-transform:uppercase;color:var(--nk-text-muted);">We're getting married</div><h1 class="mt-4" style="font-family:Georgia,serif;font-size:72px;font-weight:400;color:var(--nk-text);">{{config.coupleNames}}</h1><div class="mt-4" style="font-family:Georgia,serif;font-size:24px;color:var(--nk-primary);">{{config.weddingDate}}</div><div class="mt-2" style="font-family:Georgia,serif;font-size:18px;color:var(--nk-text-muted);">{{config.venue}}</div></div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:640px;"><h2 class="text-center fw-bold">Will you join us?</h2><form data-nk-form="" data-nk-flow-ref="rsvp" class="card p-4 mt-4 shadow-sm border-0"><div class="row g-3"><div class="col-md-6"><label class="form-label">Your name</label><input name="guest_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div><div class="col-12"><label class="form-label">Are you attending?</label><select name="attending" class="form-select"><option value="true">Yes, with joy! </option><option value="false">Sadly cannot make it</option></select></div><div class="col-md-6"><label class="form-label">Meal choice</label><select name="meal" class="form-select"><option>Chicken</option><option>Fish</option><option>Vegetarian</option><option>Vegan</option></select></div><div class="col-md-6"><label class="form-label">Plus one name</label><input name="plus_one" class="form-control"/></div><div class="col-12"><label class="form-label">Note for the couple (optional)</label><textarea name="note" class="form-control" rows="3"></textarea></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Send RSVP</button></div></div></form></div></section>`,
    },
  ],
};
