#!/usr/bin/env node
// Builds a finishable top-down adventure world from design/blueprints/top-down-adventure.json:
// overworld regions with one gate each, dungeons (rooms, small keys, a tool, boss door, boss, heart
// container), secrets, shops and weapon upgrades, plus an ASCII layout for every screen. The world
// graph is checked with NK.progress.solve(); a world with a soft lock or an unreachable item is
// rerolled with the next seed.
// Usage: node tools/world-gen.mjs --size short --seed 7 [--layout open|boxed] [--out world.json]
// As a module: generateWorld({ size, seed }) → world (see the README section in the engine card).
import fs from "node:fs";
import path from "node:path";
import { loadNK } from "./lib/nk-node.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
// NK_GAME_DESIGN picks another design set (design-next while it is being tried); the live set otherwise.
const BLUEPRINT = path.join(process.env.NK_GAME_DESIGN || path.join(ROOT, "../design"), "blueprints/top-down-adventure.json");
const W = 16, H = 11; // tiles per screen

function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { f, int: (lo, hi) => lo + Math.floor(f() * (hi - lo + 1)), pick: (arr) => arr[Math.floor(f() * arr.length)], shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; } };
}
const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const OPP = { n: "s", s: "n", e: "w", w: "e" };
const key = (x, y) => `${x},${y}`;

// Tools in the order dungeons hand them out. Overworld gate each tool opens (null = none; the next
// region is then sealed until that dungeon's boss is beaten).
const TOOL_GATE = { stun: null, ranged: null, bombs: "cracked-wall", fire: "thicket", crossing: "water", lift: "boulder" };
const TOOL_DUNGEON_GATE = { stun: null, ranged: "far-switch", bombs: "cracked-wall", fire: "dark-room", crossing: "gap", lift: null };
const BIOMES = ["meadow", "forest", "lakeside", "hills", "desert", "marsh", "snowfield", "ruins", "volcano"];

function chooseTools(r, n) {
  // First dungeon gets a soft tool (stun or ranged); later ones favour tools that open overworld gates.
  const first = r.pick(["stun", "ranged"]);
  const rest = r.shuffle(Object.keys(TOOL_GATE).filter((t) => t !== first));
  const out = [first, ...rest].slice(0, n);
  while (out.length < n) out.push(`relic-${out.length + 1}`); // beyond six tools: plain relics sealed by boss flags
  return out;
}

function regionsFor(r, ow, count) {
  // Voronoi regions. Region 0 (start) is seeded at the bottom middle; others spread by farthest-point sampling.
  const [gw, gh] = ow;
  const seeds = [[Math.floor(gw / 2), gh - 1]];
  while (seeds.length < count) {
    let best = null;
    for (let t = 0; t < 40; t++) {
      const c = [r.int(0, gw - 1), r.int(0, gh - 1)];
      const d = Math.min(...seeds.map((s) => Math.abs(s[0] - c[0]) + Math.abs(s[1] - c[1])));
      if (!best || d > best.d) best = { c, d };
    }
    seeds.push(best.c);
  }
  const reg = {};
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    let bi = 0, bd = Infinity;
    seeds.forEach((s, i) => { const d = Math.abs(s[0] - x) + Math.abs(s[1] - y) + r.f() * 0.5; if (d < bd) { bd = d; bi = i; } });
    reg[key(x, y)] = bi;
  }
  // Regions must be contiguous; any screen cut off from its seed joins a neighbour.
  for (let i = 0; i < count; i++) {
    const seen = new Set([key(...seeds[i])]), q = [seeds[i]];
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of Object.values(DIRS)) { const k = key(x + dx, y + dy); if (reg[k] === i && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
    for (const k of Object.keys(reg)) if (reg[k] === i && !seen.has(k)) {
      const [x, y] = k.split(",").map(Number);
      const nb = Object.values(DIRS).map(([dx, dy]) => reg[key(x + dx, y + dy)]).find((v) => v !== undefined && v !== i);
      if (nb !== undefined) reg[k] = nb;
    }
  }
  return { reg, seeds };
}

// Order regions by how they open: region 0 first, then each next region must border an earlier one.
function orderRegions(r, reg, count, ow) {
  const adj = Array.from({ length: count }, () => new Set());
  const borders = {};
  for (const k of Object.keys(reg)) {
    const [x, y] = k.split(",").map(Number);
    for (const d of ["e", "s"]) {
      const [dx, dy] = DIRS[d], k2 = key(x + dx, y + dy);
      if (reg[k2] === undefined || reg[k2] === reg[k]) continue;
      const a = reg[k], b = reg[k2];
      adj[a].add(b); adj[b].add(a);
      (borders[[Math.min(a, b), Math.max(a, b)]] ||= []).push({ from: k, dir: d, to: k2 });
    }
  }
  const order = [0], placed = new Set([0]);
  while (order.length < count) {
    const cand = [...placed].flatMap((p) => [...adj[p]]).filter((c) => !placed.has(c));
    if (!cand.length) return null;
    const next = r.pick(cand);
    order.push(next); placed.add(next);
  }
  void ow;
  return { order, adj, borders };
}

