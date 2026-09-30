import type { ModuleDefinition } from "../types";

export const inbox: ModuleDefinition = {
  id: "inbox",
  name: "Private Inbox",
  tagline: "User-to-user private messages",
  description:
    "1-to-1 private messaging between signed-in users. Pick a recipient, send messages, see read/unread state per conversation. Conversations are deduplicated by sender+recipient pair.",
  icon: "",
  color: "from-violet-500 to-purple-700",
  category: "communication",
  version: "1.0.0",
  requires: ["auth-session", "auth-users"],
  tables: [
    {
      name: "messages",
      fields: [
        { name: "from_user_id", type: "text" },
        { name: "to_user_id", type: "text" },
        { name: "body", type: "text" },
        { name: "read_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "send",
      name: "Send a message",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "messages",
            values: {
              from_user_id: "{{vars.session.userId}}",
              to_user_id: "{{trigger.to_user_id}}",
              body: "{{trigger.body}}",
            },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true}' } },
        { id: "n6", type: "response", data: { status: 401, body: '{"error":"Sign in first"}' } },
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
      slug: "inbox",
      name: "List my conversations (people who messaged me or vice versa)",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: {
            table: "messages",
            where: { to_user_id: "{{vars.session.userId}}" },
            orderBy: "created_at desc",
            limit: 200,
            output: "rows",
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
    {
      slug: "thread",
      name: "Load a conversation with another user",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: {
            table: "messages",
            where: { from_user_id: "{{trigger.other_id}}", to_user_id: "{{vars.session.userId}}" },
            orderBy: "created_at asc",
            limit: 500,
            output: "incoming",
          },
        },
        {
          id: "n4",
          type: "query",
          data: {
            table: "messages",
            where: { from_user_id: "{{vars.session.userId}}", to_user_id: "{{trigger.other_id}}" },
            orderBy: "created_at asc",
            limit: 500,
            output: "outgoing",
          },
        },
        {
          id: "n5",
          type: "update",
          data: {
            table: "messages",
            where: { from_user_id: "{{trigger.other_id}}", to_user_id: "{{vars.session.userId}}" },
            values: { read_at: "now" },
          },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"incoming":{{vars.incoming}},"outgoing":{{vars.outgoing}}}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
      ],
    },
    {
      slug: "people",
      name: "Who can I message",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: { table: "{{@auth-users.table}}", orderBy: "name asc", limit: 200, output: "rows" },
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
      slug: "inbox",
      title: "Inbox",
      isHome: true,
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:980px;">
<h1 class="fw-bold">Inbox</h1>
<div class="row g-4 mt-2">
  <div class="col-md-4">
    <h6 class="text-uppercase fw-bold small" style="color:var(--nk-text-muted);">People</h6>
    <div data-nk-bind-flow-ref="people" data-nk-refresh="15000">
      <a class="d-flex align-items-center gap-2 p-2 rounded text-decoration-none text-body" data-nk-item href="#" data-nk-href-template="/thread?to={id}" style="border:1px solid var(--nk-border);margin-bottom:6px;"><img class="rounded-circle" style="width:36px;height:36px;object-fit:cover;" data-nk-src="avatar_url" src="/media/generated/thumbs/people-devon.webp"/><span class="fw-bold" data-nk-field="name">User</span></a>
    </div>
  </div>
  <div class="col-md-8">
    <h6 class="text-uppercase fw-bold small" style="color:var(--nk-text-muted);">Recent messages to me</h6>
    <div data-nk-bind-flow-ref="inbox" data-nk-refresh="10000">
      <div class="card p-3 mb-2 border-0 shadow-sm" data-nk-item>
        <div class="small" style="color:var(--nk-text-muted);">From user <span data-nk-field="from_user_id">42</span></div>
        <div data-nk-field="body">Hey, are you free tomorrow?</div>
      </div>
    </div>
  </div>
</div>
</div></section>`,
    },
    {
      slug: "thread",
      title: "Conversation",
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:720px;">
<a href="/inbox" class="small text-decoration-none" style="color:var(--nk-text-muted);">← Back to inbox</a>
<h1 class="fw-bold mt-2">Conversation</h1>

<div id="nk-thread" class="card p-3 mt-3" style="min-height:340px;max-height:60vh;overflow-y:auto;background:var(--nk-surface);">
  <div class="small" style="color:var(--nk-text-muted);">Loading…</div>
</div>

<form data-nk-form="" data-nk-flow-ref="send" class="d-flex gap-2 mt-3" id="nk-send-form">
  <input type="hidden" name="to_user_id" id="nk-to"/>
  <input name="body" class="form-control" placeholder="Type a message…" required/>
  <button class="btn btn-primary" type="submit">Send</button>
</form>

<script>(function(){
  var to = new URLSearchParams(location.search).get('to') || '';
  document.getElementById('nk-to').value = to;
  function load(){
    var slug = (window.__nkFlowSlugMap && window.__nkFlowSlugMap['thread']) || 'thread';
    fetch('/api/run/' + slug, { method:'POST', headers:{'content-type':'application/json'}, credentials:'same-origin', body: JSON.stringify({ other_id: to }) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        var inc = (d.incoming||[]).map(function(m){ return { d:m.created_at, body:m.body, me:false }; });
        var out = (d.outgoing||[]).map(function(m){ return { d:m.created_at, body:m.body, me:true }; });
        var all = inc.concat(out).sort(function(a,b){ return (a.d||'').localeCompare(b.d||''); });
        var html = all.length ? all.map(function(m){
          var side = m.me ? 'text-end' : '';
          var bg = m.me ? 'background:var(--nk-primary);color:#fff;' : 'background:var(--nk-surface-2);';
          return '<div class="mb-2 '+side+'"><span class="d-inline-block p-2 rounded" style="max-width:80%;'+bg+'">' + (m.body||'').replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];}) + '</span></div>';
        }).join('') : '<div class="small" style="color:var(--nk-text-muted);">No messages yet — say hi.</div>';
        var el = document.getElementById('nk-thread'); el.innerHTML = html; el.scrollTop = el.scrollHeight;
      }).catch(function(){});
  }
  load();
  setInterval(load, 5000);
  document.getElementById('nk-send-form').addEventListener('nk:submitted', function(){ setTimeout(load, 200); });
})();</script>
</div></section>`,
    },
  ],
};
