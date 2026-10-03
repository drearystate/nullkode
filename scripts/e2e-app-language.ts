/**
 * End-to-end checks for apps in a language of their own (lib/app-locale.ts,
 * lib/i18n-content.ts), on a throwaway install with a scripted
 * OpenAI-compatible mock (no real AI provider, no network):
 *  - the app's language is stored (Setting locale:<id>), changed through
 *    /api/projects/<id>/locale and shown on the app's overview (App language);
 *  - a published Arabic app has <html lang="ar" dir="rtl">, window.__nkLocale
 *    and the runtime's texts in Arabic; an English app is exactly as before;
 *  - visitors of a Spanish app get the platform's own error (a flow that
 *    fails) and form-validation texts in Spanish, in the API and on the page;
 *  - installing a feature into a Spanish app translates its pages, titles and
 *    built-in messages (mock AI) and keeps every data-nk-* attribute; a broken
 *    translation (a wiring attribute dropped) falls back to English;
 *  - an AI build in Spanish writes the language rule into the page prompt,
 *    saves the app as Spanish and installs its sign-in pages in Spanish;
 *  - multilingual apps: adding languages translates every page (wiring
 *    kept) and puts a switcher in each language's menu; a language goes live
 *    on publish (translations frozen in the snapshot); /<lang>/<page>
 *    addresses with <html lang dir>, links that stay in the language and
 *    hreflang alternates; the visitor's language from the cookie or
 *    Accept-Language; sitemap alternates; flows answer in the visitor's
 *    language (x-nk-lang, {{request.lang}}, built-in messages); a feature's
 *    email goes out in the recipient's saved language; the switcher works in
 *    a browser and fires nk-locale-change; the editor shows language tabs.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3281 node_modules/.bin/tsx scripts/e2e-app-language.ts
 * The mock AI server listens on E2E_PORT + 1.
 */
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";
import { startSmtpSink, type SmtpSink } from "./smtp-sink";

const port = Number(process.env.E2E_PORT || 3281);
const mockPort = port + 1;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const runtimeText = (locale: string) => JSON.parse(readFileSync(path.join(process.cwd(), "messages", locale, "runtime.json"), "utf8")) as Record<string, string>;

/* ───────────────────────── Mock AI server ───────────────────────── */

type ChatBody = { model: string; messages: Array<{ role: string; content: unknown }> };
type Recorded = { system: string; user: string };
type Mode = "translate" | "break";

/** Pretend translation: "[es] " (the target language's code) before every text between tags. */
function fakeTranslateHtml(html: string, code = "es"): string {
  return html.replace(/>([^<]*\p{L}[^<]*)</gu, (_m, text: string) => `>${text.replace(/^(\s*)/, `$1[${code}] `)}<`);
}
const targetCode = (system: string) => /code "([^"]+)"/.exec(system)?.[1] ?? "es";

