import type { ModuleDefinition } from "../types";

export const chat: ModuleDefinition = {
  id: "chat",
  name: "Community Chat",
  tagline: "Simple shared chatroom",
  description:
    "A single shared chatroom where visitors post messages. Posts appear newest-first, backed by a chat_messages table and a send/list flow pair. Perfect for early community feedback or waitlist chatter.",
  icon: "",
  color: "from-teal-500 to-cyan-600",
  category: "community",
  version: "1.0.0",

  config: [
    {
      key: "roomTitle",
      label: "Chatroom title",
      type: "text",
      default: "Community chat",
      required: true,
    },
    {
      key: "welcome",
      label: "Welcome message",
      type: "text",
      default: "Say hi to the community. Messages are public.",
    },
  ],

  tables: [
    {
      name: "chat_messages",
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
            table: "chat_messages",
            values: {
              author: "{{trigger.author}}",
              body: "{{trigger.body}}",
            },
            output: "msg",
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
      name: "Chat feed",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "chat_messages",
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
      slug: "chat",
      title: "Chat",
      html: `<section class="py-5">
  <div class="container" style="max-width:720px;">
    <h1 class="fw-bold">{{config.roomTitle}}</h1>
    <p style="color:var(--nk-text-muted);">{{config.welcome}}</p>
    <form data-nk-form="" data-nk-flow-ref="send" class="card p-3 mt-4 shadow-sm">
      <div class="row g-2">
        <div class="col-md-4">
          <input name="author" class="form-control" placeholder="Your name" required/>
        </div>
        <div class="col-md-8">
          <div class="input-group">
            <input name="body" class="form-control" placeholder="Say something..." required/>
            <button class="btn btn-primary" type="submit">Post</button>
          </div>
        </div>
      </div>
    </form>
    <div data-nk-bind-flow-ref="feed" class="mt-4">
      <div class="card border-0 shadow-sm mb-2" data-nk-item>
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-baseline">
            <div class="fw-bold" data-nk-field="author">Alex</div>
            <div class="small" style="color:var(--nk-text-muted);">just now</div>
          </div>
          <div data-nk-field="body">Hey everyone! </div>
        </div>
      </div>
      <div class="card border-0 shadow-sm mb-2"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-baseline"><div class="fw-bold">Jordan</div><div class="small" style="color:var(--nk-text-muted);">2 min ago</div></div><div>Welcome! Let us know what you're building.</div></div></div>
      <div class="card border-0 shadow-sm mb-2"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-baseline"><div class="fw-bold">Sam</div><div class="small" style="color:var(--nk-text-muted);">5 min ago</div></div><div>Just installed the community chat module. This is super easy.</div></div></div>
      <div class="card border-0 shadow-sm"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-baseline"><div class="fw-bold">Taylor</div><div class="small" style="color:var(--nk-text-muted);">8 min ago</div></div><div>Say hello if you're new here!</div></div></div>
    </div>
  </div>
</section>`,
    },
  ],
};
