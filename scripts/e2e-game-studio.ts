/**
 * End-to-end checks for the Game Studio (src/lib/game-studio, /games):
 * a throwaway install against a scripted OpenAI-compatible mock AI whose
 * "steps" are the engine kits' own sample games (scripts/fixtures/games,
 * nk-games/engine/samples with real library ids).
 *
 *  - plan: brief + library searches → assets (real ids) + 8 build steps;
 *  - every step: AI edit → checks → headless run → a version with a
 *    screenshot; the workspace's live canvas receives each step as an
 *    nk-game:patch (the game reports the step back in nk-game:status) and
 *    grows step by step without a reload;
 *  - the "need assets" round trip ({"searches":[…]} answered, then the step);
 *  - a broken step (syntax error) is caught and the one repair works; a step
 *    that stays broken ends the job with nothing changed and the AI action
 *    refunded;
 *  - chat changes after the build ("make the jump higher") patch the running
 *    game in place (hot);
 *  - the build rule refuses (fixed pattern and the AI check), 422, nothing
 *    charged, a BuildRefusal row of kind "game";
 *  - the AI allowance: one action per build and per change, refused when used up;
 *  - a restart in the middle of a build: the job carries on from its step,
 *    charged once;
 *  - the design playbook (nk-games/design): the genre matched and kept on the
 *    game, the core rules and the genre card in the step prompts (within the
 *    token budget), playtests after the level, enemies and polish steps; a
 *    seeded unreachable gap caught by the path search and fixed by a fix
 *    step, the checklist notes reaching the next step; kit 1.1.0 (Reduce
 *    motion setting, touch-art ids resolved by kit.json);
 *  - steer while building: a note sent from the workspace mid-build shows in
 *    the chat at once and gets an immediate reply; the next step's prompt
 *    carries it as an owner instruction; a note the plan doesn't cover adds
 *    a step (the checklist grows live); a question is answered and not
 *    built; a note the build rule refuses gets the refusal sentence and never
 *    reaches a step; a note sent during the last step gets a follow-up step;
 *    "Stop after this step" and "Stop now" (the running AI call is aborted,
 *    the last good version stays); notes charge nothing;
 *  - planned features with real tests: the plan's features + tests; a step
 *    that breaks its new feature is caught by the test (real key presses in
 *    the headless check) and repaired with the test output; a regression from
 *    a later step is caught; a broken test is rewritten once; per-step chat
 *    lines and per-version status; the end gate adds a "Feature fixes" step
 *    when a core feature still fails, and the last message names what still
 *    fails; a chat change adds a feature with a test; a note adds one; restore
 *    brings a version's feature status back; the plan card's Features section
 *    (en + ar, 1440 + 390);
 *  - licences: Quaternius platform-only (platform-only) assets are searchable,
 *    usable in games and left out of downloads (redistributable: false), with
 *    the "Hosted only" badge;
 *  - publish: the game becomes an app whose page boots the game and plays;
 *  - download: a .zip with the engine and CC0 assets, Platform-only pack assets
 *    left out and listed;
 *  - the engine and asset routes, the canvas pass, other people's games;
 *  - screenshots of the workspace (en + ar, 1440 + 390 wide) and of the
 *    canvas after each step.
 *
 * Needs Docker (a scratch Postgres), the engine kits and the asset library
 * (nk-games, game-assets) and Playwright's Chromium. Run from the repo root:
 *   E2E_PORT=3321 node_modules/.bin/tsx scripts/e2e-game-studio.ts
 * The mock AI listens on E2E_PORT + 1. Screenshots: E2E_SHOTS (default
 * /tmp/nk-e2e-game-studio).
 */
import http from "node:http";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import argon2 from "argon2";
import JSZip from "jszip";
import { chromium, type Browser, type BrowserContext, type Frame, type Page } from "playwright";
import { startInstance, installOperator, checker, warmApp, type Agent, type Instance } from "./e2e-harness";
import { buildLock } from "../src/lib/game-studio/catalog";
import { exportPreview } from "../src/lib/game-studio/export";

const port = Number(process.env.E2E_PORT || 3321);
const mockPort = port + 1;
const SHOTS = process.env.E2E_SHOTS || "/tmp/nk-e2e-game-studio";
/** E2E_ONLY=steer|playtest|change: just that part (quicker while working on it; "change" prints the canvas messages around a chat change). */
const ONLY = process.env.E2E_ONLY ?? "";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

/* ───────────────────────── Fixtures ───────────────────────── */

const FIX = path.join(process.cwd(), "scripts/fixtures/games/platformer-2d");
const FIX3D = path.join(process.cwd(), "scripts/fixtures/games/dungeon-3d");
function loadStep(n: number, root = FIX): Record<string, string> {
  const dir = path.join(root, `step-${String(n).padStart(2, "0")}`);
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = path.join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out[path.relative(dir, p).split(path.sep).join("/")] = readFileSync(p, "utf8");
    }
  };
  walk(dir);
  return out;
}
function fileBlocks(files: Record<string, string>, note: string): string {
  return Object.entries(files).map(([p, c]) => `=== FILE ${p}\n${c}\n=== END`).join("\n") + `\nNOTE: ${note}`;
}

/** Step label → what the mock writes for it. `breaks`: a feature the first try breaks (the repair after its failed test fixes it; `always`: never). */
const STEPS: Record<string, { fixture?: number; three?: boolean; slow?: boolean | number; broken?: "once" | "always"; search?: boolean; gappy?: boolean; breaks?: "coins" | "jump"; always?: boolean }> = {
  "Dungeon shell": { fixture: 1, three: true },
  "Dungeon hall": { fixture: 2, three: true },
  "Knight hero": { fixture: 3, three: true },
  "Sky and ground": { fixture: 1 },
  "Art and backdrop": { fixture: 2, search: true },
  "First level": { fixture: 3 },
  "Hero and controls": { fixture: 4, broken: "once" },
  "Fish and score": { fixture: 5, breaks: "coins" },
  "Enemies and lives": { fixture: 6, breaks: "jump" },
  "Goal and second level": { fixture: 7 },
  "Touch controls and polish": { fixture: 8 },
  "Doomed step": { broken: "always" },
  "Slow art step": { fixture: 2, slow: true },
  // Steer while building.
  "Steer slow art": { fixture: 2, slow: 20_000 },
  "Steer slow hero": { fixture: 4, slow: 8_000 },
  "Frog enemy": { fixture: 4, slow: 15_000 },
  "Your notes from the chat": { fixture: 4 },
  // The playtester: a level with a gap nobody can jump, then the fix.
  "Gappy level": { fixture: 3, gappy: true },
  "Playtest fixes": { fixture: 3 },
  "Playtest hero": { fixture: 4 },
  // The feature end gate: a polish step whose coins never count, then the fix.
  "Coinless polish": { fixture: 8, breaks: "coins", always: true },
  "Feature fixes": { fixture: 8 },
};
/** A feature broken on purpose: coins no longer counted, or the jump gone. */
function breakFeature(files: Record<string, string>, what: "coins" | "jump"): Record<string, string> {
  if (what === "coins") return { ...files, "src/scenes/game.js": files["src/scenes/game.js"].replace("NK.run.coins++;", "") };
  return { ...files, "src/entities/player.js": files["src/entities/player.js"].replace("body.setVelocityY(-1000);", "body.setVelocityY(-1);") };
}
/** The main build's planned features (calibrated on the sample game: real key presses in game time). "three-lives" reads a run key the game never has: a bad test, rewritten once. */
const FEATURES = {
  runJump: { id: "run-jump", name: "Run and jump", priority: "core", how: "Arrows run, Space jumps.", test: { steps: [{ key: "ArrowRight", holdMs: 400 }, { key: "Space", holdMs: 250 }, { waitMs: 100 }], expect: ["track.maxX > start.player.x + 60", "track.minY < start.player.y - 60"] } },
  coins: { id: "collect-coins", name: "Collect coins", priority: "core", how: "Touching a coin adds it to the counter and the score.", test: { steps: [{ down: "ArrowRight" }, { waitMs: 300 }, { key: "Space", holdMs: 200 }, { waitMs: 900 }, { up: "ArrowRight" }], expect: ["NK.run.coins >= 1", "track.max.score >= 10"] } },
  lives: { id: "three-lives", name: "Three lives", priority: "extra", how: "You start with three hearts.", test: { steps: [{ waitMs: 200 }], expect: ["NK.run.hearts === 3"] } },
  stomp: { id: "stomp-slimes", name: "Stomp slimes", priority: "extra", how: "Jumping on a slime squashes it for 100 points.", test: { steps: [{ waitMs: 300 }], expect: ["track.max.score >= 99999"] } },
};
const STEP_FEATURES: Record<string, string[]> = { "Hero and controls": ["run-jump"], "Fish and score": ["collect-coins"], "Enemies and lives": ["three-lives"], "Coinless polish": ["collect-coins", "stomp-slimes"] };
/** Fixture 3's level with a 14-tile hole from tile 27 (ground and platforms), so the flag can't be reached. */
function gappy(files: Record<string, string>): Record<string, string> {
  return { ...files, "src/levels.js": files["src/levels.js"].replace(/"([ #=XcPshmgbF^k]{60,})"/g, (_m, row: string) => `"${row.slice(0, 27)}${" ".repeat(14)}${row.slice(41)}"`) };
}
const STEER_STEPS = ["Sky and ground", "Steer slow art", "First level", "Steer slow hero"];
const MAIN_STEPS = ["Sky and ground", "Art and backdrop", "First level", "Hero and controls", "Fish and score", "Enemies and lives", "Goal and second level", "Touch controls and polish"];

/* ───────────────────────── The mock AI ───────────────────────── */

type Rec = { system: string; user: string };

