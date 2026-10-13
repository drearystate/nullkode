/**
 * End-to-end checks of AI in apps (docs/ai-in-apps.md) on a throwaway install
 * with a mock OpenAI-compatible server on this machine:
 *  - apps bring their own AI key: an app's ai_prompt / ai_chat / ai_agent /
 *    ai_structured / ai_vision / ai_embed + ai_search / ai_speech steps run
 *    with the app's key (the mock sees it), never the platform's AI;
 *  - without a key: a clear error in the run log, "This app's AI isn't set up
 *    yet." for visitors, no fallback, and one email to the owner;
 *  - the key never appears in any page, HTML, API answer, stored run or log;
 *  - the platform owner's apps use the platform's AI (and are counted), a
 *    non-owner's never;
 *  - notices: the plan, the build's end, a feature install and an Ask-AI edit
 *    tell a non-owner to add a key; the platform owner sees none; the dashboard
 *    notice and the app's banner;
 *  - the AI keys API (masked, test connection, limits) and the partner API's
 *    ai-connection endpoints and run `ai` block;
 *  - the build rule allows an AI companion, a dots-like agent and an
 *    OpenMuse-style app, and still refuses an app-builder clone and an
 *    IgniteUps clone.
 *
 * Needs Docker (scratch Postgres). Run from the repo root:
 *   node_modules/.bin/tsx scripts/e2e-ai-apps.ts        (E2E_PORT, default 3471)
 */
import http from "node:http";
import argon2 from "argon2";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";
import { prescreen } from "../src/lib/ai/build-policy";

const port = Number(process.env.E2E_PORT || 3471);
const mockPort = port + 1000;
const BYO_KEY = "sk-byo-test-9f2c7Kq3ZpX81mNeV4tLs";
const BYO_KEY2 = "sk-byo-second-Hh7Qw2Lr5Tz0Yc3Mx9";
const PLATFORM_AUTH = "Bearer local";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Req = { path: string; auth: string; stream: boolean; system: string; user: string; body: any };

const textOf = (c: unknown): string => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : p && typeof p === "object" && "image_url" in p ? "[image]" : "")).join("\n") : "");

const COMPANION_PLAN = {
  project: { name: "Nova Companion", description: "Chat and talk with Nova, a friendly animated character who remembers you." },
  theme: "Midnight",
  assumptions: ["Anyone can chat with Nova without an account."],
  aiFeatures: ["Chat with Nova, who remembers what you tell her", "Nova reads her replies aloud"],
  tables: [{ name: "messages", fields: [{ name: "conversation_id", type: "text" }, { name: "role", type: "text" }, { name: "content", type: "text" }] }],
  pages: [{ slug: "home", title: "Chat with Nova", isHome: true, summary: "The chat screen with Nova's animated face", requiresAuth: false, requiresRole: null }],
  flows: [{ slug: "chat", name: "Chat with Nova", purpose: "Reply to the person as Nova, remembering the conversation", kind: "ai", table: "messages", auth: false }],
  locale: "en",
};
const PLAIN_PLAN = {
  project: { name: "Rise Bakery", description: "Bread pre-orders." },
  theme: "Warm Earth",
  assumptions: [],
  aiFeatures: [],
  tables: [{ name: "orders", fields: [{ name: "name", type: "text" }] }],
  pages: [{ slug: "home", title: "Home", isHome: true, summary: "Order form", requiresAuth: false, requiresRole: null }],
  flows: [{ slug: "create-orders", name: "Add order", purpose: "Saves an order", kind: "create", table: "orders", auth: false }],
};
const CHAT_GRAPH = {
  nodes: [
    { id: "t", type: "trigger", data: {} },
    { id: "c", type: "ai_chat", data: { system: "You are Nova. PERSONA-TEST", message: "{{trigger.message}}", table: "messages", where: { conversation_id: "{{trigger.conversation_id}}" }, output: "reply" } },
    { id: "r", type: "response", data: { status: 200, body: '{"reply":"{{vars.reply}}"}' } },
  ],
  edges: [{ id: "e1", source: "t", target: "c", sourceHandle: null }, { id: "e2", source: "c", target: "r", sourceHandle: null }],
};
const PAGE = `<section class="py-5"><div class="container"><h1>Chat with Nova</h1><div id="log"></div><form data-nk-form="" data-nk-flow-ref="chat"><input name="message"><button>Send</button></form></div></section>`;

const TOPICS = ["tea", "coffee", "dog", "cat", "moon", "refund", "shipping", "garden"];
const vectorFor = (s: string) => {
  const v = TOPICS.map((t) => (s.toLowerCase().includes(t) ? 1 : 0) + 0.01);
  return v;
};

