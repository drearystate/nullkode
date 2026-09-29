/**
 * End-to-end checks for owner notifications, flow activity and email, on a
 * throwaway install:
 *  - with no email set up, email is off: the forgot-password page offers the
 *    on-screen route and admin password links come back on screen;
 *  - Admin > Settings > Email: SMTP settings are saved with the password
 *    masked, the test button says "The email server rejected the username or
 *    password." for a wrong one and delivers with the right one, send stats
 *    count, only admins get in, 5 tests an hour;
 *  - the Resend choice reports a bad key and an unverified sender (against a
 *    mock of Resend's API);
 *  - a flow can't be changed, deleted or read through another app;
 *  - owner alerts: on by default for form tables, a table turned off sends
 *    nothing, extra recipients get them, "Send a test submission" delivers an
 *    email marked (test), and all of it works for Designer apps;
 *  - Activity: a failing step and an unsent email read in plain words, the
 *    problems filter, and what the visitor sent;
 *  - the Problems card's count matches the FlowRun rows, and the dashboard
 *    shows a warning dot;
 *  - a reseller client whose AI pool is used up sees AI as paused;
 *  - the same screens in a real browser.
 *
 * Emails go to an SMTP sink this script runs itself; nothing leaves the
 * machine. Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3250 node_modules/.bin/tsx scripts/e2e-notifications.ts
 * Screenshots go to $E2E_SHOTS (default: the system temp dir).
 */
import os from "node:os";
import path from "node:path";
import http from "node:http";
import argon2 from "argon2";
import { chromium, type BrowserContext } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";
import { startSmtpSink, type SinkMessage } from "./smtp-sink";

const port = Number(process.env.E2E_PORT || 3250);
const shots = process.env.E2E_SHOTS || os.tmpdir();
const SINK_USER = "mailer";
// Distinctive, so a leak of any part of it would be found in responses.
const SINK_PASS = "sinkpass-q7Wz9";
const REJECTED = "The email server rejected the username or password.";

/** A stand-in for Resend's API: one good key, one verified domain. */
async function startResendMock() {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      const send = (status: number, data: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      };
      if (req.method !== "POST" || !req.url?.startsWith("/emails")) return send(404, { name: "not_found", message: "Not found", statusCode: 404 });
      if (req.headers.authorization !== "Bearer re_good_key_2026") return send(401, { name: "invalid_api_key", message: "API key is invalid", statusCode: 401 });
      const from = String((JSON.parse(body || "{}") as { from?: string }).from ?? "");
      if (!/@verified\.test>?$/.test(from)) {
        const domain = from.replace(/.*@/, "").replace(/>$/, "");
        return send(403, { name: "validation_error", message: `The ${domain} domain is not verified. Please, add and verify your domain on https://resend.com/domains`, statusCode: 403 });
      }
      send(200, { id: "mock-email-id" });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  return { port: (server.address() as { port: number }).port, close: () => new Promise<void>((r) => server.close(() => r())) };
}

