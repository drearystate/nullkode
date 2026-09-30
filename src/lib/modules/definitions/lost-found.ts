import type { ModuleDefinition } from "../types";

export const lostFound: ModuleDefinition = {
  id: "lost-found",
  name: "Lost & Found",
  tagline: "Report lost and found items for your community",
  description:
    "A community lost and found. People report items they lost or found with location and contact info. The board shows everything in one place so people can match them up.",
  icon: "",
  color: "from-indigo-500 to-purple-600",
  category: "community",
  version: "1.0.0",
  config: [
    { key: "communityName", label: "Community name", type: "text", default: "Our community", required: true },
  ],
  tables: [
    {
      name: "items",
      fields: [
        { name: "type", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "text" },
        { name: "location", type: "text" },
        { name: "image_url", type: "text" },
        { name: "reporter_name", type: "text" },
        { name: "contact", type: "text" },
        { name: "resolved", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "report",
      name: "Report item",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "items",
            values: {
              type: "{{trigger.type}}",
              title: "{{trigger.title}}",
              description: "{{trigger.description}}",
              location: "{{trigger.location}}",
              image_url: "{{trigger.image_url}}",
              reporter_name: "{{trigger.reporter_name}}",
              contact: "{{trigger.contact}}",
              resolved: "false",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true,"message":"Posted to the board"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "feed",
      name: "Active items",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "items", where: { resolved: "false" }, orderBy: "created_at desc", limit: 300, output: "rows" },
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
      slug: "lost-found",
      title: "Lost & found",
      html: `<section class="py-5" style="background:var(--nk-surface-2);"><div class="container"><div class="text-center"><h1 class="display-4 fw-bold">Lost &amp; found</h1><p class="lead" style="color:var(--nk-text-muted);">{{config.communityName}} — help reunite lost items with their owners.</p></div></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="feed" class="row g-4">
  <div class="col-md-6 col-lg-4" data-nk-item><div class="card h-100"><img class="card-img-top" data-nk-src="image_url" src="/media/generated/lifestyle-blue-raincoat.webp" alt="" style="aspect-ratio:5/3;object-fit:cover;"/><div class="card-body"><span class="badge bg-danger mb-2" data-nk-field="type">Lost</span><h5 class="fw-bold" data-nk-field="title">Blue raincoat, size M</h5><p class="small" data-nk-field="description" style="color:var(--nk-text-muted);">Left at the coffee shop on Pine. Has a name tag inside.</p><div class="small" style="color:var(--nk-text-muted);"><strong>Location:</strong> <span data-nk-field="location">Pine Street Coffee</span></div><div class="small mt-1" style="color:var(--nk-text-muted);"><strong>Contact:</strong> <span data-nk-field="reporter_name">Alex</span> — <span data-nk-field="contact">alex@test.com</span></div></div></div></div>
  <div class="col-md-6 col-lg-4"><div class="card h-100"><img class="card-img-top" src="/media/generated/locksmith-lock-workbench.webp" alt="" style="aspect-ratio:5/3;object-fit:cover;"/><div class="card-body"><span class="badge mb-2" style="background:var(--nk-primary);">Found</span><h5 class="fw-bold">Set of house keys</h5><p class="small" style="color:var(--nk-text-muted);">Found by the benches near the playground. Black keychain.</p><div class="small" style="color:var(--nk-text-muted);"><strong>Location:</strong> Park playground</div><div class="small mt-1" style="color:var(--nk-text-muted);"><strong>Contact:</strong> Jordan — (555) 123-4567</div></div></div></div>
  <div class="col-md-6 col-lg-4"><div class="card h-100"><img class="card-img-top" src="/media/generated/jewelry-jeweler-work.webp" alt="" style="aspect-ratio:5/3;object-fit:cover;"/><div class="card-body"><span class="badge bg-danger mb-2">Lost</span><h5 class="fw-bold">Silver ring</h5><p class="small" style="color:var(--nk-text-muted);">Lost during Sunday's market. Engraved inside.</p><div class="small" style="color:var(--nk-text-muted);"><strong>Location:</strong> Farmers market</div><div class="small mt-1" style="color:var(--nk-text-muted);"><strong>Contact:</strong> Priya — priya@test.com</div></div></div></div>
</div>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:720px;"><h3 class="fw-bold">Report something</h3>
<form data-nk-form="" data-nk-flow-ref="report" class="card p-4 mt-3 shadow-sm"><div class="row g-3"><div class="col-md-4"><label class="form-label">Type</label><select name="type" class="form-select"><option>Lost</option><option>Found</option></select></div><div class="col-md-8"><label class="form-label">Title</label><input name="title" class="form-control" placeholder="Blue raincoat" required/></div><div class="col-12"><label class="form-label">Description</label><textarea name="description" class="form-control" rows="3"></textarea></div><div class="col-md-6"><label class="form-label">Location</label><input name="location" class="form-control"/></div><div class="col-md-6"><label class="form-label">Image URL (optional)</label><input name="image_url" type="url" class="form-control"/></div><div class="col-md-6"><label class="form-label">Your name</label><input name="reporter_name" class="form-control" required/></div><div class="col-md-6"><label class="form-label">Contact (email or phone)</label><input name="contact" class="form-control" required/></div><div class="col-12 text-end"><button class="btn btn-primary btn-lg" type="submit">Post to board</button></div></div></form></div></section>`,
    },
  ],
};
