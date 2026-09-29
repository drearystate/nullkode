/**
 * End-to-end test of safe publishing: visitors see the published version of
 * pages, theme and flows; edits stay in draft until the next publish; any
 * earlier version can be made live again; builder runs use the draft.
 * AI Designer pages (whole HTML documents) are split into head and body.
 *
 *   node_modules/.bin/tsx scripts/e2e-publishing.ts
 */
import { chromium } from "playwright";
import { startInstance, installOperator, checker } from "./e2e-harness";

/** A page as the AI Designer writes it: a complete document. */
const DESIGNER_DOC = `<!doctype html>
<html lang="fr" class="nk-test-root">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Boulangerie Soleil</title>
<meta name="description" content="Du pain chaud tous les matins, a commander en ligne.">
<style>body{display:flex;flex-direction:column;gap:24px}.hero{padding:40px}</style>
<script>window.__designerHeadRan = true;</script>
</head>
<body class="nk-test-body">
<header class="hero"><h1>Boulangerie Soleil</h1></header>
<main class="menu"><p>Du pain chaud tous les matins.</p></main>
</body>
</html>`;

const flowGraph = (text: string) => ({
  nodes: [
    { id: "t", type: "trigger", position: { x: 0, y: 0 }, data: {} },
    { id: "r", type: "response", position: { x: 200, y: 0 }, data: { status: 200, body: JSON.stringify({ says: text }) } },
  ],
  edges: [{ id: "e", source: "t", target: "r", sourceHandle: null }],
});