function createMock() {
  const requests: Rec[] = [];
  let lastFixture = 1;
  const counts = new Map<string, number>();
  const textOf = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("\n") : "");
  const answer = async (system: string, user: string): Promise<string | null> => {
    if (/You enforce one rule of an AI app-building platform/.test(system)) {
      return JSON.stringify(/MOCK-JUDGE-REFUSE/.test(user) ? { allowed: false, reason: "Mock judge: a site builder dressed up as a game." } : { allowed: true, reason: "Mock judge: an ordinary game." });
    }
    // Steer while building: the immediate reply to a note (it must never carry code to the chat).
    if (/chatting with the person while the studio's AI developer builds their game/.test(system)) {
      const note = /NOTE: ([\s\S]*)$/.exec(user)?.[1]?.trim() ?? "";
      const running = /RUNNING NOW: (.+)/.exec(user)?.[1] ?? "between steps";
      if (/\?$/.test(note)) return JSON.stringify({ kind: "question", reply: `MOCK-REPLY We're on ${running}. \`\`\`js\nNK.run.score = 1;\n\`\`\``, newStep: false });
      return JSON.stringify({ kind: "change", reply: `MOCK-REPLY Noted: ${note}. I'll work it in from the next step.`, newStep: /frog/i.test(note) });
    }
    // The review (playtest + art): nothing for most games; for the gap test a should-fix item, visible problems after the
    // level and in the first two end reviews (then clean), so the end loop runs its cycles.
    if (/You are the game studio's playtester/.test(system)) {
      const gap = /"title":"Gap Test"/.test(user);
      const end = /this pass: after the (polish|fix) step/.test(user) && /phone-844x390/.test(user);
      const n = gap && end ? (counts.set("gap-end", (counts.get("gap-end") ?? 0) + 1), counts.get("gap-end")!) : 0;
      const visual = gap && ((/this pass: after the level step/.test(user)) || (end && n <= 2)) ? [{ say: `MOCK-VIS${n} the hero is too small next to the tiles`, evidence: "spawn screenshot", fix: "src/entities/player.js: scale 0.75 → 0.9" }] : [];
      return JSON.stringify({ findings: gap && /after the level step/.test(user) ? [{ id: "PT-17", say: "MOCK-PT17 checkpoints are too far apart", evidence: "no checkpoint flag in 70 tiles", fix: "src/levels.js: a checkpoint every 30-60 s" }] : [], visual });
    }
    // Planned features: a test that is broken itself gets rewritten (the game's files are in the message).
    if (/Some feature tests are broken themselves/.test(system)) {
      const ids = [...user.matchAll(/^- ([a-z0-9-]+): "/gm)].map((m) => m[1]);
      return JSON.stringify({ tests: ids.map((id) => ({ id, test: id === "three-lives" && /GAME FILES:[\s\S]*lives: 3/.test(user) ? { steps: [{ waitMs: 200 }], expect: ["NK.run.lives === 3"] } : { steps: [], expect: ["NK.run.nothing === 1"] } })) });
    }
    // Steer while building: revising the remaining steps for the notes.
    if (/the person \(the game's owner\) sent NOTES/.test(system)) {
      const remaining = JSON.parse(/REMAINING STEPS \(in order\):\n(.+)/.exec(user)?.[1] ?? "[]") as Array<{ id: string; label: string; goal: string }>;
      const notes = JSON.parse(/NOTES:\n(.+)/.exec(user)?.[1] ?? "[]") as Array<{ id: string; text: string }>;
      const frog = notes.some((n) => /frog/i.test(n.text));
      return JSON.stringify({
        steps: [...remaining, ...(frog ? [{ id: "frog-enemy", label: "Frog enemy", goal: "Add a jumping frog enemy", features: ["frog-lives"] }] : [])],
        notes: notes.map((n) => ({ id: n.id, step: /frog/i.test(n.text) ? "frog-enemy" : remaining[0]?.id })),
        features: frog ? [{ id: "frog-lives", name: "Survive the frog", priority: "extra", how: "The frog hurts but you keep your lives at the start.", test: { steps: [{ waitMs: 200 }], expect: ["NK.run.lives >= 1"] } }] : [],
      });
    }
    if (/game designer doing a 10-second intake/.test(system)) {
      return JSON.stringify(/vague/.test(user) ? { questions: [{ id: "kind", label: "What kind of game?", options: ["Platformer", "Puzzle"] }] } : { questions: [] });
    }
    if (/Turn the person's idea into a short game design brief/.test(system)) {
      const title = /playtest test/i.test(user) ? "Gap Test" : /doomed/i.test(user) ? "Doomed Game" : /restart/i.test(user) ? "Restart Game" : /dungeon/i.test(user) ? "Knight Hall" : "Whisker Dash";
      return JSON.stringify({
        title,
        engine: /dungeon/i.test(user) ? "three-3d" : "phaser-2d",
        brief: { genre: "side-scrolling platformer", pitch: "A cat runs and jumps through grassy hills collecting fish.", coreLoop: "Run, jump, collect fish, avoid slimes.", controls: "Arrows or A/D to run, Space to jump; on-screen buttons on phones.", levels: "Two short levels.", winLose: "Reach the flag to win; three lives.", artStyle: "bright cartoon side view", audio: "cheerful loop, coin and jump sounds" },
        message: "A cheerful platformer: a cat collecting fish across two levels.",
        visual: { camera: "side view, hero 1/7 of the screen height", palette: [{ hex: "#C3E3FF", role: "sky" }, { hex: "#5b8c3a", role: "grass" }, { hex: "#f2a33a", role: "hero" }, { hex: "#d9434b", role: "danger" }, { hex: "notacolour", role: "dropped" }], shapes: "round and soft", materials: "flat cartoon fills", lighting: "bright midday", density: "sparse foreground, layered hills", ui: "chunky white numbers on rounded grass-green panels", motion: "bouncy squash and stretch" },
        setSearches: ["platformer side view cartoon"],
        assetSearches: [{ query: "fish", kind: "sprite", dim: "2d" }, { query: "coin sound", kind: "sfx", dim: "audio" }, { query: "cheerful music loop", kind: "music", dim: "audio" }],
      });
    }
    if (/Pick the game's assets from the search results and plan the build steps/.test(system)) {
      const labels = /IDEA: .*feature gate/i.test(user) ? ["Sky and ground", "Coinless polish"] : /IDEA: .*change test/i.test(user) ? ["Sky and ground", "Touch controls and polish"] : /IDEA: .*playtest test/i.test(user) ? ["Sky and ground", "Gappy level", "Playtest hero", "Touch controls and polish"] : /IDEA: .*(steering|stop-after|stop-now)/i.test(user) ? (/steering/i.test(user) ? STEER_STEPS : STEER_STEPS.slice(0, 3)) : /IDEA: .*doomed/i.test(user) ? ["Doomed step"] : /IDEA: .*restart/i.test(user) ? ["Sky and ground", "Slow art step", "First level"] : /IDEA: .*dungeon/i.test(user) ? ["Dungeon shell", "Dungeon hall", "Knight hero"] : MAIN_STEPS;
      return JSON.stringify({
        assets: [
          { key: "tiles", id: "kenney/new-platformer-pack/spritesheet-tiles", use: "ground, coins, flag" },
          { key: "chars", id: "kenney/new-platformer-pack/spritesheet-characters", use: "the hero" },
          { key: "enemies", id: "kenney/new-platformer-pack/spritesheet-enemies", use: "slimes" },
          { key: "bg", id: "kenney/new-platformer-pack/spritesheet-backgrounds", use: "sky and hills" },
          { key: "coin", id: "kenney/new-platformer-pack/sounds/sfx-coin", use: "pickup" },
          { key: "made-up", id: "kenney/not-a-real-pack/nothing", use: "dropped: not a library id" },
        ],
        steps: labels.map((l, i) => ({ id: `s${i + 1}`, label: l, goal: `Build: ${l}`, ...(STEP_FEATURES[l] ? { features: STEP_FEATURES[l] } : {}) })),
        features: /IDEA: .*feature gate/i.test(user) ? [FEATURES.coins, FEATURES.stomp] : /IDEA: .*cat collecting fish/.test(user) ? [FEATURES.runJump, FEATURES.coins, FEATURES.lives] : [],
        message: "Eight small steps, playable after each.",
        assetNotes: "New Platformer Pack only: 64 px tiles, hero at 0.75 scale, enemies 0.6, backgrounds at 2x.",
      });
    }
    if (/The person asked for a change to their game/.test(system)) {
      if (/meow/i.test(user)) return JSON.stringify({ message: "Adding a meow when the cat jumps.", steps: [{ id: "meow", label: "Meow sound", goal: "Add a meow sound" }], assetSearches: [{ query: "cat meow", kind: "sfx", dim: "audio" }] });
      // A change that adds a feature with a test (the old jump height fails it: the test proves the change).
      return JSON.stringify({ message: "Making the jump higher.", steps: [{ id: "jump", label: "Higher jump", goal: "Raise the jump speed in src/entities/player.js", features: ["high-jump"] }], features: [{ id: "high-jump", name: "Higher jump", priority: "core", how: "A held jump goes over five tiles high.", test: { steps: [{ key: "Space", holdMs: 700 }], expect: ["track.minY < start.player.y - 330"] } }], assetSearches: [] });
    }
    if (/HOW TO WRITE A STEP/.test(system)) {
      const label = /THIS STEP: (.+)/.exec(user)?.[1]?.trim() ?? "";
      const n = (counts.get(label) ?? 0) + 1;
      counts.set(label, n);
      if (label === "Higher jump") return `=== EDIT src/entities/player.js\n<<<<<<< FIND\n      body.setVelocityY(-1000);\n=======\n      body.setVelocityY(-1250);\n>>>>>>> REPLACE\n=== END\nNOTE: The cat jumps a lot higher now.`;
      if (label === "Meow sound") return `=== EDIT src/assets.js\n<<<<<<< FIND\n  coin: "kenney/new-platformer-pack/sounds/sfx-coin",\n=======\n  coin: "kenney/new-platformer-pack/sounds/sfx-coin",\n  meow: "platform-only/audio-arcade-sound-fx/animal-cat",\n>>>>>>> REPLACE\n=== END\nNOTE: The cat meows.`;
      const spec = STEPS[label];
      if (!spec) return null;
      if (spec.slow) await sleep(typeof spec.slow === "number" ? spec.slow : 15_000);
      if (spec.search && !/ASSET SEARCH RESULTS \(you asked\)/.test(user)) return JSON.stringify({ searches: [{ query: "grass platform tiles", kind: "spritesheet", dim: "2d" }, { set: "kenney/new-platformer-pack", query: "slime" }] });
      const repairing = /YOUR LAST ANSWER FAILED THESE CHECKS/.test(user);
      if (spec.breaks && (spec.always || !/FEATURE TESTS FAILED/.test(user))) return fileBlocks(breakFeature(loadStep(spec.fixture!), spec.breaks), `${label} is in.`);
      if (spec.broken === "always" || (spec.broken === "once" && !repairing)) {
        const files = spec.fixture ? loadStep(spec.fixture) : loadStep(1);
        files["src/scenes/game.js"] = files["src/scenes/game.js"].replace("create() {", "create() {{ // a typo the checks must catch");
        return fileBlocks(files, "This one is broken.");
      }
      // A review fix step keeps the game where it was (the last fixture served), the gap closed.
      const fixture = label === "Playtest fixes" ? lastFixture : spec.fixture!;
      if (!spec.three) lastFixture = fixture;
      const out = loadStep(fixture, spec.three ? FIX3D : FIX);
      return fileBlocks(spec.gappy ? gappy(out) : out, `${label} is in.`);
    }
    return null;
  };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", async () => {
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      const body = JSON.parse(raw) as { model: string; messages: Array<{ role: string; content: unknown }> };
      const rec = { system: textOf(body.messages.find((m) => m.role === "system")?.content), user: body.messages.filter((m) => m.role === "user").map((m) => textOf(m.content)).join("\n") };
      requests.push(rec);
      const content = await answer(rec.system, rec.user);
      if (content === null) {
        res.writeHead(500, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "no scripted answer", type: "mock_error", code: null } }));
      }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      const chunk = (delta: Record<string, unknown>, finish: string | null) => `data: ${JSON.stringify({ id: "chatcmpl-mock", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
      res.write(chunk({ role: "assistant", content: "" }, null));
      for (let i = 0; i < content.length; i += 2000) res.write(chunk({ content: content.slice(i, i + 2000) }, null));
      res.write(chunk({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
  });
  return {
    requests,
    listen: () => new Promise<void>((resolve) => server.listen(mockPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/* ───────────────────────── Helpers ───────────────────────── */

async function signIn(inst: Instance, email: string, name: string): Promise<{ agent: Agent; id: string; password: string }> {
  const password = `${name.toLowerCase()}-password-2026`;
  const user = await inst.db.user.create({ data: { email, name, emailVerified: new Date(), passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  const agent = inst.agent();
  const r = await agent.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${r.text}`);
  return { agent, id: user.id, password };
}

