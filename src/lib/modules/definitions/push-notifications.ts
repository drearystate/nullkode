import type { ModuleDefinition } from "../types";

export const pushNotifications: ModuleDefinition = {
  id: "push-notifications",
  name: "Push Notifications",
  tagline: "Send push notifications to your visitors",
  description:
    "Add a 'Turn on notifications' button. Visitors opt in from their browser (or, on iPhone, from the app added to their home screen), and you send them updates from the app's Notifications screen or from a workflow.",
  icon: "",
  color: "from-amber-500 to-orange-600",
  category: "community",
  version: "1.0.0",
  provides: ["push"],
  config: [
    { key: "heading", label: "Page heading", type: "text", default: "Get notified", required: true },
    { key: "pitch", label: "Pitch", type: "text", default: "Get a ping when we post something new." },
  ],
  tables: [
    {
      name: "subscribers",
      fields: [
        { name: "subscription", type: "text" },
        { name: "user_agent", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "subscribe",
      name: "Save push subscription",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "subscribers",
            values: {
              subscription: "{{trigger.subscription}}",
              user_agent: "{{trigger.user_agent}}",
            },
          },
        },
        { id: "n3", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      // Subscriptions are personal data: only the app's admins may list them.
      slug: "list",
      name: "List subscribers (admins only)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "s1", type: "get_session", data: { output: "session" } },
        { id: "b1", type: "branch", data: { left: "{{vars.session.role}}", op: "==", right: "admin" } },
        { id: "d1", type: "response", data: { status: 403, body: '{"error":"Admins only."}' } },
        { id: "n2", type: "query", data: { table: "subscribers", orderBy: "created_at desc", limit: 500, output: "rows" } },
        { id: "n3", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "s1" },
        { id: "e2", source: "s1", target: "b1" },
        { id: "e3", source: "b1", target: "n2", sourceHandle: "true" },
        { id: "e4", source: "b1", target: "d1", sourceHandle: "false" },
        { id: "e5", source: "n2", target: "n3" },
      ],
    },
  ],
  pages: [
    {
      slug: "notifications",
      title: "Notifications",
      html: `<section class="py-5"><div class="container" style="max-width:560px;"><div class="text-center"><div class="display-1"></div><h1 class="display-5 fw-bold mt-3">{{config.heading}}</h1><p class="lead" style="color:var(--nk-text-muted);">{{config.pitch}}</p>
<button data-nk-push-subscribe="subscribe" class="btn btn-primary btn-lg mt-3">Turn on notifications</button>
<p class="small mt-3" style="color:var(--nk-text-muted);">We'll ask your browser for permission. You can turn them off any time in your browser settings.</p>
</div>
<div class="card border-0 shadow-sm mt-5"><div class="card-body"><h5 class="fw-bold">What you'll get</h5><ul class="mb-0" style="color:var(--nk-text-muted);"><li>New posts and updates</li><li>Important announcements</li><li>Occasional special offers</li></ul></div></div>
</div></section>`,
    },
    {
      slug: "subscribers",
      title: "Subscribers",
      html: `<!--nk:require-auth-->
<!--nk:require-role:admin-->
<section class="py-5"><div class="container"><h1 class="fw-bold">Push subscribers</h1><p style="color:var(--nk-text-muted);">Everyone who has opted in to push notifications.</p>
<div data-nk-bind-flow-ref="list" class="mt-4">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item>
    <div class="fs-3"></div>
    <div class="flex-grow-1"><div class="fw-bold small font-monospace" data-nk-field="subscription">https://fcm.googleapis.com/fcm/send/abc...</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="user_agent">Mozilla/5.0 (Macintosh...)</div></div>
    <span class="badge" style="background:var(--nk-primary);">active</span>
  </div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);"><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold small font-monospace">https://fcm.googleapis.com/fcm/send/xyz...</div><div class="small" style="color:var(--nk-text-muted);">Mozilla/5.0 (iPhone...)</div></div><span class="badge" style="background:var(--nk-primary);">active</span></div>
  <div class="d-flex align-items-center gap-3 p-3 rounded border" style="background:var(--nk-surface);"><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold small font-monospace">https://updates.push.services.mozilla.com/...</div><div class="small" style="color:var(--nk-text-muted);">Firefox on Linux</div></div><span class="badge" style="background:var(--nk-primary);">active</span></div>
</div>
</div></section>`,
    },
  ],
};