function carveDungeon(r, n) {
  // Random-walk tree of rooms from the entrance at (0,0), growing up and sideways (never below the entrance).
  const rooms = new Map([[key(0, 0), { x: 0, y: 0, parent: null, depth: 0, exits: {} }]]);
  let guard = 0;
  while (rooms.size < n && guard++ < 2000) {
    const list = [...rooms.values()];
    const from = r.f() < 0.6 ? list.reduce((a, b) => (b.depth > a.depth ? b : a)) : r.pick(list);
    const d = r.pick(["n", "n", "e", "w"]);
    const [dx, dy] = DIRS[d], x = from.x + dx, y = from.y + dy;
    if (y > 0 || rooms.has(key(x, y))) continue;
    const room = { x, y, parent: key(from.x, from.y), parentDir: OPP[d], depth: from.depth + 1, exits: {} };
    from.exits[d] = { to: key(x, y), type: "open" };
    room.exits[OPP[d]] = { to: key(from.x, from.y), type: "open" };
    rooms.set(key(x, y), room);
  }
  return rooms;
}

function pathTo(rooms, k) {
  const p = [];
  for (let c = k; c; c = rooms.get(c).parent) p.unshift(c);
  return p;
}

function buildDungeon(r, idx, tool, bp, sizeCfg) {
  const id = `d${idx + 1}`;
  const n = r.int(sizeCfg.rooms[0], sizeCfg.rooms[1]);
  const rooms = carveDungeon(r, n);
  const all = [...rooms.keys()];
  const boss = all.reduce((a, b) => (rooms.get(b).depth > rooms.get(a).depth ? b : a));
  const main = pathTo(rooms, boss);                 // entrance … boss
  const onMain = new Set(main);
  const gives = Object.fromEntries(all.map((k) => [k, []]));
  const kinds = Object.fromEntries(all.map((k) => [k, "fight"]));
  // Boss door between the boss room and its parent; its big key sits in the deepest side room (or on the path before it).
  const ante = rooms.get(boss).parent;
  rooms.get(ante).exits[rooms.get(boss).parentDir === undefined ? "n" : OPP[rooms.get(boss).parentDir]].type = "boss";
  gives[boss].push(`flag:${id}`, "heart-container");
  kinds[boss] = "boss";
  // Tool room ≈ 60% of the way, off the main path when a side room exists there.
  const side = all.filter((k) => !onMain.has(k) && k !== boss);
  const targetDepth = Math.max(1, Math.round(rooms.get(boss).depth * 0.6));
  const toolRoom = (side.length ? side : main.slice(1, -1).length ? main.slice(1, -1) : [main[0]])
    .reduce((a, b) => (Math.abs(rooms.get(b).depth - targetDepth) < Math.abs(rooms.get(a).depth - targetDepth) ? b : a));
  gives[toolRoom].push(tool);
  kinds[toolRoom] = "tool";
  const bigKeyRoom = side.filter((k) => k !== toolRoom).sort((a, b) => rooms.get(b).depth - rooms.get(a).depth)[0] || main[Math.max(0, main.length - 3)];
  gives[bigKeyRoom].push(`key:${id}-boss`);
  if (kinds[bigKeyRoom] === "fight") kinds[bigKeyRoom] = "key";
  // Small-key doors on the main path; each key is placed in a room reachable before its door.
  const doorSlots = main.slice(1, -1).map((k) => ({ room: rooms.get(k), k })).filter((o) => o.k !== ante);
  const lockCount = Math.min(doorSlots.length, Math.max(1, Math.floor(n / 4)));
  const lockRooms = r.shuffle(doorSlots).slice(0, lockCount).map((o) => o.k);
  for (const k of lockRooms) {
    const room = rooms.get(k), parent = rooms.get(room.parent);
    parent.exits[OPP[room.parentDir]].type = "locked";
    // Rooms reachable before this door: everything whose path doesn't pass through k.
    const before = all.filter((c) => !pathTo(rooms, c).includes(k) && c !== boss && kinds[c] !== "tool");
    const spot = r.pick(before.filter((c) => c !== main[0]).length ? before.filter((c) => c !== main[0]) : before);
    gives[spot].push(`key:${id}`);
    if (kinds[spot] === "fight") kinds[spot] = "key";
  }
  // The tool is needed at least once more before the boss: gate one main-path door after the tool room.
  const dgate = TOOL_DUNGEON_GATE[tool];
  const toolDepth = rooms.get(toolRoom).depth;
  if (dgate) {
    const after = main.filter((k) => rooms.get(k).depth > toolDepth && k !== boss && rooms.get(rooms.get(k).parent).exits[OPP[rooms.get(k).parentDir]].type === "open");
    if (after.length) {
      const k = after[0], room = rooms.get(k);
      const ex = rooms.get(room.parent).exits[OPP[room.parentDir]];
      ex.type = "gate"; ex.gate = dgate; ex.req = tool;
    }
  }
  // Room mix for the rest.
  const free = all.filter((k) => kinds[k] === "fight" && k !== main[0]);
  for (const k of free) { const v = r.f(); kinds[k] = v < bp.dungeons.room_mix.fight ? "fight" : v < bp.dungeons.room_mix.fight + bp.dungeons.room_mix.puzzle ? "puzzle" : v < 0.85 ? "loot" : "rest"; if (kinds[k] === "loot") gives[k].push(`count:money:${r.pick([5, 10, 20])}`); }
  kinds[main[0]] = "entrance";
  rooms.get(main[0]).exits.s = { to: "overworld", type: "exit" };
  // Dead ends always hold something.
  for (const k of all) {
    const isLeaf = Object.keys(rooms.get(k).exits).length === 1 && k !== main[0];
    if (isLeaf && !gives[k].length) { gives[k].push(`count:money:${r.pick([10, 20])}`); kinds[k] = "loot"; }
  }
  const out = {};
  for (const [k, room] of rooms) out[k] = { kind: kinds[k], depth: room.depth, exits: room.exits, gives: gives[k] };
  return { id, tool, entrance: main[0], boss, rooms: out };
}