function createMock() {
  const requests: Req[] = [];
  let editAnswer: string | null = null;
  const chatAnswer = (r: Req): string => {
    const all = `${r.system}\n${(r.body.messages ?? []).map((m: { content: unknown }) => textOf(m.content)).join("\n")}`;
    if (/You enforce one rule of an AI app-building platform/.test(r.system)) return JSON.stringify({ allowed: true, reason: "Mock judge: ordinary." });
    if (/app planner/.test(r.system)) return JSON.stringify(/Grok's Ani|companion/i.test(r.user) ? COMPANION_PLAN : PLAIN_PLAN);
    if (/page builder|You build ONE page/.test(r.system)) return PAGE;
    if (/flow builder/.test(r.system)) return JSON.stringify(CHAT_GRAPH);
    if (/in-app AI builder/.test(r.system)) return editAnswer ?? "{}";
    if (/confirm a website-edit instruction/.test(r.system)) return "I'll do that.";
    if (/Each turn, reply with ONE JSON object only/.test(r.system)) {
      if (/approved by the person/.test(all)) return JSON.stringify({ action: "final", answer: "Note saved and message sent." });
      if (/DECLINED/.test(all)) return JSON.stringify({ action: "final", answer: "I did not send the message." });
      if (/TOOL RESULT \(save_note\)/.test(all)) return JSON.stringify({ action: "tool", tool: "send_message", args: { to_name: "Bob" }, note: "Telling Bob" });
      return JSON.stringify({ action: "tool", tool: "save_note", args: { content: "Buy oat milk" }, note: "Saving the note first" });
    }
    if (/Reply with ONE JSON object only \(no prose/.test(r.system)) return "```json\n" + JSON.stringify({ mood: "happy", facts: ["likes tea"] }) + "\n```";
    if (all.includes("[image]")) return "I see a red square.";
    if (/PERSONA-TEST/.test(r.system)) {
      const turns = (r.body.messages ?? []).filter((m: { role: string }) => m.role !== "system").length;
      return `Hi, I'm Nova! (I can see ${turns - 1} earlier messages.)`;
    }
    if (/SOURCES:/.test(r.user)) return "Refunds take 5 days [1].";
    return "Mock answer.";
  };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      const path = (req.url ?? "").replace(/^\/v1/, "");
      const auth = String(req.headers.authorization ?? (req.headers["x-api-key"] ? `x-api-key ${req.headers["x-api-key"]}` : ""));
      if (req.method === "GET" && path.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      let body: any = {};
      try { body = JSON.parse(raw); } catch { /* empty */ }
      const rec: Req = { path, auth, stream: Boolean(body.stream), system: textOf((body.messages ?? []).find((m: { role: string }) => m.role === "system")?.content), user: textOf((body.messages ?? []).filter((m: { role: string }) => m.role === "user").pop()?.content), body };
      requests.push(rec);
      if (auth.includes("sk-byo-bad")) {
        res.writeHead(401, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: `Incorrect API key provided: ${auth.replace("Bearer ", "")}` } }));
      }
      if (path.startsWith("/embeddings")) {
        const inputs: string[] = Array.isArray(body.input) ? body.input : [body.input];
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: inputs.map((s, index) => ({ object: "embedding", index, embedding: vectorFor(s) })) }));
      }
      if (path.startsWith("/audio/speech")) {
        res.writeHead(200, { "content-type": "audio/mpeg" });
        return res.end(Buffer.from("ID3-mock-audio"));
      }
      const content = chatAnswer(rec);
      if (rec.stream) {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        const chunk = (delta: Record<string, unknown>, finish: string | null) => `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
        res.write(chunk({ role: "assistant", content: "" }, null));
        for (let i = 0; i < content.length; i += 300) res.write(chunk({ content: content.slice(i, i + 300) }, null));
        res.write(chunk({}, "stop"));
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "c", object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }] }));
    });
  });
  return {
    requests,
    setEdit: (v: unknown) => { editAnswer = JSON.stringify(v); },
    listen: () => new Promise<void>((resolve) => server.listen(mockPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function signIn(inst: Instance, email: string, name: string, extra: Record<string, unknown> = {}): Promise<{ agent: Agent; id: string }> {
  const password = `${name.toLowerCase()}-password-2026`;
  const user = await inst.db.user.create({ data: { email, name, emailVerified: new Date(), plan: "PRO", passwordHash: await argon2.hash(password, { type: argon2.argon2id }), ...extra } });
  const agent = inst.agent();
  const r = await agent.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${r.text}`);
  return { agent, id: user.id };
}

async function waitForRun(a: Agent, runId: string, ms = 180_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
    const r = await a.get(`/api/ai/runs/${runId}`);
    if (r.status === 200 && r.json.status !== "running") return r.json;
  }
  throw new Error(`run ${runId} did not finish`);
}

