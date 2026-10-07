import type { Probe } from "./check";

/**
 * The playtester's automatic checks (nk-games/design/PLAYTEST-CHECKLIST.md
 * A1–A7), run in code on what the headless check read from the running game
 * (check.ts PROBE_2D): the jump envelope, a path search over the level for
 * the goal, the collectibles and soft-locks, the spawn, enemy speed, the
 * touch controls over the HUD, and the player's contrast. Pure functions:
 * the results go to the AI review as facts, and code-found blockers become a
 * fix step without waiting for the AI.
 */

export type Severity = "blocker" | "should-fix" | "polish";
export type AutoFinding = { id: string; severity: Severity; code: string; values: Record<string, string | number>; evidence: string; fix: string };
export type AutoResult = { facts: string[]; findings: AutoFinding[] };

type Grid = NonNullable<Probe["grid"]>;
type Node = { x: number; y: number };
type Edge = { to: number; kind: "walk" | "fall" | "jump"; dx: number; dh: number };

const PICKUP = /coin|gem|star|fish|fruit|pickup|collect|key|diamond|heart|bonus|jewel/;
const GOAL = /flag|goal|exit|door|finish|portal|chest|trophy/;
const PLAYER = /player|hero|spawn/;
const NOT_ENEMY = /coin|gem|star|fish|fruit|pickup|collect|key|diamond|heart|bonus|jewel|flag|goal|exit|door|finish|portal|chest|trophy|player|hero|spawn|checkpoint|bullet|shot|particle|platform|crate|box|cloud|bush|grass|mushroom|tree|rock|decor/;

/** The jump physics: measured from the running player, or a generous platformer envelope when there is no player yet. */
export function physics(p: Probe): { g: number; v: number; s: number; measured: boolean; T: number } | null {
  const T = p.grid?.T ?? 0;
  const g = Math.max(1, (p.gravity ?? 0) + (p.player?.gravityY ?? 0));
  if (!T || !p.gravity) return null;
  const v = -(p.measured?.minVy ?? 0);
  const s = p.measured?.maxVx ?? 0;
  if (p.player && v > 100 && s > 30) return { g, v, s, measured: true, T };
  // No player to measure yet (a level step before the hero): the top of the platformer card's range (apex 4.5 T, distance 8 T).
  const H = 4.5 * T;
  const vv = Math.sqrt(2 * g * H);
  return { g, v: vv, s: (8 * T) / (2 * (vv / g)), measured: false, T };
}

const maxHeight = (v: number, g: number) => (v * v) / (2 * g);

/** Horizontal reach for a target dh px above take-off (A1). */
export function reach(ph: { g: number; v: number; s: number }, dh: number): number {
  const H = maxHeight(ph.v, ph.g);
  if (dh > H) return 0;
  return ph.s * (ph.v / ph.g + Math.sqrt((2 * (H - dh)) / ph.g));
}

type Level = { grid: Grid; bh: number; bw: number; nodes: Node[]; at: Map<string, number>; edges: Edge[][]; death: boolean[] };

function cell(g: Grid, x: number, y: number): string {
  if (x < 0 || x >= g.W) return "#";
  if (y < 0 || y >= g.H) return " ";
  return g.rows[y][x] ?? " ";
}
const solid = (c: string) => c === "#";
const stand = (c: string) => c === "#" || c === "=";

