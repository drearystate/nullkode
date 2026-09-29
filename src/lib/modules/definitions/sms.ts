import type { ModuleDefinition } from "../types";

export const sms: ModuleDefinition = {
  id: "sms",
  name: "SMS",
  tagline: "Send SMS via Twilio",
  description:
    "Send SMS messages to a phone number via Twilio's REST API. Stores every send in an outbox table for audit. Pair with reminders, two-factor, or any flow that wants to text instead of email.",
  icon: "",
  color: "from-green-500 to-emerald-700",
  category: "communication",
  version: "1.0.0",
  config: [
    { key: "twilioAccountSid", label: "Twilio Account SID", type: "text", placeholder: "ACxxxxxxxxxxxxxxxxxx", required: true },
    { key: "twilioAuthToken", label: "Twilio Auth Token", type: "text", required: true },
    { key: "fromNumber", label: "From number (E.164)", type: "text", placeholder: "+15551234567", required: true },
  ],
  tables: [
    {
      name: "outbox",
      fields: [
        { name: "to_number", type: "text" },
        { name: "body", type: "text" },
        { name: "status", type: "text" },
        { name: "twilio_sid", type: "text" },
        { name: "error", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "send",
      name: "Send an SMS",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "outbox",
            values: { to_number: "{{trigger.to_number}}", body: "{{trigger.body}}", status: "queued" },
            output: "row",
          },
        },
        {
          id: "n3",
          type: "http_request",
          data: {
            method: "POST",
            url: "https://api.twilio.com/2010-04-01/Accounts/{{config.twilioAccountSid}}/Messages.json",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": "Basic {{base64:{{config.twilioAccountSid}}:{{config.twilioAuthToken}}}}",
            },
            body: "To={{trigger.to_number}}&From={{config.fromNumber}}&Body={{trigger.body}}",
            output: "twilio",
          },
        },
        {
          id: "n4",
          type: "update",
          data: {
            table: "outbox",
            where: { id: "{{vars.row.id}}" },
            values: { status: "sent", twilio_sid: "{{vars.twilio.sid}}" },
          },
        },
        { id: "n5", type: "response", data: { status: 200, body: '{"ok":true,"sid":"{{vars.twilio.sid}}"}' } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
      ],
    },
    {
      slug: "outbox",
      name: "Recent sends",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "query", data: { table: "outbox", orderBy: "created_at desc", limit: 100, output: "rows" } },
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
      slug: "sms",
      title: "SMS",
      isHome: true,
      html: `<section class="py-5"><div class="container" style="max-width:680px;">
<div class="text-center"><div class="display-1"></div><h1 class="display-4 fw-bold">Send an SMS</h1><p class="lead" style="color:var(--nk-text-muted);">Powered by your Twilio account. Charges apply per Twilio's pricing.</p></div>

<form data-nk-form="" data-nk-flow-ref="send" class="card p-4 mt-4 shadow-sm">
  <div class="mb-3"><label class="form-label">Recipient (E.164 format, eg +15551234567)</label><input name="to_number" class="form-control font-monospace" placeholder="+15551234567" required/></div>
  <div class="mb-3"><label class="form-label">Message (160 chars max for single SMS)</label><textarea name="body" maxlength="320" class="form-control" rows="3" required></textarea></div>
  <button class="btn btn-primary btn-lg w-100" type="submit">Send</button>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>

<h4 class="fw-bold mt-5">Recent</h4>
<div data-nk-bind-flow-ref="outbox" data-nk-refresh="15000" class="mt-3">
  <div class="d-flex align-items-center gap-3 p-3 rounded border mb-2" style="background:var(--nk-surface);" data-nk-item><div class="fs-3"></div><div class="flex-grow-1"><div class="fw-bold font-monospace small" data-nk-field="to_number">+15551234567</div><div class="small" style="color:var(--nk-text-muted);" data-nk-field="body">Your code is 482910.</div></div><span class="badge" data-nk-field="status">sent</span></div>
</div>
</div></section>`,
    },
  ],
};
