import type { ModuleDefinition } from "../types";

export const twoFactor: ModuleDefinition = {
  id: "two-factor",
  name: "Two-Factor Auth",
  tagline: "Email-code 2FA for logged-in users",
  description:
    "Adds an extra step to login: after the user signs in, we email them a 6-digit code. Until they confirm it, their session is flagged unverified. Drop this in any project that uses the auth module to harden account access.",
  icon: "",
  color: "from-emerald-600 to-teal-700",
  category: "utility",
  version: "1.0.0",
  requires: ["auth-session", "auth-users", "email"],
  config: [
    { key: "appName", label: "App name", type: "text", default: "Our app", required: true },
    { key: "fromEmail", label: "Send from", type: "text", default: "no-reply@example.com", required: true },
  ],
  tables: [
    {
      name: "challenges",
      fields: [
        { name: "user_id", type: "text" },
        { name: "code", type: "text" },
        { name: "consumed", type: "bool" },
      ],
    },
  ],
  flows: [
    {
      slug: "issue-challenge",
      name: "Email a 2FA challenge to the current user",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        { id: "n3", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "query",
          data: { table: "{{@auth-users.table}}", where: { id: "{{vars.session.userId}}" }, limit: 1, output: "user" },
        },
        { id: "n5", type: "math", data: { expression: "floor(random()*900000)+100000", output: "code" } },
        {
          id: "n6",
          type: "insert",
          data: {
            table: "challenges",
            values: { user_id: "{{vars.session.userId}}", code: "{{vars.code}}", consumed: "false" },
          },
        },
        {
          id: "n7",
          type: "email",
          data: {
            from: "{{config.fromEmail}}",
            to: "{{vars.user.0.email}}",
            subject: "Your {{config.appName}} login code",
            body: "Hi {{vars.user.0.name}}, your login verification code is {{vars.code}}. Enter it on the 2FA screen to finish signing in.",
          },
        },
        { id: "n8", type: "response", data: { status: 200, body: '{"ok":true,"message":"We emailed you a 6-digit code."}' } },
        { id: "n9", type: "response", data: { status: 401, body: '{"error":"Sign in first"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n6", target: "n7" },
        { id: "e7", source: "n7", target: "n8" },
        { id: "e8", source: "n3", target: "n9", sourceHandle: "false" },
      ],
    },
    {
      slug: "verify-challenge",
      name: "Verify the 2FA code",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: {
            table: "challenges",
            where: { user_id: "{{vars.session.userId}}", code: "{{trigger.code}}", consumed: "false" },
            orderBy: "created_at desc",
            limit: 1,
            output: "row",
          },
        },
        { id: "n4", type: "branch", data: { left: "{{vars.row.0.id}}", op: "exists", right: "" } },
        {
          id: "n5",
          type: "update",
          data: { table: "challenges", where: { id: "{{vars.row.0.id}}" }, values: { consumed: "true" } },
        },
        { id: "n6", type: "set_session", data: { mfaVerified: "true" } },
        { id: "n7", type: "response", data: { status: 200, body: '{"ok":true,"redirect":"/"}' } },
        { id: "n8", type: "response", data: { status: 400, body: '{"error":"Wrong code"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5", sourceHandle: "true" },
        { id: "e5", source: "n5", target: "n6" },
        { id: "e6", source: "n6", target: "n7" },
        { id: "e7", source: "n4", target: "n8", sourceHandle: "false" },
      ],
    },
  ],
  pages: [
    {
      slug: "two-factor",
      title: "Verify it's you",
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:440px;padding-top:6vh;">
<div class="text-center"><div class="display-1"></div><h1 class="display-5 fw-bold mt-3">Verify it's you</h1><p style="color:var(--nk-text-muted);">We'll email you a 6-digit login code.</p></div>

<form data-nk-form="" data-nk-flow-ref="issue-challenge" class="text-center mt-3">
  <button class="btn btn-outline-primary" type="submit">Email me a new code</button>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>

<form data-nk-form="" data-nk-flow-ref="verify-challenge" class="card p-4 mt-3 shadow-sm">
  <div class="mb-3"><label class="form-label">Code from email</label><input name="code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" class="form-control text-center fs-3 font-monospace" required/></div>
  <button class="btn btn-primary w-100" type="submit">Verify &amp; continue</button>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>
</div></section>`,
    },
  ],
};