function asciiRoom(exits, opts) {
  // 16×11 room: '#' wall, '.' floor, exits are 2-wide gaps in the middle of a side.
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? opts.wall : ".")));
  const door = { open: ".", exit: ".", locked: "L", boss: "K", shutter: "S", gate: "G" };
  for (const [d, ex] of Object.entries(exits)) {
    const c = ex.type === "gate" ? opts.gateTile[ex.gate] || "G" : door[ex.type] || ".";
    if (d === "n") { g[0][7] = c; g[0][8] = c; }
    if (d === "s") { g[H - 1][7] = c; g[H - 1][8] = c; }
    if (d === "w") { g[5][0] = c; g[4][0] = c; }
    if (d === "e") { g[5][W - 1] = c; g[4][W - 1] = c; }
  }
  for (const [ch, x, y] of opts.place || []) if (g[y] && g[y][x] === ".") g[y][x] = ch;
  return g.map((row) => row.join(""));
}

// Open overworld screens (A Link to the Past / Crystalis style): screens of one region join along wide edges, a region
// border is a narrower pass, gates stay 2 tiles. Walls are the world's edge plus groves/outcrops placed off a protected
// path network that links every opening and object; every screen is flood-checked, and features are dropped until
// everything is reachable. Noise is hashed from the screen key, so a seed keeps its map and shared edges match.
const hashN = (...a) => { let h = 2166136261; for (const ch of a.join("|")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
function asciiOverworld(key, s, screens, opts) {
  const [x, y] = key.split(",").map(Number), wall = opts.wall;
  const g = Array.from({ length: H }, (_, yy) => Array.from({ length: W }, (_, xx) => (xx === 0 || yy === 0 || xx === W - 1 || yy === H - 1 ? wall : ".")));
  const openings = [];                       // [x, y] border cells left open
  const edgeId = (d) => (d === "n" ? `ns:${x},${y - 1}` : d === "s" ? `ns:${x},${y}` : d === "w" ? `ew:${x - 1},${y}` : `ew:${x},${y}`);
  const cellOn = (d, i) => (d === "n" ? [i, 0] : d === "s" ? [i, H - 1] : d === "w" ? [0, i] : [W - 1, i]);
  const mids = { n: [7, 8], s: [7, 8], w: [4, 5], e: [4, 5] };
  for (const [d, ex] of Object.entries(s.exits)) {
    if (ex.type === "gate") { for (const i of mids[d]) { const [cx, cy] = cellOn(d, i); g[cy][cx] = opts.gateTile[ex.gate] || "G"; } continue; }
    const nb = screens[ex.to], wide = nb && nb.region === s.region, along = d === "n" || d === "s" ? W : H, id = edgeId(d);
    const [m0, m1] = mids[d];
    const a = wide ? 1 + Math.floor(hashN(id, "a") * 3) : m0 - 1, b = wide ? along - 2 - Math.floor(hashN(id, "b") * 3) : m1 + 1;
    for (let i = a; i <= b; i++) { const [cx, cy] = cellOn(d, i); g[cy][cx] = "."; openings.push([cx, cy]); }
  }
  const nearOpening = (cx, cy, r) => openings.some(([ox, oy]) => Math.abs(ox - cx) + Math.abs(oy - cy) <= r);
  // Protected cells: a wandering 2-wide path from each opening's middle to the screen's centre, and room around objects.
  const prot = new Set(), P = (cx, cy) => prot.add(cx + "," + cy), C = [7, 5];
  const walk = (sx, sy, tag) => {
    let cx = sx, cy = sy;
    for (let i = 0; i < 40 && (cx !== C[0] || cy !== C[1]); i++) {
      P(cx, cy); P(cx + 1, cy); P(cx, cy + 1);
      const dx = C[0] - cx, dy = C[1] - cy, horiz = dy === 0 || (dx !== 0 && hashN(key, tag, i) < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy)));
      if (horiz) cx += Math.sign(dx); else cy += Math.sign(dy);
    }
    P(C[0], C[1]); P(C[0] + 1, C[1]); P(C[0], C[1] + 1);
  };
  for (const d of Object.keys(s.exits)) { const [m0, m1] = mids[d], [cx, cy] = cellOn(d, Math.round((m0 + m1) / 2)); walk(Math.min(W - 2, Math.max(1, cx)), Math.min(H - 2, Math.max(1, cy)), d); }
  for (const [, px, py] of opts.place || []) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 2; dy++) P(px + dx, py + dy);
  const before = g.map((r) => r.slice());
  const dress = (level) => {
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) g[yy][xx] = before[yy][xx];
    if (level < 1) return;
    // Thicker edges: the ring inside a wall edge grows in places (never in front of an opening or on a path).
    for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) {
      const edge = xx === 1 || yy === 1 || xx === W - 2 || yy === H - 2;
      if (!edge || prot.has(xx + "," + yy) || nearOpening(xx, yy, 2)) continue;
      const out = [[xx - 1, yy], [xx + 1, yy], [xx, yy - 1], [xx, yy + 1]].some(([ax, ay]) => before[ay][ax] === wall);
      if (out && hashN(key, "rim", xx, yy) < 0.45) g[yy][xx] = wall;
    }
    if (level < 2) return;
    // Groves and outcrops: 1–4 soft blobs in open ground, off the paths.
    const n = 1 + Math.floor(hashN(key, "n") * 4);
    for (let i = 0; i < n; i++) {
      const bx = 3 + Math.floor(hashN(key, "bx", i) * (W - 6)), by = 2 + Math.floor(hashN(key, "by", i) * (H - 4)), rad = 0.9 + hashN(key, "br", i) * 1.4;
      for (let yy = 2; yy < H - 2; yy++) for (let xx = 2; xx < W - 2; xx++) {
        const d = Math.hypot((xx - bx) * 0.85, yy - by) + (hashN(key, "bn", xx, yy) - 0.5) * 0.9;
        if (d <= rad && !prot.has(xx + "," + yy) && !nearOpening(xx, yy, 2)) g[yy][xx] = wall;
      }
    }
  };
  // Everything reachable from the centre: every opening, gate and object.
  const reachable = () => {
    const seen = new Set([C.join(",")]), q = [C];
    while (q.length) { const [cx, cy] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, k2 = nx + "," + ny; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k2) || g[ny][nx] === wall) continue; seen.add(k2); q.push([nx, ny]); } }
    const gates = []; for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (g[yy][xx] !== "." && g[yy][xx] !== wall) gates.push([xx, yy]);
    return openings.concat(gates, (opts.place || []).filter((q2) => q2[0] !== "e").map((q2) => [q2[1], q2[2]])).every(([ax, ay]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((ax + dx) + "," + (ay + dy))));
  };
  for (let level = 2; level >= 0; level--) { dress(level); if (reachable()) break; }
  for (const [ch, px, py] of opts.place || []) if (g[py] && g[py][px] === ".") g[py][px] = ch;
  s.path = [...prot].filter((k2) => { const [px, py] = k2.split(",").map(Number); return px > 0 && py > 0 && px < W - 1 && py < H - 1 && g[py][px] === "."; });
  return g.map((row) => row.join(""));
}