function buildLevel(grid: Grid, bodyW: number, bodyH: number, ph: { g: number; v: number; s: number }): Level {
  const T = grid.T;
  const bh = Math.max(1, Math.ceil((bodyH - 2) / T));
  const bw = Math.max(1, Math.ceil((bodyW - 2) / T));
  const free = (x: number, y: number) => {
    for (let i = 0; i < bh; i++) if (solid(cell(grid, x, y - i))) return false;
    return true;
  };
  const isNode = (x: number, y: number) => y >= 0 && y < grid.H && x >= 0 && x < grid.W && free(x, y) && stand(cell(grid, x, y + 1)) && cell(grid, x, y) !== "^";
  const nodes: Node[] = [];
  const at = new Map<string, number>();
  for (let y = 0; y < grid.H; y++) for (let x = 0; x < grid.W; x++) if (isNode(x, y)) at.set(`${x},${y}`, nodes.push({ x, y }) - 1);
  const edges: Edge[][] = nodes.map(() => []);
  const death = nodes.map(() => false);
  const H = maxHeight(ph.v, ph.g);
  const upRows = Math.floor((0.95 * H) / T);
  const bwPx = Math.min(bodyW, T * bw) * 0.8;
  const bhPx = bodyH * 0.9;
  const hitsSolid = (cx: number, feet: number, rising: boolean) => {
    const x0 = Math.floor((cx - bwPx / 2) / T), x1 = Math.floor((cx + bwPx / 2) / T);
    const y0 = Math.floor((feet - bhPx) / T), y1 = Math.floor((feet - 2) / T);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = cell(grid, x, y);
      if (solid(c)) return true;
      if (!rising && c === "^" && y === y1) return true;
    }
    return false;
  };
  // A jump from node a to node b: some jump strength (full, or a shorter hop) and a horizontal speed ≤ run whose arc stays clear.
  const arcOk = (a: Node, b: Node): boolean => {
    const dhPx = (a.y - b.y) * T;
    const dxPx = (b.x - a.x) * T;
    const x0 = (a.x + 0.5) * T, feet0 = (a.y + 1) * T;
    for (const f of [1, 0.8, 0.6, 0]) {
      const vj = ph.v * f;
      const disc = vj * vj - 2 * ph.g * dhPx;
      if (disc < 0) continue;
      const tLand = (vj + Math.sqrt(disc)) / ph.g;
      if (tLand <= 0) continue;
      const vx = dxPx / tLand;
      if (Math.abs(vx) > ph.s * 1.02) continue;
      let clear = true;
      for (let i = 1; i <= 24 && clear; i++) {
        const t = (tLand * i) / 24;
        const cx = x0 + vx * t;
        const feet = feet0 - (vj * t - 0.5 * ph.g * t * t);
        if (hitsSolid(cx, i === 24 ? feet - 1 : feet, vj - ph.g * t > 0)) clear = false;
      }
      if (clear) return true;
    }
    return false;
  };
  nodes.forEach((n, i) => {
    for (const dir of [-1, 1]) {
      const nx = n.x + dir;
      const w = at.get(`${nx},${n.y}`);
      if (w !== undefined) {
        edges[i].push({ to: w, kind: "walk", dx: dir, dh: 0 });
        continue;
      }
      if (!free(nx, n.y) || nx < 0 || nx >= grid.W) continue;
      // Walk off the edge: fall to the first place to stand below (or out of the level: a pit).
      let y = n.y + 1;
      for (; y < grid.H + bh; y++) {
        if (!free(nx, y)) break;
        if (at.has(`${nx},${y}`)) break;
      }
      const land = at.get(`${nx},${y}`);
      if (land !== undefined) edges[i].push({ to: land, kind: "fall", dx: dir, dh: n.y - y });
      else if (y >= grid.H) death[i] = true;
      else if (cell(grid, nx, y) === "^" || cell(grid, nx, y + 1) === "^") death[i] = true;
    }
    if (cell(grid, n.x + 1, n.y + 1) === "^" || cell(grid, n.x - 1, n.y + 1) === "^") death[i] = true;
  });
  // Jumps: every place to stand within the envelope whose arc is clear.
  const maxDx = Math.ceil(reach(ph, -grid.H * T) / T) + 1;
  nodes.forEach((n, i) => {
    for (let dy = -grid.H; dy <= upRows; dy++) {
      const ty = n.y - dy;
      if (ty < 0 || ty >= grid.H) continue;
      const lim = Math.floor((0.95 * reach(ph, dy * T)) / T);
      for (let dx = -Math.min(lim, maxDx); dx <= Math.min(lim, maxDx); dx++) {
        if (!dx && !dy) continue;
        const j = at.get(`${n.x + dx},${ty}`);
        if (j === undefined || edges[i].some((e) => e.to === j)) continue;
        if (arcOk(n, nodes[j])) edges[i].push({ to: j, kind: "jump", dx, dh: dy });
      }
    }
  });
  return { grid, bh, bw, nodes, at, edges, death };
}

