/**
 * End-to-end checks for the owner's data view (the Data tab) on a throwaway
 * install:
 *  - the owner sees the app's tables by friendly name, with row counts;
 *  - rows come newest first, and can be searched, sorted and paged;
 *  - the owner can add, change and delete rows (JSON is checked), and
 *    download them as CSV;
 *  - password hashes never leave the server, in any response;
 *  - another signed-in user gets 404 from every data route;
 *  - bad table and column names are refused;
 *  - the overview's "Latest submissions" card lists what visitors sent;
 *  - the Data tab works in a real browser (open a table, add a row).
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   node_modules/.bin/tsx scripts/e2e-data.ts
 * Screenshots go to $E2E_SHOTS (default: the system temp dir).
 */
import os from "node:os";
import path from "node:path";
import argon2 from "argon2";
import { chromium } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Res } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3172);
const shots = process.env.E2E_SHOTS || os.tmpdir();

async function main() {
  const inst = await startInstance({ port, buildDir: ".next-e2e-data" });
  const { ok, checks } = checker();
  const seen: Res[] = [];
  try {
    const op0 = await installOperator(inst, "Data Studio");
    // Record every data-route response so we can check none leaks a secret.
    const record = (a: Agent): Agent => ({
      ...a,
      get: async (p, h) => keep(p, await a.get(p, h)),
      post: async (p, b, h) => keep(p, await a.post(p, b, h)),
      patch: async (p, b) => keep(p, await a.patch(p, b)),
      del: async (p, b) => keep(p, await a.del(p, b)),
    });
    const keep = (p: string, r: Res) => {
      if (p.includes("/data")) seen.push(r);
      return r;
    };
    const op = record(op0);
    const visitor = inst.agent();

    let r = await op.post("/api/projects", { name: "Bakery" });
    const projectId: string = r.json.project?.id ?? r.json.id;
    r = await op.post(`/api/projects/${projectId}/modules`, { moduleId: "contact-form" });
    ok("contact form installs", r.status === 200, r.text.slice(0, 200));
    const authTable = () => inst.db.dataTable.count({ where: { name: "auth_users", datasource: { projectId } } });
    if ((await authTable()) === 0) r = await op.post(`/api/projects/${projectId}/modules`, { moduleId: "auth" });
    const hasAuth = (await authTable()) > 0;
    ok("the app has sign-ups", hasAuth, r.text.slice(0, 200));
    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("publish", r.status === 200, r.text.slice(0, 200));

    const flows = await inst.db.flow.findMany({ where: { projectId } });
    const flow = (slug: string) => flows.find((f) => f.slug === slug)!.id;
    const schema = `"proj_${projectId}"`;
    const T = "contact_form_messages";

    // Visitors send messages and sign up, the real way.
    for (const [who, subject] of [["Ana Lopez", "Wedding cake"], ["Ben Ode", "Gluten free?"], ["Cy Zelda", "Opening hours"]]) {
      r = await visitor.post(`/api/run/${flow("contact-form-submit")}`, { full_name: who, email: `${who.split(" ")[0].toLowerCase()}@example.com`, subject, body: `Hi, it's ${who}.` });
      ok(`a visitor sends a message (${who})`, r.status === 200, r.text.slice(0, 200));
    }
    r = await visitor.post(`/api/run/${flow("register")}`, { name: "Rex", email: "rex@example.com", password: "rex-password-2026" });
    ok("a visitor signs up", r.status === 200, r.text.slice(0, 200));
    const hashRow = await inst.db.$queryRawUnsafe<Array<{ password_hash: string }>>(`SELECT password_hash FROM ${schema}.auth_users LIMIT 1`);
    const hash = hashRow[0].password_hash;
    ok("the sign-up stored a password hash", typeof hash === "string" && hash.length > 20);
    // Spread the messages out in time: Ana oldest, Cy newest.
    await inst.db.$executeRawUnsafe(`UPDATE ${schema}.${T} SET created_at = NOW() - interval '3 hours' WHERE full_name = 'Ana Lopez'`);
    await inst.db.$executeRawUnsafe(`UPDATE ${schema}.${T} SET created_at = NOW() - interval '2 hours' WHERE full_name = 'Ben Ode'`);
    await inst.db.$executeRawUnsafe(`UPDATE ${schema}.${T} SET created_at = NOW() - interval '1 hour' WHERE full_name = 'Cy Zelda'`);
    // Tables made "earlier", so these rows count as visitor submissions, not starter rows.
    await inst.db.$executeRawUnsafe(`UPDATE "DataTable" SET "createdAt" = NOW() - interval '1 day' WHERE "datasourceId" IN (SELECT id FROM "DataSource" WHERE "projectId" = $1)`, projectId);

    // Tables with friendly names and counts.
    r = await op.get(`/api/projects/${projectId}/data`);
    const tables = r.json?.tables as Array<{ id: string; name: string; label: string; rows: number | null; editable: boolean }>;
    const messages = tables?.find((t) => t.name === T);
    const users = tables?.find((t) => t.name === "auth_users");
    ok("owner lists tables", r.status === 200 && Array.isArray(tables), r.text.slice(0, 300));
    ok("tables have friendly names", messages?.label === "Contact form messages" && users?.label === "People who signed up", tables?.map((t) => t.label));
    ok("tables show row counts", messages?.rows === 3 && users?.rows === 1 && messages.editable, tables);

    const rowsUrl = (t: string, qs = "") => `/api/projects/${projectId}/data/tables/${t}${qs ? `?${qs}` : ""}`;
    r = await op.get(rowsUrl(messages!.id));
    const names = (res: Res) => (res.json?.rows ?? []).map((x: Record<string, unknown>) => x.full_name);
    ok("rows come newest first", r.status === 200 && JSON.stringify(names(r)) === JSON.stringify(["Cy Zelda", "Ben Ode", "Ana Lopez"]), names(r));
    const cols = (r.json?.columns ?? []) as Array<{ name: string; label: string; readOnly: boolean; type: string }>;
    ok("columns have friendly names", cols.find((c) => c.name === "full_name")?.label === "Full name" && cols.find((c) => c.name === "created_at")?.label === "Added", cols);
    ok("id and created_at are read-only", cols.find((c) => c.name === "id")?.readOnly === true && cols.find((c) => c.name === "created_at")?.readOnly === true);
    r = await op.get(rowsUrl(T));
    ok("a table can also be opened by its name", r.status === 200 && r.json?.total === 3, r.status);

    r = await op.get(rowsUrl(messages!.id, "search=zelda"));
    ok("search finds matching rows", r.status === 200 && r.json.total === 1 && names(r)[0] === "Cy Zelda", r.json);
    r = await op.get(rowsUrl(messages!.id, "search=" + encodeURIComponent("%")));
    ok("search treats % as plain text", r.status === 200 && r.json.total === 0, r.json?.total);
    r = await op.get(rowsUrl(messages!.id, "sort=full_name&dir=asc"));
    ok("sorting by a column works", JSON.stringify(names(r)) === JSON.stringify(["Ana Lopez", "Ben Ode", "Cy Zelda"]), names(r));
    r = await op.get(rowsUrl(messages!.id, "pageSize=2&page=2"));
    ok("pages work", r.json.rows.length === 1 && r.json.total === 3 && names(r)[0] === "Ana Lopez", r.json);
    r = await op.get(rowsUrl(messages!.id, "pageSize=5000"));
    ok("page size is capped at 200", r.json.pageSize === 200, r.json.pageSize);

    // Add, change, delete.
    r = await op.post(rowsUrl(messages!.id), { values: { full_name: "Dee Owner", email: "dee@example.com", subject: "Added by hand", body: "=HYPERLINK(\"x\")" } });
    const added = r.json?.row;
    ok("owner adds a row", r.status === 200 && added?.id && added.full_name === "Dee Owner", r.text.slice(0, 200));
    r = await op.get(rowsUrl(messages!.id));
    ok("the new row is first", names(r)[0] === "Dee Owner" && r.json.total === 4, names(r));
    r = await op.patch(rowsUrl(messages!.id), { id: added.id, values: { subject: "Changed subject" } });
    ok("owner changes a cell", r.status === 200 && r.json.row.subject === "Changed subject", r.text.slice(0, 200));
    r = await op.patch(rowsUrl(messages!.id), { id: added.id, values: { created_at: "2020-01-01T00:00:00Z" } });
    ok("read-only columns can't be changed", r.status === 400, r.text);
    r = await op.patch(rowsUrl(messages!.id), { id: added.id, values: { id: 99 } });
    ok("the ID can't be changed", r.status === 400, r.text);
    r = await op.patch(rowsUrl(messages!.id), { id: 999999, values: { subject: "x" } });
    ok("changing a missing row is a 404", r.status === 404, r.text);

    // CSV
    r = await op.get(`/api/projects/${projectId}/data/tables/${messages!.id}/csv`);
    ok("CSV downloads", r.status === 200 && /text\/csv/.test(String(r.headers["content-type"])) && /attachment/.test(String(r.headers["content-disposition"])), r.headers);
    ok("CSV has friendly headers and all rows", r.text.includes("Full name") && ["Ana Lopez", "Ben Ode", "Cy Zelda", "Dee Owner"].every((n) => r.text.includes(n)), r.text.slice(0, 400));
    ok("CSV defuses spreadsheet formulas", r.text.includes(`"'=HYPERLINK(""x"")"`), r.text.slice(0, 600));
    r = await op.get(`/api/projects/${projectId}/data/tables/${messages!.id}/csv?search=ben`);
    ok("CSV follows the search", r.text.includes("Ben Ode") && !r.text.includes("Ana Lopez"), r.text.slice(0, 300));

    // Latest submissions (before deleting anything).
    r = await op.get(`/api/projects/${projectId}/data/latest`);
    const subs = (r.json?.submissions ?? []) as Array<{ tableId: string; tableLabel: string; summary: string }>;
    ok("latest submissions lists the newest rows first", r.status === 200 && subs.length === 4 && subs[0].summary.startsWith("Dee Owner") && subs[1].summary.startsWith("Cy Zelda"), subs);
    ok("latest submissions link to the table and skip sign-ups", subs.every((s) => s.tableId === messages!.id && s.tableLabel === "Contact form messages"), subs);

    // Delete
    r = await op.del(rowsUrl(messages!.id), { ids: [added.id] });
    ok("owner deletes rows", r.status === 200 && r.json.deleted === 1, r.text);
    r = await op.get(rowsUrl(messages!.id));
    ok("the deleted row is gone", r.json.total === 3 && !names(r).includes("Dee Owner"), names(r));
    r = await op.del(rowsUrl(messages!.id), { ids: [] });
    ok("deleting nothing is refused", r.status === 400, r.text);
    r = await op.del(rowsUrl(messages!.id), { ids: ["1 OR 1=1"] });
    ok("odd row IDs are refused", r.status === 400, r.text);
    r = await op.get(rowsUrl(messages!.id));
    ok("...and nothing was deleted", r.json.total === 3);

    // JSON columns (a table made under Advanced).
    const ds = await inst.db.dataSource.findFirst({ where: { projectId, kind: "POSTGRES_INTERNAL" } });
    r = await op.post(`/api/projects/${projectId}/datasources`, { _action: "create_table", datasourceId: ds!.id, name: "services", fields: [{ name: "title", type: "text" }, { name: "price", type: "float" }, { name: "active", type: "bool" }, { name: "details", type: "json" }, { name: "starts_on", type: "timestamp" }] });
    ok("a table can still be made under Advanced", r.status === 200, r.text.slice(0, 200));
    r = await op.post(rowsUrl("services"), { values: { title: "Cake tasting", details: "{not json" } });
    ok("bad JSON is refused", r.status === 400 && /JSON/.test(r.json?.error), r.text);
    r = await op.post(rowsUrl("services"), { values: { title: "Cake tasting", price: "abc" } });
    ok("a word in a number column is refused", r.status === 400, r.text);
    r = await op.post(rowsUrl("services"), { values: { title: "Cake tasting", price: "12.5", active: "true", details: '{"people": 2, "tags": ["a", "b"]}', starts_on: "2026-10-01T09:00:00Z" } });
    ok("an empty lookup table gets a row", r.status === 200 && r.json.row.price === 12.5 && r.json.row.active === true && r.json.row.details?.tags?.[1] === "b", r.text);
    const svc = r.json.row;
    r = await op.patch(rowsUrl("services"), { id: svc.id, values: { details: "[1,2,3]" } });
    ok("a JSON cell can be changed", r.status === 200 && JSON.stringify(r.json.row.details) === "[1,2,3]", r.text);

    // Password hashes stay on the server.
    r = await op.get(rowsUrl(users!.id));
    ok("sign-ups are listed without password hashes", r.status === 200 && r.json.total === 1 && !r.json.columns.some((c: { name: string }) => /password/.test(c.name)) && !("password_hash" in r.json.rows[0]), r.text.slice(0, 300));
    r = await op.get(rowsUrl(users!.id, "sort=password_hash"));
    ok("can't sort by a password hash", r.status === 400, r.status);
    r = await op.get(rowsUrl(users!.id, "search=" + encodeURIComponent(hash.slice(0, 12))));
    ok("can't search the password hashes", r.status === 200 && r.json.total === 0, r.json?.total);
    r = await op.patch(rowsUrl(users!.id), { id: r.json.rows?.[0]?.id ?? 1, values: { password_hash: "x" } });
    ok("can't write a password hash", r.status === 400, r.text);
    r = await op.post(rowsUrl(users!.id), { values: { email: "new@example.com", password_hash: "x" } });
    ok("can't add a row with a password hash", r.status === 400, r.text);
    r = await op.get(`/api/projects/${projectId}/data/tables/${users!.id}/csv`);
    ok("the sign-ups CSV has no hashes", r.status === 200 && r.text.includes("rex@example.com") && !r.text.includes(hash) && !/password/i.test(r.text), r.text.slice(0, 300));

    // Bad names.
    for (const bad of [encodeURIComponent('contact_form_messages"; DROP TABLE x; --'), "no_such_table", encodeURIComponent("../../users"), "User"]) {
      r = await op.get(rowsUrl(bad));
      ok(`unknown table "${decodeURIComponent(bad).slice(0, 30)}" is a 404`, r.status === 404, `${r.status} ${r.text.slice(0, 100)}`);
    }
    r = await op.get(rowsUrl(messages!.id, "sort=" + encodeURIComponent('full_name"; DROP TABLE x; --')));
    ok("a bad sort column is refused", r.status === 400, r.status);
    r = await op.post(rowsUrl(messages!.id), { values: { 'full_name" = 1; --': "x" } });
    ok("a bad column name in values is refused", r.status === 400, r.text);
    r = await op.post(rowsUrl(messages!.id), { values: { nope: "x" } });
    ok("an unknown column is refused", r.status === 400, r.text);
    // Another project's table can't be reached through this project.
    r = await op.post("/api/projects", { name: "Other app" });
    const otherProject: string = r.json.project?.id ?? r.json.id;
    r = await op.get(`/api/projects/${otherProject}/data/tables/${messages!.id}`);
    ok("a table can't be opened through another project", r.status === 404, r.status);

    // Someone else, signed in, gets nothing.
    await inst.db.user.create({ data: { email: "mallory@example.com", name: "Mallory", passwordHash: await argon2.hash("mallory-password-2026", { type: argon2.argon2id }) } });
    const mallory = record(inst.agent());
    r = await mallory.post("/api/auth/login", { email: "mallory@example.com", password: "mallory-password-2026" });
    ok("another user signs in", r.status === 200, r.text);
    const denied: Array<[string, Promise<Res>]> = [
      ["list tables", mallory.get(`/api/projects/${projectId}/data`)],
      ["latest", mallory.get(`/api/projects/${projectId}/data/latest`)],
      ["read rows", mallory.get(rowsUrl(messages!.id))],
      ["read rows by name", mallory.get(rowsUrl(T))],
      ["add row", mallory.post(rowsUrl(messages!.id), { values: { full_name: "evil" } })],
      ["change row", mallory.patch(rowsUrl(messages!.id), { id: 1, values: { full_name: "evil" } })],
      ["delete rows", mallory.del(rowsUrl(messages!.id), { ids: [1] })],
      ["CSV", mallory.get(`/api/projects/${projectId}/data/tables/${messages!.id}/csv`)],
    ];
    for (const [what, p] of denied) {
      const res = await p;
      ok(`another user gets 404: ${what}`, res.status === 404, `${res.status} ${res.text.slice(0, 100)}`);
    }
    r = await inst.agent().get(`/api/projects/${projectId}/data`);
    ok("signed-out requests are refused", r.status === 401, r.status);
    r = await op.get(rowsUrl(messages!.id));
    ok("the other user changed nothing", r.json.total === 3 && !names(r).includes("evil"), names(r));

    ok(`no data response contained a password hash (${seen.length} checked)`, seen.length > 20 && seen.every((x) => !x.text.includes(hash) && !x.text.includes("password_hash") && !x.text.includes("$argon2")));

    // In a real browser.
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
      await ctx.addCookies([...op0.jar].map(([name, value]) => ({ name, value, domain: "127.0.0.1", path: "/" })));
      const page = await ctx.newPage();
      page.setDefaultTimeout(120_000);
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(String(e)));

      await page.goto(`${inst.base}/projects/${projectId}`, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Latest submissions" }).waitFor();
      await page.getByText(/Cy Zelda/).first().waitFor();
      ok("the overview shows latest submissions", true);
      await page.getByRole("heading", { name: "Latest submissions" }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(shots, "data-overview-card.png") });

      await page.goto(`${inst.base}/projects/${projectId}/data`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Contact form messages/ }).waitFor();
      ok("the Data tab lists tables by friendly name", await page.getByRole("button", { name: /People who signed up/ }).isVisible());
      ok("technical setup is tucked under Advanced", !(await page.getByText("Built-in Postgres").first().isVisible()));
      await page.screenshot({ path: path.join(shots, "data-tables.png") });

      await page.getByRole("button", { name: /Contact form messages/ }).click();
      const grid = page.getByTestId("data-grid");
      await grid.getByText("Cy Zelda", { exact: true }).waitFor();
      ok("a table opens as a grid", await grid.getByRole("button", { name: /Sort by Full name/ }).isVisible().catch(() => false) || (await grid.locator("th").count()) > 3);
      await page.getByRole("button", { name: "Add a row" }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Full name").fill("Browser Bea");
      await dialog.getByLabel("Email").fill("bea@example.com");
      await dialog.getByRole("button", { name: "Add row" }).click();
      await grid.getByText("Browser Bea", { exact: true }).waitFor();
      ok("a row added in the browser shows up in the grid", true);
      await page.getByText("4 rows").waitFor();
      ok("the row count updates", true);
      await page.screenshot({ path: path.join(shots, "data-grid.png") });

      // Change a cell inline.
      await grid.getByRole("button", { name: /^bea@example\.com/ }).click();
      const cell = grid.getByLabel("Email");
      await cell.fill("bea@bakery.test");
      await cell.press("Enter");
      await grid.getByText("bea@bakery.test", { exact: true }).waitFor();
      ok("a cell can be changed in place", true);
      ok("no browser errors", pageErrors.length === 0, pageErrors);
    } finally {
      await browser.close();
    }
    const bea = await inst.db.$queryRawUnsafe<Array<{ email: string }>>(`SELECT email FROM ${schema}.${T} WHERE full_name = 'Browser Bea'`);
    ok("the browser's changes were saved", bea[0]?.email === "bea@bakery.test", bea);

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-60).join("\n"));
    process.exitCode = 1;
  } finally {
    await inst.stop();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

main();
