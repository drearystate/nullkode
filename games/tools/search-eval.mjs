#!/usr/bin/env node
// Runs realistic game-builder queries against the asset index and prints the top results.
//   node search-eval.mjs [--n 5] [--json] [--filter exportable]
import { search, formatLine } from "./asset-search.mjs";

export const QUERIES = [
  ["pixel art knight walk cycle", {}],
  ["low-poly pine tree", {}],
  ["coin pickup sound", {}],
  ["UI pause button", {}],
  ["top-down racing car", {}],
  ["dungeon wall corner modular", {}],
  ["background music upbeat", {}],
  ["platformer grass ground tiles", {}],
  ["space shooter player ship", {}],
  ["explosion animation", {}],
  ["laser shoot sound", {}],
  ["health bar ui", {}],
  ["medieval house low poly", {}],
  ["isometric city building", {}],
  ["zombie enemy sprite", {}],
  ["treasure chest 3d", {}],
  ["parallax forest background", {}],
  ["footstep sound grass", {}],
  ["jump sound effect", {}],
  ["pixel heart health icon", {}],
  ["rigged character run animation", {}],
  ["playing cards", {}],
  ["tower defense turret", {}],
  ["farm crops pixel art", {}],
  ["sword weapon icon", {}],
  ["water tile top-down", {}],
  ["1-bit dungeon tileset", {}],
  ["game over jingle", {}],
  ["mobile touch joystick", {}],
  ["sci-fi corridor floor modular 3d", {}],
];

const args = process.argv.slice(2);
const n = args.includes("--n") ? +args[args.indexOf("--n") + 1] : 5;
const extra = args.includes("--filter") && args[args.indexOf("--filter") + 1] === "exportable" ? { licence: "exportable" } : {};
const t0 = Date.now();
const all = [];
for (const [q, f] of QUERIES) {
  const t = Date.now();
  const r = search(q, { ...f, ...extra, limit: n });
  all.push({ q, ms: Date.now() - t, results: r.map((x) => ({ id: x.id, name: x.name, kind: x.kind, style: x.style, view: x.view, score: x.score })) });
  if (!args.includes("--json")) {
    console.log(`\n### ${q}  (${Date.now() - t} ms)`);
    for (const x of r) console.log("  " + formatLine(x).slice(0, 220));
  }
}
if (args.includes("--json")) console.log(JSON.stringify(all, null, 1));
else console.log(`\n${QUERIES.length} queries in ${Date.now() - t0} ms`);