const GATE_TILE = { water: "~", boulder: "R", thicket: "%", "cracked-wall": "C", "far-switch": "E", "dark-room": "N", gap: "_", seal: "Z", toll: "$", "heart-gate": "Y" };


// Dungeon contents as the game reads them from the map: k = small key, B = boss key, T = the dungeon's tool,
// H = heart container; L / K tiles on a side = locked / boss door, a gate tile = that gate.
const TILE_GATE = Object.fromEntries(Object.entries(GATE_TILE).map(([g, ch]) => [ch, g]));
export function drawnDungeon(dg) {
  const rooms = {};
  for (const [k, room] of Object.entries(dg.rooms)) {
    const gives = [], a = room.ascii;
    a.forEach((row) => [...row].forEach((ch) => {
      if (ch === "k") gives.push(`key:${dg.id}`);
      else if (ch === "B") gives.push(`key:${dg.id}-boss`);
      else if (ch === "T" && dg.tool) gives.push(dg.tool);
      else if (ch === "H") gives.push("heart-container");
    }));
    const sideCh = { n: a[0][7], s: a[H - 1][7], w: a[4][0], e: a[4][W - 1] };
    const doors = {};
    for (const [d, ex] of Object.entries(room.exits)) {
      const ch = sideCh[d];
      doors[d] = { to: ex.to, exit: ex.type === "exit", lock: ch === "L" ? `key:${dg.id}` : ch === "K" ? `key:${dg.id}-boss` : null, req: TILE_GATE[ch] ? ex.req || null : null, wall: ch === "#" };
    }
    rooms[k] = { gives, doors, boss: room.kind === "boss" };
  }
  return rooms;
}
export function solveDrawn(world, NK, items, counters, D) {
  const nodes = {}, { screens, secrets = [], start } = world.overworld, problems = [];
  for (const [k, s] of Object.entries(screens)) nodes[`o:${k}`] = { area: "overworld", gives: (s.gives || []).slice(), edges: Object.values(s.exits).map((e) => ({ to: `o:${e.to}`, req: e.req || null })) };
  for (const sc of secrets) { const cave = `s:${sc.screen}`; nodes[cave] = { area: "overworld", gives: nodes[`o:${sc.screen}`].gives.splice(0), edges: [{ to: `o:${sc.screen}` }] }; nodes[`o:${sc.screen}`].edges.push({ to: cave, req: sc.req }); }
  for (const dg of world.dungeons) {
    const rooms = drawnDungeon(dg);
    for (const [k, r] of Object.entries(rooms)) {
      // Every give the plan put in a room must be on its map.
      const want = (dg.rooms[k].gives || []).filter((g) => /^key:|^heart-container$/.test(g) || g === dg.tool).sort().join(","), got = r.gives.slice().sort().join(",");
      if (want !== got) problems.push(`${dg.id} ${k}: plan ${want || "-"} but map ${got || "-"}`);
      for (const [d, dr] of Object.entries(r.doors)) if (dr.wall) problems.push(`${dg.id} ${k}: exit ${d} is walled`);
      nodes[`${dg.id}:${k}`] = { area: dg.id, gives: r.gives.concat((dg.rooms[k].gives || []).filter((g) => !/^key:|^heart-container$/.test(g) && g !== dg.tool)), edges: Object.values(r.doors).filter((dr) => !dr.exit && !dr.wall).map((dr) => ({ to: `${dg.id}:${dr.to}`, lock: dr.lock, req: dr.req })) };
    }
    nodes[`o:${dg.overworld}`].edges.push({ to: `${dg.id}:${dg.entrance}`, req: dg.entryReq });
    nodes[`${dg.id}:${dg.entrance}`].edges.push({ to: `o:${dg.overworld}` });
  }
  NK.resetRun({}); NK.progress.define({ items, counters });
  const solve = NK.progress.solve({ start: `o:${start}`, goal: `flag:d${D}`, nodes });
  const ok = solve.ok && !solve.unreachable.length && !problems.length;
  return { ok, problems, softlocks: solve.softlocks.length, unreachable: solve.unreachable };
}

