import type { ModuleDefinition } from "../types";

export const referrals: ModuleDefinition = {
  id: "referrals",
  name: "Referrals",
  tagline: "Invite-a-friend with tracked conversions",
  description:
    "Each user gets a unique referral code and a share URL. When someone signs up using that code, we log a conversion against the referrer. Includes a leaderboard of top referrers and a 'my code' page for sharing.",
  icon: "",
  color: "from-pink-500 to-fuchsia-600",
  category: "community",
  version: "1.0.0",
  requires: ["auth-session", "auth-users"],
  config: [
    { key: "appName", label: "App name", type: "text", default: "Our app", required: true },
    { key: "rewardCopy", label: "Reward copy", type: "text", default: "Refer 3 friends to unlock a month of Pro." },
  ],
  tables: [
    {
      name: "codes",
      fields: [
        { name: "user_id", type: "text" },
        { name: "code", type: "text" },
        { name: "uses", type: "int" },
      ],
    },
    {
      name: "conversions",
      fields: [
        { name: "referrer_user_id", type: "text" },
        { name: "code", type: "text" },
        { name: "new_user_email", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "issue-my-code",
      name: "Issue / fetch my referral code",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "query",
          data: { table: "codes", where: { user_id: "{{vars.session.userId}}" }, limit: 1, output: "row" },
        },
        { id: "n5", type: "branch", data: { left: "{{vars.row.0.id}}", op: "exists", right: "" } },
        { id: "n6", type: "response", data: { status: 200, body: "{{vars.row.0}}" } },
        { id: "n7", type: "math", data: { expression: "floor(random()*1679615)+46656", output: "n" } },
        {
          id: "n8",
          type: "insert",
          data: {
            table: "codes",
            values: { user_id: "{{vars.session.userId}}", code: "REF-{{vars.n}}", uses: "0" },
            output: "new",
          },
        },
        { id: "n9", type: "response", data: { status: 200, body: "{{vars.new}}" } },
        { id: "n10", type: "response", data: { status: 401, body: '{"error":"Sign in first"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6", sourceHandle: "true" },
        { id: "e6", source: "n5", target: "n7", sourceHandle: "false" },
        { id: "e7", source: "n7", target: "n8" },
        { id: "e8", source: "n8", target: "n9" },
        { id: "e9", source: "n3", target: "n10", sourceHandle: "false" },
      ],
    },
    {
      slug: "redeem",
      name: "Redeem a code at signup",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "codes", where: { code: "{{trigger.code}}" }, limit: 1, output: "row" } },
        { id: "n3", type: "branch", data: { left: "{{vars.row.0.id}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "insert",
          data: {
            table: "conversions",
            values: {
              referrer_user_id: "{{vars.row.0.user_id}}",
              code: "{{trigger.code}}",
              new_user_email: "{{trigger.email}}",
            },
          },
        },
        {
          id: "n5",
          type: "update",
          data: { table: "codes", where: { id: "{{vars.row.0.id}}" }, values: { uses: "{{vars.row.0.uses}}+1" } },
        },
        { id: "n6", type: "response", data: { status: 200, body: '{"ok":true,"message":"Referral counted."}' } },
        { id: "n7", type: "response", data: { status: 404, body: '{"error":"Unknown referral code."}' } },
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
      slug: "leaderboard",
      name: "Top referrers",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "codes", orderBy: "uses desc", limit: 20, output: "rows" } },
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
      slug: "refer",
      title: "Invite friends",
      isHome: true,
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:680px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">Invite friends to {{config.appName}}</h1><p class="lead" style="color:var(--nk-text-muted);">{{config.rewardCopy}}</p></div>

<div class="card p-4 mt-4 shadow-sm">
  <h5 class="fw-bold">Your referral link</h5>
  <div data-nk-bind-flow-ref="issue-my-code" data-nk-refresh="0">
    <div data-nk-item class="d-flex gap-2 align-items-center">
      <input id="nk-ref-url" class="form-control" readonly value=""/>
      <button class="btn btn-primary" type="button" onclick="navigator.clipboard.writeText(document.getElementById('nk-ref-url').value);this.textContent='Copied!';">Copy</button>
      <code class="d-none" data-nk-field="code" id="nk-ref-code">REF-XXXXX</code>
    </div>
  </div>
  <script>(function(){
    setTimeout(function(){
      var c = (document.getElementById('nk-ref-code') && document.getElementById('nk-ref-code').textContent.trim()) || 'REF-XXXXX';
      document.getElementById('nk-ref-url').value = location.origin + '/?ref=' + c;
    }, 500);
  })();</script>
</div>

<h4 class="fw-bold mt-5">Top referrers</h4>
<div data-nk-bind-flow-ref="leaderboard" class="mt-3">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item><div class="fs-4"></div><code data-nk-field="code" class="flex-grow-1">REF-AB12CD</code><div class="fw-bold fs-5"><span data-nk-field="uses">7</span> friends</div></div>
</div>
</div></section>`,
    },
  ],
};