/** The game's newest job once it has ended; `count` = how many jobs the game must have by then (waits for a new one). */
async function waitJob(inst: Instance, gameId: string, ms = 300_000, count = 1): Promise<{ status: string; resumes: number; steps: unknown }> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
    if ((await inst.db.gameJob.count({ where: { gameId } })) < count) continue;
    const job = await inst.db.gameJob.findFirst({ where: { gameId }, orderBy: { startedAt: "desc" } });
    if (job && job.status !== "running") return { status: job.status, resumes: job.resumes, steps: job.steps };
  }
  throw new Error(`the job for game ${gameId} did not finish`);
}

/** Waits until the game's newest job has a step with this label in this status. */
async function waitStep(inst: Instance, gameId: string, label: string, status = "running", ms = 180_000): Promise<void> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) {
    const j = await inst.db.gameJob.findFirst({ where: { gameId }, orderBy: { startedAt: "desc" }, select: { steps: true, status: true } });
    if (((j?.steps ?? []) as Array<{ label: string; status: string }>).some((s) => s.label === label && s.status === status)) return;
    if (j && j.status !== "running") throw new Error(`the job ended (${j.status}) before step "${label}" was ${status}`);
  }
  throw new Error(`step "${label}" never got to ${status}`);
}

/** Waits for a chat message of this kind containing `text`. */
async function waitChat(inst: Instance, gameId: string, kind: string, text: string | RegExp, ms = 30_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) {
    const rows = await inst.db.gameChat.findMany({ where: { gameId, kind }, orderBy: { seq: "asc" } });
    const hit = rows.find((r) => (typeof text === "string" ? r.text.includes(text) : text.test(r.text)));
    if (hit) return hit;
  }
  throw new Error(`no ${kind} chat message with ${text}`);
}

async function browserFor(inst: Instance, a: Agent, opts: { locale?: string; width?: number; height?: number } = {}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser!.newContext({ viewport: { width: opts.width ?? 1440, height: opts.height ?? 900 }, deviceScaleFactor: 1 });
  await context.addCookies([...a.jar].map(([name, value]) => ({ name, value, url: inst.base })).concat(opts.locale ? [{ name: "nk-locale", value: opts.locale, url: inst.base }] : []));
  const page = await context.newPage();
  // A newer Chrome's scrollIntoView returns a promise; an effect that returns it would crash React (see check-effects).
  await page.addInitScript(() => {
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args: Parameters<typeof orig>) {
      orig.apply(this, args);
      return Promise.resolve() as unknown as void;
    };
  });
  return { context, page };
}

