import type { ModuleDefinition } from "../types";

export const emailVerify: ModuleDefinition = {
  id: "email-verify",
  name: "Email Verification",
  tagline: "Send a 6-digit code, verify the user's email",
  description:
    "Issue a 6-digit verification code by email, store it with a short expiry, and verify it on the user's next request. Pairs naturally with the auth module: marks the user as email_verified once they confirm.",
  icon: "",
  color: "from-blue-500 to-indigo-600",
  category: "utility",
  version: "1.0.0",
  requires: ["email"],
  worksWith: ["auth"],
  config: [
    { key: "appName", label: "App name", type: "text", default: "Our app", required: true },
    { key: "fromEmail", label: "Send from", type: "text", default: "no-reply@example.com", required: true },
    { key: "codeTtlMinutes", label: "Code expires after (minutes)", type: "number", default: 15 },
  ],
  tables: [
    {
      name: "codes",
      fields: [
        { name: "email", type: "text" },
        { name: "code", type: "text" },
        { name: "consumed", type: "bool" },
        { name: "expires_at", type: "timestamp" },
      ],
    },
  ],
  flows: [
    {
      slug: "send-code",
      name: "Send verification code",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "math", data: { expression: "floor(random()*900000)+100000", output: "code" } },
        {
          id: "n3",
          type: "insert",
          data: {
            table: "codes",
            values: {
              email: "{{trigger.email}}",
              code: "{{vars.code}}",
              consumed: "false",
            },
          },
        },
        {
          id: "n4",
          type: "email",
          data: {
            from: "{{config.fromEmail}}",
            to: "{{trigger.email}}",
            subject: "Your {{config.appName}} verification code",
            body: "Your code is {{vars.code}}. It expires in {{config.codeTtlMinutes}} minutes.",
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"message":"Check your inbox for a 6-digit code."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "verify-code",
      name: "Verify code",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "codes",
            where: { email: "{{trigger.email}}", code: "{{trigger.code}}", consumed: "false" },
            orderBy: "created_at desc",
            limit: 1,
            output: "row",
          },
        },
        { id: "n3", type: "branch", data: { left: "{{vars.row.0.id}}", op: "exists", right: "" } },
        {
          id: "n4",
          type: "update",
          data: {
            table: "codes",
            where: { id: "{{vars.row.0.id}}" },
            values: { consumed: "true" },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"message":"Email verified."}' } },
        { id: "n6", type: "response", data: { status: 400, body: '{"error":"Invalid or expired code."}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4", sourceHandle: "true" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n3", target: "n6", sourceHandle: "false" },
      ],
    },
  ],
  pages: [
    {
      slug: "verify-email",
      title: "Verify your email",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:480px;padding-top:4vh;">
<div class="text-center"><div class="display-1"></div><h1 class="display-5 fw-bold mt-3">Verify your email</h1><p style="color:var(--nk-text-muted);">We'll send a 6-digit code to confirm your address.</p></div>

<form data-nk-form="" data-nk-flow-ref="send-code" class="card p-4 mt-4 shadow-sm">
  <h5 class="fw-bold">Step 1 — send a code</h5>
  <div class="mb-3"><label class="form-label">Your email</label><input name="email" type="email" class="form-control" required/></div>
  <button class="btn btn-primary w-100" type="submit">Send code</button>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>

<form data-nk-form="" data-nk-flow-ref="verify-code" class="card p-4 mt-3 shadow-sm">
  <h5 class="fw-bold">Step 2 — enter the code</h5>
  <div class="mb-3"><label class="form-label">Email</label><input name="email" type="email" class="form-control" required/></div>
  <div class="mb-3"><label class="form-label">6-digit code</label><input name="code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" class="form-control text-center fs-3 font-monospace" required/></div>
  <button class="btn btn-primary w-100" type="submit">Verify</button>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>
</div></section>`,
    },
  ],
};
