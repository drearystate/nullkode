/**
 * End-to-end test of safe publishing: visitors see the published version of
 * pages, theme and flows; edits stay in draft until the next publish; any
 * earlier version can be made live again; builder runs use the draft.
 *
 *   node_modules/.bin/tsx scripts/e2e-publishing.ts
 */
import { startInstance, installOperator, checker } from "./e2e-harness";

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