function canvasFrame(page: Page): Frame | undefined {
  return page.frames().find((f) => /\/api\/games\/[^/]+\/play\//.test(f.url()));
}

let browser: Browser | null = null;

/* ───────────────────────── The run ───────────────────────── */

async function main() {
  const { ok, checks } = checker();
  const mock = createMock();
  await mock.listen();
  let inst: Instance | null = null;
  try {
    inst = await startInstance({
      port,
      buildDir: `.next-e2e-games-${port}`,
      env: { PORT: String(port), OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`, OPENAI_SCAFFOLD_MODEL: "mock-model", OPENAI_EDIT_MODEL: "mock-model", AI_CONTEXT_WINDOW: "200000", AI_VISION: "on" },
    });
    await installOperator(inst);
    browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
    const alice = await signIn(inst, "alice@example.invalid", "Alice");
    const bob = await signIn(inst, "bob@example.invalid", "Bob");
    const charges = async (userId: string) => inst!.db.aiUsage.count({ where: { userId, kind: "game" } });

    /** Steer while building (E2E_ONLY=steer runs only this). */
    const live: Instance = inst;
    /** The design playbook's playtester (E2E_ONLY=playtest runs only this). */
    const playtestSection = async () => {
      const inst = live;
      console.log("The playtester");
      const allCharges = async () => inst.db.aiUsage.count({ where: { userId: alice.id } });
      const c0 = await allCharges();
      const mark = mock.requests.length;
      const r = await alice.agent.post("/api/games", { prompt: "a playtest test game with a big gap", engine: "phaser-2d" });
      ok("playtest build starts", r.status === 200, r.text);
      const gid = r.json.game.id as string;
      const job = await waitJob(inst, gid, 400_000);
      const steps = job.steps as Array<{ label: string; status: string; added?: boolean; kind?: string }>;
      ok("the build finished with a review fix step after the level, and two at the end", job.status === "done" && steps.map((s) => s.label).join("|") === "Sky and ground|Gappy level|Playtest fixes|Playtest hero|Touch controls and polish|Playtest fixes|Playtest fixes" && steps.filter((s) => s.kind === "playtest-fix").length === 3, steps.map((s) => s.label));
      const chat = await inst.db.gameChat.findMany({ where: { gameId: gid }, orderBy: { seq: "asc" } });
      const found = chat.find((c) => /^Playtest after step 2: /.test(c.text));
      ok("the chat says what the review found (gameplay and looks) and that it is being fixed", Boolean(found && /the goal can't be reached/.test(found.text) && /MOCK-VIS0 the hero is too small/.test(found.text) && /Fixing that now/.test(found.text) && !/\.;/.test(found.text)), found?.text);
      ok("the re-check after the fix says it's fixed", chat.some((c) => c.text === "Playtest: fixed. The game passes the checks again."), chat.map((c) => c.text));
      const endLines = chat.filter((c) => /^Playtest after step (5|6|7)/.test(c.text)).map((c) => c.text);
      ok("the end review loop: review → fix → review → fix → clean (3 end reviews at most)", endLines.length === 3 && /^Playtest after step 5: .*MOCK-VIS1/.test(endLines[0]) && /^Playtest after step 6: .*MOCK-VIS2/.test(endLines[1]) && /^Playtest (after step 7: (?!.*MOCK-VIS)(?!.*Fixing)|: fixed)/.test(endLines[2]), endLines);
      const endReviews = mock.requests.slice(mark).filter((q) => /You are the game studio's playtester/.test(q.system) && /phone-844x390/.test(q.user));
      ok("the end reviews looked at the desktop (1600×900) and phone screenshots against the visual spec and the full standard", endReviews.length === 3 && endReviews.every((q) => /spawn-1600x900/.test(q.user) && /VISUAL SPEC[\s\S]*Palette: #c3e3ff sky/.test(q.system) && /SELF-REVIEW/.test(q.system)), endReviews.length);
      const fixGoal = mock.requests.slice(mark).find((q) => /THIS STEP: Playtest fixes/.test(q.user) && /MOCK-VIS1/.test(q.user));
      ok("a visual fix step's goal carries the visible problems", Boolean(fixGoal && /most consequential VISIBLE problems[\s\S]*MOCK-VIS1 the hero is too small[\s\S]*fix: src\/entities\/player\.js/.test(fixGoal.user)));
      const review = mock.requests.slice(mark).find((q) => /You are the game studio's playtester/.test(q.system));
      ok("the AI review got the code checks' facts and the stage's checklist", Boolean(review && /A3 path search: goal NOT reachable/.test(review.user) && /PT-10 \[blocker\]/.test(review.user) && /- PT-10 \[blocker\]/.test(review.system) && !/- PT-60 /.test(review.system) && /GENRE CARD[\s\S]*# Platformer/.test(review.system)), review?.user.slice(0, 800));
      const fix = mock.requests.slice(mark).find((q) => /HOW TO WRITE A STEP/.test(q.system) && /THIS STEP: Playtest fixes/.test(q.user));
      ok("the fix step's prompt names the blocker", Boolean(fix && /GOAL: Fix what the review found[\s\S]*Gameplay BLOCKERS:[\s\S]*PT-10 \[blocker\] goal not reachable/.test(fix.user)), fix?.user.slice(-1500));
      ok("the checklist notes (should-fix) reach the next step", Boolean(fix && /PLAYTEST NOTES[\s\S]*PT-17 \[should-fix\]/.test(fix.user) && /PLAYTEST NOTES[\s\S]*PT-12 \[should-fix\]/.test(fix.user)), /PLAYTEST NOTES[\s\S]{0,800}/.exec(fix?.user ?? "")?.[0]);
      const hero = mock.requests.slice(mark).find((q) => /THIS STEP: Playtest hero/.test(q.user));
      ok("…and are used up once a step has had them", Boolean(hero && !/PT-17/.test(hero.user)));
      const fixedV = await inst.db.gameVersion.findFirst({ where: { gameId: gid, stepLabel: "Playtest fixes" }, orderBy: { seq: "asc" } });
      const gapV = await inst.db.gameVersion.findFirst({ where: { gameId: gid, stepLabel: "Gappy level" } });
      ok("the fix step saved the level without the hole", (gapV?.files as Record<string, string>)["src/levels.js"] !== loadStep(3)["src/levels.js"] && (fixedV?.files as Record<string, string>)["src/levels.js"] === loadStep(3)["src/levels.js"]);
      ok("the playtester charges nothing: still one AI action", (await allCharges()) === c0 + 1, { c0, now: await allCharges() });
      const g = await inst.db.gameProject.findUniqueOrThrow({ where: { id: gid } });
      ok("the genre was matched and kept on the game", g.genreId === "platformer", g.genreId);
    };
    /** The feature end gate (E2E_ONLY=gate runs only this). */
    const gateSection = async () => {
      const inst = live;
      console.log("The feature end gate");
      const r = await alice.agent.post("/api/games", { prompt: "a feature gate test game", engine: "phaser-2d" });
      ok("gate build starts", r.status === 200, r.text);
      const gid = r.json.game.id as string;
      const job = await waitJob(inst, gid, 400_000);
      const steps = job.steps as Array<{ label: string; status: string; kind?: string; features?: string[] }>;
      ok("a core feature still failing at the end gets a \"Feature fixes\" step", job.status === "done" && steps.map((st) => st.label).join("|") === "Sky and ground|Coinless polish|Feature fixes" && steps[2].kind === "feature-fix" && steps[2].features?.join() === "collect-coins", steps);
      const coinless = mock.requests.filter((q) => /HOW TO WRITE A STEP/.test(q.system) && /THIS STEP: Coinless polish/.test(q.user));
      ok("…after the step's own repair didn't fix it (one repair, then kept with the feature failing)", coinless.length === 2 && /FEATURE TESTS FAILED[\s\S]*NEW "Collect coins"/.test(coinless[1].user));
      const fixCall = mock.requests.find((q) => /HOW TO WRITE A STEP/.test(q.system) && /THIS STEP: Feature fixes/.test(q.user));
      ok("the fix step's goal carries the failed test's output", Boolean(fixCall && /GOAL: Make these CORE features work[\s\S]*"Collect coins" \(collect-coins\)[\s\S]*last run: pressed: new game, hold ArrowRight[\s\S]*NK\.run\.coins >= 1` → false \(FAILED\)/.test(fixCall.user) && !/"Stomp slimes" \(stomp-slimes\)/.test(/GOAL:[\s\S]*?\n\n/.exec(fixCall.user)?.[0] ?? "")), /GOAL:[\s\S]{0,900}/.exec(fixCall?.user ?? "")?.[0]);
      const chat = (await inst.db.gameChat.findMany({ where: { gameId: gid }, orderBy: { seq: "asc" } })).map((c) => c.text);
      ok("the chat: per-step feature lines, the gate, and an honest final message", chat.includes("Features: 0 passing, 2 failing (Collect coins, Stomp slimes).") && chat.includes("Core features that don't work yet: Collect coins. Adding a step to fix them.") && chat.includes("Features: 1 passing, 1 failing (Stomp slimes).") && chat.some((c) => /is ready to play[\s\S]*The core feature passes its test\. Extras that don't work yet: Stomp slimes\./.test(c)), chat);
      const g = await inst.db.gameProject.findUniqueOrThrow({ where: { id: gid } });
      const fs = (g.plan as { features: Array<{ id: string; status: string }> }).features;
      ok("…and the game's features: the core one passing, the extra failing", fs.map((f) => `${f.id}:${f.status}`).join() === "collect-coins:passing,stomp-slimes:failing", fs);
      const gv = await inst.db.gameVersion.findMany({ where: { gameId: gid }, orderBy: { seq: "asc" }, select: { stepLabel: true, features: true } });
      ok("the failing version is kept with its status (the game itself worked)", (gv.find((v) => v.stepLabel === "Coinless polish")?.features as Array<{ status: string }>).every((f) => f.status === "failing"), gv);
      // The plan card on a phone and in Arabic: the status chips (icon + word, never colour alone).
      for (const [loc, w, h] of [["en", 1440, 900], ["en", 390, 844], ["ar", 1440, 900], ["ar", 390, 844]] as const) {
        const { context, page: p } = await browserFor(inst, alice.agent, { locale: loc, width: w, height: h });
        await p.goto(`${inst.base}/games/${gid}`, { waitUntil: "domcontentloaded" });
        await p.waitForSelector("[data-testid=plan-card]", { timeout: 60_000 });
        if (!(await p.locator("[data-testid=plan-card]").getAttribute("open").catch(() => null))) await p.locator("[data-testid=plan-card] summary").click();
        await p.waitForSelector("[data-testid=features] [data-testid=feature]", { timeout: 20_000 });
        const items = await p.locator("[data-testid=features] [data-testid=feature]").evaluateAll((els) => els.map((e) => ({ status: e.getAttribute("data-status"), text: (e as HTMLElement).innerText, icon: !!e.querySelector("svg") })));
        ok(`the plan card shows the features with status chips (${loc} ${w})`, items.length === 2 && items[0].status === "passing" && items[1].status === "failing" && items.every((i) => i.icon) && (loc === "ar" || (/Passing/.test(items[0].text) && /Failing/.test(items[1].text) && /track\.max\.score >= 99999/.test(items[1].text))), items);
        if (loc === "ar") ok(`…right-to-left in Arabic (${w})`, (await p.evaluate(() => document.documentElement.dir)) === "rtl");
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(`…with no sideways scrolling (${loc} ${w})`, overflow <= 1, overflow);
        await sleep(600);
        await p.locator("[data-testid=plan-card]").screenshot({ path: path.join(SHOTS, `features-card-${loc}-${w}.png`) });
        await p.screenshot({ path: path.join(SHOTS, `features-${loc}-${w}.png`) });
        await context.close();
      }
    };
    const steerSection = async () => {
      const inst = live;
      console.log("Steer while building");
      let r: Awaited<ReturnType<Agent["get"]>>;
      const allCharges = async () => inst!.db.aiUsage.count({ where: { userId: alice.id } });
      const c2 = await allCharges();
      // A dev server compiles a route on its first call: compile the notes route first, so "at once" measures the route, not the compiler.
      await alice.agent.post("/api/games/not-a-game/notes", { text: "warm-up" });
      r = await alice.agent.post("/api/games", { prompt: "a steering test game", engine: "phaser-2d" });
      ok("steering build starts", r.status === 200, r.text);
      const steer = r.json.game.id as string;
      const { context, page: sp } = await browserFor(inst, alice.agent);
      await sp.goto(`${inst.base}/games/${steer}`, { waitUntil: "domcontentloaded" });
      await sp.waitForSelector("[data-testid=game-canvas]", { timeout: 120_000 });
      await waitStep(inst, steer, "Steer slow art");
      const mark = mock.requests.length;
      // A note from the workspace while the step runs: the composer stays open.
      await sp.waitForSelector("[data-testid=stop-controls]", { timeout: 20_000 });
      ok("the composer stays enabled while building", !(await sp.locator("#game-prompt").isDisabled()) && (await sp.locator("#game-prompt").getAttribute("placeholder"))?.includes("Steer the build") === true);
      const sentAt = Date.now();
      await sp.fill("#game-prompt", "make the hero orange");
      await sp.keyboard.press("Enter");
      await sp.waitForFunction(() => [...document.querySelectorAll("[aria-live=polite] p")].some((p) => p.textContent === "make the hero orange"), null, { timeout: 5_000 });
      ok("the note shows in the chat at once", Date.now() - sentAt < 5_000, Date.now() - sentAt);
      await sp.waitForFunction(() => [...document.querySelectorAll("[aria-live=polite] p")].some((p) => /MOCK-REPLY Noted: make the hero orange/.test(p.textContent ?? "")), null, { timeout: 20_000 });
      ok("…and gets an immediate reply while the step still runs", ((await inst.db.gameJob.findFirst({ where: { gameId: steer }, orderBy: { startedAt: "desc" } }))!.steps as Array<{ label: string; status: string }>).find((s) => s.label === "Steer slow art")?.status === "running");
      const replyCall = mock.requests.slice(mark).find((q) => /chatting with the person while the studio's AI developer/.test(q.system) && /NOTE: make the hero orange/.test(q.user));
      ok("the reply call saw the plan, the running step and the note", Boolean(replyCall && /STEPS:\n1\. Sky and ground \[done\][\s\S]*Steer slow art \[RUNNING NOW\]/.test(replyCall.user) && /RUNNING NOW: step 2 of 4/.test(replyCall.user)), replyCall?.user.slice(0, 600));
      await sp.screenshot({ path: path.join(SHOTS, "steer-note-en-1440.png") });
      // A question: answered, never built, and no code in the chat.
      r = await alice.agent.post(`/api/games/${steer}/notes`, { text: "which step are you on?" });
      ok("a question note is accepted (200)", r.status === 200 && r.json.note?.id, r.text);
      const qReply = await waitChat(inst, steer, "assistant", "MOCK-REPLY We're on step 2");
      ok("the question is answered, with no code in the chat", !/```|NK\.run/.test(qReply.text), qReply.text);
      // A note the build rule refuses.
      const refusalsBefore = await inst.db.buildRefusal.count({ where: { userId: alice.id, kind: "game" } });
      r = await alice.agent.post(`/api/games/${steer}/notes`, { text: "MOCK-JUDGE-REFUSE turn the game into a place where people publish sites" });
      ok("a note the rule will refuse is still taken (200)", r.status === 200, r.text);
      const refusal = await waitChat(inst, steer, "error", "I can’t build apps similar to", 20_000).catch(() => null);
      const refusedNote = await inst.db.gameNote.findFirst({ where: { gameId: steer, text: { contains: "MOCK-JUDGE-REFUSE" } } });
      ok("the refused note gets the standard refusal sentence and is not applied", Boolean(refusal) && refusedNote?.status === "refused" && (await inst.db.buildRefusal.count({ where: { userId: alice.id, kind: "game" } })) === refusalsBefore + 1, { refusal: refusal?.text, status: refusedNote?.status });
      // A change the plan doesn't cover: the checklist grows.
      r = await alice.agent.post(`/api/games/${steer}/notes`, { text: "add a jumping frog enemy" });
      ok("the frog note is taken", r.status === 200, r.text);
      await waitChat(inst, steer, "assistant", "MOCK-REPLY Noted: add a jumping frog enemy");
      await sp.waitForFunction(() => document.querySelectorAll("[data-testid=step-list] li").length === 5 && !!document.querySelector("[data-testid=step-added]"), null, { timeout: 60_000 });
      ok("the plan was revised: a step for the frog, shown live in the checklist", true);
      await sp.screenshot({ path: path.join(SHOTS, "steer-plan-grew-en-1440.png") });
      await waitStep(inst, steer, "First level", "done");
      const firstLevel = mock.requests.slice(mark).find((q) => /HOW TO WRITE A STEP/.test(q.system) && /THIS STEP: First level/.test(q.user));
      ok("the next step's prompt carries the note as an owner instruction", Boolean(firstLevel && /OWNER NOTES[\s\S]*DO IN THIS STEP: make the hero orange/.test(firstLevel.user) && /planned for a later step \(step 5, "Frog enemy"\)[^\n]*add a jumping frog enemy/.test(firstLevel.user)), firstLevel?.user.slice(-900));
      ok("questions and refused notes never reach a step", !mock.requests.some((q) => /HOW TO WRITE A STEP/.test(q.system) && /(which step are you on|MOCK-JUDGE-REFUSE)/.test(q.user)));
      ok("the revision call ran for the frog note", mock.requests.slice(mark).some((q) => /sent NOTES/.test(q.system) && /add a jumping frog enemy/.test(q.user)));
      const hero = await inst.db.gameNote.findFirst({ where: { gameId: steer, text: "make the hero orange" } });
      ok("the note is marked applied in step 3", hero?.status === "applied" && hero.appliedStep === 3 && hero.appliedLabel === "First level", hero);
      await sp.waitForFunction(() => [...document.querySelectorAll("[data-testid=note-status][data-status=applied]")].some((e) => /Applied in step 3/.test(e.textContent ?? "")), null, { timeout: 20_000 });
      ok("the chat shows \"Applied in step 3\"", true);
      // A note during the last step: a follow-up step.
      await waitStep(inst, steer, "Frog enemy");
      let frogCall: Rec | undefined;
      for (let k = 0; k < 40 && !frogCall; k++, await sleep(250)) frogCall = mock.requests.find((q) => /HOW TO WRITE A STEP/.test(q.system) && /THIS STEP: Frog enemy/.test(q.user));
      ok("the frog step does the frog note", Boolean(frogCall && /DO IN THIS STEP: add a jumping frog enemy/.test(frogCall.user) && /already done in an earlier step, keep it true: make the hero orange/.test(frogCall.user)), frogCall?.user.slice(-700));
      r = await alice.agent.post(`/api/games/${steer}/notes`, { text: "make the coins spin" });
      ok("a note during the last step is taken", r.status === 200, r.text);
      const steerJob = await waitJob(inst, steer, 300_000);
      const steerSteps = steerJob.steps as Array<{ label: string; status: string; added?: boolean }>;
      ok("…and gets a follow-up step, so nothing is ignored", steerJob.status === "done" && steerSteps.length >= 6 && steerSteps[5].label === "Your notes from the chat" && steerSteps[5].added === true && steerSteps.every((s) => s.status === "done"), steerSteps);
      const coins = await inst.db.gameNote.findFirst({ where: { gameId: steer, text: "make the coins spin" } });
      ok("the late note was applied in the follow-up step", coins?.status === "applied" && coins.appliedStep === 6, coins);
      const steerPlan = (await inst.db.gameProject.findUniqueOrThrow({ where: { id: steer } })).plan as { features?: Array<{ id: string; status: string }> };
      ok("a note that adds a mechanic adds a feature with a test (the revision call), built and passing in its step", steerPlan.features?.map((f) => `${f.id}:${f.status}`).join() === "frog-lives:passing" && (steerSteps.find((st) => st.label === "Frog enemy") as { features?: string[] } | undefined)?.features?.join() === "frog-lives", { features: steerPlan.features, steps: steerSteps });
      ok("the follow-up step's prompt carries it", mock.requests.some((q) => /THIS STEP: Your notes from the chat/.test(q.user) && /DO IN THIS STEP: make the coins spin/.test(q.user)));
      const sv = await inst.db.gameVersion.findMany({ where: { gameId: steer }, orderBy: { seq: "asc" } });
      // The follow-up is the build's last step, so the end review runs after it (the mock's step has no touch controls: a fix step).
      ok("every step, the added ones too, was saved as a version (then the end review's fix)", sv.map((v) => v.stepLabel).join("|") === ["start", ...STEER_STEPS, "Frog enemy", "Your notes from the chat", "Playtest fixes"].join("|"), sv.map((v) => v.stepLabel));
      ok("notes, replies and revisions charge nothing: still one AI action", (await allCharges()) === c2 + 1, { before: c2, after: await allCharges() });
      await sleep(1500);
      await sp.screenshot({ path: path.join(SHOTS, "steer-done-en-1440.png") });
      await context.close();
      r = await alice.agent.post(`/api/games/${steer}/notes`, { text: "one more thing" });
      ok("no build running: a note is 409 not_running (the workspace sends it as a change)", r.status === 409 && r.json.code === "not_running", r.text);
      // Phone and right-to-left layouts of the steering controls.
      r = await alice.agent.post(`/api/games/${steer}/build`, { prompt: "make the jump higher" });
      for (const [loc, w, h] of [["en", 390, 844], ["ar", 1440, 900]] as const) {
        const { context: c, page: p } = await browserFor(inst, alice.agent, { locale: loc, width: w, height: h });
        await p.goto(`${inst.base}/games/${steer}`, { waitUntil: "domcontentloaded" });
        await p.waitForSelector("[data-testid=game-canvas]", { state: "attached", timeout: 60_000 });
        await sleep(1500);
        await p.screenshot({ path: path.join(SHOTS, `steer-${loc}-${w}.png`) });
        await c.close();
      }
      await waitJob(inst, steer, 120_000, 2);

      // "Stop after this step".
      r = await alice.agent.post("/api/games", { prompt: "a stop-after test game", engine: "phaser-2d" });
      const after = r.json.game.id as string;
      await waitStep(inst, after, "Steer slow art");
      r = await alice.agent.patch(`/api/games/${after}/build`, { stopAfterStep: true });
      ok("stop after this step: accepted", r.status === 200 && r.json.running === true, r.text);
      const afterJob = await waitJob(inst, after, 120_000);
      const av = await inst.db.gameVersion.findMany({ where: { gameId: after }, orderBy: { seq: "asc" } });
      ok("…the running step finished and was saved, then the job stopped", afterJob.status === "cancelled" && av.map((v) => v.stepLabel).join("|") === "start|Sky and ground|Steer slow art", { status: afterJob.status, versions: av.map((v) => v.stepLabel) });
      ok("…and the chat says so", (await inst.db.gameChat.count({ where: { gameId: after, text: { contains: "Stopped after step 2" } } })) === 1);

      // "Stop now": the running AI call is cut off, the last good version stays.
      const c3 = await allCharges();
      r = await alice.agent.post("/api/games", { prompt: "a stop-now test game", engine: "phaser-2d" });
      const now = r.json.game.id as string;
      await waitStep(inst, now, "Steer slow art");
      await sleep(1500);
      const stopAt = Date.now();
      r = await alice.agent.del(`/api/games/${now}/build`);
      const nowJob = await waitJob(inst, now, 60_000);
      const took = Date.now() - stopAt;
      ok("stop now cancels the running step at once (the AI call is aborted, not waited for)", r.status === 200 && nowJob.status === "cancelled" && took < 8_000, { took, status: nowJob.status });
      const nv = await inst.db.gameVersion.findMany({ where: { gameId: now }, orderBy: { seq: "asc" } });
      const ng = await inst.db.gameProject.findUniqueOrThrow({ where: { id: now } });
      ok("…the last good version stays the game", nv.map((v) => v.stepLabel).join("|") === "start|Sky and ground" && JSON.stringify(ng.files) === JSON.stringify(nv[1].files) && ng.status === "ready", nv.map((v) => v.stepLabel));
      ok("…refund rules as before: a step was delivered, so the action stays used", (await allCharges()) === c3 + 1);
        };
    if (ONLY === "change") {
      const r0 = await alice.agent.post("/api/games", { prompt: "a change test game", engine: "phaser-2d" });
      const gid = r0.json.game.id as string;
      await waitJob(inst, gid, 300_000);
      const { context: c2, page: p2 } = await browserFor(inst, alice.agent);
      await p2.addInitScript(() => {
        (window as unknown as { __nk: unknown[] }).__nk = [];
        window.addEventListener("message", (e) => {
          if (e.data && typeof e.data === "object" && typeof e.data.type === "string" && e.data.type.startsWith("nk-game:")) (window as unknown as { __nk: unknown[] }).__nk.push({ t: Date.now(), ...e.data });
        });
      });
      await p2.goto(`${inst.base}/games/${gid}`, { waitUntil: "domcontentloaded" });
      await p2.waitForSelector("[data-testid=game-canvas]");
      let st: unknown = null;
      for (let i = 0; i < 60 && st !== "play"; i++) { st = await canvasFrame(p2)?.evaluate(() => (window as unknown as { NK?: { state?: { current?: string } } }).NK?.state?.current).catch(() => "x"); if (st !== "play") await sleep(500); }
      console.log("state before the change:", st);
      await sleep(Number(process.env.E2E_IDLE ?? 0));
      console.log("state after idling:", await canvasFrame(p2)?.evaluate(() => { const N = (window as unknown as { NK: { state: { current: string }; run: unknown; errors: unknown[] } }).NK; return JSON.stringify({ s: N.state.current, run: N.run, errors: N.errors }); }).catch((e) => String(e)));
      await p2.fill("#game-prompt", "make the jump higher");
      await p2.keyboard.press("Enter");
      await waitJob(inst, gid, 300_000, 2);
      await sleep(4000);
      const msgs = (await p2.evaluate(() => (window as unknown as { __nk: Array<{ type: string; scene?: string; state?: string }> }).__nk)) as Array<{ type: string; scene?: string; state?: string }>;
      const at = msgs.findIndex((m) => m.type === "nk-game:patched");
      console.log(JSON.stringify(msgs.slice(Math.max(0, at - 3), at + 4).map((m) => ({ ...m, files: undefined, errors: undefined, stats: undefined }))));
      await c2.close();
      return;
    }
    if (ONLY === "playtest") {
      await playtestSection();
      console.log(`\nAll ${checks.length} playtest checks passed.`);
      return;
    }
    if (ONLY === "gate") {
      await gateSection();
      console.log(`\nAll ${checks.length} feature gate checks passed. Screenshots in ${SHOTS}`);
      return;
    }
    if (ONLY === "steer") {
      await steerSection();
      console.log(`\nAll ${checks.length} steering checks passed. Screenshots in ${SHOTS}`);
      return;
    }

    /* ── Routes that serve the engine and the library ── */
    console.log("Engine and library routes");
    let r = await alice.agent.get("/nk-engine/phaser-2d/1.0.0/phaser.min.js");
    ok("engine file served", r.status === 200 && /javascript/.test(String(r.headers["content-type"])) && r.headers["access-control-allow-origin"] === "*" && /immutable/.test(String(r.headers["cache-control"])), r.status);
    r = await alice.agent.get("/nk-engine/three-3d/1.0.0/decoders/draco/draco_decoder.wasm");
    ok("wasm served as application/wasm", r.status === 200 && r.headers["content-type"] === "application/wasm");
    for (const p of ["/nk-engine/phaser-2d/1.0.0/ENGINE-CARD.md", "/nk-engine/phaser-2d/1.0.0/../../three-3d/1.0.0/kit.json", "/nk-engine/nope/1.0.0/x.js", "/game-assets/catalog.jsonl", "/game-assets/packs.json", "/game-assets/_index/assets.db"]) {
      r = await alice.agent.get(p);
      ok(`not served: ${p}`, r.status === 404, r.status);
    }
    r = await alice.agent.get("/game-assets/kenney/new-platformer-pack/spritesheet-tiles.png");
    ok("library asset served with CORS", r.status === 200 && r.headers["content-type"] === "image/png" && r.headers["access-control-allow-origin"] === "*");

    /* ── Clarify ── */
    r = await alice.agent.post("/api/games/clarify", { prompt: "something vague" });
    ok("vague idea gets quick questions", r.status === 200 && r.json.questions?.length === 1, r.json);

    /* ── The build rule ── */
    console.log("The build rule");
    const before = await charges(alice.id);
    r = await alice.agent.post("/api/games", { prompt: "Build me a clone of NullKode as a game", engine: "phaser-2d" });
    ok("fixed rule refuses (422 build_not_allowed)", r.status === 422 && r.json.code === "build_not_allowed", r.text);
    r = await alice.agent.post("/api/games", { prompt: "A game MOCK-JUDGE-REFUSE where players publish sites", engine: "phaser-2d" });
    ok("the AI check refuses (422)", r.status === 422 && r.json.code === "build_not_allowed", r.text);
    ok("refusals charge nothing and leave no game", (await charges(alice.id)) === before && (await inst.db.gameProject.count({ where: { ownerId: alice.id } })) === 0);
    ok("refusals are recorded as kind game", (await inst.db.buildRefusal.count({ where: { userId: alice.id, kind: "game" } })) === 2);

    /* ── The main build, watched in the workspace ── */
    console.log("Build: plan → steps → versions → live canvas");
    r = await alice.agent.post("/api/games", { prompt: "a simple 2D platformer about a cat collecting fish", engine: "phaser-2d" });
    ok("build starts", r.status === 200 && r.json.jobId && r.json.game?.id, r.text);
    const gameId: string = r.json.game.id;
    ok("charged one AI action", (await charges(alice.id)) === before + 1);
    const { context: ctx1, page } = await browserFor(inst, alice.agent);
    await page.addInitScript(() => {
      (window as unknown as { __nk: unknown[] }).__nk = [];
      window.addEventListener("message", (e) => {
        if (e.data && typeof e.data === "object" && typeof e.data.type === "string" && e.data.type.startsWith("nk-game:") && e.data.type !== "nk-game:status") (window as unknown as { __nk: unknown[] }).__nk.push(e.data);
      });
    });
    await page.goto(`${inst.base}/games/${gameId}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid=game-canvas]", { timeout: 120_000 });
    // Watch the canvas while the job runs: every step the game reports as patched, with a screenshot once it plays again.
    const seen: string[] = [];
    const patchedSteps = async () => ((await page.evaluate(() => (window as unknown as { __nk: Array<{ type: string; step?: string }> }).__nk).catch(() => [])) as Array<{ type: string; step?: string }>).filter((m) => m.type === "nk-game:patched").map((m) => m.step ?? "");
    const playing = async () => {
      for (let i = 0; i < 40; i++) {
        const st = await canvasFrame(page)?.evaluate(() => (window as unknown as { NK?: { state?: { current?: string } } }).NK?.state?.current ?? null).catch(() => null);
        if (st === "play") return true;
        await sleep(250);
      }
      return false;
    };
    for (const end = Date.now() + 400_000; Date.now() < end; await sleep(700)) {
      for (const step of await patchedSteps()) {
        if (!step || seen.includes(step)) continue;
        seen.push(step);
        await playing();
        await sleep(1000);
        await page.locator("[data-testid=game-canvas]").screenshot({ path: path.join(SHOTS, `mock-canvas-${String(seen.length).padStart(2, "0")}.png`) }).catch(() => {});
      }
      const job = await inst.db.gameJob.findFirst({ where: { gameId }, orderBy: { startedAt: "desc" }, select: { status: true } });
      if (job && job.status !== "running" && (seen.includes(MAIN_STEPS[MAIN_STEPS.length - 1]) || job.status !== "done")) break;
    }
    const job1 = await waitJob(inst, gameId);
    ok("the build finished", job1.status === "done", job1);
    const versions = await inst.db.gameVersion.findMany({ where: { gameId }, orderBy: { seq: "asc" } });
    ok("a version per step (plus the empty start)", versions.length === MAIN_STEPS.length + 1 && versions.slice(1).map((v) => v.stepLabel).join("|") === MAIN_STEPS.join("|"), versions.map((v) => v.stepLabel));
    ok("every step passed the headless check, with a screenshot", versions.slice(1).every((v) => (v.check as { ok?: boolean; ran?: boolean } | null)?.ok === true && (v.check as { ran?: boolean }).ran === true && v.shot && v.shot.length > 1000), versions.map((v) => v.check));
    const game = await inst.db.gameProject.findUniqueOrThrow({ where: { id: gameId } });
    ok("the plan was saved with the AI's title and only real asset ids", game.name === "Whisker Dash" && Array.isArray((game.plan as { assets?: unknown[] }).assets) && !(game.plan as { assets: Array<{ id: string }> }).assets.some((a) => a.id.includes("not-a-real-pack")), game.plan);
    const lock = JSON.parse((game.files as Record<string, string>)["assets.lock.json"]);
    ok("assets.lock.json written from the ids used (+ the kit's touch art)", lock["kenney/new-platformer-pack/spritesheet-tiles"] && lock["kenney/mobile-controls/icon-jump"]?.files, Object.keys(lock));
    ok("the canvas showed the game grow step by step (patches)", seen.length >= 4 && seen[seen.length - 1] === "Touch controls and polish", seen);
    const msgs = (await page.evaluate(() => (window as unknown as { __nk: Array<{ type: string; mode?: string; ok?: boolean }> }).__nk)) as Array<{ type: string; mode?: string; ok?: boolean }>;
    const patched = msgs.filter((m) => m.type === "nk-game:patched");
    const reloads = patched.filter((m) => m.mode === "reload").length;
    ok("patches reached the canvas and applied", patched.length >= 3 && patched.every((m) => m.ok !== false), patched);
    console.log(`    (patches: ${patched.length}, hot: ${patched.filter((m) => m.mode === "hot").length}, reload: ${reloads})`);
    const frame = canvasFrame(page)!;
    const nk = await frame.evaluate(() => {
      const N = (window as unknown as { NK: { state: { current: string }; errors: unknown[]; files: () => Array<{ path: string }> } }).NK;
      return { state: N.state.current, errors: N.errors.length, errorList: (N.errors as Array<{ where?: string; message?: string }>).map((e) => `${e.where}: ${e.message}`), files: N.files().map((f) => f.path) };
    });
    ok("the canvas runs the final game with no errors", nk.errors === 0 && nk.files.includes("src/entities/enemies.js") && seen[seen.length - 1] === "Touch controls and polish", { nk, seen });
    ok("the workspace shows the step", (await page.locator("[data-testid=canvas-step]").innerText()).includes("Touch controls and polish"));
    // The search round trip and the repair, as the AI saw them.
    const stepCalls = mock.requests.filter((q) => /HOW TO WRITE A STEP/.test(q.system));
    ok("the AI asked for assets and got library results", stepCalls.some((q) => /THIS STEP: Art and backdrop/.test(q.user) && /ASSET SEARCH RESULTS \(you asked\):[\s\S]*kenney\/new-platformer-pack/.test(q.user)));
    ok("the broken step was caught and repaired once", stepCalls.some((q) => /THIS STEP: Hero and controls/.test(q.user) && /YOUR LAST ANSWER FAILED THESE CHECKS:[\s\S]*SyntaxError/.test(q.user)) && versions.some((v) => v.stepLabel === "Hero and controls"));
    ok("plan searches went to the library", mock.requests.some((q) => /Pick the game's assets/.test(q.system) && /SEARCH RESULTS:[\s\S]*\|/.test(q.user)));

    /* ── Planned features with real tests ── */
    console.log("Planned features");
    type F = { id: string; name: string; status: string; priority: string; rewritten?: boolean; test?: { expect: string[] } | null; last?: { text: string } };
    const planFeatures = (game.plan as { features?: F[] }).features ?? [];
    ok("the plan has its features with tests (3, one extra)", planFeatures.length === 3 && planFeatures.filter((f) => f.priority === "extra").length === 1 && planFeatures.every((f) => f.test !== undefined), planFeatures);
    ok("the plan prompt asked for features with tests (format + read-only rules)", mock.requests.some((q) => /Pick the game's assets/.test(q.system) && /"features": \[\{"id": "kebab-id"/.test(q.system) && /FEATURE TESTS \(each runs in a headless browser/.test(q.system) && /READ-ONLY JavaScript/.test(q.system)));
    const job1Steps = job1.steps as Array<{ label: string; features?: string[] }>;
    ok("every step lists the features it builds; every core feature has a step", job1Steps.find((st) => st.label === "Hero and controls")?.features?.join() === "run-jump" && job1Steps.find((st) => st.label === "Fish and score")?.features?.join() === "collect-coins", job1Steps.map((st) => [st.label, st.features]));
    const stepCall = (label: string) => stepCalls.filter((q) => new RegExp(`THIS STEP: ${label}`).test(q.user));
    const fish = stepCall("Fish and score");
    ok("the step prompt names the feature to build with its test, and the probe rule", Boolean(fish[0] && /BUILD IN THIS STEP: "Collect coins" \(collect-coins, core\)[\s\S]*Test: \{"steps"/.test(fish[0].user) && /keep working: "Run and jump" \[passing\]/.test(fish[0].user) && /TEST PROBES/.test(fish[0].system)), fish[0]?.user.slice(0, 200));
    ok("a step that breaks its new feature: caught by the test, repaired once with the test output", fish.length === 2 && /FEATURE TESTS FAILED[\s\S]*NEW "Collect coins" \(collect-coins\)[\s\S]*pressed: new game, hold ArrowRight, wait 300 ms, Space 200 ms[\s\S]*expect `NK\.run\.coins >= 1` → false \(FAILED\)[\s\S]*console errors: none/.test(fish[1].user), fish[1]?.user.slice(-1800));
    const enemies = stepCall("Enemies and lives");
    ok("a regression from a later step is caught and repaired (the jump stopped working)", enemies.length === 2 && /REGRESSION \(passed before this step\) "Run and jump"[\s\S]*track\.minY < start\.player\.y - 60` → false \(FAILED\)/.test(enemies[1].user), enemies[1]?.user.slice(-2000));
    const rewrites = mock.requests.filter((q) => /Some feature tests are broken themselves/.test(q.system) && /cat collecting fish|Whisker Dash/.test(q.user));
    ok("a bad test (reads NK.run.hearts, which the game never has) was rewritten once, with the game's files", rewrites.length === 1 && /three-lives[\s\S]*reads NK\.run\.hearts, which this game never has[\s\S]*GAME FILES:/.test(rewrites[0].user), rewrites.map((q) => q.user.slice(0, 400)));
    const lives = planFeatures.find((f) => f.id === "three-lives");
    ok("…and the rewritten test passes (not counted against the game)", lives?.status === "passing" && lives.rewritten === true && lives.test?.expect.join() === "NK.run.lives === 3", lives);
    ok("every feature passes at the end of the build", planFeatures.every((f) => f.status === "passing"), planFeatures.map((f) => [f.id, f.status, f.last?.text]));
    const fv = versions.map((v) => ({ label: v.stepLabel, f: (v.features as F[] | null)?.map((x) => `${x.id}:${x.status}`).join(",") }));
    ok("each version keeps its features' status", fv.find((v) => v.label === "First level")?.f === "run-jump:planned,collect-coins:planned,three-lives:planned" && fv.find((v) => v.label === "Fish and score")?.f === "run-jump:passing,collect-coins:passing,three-lives:planned" && fv.find((v) => v.label === "Touch controls and polish")?.f === "run-jump:passing,collect-coins:passing,three-lives:passing", fv);
    const featureLines = (await inst.db.gameChat.findMany({ where: { gameId, text: { startsWith: "Features:" } }, orderBy: { seq: "asc" } })).map((c) => c.text);
    ok("one chat line per step once a feature is built", featureLines.length === 5 && featureLines[0] === "Features: 1 passing." && featureLines[4] === "Features: 3 passing.", featureLines);
    const finalMsg = (await inst.db.gameChat.findMany({ where: { gameId, kind: "assistant", text: { contains: "is ready to play" } } }))[0]?.text ?? "";
    ok("the final message says the core features pass", /All 2 core features pass their tests\./.test(finalMsg), finalMsg);
    const review = mock.requests.find((q) => /You are the game studio's playtester/.test(q.system) && /Whisker Dash/.test(q.user) && /after the enemies step/.test(q.user));
    ok("the playtester gets the feature results as facts (and is told not to redo them)", Boolean(review && /feature test "Run and jump" \[core\]: passing/.test(review.user) && /FEATURE TESTS in the FACTS ran on the real game/.test(review.system)), review?.user.slice(0, 600));
    ok("still one AI action for the whole build", (await charges(alice.id)) === before + 1);
    // The design playbook.
    ok("the genre was matched (the brief's genre) and kept on the game", game.genreId === "platformer", game.genreId);
    const briefCall = mock.requests.find((q) => /Turn the person's idea into a short game design brief/.test(q.system) && /cat collecting fish/.test(q.user));
    ok("the brief and the plan got the genre card (no core rules there)", Boolean(briefCall && /GENRE CARD[\s\S]*# Platformer \(2D side view\)/.test(briefCall.system) && !/GAME DESIGN RULES/.test(briefCall.system)) && mock.requests.some((q) => /Pick the game's assets/.test(q.system) && /GENRE CARD[\s\S]*# Platformer/.test(q.system)));
    const sys = stepCalls.map((q) => q.system);
    const block = /GAME DESIGN RULES[\s\S]*?(?=ART DIRECTION STANDARD)/.exec(sys[0] ?? "")?.[0] ?? "";
    const art = /ART DIRECTION STANDARD[\s\S]*?(?=HOW TO WRITE A STEP)/.exec(sys[0] ?? "")?.[0] ?? "";
    ok("every step's system prompt has the core rules and the genre card, after the engine card and before the step rules", sys.length > 0 && sys.every((x) => x === sys[0]) && /ENGINE CARD[\s\S]*GAME DESIGN RULES[\s\S]*# CORE RULES[\s\S]*GENRE CARD[\s\S]*# Platformer[\s\S]*HOW TO WRITE A STEP/.test(sys[0]), sys[0]?.slice(0, 300));
    ok("…within the token budget (≈ 1,850 tokens)", block.length / 4 <= 1900, Math.round(block.length / 4));
    console.log(`    (tokens per step: playbook ${Math.round(block.length / 4)}, art standard + visual spec ${Math.round(art.length / 4)})`);
    ok("every step's system prompt has the art standard and this game's visual spec (bad colours dropped, the plan's asset notes in)", /VISUAL SPEC[\s\S]*Camera: side view[\s\S]*Palette: #c3e3ff sky, #5b8c3a grass, #f2a33a hero, #d9434b danger\n[\s\S]*Asset subset and scale: New Platformer Pack only/.test(art) && art.length / 4 <= 900, art.slice(-700));
    ok("the visual spec is stored with the game's plan", (game.plan as { visual?: { palette?: unknown[] } }).visual?.palette?.length === 4);
    ok("the plan step is told to build a representative playable section early", mock.requests.some((q) => /Pick the game's assets/.test(q.system) && /REPRESENTATIVE PLAYABLE SECTION early/.test(q.system)));
    ok("…and never in the per-step message", !stepCalls.some((q) => /# CORE RULES/.test(q.user)));
    const passes = (await inst.db.gameChat.findMany({ where: { gameId, text: { startsWith: "Playtest after step" } }, orderBy: { seq: "asc" } })).map((c) => /step (\d+)/.exec(c.text)?.[1]);
    ok("playtests ran after the level, enemies and polish steps (3, 6, 8)", passes.join(",") === "3,6,8", passes);
    ok("the kit is 1.1.0 with a Reduce motion toggle in its settings panel", await frame.evaluate(() => {
      const N = (window as unknown as { NK: { version: string; settings: { get: (k: string) => unknown }; ui: { settings: () => void; close: (n: string) => void } } }).NK;
      const before = N.settings.get("reduceMotion");
      N.ui.settings();
      const button = document.querySelector<HTMLButtonElement>('[data-nk-setting="reduceMotion"]');
      button?.click();
      const after = N.settings.get("reduceMotion");
      button?.click();
      N.ui.close("settings");
      return N.version === "1.1.0" && before === false && after === true && N.settings.get("reduceMotion") === false;
    }));
    ok("the kit's touch-art ids resolve through kit.json to the library's ids", /sprites\/icons\/icon-jump/.test(JSON.stringify(lock["kenney/mobile-controls/icon-jump"])), lock["kenney/mobile-controls/icon-jump"]);

    /* ── Workspace screenshots ── */
    await page.screenshot({ path: path.join(SHOTS, "workspace-en-1440.png") });
    await page.locator("[data-testid=plan-card] summary").click();
    await page.waitForSelector("[data-testid=visual-spec]", { timeout: 10_000 });
    ok("the plan card shows the look compactly (colours + the spec)", (await page.locator("[data-testid=visual-spec] li").count()) === 4 && /Camera: side view/.test(await page.locator("[data-testid=visual-spec]").innerText()));
    await page.locator("[data-testid=plan-card]").screenshot({ path: path.join(SHOTS, "plan-card-look-en.png") });
    await page.locator("[data-testid=plan-card] summary").click();
    await page.getByRole("button", { name: "Assets" }).first().click();
    await page.fill("#game-asset-q", "fish");
    await page.locator("[data-testid=assets-panel] form button").first().click();
    await page.waitForSelector("section[aria-label=Results] [data-testid=asset-card]", { timeout: 30_000 });
    await sleep(1500);
    ok("the Assets panel searches the library", (await page.locator("section[aria-label=Results] [data-testid=asset-card]").count()) > 3);
    const api = await alice.agent.get("/api/games/assets/search?q=fish&dim=2d");
    ok("asset search API: previews and licences", api.status === 200 && api.json.results.length > 3 && api.json.results.every((x: { id: string; preview: string | null; licence: string }) => x.id && x.licence) && api.json.results.some((x: { preview: string | null }) => x.preview?.startsWith("/game-assets/_previews/")), api.json.results?.slice(0, 2));
    await page.screenshot({ path: path.join(SHOTS, "workspace-en-1440-assets.png") });
    await page.getByRole("button", { name: "Versions" }).first().click();
    await page.waitForSelector("[data-testid=versions-panel] img", { timeout: 20_000 });
    await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("[data-testid=versions-panel] img")].filter((i) => i.offsetParent !== null).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60_000 });
    ok("version screenshots load in the Versions list", true);
    ok("the Versions list shows each version's feature pass count", /Features 3\/3/.test(await page.locator("[data-testid=version-features]").first().innerText()), await page.locator("[data-testid=version-features]").first().innerText().catch(() => ""));
    await sleep(400);
    await page.screenshot({ path: path.join(SHOTS, "workspace-en-1440-versions.png") });
    await ctx1.close();
    for (const [loc, w, h] of [["en", 390, 844], ["ar", 1440, 900], ["ar", 390, 844]] as const) {
      const { context, page: p } = await browserFor(inst, alice.agent, { locale: loc, width: w, height: h });
      await p.goto(`${inst.base}/games/${gameId}`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector("[data-testid=game-canvas]", { timeout: 60_000, state: "attached" });
      await sleep(2500);
      if (w < 500) {
        await p.screenshot({ path: path.join(SHOTS, `workspace-${loc}-${w}-chat.png`) });
        await p.locator('[role=tab]').nth(1).click();
        await sleep(4000);
      } else await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, `workspace-${loc}-${w}.png`) });
      if (loc === "ar") ok(`the workspace is right-to-left in Arabic (${w})`, (await p.evaluate(() => document.documentElement.dir)) === "rtl");
      await context.close();
    }
    for (const [loc, w, h] of [["en", 1440, 900], ["en", 390, 844], ["ar", 1440, 900]] as const) {
      const { context, page: p } = await browserFor(inst, alice.agent, { locale: loc, width: w, height: h });
      await p.goto(`${inst.base}/games`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector("[data-testid=game-card] img", { timeout: 60_000 });
      await p.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("[data-testid=game-card] img")].filter((i) => i.offsetParent !== null).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60_000 });
      await sleep(1200);
      await p.screenshot({ path: path.join(SHOTS, `home-${loc}-${w}.png`), fullPage: w < 500 });
      await context.close();
    }

    /* ── Chat changes after the build ── */
    console.log("Chat changes");
    const { context: ctx2, page: page2 } = await browserFor(inst, alice.agent);
    await page2.addInitScript(() => {
      (window as unknown as { __nk: unknown[] }).__nk = [];
      window.addEventListener("message", (e) => {
        if (e.data && typeof e.data === "object" && e.data.type === "nk-game:patched") (window as unknown as { __nk: unknown[] }).__nk.push(e.data);
      });
    });
    await page2.goto(`${inst.base}/games/${gameId}`, { waitUntil: "domcontentloaded" });
    await page2.waitForSelector("[data-testid=game-canvas]");
    for (let i = 0; i < 60 && !(await canvasFrame(page2)?.evaluate(() => (window as unknown as { NK?: { state?: { current?: string } } }).NK?.state?.current === "play").catch(() => false)); i++) await sleep(500);
    // The slimes reach an idle hero in a few seconds; keep the run alive while the change is made, so the patch lands in a running game.
    await canvasFrame(page2)?.evaluate(() => { (window as unknown as { NK: { run: { lives: number } } }).NK.run.lives = 99; }).catch(() => {});
    const jobsBefore = await inst.db.gameJob.count({ where: { gameId } });
    await page2.fill("#game-prompt", "make the jump higher");
    await page2.keyboard.press("Enter");
    const job2 = await waitJob(inst, gameId, 300_000, jobsBefore + 1);
    ok("the change finished as one step", job2.status === "done" && (job2.steps as unknown[]).length === 1, job2);
    for (let i = 0; i < 40 && !(await page2.evaluate(() => (window as unknown as { __nk: unknown[] }).__nk.length)); i++) await sleep(500);
    const hot = (await page2.evaluate(() => (window as unknown as { __nk: Array<{ mode: string; ok: boolean }> }).__nk)) as Array<{ mode: string; ok: boolean }>;
    ok("the running game was patched in place (hot)", hot.some((m) => m.mode === "hot" && m.ok), hot);
    const jumpNow = await canvasFrame(page2)!.evaluate(() => (window as unknown as { NK: { fileText: (p: string) => string | null } }).NK.fileText("src/entities/player.js"));
    ok("the canvas runs the changed code", /-1250/.test(jumpNow ?? ""));
    const changed = (await inst.db.gameProject.findUniqueOrThrow({ where: { id: gameId } })).plan as { features: Array<{ id: string; status: string; priority: string }> };
    ok("a chat change added a feature with a test, and it passes (the old jump would fail it)", changed.features.map((f) => `${f.id}:${f.status}`).join() === "run-jump:passing,collect-coins:passing,three-lives:passing,high-jump:passing", changed.features);
    ok("the change's step ran every feature's test (new + regression)", ((job2.steps as Array<{ features?: string[] }>)[0].features ?? []).join() === "high-jump" && mock.requests.some((q) => /The person asked for a change to their game/.test(q.system) && /FEATURES \(tested after every step\):\n- run-jump: "Run and jump" \[core, passing\]/.test(q.user)));
    ok("a change is one more AI action", (await charges(alice.id)) === before + 2);
    await ctx2.close();
    r = await alice.agent.post(`/api/games/${gameId}/build`, { prompt: "add a meow sound" });
    ok("second change starts", r.status === 200, r.text);
    ok("second change done", (await waitJob(inst, gameId, 300_000, jobsBefore + 2)).status === "done");
    ok("the change's asset searches reached the step", mock.requests.some((q) => /THIS STEP: Meow sound/.test(q.user) && /ASSET SEARCH RESULTS:[\s\S]*animal-cat/.test(q.user)));

    /* ── Versions: restore ── */
    const seqBefore = (await inst.db.gameProject.findUniqueOrThrow({ where: { id: gameId } })).seq;
    r = await alice.agent.post(`/api/games/${gameId}/versions/3/restore`, {});
    const restored = await inst.db.gameProject.findUniqueOrThrow({ where: { id: gameId } });
    const v3 = await inst.db.gameVersion.findUniqueOrThrow({ where: { gameId_seq: { gameId, seq: 3 } } });
    ok("restore saves the old version as a new one", r.status === 200 && restored.seq === seqBefore + 1 && JSON.stringify(restored.files) === JSON.stringify(v3.files), r.text);
    const restoredFeatures = ((await inst.db.gameProject.findUniqueOrThrow({ where: { id: gameId } })).plan as { features: Array<{ id: string; status: string }> }).features;
    ok("restore brings back that version's features and their status", restoredFeatures.map((f) => `${f.id}:${f.status}`).join() === "run-jump:planned,collect-coins:planned,three-lives:planned", restoredFeatures);
    r = await alice.agent.post(`/api/games/${gameId}/versions/${seqBefore}/restore`, {});
    const backFeatures = ((await inst.db.gameProject.findUniqueOrThrow({ where: { id: gameId } })).plan as { features: Array<{ id: string; status: string }> }).features;
    ok("and back again (the features too)", r.status === 200 && backFeatures.length === 4 && backFeatures.every((f) => f.status === "passing"), backFeatures);
    const vlist = (await alice.agent.get(`/api/games/${gameId}/versions`)).json.versions as Array<{ seq: number; features: { passing: number; total: number } | null }>;
    ok("the versions list carries feature pass counts", vlist[0].features?.passing === 4 && vlist[0].features.total === 4 && vlist.find((v) => v.seq === 3)?.features?.passing === 0, vlist.slice(0, 3));

    /* ── Download ── */
    console.log("Download");
    r = await alice.agent.get(`/api/games/${gameId}/export?check=1`);
    ok("download check lists the Platform-only pack asset", r.status === 200 && r.json.excluded?.some((x: { id: string }) => x.id.startsWith("platform-only/")), r.json);
    const zipRes = await fetch(`${inst.base}/api/games/${gameId}/export`, { headers: { cookie: [...alice.agent.jar].map(([k, v]) => `${k}=${v}`).join("; ") } });
    const zip = await JSZip.loadAsync(Buffer.from(await zipRes.arrayBuffer()));
    const names = Object.keys(zip.files);
    ok("the zip has the game, the engine and CC0 assets", names.includes("index.html") && names.includes("engine/phaser-2d/1.1.0/phaser.min.js") && names.some((n) => n.startsWith("game-assets/kenney/new-platformer-pack/")), names.slice(0, 20));
    ok("…and no Platform-only pack files, listed in README.txt", !names.some((n) => n.includes("platform-only")) && /platform-only\/audio-arcade-sound-fx\/animal-cat/.test(await zip.file("README.txt")!.async("string")));

    /* ── Licences: Quaternius platform-only (platform-only) ── */
    console.log("Licences");
    r = await alice.agent.get("/api/games/assets/search?q=imp%20monster&dim=3d");
    const qal = (r.json.results ?? []).find((x: { licence: string }) => x.licence === "platform-only");
    ok(platform-only (platform-only) assets are searchable for the Studio, marked not redistributable", r.status === 200 && qal && qal.redistributable === false, r.json.results?.slice(0, 3));
    const qalLock = buildLock(['"platform-only/platform-only-dungeon-monsters-kit/imp"']);
    ok("…a game may use them (accepted by the lock)", qalLock.badLicence.length === 0 && qalLock.used.some((u) => u.licence === "platform-only" && u.redistributable === false), qalLock);
    ok("…and a download leaves them out", exportPreview({ "assets.lock.json": JSON.stringify(qalLock.lock) }).excluded.some((x) => x.id === "platform-only/platform-only-dungeon-monsters-kit/imp"));

    /* ── Publish ── */
    console.log("Publish");
    r = await alice.agent.post(`/api/games/${gameId}/publish`, {});
    ok("publish makes an app", r.status === 200 && r.json.projectId && r.json.url, r.text);
    const project = await inst.db.project.findUniqueOrThrow({ where: { id: r.json.projectId } });
    ok("a published Designer-kind app linked to the game", project.published && project.kind === "DESIGNER" && (await inst.db.gameProject.findUniqueOrThrow({ where: { id: gameId } })).projectId === project.id);
    const appPath = String(r.json.url).replace(/^https?:\/\/[^/]+/, "");
    await warmApp(inst, appPath);
    const anon = inst.agent();
    r = await anon.get(appPath);
    ok("the app page carries the game inline and the engine scripts", r.status === 200 && /type="text\/nk-file"/.test(r.text) && /\/nk-engine\/phaser-2d\/1\.1\.0\/phaser\.min\.js/.test(r.text) && !/nk-studio-origin/.test(r.text), r.status);
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const p = await context.newPage();
      const errs: string[] = [];
      p.on("pageerror", (e) => errs.push(e.message));
      p.on("console", (m) => { if (m.type() === "error" && !/WebGL|GPU|AudioContext|favicon|sw\.js|manifest/i.test(m.text())) errs.push(m.text()); });
      await p.goto(`${inst.base}${appPath}`, { waitUntil: "load" });
      await p.waitForFunction(() => (window as unknown as { NK?: { state?: { current?: string } } }).NK?.state?.current === "menu", null, { timeout: 60_000 });
      await p.screenshot({ path: path.join(SHOTS, "published-menu.png") });
      await p.evaluate(() => (window as unknown as { NK: { start: () => void } }).NK.start());
      await p.waitForFunction(() => (window as unknown as { NK: { state: { current: string } } }).NK.state.current === "play", null, { timeout: 20_000 });
      await sleep(1500);
      await p.screenshot({ path: path.join(SHOTS, "published-play.png") });
      const nerr = await p.evaluate(() => (window as unknown as { NK: { errors: unknown[] } }).NK.errors.length);
      ok("the published game boots and plays without errors", nerr === 0 && errs.length === 0, errs);
      await context.close();
    }
    r = await alice.agent.get(`/projects/${project.id}/designer`);
    ok("the app's designer tab leads back to the game", r.status === 307 || r.status === 308 || /\/games\//.test(String(r.headers.location ?? "")) || /games/.test(r.text.slice(0, 500)), r.status);

    /* ── Other people and the canvas pass ── */
    r = await bob.agent.get(`/api/games/${gameId}`);
    ok("other people get 404", r.status === 404);
    r = await bob.agent.get(`/api/games/${gameId}/play/index.html`);
    ok("the canvas needs the pass or the owner", r.status === 404);
    const pass = (await alice.agent.get(`/api/games/${gameId}`)).json.playPass as string;
    r = await anon.get(`/api/games/${gameId}/play/${pass}/index.html`);
    ok("the pass opens the sandboxed canvas", r.status === 200 && /sandbox allow-scripts/.test(String(r.headers["content-security-policy"])) && /nk-studio-origin/.test(r.text));
    r = await anon.get(`/api/games/${gameId}/play/${pass}/src/../../../../.env`);
    ok("no paths outside the game", r.status === 404);
    const bobPass = (await bob.agent.get(`/api/games/${gameId}`)).json?.playPass;
    ok("no pass for others", !bobPass);

    /* ── A step that stays broken ── */
    console.log("A failing build is refunded");
    const c0 = await charges(alice.id);
    r = await alice.agent.post("/api/games", { prompt: "a doomed little game", engine: "phaser-2d" });
    const doomed = r.json.game.id as string;
    const job3 = await waitJob(inst, doomed);
    ok("the job ends with an error", job3.status === "error", job3);
    ok("nothing was saved", (await inst.db.gameVersion.count({ where: { gameId: doomed } })) === 1);
    ok("the action was given back", (await charges(alice.id)) === c0);
    const chat = await inst.db.gameChat.findMany({ where: { gameId: doomed, kind: "error" } });
    ok("the person is told in the chat", chat.length === 1);

    /* ── The allowance ── */
    const quota = await signIn(inst, "quota@example.invalid", "Quota");
    await inst.db.aiUsage.createMany({ data: Array.from({ length: 30 }, () => ({ userId: quota.id, kind: "build" })) });
    r = await quota.agent.post("/api/games", { prompt: "a platformer", engine: "phaser-2d" });
    ok("refused when the allowance is used up", r.status === 400 && /AI/.test(r.json.error ?? "") && (await inst.db.gameJob.count({ where: { userId: quota.id } })) === 0, r.text);

    /* ── A restart in the middle of a build ── */
    console.log("Restart mid-build");
    const c1 = await charges(alice.id);
    r = await alice.agent.post("/api/games", { prompt: "a restart test game", engine: "phaser-2d" });
    const restartGame = r.json.game.id as string;
    for (const end = Date.now() + 120_000; Date.now() < end; await sleep(300)) {
      const j = await inst.db.gameJob.findFirst({ where: { gameId: restartGame } });
      const steps = (j?.steps ?? []) as Array<{ label: string; status: string }>;
      if (steps.find((s) => s.label === "Slow art step")?.status === "running") break;
    }
    await sleep(1500);
    await inst.restart();
    const job4 = await waitJob(inst, restartGame, 300_000);
    ok("after the restart the build carried on and finished", job4.status === "done" && job4.resumes >= 1, job4);
    const rv = await inst.db.gameVersion.findMany({ where: { gameId: restartGame }, orderBy: { seq: "asc" } });
    ok("every step was saved once", rv.map((v) => v.stepLabel).join("|") === "start|Sky and ground|Slow art step|First level", rv.map((v) => v.stepLabel));
    ok("charged once", (await charges(alice.id)) === c1 + 1);
    ok("the chat says it carried on", (await inst.db.gameChat.count({ where: { gameId: restartGame, kind: "assistant", text: { contains: "restarted" } } })) === 1);

    /* ── The playtester ── */
    await playtestSection();

    /* ── The feature end gate ── */
    await gateSection();

    /* ── Steer while building ── */
    await steerSection();

    /* ── A 3D game ── */
    console.log("A 3D game");
    r = await alice.agent.post("/api/games", { prompt: "a small 3D dungeon where a knight explores", engine: "auto" });
    const dungeon = r.json.game.id as string;
    const job5 = await waitJob(inst, dungeon, 400_000);
    const dv = await inst.db.gameVersion.findMany({ where: { gameId: dungeon }, orderBy: { seq: "asc" } });
    const dg = await inst.db.gameProject.findUniqueOrThrow({ where: { id: dungeon } });
    ok("\"Let the AI choose\" picked 3D and the 3D build passed every check", job5.status === "done" && dg.engine === "three-3d" && dv.length === 4 && dv.slice(1).every((v) => (v.check as { ok?: boolean } | null)?.ok === true), { job5, engine: dg.engine, checks: dv.map((v) => v.check) });
    {
      const { context, page: p } = await browserFor(inst, alice.agent);
      await p.goto(`${inst.base}/games/${dungeon}`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector("[data-testid=game-canvas]");
      let st: string | null = null;
      for (let i = 0; i < 120 && st !== "play"; i++) {
        await sleep(500);
        st = (await canvasFrame(p)?.evaluate(() => (window as unknown as { NK?: { state?: { current?: string } } }).NK?.state?.current ?? null).catch(() => null)) ?? null;
      }
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, "workspace-3d-en-1440.png") });
      ok("the 3D game plays in the canvas", st === "play", st);
      // The Assets panel marks assets that stay on the platform (redistributable: false), platform-only ones too.
      await p.getByRole("button", { name: "Assets" }).first().click();
      await p.fill("#game-asset-q", "imp monster");
      await p.locator("[data-testid=assets-panel] form button").first().click();
      await p.waitForSelector("section[aria-label=Results] [data-testid=asset-card]", { timeout: 30_000 });
      const badges = await p.locator("section[aria-label=Results] [data-testid=asset-card]").evaluateAll((els) => els.filter((e) => /Hosted only/.test((e as HTMLElement).innerText) && /imp/i.test(e.querySelector("p")?.getAttribute("title") ?? "")).length);
      ok("the Assets panel shows \"Hosted only\" on a platform-only asset (not redistributable)", badges >= 1, badges);
      await context.close();
    }

    /* ── Delete ── */
    r = await alice.agent.del(`/api/games/${gameId}`);
    ok("delete removes the game and its app", r.status === 200 && (await inst.db.project.count({ where: { id: project.id } })) === 0);

    console.log(`\nAll ${checks.length} game studio checks passed. Screenshots in ${SHOTS}`);
  } catch (err) {
    console.error("\nFAILED:", err instanceof Error ? err.message : err);
    if (inst) console.error(inst.log().split("\n").filter((l) => /game-studio|Error|error/.test(l)).slice(-40).join("\n"));
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    await inst?.stop();
    await mock.close();
  }
}

void main();