let style = "open";
export function generateWorld({ size = "short", seed = 1, maxTries = 60, layout = "open" } = {}) {
  style = layout;
  const bp = JSON.parse(fs.readFileSync(BLUEPRINT, "utf8"));
  const cfg = bp.sizes[size];
  if (!cfg) throw new Error(`unknown size ${size} (${Object.keys(bp.sizes).join(", ")})`);
  const NK = loadNK();
  for (let t = 0; t < maxTries; t++) {
    const world = attempt(bp, cfg, size, seed + t, NK);
    if (world && world.solve.ok && !world.solve.unreachable.length) return world;
  }
  throw new Error(`no finishable world in ${maxTries} seeds from ${seed}`);
}

function attempt(bp, cfg, size, seed, NK) {
  const r = rng(seed);
  const D = cfg.dungeons;
  const [gw, gh] = cfg.overworld;
  const { reg, seeds } = regionsFor(r, cfg.overworld, D + 1);
  const ord = orderRegions(r, reg, D + 1, cfg.overworld);
  if (!ord) return null;
  const tools = chooseTools(r, D);
  // The start region gets a gentle biome and the harsh ones come last (the world reads easy → hard); this only
  // reorders the shuffle, so a seed keeps its map.
  const shuffled = r.shuffle(BIOMES), GENTLE = ["meadow", "forest", "lakeside"], HARSH = ["volcano", "snowfield", "desert"];
  const first = shuffled.find((b) => GENTLE.includes(b));
  const biomes = [first, ...shuffled.filter((b) => b !== first && !HARSH.includes(b)), ...shuffled.filter((b) => HARSH.includes(b))];
  // Region opened k-th gets dungeon k (region 0 = start region also hosts dungeon 1's entrance when D = 1).
  const regionInfo = ord.order.map((reg_, i) => ({ region: reg_, step: i, biome: biomes[i % biomes.length] }));
  const stepOf = Object.fromEntries(regionInfo.map((ri) => [ri.region, ri.step]));
  // Overworld screens: open inside a region; between regions only the gate crossing into each newly opened region.
  const screens = {};
  for (const k of Object.keys(reg)) screens[k] = { region: stepOf[reg[k]], biome: regionInfo[stepOf[reg[k]]].biome, exits: {}, gives: [], features: [] };
  for (const k of Object.keys(reg)) {
    const [x, y] = k.split(",").map(Number);
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const k2 = key(x + dx, y + dy);
      if (screens[k2] && reg[k2] === reg[k]) screens[k].exits[d] = { to: k2, type: "open" };
    }
  }
  const gates = [];
  for (let step = 1; step < regionInfo.length; step++) {
    const regId = regionInfo[step].region;
    // The crossing comes from any already-open region bordering this one.
    const crossings = [];
    for (let s = 0; s < step; s++) {
      const a = regionInfo[s].region, pair = [Math.min(a, regId), Math.max(a, regId)];
      for (const b of ord.borders[pair] || []) crossings.push(b);
    }
    if (!crossings.length) return null;
    const c = r.pick(crossings);
    const [from, to] = stepOf[reg[c.from]] < step ? [c.from, c.to] : [c.to, c.from];
    const dir = from === c.from ? c.dir : OPP[c.dir];
    // Region step k is opened by dungeon (k-1)'s tool when that tool opens an overworld gate, else sealed until boss k-1.
    // Region 1 (the first dungeon's) is open.
    let gate = null, req = null;
    if (step >= 2) {
      const tool = tools[step - 2];
      gate = TOOL_GATE[tool] || "seal";
      req = TOOL_GATE[tool] ? tool : `flag:d${step - 1}`;
    }
    screens[from].exits[dir] = { to, type: gate ? "gate" : "open", gate, req };
    screens[to].exits[OPP[dir]] = { to: from, type: "open" };
    gates.push({ step, from, to, dir, gate, req });
  }
  // Start screen and dungeon entrances.
  const start = key(...seeds[0]);
  screens[start].features.push("start");
  const dungeonRegions = D === 1 ? [0] : regionInfo.slice(1).map((ri) => ri.step);
  const dungeons = [];
  for (let i = 0; i < D; i++) {
    const step = D === 1 ? 0 : i + 1;
    const regScreens = Object.keys(screens).filter((k) => screens[k].region === step && k !== start);
    const far = regScreens.reduce((a, b) => {
      const [ax, ay] = a.split(",").map(Number), [bx, by] = b.split(",").map(Number), [sx, sy] = seeds[regionInfo[step].region];
      return Math.abs(bx - sx) + Math.abs(by - sy) < Math.abs(ax - sx) + Math.abs(ay - sy) ? b : a;
    }, regScreens[0] || start);
    const dg = buildDungeon(r, i, tools[i], bp, cfg);
    dg.overworld = far;
    dg.region = step;
    // The final dungeon only opens with every other boss beaten.
    dg.entryReq = i === D - 1 && D > 2 ? { all: Array.from({ length: D - 1 }, (_, j) => `flag:d${j + 1}`) } : null;
    screens[far].features.push(`dungeon:${dg.id}`);
    dungeons.push(dg);
  }
  void dungeonRegions;
  // First weapon: a cave on a screen next to the start.
  const nbStart = Object.values(screens[start].exits).map((e) => e.to);
  const weaponCave = r.pick(nbStart.length ? nbStart : [start]);
  screens[weaponCave].features.push("cave:weapon");
  screens[weaponCave].gives.push("blade");
  // Secrets: weapon tiers behind heart-gates, heart containers and money behind tool obstacles, shops.
  const others = r.shuffle(Object.keys(screens).filter((k) => k !== start && !screens[k].features.length));
  const nSecrets = Math.max(2, Math.round(others.length * bp.overworld.secrets_share));
  const secretTools = tools.filter((t) => TOOL_GATE[t]);
  const secrets = [];
  const hidden = { heart: Math.min(4, Math.max(2, Math.floor(D / 2) + 1)) };
  for (let i = 0; i < nSecrets && others.length; i++) {
    const k = others.pop();
    let content, req = null, gate = null;
    if (i === 0) { content = "blade-2"; gate = "heart-gate"; req = `count:hearts_max:${Math.min(5, 3 + D - 1)}`; }
    else if (i === 1 && D >= 4) { content = "blade-3"; gate = "heart-gate"; req = `count:hearts_max:${3 + D}`; }
    else if (hidden.heart-- > 0) content = "heart-container";
    else content = r.pick(["count:money:30", "count:money:50", "shop", "hint"]);
    if (!gate && secretTools.length) { const tl = r.pick(secretTools); gate = TOOL_GATE[tl]; req = tl; }
    screens[k].features.push(`secret:${gate || "open"}`);
    if (content === "shop" || content === "hint") screens[k].features.push(content);
    else screens[k].gives.push(content);
    secrets.push({ screen: k, gate, req, content });
  }
  // Shops (open, in the first two regions) sell the second shield and a bomb bag.
  const shopScreens = Object.keys(screens).filter((k) => screens[k].region <= 1 && !screens[k].features.length);
  const shop = shopScreens.length ? r.pick(shopScreens) : null;
  if (shop) screens[shop].features.push("shop");

  // Item catalog for NK.progress.define.
  const items = {
    blade: { name: "Blade", kind: "weapon", damage: 1 },
    "blade-2": { name: "Blade II", kind: "weapon", replaces: "blade", damage: 2 },
    "blade-3": { name: "Blade III", kind: "weapon", replaces: "blade-2", damage: 4 },
    "shield-2": { name: "Tower Shield", kind: "upgrade", price: 90 },
    "bomb-bag": { name: "Bomb Bag", kind: "upgrade", price: 100, raisesMax: { bombs: 4 } },
    "heart-container": { name: "Heart Container", kind: "upgrade", raisesMax: { hearts: 2, hearts_max: 1 }, gives: { hearts: 2, hearts_max: 1 } },
  };
  for (const t of tools) items[t] = { name: t, kind: "tool", archetype: t.startsWith("relic") ? "relic" : t, ...(t === "bombs" ? { gives: { bombs: 8 } } : {}) };
  const counters = { money: { start: 0, max: 255 }, hearts: { start: 6, max: 6 }, hearts_max: { start: 3 }, bombs: { start: 0, max: 8 }, arrows: { start: 0, max: 30 } };

  // Solver graph: overworld screens "o:x,y", dungeon rooms "d1:x,y". Dungeon locks spend keys of that dungeon.
  const nodes = {};
  for (const [k, s] of Object.entries(screens)) {
    nodes[`o:${k}`] = { area: "overworld", gives: s.gives.slice(), edges: Object.values(s.exits).map((e) => ({ to: `o:${e.to}`, req: e.req || null })) };
  }
  for (const sc of secrets) {
    // The secret's contents sit in a cave node behind its own obstacle.
    const cave = `s:${sc.screen}`;
    nodes[cave] = { area: "overworld", gives: nodes[`o:${sc.screen}`].gives.splice(0), edges: [{ to: `o:${sc.screen}` }] };
    nodes[`o:${sc.screen}`].edges.push({ to: cave, req: sc.req });
  }
  for (const dg of dungeons) {
    for (const [k, room] of Object.entries(dg.rooms)) {
      nodes[`${dg.id}:${k}`] = {
        area: dg.id, gives: room.gives.slice(),
        edges: Object.values(room.exits).filter((e) => e.type !== "exit").map((e) => ({
          to: `${dg.id}:${e.to}`,
          lock: e.type === "locked" ? `key:${dg.id}` : e.type === "boss" ? `key:${dg.id}-boss` : null,
          req: e.type === "gate" ? e.req : null,
        })),
      };
    }
    nodes[`o:${dg.overworld}`].edges.push({ to: `${dg.id}:${dg.entrance}`, req: dg.entryReq });
    nodes[`${dg.id}:${dg.entrance}`].edges.push({ to: `o:${dg.overworld}` });
  }
  NK.resetRun({});
  NK.progress.define({ items, counters });
  const graph = { start: `o:${start}`, goal: `flag:d${D}`, nodes };
  const solve = NK.progress.solve(graph);

  // ASCII layouts.
  const owWall = { meadow: "^", forest: "F", lakeside: "^", hills: "A", desert: "A", marsh: "^", snowfield: "A", ruins: "#", volcano: "A" };
  for (const [k, s] of Object.entries(screens)) {
    const place = [];
    if (s.features.includes("start")) place.push(["P", 7, 6]);
    for (const f of s.features) {
      if (f.startsWith("dungeon:")) place.push(["D", 8, 3]);
      if (f.startsWith("cave:") || f.startsWith("secret:")) {
        const g = f.split(":")[1];
        place.push([g === "open" || g === "heart-gate" ? "c" : GATE_TILE[g] || "c", 4, 3]);
        if (g === "heart-gate") place.push(["Y", 4, 4]);
      }
      if (f === "shop") place.push(["$", 11, 3]);
    }
    // The start screen and its neighbours stay calm; enemies thicken with each region.
    const calm = k === start || nbStart.includes(k);
    if (!calm) for (let i = 0; i < 2 + s.region; i++) place.push(["e", r.int(2, W - 3), r.int(2, H - 3)]);
    s.ascii = style === "boxed" ? asciiRoom(s.exits, { wall: owWall[s.biome] || "^", gateTile: GATE_TILE, place }) : asciiOverworld(k, s, screens, { wall: owWall[s.biome] || "^", gateTile: GATE_TILE, place });
  }
  for (const dg of dungeons) for (const room of Object.values(dg.rooms)) {
    const place = [];
    const g = room.gives.join(" ");
    if (room.kind === "entrance") place.push(["P", 7, 8]);
    // One tile per thing the room gives: two small keys are two "k"s, a boss key and a small key both show.
    const spots = [[7, 5], [8, 6], [6, 6], [9, 4], [5, 4], [9, 7], [5, 7]], spot = () => spots.shift();
    for (const gv of room.gives) {
      if (/^key:d\d+-boss$/.test(gv)) place.push(["B", ...spot()]);
      else if (/^key:d\d+$/.test(gv)) place.push(["k", ...spot()]);
    }
    if (room.kind === "tool") place.push(["T", 7, 4]);
    if (room.kind === "boss") place.push(["X", 7, 4], ["H", 7, 7]);
    if (room.kind === "fight") for (let i = 0; i < 3 + dg.id.slice(1) * 1; i++) place.push(["e", r.int(2, W - 3), r.int(2, H - 3)]);
    if (room.kind === "puzzle") place.push(["m", 6, 5], ["w", 10, 5]);
    if (room.kind === "loot") place.push(["$", 7, 5]);
    room.ascii = asciiRoom(room.exits, { wall: "#", gateTile: GATE_TILE, place });
  }
  // The world is only kept if it can be finished as DRAWN: the graph is rebuilt from the dungeon maps (what the game
  // reads) and solved again, so a key the plan holds but the map lost can never ship.
  const drawn = solveDrawn({ overworld: { start, screens, secrets }, dungeons }, NK, items, counters, D);
  if (!drawn.ok) return null;
  return {
    blueprint: bp.id, size, seed, screen: { tiles: [W, H] },
    legend: {
      walls: "# dungeon wall · ^ F A overworld border (by biome: F forest, A rock, ^ hedge)", floor: ".", doors: "L locked (small key) · K boss door (boss key) · S shutter",
      gates: GATE_TILE, objects: "P player · e enemy · k small key · B boss key · T tool chest · X boss · H heart container · $ money/shop · m push block · w switch · c cave · D dungeon entrance · Y heart-gate keeper",
    },
    tools, items, counters,
    overworld: { size: [gw, gh], start, regions: regionInfo.map((ri) => ({ step: ri.step, biome: ri.biome })), gates, secrets, shop, weaponCave, screens },
    dungeons,
    graph, solve: { ok: solve.ok, solvable: solve.solvable, softlocks: solve.softlocks.length, unreachable: solve.unreachable, order: solve.order.filter((g) => !g.startsWith("count:")), states: solve.states },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  // --check <world.js|world.json>: can a built game's world be finished as drawn? Exit 1 if not.
  if (arg("check", null)) {
    const f = arg("check"), txt = fs.readFileSync(f, "utf8");
    let w; if (/^\s*[{[]/.test(txt)) w = JSON.parse(txt); else { const m = txt.match(/NK\.def\("world",\s*([\s\S]*)\);?\s*$/); w = JSON.parse(m[1].replace(/\);?\s*$/, "")); }
    const r = solveDrawn(w, loadNK(), w.items, w.counters, w.dungeons.length);
    console.log(JSON.stringify(r, null, 1)); process.exit(r.ok ? 0 : 1);
  }
  const w = generateWorld({ size: arg("size", "short"), seed: +arg("seed", 1), layout: arg("layout", "open") });
  const out = arg("out", null);
  if (out) fs.writeFileSync(out, JSON.stringify(w, null, 1));
  console.log(JSON.stringify({ size: w.size, seed: w.seed, tools: w.tools, dungeons: w.dungeons.map((d) => `${d.id}:${Object.keys(d.rooms).length} rooms`), gates: w.overworld.gates.map((g) => `${g.step}:${g.gate || "open"}`), secrets: w.overworld.secrets.length, solve: w.solve }, null, 1));
}
