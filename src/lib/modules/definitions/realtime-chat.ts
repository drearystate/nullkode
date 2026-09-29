import type { ModuleDefinition } from "../types";

export const realtimeChat: ModuleDefinition = {
  id: "realtime-chat",
  name: "Real-time Chat",
  tagline: "Live-updating public chatroom",
  description:
    "A public chatroom that polls for new messages every few seconds so conversations feel instant. Drop it anywhere you want visitors to talk in real time.",
  icon: "",
  color: "from-cyan-500 to-sky-600",
  category: "community",
  version: "1.0.0",
  provides: ["realtime"],
  config: [
    { key: "roomTitle", label: "Room title", type: "text", default: "Live chat", required: true },
    { key: "refreshMs", label: "Refresh interval (ms)", type: "number", default: 3000 },
  ],
  tables: [
    {
      name: "messages",
      fields: [
        { name: "author", type: "text" },
        { name: "body", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "send",
      name: "Send chat message",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "messages",
            values: { author: "{{trigger.author}}", body: "{{trigger.body}}" },
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
      slug: "feed",
      name: "Live feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "messages", orderBy: "created_at desc", limit: 100, output: "rows" } },
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
      slug: "live-chat",
      title: "Live chat",
      html: `<section class="py-5"><div class="container" style="max-width:720px;"><h1 class="fw-bold">{{config.roomTitle}} <span class="badge bg-danger ms-2" style="vertical-align:middle;font-size:11px;">● LIVE</span></h1><p style="color:var(--nk-text-muted);">Messages update automatically every few seconds.</p>
<form data-nk-form="" data-nk-flow-ref="send" class="card p-3 mt-4 shadow-sm"><div class="row g-2"><div class="col-md-3"><input name="author" class="form-control" placeholder="Your name" required/></div><div class="col-md-9"><div class="input-group"><input name="body" class="form-control" placeholder="Type a message..." required/><button class="btn btn-primary" type="submit">Send</button></div></div></div></form>
<div data-nk-bind-flow-ref="feed" data-nk-refresh="{{config.refreshMs}}" class="mt-4">
  <div class="card border-0 shadow-sm mb-2" data-nk-item><div class="card-body p-3"><div class="d-flex justify-content-between align-items-baseline"><div class="fw-bold" data-nk-field="author">Alex</div><div class="small" style="color:var(--nk-text-muted);">just now</div></div><div data-nk-field="body"> hey everyone, loving the vibe in here</div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-baseline"><div class="fw-bold">Jordan</div><div class="small" style="color:var(--nk-text-muted);">5 sec ago</div></div><div>Yeah this realtime polling is kinda magic</div></div></div>
  <div class="card border-0 shadow-sm mb-2"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-baseline"><div class="fw-bold">Sam</div><div class="small" style="color:var(--nk-text-muted);">12 sec ago</div></div><div>Refreshes every 3s by default — config it in the module settings</div></div></div>
  <div class="card border-0 shadow-sm"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-baseline"><div class="fw-bold">Taylor</div><div class="small" style="color:var(--nk-text-muted);">28 sec ago</div></div><div>Way simpler than sockets for a community chat</div></div></div>
</div>
</div></section>`,
    },
  ],
};