function createMock() {
  const requests: Recorded[] = [];
  let mode: Mode = "translate";
  let page = "";
  const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("\n") : "");
  const answer = (rec: Recorded): string | null => {
    if (/You translate the visible text of a web page/.test(rec.system)) {
      if (mode === "break") return fakeTranslateHtml(rec.user).replace(/\sdata-nk-[a-z-]+="[^"]*"/, "");
      return fakeTranslateHtml(rec.user, targetCode(rec.system));
    }
    if (/You translate short texts/.test(rec.system)) {
      if (mode === "break") return "Sorry, I can't help with that.";
      const input = JSON.parse(rec.user) as Record<string, string>;
      return JSON.stringify(Object.fromEntries(Object.entries(input).map(([k, v]) => [k, `[${targetCode(rec.system)}] ${v}`])));
    }
    if (/page builder|You build ONE page/.test(rec.system)) return page;
    // The build rule's check (src/lib/ai/build-policy.ts; tested in e2e-build-policy.ts).
    if (/You enforce one rule of an AI app-building platform/.test(rec.system)) return JSON.stringify({ allowed: true, reason: "An ordinary app." });
    return null;
  };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      let body: ChatBody;
      try {
        body = JSON.parse(raw) as ChatBody;
      } catch {
        res.writeHead(400);
        return res.end();
      }
      const rec = { system: text(body.messages.find((m) => m.role === "system")?.content), user: text(body.messages.find((m) => m.role === "user")?.content) };
      requests.push(rec);
      const content = answer(rec);
      if (content === null) {
        res.writeHead(500, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "no scripted answer", type: "mock_error", code: null } }));
      }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      const chunk = (delta: Record<string, unknown>, finish: string | null) =>
        `data: ${JSON.stringify({ id: "chatcmpl-mock", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
      res.write(chunk({ role: "assistant", content: "" }, null));
      for (let i = 0; i < content.length; i += 400) res.write(chunk({ content: content.slice(i, i + 400) }, null));
      res.write(chunk({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
  });
  return {
    requests,
    setMode: (m: Mode) => { mode = m; },
    setPage: (p: string) => { page = p; },
    listen: () => new Promise<void>((resolve) => server.listen(mockPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/* ───────────────────────── Helpers ───────────────────────── */

async function newApp(op: Agent, name: string): Promise<{ id: string; slug: string }> {
  const r = await op.post("/api/projects", { name });
  if (r.status !== 200 && r.status !== 201) throw new Error(`create ${name}: ${r.status} ${r.text.slice(0, 300)}`);
  return { id: r.json.project.id, slug: r.json.project.slug };
}

async function publish(op: Agent, projectId: string) {
  const r = await op.post(`/api/projects/${projectId}/publish`);
  if (r.status !== 200) throw new Error(`publish: ${r.status} ${r.text.slice(0, 300)}`);
}

async function waitForRun(a: Agent, runId: string, ms = 120_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
    const r = await a.get(`/api/ai/runs/${runId}`);
    if (r.status === 200 && r.json.status !== "running") return r.json;
  }
  throw new Error(`run ${runId} did not finish`);
}

/** Every data-nk-* attribute name on a page, counted (flow ids differ between apps, names don't). */
function nkAttrNames(html: string): string {
  const names = [...html.matchAll(/\s(data-nk-[a-z-]+)(?==|\s|>|\/)/g)].map((m) => m[1]);
  return JSON.stringify(Object.entries(names.reduce<Record<string, number>>((acc, n) => ({ ...acc, [n]: (acc[n] ?? 0) + 1 }), {})).sort());
}

/* ───────────────────────── Test ───────────────────────── */

async function main() {
  const mock = createMock();
  await mock.listen();
  const sink: SmtpSink = await startSmtpSink();
  let inst: Instance | null = null;
  let browser: Browser | null = null;
  try {
    inst = await startInstance({
      port,
      buildDir: ".next-e2e-app-language",
      env: {
        OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
        OPENAI_SCAFFOLD_MODEL: "mock-model",
        OPENAI_EDIT_MODEL: "mock-model",
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(sink.port),
        SMTP_SECURE: "",
        SMTP_USER: "",
        SMTP_FROM: "Platform <noreply@platform.test>",
      },
    });
    const db = inst.db;
    const { ok, checks } = checker();
    const op = await installOperator(inst, "Language Studio");
    const visitor = inst.agent();
    const es = runtimeText("es");
    const ar = runtimeText("ar");
    const en = runtimeText("en");

    /* ── The app's language is stored and shown ─────────────── */

    const tienda = await newApp(op, "Tienda Sol");
    let r = await op.get(`/api/projects/${tienda.id}/locale`);
    ok("a new app is English until a language is chosen", r.status === 200 && r.json.locale === "en" && r.json.explicit === false, r.json);
    r = await op.patch(`/api/projects/${tienda.id}/locale`, { locale: "xx" });
    ok("an unknown language is refused", r.status === 400 && typeof r.json.error === "string", r.json);
    r = await op.patch(`/api/projects/${tienda.id}/locale`, { locale: "es" });
    const stored = await db.setting.findUnique({ where: { key: `locale:${tienda.id}` } });
    ok("choosing Spanish stores it (Setting locale:<id>)", r.status === 200 && r.json.locale === "es" && r.json.explicit === true && (stored?.value as { locale?: string } | null)?.locale === "es", { r: r.json, stored: stored?.value });
    r = await visitor.patch(`/api/projects/${tienda.id}/locale`, { locale: "fr" });
    ok("only the owner can change it", r.status === 401 || r.status === 404, r.status);

    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addCookies([...op.jar].map(([name, value]) => ({ name, value, url: inst!.base })));
    const overview = await ctx.newPage();
    overview.setDefaultTimeout(120_000);
    await overview.goto(`${inst.base}/projects/${tienda.id}`, { waitUntil: "domcontentloaded" });
    const card = overview.getByTestId("app-language-card");
    await card.waitFor();
    ok("the overview shows the App language card with the app's language", (await overview.getByTestId("app-language-select").inputValue()) === "es" && /App language/.test(await card.innerText()));

    /* ── A feature installed into a Spanish app ─────────────── */

    mock.setMode("translate");
    mock.requests.length = 0;
    r = await op.post(`/api/projects/${tienda.id}/modules`, { moduleId: "contact-form" });
    const esPages = await db.page.findMany({ where: { projectId: tienda.id, slug: { startsWith: "contact-form" } }, select: { slug: true, title: true, html: true } });
    const esFlows = await db.flow.findMany({ where: { projectId: tienda.id, slug: { startsWith: "contact-form" } }, select: { slug: true, graph: true } });
    const translateCalls = mock.requests.filter((q) => /You translate/.test(q.system)).length;
    const english = await newApp(op, "Plain Shop");
    await op.post(`/api/projects/${english.id}/modules`, { moduleId: "contact-form" });
    const enPages = await db.page.findMany({ where: { projectId: english.id, slug: { startsWith: "contact-form" } }, select: { slug: true, title: true, html: true } });
    ok("installing into a Spanish app asks the AI once per page, plus once for titles and messages", r.status === 200 && esPages.length > 0 && translateCalls === esPages.length + 1, { status: r.status, pages: esPages.length, translateCalls });
    ok("the installed pages' text and titles are translated", esPages.every((p) => p.html.includes("[es] ") && p.title.startsWith("[es] ")), esPages.map((p) => `${p.title}: ${p.html.slice(0, 160)}`));
    ok(
      "every data-nk-* attribute is kept (same as an English install) and wired to real flows",
      esPages.length === enPages.length && esPages.every((p) => nkAttrNames(p.html) === nkAttrNames(enPages.find((q) => q.slug === p.slug)?.html ?? "")) && esPages.every((p) => !/data-nk-[a-z-]+-ref=/.test(p.html)),
      esPages.map((p) => [p.slug, nkAttrNames(p.html), nkAttrNames(enPages.find((q) => q.slug === p.slug)?.html ?? "")]),
    );
    const responseTexts = JSON.stringify(esFlows.map((f) => f.graph));
    ok("the feature's built-in messages are translated too", /\[es\] /.test(responseTexts), responseTexts.slice(0, 400));
    ok("an English app's install never calls the AI and stays English", enPages.every((p) => !p.html.includes("[es]")) && mock.requests.filter((q) => /You translate/.test(q.system)).length === translateCalls);

    mock.setMode("break");
    mock.requests.length = 0;
    r = await op.post(`/api/projects/${tienda.id}/modules`, { moduleId: "guestbook" });
    const broken = await db.page.findMany({ where: { projectId: tienda.id, slug: { startsWith: "guestbook" } }, select: { slug: true, title: true, html: true } });
    mock.setMode("translate");
    await op.post(`/api/projects/${english.id}/modules`, { moduleId: "guestbook" });
    const plainGuestbook = await db.page.findMany({ where: { projectId: english.id, slug: { startsWith: "guestbook" } }, select: { slug: true, title: true, html: true } });
    ok(
      "a translation that drops a wiring attribute falls back to the English page, still wired",
      r.status === 200 && broken.length > 0 && mock.requests.some((q) => /You translate the visible text/.test(q.system)) &&
        // (The shared menu lists the Spanish contact page's title; the page itself stays English.)
        broken.every((p) => !p.html.replace(/<nav data-nk-nav[\s\S]*?<\/nav>/, "").includes("[es]") && !p.title.startsWith("[es]")) &&
        broken.length === plainGuestbook.length &&
        broken.every((p) => nkAttrNames(p.html) === nkAttrNames(plainGuestbook.find((q) => q.slug === p.slug)?.html ?? "") && !/data-nk-[a-z-]+-ref=/.test(p.html)),
      broken.map((p) => [p.slug, p.title, nkAttrNames(p.html), nkAttrNames(plainGuestbook.find((q) => q.slug === p.slug)?.html ?? "")]),
    );

    /* ── Published apps: lang, dir and the runtime's texts ──── */

    const souk = await newApp(op, "Souk");
    await op.patch(`/api/projects/${souk.id}/locale`, { locale: "ar" });
    await publish(op, souk.id);
    r = await visitor.get(`/app/${souk.slug}`);
    ok("a published Arabic app has <html lang=\"ar\" dir=\"rtl\">", r.status === 200 && /<html[^>]*\slang="ar"[^>]*\sdir="rtl"/.test(r.text), r.text.slice(0, 200));
    ok("window.__nkLocale and the runtime's texts are in Arabic", r.text.includes(`w.__nkLocale={"lang":"ar","dir":"rtl","locales":["ar"],"default":"ar"}`) && r.text.includes(JSON.stringify(ar.nothingHere).slice(1, -1)), r.text.match(/w\.__nkLocale=[^;]*;/)?.[0]);

    await publish(op, english.id);
    r = await visitor.get(`/app/${english.slug}`);
    ok("an English app is as before: lang=\"en\", no dir, no runtime texts", /<html lang="en">/.test(r.text) && !r.text.includes("w.__nkText=") && r.text.includes(`"lang":"en"`), r.text.slice(0, 160));

    /* ── Visitors of a Spanish app ──────────────────────────── */

    const failing = await db.flow.create({
      data: {
        projectId: tienda.id,
        name: "Broken step",
        slug: "broken-step",
        httpPath: "/broken-step",
        graph: {
          nodes: [
            { id: "t", type: "trigger", data: {} },
            { id: "j", type: "custom_js", data: { code: "throw new Error('boom')", output: "x" } },
            { id: "r", type: "response", data: { status: 200, body: '{"ok":true}' } },
          ],
          edges: [{ id: "e1", source: "t", target: "j" }, { id: "e2", source: "j", target: "r" }],
        },
      },
    });
    const home = (await db.page.findFirst({ where: { projectId: tienda.id, isHome: true } }))!;
    await db.page.update({
      where: { id: home.id },
      data: { html: `<section class="container py-5"><h1>Hola</h1><form data-nk-form="" data-nk-flow="${failing.id}"><input name="nombre" required/><button type="submit">Enviar</button><div data-nk-error></div></form><ul data-nk-bind-flow="${failing.id}-none"></ul></section>` },
    });
    await publish(op, tienda.id);
    r = await visitor.post(`/api/run/${failing.id}`, { nombre: "Ana" });
    ok("a failing flow tells visitors of a Spanish app in Spanish", r.status === 500 && r.json?.error === es.visitorError && es.visitorError !== en.visitorError, r.json);

    const site = await ctx.newPage();
    site.setDefaultTimeout(60_000);
    await site.goto(`${inst.base}/app/${tienda.slug}`, { waitUntil: "load" });
    ok("the Spanish page is <html lang=\"es\">", (await site.evaluate(() => [document.documentElement.lang, document.documentElement.dir].join(" "))) === "es ltr");
    const validation = await site.evaluate(() => {
      const form = document.querySelector("form[data-nk-form]") as HTMLFormElement;
      form.reportValidity();
      return (form.querySelector("input[name=nombre]") as HTMLInputElement).validationMessage;
    });
    ok("form validation speaks Spanish", validation === es.fieldRequired, validation);
    await site.fill("input[name=nombre]", "Ana");
    await site.click("button[type=submit]");
    await site.getByText(es.visitorError).first().waitFor();
    ok("the runtime shows the Spanish error on the page", true);
    ok("an empty list says so in Spanish", await site.getByText(es.nothingHere).first().isVisible());

    /* ── An AI build in Spanish ─────────────────────────────── */

    mock.requests.length = 0;
    mock.setPage(`<style>.hero{padding:3rem 0}</style>