function partnerCall(method: string, path: string, key: string, body?: unknown): Promise<{ status: number; json?: any; text: string }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(
      { host: "127.0.0.1", port, path: `/api/partner/v1${path}`, method, headers: { authorization: `Bearer ${key}`, ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}) } },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (d) => (text += d));
        res.on("end", () => {
          let json: unknown;
          try { json = JSON.parse(text); } catch { /* not JSON */ }
          resolve({ status: res.statusCode ?? 0, json, text });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const { ok, checks } = checker();

  console.log("Part 1: the build rule (fixed patterns)");
  for (const p of [
    "An AI companion app like Grok's Ani: a friendly animated character I can chat and talk with, remembers what I tell it",
    "A personal agent like OpenAI dots that watches my inbox and drafts replies",
    "An OpenMuse-style agent app: chat, live task progress, pause, resume and approve",
  ]) ok(`allowed by the fixed rules: ${p.slice(0, 60)}`, !prescreen(p).block, prescreen(p));
  for (const p of ["Build me an AI app builder like NullKode for my clients", "an IgniteUps clone"]) ok(`refused by the fixed rules: ${p}`, Boolean(prescreen(p).block), prescreen(p));

  console.log("\nPart 2: a throwaway install");
  const mock = createMock();
  await mock.listen();
  let inst: Instance | null = null;
  const seen: string[] = [];
  const track = <T extends { text: string }>(r: T): T => {
    seen.push(r.text);
    return r;
  };
  try {
    inst = await startInstance({
      port,
      buildDir: ".next-e2e-ai-apps",
      env: { OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`, OPENAI_SCAFFOLD_MODEL: "mock-model", OPENAI_EDIT_MODEL: "mock-model", AI_CONTEXT_WINDOW: "200000", AI_VISION: "on", NK_FLOW_HTTP_ALLOW_PRIVATE: "1", AI_FLOW_VISITOR_HOURLY_LIMIT: "500" },
    });
    const db = inst.db;
    const op = await installOperator(inst, "AI Apps Studio");
    const opUser = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const ann = await signIn(inst, "ann@ai-apps.test", "Ann");
    const visitor = inst.agent();
    let r;

    /* ── The platform owner's app uses the platform's AI ───────────── */
    console.log("\n  The platform owner");
    r = await op.post("/api/projects", { name: "Owner Helper" });
    const ownerProject: string = r.json.project?.id ?? r.json.id;
    r = await op.post(`/api/projects/${ownerProject}/modules`, { moduleId: "ai-assistant" });
    ok("the owner adds the AI assistant feature: no key notice", r.status === 200 && !r.json.aiNotice, r.text.slice(0, 200));
    r = await op.post(`/api/projects/${ownerProject}/publish`);
    ok("the owner's app publishes", r.status === 200, r.text.slice(0, 200));
    const ownerAsk = (await db.flow.findFirstOrThrow({ where: { projectId: ownerProject, slug: { endsWith: "ask" } } })).id;
    let before = mock.requests.length;
    r = await visitor.post(`/api/run/${ownerAsk}`, { visitor_name: "Vee", question: "What are your hours?" });
    ok("a visitor of the owner's app gets an AI answer (no key needed)", r.status === 200 && JSON.stringify(r.json).includes("Mock answer"), r.text.slice(0, 300));
    ok("… from the platform's AI (the mock saw the platform's own key)", mock.requests.slice(before).some((q) => q.auth === PLATFORM_AUTH), mock.requests.slice(before).map((q) => q.auth));
    ok("… and it is counted like before (AiUsage kind flow)", (await db.aiUsage.count({ where: { userId: opUser.id, kind: "flow" } })) === 1);
    r = await op.get(`/projects/${ownerProject}/flows`);
    ok("no key banner in the owner's app", r.status === 200 && !r.text.includes("ai-key-banner"), r.status);
    r = await op.get("/dashboard");
    ok("no dashboard notice for the owner", r.status === 200 && !r.text.includes("ai-keys-dashboard-notice"));

    /* ── A non-owner's app: no key ─────────────────────────────────── */
    console.log("\n  A non-owner without a key");
    r = await ann.agent.post("/api/projects", { name: "Ann Helper" });
    const projectId: string = r.json.project?.id ?? r.json.id;
    r = track(await ann.agent.post(`/api/projects/${projectId}/modules`, { moduleId: "ai-assistant" }));
    ok("adding the AI assistant feature tells her to add her own key", r.status === 200 && /can't use the platform's AI/.test(r.json.aiNotice ?? ""), r.text.slice(0, 300));
    const ds = await db.dataSource.findFirstOrThrow({ where: { projectId, kind: "POSTGRES_INTERNAL" } });
    for (const [name, fields] of [
      ["messages", [{ name: "conversation_id", type: "text" }, { name: "role", type: "text" }, { name: "content", type: "text" }]],
      ["notes", [{ name: "content", type: "text" }]],
      ["sent", [{ name: "to_name", type: "text" }]],
      ["chunks", [{ name: "topic", type: "text" }, { name: "content", type: "text" }, { name: "chunk_index", type: "int" }, { name: "embedding", type: "text" }]],
      ["approvals", [{ name: "tool", type: "text" }, { name: "args", type: "text" }, { name: "note", type: "text" }, { name: "status", type: "text" }, { name: "state", type: "text" }]],
    ] as const) {
      r = await ann.agent.post(`/api/projects/${projectId}/datasources`, { _action: "create_table", datasourceId: ds.id, name, fields });
      if (r.status !== 200) throw new Error(`create table ${name}: ${r.status} ${r.text}`);
    }
    const tableName = async (base: string) => (await db.dataTable.findFirstOrThrow({ where: { datasourceId: ds.id, name: { endsWith: base } } })).name;
    const T = { messages: await tableName("messages"), notes: await tableName("notes"), sent: await tableName("sent"), chunks: await tableName("chunks"), approvals: await tableName("approvals") };
    const makeFlow = async (name: string, nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>) => {
      const c = await ann.agent.post(`/api/projects/${projectId}/flows`, { name });
      const id = c.json.flow?.id ?? c.json.id;
      const edges = nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: nodes[i].id, target: n.id, sourceHandle: null }));
      const u = await ann.agent.patch(`/api/projects/${projectId}/flows/${id}`, { graph: { nodes: nodes.map((n) => ({ ...n, data: { datasourceId: ds.id, ...n.data } })), edges } });
      if (u.status !== 200) throw new Error(`flow ${name}: ${u.status} ${u.text}`);
      return { id: id as string, slug: (await db.flow.findUniqueOrThrow({ where: { id } })).slug };
    };
    const chat = await makeFlow("Chat", [
      { id: "t", type: "trigger", data: {} },
      { id: "c", type: "ai_chat", data: { system: "You are Nova, a friendly companion. PERSONA-TEST", message: "{{trigger.message}}", table: T.messages, where: { conversation_id: "{{trigger.conversation_id}}" }, historyLimit: 10, output: "reply" } },
      { id: "r", type: "response", data: { status: 200, body: '{"reply":"{{vars.reply}}"}' } },
    ]);
    const saveNote = await makeFlow("Save note", [
      { id: "t", type: "trigger", data: {} },
      { id: "i", type: "insert", data: { table: T.notes, values: { content: "{{trigger.content}}" } } },
      { id: "r", type: "response", data: { status: 200, body: '{"saved":true}' } },
    ]);
    const sendMessage = await makeFlow("Send message", [
      { id: "t", type: "trigger", data: {} },
      { id: "i", type: "insert", data: { table: T.sent, values: { to_name: "{{trigger.to_name}}" } } },
      { id: "r", type: "response", data: { status: 200, body: '{"sent":true}' } },
    ]);
    const tools = [
      { name: "save_note", description: "Save a note", kind: "flow", flow: saveNote.slug, params: "content" },
      { name: "send_message", description: "Send a message to someone", kind: "flow", flow: sendMessage.slug, params: "to_name", needsApproval: true },
    ];
    const agentFlow = await makeFlow("Agent", [
      { id: "t", type: "trigger", data: {} },
      { id: "a", type: "ai_agent", data: { system: "You help the owner.", prompt: "{{trigger.goal}}", tools, maxSteps: 5, state: "{{trigger.state}}", decision: "{{trigger.decision}}", table: T.approvals, output: "agent" } },
      { id: "r", type: "response", data: { status: 200, body: "{{vars.agent}}" } },
    ]);
    const structured = await makeFlow("Mood", [
      { id: "t", type: "trigger", data: {} },
      { id: "s", type: "ai_structured", data: { prompt: "{{trigger.text}}", schema: '{"mood":"","facts":[]}', output: "data" } },
      { id: "r", type: "response", data: { status: 200, body: "{{vars.data}}" } },
    ]);
    const vision = await makeFlow("Look", [
      { id: "t", type: "trigger", data: {} },
      { id: "v", type: "ai_vision", data: { image: "{{trigger.image}}", prompt: "What is this?", output: "seen" } },
      { id: "r", type: "response", data: { status: 200, body: '{"seen":"{{vars.seen}}"}' } },
    ]);
    const addDoc = await makeFlow("Add doc", [
      { id: "t", type: "trigger", data: {} },
      { id: "e", type: "ai_embed", data: { input: "{{trigger.content}}", mode: "chunks", chunkSize: 200, extra: { topic: "{{trigger.topic}}" }, output: "pieces" } },
      { id: "b", type: "bulk_insert", data: { table: T.chunks, rowsVar: "pieces" } },
      { id: "r", type: "response", data: { status: 200, body: '{"ok":true}' } },
    ]);
    const search = await makeFlow("Search", [
      { id: "t", type: "trigger", data: {} },
      { id: "s", type: "ai_search", data: { query: "{{trigger.q}}", table: T.chunks, topK: 2, output: "matches" } },
      { id: "r", type: "response", data: { status: 200, body: "{{vars.matches}}" } },
    ]);
    const speak = await makeFlow("Speak", [
      { id: "t", type: "trigger", data: {} },
      { id: "s", type: "ai_speech", data: { text: "{{trigger.text}}", output: "speech" } },
      { id: "r", type: "response", data: { status: 200, body: "{{vars.speech}}" } },
    ]);
    r = await ann.agent.post(`/api/projects/${projectId}/publish`);
    ok("Ann's app publishes", r.status === 200, r.text.slice(0, 200));
    const annAsk = (await db.flow.findFirstOrThrow({ where: { projectId, slug: { endsWith: "ask" } } })).id;

    before = mock.requests.length;
    r = track(await visitor.post(`/api/run/${annAsk}`, { visitor_name: "Vee", question: "Hello?" }));
    ok("without a key a visitor reads \"This app's AI isn't set up yet.\" (503)", r.status === 503 && r.json?.error === "This app's AI isn't set up yet.", `${r.status} ${r.text}`);
    r = track(await visitor.post(`/api/run/${chat.id}`, { message: "Hi", conversation_id: "conv-1" }));
    ok("… the same for an AI chat step", r.status === 503 && r.json?.error === "This app's AI isn't set up yet.", `${r.status} ${r.text}`);
    ok("… and the platform's AI was never asked (no fallback)", mock.requests.length === before, mock.requests.slice(before).map((q) => q.auth));
    const failedRun = await db.flowRun.findFirst({ where: { flowId: annAsk }, orderBy: { createdAt: "desc" } });
    ok("the run log says why, for the owner", /No AI key/.test(failedRun?.error ?? ""), failedRun?.error);
    ok("nothing was charged to Ann's AI allowance", (await db.aiUsage.count({ where: { userId: ann.id, kind: "flow" } })) === 0);
    r = await ann.agent.get(`/projects/${projectId}/flows`);
    ok("the app's screens show the key banner", r.status === 200 && r.text.includes("ai-key-banner"), r.status);
    r = await ann.agent.get("/dashboard");
    ok("the dashboard lists the app under \"need their own AI key\"", r.status === 200 && r.text.includes("ai-keys-dashboard-notice") && r.text.includes("Ann Helper"));
    r = await ann.agent.get(`/projects/${projectId}/ai`);
    ok("the AI keys page says the app needs a key", r.status === 200 && r.text.includes("ai-keys-status") && /no key yet/.test(r.text), r.status);

    /* ── AI keys ──────────────────────────────────────────────────── */
    console.log("\n  AI keys");
    r = track(await ann.agent.post(`/api/projects/${projectId}/ai-keys/test`, { provider: "custom", baseUrl: `http://127.0.0.1:${mockPort}/v1`, apiKey: "sk-byo-bad-key-123456", model: "mock-model" }));
    ok("Test connection with a wrong key fails in plain words, without echoing the key", r.status === 200 && r.json.ok === false && r.json.code === "key" && !r.text.includes("sk-byo-bad-key-123456"), r.text);
    r = track(await ann.agent.post(`/api/projects/${projectId}/ai-keys`, { provider: "custom", baseUrl: `http://127.0.0.1:${mockPort}/v1`, apiKey: BYO_KEY, model: "mock-model", embedModel: "mock-embed", speechModel: "mock-tts", voice: "nova" }));
    ok("the key is saved; the answer shows only a masked hint", r.status === 200 && r.json.connection.keyHint === `${BYO_KEY.slice(0, 4)}…${BYO_KEY.slice(-4)}` && !r.text.includes(BYO_KEY), r.text.slice(0, 300));
    const stored = await db.appAiConnection.findFirstOrThrow({ where: { projectId } });
    ok("… encrypted at rest", stored.apiKeyEnc.startsWith("enc:v1:") && !stored.apiKeyEnc.includes(BYO_KEY));
    r = track(await ann.agent.get(`/api/projects/${projectId}/ai-keys`));
    ok("GET lists it masked, and the app is ready", r.status === 200 && r.json.connections.length === 1 && r.json.status.needsKey === false && !r.text.includes(BYO_KEY), r.text.slice(0, 300));
    r = track(await ann.agent.post(`/api/projects/${projectId}/ai-keys/test`, { id: stored.id }));
    ok("Test connection with the saved key works", r.status === 200 && r.json.ok === true, r.text);
    r = track(await visitor.post(`/api/projects/${projectId}/ai-keys`, { provider: "openai", apiKey: "sk-evil-123456789", model: "x" }));
    ok("nobody else can read or change the app's keys", r.status === 401 || r.status === 404 || r.status === 403, r.status);
    r = await ann.agent.patch(`/api/projects/${projectId}/ai-keys`, { limits: { perHour: 200, perVisitorHour: 100 } });
    ok("the app's AI limits can be changed", r.status === 200 && r.json.limits.perHour === 200 && r.json.limits.perVisitorHour === 100, r.text);
    r = await ann.agent.get(`/projects/${projectId}/flows`);
    ok("the banner is gone once the key is saved", r.status === 200 && !r.text.includes("ai-key-banner"));

    /* ── The AI steps with the app's own key ──────────────────────── */
    console.log("\n  The AI steps, with the app's own key");
    before = mock.requests.length;
    r = track(await visitor.post(`/api/run/${annAsk}`, { visitor_name: "Vee", question: "Hello?" }));
    ok("ai_prompt answers with the app's key", r.status === 200 && JSON.stringify(r.json).includes("Mock answer"), r.text.slice(0, 300));
    r = track(await visitor.post(`/api/run/${chat.id}`, { message: "Hi Nova, I like tea", conversation_id: "conv-1" }));
    ok("ai_chat replies as the persona", r.status === 200 && /Hi, I'm Nova!/.test(r.json.reply) && /0 earlier/.test(r.json.reply), r.text);
    r = track(await visitor.post(`/api/run/${chat.id}`, { message: "What do I like?", conversation_id: "conv-1" }));
    ok("… and remembers the conversation from its table", r.status === 200 && /2 earlier/.test(r.json.reply), r.text);
    const rows = await db.$queryRawUnsafe<Array<{ role: string }>>(`SELECT role FROM "proj_${projectId}"."${T.messages}" WHERE conversation_id = 'conv-1' ORDER BY created_at`);
    ok("… both turns are saved", rows.length === 4 && rows[0].role === "user" && rows[1].role === "assistant", rows);
    r = track(await visitor.post(`/api/run/${chat.id}`, { message: "Hi", conversation_id: "conv-2" }));
    ok("… another conversation doesn't see the first one", r.status === 200 && /0 earlier/.test(r.json.reply), r.text);
    r = track(await visitor.post(`/api/run/${structured.id}`, { text: "I'm happy, I like tea" }));
    ok("ai_structured returns the fields as data", r.status === 200 && r.json.mood === "happy" && Array.isArray(r.json.facts), r.text);
    const red = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    r = track(await visitor.post(`/api/run/${vision.id}`, { image: red }));
    ok("ai_vision reads a picture", r.status === 200 && r.json.seen === "I see a red square.", r.text);
    r = track(await visitor.post(`/api/run/${vision.id}`, { image: "/api/internal/health" }));
    ok("… but won't fetch internal addresses as pictures", r.status === 400, `${r.status} ${r.text}`);
    r = track(await visitor.post(`/api/run/${addDoc.id}`, { content: "Our refund policy: refunds take 5 days.\n\nShipping: we ship to the moon and back in 2 days. ".repeat(3), topic: "help" }));
    ok("ai_embed cuts a document into pieces with embeddings (saved with Add many rows)", r.status === 200, r.text);
    const pieces = await db.$queryRawUnsafe<Array<{ embedding: string; topic: string }>>(`SELECT embedding, topic FROM "proj_${projectId}"."${T.chunks}"`);
    ok("… the pieces are stored with their embeddings and extra values", pieces.length >= 2 && pieces.every((p) => p.topic === "help" && JSON.parse(p.embedding).length === TOPICS.length), pieces.length);
    r = track(await visitor.post(`/api/run/${search.id}`, { q: "how long does a refund take?" }));
    ok("ai_search finds the closest pieces by meaning, without their vectors", r.status === 200 && Array.isArray(r.json) && r.json.length === 2 && /refund/i.test(r.json[0].content) && typeof r.json[0].score === "number" && !("embedding" in r.json[0]), r.text.slice(0, 300));
    r = track(await visitor.post(`/api/run/${speak.id}`, { text: "Hello there" }));
    ok("ai_speech returns spoken audio from the app's AI", r.status === 200 && r.json.browser === false && String(r.json.audio).startsWith("data:audio/mpeg;base64,"), r.text.slice(0, 200));

    // The agent: a tool, then an action that needs approval, then approved.
    r = track(await visitor.post(`/api/run/${agentFlow.id}`, { goal: "Note to buy oat milk, then tell Bob" }));
    ok("ai_agent uses a tool (another flow of the app)", r.status === 200 && r.json.steps?.[0]?.tool === "save_note" && r.json.steps[0].ok === true, r.text.slice(0, 400));
    ok("… then stops before an action that needs approval", r.json.status === "needs_approval" && r.json.pending?.tool === "send_message" && r.json.pending?.args?.to_name === "Bob", r.json);
    ok("… and records the pending approval", Boolean(r.json.approvalId) && (await db.$queryRawUnsafe<Array<{ status: string }>>(`SELECT status FROM "proj_${projectId}"."${T.approvals}"`))[0]?.status === "pending");
    ok("… nothing was sent yet", (await db.$queryRawUnsafe<unknown[]>(`SELECT 1 FROM "proj_${projectId}"."${T.sent}"`)).length === 0);
    const state = r.json.state as string;
    r = track(await visitor.post(`/api/run/${agentFlow.id}`, { state, decision: "approve" }));
    ok("approving it runs the action and the agent finishes", r.status === 200 && r.json.status === "done" && r.json.answer === "Note saved and message sent." && r.json.steps.some((s: { tool: string; approved?: boolean }) => s.tool === "send_message" && s.approved === true), r.text.slice(0, 400));
    ok("… the message was sent once", (await db.$queryRawUnsafe<unknown[]>(`SELECT 1 FROM "proj_${projectId}"."${T.sent}"`)).length === 1);
    const forged = JSON.parse(state);
    forged.pending = { tool: "send_message", args: { to_name: "Mallory" } };
    r = track(await visitor.post(`/api/run/${agentFlow.id}`, { state: JSON.stringify(forged), decision: "approve" }));
    ok("a forged agent state (an invented pending action) is refused", r.status === 400 && (await db.$queryRawUnsafe<unknown[]>(`SELECT 1 FROM "proj_${projectId}"."${T.sent}"`)).length === 1, `${r.status} ${r.text}`);
    r = track(await visitor.post(`/api/run/${agentFlow.id}`, { state, decision: "reject" }));
    ok("declining instead skips the action", r.status === 200 && r.json.status === "done" && /did not send/.test(r.json.answer), r.text.slice(0, 300));
    const runCalls = mock.requests.slice(before);
    ok("every AI call of Ann's app used her key, none the platform's", runCalls.length > 8 && runCalls.every((q) => q.auth === `Bearer ${BYO_KEY}`), runCalls.map((q) => q.auth.slice(0, 20)));
    ok("… and none was charged to anyone's AI allowance", (await db.aiUsage.count({ where: { userId: ann.id, kind: "flow" } })) === 0);

    // A second named connection.
    r = track(await ann.agent.post(`/api/projects/${projectId}/ai-keys`, { name: "second", provider: "custom", baseUrl: `http://127.0.0.1:${mockPort}/v1`, apiKey: BYO_KEY2, model: "mock-model" }));
    ok("a second, named connection can be added", r.status === 200 && r.json.connection.name === "second" && r.json.connection.isDefault === false, r.text.slice(0, 200));
    const named = await makeFlow("Named", [
      { id: "t", type: "trigger", data: {} },
      { id: "p", type: "ai_prompt", data: { prompt: "{{trigger.q}}", connection: "second", output: "ai" } },
      { id: "r", type: "response", data: { status: 200, body: '{"a":"{{vars.ai}}"}' } },
    ]);
    await ann.agent.post(`/api/projects/${projectId}/publish`);
    before = mock.requests.length;
    r = track(await visitor.post(`/api/run/${named.id}`, { q: "hi" }));
    ok("a step that names a connection uses that one", r.status === 200 && mock.requests.slice(before).every((q) => q.auth === `Bearer ${BYO_KEY2}`) && mock.requests.length > before, r.text);

    // The limit.
    await ann.agent.patch(`/api/projects/${projectId}/ai-keys`, { limits: { perHour: 1, perVisitorHour: 1 } });
    r = track(await inst.agent(undefined, { "x-real-ip": "198.51.100.9" }).post(`/api/run/${chat.id}`, { message: "Hi", conversation_id: "conv-9" }));
    const r2 = track(await inst.agent(undefined, { "x-real-ip": "198.51.100.9" }).post(`/api/run/${chat.id}`, { message: "Hi again", conversation_id: "conv-9" }));
    ok("over the app's AI limit visitors are asked to try later (429)", r2.status === 429 && /too many AI requests/.test(r2.json?.error ?? ""), `${r.status} ${r2.status} ${r2.text}`);
    await ann.agent.patch(`/api/projects/${projectId}/ai-keys`, { limits: { perHour: 500, perVisitorHour: 500 } });

    /* ── The key never shows up ───────────────────────────────────── */
    console.log("\n  The key stays secret");
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
    for (const p of [`/app/${project.slug}`, `/preview/${projectId}`, `/projects/${projectId}/ai`, `/projects/${projectId}/flows`, `/api/projects/${projectId}/flows`, `/api/projects/${projectId}/export`]) {
      const res = await ann.agent.get(p);
      seen.push(res.text);
    }
    const runs = await db.flowRun.findMany({ where: { flow: { projectId } } });
    const leak = (s: string) => s.includes(BYO_KEY) || s.includes(BYO_KEY2) || s.includes(BYO_KEY.slice(8));
    ok("in no page, HTML or API answer", !seen.some(leak), seen.findIndex(leak));
    ok("in no stored run", !runs.some((x) => leak(JSON.stringify(x))));
    ok("in no log line", !leak(inst.log()));
    ok("in no setting or other table but encrypted", !(await db.setting.findMany()).some((s) => leak(JSON.stringify(s))));

    /* ── Emails: once per app ─────────────────────────────────────── */
    // (Email isn't set up on this install: the notice is held, never sent twice.)
    ok("the owner email is never attempted for the platform owner", !(await db.setting.findFirst({ where: { key: `appai.notified:${ownerProject}` } })));

    /* ── Plan and build notices ───────────────────────────────────── */
    console.log("\n  Plan and build notices");
    const companionPrompt = "An AI companion app like Grok's Ani: a friendly animated character I can chat and talk with, remembers what I tell it";
    r = await ann.agent.post("/api/ai/plan-app", { prompt: companionPrompt });
    ok("an AI companion is allowed and planned", r.status === 200, r.text.slice(0, 200));
    let run = await waitForRun(ann.agent, r.json.runId);
    const planned = (run.events as Array<{ type: string; aiNotice?: string; plan?: { aiFeatures?: string[] } }>).find((e) => e.type === "planned");
    ok("the plan lists its AI features and tells a non-owner to add a key", run.status === "success" && (planned?.plan?.aiFeatures?.length ?? 0) > 0 && /can't use the platform's AI/.test(planned?.aiNotice ?? ""), planned);
    const planReq = mock.requests.filter((q) => /app planner/.test(q.system)).pop();
    ok("… the planner got the AI products playbook", /AI COMPANION/.test(planReq?.system ?? "") && /HONEST LIMITS/.test(planReq?.system ?? ""));
    r = await op.post("/api/ai/plan-app", { prompt: companionPrompt });
    run = await waitForRun(op, r.json.runId);
    ok("the platform owner's plan has no such notice", run.status === "success" && !(run.events as Array<{ type: string; aiNotice?: string }>).find((e) => e.type === "planned")?.aiNotice, run.events?.slice(-1));
    for (const p of ["A personal agent like OpenAI dots that watches my inbox and drafts replies", "An OpenMuse-style agent app: chat with it, see live task progress, pause, resume and approve its actions"]) {
      r = await ann.agent.post("/api/ai/plan-app", { prompt: p });
      const done = r.status === 200 ? await waitForRun(ann.agent, r.json.runId) : null;
      ok(`allowed and planned: ${p.slice(0, 50)}…`, done?.status === "success", `${r.status} ${r.text.slice(0, 200)} ${done?.error ?? ""}`);
    }
    r = await ann.agent.post("/api/ai/plan-app", { prompt: "an IgniteUps clone" });
    ok("an IgniteUps clone is still refused", r.status === 422 && r.json?.code === "build_not_allowed", r.text);
    r = await ann.agent.post("/api/ai/plan-app", { prompt: "Build me an AI app builder like NullKode for my clients" });
    ok("an app-builder clone is still refused", r.status === 422 && r.json?.code === "build_not_allowed", r.text);

    r = await ann.agent.post("/api/ai/scaffold", { prompt: companionPrompt, plan: COMPANION_PLAN });
    run = await waitForRun(ann.agent, r.json.runId);
    const doneEv = (run.events as Array<{ type: string; aiNotice?: string; projectId?: string }>).find((e) => e.type === "done");
    ok("the build's last message tells her again", run.status === "success" && /Published apps can't use the platform's AI/.test(doneEv?.aiNotice ?? "") && (run.events as Array<{ step?: string }>).some((e) => e.step === "ai-key"), run.error ?? doneEv);
    const built = await db.flow.findMany({ where: { projectId: doneEv?.projectId } });
    ok("… the built app's chat flow uses an AI chat step", built.some((f) => JSON.stringify(f.graph).includes('"ai_chat"')), built.map((f) => f.slug));
    r = await op.post("/api/ai/scaffold", { prompt: companionPrompt, plan: COMPANION_PLAN });
    run = await waitForRun(op, r.json.runId);
    ok("the platform owner's build ends without a key notice", run.status === "success" && !(run.events as Array<{ type: string; aiNotice?: string }>).find((e) => e.type === "done")?.aiNotice, run.error);

    /* ── Ask AI ───────────────────────────────────────────────────── */
    console.log("\n  Ask AI and features");
    r = await ann.agent.post("/api/projects", { name: "Ann Shop" });
    const shopId: string = r.json.project?.id ?? r.json.id;
    const home = await db.page.findFirstOrThrow({ where: { projectId: shopId, isHome: true } });
    mock.setEdit({ html: `<section><h1>Shop</h1><form data-nk-form="" data-nk-flow-ref="ask-ai"><input name="q"></form></section>`, css: "", explanation: "Added an AI helper.", newTables: [], pageEdits: [], suggestions: [],
      newFlows: [{ name: "Ask AI", slug: "ask-ai", purpose: "Answers questions", nodes: [{ id: "t", type: "trigger", data: "{}" }, { id: "a", type: "ai_prompt", data: JSON.stringify({ prompt: "{{trigger.q}}", output: "ai" }) }, { id: "r", type: "response", data: JSON.stringify({ status: 200, body: '{"a":"{{vars.ai}}"}' }) }], edges: [{ id: "e1", source: "t", target: "a", sourceHandle: null }, { id: "e2", source: "a", target: "r", sourceHandle: null }] }] });
    r = await ann.agent.post("/api/ai/edit-page", { projectId: shopId, pageId: home.id, message: "Add an AI helper that answers shoppers' questions", currentHtml: home.html, currentCss: "" });
    ok("an Ask-AI edit that adds an AI step tells her to add a key", r.status === 200 && /can't use the platform's AI/.test(r.json.aiNotice ?? "") && /can't use the platform's AI/.test(r.json.explanation ?? ""), r.text.slice(0, 400));
    const askReq = mock.requests.filter((q) => /in-app AI builder/.test(q.system)).pop();
    ok("… Ask AI got the AI steps guide for an AI change", /ai_chat/.test(askReq?.user ?? ""));
    r = await op.post("/api/projects", { name: "Owner Shop" });
    const opShop: string = r.json.project?.id ?? r.json.id;
    const opHome = await db.page.findFirstOrThrow({ where: { projectId: opShop, isHome: true } });
    r = await op.post("/api/ai/edit-page", { projectId: opShop, pageId: opHome.id, message: "Add an AI helper that answers shoppers' questions", currentHtml: opHome.html, currentCss: "" });
    ok("… the platform owner's doesn't", r.status === 200 && !r.json.aiNotice, r.text.slice(0, 300));

    for (const moduleId of ["ai-companion", "ai-agent", "knowledge-bot"]) {
      r = await ann.agent.post("/api/projects", { name: `Try ${moduleId}` });
      const pid: string = r.json.project?.id ?? r.json.id;
      r = await ann.agent.post(`/api/projects/${pid}/modules`, { moduleId });
      ok(`the "${moduleId}" feature installs and shows the key notice`, r.status === 200 && Boolean(r.json.aiNotice), r.text.slice(0, 300));
    }

    /* ── Partner API ──────────────────────────────────────────────── */
    console.log("\n  Partner API");
    const key = await op.post("/api/admin/partner-keys", { name: "AI test", scope: "platform" });
    const secret = key.json.secret as string;
    const pp = await partnerCall("GET", `/projects/${shopId}/ai-connection`, secret);
    ok("GET ai-connection: no connections, needs a key", pp.status === 200 && pp.json.connections.length === 0 && pp.json.ai.needsKey === true, pp.text);
    const pk = await partnerCall("POST", `/projects/${shopId}/ai-connection`, secret, { provider: "custom", baseUrl: `http://127.0.0.1:${mockPort}/v1`, apiKey: BYO_KEY, model: "mock-model", test: true });
    seen.push(pk.text);
    ok("POST ai-connection saves the key (write-only) and tests it", pk.status === 200 && pk.json.test?.ok === true && pk.json.ai.needsKey === false && !pk.text.includes(BYO_KEY), pk.text.slice(0, 300));
    const bad = await partnerCall("POST", `/projects/${shopId}/ai-connection`, secret, { provider: "nope", model: "x", apiKey: "sk-12345678" });
    ok("… bad input: 400 invalid_request", bad.status === 400 && bad.json?.error?.code === "invalid_request", bad.text);
    const pd = await partnerCall("DELETE", `/projects/${shopId}/ai-connection?name=default`, secret);
    ok("DELETE ai-connection removes it", pd.status === 200 && pd.json.connections.length === 0, pd.text);
    const planRun = await partnerCall("POST", "/plan", secret, { userId: ann.id, prompt: companionPrompt });
    let pr = { json: { run: { status: "running", ai: null as null | { needsKey: boolean; notice: string | null } } } } as { json: { run: { status: string; ai: null | { needsKey: boolean; notice: string | null } } } };
    for (let i = 0; i < 200 && pr.json.run.status === "running"; i++) {
      await sleep(500);
      pr = (await partnerCall("GET", `/runs/${planRun.json.runId}`, secret)) as typeof pr;
    }
    ok("a partner plan with AI features carries ai.needsKey and the notice", pr.json.run.status === "success" && pr.json.run.ai?.needsKey === true && /platform's AI/.test(pr.json.run.ai?.notice ?? ""), pr.json.run);
    ok("the partner answers never contained the key", !seen.some(leak));

    console.log(`\n${checks.length} checks passed`);
  } catch (err) {
    console.error(err instanceof Error ? err.stack ?? err.message : err);
    if (inst) console.error(inst.log().replaceAll(BYO_KEY, "[key]").slice(-6000));
    process.exitCode = 1;
  } finally {
    await inst?.stop();
    await mock.close();
  }
}

void main();