function bfs(L: Level, start: number[]): Set<number> {
  const seen = new Set(start);
  const q = [...start];
  while (q.length) {
    const i = q.shift()!;
    for (const e of L.edges[i]) if (!seen.has(e.to)) (seen.add(e.to), q.push(e.to));
  }
  return seen;
}

function reverseReach(L: Level, targets: number[]): Set<number> {
  const back: number[][] = L.nodes.map(() => []);
  L.edges.forEach((list, i) => list.forEach((e) => back[e.to].push(i)));
  const seen = new Set(targets);
  const q = [...targets];
  while (q.length) {
    const i = q.shift()!;
    for (const j of back[i]) if (!seen.has(j)) (seen.add(j), q.push(j));
  }
  return seen;
}

/** The nodes from which an object cell can be touched: standing next to it, or jumping up into it. */
function touching(L: Level, ox: number, oy: number, jumpRows: number): number[] {
  const out: number[] = [];
  L.nodes.forEach((n, i) => {
    if (Math.abs(n.x - ox) <= 1 && oy <= n.y + 1 && oy >= n.y - (L.bh - 1) - jumpRows) out.push(i);
  });
  return out;
}

/** The nearest place to stand at or below a world point (the spawn). */
function nodeBelow(L: Level, x: number, y: number): number | null {
  for (let yy = Math.max(0, y); yy < L.grid.H; yy++) {
    for (const dx of [0, -1, 1]) {
      const i = L.at.get(`${x + dx},${yy}`);
      if (i !== undefined) return i;
    }
    if (solid(cell(L.grid, x, yy))) break;
  }
  return null;
}

function contrastRatio(a: number[], b: number[]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = (p: number[]) => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
  const [l1, l2] = [L(a), L(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** A7 from the spawn screenshot (raw RGB pixels): the player's own pixels against a ring around it. */
export function playerContrast(raw: { data: Buffer; width: number; height: number; channels: number }, box: { x: number; y: number; w: number; h: number }): number | null {
  const { data, width, height, channels } = raw;
  const px = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const x0 = Math.max(0, Math.round(box.x)), y0 = Math.max(0, Math.round(box.y));
  const x1 = Math.min(width - 1, Math.round(box.x + box.w)), y1 = Math.min(height - 1, Math.round(box.y + box.h));
  if (x1 - x0 < 3 || y1 - y0 < 3) return null;
  const ring: number[] = [0, 0, 0];
  let rn = 0;
  const rx0 = Math.max(0, x0 - (x1 - x0)), rx1 = Math.min(width - 1, x1 + (x1 - x0));
  const ry0 = Math.max(0, y0 - (y1 - y0)), ry1 = Math.min(height - 1, y1 + (y1 - y0));
  for (let y = ry0; y <= ry1; y += 2) for (let x = rx0; x <= rx1; x += 2) {
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
    const p = px(x, y);
    ring[0] += p[0];
    ring[1] += p[1];
    ring[2] += p[2];
    rn++;
  }
  if (!rn) return null;
  const bg = ring.map((v) => v / rn);
  const fg = [0, 0, 0];
  let fn = 0, total = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    total++;
    const p = px(x, y);
    if (Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]) < 40) continue;
    fg[0] += p[0];
    fg[1] += p[1];
    fg[2] += p[2];
    fn++;
  }
  if (fn < total * 0.08) return 1;
  return contrastRatio(fg.map((v) => v / fn), bg);
}

/** The kit's touch controls at a phone size (CSS px), as nk-game.js lays them out (A6). */
function touchRects(touch: { stick?: unknown; buttons?: unknown[] } | null, vw: number, vh: number): Array<{ x: number; y: number; w: number; h: number }> {
  if (!touch) return [];
  const size = Math.min(170, Math.max(110, 0.3 * Math.min(vw, vh)));
  const out: Array<{ x: number; y: number; w: number; h: number }> = [];
  if (touch.stick === "arrows") {
    const a = 0.62 * size;
    out.push({ x: 18, y: vh - 18 - a, w: a, h: a }, { x: 18 + a + 14, y: vh - 18 - a, w: a, h: a });
  } else if (touch.stick !== false) out.push({ x: 18, y: vh - 18 - size, w: size, h: size });
  const buttons = Array.isArray(touch.buttons) && touch.buttons.length ? touch.buttons.length : 1;
  const b1 = 0.66 * size, b2 = 0.52 * size;
  out.push({ x: vw - 18 - b1, y: vh - 18 - b1, w: b1, h: b1 });
  if (buttons > 1) out.push({ x: vw - 18 - 0.72 * size - b2, y: vh - 18 - b2, w: b2, h: b2 });
  if (buttons > 2) out.push({ x: vw - 18 - b2, y: vh - 18 - 0.74 * size - b2, w: b2, h: b2 });
  return out;
}

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Runs A1–A7 on a probe. `stage` decides which items apply (the cumulative
 * checklist: level → level items; enemies → + enemy items; polish → all).
 * `raw` = the spawn screenshot's pixels, for the contrast check.
 */