<section class="hero"><div class="container"><h1>Pan del día</h1><p>Recién horneado cada mañana.</p></div></section>`);
    const PLAN = {
      project: { name: "Panadería Luna", description: "Pan recién hecho para el barrio." },
      locale: "es",
      theme: "Warm Earth",
      assumptions: ["Los visitantes ven el pan del día."],
      tables: [],
      pages: [{ slug: "home", title: "Inicio", isHome: true, summary: "Portada", requiresAuth: false, requiresRole: null }],
      flows: [],
    };
    r = await op.post("/api/ai/scaffold", { prompt: "Una web para mi panadería", plan: PLAN });
    const run = await waitForRun(op, r.json.runId);
    const builtId: string | undefined = run.result?.projectId;
    const pageReq = mock.requests.find((q) => /page builder|You build ONE page/.test(q.system));
    const built = builtId ? await db.setting.findUnique({ where: { key: `locale:${builtId}` } }) : null;
    const login = builtId ? await db.page.findFirst({ where: { projectId: builtId, slug: "login" }, select: { title: true, html: true } }) : null;
    ok("a build from a Spanish plan finishes", run.status === "success" && Boolean(builtId), { status: run.status, error: run.error });
    ok("the page prompt asks for Spanish content", Boolean(pageReq && /LANGUAGE: This app is in Spanish/.test(pageReq.user)), pageReq?.user.slice(-500));
    ok("the built app is saved as Spanish", (built?.value as { locale?: string } | null)?.locale === "es", built?.value);
    ok("its sign-in pages were installed in Spanish, still wired", Boolean(login && login.html.includes("[es] ") && login.title.startsWith("[es] ") && /data-nk-flow="[^"]+"/.test(login.html)), login?.html.slice(0, 300));

    /* ── Multilingual apps ──────────────────────────────────── */

    mock.setMode("translate");
    const casa = await newApp(op, "Casa Luna");
    const failingCasa = await db.flow.create({
      data: { projectId: casa.id, name: "Broken", slug: "broken", httpPath: "/broken", graph: { nodes: [{ id: "t", type: "trigger", data: {} }, { id: "j", type: "custom_js", data: { code: "throw new Error('boom')" } }, { id: "r", type: "response", data: { status: 200, body: '{"ok":true}' } }], edges: [{ id: "e1", source: "t", target: "j" }, { id: "e2", source: "j", target: "r" }] } },
    });
    const echo = await db.flow.create({
      data: { projectId: casa.id, name: "Echo language", slug: "echo-lang", httpPath: "/echo-lang", graph: { nodes: [{ id: "t", type: "trigger", data: {} }, { id: "r", type: "response", data: { status: 200, body: '{"lang":"{{request.lang}}"}' } }], edges: [{ id: "e1", source: "t", target: "r" }] } },
    });
    r = await op.post(`/api/projects/${casa.id}/modules`, { moduleId: "email-verify" });
    ok("a feature with an email installs into the app", r.status === 200, r.text.slice(0, 200));
    await publish(op, casa.id);

    const waitLanguages = async (id: string) => {
      for (const end = Date.now() + 120_000; Date.now() < end; await sleep(500)) {
        const v = await op.get(`/api/projects/${id}/languages`);
        if (v.status === 200 && !v.json.languages.some((l: { job: { running: boolean } | null }) => l.job?.running)) return v.json;
      }
      throw new Error("translations did not finish");
    };
    r = await op.post(`/api/projects/${casa.id}/languages`, { locale: "es" });
    ok("adding Spanish to an English app starts translating it", r.status === 200 && r.json.locales.join() === "en,es", r.json);
    await waitLanguages(casa.id);
    r = await op.post(`/api/projects/${casa.id}/languages`, { locale: "ar" });
    const view = await waitLanguages(casa.id);
    ok("every page is translated into Spanish and Arabic", view.locales.join() === "en,es,ar" && view.languages.every((l: { ok: number; missing: number; stale: number }) => l.ok === view.pages.length && l.missing === 0 && l.stale === 0), view.languages);
    const casaPages = await db.page.findMany({ where: { projectId: casa.id }, select: { id: true, slug: true, title: true, html: true, isHome: true } });
    const casaTr = await db.pageTranslation.findMany({ where: { page: { projectId: casa.id } }, select: { pageId: true, locale: true, title: true, html: true } });
    const noNav = (h: string) => h.replace(/<nav\b[^>]*data-nk-nav[\s\S]*?<\/nav>/, "");
    ok(
      "each translation keeps every data-nk-* attribute of its page",
      casaTr.length === casaPages.length * 2 && casaTr.every((t) => nkAttrNames(noNav(t.html)) === nkAttrNames(noNav(casaPages.find((p) => p.id === t.pageId)!.html))),
      casaTr.map((t) => t.locale + ":" + casaPages.find((p) => p.id === t.pageId)?.slug),
    );
    const casaHome = casaPages.find((p) => p.isHome)!;
    const esHome = casaTr.find((t) => t.pageId === casaHome.id && t.locale === "es")!;
    ok("each language's menu has the switcher and its own page titles", casaHome.html.includes("data-nk-lang-switcher") && esHome.html.includes("data-nk-lang-switcher") && /\[es\] Profile/.test(esHome.html) && !/\[es\] Profile/.test(casaHome.html), esHome.html.slice(0, 600));
    const auth = await db.dataTable.findFirst({ where: { name: "auth_users", datasource: { projectId: casa.id } }, select: { schema: true } });
    ok("members' language gets a column, filled in at sign-up", JSON.stringify(auth?.schema).includes('"locale"') && JSON.stringify((await db.flow.findFirst({ where: { projectId: casa.id, slug: "register" } }))?.graph).includes("{{request.lang}}"));
    const sendCode = await db.flow.findFirst({ where: { projectId: casa.id, slug: "email-verify-send-code" }, select: { id: true, graph: true } });
    ok("the feature's email got a version in each language", /"subject_i18n":\{[^}]*"es":"\[es\] /.test(JSON.stringify(sendCode?.graph)) && /"ar":"\[ar\] /.test(JSON.stringify(sendCode?.graph)), JSON.stringify(sendCode?.graph).slice(0, 600));

    r = await visitor.get(`/app/${casa.slug}/es`);
    ok("a new language isn't live before the app is published again", r.status === 404, r.status);
    await publish(op, casa.id);
    const live = (await db.deployment.findFirst({ where: { projectId: casa.id }, orderBy: { version: "desc" }, select: { snapshot: true } }))!.snapshot as { locales?: string[]; translations?: unknown[] };
    ok("publishing freezes the languages and translations", live.locales?.join() === "en,es,ar" && live.translations?.length === casaTr.length, { locales: live.locales, n: live.translations?.length });

    r = await visitor.get(`/app/${casa.slug}/es`);
    ok("/es is the Spanish home page with <html lang=\"es\">", r.status === 200 && /<html[^>]*\slang="es"[^>]*\sdir="ltr"/.test(r.text) && r.text.includes("[es] "), r.text.slice(0, 200));
    ok("its links stay in Spanish", r.text.includes(`href="/app/${casa.slug}/es/profile"`) && r.text.includes(`href="/app/${casa.slug}/es/"`), r.text.match(/href="\/app\/[^"]+"/g)?.slice(0, 6));
    ok("the page knows its languages and has a switcher", r.text.includes(`"lang":"es","dir":"ltr","locales":["en","es","ar"],"default":"en"`) && r.text.includes("data-nk-lang-switcher"));
    ok("hreflang alternates for every language", /hreflang="ar"[^>]*href="[^"]*\/app\/[^"]+\/ar"/i.test(r.text) && /hreflang="x-default"/i.test(r.text) && /hreflang="en"/i.test(r.text), r.text.match(/<link[^>]*hreflang[^>]*>/gi));
    r = await visitor.get(`/app/${casa.slug}/ar/login`);
    ok("/ar/login is the Arabic sign-in page, right to left", r.status === 200 && /<html[^>]*\slang="ar"[^>]*\sdir="rtl"/.test(r.text) && r.text.includes("[ar] "), r.text.slice(0, 200));
    r = await visitor.get(`/app/${casa.slug}`);
    ok("without a language in the address, a visitor with no preference gets the default", r.status === 200 && /<html lang="en" dir="ltr"/.test(r.text), r.status);
    r = await inst.agent().get(`/app/${casa.slug}/profile`, { "accept-language": "es-MX,es;q=0.9,en;q=0.5" });
    ok("the browser's language picks Spanish (Accept-Language)", r.status === 307 && r.headers.location === `/app/${casa.slug}/es/profile`, `${r.status} ${r.headers.location}`);
    const chooser = inst.agent();
    chooser.jar.set("nk-app-lang", "ar");
    r = await chooser.get(`/app/${casa.slug}`, { "accept-language": "es" });
    ok("an earlier choice (nk-app-lang cookie) wins over the browser's language", r.status === 307 && r.headers.location === `/app/${casa.slug}/ar`, `${r.status} ${r.headers.location}`);
    // Served on the app's primary address (the platform's, here).
    r = await inst.agent(`localhost:${port}`).get(`/app/${casa.slug}/sitemap.xml`);
    ok("the sitemap lists each language with hreflang alternates", r.text.includes(`/app/${casa.slug}/es</loc>`) && r.text.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"') && /<xhtml:link rel="alternate" hreflang="ar"/.test(r.text), r.text.slice(0, 600));

    await db.pageTranslation.update({ where: { pageId_locale: { pageId: casaHome.id, locale: "es" } }, data: { html: esHome.html.replace(/\[es\] /g, "[es-v2] ") } });
    r = await visitor.get(`/app/${casa.slug}/es`);
    const before = r.text.includes("[es-v2]");
    await publish(op, casa.id);
    r = await visitor.get(`/app/${casa.slug}/es`);
    ok("visitors keep the published translation until the next publish", !before && r.text.includes("[es-v2]"));

    r = await visitor.post(`/api/run/${echo.id}`, {}, { "x-nk-lang": "ar" });
    const echoAr = r.json?.lang;
    r = await visitor.post(`/api/run/${echo.id}`, {}, { "x-nk-lang": "xx" });
    ok("flows know the visitor's language ({{request.lang}}, x-nk-lang)", echoAr === "ar" && r.json?.lang === "en", { echoAr, other: r.json });
    r = await visitor.post(`/api/run/${failingCasa.id}`, {}, { "x-nk-lang": "ar" });
    ok("the platform's own errors come in the visitor's language", r.status === 500 && r.json?.error === ar.visitorError, r.json);
    const loginFlow = (await db.flow.findFirst({ where: { projectId: casa.id, slug: "login" }, select: { id: true } }))!;
    r = await visitor.post(`/api/run/${loginFlow.id}`, { email: "nobody@casa.test", password: "wrong-password" }, { "x-nk-lang": "es" });
    const esLogin = r.json?.error;
    r = await visitor.post(`/api/run/${loginFlow.id}`, { email: "nobody@casa.test", password: "wrong-password" });
    ok("a feature's built-in message comes in the visitor's language", r.status === 401 && typeof esLogin === "string" && esLogin.startsWith("[es] ") && r.json?.error === "Invalid email or password", { esLogin, en: r.json });

    const registerFlow = (await db.flow.findFirst({ where: { projectId: casa.id, slug: "register" }, select: { id: true } }))!;
    r = await inst.agent().post(`/api/run/${registerFlow.id}`, { name: "Lucía", email: "lucia@casa.test", password: "lucia-password-2026" }, { "x-nk-lang": "es" });
    ok("a visitor signing up in Spanish is saved as Spanish", r.status === 200, r.text.slice(0, 200));
    sink.messages.length = 0;
    r = await visitor.post(`/api/run/${sendCode!.id}`, { email: "lucia@casa.test" }, { "x-nk-lang": "ar" });
    const mails = await sink.waitFor(1, 20_000).catch(() => sink.messages);
    ok("the feature's email goes out in the recipient's saved language (not the visitor's)", r.status === 200 && mails.length === 1 && mails[0].subject.startsWith("[es] "), { status: r.status, subjects: mails.map((m) => m.subject) });
    ok("…and its reply in the visitor's language", typeof r.json?.message === "string" && r.json.message.startsWith("[ar] "), r.json);
    sink.messages.length = 0;
    await visitor.post(`/api/run/${sendCode!.id}`, { email: "someone-new@casa.test" }, { "x-nk-lang": "ar" });
    const mails2 = await sink.waitFor(1, 20_000).catch(() => sink.messages);
    ok("an email to someone without an account follows the visitor's language", mails2.length === 1 && mails2[0].subject.startsWith("[ar] "), mails2.map((m) => m.subject));

    const browse = await browser!.newContext({ viewport: { width: 1280, height: 900 } });
    await browse.addInitScript(() => document.addEventListener("nk-locale-change", (e) => sessionStorage.setItem("nk-change", (e as CustomEvent<{ lang: string }>).detail.lang)));
    const tab = await browse.newPage();
    tab.setDefaultTimeout(60_000);
    await tab.goto(`${inst.base}/app/${casa.slug}`, { waitUntil: "load" });
    await tab.locator("[data-nk-lang-select]").first().selectOption("es");
    await tab.waitForURL(`**/app/${casa.slug}/es`);
    const fired = await tab.evaluate(() => sessionStorage.getItem("nk-change"));
    const langCookie = (await browse.cookies()).find((c) => c.name === "nk-app-lang");
    ok("the menu's language switcher goes to the Spanish page, remembers it and fires nk-locale-change", fired === "es" && langCookie?.value === "es" && langCookie.path === `/app/${casa.slug}` && (await tab.evaluate(() => document.documentElement.lang)) === "es", { fired, langCookie });
    await tab.locator("[data-nk-lang-select]").first().selectOption("en");
    await tab.waitForURL((u) => u.pathname === `/app/${casa.slug}`);
    ok("…and back to the default language, which then stays (no redirect)", (await tab.evaluate(() => document.documentElement.lang)) === "en");

    const editor = await ctx.newPage();
    editor.setDefaultTimeout(120_000);
    await editor.goto(`${inst.base}/projects/${casa.id}/pages/${casaHome.id}/edit?lang=ar`, { waitUntil: "domcontentloaded" });
    const tabs = editor.getByTestId("editor-language-tabs");
    await tabs.waitFor();
    ok("the editor shows language tabs, the Arabic one open", (await tabs.getByRole("button", { pressed: true }).innerText()).includes("العربية"));
    r = await op.patch(`/api/projects/${casa.id}/pages/${casaHome.id}/translations/ar`, { html: "<section><h1>مرحبا</h1></section>" });
    const arState = await op.get(`/api/projects/${casa.id}/pages/${casaHome.id}/translations/ar`);
    ok("saving a language tab keeps the owner's wording (edited, not overwritten)", r.status === 200 && arState.json.page.html.includes("مرحبا") && (await db.pageTranslation.findUnique({ where: { pageId_locale: { pageId: casaHome.id, locale: "ar" } } }))?.origin === "edited", arState.json.page);

    // The same on the app's own domain (last: once it has served the app,
    // /app/<slug> addresses move there).
    const DOMAIN = "casa-luna.test";
    await db.domain.create({ data: { projectId: casa.id, host: DOMAIN, status: "ACTIVE", verifyToken: "e2e-casa", verifiedAt: new Date() } });
    const onDomain = inst.agent(DOMAIN);
    r = await onDomain.get("/es");
    const esOnDomain = r.status === 200 && /<html[^>]*\slang="es"/.test(r.text) && r.text.includes(`href="/es/profile"`);
    r = await onDomain.get("/ar/login");
    const arOnDomain = r.status === 200 && /<html[^>]*\slang="ar"[^>]*\sdir="rtl"/.test(r.text);
    r = await onDomain.get("/", { "accept-language": "ar" });
    ok("on the app's own domain too: /es, /ar/login, and the visitor's language", esOnDomain && arOnDomain && r.status === 307 && r.headers.location === "/ar", { esOnDomain, arOnDomain, status: r.status, location: r.headers.location });

    console.log(`\n${checks.length} checks passed`);
  } catch (err) {
    console.error(err);
    if (inst) console.error(inst.log().slice(-6000));
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    await inst?.stop();
    await mock.close().catch(() => {});
    await sink.close().catch(() => {});
  }
}

void main();
