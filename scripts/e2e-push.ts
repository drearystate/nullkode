/**
 * End-to-end test of push notifications against a mock push service. Fake
 * browser subscriptions (whose keys the test owns) point at a local server;
 * the test decrypts what arrives (RFC 8291 / aes128gcm) and checks the VAPID
 * header, the content, pruning of dead subscriptions, the admin-only
 * subscriber list, and the send_push flow step.
 *
 *   node_modules/.bin/tsx scripts/e2e-push.ts
 */
import http from "node:http";
import https from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDecipheriv, createECDH, hkdfSync, randomBytes } from "node:crypto";
import { startInstance, installOperator, checker } from "./e2e-harness";

type Received = { path: string; headers: http.IncomingHttpHeaders; body: Buffer };

function fakeSubscription(endpoint: string) {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return {
    json: { endpoint, keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: auth.toString("base64url") } },
    decrypt(body: Buffer): string {
      const salt = body.subarray(0, 16);
      const idlen = body[20];
      const senderPublic = body.subarray(21, 21 + idlen);
      const ciphertext = body.subarray(21 + idlen);
      const shared = ecdh.computeSecret(senderPublic);
      const info = Buffer.concat([Buffer.from("WebPush: info\0"), ecdh.getPublicKey(), senderPublic]);
      const ikm = Buffer.from(hkdfSync("sha256", shared, auth, info, 32));
      const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
      const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
      const d = createDecipheriv("aes-128-gcm", cek, nonce);
      d.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
      const plain = Buffer.concat([d.update(ciphertext.subarray(0, ciphertext.length - 16)), d.final()]);
      // Strip the padding delimiter (0x02) and any padding.
      return plain.subarray(0, plain.lastIndexOf(2)).toString("utf8");
    },
  };
}

async function main() {
  const received: Received[] = [];
  // Push services are HTTPS-only; a throwaway self-signed certificate is
  // trusted just for this test's server process.
  const certDir = mkdtempSync(join(tmpdir(), "nk-push-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(certDir, "key.pem"), "-out", join(certDir, "cert.pem"), "-days", "1", "-subj", "/CN=127.0.0.1"], { stdio: "pipe" });
  const mock = https.createServer({ key: readFileSync(join(certDir, "key.pem")), cert: readFileSync(join(certDir, "cert.pem")) }, async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    received.push({ path: req.url ?? "", headers: req.headers, body: Buffer.concat(chunks) });
    res.writeHead(req.url?.includes("gone") ? 410 : 201).end();
  });
  await new Promise<void>((r) => mock.listen(0, "127.0.0.1", () => r()));
  const mockPort = (mock.address() as { port: number }).port;

  const inst = await startInstance({ port: Number(process.env.E2E_PORT || 3128), buildDir: ".next-e2e-push", env: { NK_PUSH_ALLOW_PRIVATE: "1", NODE_TLS_REJECT_UNAUTHORIZED: "0" } });
  const { ok, checks } = checker();
  try {
    const op = await installOperator(inst);
    let r = await op.post("/api/projects", { name: "Corner Cafe" });
    const projectId = r.json.project?.id ?? r.json.id;
    r = await op.post(`/api/projects/${projectId}/modules`, { moduleId: "push-notifications" });
    ok("push feature installs", r.status === 200, r.json);
    r = await op.post(`/api/projects/${projectId}/publish`);
    const project = await inst.db.project.findUnique({ where: { id: projectId } });
    const flows = await inst.db.flow.findMany({ where: { projectId } });
    const subscribeFlow = flows.find((f) => f.slug.endsWith("subscribe"))!;
    const listFlow = flows.find((f) => f.slug.endsWith("list"))!;

    r = await inst.agent().get("/api/push/vapid");
    ok("a VAPID key is created automatically", typeof r.json?.publicKey === "string" && r.json.publicKey.length > 80, r.json);

    const good = fakeSubscription(`https://127.0.0.1:${mockPort}/push/ok`);
    const gone = fakeSubscription(`https://127.0.0.1:${mockPort}/push/gone`);
    const visitor = inst.agent();
    for (const s of [good, gone]) {
      r = await visitor.post(`/api/run/${subscribeFlow.id}`, { subscription: JSON.stringify(s.json), user_agent: "e2e" });
      ok("a visitor subscribes", r.status === 200, r.json);
    }
    r = await visitor.post(`/api/run/${listFlow.id}`, {});
    ok("the subscriber list is admins-only", r.status === 401 || r.status === 403, r.json);

    r = await op.get(`/projects/${projectId}/notifications`);
    ok("owner's Notifications screen shows 2 subscribers", r.status === 200 && />2<\/p>/.test(r.text), r.status);

    r = await op.post(`/api/projects/${projectId}/push`, { title: "Live music tonight", body: "From 7pm. Book a table!", url: "/menu" });
    ok("sending reports 1 delivered and 1 dead subscription removed", r.status === 200 && r.json?.sent === 1 && r.json?.removed === 1, r.json);
    const hit = received.find((x) => x.path === "/push/ok")!;
    ok("the push service receives an encrypted message", hit && hit.headers["content-encoding"] === "aes128gcm", hit?.headers);
    ok("the message is signed with this server's VAPID key", String(hit.headers.authorization).startsWith("vapid t="), hit.headers.authorization);
    const message = JSON.parse(good.decrypt(hit.body));
    ok("the decrypted message has the title and text", message.title === "Live music tonight" && message.body === "From 7pm. Book a table!", message);
    ok("tapping opens the right page of the live app", message.url === `http://localhost:${inst.base.split(":").pop()}/app/${project!.slug}/menu`, message.url);
    ok("the notification uses the app's own icon", String(message.icon).includes(`/api/app-icon/${projectId}`), message.icon);

    r = await op.get(`/projects/${projectId}/notifications`);
    ok("the dead subscription is gone and the send is in the history", />1<\/p>/.test(r.text) && r.text.includes("Live music tonight"), r.status);

    r = await inst.agent().post(`/api/projects/${projectId}/push`, { title: "spam" });
    ok("only the owner can send", r.status === 401 || r.status === 404, r.status);

    // A workflow step can send too.
    r = await op.post(`/api/projects/${projectId}/flows`, { name: "Announce" });
    const flowId = r.json.flow?.id ?? r.json.id;
    await op.patch(`/api/projects/${projectId}/flows/${flowId}`, {
      graph: {
        nodes: [
          { id: "t", type: "trigger", position: { x: 0, y: 0 }, data: {} },
          { id: "p", type: "send_push", position: { x: 200, y: 0 }, data: { title: "New: {{trigger.dish}}", body: "Only today.", url: "/menu" } },
          { id: "r", type: "response", position: { x: 400, y: 0 }, data: { status: 200, body: "{{vars.push}}" } },
        ],
        edges: [{ id: "e1", source: "t", target: "p", sourceHandle: null }, { id: "e2", source: "p", target: "r", sourceHandle: null }],
      },
    });
    const before = received.length;
    r = await op.post(`/api/run/${flowId}`, { dish: "Lemon tart" }, { referer: `${inst.base}/projects/${projectId}/flows/${flowId}` });
    ok("the send_push flow step delivers", r.status === 200 && r.json?.sent === 1, r.json);
    const flowHit = received.slice(before).find((x) => x.path === "/push/ok")!;
    ok("the flow step fills in values from the trigger", JSON.parse(good.decrypt(flowHit.body)).title === "New: Lemon tart");

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-60).join("\n"));
    process.exitCode = 1;
  } finally {
    mock.close();
    await inst.stop();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

main();