async function main() {
  const sink = await startSmtpSink({ user: SINK_USER, pass: SINK_PASS, rejectSender: (f) => f.endsWith("@unverified.test") });
  const resend = await startResendMock();
  const inst = await startInstance({ port, buildDir: ".next-e2e-notifications", env: { RESEND_BASE_URL: `http://127.0.0.1:${resend.port}` } });
  const { ok, checks } = checker();
  const mail = (pred: (m: SinkMessage) => boolean, ms = 30_000) => waitForMail(sink.messages, pred, ms);
  const noMail = async (pred: (m: SinkMessage) => boolean, ms = 5_000) => {
    await new Promise((r) => setTimeout(r, ms));
    return !sink.messages.some(pred);
  };
  try {
    const op = await installOperator(inst, "Alert Studio");
    const visitor = inst.agent();
    const opUser = (await inst.db.user.findFirst({ where: { email: "operator@example.invalid" } }))!;
    const mallory = await signIn(inst, "mallory@example.com", "Mallory", "mallory-password-2026");
    const malloryUser = (await inst.db.user.findFirst({ where: { email: "mallory@example.com" } }))!;
    const smtp = (password: string) => ({ provider: "smtp", smtp: { host: "127.0.0.1", port: sink.port, security: "auto", user: SINK_USER, password }, from: "studio@alerts.test", fromName: "" });

    /* ── No email set up ─────────────────────────────────────── */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let r: { status: number; text: string; json?: any } = await op.get("/api/admin/email");
    ok("with nothing set up, email is off", r.status === 200 && r.json.status.ready === false && r.json.status.provider === null, r.text.slice(0, 300));
    r = await visitor.get("/forgot-password");
    ok("forgot-password offers the on-screen route when email is off", r.status === 200 && /Password emails aren(&#x27;|')t set up here yet/.test(r.text), r.status);
    r = await visitor.post("/api/auth/forgot", { email: "mallory@example.com" });
    ok("the forgot-password API says email isn't set up", r.status === 503, `${r.status} ${r.text}`);
    r = await op.post(`/api/admin/users/${malloryUser.id}/link`, { purpose: "reset" });
    ok("an admin password link comes back on screen", r.status === 200 && typeof r.json.link === "string" && r.json.emailed === false, r.text.slice(0, 200));
    r = await op.post("/api/admin/email/test", {});
    ok("the test button explains that email isn't set up", r.status === 400 && /isn't set up/.test(r.json.error), r.text);

    /* ── Resend: bad key, unverified sender (mock API) ───────── */
    r = await op.post("/api/admin/email/test", { settings: { provider: "resend", resend: { apiKey: "re_wrong_key_0000" }, from: "hello@verified.test" } });
    ok("Resend: a bad key is reported in plain words", r.json?.ok === false && /Resend rejected the API key/.test(r.json.error), r.text);
    r = await op.post("/api/admin/email/test", { settings: { provider: "resend", resend: { apiKey: "re_good_key_2026" }, from: "hello@unverified.test" } });
    ok("Resend: an unverified sender is reported in plain words", r.json?.ok === false && /hasn't verified the sender address hello@unverified\.test/.test(r.json.error), r.text);

    /* ── SMTP: wrong password, then the right one ───────────── */
    r = await request(op, "PUT", "/api/admin/email", smtp("not-the-password"));
    ok("SMTP settings save", r.status === 200 && r.json.status.ready === true && r.json.status.provider === "smtp", r.text.slice(0, 300));
    ok("the saved password is never sent back", r.json.settings.smtp.passwordSet === true && !r.text.includes("not-the-password"), r.json.settings.smtp);
    const stored = await inst.db.setting.findUnique({ where: { key: "email.smtp.password" } });
    ok("the SMTP password is encrypted in the database", typeof stored?.value === "string" && (stored.value as string).startsWith("enc:v1:"), stored?.value);
    r = await op.post("/api/admin/email/test", {});
    ok("wrong credentials: 'The email server rejected the username or password.'", r.json?.ok === false && r.json.error === REJECTED, r.text);
    r = await op.post("/api/admin/email/test", { settings: smtp(SINK_PASS) });
    ok("the test button sends with what's on screen", r.json?.ok === true && r.json.to === "operator@example.invalid", r.text);
    let m = await mail((x) => x.to.includes("operator@example.invalid") && /^Test email from Alert Studio$/.test(x.subject));
    ok("the test email arrives, from the configured sender", /studio@alerts\.test/.test(m.headers.from ?? "") && m.authUser === SINK_USER, m.headers);
    r = await op.post("/api/admin/email/test", {});
    ok("tests are limited to 5 an hour", r.status === 429 && /5 test emails/.test(r.json.error), `${r.status} ${r.text}`);
    r = await op.get("/api/admin/email");
    ok("stats count the failed test of the saved settings", r.json.stats.failed24h === 1 && r.json.stats.sent24h === 0 && r.json.stats.lastError === REJECTED, r.json.stats);
    r = await request(op, "PUT", "/api/admin/email", { ...smtp(""), smtp: { ...smtp("").smtp, password: "" } });
    ok("a blank password keeps the saved one", r.status === 200 && r.json.settings.smtp.passwordSet === true, r.text.slice(0, 200));
    r = await request(op, "PUT", "/api/admin/email", { ...smtp(SINK_PASS), from: "not an address" });
    ok("a bad sender address is refused", r.status === 400 && /doesn't look like an email address/.test(r.json.error), r.text);
    r = await request(op, "PUT", "/api/admin/email", smtp(SINK_PASS));
    ok("the right password saves", r.status === 200 && r.json.status.ready === true, r.text.slice(0, 200));
    ok("no part of the saved password is shown", r.json.settings.smtp.passwordMask === "••••••••" && !r.text.includes(SINK_PASS.slice(0, 4)) && !r.text.includes(SINK_PASS.slice(-4)), r.json.settings.smtp);
    r = await op.get("/api/admin/settings");
    ok("the general settings list masks it too", r.json?.settings?.["email.smtp.password"] === "••••••••" && !r.text.includes(SINK_PASS.slice(0, 4)), r.json?.settings?.["email.smtp.password"]);
    r = await mallory.get("/api/admin/email");
    ok("non-admins can't read the email settings", r.status === 403, r.status);
    r = await mallory.post("/api/admin/email/test", {});
    ok("non-admins can't send test emails", r.status === 403, r.status);
    r = await request(mallory, "PUT", "/api/admin/email", smtp("x"));
    ok("non-admins can't change the email settings", r.status === 403, r.status);

    r = await visitor.get("/forgot-password");
    ok("with email on, forgot-password shows the form", r.status === 200 && r.text.includes("send you a link"), r.status);
    r = await visitor.post("/api/auth/forgot", { email: "mallory@example.com" });
    ok("forgot-password answers the same way", r.status === 200, `${r.status} ${r.text}`);
    m = await mail((x) => x.to.includes("mallory@example.com") && /Reset your Alert Studio password/.test(x.subject));
    ok("the password email is delivered through SMTP", /reset/i.test(m.body), m.subject);

    /* ── Flows can't be reached through another app ─────────── */
    r = await op.post("/api/projects", { name: "Bakery" });
    const p1: string = r.json.project?.id ?? r.json.id;
    r = await op.post(`/api/projects/${p1}/modules`, { moduleId: "contact-form" });
    ok("contact form installs", r.status === 200, r.text.slice(0, 200));
    r = await op.post(`/api/projects/${p1}/publish`);
    ok("publish", r.status === 200, r.text.slice(0, 200));
    r = await mallory.post("/api/projects", { name: "Mallory app" });
    const p2: string = r.json.project?.id ?? r.json.id;
    const flows = await inst.db.flow.findMany({ where: { projectId: p1 }, select: { id: true, slug: true, name: true } });
    const submit = flows.find((f) => f.slug === "contact-form-submit")!;
    r = await mallory.patch(`/api/projects/${p2}/flows/${submit.id}`, { name: "pwned", graph: { nodes: [], edges: [] } });
    ok("PATCH of another app's flow through your own app returns 404", r.status === 404, r.status);
    r = await mallory.del(`/api/projects/${p2}/flows/${submit.id}`);
    ok("DELETE of another app's flow through your own app returns 404", r.status === 404, r.status);
    r = await mallory.patch(`/api/projects/${p1}/flows/${submit.id}`, { name: "pwned" });
    ok("PATCH through an app you don't own returns 404", r.status === 404, r.status);
    const after = await inst.db.flow.findUnique({ where: { id: submit.id }, select: { name: true, graph: true } });
    ok("the flow is unchanged", after?.name === submit.name && ((after?.graph as { nodes?: unknown[] })?.nodes?.length ?? 0) > 0, after?.name);
    r = await mallory.get(`/api/projects/${p2}/flows/${submit.id}/runs`);
    ok("another app's flow activity can't be read through your own app", r.status === 404, r.status);
    r = await mallory.get(`/api/projects/${p1}/flows/${submit.id}/runs`);
    ok("flow activity is owner only", r.status === 404, r.status);
    r = await op.patch(`/api/projects/${p1}/flows/${submit.id}`, { name: submit.name });
    ok("the owner can still change the flow", r.status === 200, r.status);

    /* ── Owner alerts ────────────────────────────────────────── */
    r = await op.get(`/api/projects/${p1}/alerts`);
    const messages = (r.json?.tables ?? []).find((t: { name: string }) => t.name === "contact_form_messages");
    ok("form tables alert by default", r.status === 200 && messages?.mode === "instant" && messages?.defaultMode === "instant" && r.json.emailOn === true, r.text.slice(0, 400));
    const signups = (r.json?.tables ?? []).find((t: { name: string }) => t.name === "auth_users");
    ok("sign-in tables don't alert by default", !signups || signups.defaultMode === "off", signups);
    r = await visitor.post(`/api/run/${submit.id}`, { full_name: "Ana Lopez", email: "ana@example.com", subject: "Wedding cake", body: "Three tiers please" });
    ok("a visitor sends a message", r.status === 200, r.text.slice(0, 200));
    m = await mail((x) => x.to.includes("operator@example.invalid") && /Ana Lopez/.test(x.subject));
    ok("the owner gets an alert, with replies going to the visitor", /^New contact form message/.test(m.subject) && /ana@example\.com/.test(m.headers["reply-to"] ?? ""), { subject: m.subject, replyTo: m.headers["reply-to"] });

    r = await request(op, "PUT", `/api/projects/${p1}/alerts`, { tables: { contact_form_messages: "off" }, extraRecipients: ["partner@alerts.test"] });
    ok("the owner turns the table off and adds a partner", r.status === 200 && r.json.tables.find((t: { name: string }) => t.name === "contact_form_messages")?.mode === "off" && r.json.extraRecipients[0] === "partner@alerts.test", r.text.slice(0, 300));
    r = await visitor.post(`/api/run/${submit.id}`, { full_name: "Ben Ode", email: "ben@example.com", subject: "Gluten free?", body: "Do you bake gluten free?" });
    ok("a visitor sends another message", r.status === 200, r.text.slice(0, 200));
    ok("turning a table off stops its emails", await noMail((x) => /Ben Ode/.test(x.subject)));
    r = await request(op, "PUT", `/api/projects/${p1}/alerts`, { tables: { contact_form_messages: "instant" } });
    ok("the owner turns it back on", r.status === 200, r.status);
    r = await visitor.post(`/api/run/${submit.id}`, { full_name: "Cy Zelda", email: "cy@example.com", subject: "Opening hours", body: "When do you open?" });
    m = await mail((x) => /Cy Zelda/.test(x.subject));
    ok("extra recipients get the alert too", m.to.includes("operator@example.invalid") && m.to.includes("partner@alerts.test"), m.to);

    r = await request(op, "PUT", `/api/projects/${p1}/alerts`, { extraRecipients: ["a@x.test", "b@x.test", "c@x.test", "d@x.test"] });
    ok("at most 3 extra addresses", r.status === 400, r.text);
    r = await request(op, "PUT", `/api/projects/${p1}/alerts`, { extraRecipients: ["nope"] });
    ok("extra addresses must be email addresses", r.status === 400, r.text);
    r = await request(op, "PUT", `/api/projects/${p1}/alerts`, { tables: { not_a_table: "off" } });
    ok("unknown tables are refused", r.status === 400, r.text);
    for (const [what, res] of [
      ["read", await mallory.get(`/api/projects/${p1}/alerts`)],
      ["change", await request(mallory, "PUT", `/api/projects/${p1}/alerts`, { tables: {} })],
      ["test", await mallory.post(`/api/projects/${p1}/alerts/test`, {})],
    ] as const) ok(`alerts are owner only: ${what}`, res.status === 404, res.status);

    r = await op.post(`/api/projects/${p1}/alerts/test`, {});
    ok("'Send a test submission' answers", r.status === 200 && r.json.ok === true, r.text);
    m = await mail((x) => /^\(test\) /.test(x.subject) && x.to.includes("operator@example.invalid"));
    ok("the test submission delivers an email marked (test)", /^\(test\) New contact form message/.test(m.subject) && /test/i.test(m.body), m.subject);
    ok("the test submission added nothing to the app's data", (await inst.db.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "proj_${p1}".contact_form_messages WHERE email = 'test.person@example.com'`))[0].n === 0);
    r = await op.get(`/projects/${p1}`);
    ok("the launch checklist shows the test submission as done", r.status === 200 && /Send a test submission<span class="sr-only"> \(done\)/.test(r.text.replace(/<!-- -->/g, "")), r.status);

    /* ── Activity and problems ───────────────────────────────── */
    const ds = (await inst.db.dataSource.findFirst({ where: { projectId: p1, kind: "POSTGRES_INTERNAL" } }))!;
    const broken = await createFlow(op, p1, "Broken order", {
      nodes: [
        { id: "t", type: "trigger", data: { label: "Order sent" } },
        { id: "i", type: "insert", data: { label: "Save order", datasourceId: ds.id, table: "no_such_table", values: { name: "{{trigger.name}}" } } },
        { id: "r", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [{ id: "e1", source: "t", target: "i" }, { id: "e2", source: "i", target: "r" }],
    });
    const booking = await createFlow(op, p1, "Book a table", {
      nodes: [
        { id: "t", type: "trigger", data: { label: "Booking sent" } },
        { id: "i", type: "insert", data: { label: "Save booking", datasourceId: ds.id, table: "contact_form_messages", values: { full_name: "{{trigger.full_name}}", email: "{{trigger.email}}", subject: "Booking", body: "{{trigger.body}}" } } },
        { id: "e", type: "email", data: { label: "Confirm", to: "{{trigger.email}}", subject: "Your booking", body: "Thanks {{trigger.full_name}}, see you soon." } },
        { id: "r", type: "response", data: { status: 200, body: '{"ok":true,"message":"Booked"}' } },
      ],
      edges: [{ id: "e1", source: "t", target: "i" }, { id: "e2", source: "i", target: "e" }, { id: "e3", source: "e", target: "r" }],
    });
    for (const who of ["Dana Park", "Eli Stone"]) {
      r = await visitor.post(`/api/run/${broken}`, { name: who, email: `${who.split(" ")[0].toLowerCase()}@example.com`, phone: "555-0101" });
      ok(`a visitor's order fails (${who})`, r.status >= 500, `${r.status} ${r.text.slice(0, 200)}`);
    }
    r = await visitor.post(`/api/run/${booking}`, { full_name: "Gil Moss", email: "gil@example.com", body: "Table for 4" });
    ok("with email on, a booking goes through", r.status === 200, r.text.slice(0, 200));
    await mail((x) => x.to.includes("gil@example.com") && x.subject === "Your booking");
    r = await request(op, "DELETE", "/api/admin/email");
    ok("email turned off (settings removed)", r.status === 200 && r.json.status.ready === false, r.text.slice(0, 200));
    r = await visitor.post(`/api/run/${booking}`, { full_name: "Fay Wong", email: "fay@example.com", body: "Table for 2" });
    ok("with email off, the booking still goes through for the visitor", r.status === 200 && /Booked/.test(r.text), r.text.slice(0, 200));
    r = await op.get(`/api/projects/${p1}/alerts`);
    ok("with email off, the Alerts card knows (it shows the banner)", r.status === 200 && r.json.emailOn === false && r.json.canSetUpEmail === true, r.text.slice(0, 200));
    r = await op.get(`/projects/${p1}`);
    ok("with email off, the overview warns that the app's emails aren't sent", /data-testid="email-off-warning"/.test(r.text) && r.text.includes("“Book a table”"), r.status);
    r = await request(op, "PUT", "/api/admin/email", smtp("not-the-password"));
    ok("email on again, with a password the server refuses", r.status === 200 && r.json.status.ready === true, r.text.slice(0, 200));
    r = await visitor.post(`/api/run/${booking}`, { full_name: "Hal Reed", email: "hal@example.com", body: "Table for 6" });
    ok("when the email server refuses, the booking still goes through", r.status === 200 && /Booked/.test(r.text), r.text.slice(0, 200));
    r = await request(op, "PUT", "/api/admin/email", smtp(SINK_PASS));
    ok("email back on", r.status === 200 && r.json.status.ready === true, r.text.slice(0, 200));

    r = await op.get(`/api/projects/${p1}/flows/${booking}/runs`);
    const bookingRuns = r.json?.runs ?? [];
    ok("Activity lists the runs, newest first", r.status === 200 && bookingRuns.length === 3 && bookingRuns[0].at >= bookingRuns[1].at && bookingRuns[1].at >= bookingRuns[2].at, r.text.slice(0, 300));
    ok("a failing email step reads in plain words", bookingRuns[0].summary === `Saved to contact form messages; the email wasn't sent (${REJECTED.replace(/\.$/, "")}).` && bookingRuns[0].outcome === "warning", bookingRuns[0]);
    ok("an email that wasn't sent because email is off reads in plain words", bookingRuns[1].summary === "Saved to contact form messages; the email wasn't sent because email isn't set up." && bookingRuns[1].outcome === "warning", bookingRuns[1]);
    ok("a normal run reads in plain words", bookingRuns[2].summary === "Saved to contact form messages and emailed gil@example.com." && bookingRuns[2].outcome === "ok", bookingRuns[2]);
    r = await op.get(`/api/projects/${p1}/flows/${broken}/runs`);
    const failedRun = r.json?.runs?.[0];
    ok("a failing step reads in plain words", /^Couldn't save to no such table: /.test(failedRun?.summary ?? "") && failedRun?.outcome === "failed" && failedRun.durationMs !== null, failedRun);
    ok("failed runs show what the visitor sent", failedRun?.fields?.some((f: { name: string; value: string }) => f.name === "Email" && f.value === "eli@example.com") && failedRun?.input?.email === "eli@example.com", failedRun?.fields);
    r = await op.get(`/api/projects/${p1}/flows/${booking}/runs?failed=1`);
    ok("the problems filter lists only runs with a problem", r.json?.runs?.length === 2 && r.json.runs.every((x: { outcome: string }) => x.outcome === "warning"), r.text.slice(0, 300));

    // The owner's own test run from the builder doesn't count as a problem.
    r = await op.post(`/api/run/${broken}`, { name: "Owner test" }, { referer: `http://localhost:${port}/projects/${p1}/flows/${broken}` });
    ok("a builder test run of the broken flow fails too", r.status >= 500, r.status);
    const [{ n: expected }] = await inst.db.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM "FlowRun" r JOIN "Flow" f ON f.id = r."flowId"
        WHERE f."projectId" = $1 AND r."createdAt" >= now() - interval '24 hours'
          AND (r.status LIKE '5%' OR (jsonb_typeof(r.output->'meta'->'warnings') = 'array' AND r.output->'meta'->'warnings' <> '[]'::jsonb))
          AND COALESCE(r.output->'meta'->>'source', 'live') NOT IN ('test', 'schedule', 'test-submission')`,
      p1,
    );
    r = await op.get(`/projects/${p1}`);
    const html = r.text.replace(/<!-- -->/g, "");
    const shown = Number(/data-testid="problems-total">(\d+) problems?</.exec(html)?.[1] ?? -1);
    ok("the Problems card count matches the FlowRun rows", expected === 4 && shown === expected, { expected, shown });
    ok("the Problems card says it in plain words", html.includes("“Broken order” didn&#x27;t go through for 2 people.") && html.includes("“Book a table” went through once, but the email wasn&#x27;t sent because email isn&#x27;t set up. It also had a problem once: The email server rejected the username or password."), html.match(/data-testid="problem-line"[\s\S]{0,400}/g));
    r = await op.get("/dashboard");
    const dot = /data-testid="problem-dot"[^>]*>[\s\S]*?Bakery: (\d+) problems? in the last 24 hours/.exec(r.text.replace(/<!-- -->/g, ""));
    ok("the dashboard shows a warning dot on the app", Number(dot?.[1]) === expected, dot?.[0]?.slice(0, 200));

    /* ── Designer apps ───────────────────────────────────────── */
    r = await op.post("/api/projects", { name: "Designed shop" });
    const d1: string = r.json.project?.id ?? r.json.id;
    r = await op.post(`/api/projects/${d1}/modules`, { moduleId: "contact-form" });
    ok("a form installs in the app that becomes a Designer app", r.status === 200, r.text.slice(0, 200));
    await inst.db.project.update({ where: { id: d1 }, data: { kind: "DESIGNER" } });
    r = await op.get(`/projects/${d1}`);
    ok("Designer apps get the overview, with the way back to the Designer", r.status === 200 && r.text.includes("Continue in the Designer") && r.text.includes(`/projects/${d1}/designer`), r.status);
    r = await op.get(`/api/projects/${d1}/alerts`);
    ok("the Alerts card works for Designer apps", r.status === 200 && r.json.tables.some((t: { name: string; mode: string }) => t.name === "contact_form_messages" && t.mode === "instant"), r.text.slice(0, 300));
    r = await op.post(`/api/projects/${d1}/alerts/test`, {});
    ok("so does the test submission", r.status === 200 && r.json.ok === true, r.text);
    await mail((x) => /^\(test\) /.test(x.subject) && x.to.includes("operator@example.invalid") && x.body.includes("Designed shop"));
    r = await op.get("/dashboard");
    ok("the dashboard opens Designer apps straight in the Designer", r.text.includes(`href="/projects/${d1}/designer"`), r.status);

    /* ── Stats ───────────────────────────────────────────────── */
    r = await op.get("/api/admin/email");
    // Failed: the saved-settings test with the wrong password, then Hal's booking
    // confirmation and the owner's alert about that booking.
    ok("sends are counted in the last 24 hours", r.json.stats.sent24h >= 5 && r.json.stats.failed24h === 3 && r.json.stats.lastError === REJECTED, r.json.stats);

    /* ── AI paused up front for a reseller client ───────────── */
    await inst.db.setting.create({ data: { key: "ai.openai.apiKey", value: "sk-e2e-not-real" } });
    const resellerOwner = await inst.db.user.create({ data: { email: "rita@agency.test", name: "Rita", role: "RESELLER", passwordHash: await argon2.hash("rita-password-2026", { type: argon2.argon2id }) } });
    const agency = await inst.db.reseller.create({ data: { ownerId: resellerOwner.id, name: "Bright Agency", slug: "bright-agency", maxAiActions: 0 } });
    const client = await signIn(inst, "jo@shop.test", "Jo", "jo-password-2026", { resellerId: agency.id });
    r = await client.get("/dashboard");
    ok("a client of a reseller whose AI pool is used up sees AI as paused", r.status === 200 && /role="status"[^>]*>[^<]*paused/i.test(r.text) && !r.text.includes('id="dashboard-idea"'), r.status);
    r = await op.get("/dashboard");
    ok("the operator can still describe an app", r.text.includes('id="dashboard-idea"'), r.status);

    /* ── In a real browser ───────────────────────────────────── */
    await signIn(inst, "admin2@alerts.test", "Second Admin", "admin2-password-2026", { role: "ADMIN" });
    const admin2 = inst.agent();
    await admin2.post("/api/auth/login", { email: "admin2@alerts.test", password: "admin2-password-2026" });
    const browser = await chromium.launch();
    const pageErrors: string[] = [];
    try {
      const adminCtx = await contextFor(browser, inst, admin2);
      const page = await adminCtx.newPage();
      page.setDefaultTimeout(120_000);
      page.on("pageerror", (e) => pageErrors.push(String(e)));
      await page.goto(`${inst.base}/admin/settings#email`, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Email" }).waitFor();
      await page.getByText(/Email is on: sending through your email server/).waitFor();
      await page.locator('input[name="smtp-password"]').fill("typed-wrong-password");
      await page.getByRole("button", { name: "Send a test email to me" }).click();
      await page.getByRole("alert").filter({ hasText: REJECTED }).waitFor();
      ok("in the browser, wrong credentials show the plain message", true);
      await page.locator('input[name="smtp-password"]').fill("");
      await page.getByRole("button", { name: "Send a test email to me" }).click();
      await page.getByText("Sent to admin2@alerts.test").waitFor();
      await mail((x) => x.to.includes("admin2@alerts.test"));
      ok("in the browser, the test button delivers a message", true);
      await page.locator("#email").screenshot({ path: path.join(shots, "email-settings.png") });
      await adminCtx.close();

      const ownerCtx = await contextFor(browser, inst, op);
      const owner = await ownerCtx.newPage();
      owner.setDefaultTimeout(120_000);
      owner.on("pageerror", (e) => pageErrors.push(String(e)));
      await owner.goto(`${inst.base}/projects/${p1}`, { waitUntil: "networkidle" });
      await owner.getByRole("heading", { name: "Alerts" }).waitFor();
      const toggle = owner.getByRole("switch", { name: "Contact form messages" });
      ok("the Alerts card shows the form table switched on", (await toggle.getAttribute("aria-checked")) === "true");
      await toggle.click();
      await owner.getByRole("button", { name: "Save alerts" }).click();
      await owner.getByText("Saved.").waitFor();
      const savedAlerts = await inst.db.setting.findUnique({ where: { key: `alerts:${p1}` } });
      ok("the Alerts card saves a switch", JSON.stringify(savedAlerts?.value ?? null).includes('"contact_form_messages":"off"'), savedAlerts?.value);
      await toggle.click();
      await owner.getByRole("button", { name: "Save alerts" }).click();
      await owner.getByText("Saved.").waitFor();
      ok("the Problems card is on the overview", await owner.getByRole("heading", { name: "Problems in the last 24 hours" }).isVisible());
      await owner.getByRole("heading", { name: "Alerts" }).scrollIntoViewIfNeeded();
      await owner.screenshot({ path: path.join(shots, "overview-alerts.png"), fullPage: true });
      await owner.getByRole("button", { name: /Send a test submission/ }).click();
      await owner.getByText(/Look for an email marked \(test\)/).waitFor();
      ok("the launch checklist's test submission works in the browser", true);

      await owner.goto(`${inst.base}/projects/${p1}/flows/${booking}?tab=activity`, { waitUntil: "networkidle" });
      await owner.getByText("Saved to contact form messages; the email wasn't sent because email isn't set up.").waitFor();
      ok("the Activity tab shows the unsent email in plain words", true);
      await owner.getByRole("button", { name: "Only problems" }).click();
      await owner.getByText("What they sent").first().waitFor();
      ok("the problems filter shows what the visitor sent", await owner.getByText("fay@example.com").first().isVisible());
      await owner.screenshot({ path: path.join(shots, "flow-activity.png") });
      await owner.getByRole("tab", { name: "Steps" }).click();
      await owner.locator(".react-flow__node").first().waitFor();
      ok("the Steps tab still shows the flow", (await owner.locator(".react-flow__node").count()) === 4);

      await owner.goto(`${inst.base}/dashboard`, { waitUntil: "networkidle" });
      ok("the dashboard shows the warning dot", await owner.getByTestId("problem-dot").first().isVisible());
      await owner.screenshot({ path: path.join(shots, "dashboard-dot.png") });
      await ownerCtx.close();
    } finally {
      await browser.close();
    }
    ok("no errors in the browser", pageErrors.length === 0, pageErrors);

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-80).join("\n"));
    process.exitCode = 1;
  } finally {
    await inst.stop();
    await sink.close();
    await resend.close();
  }
}

async function waitForMail(list: SinkMessage[], pred: (m: SinkMessage) => boolean, ms: number): Promise<SinkMessage> {
  const until = Date.now() + ms;
  for (;;) {
    const found = list.find(pred);
    if (found) return found;
    if (Date.now() > until) throw new Error(`no matching email arrived (have: ${list.map((m) => `${m.to.join(",")} "${m.subject}"`).join(" | ")})`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

/** The harness agent has no PUT; send one with the same cookies. */
async function request(a: Agent, method: "PUT" | "DELETE", p: string, body?: unknown) {
  return new Promise<{ status: number; text: string; json?: any }>((resolve, reject) => {
    const payload = body === undefined ? "" : JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: p,
        method,
        headers: {
          ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
          ...(a.jar.size ? { cookie: [...a.jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
          "x-real-ip": "203.0.113.7",
        },
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (d) => (text += d));
        res.on("end", () => {
          let json: unknown;
          try { json = JSON.parse(text); } catch { /* not JSON */ }
          resolve({ status: res.statusCode ?? 0, text, json });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(180_000, () => req.destroy(new Error(`timeout ${method} ${p}`)));
    if (payload) req.write(payload);
    req.end();
  });
}

async function signIn(inst: Instance, email: string, name: string, password: string, extra: Record<string, unknown> = {}): Promise<Agent> {
  await inst.db.user.create({ data: { email, name, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), ...extra } });
  const a = inst.agent();
  const r = await a.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${r.text}`);
  return a;
}

async function createFlow(op: Agent, projectId: string, name: string, graph: unknown): Promise<string> {
  const r = await op.post(`/api/projects/${projectId}/flows`, { name });
  const id: string = r.json.flow.id;
  const p = await op.patch(`/api/projects/${projectId}/flows/${id}`, { graph });
  if (p.status !== 200) throw new Error(`couldn't save flow ${name}: ${p.status} ${p.text}`);
  return id;
}

async function contextFor(browser: import("playwright").Browser, inst: Instance, a: Agent): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addCookies([...a.jar].map(([name, value]) => ({ name, value, url: inst.base })));
  return ctx;
}

main();