async function main() {
  const inst = await startInstance({ port: Number(process.env.E2E_PORT || 3127), buildDir: ".next-e2e-publishing" });
  const { ok, checks } = checker();
  try {
    const op = await installOperator(inst);
    const visitor = inst.agent();

    let r = await op.post("/api/projects", { name: "Cafe" });
    const projectId = r.json.project?.id ?? r.json.id;
    const project = await inst.db.project.findUnique({ where: { id: projectId } });
    const home = await inst.db.page.findFirst({ where: { projectId, isHome: true } });
    const setHome = (text: string) => op.patch(`/api/projects/${projectId}/pages/${home!.id}`, { html: `<section><h1>${text}</h1><p>Fresh bread daily.</p></section>`, css: "" });
    r = await op.post(`/api/projects/${projectId}/flows`, { name: "Greeting" });
    const flowId = r.json.flow?.id ?? r.json.id;
    await op.patch(`/api/projects/${projectId}/flows/${flowId}`, { graph: flowGraph("hello v1") });
    await op.patch(`/api/projects/${projectId}`, { theme: { primary: "#111111" } });

    // v1
    await setHome("Version one");
    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("first publish creates v1", r.status === 200 && r.json?.version === 1, r.json);
    r = await visitor.get(`/app/${project!.slug}`);
    ok("visitors see v1", r.text.includes("Version one"));

    // Draft edits don't leak.
    await setHome("Version two");
    await op.patch(`/api/projects/${projectId}/flows/${flowId}`, { graph: flowGraph("hello v2") });
    await op.patch(`/api/projects/${projectId}`, { theme: { primary: "#222222" } });
    r = await visitor.get(`/app/${project!.slug}`);
    ok("draft page edits stay private until publishing", r.text.includes("Version one") && !r.text.includes("Version two"));
    r = await visitor.get(`/api/projects/${projectId}/theme.css?live=1`);
    ok("published theme stays until publishing", r.text.includes("#111111") && !r.text.includes("#222222"), r.text.slice(0, 200));
    r = await visitor.post(`/api/run/${flowId}`, {});
    ok("published pages and webhooks run the published flow", r.json?.says === "hello v1", r.json);
    r = await op.post(`/api/run/${flowId}`, {}, { referer: `${inst.base}/projects/${projectId}/flows/${flowId}` });
    ok("the builder runs the draft flow", r.json?.says === "hello v2", r.json);
    r = await visitor.post(`/api/run/${flowId}`, {}, { referer: `http://some-customer-site.test/projects` });
    ok("a published page named 'projects' on its own domain still runs the live flow", r.json?.says === "hello v1", r.json);
    r = await visitor.post(`/api/run/${flowId}`, {}, { referer: `${inst.base}/projects/${projectId}/flows/${flowId}` });
    ok("a stranger can't force the draft by faking a builder Referer", r.json?.says === "hello v1", r.json);
    r = await op.get(`/projects/${projectId}/publish`);
    ok("publish screen shows unpublished changes", r.text.includes("unpublished changes") && r.text.includes("Publish changes"), r.status);

    // v2
    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("publishing again creates v2", r.json?.version === 2, r.json);
    r = await visitor.get(`/app/${project!.slug}`);
    ok("visitors see v2 after publishing", r.text.includes("Version two"));
    r = await visitor.post(`/api/run/${flowId}`, {});
    ok("the published flow updates with it", r.json?.says === "hello v2", r.json);
    r = await op.get(`/projects/${projectId}/publish`);
    ok("publish screen says up to date", r.text.includes("up to date") && r.text.includes("Up to date"), r.status);

    // Rollback to v1.
    const v1 = await inst.db.deployment.findFirst({ where: { projectId, version: 1 } });
    r = await op.post(`/api/projects/${projectId}/deployments/${v1!.id}`);
    ok("an earlier version can be made live", r.status === 200 && r.json?.version === 1, r.json);
    r = await visitor.get(`/app/${project!.slug}`);
    ok("visitors see v1 again after rollback", r.text.includes("Version one") && !r.text.includes("Version two"));
    r = await visitor.post(`/api/run/${flowId}`, {});
    ok("rollback also restores the published flow", r.json?.says === "hello v1", r.json);
    const draft = await inst.db.page.findUnique({ where: { id: home!.id } });
    ok("rollback doesn't touch the draft", draft?.html.includes("Version two"));
    const stranger = inst.agent();
    r = await stranger.post(`/api/projects/${projectId}/deployments/${v1!.id}`);
    ok("only the owner can roll back", r.status === 401 || r.status === 404, r.status);

    // An app that was never published runs its flows only for its owner.
    r = await op.post("/api/projects", { name: "Unreleased" });
    const unreleasedId = r.json.project?.id ?? r.json.id;
    r = await op.post(`/api/projects/${unreleasedId}/flows`, { name: "Secret" });
    const secretFlow = r.json.flow?.id ?? r.json.id;
    await op.patch(`/api/projects/${unreleasedId}/flows/${secretFlow}`, { graph: flowGraph("not yet") });
    r = await visitor.post(`/api/run/${secretFlow}`, {}, { referer: `${inst.base}/projects/${unreleasedId}` });
    ok("an unpublished app's flows don't run for strangers", r.status === 404, r.status);
    r = await op.post(`/api/run/${secretFlow}`, {}, { referer: `${inst.base}/projects/${unreleasedId}/flows/${secretFlow}` });
    ok("the owner can still test them in the builder", r.json?.says === "not yet", r.json);

    // Legacy apps (published before safe publishing) keep serving saved pages.
    r = await op.post("/api/projects", { name: "Legacy" });
    const legacyId = r.json.project?.id ?? r.json.id;
    const legacy = await inst.db.project.update({ where: { id: legacyId }, data: { published: true } });
    const legacyHome = await inst.db.page.findFirst({ where: { projectId: legacyId, isHome: true } });
    await inst.db.page.update({ where: { id: legacyHome!.id }, data: { html: "<section><h1>Legacy live edit</h1></section>" } });
    r = await visitor.get(`/app/${legacy.slug}`);
    ok("apps published before safe publishing keep working unchanged", r.text.includes("Legacy live edit"));

    // Page-builder pages render exactly as stored: no wrapper style, no changes.
    r = await visitor.get(`/app/${project!.slug}`);
    ok("page-builder pages are rendered byte for byte", r.text.includes(`<div><section><h1>Version one</h1><p>Fresh bread daily.</p></section></div>`), r.text.slice(0, 300));

    // AI Designer apps: a whole HTML document is split into metadata, head and body.
    r = await op.post("/api/projects", { name: "Designer Doc" });
    const docId = r.json.project?.id ?? r.json.id;
    const docProject = await inst.db.project.update({ where: { id: docId }, data: { kind: "DESIGNER" } });
    const docHome = await inst.db.page.findFirst({ where: { projectId: docId, isHome: true } });
    await inst.db.page.update({ where: { id: docHome!.id }, data: { html: DESIGNER_DOC, css: "" } });
    r = await op.post(`/api/projects/${docId}/publish`);
    ok("a Designer app publishes", r.status === 200, r.json);
    r = await visitor.get(`/app/${docProject.slug}`);
    const count = (re: RegExp) => (r.text.match(re) ?? []).length;
    ok("the Designer's own <title> is the page title", count(/<title>Boulangerie Soleil<\/title>/g) === 1 && count(/<title>/g) === 1, r.text.slice(0, 600));
    ok("its meta description is used", r.text.includes(`<meta name="description" content="Du pain chaud tous les matins, a commander en ligne."/>`));
    // Tags only: scripts (the runtime's comments mention <html>) are left out.
    const markup = r.text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    const tags = (re: RegExp) => (markup.match(re) ?? []).length;
    ok("no second document inside the page", tags(/<html[\s>]/gi) === 1 && tags(/<head[\s>]/gi) === 1 && tags(/<body[\s>]/gi) === 1 && tags(/<!doctype/gi) === 1,
      { html: tags(/<html[\s>]/gi), head: tags(/<head[\s>]/gi), body: tags(/<body[\s>]/gi), doctype: tags(/<!doctype/gi) });
    ok("its head styles and scripts still arrive, before its body", r.text.indexOf("gap:24px") > 0 && r.text.indexOf("__designerHeadRan") > 0 && r.text.indexOf("__designerHeadRan") < r.text.indexOf("<header class=\"hero\">"));
    ok("the wrapper stays out of its layout", r.text.includes(`<div style="display:contents">`));
    r = await op.get(`/preview/${docId}`);
    const previewTags = (r.text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").match(/<(html|body)[\s>]/gi) ?? []).length;
    ok("the preview splits it the same way", r.status === 200 && r.text.includes("<title>Boulangerie Soleil — Preview</title>") && r.text.includes('lang="fr"') && previewTags === 2, { status: r.status, previewTags });

    // In a real browser: the DOM has one document, with the Designer's title,
    // language and body styling, and its flex layout reaches the sections.
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(`${inst.base}/app/${docProject.slug}`, { waitUntil: "load" });
      const dom = await page.evaluate(() => {
        const main = document.querySelector("main.menu") as HTMLElement | null;
        const wrapper = main?.parentElement ?? null;
        return {
          title: document.title,
          lang: document.documentElement.lang,
          rootClass: document.documentElement.className,
          bodyClass: document.body.className,
          htmlCount: document.getElementsByTagName("html").length,
          bodyCount: document.getElementsByTagName("body").length,
          headRan: (window as unknown as { __designerHeadRan?: boolean }).__designerHeadRan === true,
          wrapperDisplay: wrapper ? getComputedStyle(wrapper).display : null,
          bodyDisplay: getComputedStyle(document.body).display,
          // With display:contents on the wrapper, the sections are laid out by
          // body's flexbox: the 24px gap sits between header and main.
          gap: (() => {
            const header = document.querySelector("header.hero") as HTMLElement | null;
            return header && main ? Math.round(main.getBoundingClientRect().top - header.getBoundingClientRect().bottom) : null;
          })(),
        };
      });
      ok("the browser sees the Designer's title", dom.title === "Boulangerie Soleil", dom);
      ok("the page language is the Designer's", dom.lang === "fr", dom);
      ok("the Designer's <html> and <body> classes apply", dom.rootClass.includes("nk-test-root") && dom.bodyClass.includes("nk-test-body"), dom);
      ok("one document in the DOM", dom.htmlCount === 1 && dom.bodyCount === 1, dom);
      ok("its head script ran", dom.headRan, dom);
      ok("body flex layout reaches the sections", dom.wrapperDisplay === "contents" && dom.bodyDisplay === "flex" && dom.gap === 24, dom);
      ok("no script errors", errors.length === 0, errors);
    } finally {
      await browser.close();
    }

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