export function autoChecks(p: Probe | null | undefined, stage: "level" | "enemies" | "polish" | "fix", raw?: { data: Buffer; width: number; height: number; channels: number } | null): AutoResult {
  const facts: string[] = [];
  const findings: AutoFinding[] = [];
  const add = (id: string, severity: Severity, code: string, values: Record<string, string | number>, evidence: string, fix: string) => findings.push({ id, severity, code, values, evidence, fix });
  if (!p || !p.ok) return { facts: ["automatic checks: the game couldn't be read (no level or player found)"], findings };
  if (p.engine === "3d") return { facts: ["automatic checks: 3D game — the level graph checks (A2–A4) aren't automated yet; judge from the screenshot and the code"], findings };
  const ph = physics(p);
  const grid = p.grid;
  const T = grid?.T ?? 0;
  const objs = p.objects ?? [];
  const toCell = (o: { x: number; y: number; w: number; h: number }) => ({ x: Math.floor((o.x + o.w / 2 - (grid?.ox ?? 0)) / (T || 1)), y: Math.floor((o.y + o.h / 2 - (grid?.oy ?? 0)) / (T || 1)) });
  const mapSpawn = objs.find((o) => o.kind === "map" && PLAYER.test(o.label));
  const spawnPx = mapSpawn ?? (p.player ? { x: p.player.x, y: p.player.y, w: p.player.w, h: p.player.h } : null);
  const goals = objs.filter((o) => GOAL.test(o.label) && !/checkpoint/.test(o.label));
  const mapGoals = goals.filter((o) => o.kind === "map");
  const goalList = mapGoals.length ? mapGoals : goals;
  const pickups = (() => {
    const fromMap = objs.filter((o) => o.kind === "map" && PICKUP.test(o.label));
    return fromMap.length ? fromMap : objs.filter((o) => o.kind !== "map" && PICKUP.test(o.label));
  })();
  const enemiesMap = objs.filter((o) => o.kind === "map" && !NOT_ENEMY.test(o.label) && o.label);
  const enemiesLive = (p.measured?.enemies ?? []).filter((e) => !NOT_ENEMY.test(e.label));

  if (ph) {
    const H = maxHeight(ph.v, ph.g);
    facts.push(`A1 jump envelope (${ph.measured ? "measured from the running player" : "no player yet: assumed a generous platformer envelope"}): gravity ${Math.round(ph.g)}, jump ${Math.round(ph.v)} px/s, run ${Math.round(ph.s)} px/s, T = ${Math.round(T)} px → max height ${(H / T).toFixed(1)} tiles, max distance ${(reach(ph, 0) / T).toFixed(1)} tiles on the level`);
  } else if (p.gravity === 0) facts.push("A1 jump envelope: no gravity (top-down or no physics)");
  if (grid && ph && spawnPx) {
    const bodyW = p.player?.w ?? T * 0.7, bodyH = p.player?.h ?? T * 1.3;
    const L = buildLevel(grid, bodyW, bodyH, ph);
    const sc = toCell(spawnPx);
    const start = nodeBelow(L, sc.x, sc.y);
    const jumpRows = Math.floor((0.95 * maxHeight(ph.v, ph.g)) / T);
    if (start === null) {
      add("PT-14", "blocker", "spawnFloat", { col: sc.x }, `no place to stand at or below the spawn (tile ${sc.x}, ${sc.y})`, "Put the player's spawn on solid ground (src/levels.js), with 6+ flat tiles around it.");
    } else {
      const R = bfs(L, [start]);
      const goalCells = goalList.map(toCell);
      let goalNodes: number[] = [];
      for (const gc of goalCells) goalNodes = goalNodes.concat(touching(L, gc.x, gc.y, jumpRows));
      const reachedGoal = goalNodes.some((i) => R.has(i));
      if (goalCells.length) {
        // Where the way breaks: the reachable place farthest along toward the goal.
        let far = start;
        for (const i of R) if (Math.abs(L.nodes[i].x - goalCells[0].x) < Math.abs(L.nodes[far].x - goalCells[0].x)) far = i;
        facts.push(`A3 path search: goal ${reachedGoal ? "reachable" : `NOT reachable (the furthest the player gets is tile ${L.nodes[far].x}; the goal is at tile ${goalCells[0].x})`} from the spawn (${R.size} places to stand reached of ${L.nodes.length})`);
        if (!reachedGoal) add("PT-10", "blocker", "goal", { col: L.nodes[far].x }, `goal not reachable: the path search stops at tile ${L.nodes[far].x} of ${grid.W}`, `Make the goal reachable: after tile ${L.nodes[far].x} the next gap or ledge is beyond the jump (max ${(reach(ph, 0) / T).toFixed(1)} tiles across, ${(maxHeight(ph.v, ph.g) / T).toFixed(1)} up). Narrow the gap or add a platform/step in src/levels.js.`);
        else {
          const G = reverseReach(L, goalNodes);
          const escape = reverseReach(L, L.nodes.map((_, i) => i).filter((i) => L.death[i]));
          const stuck = [...R].filter((i) => !G.has(i) && !escape.has(i));
          facts.push(`A3 soft-locks: ${stuck.length ? `${stuck.length} places the player can reach but never leave toward the goal (e.g. tile ${L.nodes[stuck[0]].x})` : "none"}`);
          if (stuck.length) add("PT-11", "blocker", "softlock", { col: L.nodes[stuck[0]].x }, `${stuck.length} soft-lock places (e.g. tile ${L.nodes[stuck[0]].x}, ${L.nodes[stuck[0]].y})`, `Give the pit at tile ${L.nodes[stuck[0]].x} a way out (a step or platform within jump height) or make it a death pit that respawns.`);
          // The easiest route to the goal, and its hardest early jump (PT-13).
          const early = Math.floor(grid.W * 0.3);
          const cost = (e: Edge) => (e.kind !== "jump" ? 1 : 2 + 8 * (Math.abs(e.dx * T) / Math.max(1, reach(ph, e.dh * T))) ** 2);
          const dist = new Map<number, number>([[start, 0]]);
          const prev = new Map<number, { from: number; e: Edge }>();
          const open = new Set([start]);
          while (open.size) {
            let u = -1, best = Infinity;
            for (const i of open) if ((dist.get(i) ?? Infinity) < best) (best = dist.get(i)!, (u = i));
            open.delete(u);
            if (goalNodes.includes(u)) break;
            for (const e of L.edges[u]) {
              const d = best + cost(e);
              if (d < (dist.get(e.to) ?? Infinity)) (dist.set(e.to, d), prev.set(e.to, { from: u, e }), open.add(e.to));
            }
          }
          const end = goalNodes.filter((i) => dist.has(i)).sort((a, b) => dist.get(a)! - dist.get(b)!)[0];
          let worst: { dx: number; dh: number; x: number; ratio: number } | null = null;
          for (let i = end; i !== undefined && prev.has(i); i = prev.get(i)!.from) {
            const { from, e } = prev.get(i)!;
            if (e.kind !== "jump" || L.nodes[from].x > early) continue;
            const ratio = Math.max(Math.abs(e.dx * T) / Math.max(1, reach(ph, e.dh * T)), e.dh > 0 ? (e.dh * T) / maxHeight(ph.v, ph.g) / (0.8 / 0.7) : 0);
            if (!worst || ratio > worst.ratio) worst = { dx: Math.abs(e.dx), dh: e.dh, x: L.nodes[from].x, ratio };
          }
          if (worst) {
            facts.push(`A1 hardest jump on the easiest route in the first 30% of the level: ${worst.dx} tiles across, ${worst.dh} up at tile ${worst.x} (early limit: ${((0.7 * reach(ph, worst.dh * T)) / T).toFixed(1)} across, ${((0.8 * maxHeight(ph.v, ph.g)) / T).toFixed(1)} up)`);
            if (ph.measured && (worst.dx * T > 0.7 * reach(ph, worst.dh * T) + T * 0.5 || worst.dh * T > 0.8 * maxHeight(ph.v, ph.g) + 1)) add("PT-13", "should-fix", "earlyJump", { col: worst.x, dx: worst.dx }, `early jump at tile ${worst.x}: ${worst.dx} across, ${worst.dh} up`, `Make the jump at tile ${worst.x} easier (early gaps ≤ ${Math.floor((0.7 * reach(ph, 0)) / T)} tiles, ledges ≤ ${Math.floor((0.8 * maxHeight(ph.v, ph.g)) / T)} up).`);
          }
        }
      } else facts.push("A3 path search: the code check didn't recognise a goal object (it may simply be named differently): judge goal reachability from the level code, not from this");
      // Collectibles (PT-12).
      if (pickups.length) {
        const missed = pickups.map(toCell).filter((c) => !touching(L, c.x, c.y, jumpRows).some((i) => R.has(i)));
        facts.push(`A3 collectibles: ${pickups.length - missed.length} of ${pickups.length} reachable${missed.length ? ` (unreachable at tiles ${missed.slice(0, 5).map((c) => c.x).join(", ")})` : ""}`);
        if (missed.length) add("PT-12", "should-fix", "pickups", { count: missed.length, cols: missed.slice(0, 5).map((c) => c.x).join(", ") }, `${missed.length} collectibles unreachable`, `Move or remove the collectibles at tiles ${missed.slice(0, 5).map((c) => c.x).join(", ")} so they can be reached.`);
      }
      // Spawn (A4, PT-14) and a safe start (PT-15).
      if (p.player) {
        const pl = p.player;
        let inside = false;
        for (let y = Math.floor((pl.y + 2 - grid.oy) / T); y <= Math.floor((pl.y + pl.h - 3 - grid.oy) / T); y++) for (let x = Math.floor((pl.x + 2 - grid.ox) / T); x <= Math.floor((pl.x + pl.w - 3 - grid.ox) / T); x++) if (solid(cell(grid, x, y))) inside = true;
        if (inside) add("PT-14", "blocker", "spawnInside", {}, "the player's body overlaps solid tiles", "Move the spawn so the player isn't inside the ground or a wall (src/levels.js).");
      }
      const startNode = L.nodes[start];
      if (Math.abs(startNode.y - sc.y) > 1) add("PT-14", "blocker", "spawnFloat", { col: sc.x }, `spawn ${startNode.y - sc.y} tiles above the ground`, "Put the spawn on the ground (at most 1 tile above it).");
      facts.push(`A4 spawn: ${findings.some((f) => f.id === "PT-14") ? "PROBLEM (see findings)" : "clear, on the ground"}`);
      const threats = [...enemiesMap.map(toCell), ...grid.rows.flatMap((row, y) => [...row].map((c, x) => (c === "^" ? { x, y } : null)).filter((v): v is { x: number; y: number } => v !== null))];
      const near = threats.map((c) => Math.hypot(c.x - sc.x, c.y - sc.y)).sort((a, b) => a - b)[0];
      if (near !== undefined) {
        facts.push(`PT-15 nearest enemy or hazard to the spawn: ${near.toFixed(1)} tiles`);
        if (near < 6) add("PT-15", "should-fix", "safeStart", { dist: Math.round(near) }, `a threat ${near.toFixed(1)} tiles from the spawn`, "Keep enemies and hazards 6+ tiles away from the spawn (src/levels.js).");
      }
    }
  } else if (!grid) facts.push("A3 path search: no tile level or platforms found (not a platform level)");

  // A5 enemy speed.
  if (stage !== "level" && ph?.measured && enemiesLive.length) {
    const fastest = enemiesLive.sort((a, b) => b.maxVx - a.maxVx)[0];
    const ratio = fastest.maxVx / ph.s;
    facts.push(`A5 fastest enemy: ${Math.round(fastest.maxVx)} px/s = ${ratio.toFixed(2)} × the player's run (${fastest.label || "enemy"})`);
    if (ratio > 0.6) add("PT-40", "should-fix", "enemySpeed", { ratio: ratio.toFixed(2) }, `enemy speed ${ratio.toFixed(2)} × run`, "Slow the early enemies to ≤ 60% of the player's run speed (src/entities).");
  }
  // A6 touch controls vs HUD and the player (phone landscape 844×390), PT-70.
  if (stage === "polish" || stage === "fix") {
    const touch = (p.config?.touch ?? null) as { stick?: unknown; buttons?: unknown[] } | null;
    if (!touch && stage === "polish") add("PT-70", "blocker", "noTouch", {}, "config.touch is not set", "Set config.touch in src/config.js (stick or arrows bottom-left, the main action as the biggest button bottom-right).");
    if (touch && p.config) {
      const vw = 844, vh = 390;
      const k = Math.min(vw / p.config.width, vh / p.config.height);
      const offX = (vw - p.config.width * k) / 2, offY = (vh - p.config.height * k) / 2;
      const css = (r: { x: number; y: number; w: number; h: number }) => ({ x: offX + r.x * k, y: offY + r.y * k, w: r.w * k, h: r.h * k });
      const controls = touchRects(touch, vw, vh);
      const hudHits = (p.hud ?? []).filter((h) => controls.some((c) => overlap(css(h), c)));
      const cam = p.camera;
      const playerHit = p.player && cam ? controls.some((c) => overlap(css({ x: (p.player!.x - cam.scrollX) * cam.zoom, y: (p.player!.y - cam.scrollY) * cam.zoom, w: p.player!.w * cam.zoom, h: p.player!.h * cam.zoom }), c)) : false;
      facts.push(`A6 touch controls on a 844×390 phone: ${hudHits.length ? `cover HUD items (${hudHits.map((h) => h.label).slice(0, 3).join(", ")})` : "no HUD under them"}${playerHit ? "; they cover the player at the spawn" : ""}`);
      if (playerHit) add("PT-71", "blocker", "touchPlayer", {}, "touch controls cover the player at the spawn", "Keep the player at least 25% above the bottom edge (camera offsetY or spawn height) so the touch controls don't cover it.");
      else if (hudHits.length) add("PT-71", "should-fix", "touchHud", {}, `touch controls cover ${hudHits.length} HUD item(s)`, "Move HUD items out of the bottom-left/right thumb areas (top corners).");
    }
  }
  // A7 contrast.
  if (raw && p.player && p.camera && p.canvas && p.config) {
    const scale = p.canvas.w / p.config.width;
    const cam = p.camera;
    const box = { x: p.canvas.x + (p.player.x - cam.scrollX) * cam.zoom * scale, y: p.canvas.y + (p.player.y - cam.scrollY) * cam.zoom * scale, w: p.player.w * cam.zoom * scale, h: p.player.h * cam.zoom * scale };
    const ratio = playerContrast(raw, box);
    if (ratio !== null) {
      facts.push(`A7 player contrast against the background: ${ratio.toFixed(1)}:1`);
      // The checklist's luminance thresholds (3:1 pass, < 2:1 blocker) flag well-made sprites whose hue, not brightness,
      // sets them apart (the kits' own sample hero is 1.6:1 on its sky), so: < 1.3 blocker, < 2 should-fix, 2–3 a fact only.
      if (ratio < 1.3) add("PT-30", "blocker", "contrast", { ratio: ratio.toFixed(1) }, `player contrast ${ratio.toFixed(1)}:1`, "Make the player stand out (≥ 3:1) without spoiling the art: a dark outline or drop shadow on the hero (e.g. a slightly larger dark copy behind it, or postFX glow/shadow), or a hero colour from the palette that contrasts with the sky; tone the background down only with a tint that keeps its look, never by covering it with a flat colour.");
      else if (ratio < 2) add("PT-30", "should-fix", "contrast", { ratio: ratio.toFixed(1) }, `player contrast ${ratio.toFixed(1)}:1`, "Raise the player's contrast to ≥ 3:1 with a dark outline or drop shadow on the hero, or a contrasting hero colour from the palette; keep the background art (no flat colour over it).");
    }
  }
  return { facts, findings };
}
