// Asset search over the NullKode game-asset library (SQLite FTS5 index built by build-index.py).
//
//   import { search, listSet, similar, checkStyle, searchSets, getAsset, formatLine } from "./asset-search.mjs";
//   search("pixel art knight walk cycle", { kind: "animation", licence: "exportable", limit: 10 })
//
// Filters (all optional): kind ("sprite"|"model"|... or array), style ("pixel"|"pixel-8bit"|"low-poly"|...),
// family, pack ("kenney" | "kenney/nature-kit" | any id prefix), view/perspective ("side"|"top-down"|"isometric"|
// "three-quarter"|"3d"|"flat-ui"), licence ("cc0" | "exportable" = redistributable only | "any"), dim ("2d"|"3d"|
// "audio"|"font"), animated (bool), rigged (bool), tile (px), limit (default 20), includeAlts (bool).
// The DB is opened read-only and lazily; NK_ASSET_INDEX overrides its path.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.NK_ASSET_INDEX || path.join(process.env.NK_GAME_ASSETS || path.resolve(HERE, "../library"), "_index", "assets.db");

let _db = null;
function db() {
  if (!_db) {
    const Database = require(path.join(HERE, "node_modules", "better-sqlite3"));
    _db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  }
  return _db;
}

// ------------------------------------------------------------------ query understanding
const STOP = new Set(("a an the of for with and or in on to at by from my some any game games asset assets " +
  "image images picture graphic graphics art arts set pack kit thing things that this like style looking").split(" "));

// word -> extra search words (OR-ed, lower weight)
const SYN = {
  car: ["vehicle", "auto", "racing"], cars: ["car", "vehicle"], vehicle: ["car", "truck"], truck: ["vehicle", "lorry"],
  coin: ["gold", "money", "currency", "pickup"], money: ["coin", "cash", "gold"], gem: ["jewel", "diamond", "crystal"],
  pickup: ["collectible", "collect", "item"], collectible: ["pickup", "collect"], item: ["pickup", "collectible"],
  powerup: ["power-up", "boost", "bonus"], "power-up": ["powerup", "boost"],
  hero: ["player", "character"], player: ["character", "hero"], character: ["player", "npc", "hero", "person"],
  enemy: ["monster", "foe", "creature", "mob"], monster: ["enemy", "creature"], undead: ["zombie", "skeleton", "ghost"],
  knight: ["warrior", "armor", "armour", "paladin"], warrior: ["knight", "fighter"], wizard: ["mage", "sorcerer"],
  mage: ["wizard", "sorcerer"], soldier: ["army", "military"], ninja: ["assassin"],
  tree: ["trees"], pine: ["conifer", "fir", "evergreen"], rock: ["stone", "boulder"], stone: ["rock"], bush: ["shrub"],
  house: ["building", "home", "cottage"], building: ["house", "structure"], castle: ["fortress", "keep"],
  wall: ["walls"], corner: ["corners"], floor: ["ground", "tile"], ground: ["floor", "terrain"],
  dungeon: ["crypt", "cave"], cave: ["cavern", "dungeon"],
  sword: ["blade", "weapon"], gun: ["pistol", "rifle", "blaster", "weapon"], weapon: ["sword", "gun"],
  bullet: ["projectile", "shot"], projectile: ["bullet", "missile"], laser: ["blaster", "beam", "shoot"],
  explosion: ["explode", "boom", "blast"], fire: ["flame", "burning"], smoke: ["puff", "cloud"],
  heart: ["health", "life"], health: ["heart", "life", "hp"], life: ["heart", "health"],
  spaceship: ["ship", "spacecraft", "starship"], ship: ["spaceship", "boat"], boat: ["ship"], plane: ["airplane", "aircraft"],
  button: ["btn"], pause: ["paused"], menu: ["ui", "panel"], panel: ["window", "frame", "box"], bar: ["meter", "gauge"],
  arrow: ["direction"], cursor: ["pointer"], crosshair: ["reticle", "aim"],
  click: ["tap", "press", "select"], hit: ["impact", "punch", "damage"], impact: ["hit", "thud"],
  jump: ["hop", "leap"], footstep: ["step", "steps", "walk"], door: ["doors"],
  win: ["victory", "success", "complete"], victory: ["win", "success"], lose: ["fail", "game-over", "defeat"],
  upbeat: ["happy", "cheerful", "energetic", "fun"], happy: ["cheerful", "upbeat"], sad: ["melancholy"],
  calm: ["relaxing", "peaceful", "ambient"], epic: ["orchestral", "dramatic"], spooky: ["horror", "creepy", "dark"],
  racing: ["race", "car", "track"], race: ["racing"], road: ["street", "track"], track: ["road", "racing"],
  water: ["sea", "ocean", "lake"], sea: ["ocean", "water"], sky: ["clouds"], grass: ["grassy", "meadow"],
  snow: ["winter", "ice"], desert: ["sand"], space: ["sci-fi", "galaxy"], scifi: ["sci-fi"],
  medieval: ["fantasy"], fantasy: ["medieval", "magic"], farm: ["farming", "crops"], food: ["fruit", "meal"],
  chest: ["treasure", "loot"], treasure: ["chest", "loot"], key: ["keys"], potion: ["flask", "bottle"],
  touch: ["mobile", "tap", "touchscreen"], mobile: ["touch", "phone"], joystick: ["thumbstick", "stick", "analog"],
  dpad: ["d-pad", "direction"], corridor: ["hallway", "hall", "passage"], hallway: ["corridor"],
  card: ["cards", "playing-card"], dice: ["die"], chess: ["board"], ball: ["sphere"],
};

// phrases / words that imply a kind, a dimension, style, view, or animation (soft boosts unless forced)
const KIND_HINTS = [
  [/\b(music|song|soundtrack|bgm|theme tune|background music)\b/, { kind: ["music"], dim: "audio" }],
  [/\b(sound|sounds|sfx|sound effect|noise|audio)\b/, { kind: ["sfx", "music"], dim: "audio" }],
  [/\b(jingle|stinger|fanfare)\b/, { kind: ["music", "sfx"], dim: "audio" }],
  [/\b(icon|icons|pictogram)\b/, { kind: ["icon"] }],
  [/\b(ui|hud|menu|gui|interface|button|panel|slider|checkbox|health bar|progress bar|window)\b/, { kind: ["ui", "icon"] }],
  [/\b(background|backdrop|parallax|skyline|scenery)\b/, { kind: ["background"] }],
  [/\b(tileset|tile set|tilemap|tile map|tilesheet|tile sheet)\b/, { kind: ["tileset"] }],
  [/\b(texture|material|seamless|pattern)\b/, { kind: ["texture"] }],
  [/\b(font|typeface|lettering)\b/, { kind: ["font"] }],
  [/\b(spritesheet|sprite sheet|atlas)\b/, { kind: ["spritesheet"] }],
  [/\bsprites?\b/, { kind: ["sprite", "animation", "spritesheet"] }],
  [/\b(walk cycle|run cycle|walk animation|run animation|animation|animated|anim|frames|idle animation)\b/, { animated: true }],
  [/\b(3d|model|mesh|low ?poly|lowpoly|glb|gltf|voxel)\b/, { dim: "3d" }],
  [/\b(sprite|2d|pixel|pixel art|8 ?bit|16 ?bit|1 ?bit)\b/, { dim: "2d" }],
  [/\brigged\b/, { rigged: true }],
];
const STYLE_HINTS = [
  [/\b1 ?-?bit\b|\bmonochrome\b/, "pixel-1bit"], [/\bpixel|\b8 ?-?bit\b|\b16 ?-?bit\b|\bretro\b/, "pixel"],
  [/\blow ?-?poly\b|\blowpoly\b/, "low-poly"], [/\bvoxel\b/, "voxel"], [/\bvector\b|\bflat\b/, "flat-vector"],
  [/\bhand ?-?drawn\b|\bsketch\b/, "hand-drawn"], [/\bcartoon\b/, "cartoon"],
];
const VIEW_HINTS = [
  [/\btop ?-?down\b|\boverhead\b|\bbird'?s? eye\b/, "top-down"], [/\bisometric\b|\biso\b/, "isometric"],
  [/\bside ?-?(view|scroller|scrolling|on)?\b|\bplatformer\b/, "side"],
];
const ROLE_HINTS = [
  [/\b(pickup|collectible|coin|gem|powerup|power-up)\b/, ["collectible", "pickup", "powerup"]],
  [/\b(enemy|monster|foe)\b/, ["enemy"]], [/\b(player|hero|playable)\b/, ["player"]],
  [/\b(wall|walls)\b/, ["wall"]], [/\b(floor|ground)\b/, ["floor", "terrain", "tile"]],
  [/\b(button)\b/, ["ui-button"]], [/\b(panel|window)\b/, ["ui-panel"]], [/\bhud\b/, ["hud"]],
  [/\b(projectile|bullet|missile)\b/, ["projectile"]], [/\b(background music|bgm|soundtrack|music loop|loop|loopable|theme)\b/, ["music-loop"]],
  [/\b(jingle|stinger|fanfare|game-over)\b/, ["jingle"]],
  [/\b(sound|sfx)\b/, ["sfx-event"]], [/\b(prop|props)\b/, ["prop"]],
];
const HINT_WORDS = new Set(("sound sounds sfx effect noise audio music song soundtrack bgm icon icons ui hud gui " +
  "interface background backdrop tileset tilemap tilesheet texture material font spritesheet atlas animation " +
  "animated anim cycle cycles loop frames 3d model mesh low poly lowpoly low-poly 2d sprite pixel bit 8bit 16bit 1bit 8-bit " +
  "16-bit 1-bit retro voxel vector flat isometric iso top down top-down overhead side view scroller rigged cartoon").split(" "));

function stem(w) {
  // light stemmer so coverage checks match FTS porter roughly
  return w.replace(/(ies)$/, "y").replace(/(ing|ers|er|es|s|ed)$/, "") || w;
}

export function parseQuery(q) {
  const text = (q || "").toLowerCase().replace(/[_]/g, " ").trim()
    .replace(/\bgame over\b/g, "game-over").replace(/\bpower ups?\b/g, "powerup").replace(/\bsci fi\b/g, "sci-fi")
    .replace(/\blow poly\b/g, "low-poly").replace(/\btop down\b/g, "top-down")
    .replace(/\bside scroll(er|ing)\b/g, "side platformer");
  const raw = text.split(/[^a-z0-9\-+']+/).filter(Boolean);
  const hints = { kind: null, dim: null, animated: false, rigged: false, style: null, view: null, roles: [] };
  for (const [re, h] of KIND_HINTS) if (re.test(text)) {
    if (h.kind && !hints.kind) hints.kind = h.kind;
    if (h.dim && !hints.dim) hints.dim = h.dim;
    if (h.animated) hints.animated = true;
    if (h.rigged) hints.rigged = true;
  }
  for (const [re, s] of STYLE_HINTS) if (re.test(text)) { hints.style = s; break; }
  for (const [re, v] of VIEW_HINTS) if (re.test(text)) { hints.view = v; break; }
  for (const [re, r] of ROLE_HINTS) if (re.test(text)) hints.roles.push(...r);
  // content terms: words that are not stop words; hint-only words are kept but weigh less
  const terms = [];
  for (let w of raw) {
    w = w.replace(/^-+|-+$/g, "");
    if (!w || STOP.has(w) || w.length < 2 && !/^[a-z0-9]$/.test(w)) continue;
    if (terms.some((t) => t.word === w)) continue;
    const parts = w.includes("-") ? w.split("-").filter(Boolean) : [w];
    terms.push({ word: w, parts, syn: SYN[w] || [], hint: HINT_WORDS.has(w) });
  }
  return { text, terms, hints };
}

function ftsEscape(w) { return '"' + w.replace(/"/g, '""') + '"'; }

function ftsQuery(terms) {
  const groups = [];
  for (const t of terms) {
    const alts = new Set();
    alts.add(t.parts.length > 1 ? t.parts.map(ftsEscape).join(" + ") : ftsEscape(t.word) + (t.word.length >= 4 ? "*" : ""));
    for (const s of t.syn) {
      const sp = s.split("-").filter(Boolean);
      alts.add(sp.length > 1 ? sp.map(ftsEscape).join(" + ") : ftsEscape(s));
    }
    groups.push("(" + [...alts].join(" OR ") + ")");
  }
  return groups.join(" OR ");
}

// ------------------------------------------------------------------ filters
function addFilters(f, where, params) {
  const arr = (v) => (Array.isArray(v) ? v : String(v).split(",")).map((s) => s.trim()).filter(Boolean);
  if (f.kind) { const k = arr(f.kind); where.push(`a.kind IN (${k.map(() => "?").join(",")})`); params.push(...k); }
  if (f.style) {
    const s = arr(f.style);
    const c = [];
    for (const x of s) {
      if (x === "pixel") c.push("a.family = 'pixel'");
      else if (x === "3d") c.push("a.dim = '3d'");
      else if (x === "low-poly" || x === "stylised-3d" || x === "stylized-3d") c.push("a.family = 'low-poly-3d'");
      else if (x === "cartoon") { c.push("a.style IN ('cartoon-hd','flat-vector')"); }
      else { c.push("a.style = ?"); params.push(x); }
    }
    where.push("(" + c.join(" OR ") + ")");
  }
  if (f.family) { where.push("a.family = ?"); params.push(f.family); }
  if (f.pack) {
    const p = arr(f.pack);
    where.push("(" + p.map(() => "(a.id = ? OR a.id LIKE ? ESCAPE '\\')").join(" OR ") + ")");
    for (const x of p) params.push(x, x.replace(/[%_\\]/g, "\\$&") + "/%");
  }
  const view = f.view || f.perspective;
  if (view) { const v = arr(view); where.push(`a.view IN (${v.map(() => "?").join(",")})`); params.push(...v); }
  if (f.licence || f.license) {
    const l = String(f.licence || f.license);
    if (l === "exportable" || l === "open-source" || l === "redistributable") where.push("a.redistributable = 1");
    else if (l !== "any") { where.push("a.licence = ?"); params.push(l); }
  }
  if (f.dim) { where.push("a.dim = ?"); params.push(f.dim); }
  if (f.animated === true) where.push("a.animated = 1");
  if (f.animated === false) where.push("a.animated = 0");
  if (f.rigged === true) where.push("a.rigged = 1");
  if (f.tile) { where.push("(a.tile = ? OR (a.kind IN ('sprite','tileset') AND a.w = ? AND a.h = ?))"); params.push(+f.tile, +f.tile, +f.tile); }
  if (!f.includeAlts) where.push("a.alt_of IS NULL");
}

const COLS = `a.rid, a.id, a.set_id, a.category, a.kind, a.name, a.desc, a.style, a.family, a.view, a.roles, a.tags,
  a.use, a.licence, a.redistributable, a.dim, a.animated, a.rigged, a.clips, a.clip_names, a.frames, a.tile, a.w, a.h,
  a.tris, a.size_m, a.height_m, a.footprint_m, a.pivot, a.duration, a.url, a.preview, a.facts, a.source, a.alts, a.variant,
  a.rig, a.in_atlas, a.pairs`;

// ------------------------------------------------------------------ ranking
function haystack(r) {
  return " " + [r.name, (r.tags || "").replace(/,/g, " "), r.desc, r.id.replace(/[\/\-_]/g, " "), r.roles.replace(/,/g, " "),
    r.style, r.view, r.kind, r.clip_names.replace(/[_,]/g, " ")].join(" ").toLowerCase() + " ";
}
function hasWord(hay, w) {
  const s = stem(w);
  return hay.includes(" " + w) || (s.length >= 3 && hay.includes(" " + s));
}

// inverse document frequency of a query term (cached): rare words (zombie) weigh more than common ones (enemy)
const _idf = new Map();
let _total = 0;
function idf(t) {
  if (_idf.has(t.word)) return _idf.get(t.word);
  if (!_total) _total = db().prepare("SELECT count(*) n FROM assets").get().n;
  let df = 1;
  try {
    const q = t.parts.length > 1 ? t.parts.map(ftsEscape).join(" + ") : ftsEscape(t.word);
    df = db().prepare("SELECT count(*) n FROM assets_fts WHERE assets_fts MATCH ?").get(q).n || 1;
  } catch { /* keep 1 */ }
  const w = Math.max(0.5, Math.log(_total / df));
  _idf.set(t.word, w);
  return w;
}

function rerank(rows, pq, filters) {
  const content = pq.terms.filter((t) => !t.hint);
  const terms = content.length ? content : pq.terms;
  const weights = terms.map(idf);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const h = pq.hints;
  for (const r of rows) {
    const hay = haystack(r);
    const nameHay = " " + (r.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ") + " " + r.id.split("/").pop().replace(/-/g, " ") + " ";
    let cov = 0, nameHits = 0, missing = 0;
    terms.forEach((t, i) => {
      const direct = t.parts.every((p) => hasWord(hay, p));
      if (!direct) missing += weights[i];
      const viaSyn = !direct && t.syn.some((s) => s.split("-").every((p) => hasWord(hay, p)));
      if (direct) cov += weights[i]; else if (viaSyn) cov += 0.4 * weights[i];
      if (direct && t.parts.every((p) => hasWord(nameHay, p))) nameHits += 1;
    });
    const coverage = terms.length ? cov / wsum : 0;
    let s = coverage * 10 + nameHits * 1.5 + Math.min(4, -r.bm25 / 4) - 0.5 * missing;
    // soft hints (ignored when the caller fixed the same filter)
    if (h.kind && !filters.kind) s += h.kind.includes(r.kind) ? (h.kind[0] === r.kind ? 4 : 2.5) : -3;
    if (h.dim && !filters.dim) s += r.dim === h.dim ? 1.5 : -2;
    if (h.animated && filters.animated === undefined) s += r.animated ? 3 : -1;
    if (h.rigged) s += r.rigged ? 2 : 0;
    if (h.style && !filters.style) {
      const ok = h.style === "pixel" ? r.family === "pixel" : h.style === "cartoon" ? ["cartoon-hd", "flat-vector"].includes(r.style)
        : h.style === "low-poly" ? r.family === "low-poly-3d" : r.style === h.style;
      s += ok ? 2.5 : (h.style === "pixel" || h.style === "pixel-1bit") && r.dim === "3d" ? -8
        : (h.style === "low-poly" || h.style === "voxel") && r.dim !== "3d" ? -3 : -1.5;
    }
    if (h.view && !filters.view && !filters.perspective) s += r.view === h.view ? 2 : (!r.view ? -0.5 : r.view === "3d" && h.dim !== "3d" ? -2 : -1.5);
    if (h.roles.length) { const rr = (r.roles || "").split(","); if (h.roles.some((x) => rr.includes(x))) s += 1.5; }
    if (h.roles.includes("music-loop") && r.kind === "music") s += r.duration >= 8 ? 2 : -2; // loops are long
    if (r.source === "ai") s += 0.5;
    if (r.redistributable) s += 0.3; // CC0 wins ties: usable in every game, including exported ones
    r.score = Math.round(s * 100) / 100;
    r.coverage = coverage;
    if (process.env.NK_SEARCH_DEBUG) r.debug = { coverage: +coverage.toFixed(2), nameHits, missing: +missing.toFixed(2), bm25: +r.bm25.toFixed(2) };
  }
  rows.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return rows;
}

function shape(r) {
  return {
    id: r.id, name: r.name, kind: r.kind, style: r.style, view: r.view, set: r.set_id, licence: r.licence,
    redistributable: !!r.redistributable, url: r.url, preview: r.preview, metrics: r.facts, use: r.use || "",
    desc: r.desc || "", tags: r.tags ? r.tags.split(",") : [], roles: r.roles ? r.roles.split(",") : [],
    animated: !!r.animated, rigged: !!r.rigged, clips: r.clip_names ? r.clip_names.split(",") : [],
    frames: r.frames, tile: r.tile, w: r.w, h: r.h, tris: r.tris, sizeM: r.size_m, pivot: r.pivot,
    duration: r.duration, alts: r.alts, debug: r.debug, rig: r.rig || undefined, inAtlas: r.in_atlas || undefined,
    pairs: r.pairs || undefined, score: r.score,
  };
}

/** Full-text search with filters. Returns compact result objects (see shape()). */
export function search(query, filters = {}) {
  const limit = Math.max(1, Math.min(500, +filters.limit || 20));
  const pq = parseQuery(query);
  const where = [], params = [];
  addFilters(filters, where, params);
  let rows;
  if (pq.terms.length) {
    const sql = `SELECT ${COLS}, bm25(assets_fts, 6.0, 4.0, 1.5, 2.0, 0.5) AS bm25 FROM assets_fts
      JOIN assets a ON a.rid = assets_fts.rowid WHERE assets_fts MATCH ? ${where.length ? "AND " + where.join(" AND ") : ""}
      ORDER BY bm25 LIMIT ?`;
    rows = db().prepare(sql).all(ftsQuery(pq.terms), ...params, Math.max(600, limit * 30));
  } else {
    rows = db().prepare(`SELECT ${COLS}, 0 AS bm25 FROM assets a ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY a.id LIMIT ?`).all(...params, limit * 5);
  }
  rerank(rows, pq, filters);
  // keep result lists varied: at most `perVariant` of the same base item (colour/letter/number variants), and a
  // small penalty for every earlier pick from the same set (unless the caller searches inside one set)
  const perVariant = filters.perVariant ?? 2;
  const setPenalty = filters.pack ? 0 : (filters.setPenalty ?? 0.7);
  const seen = new Map(), perSet = new Map(), out = [];
  let pool = rows.slice(0, Math.max(limit * 12, 120));
  while (out.length < limit && pool.length) {
    let best = -1, bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const r = pool[i];
      if ((seen.get(r.variant) || 0) >= perVariant) continue;
      const adj = r.score - setPenalty * (perSet.get(r.set_id) || 0);
      if (adj > bestScore) { bestScore = adj; best = i; }
      if (r.score < bestScore - 0.001 && i > 40) break; // sorted by score: nothing later can win
    }
    if (best < 0) break;
    const r = pool.splice(best, 1)[0];
    seen.set(r.variant, (seen.get(r.variant) || 0) + 1);
    perSet.set(r.set_id, (perSet.get(r.set_id) || 0) + 1);
    out.push(shape(r));
  }
  return out;
}

/** Everything in a set/category (id prefix), optionally narrowed by a query. */
export function listSet(prefix, opts = {}) {
  const limit = Math.max(1, Math.min(5000, +opts.limit || 400));
  const f = { ...opts, pack: prefix, limit };
  if (opts.query) return search(opts.query, { ...f, perVariant: 1000 });
  const where = [], params = [];
  addFilters(f, where, params);
  const rows = db().prepare(`SELECT ${COLS}, 0 AS bm25 FROM assets a WHERE ${where.join(" AND ")} ORDER BY a.category, a.id LIMIT ?`)
    .all(...params, limit + 1);
  const total = db().prepare(`SELECT count(*) n FROM assets a WHERE ${where.join(" AND ")}`).get(...params).n;
  const out = rows.slice(0, limit).map(shape);
  out.total = total;
  return out;
}

export function getAsset(id) {
  const r = db().prepare(`SELECT ${COLS}, a.frame_names, 0 AS bm25 FROM assets a WHERE a.id = ?`).get(id);
  if (!r) return null;
  const out = shape(r);
  if (r.frame_names) out.frameNames = r.frame_names.split(",");
  return out;
}

/** Same-set / same-style neighbours of an asset, ranked by shared tags. */
export function similar(id, opts = {}) {
  const limit = Math.max(1, Math.min(200, +opts.limit || 20));
  const base = db().prepare(`SELECT ${COLS}, 0 AS bm25 FROM assets a WHERE a.id = ?`).get(id);
  if (!base) throw new Error(`unknown asset id: ${id}`);
  const tags = new Set((base.tags || "").split(",").filter(Boolean));
  const where = ["a.id != ?", "a.alt_of IS NULL"], params = [id];
  const f = { ...opts };
  addFilters({ ...f, includeAlts: true }, where, params);
  // candidates: same set, plus same style+view+dim elsewhere matching the name words
  const same = db().prepare(`SELECT ${COLS}, 0 AS bm25 FROM assets a WHERE a.set_id = ? AND ${where.join(" AND ")} LIMIT 3000`)
    .all(base.set_id, ...params);
  const words = [...tags].slice(0, 12).map((t) => t.split("-")[0]).filter((w) => w.length > 2);
  let other = [];
  if (words.length) {
    other = db().prepare(`SELECT ${COLS}, bm25(assets_fts) AS bm25 FROM assets_fts JOIN assets a ON a.rid = assets_fts.rowid
      WHERE assets_fts MATCH ? AND a.set_id != ? AND a.dim = ? AND (a.style IS ? OR a.family IS ?) AND ${where.join(" AND ")}
      ORDER BY bm25 LIMIT 600`).all(words.map(ftsEscape).join(" OR "), base.set_id, base.dim, base.style, base.family, ...params);
  }
  const score = (r) => {
    const t = (r.tags || "").split(",").filter(Boolean);
    const inter = t.filter((x) => tags.has(x)).length;
    const jac = inter / Math.max(1, tags.size + t.length - inter);
    let s = jac * 10;
    if (r.category === base.category) s += 2;
    if (r.set_id === base.set_id) s += 2;
    if (r.kind === base.kind) s += 1.5;
    if (r.style === base.style) s += 1;
    if (r.view === base.view) s += 1;
    if (r.variant === base.variant) s += 1.5;
    return s;
  };
  const all = [...same, ...other];
  for (const r of all) r.score = Math.round(score(r) * 100) / 100;
  all.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return all.slice(0, limit).map(shape);
}

/** Set-level search over the pack/category cards. */
export function searchSets(query, filters = {}) {
  const limit = Math.max(1, Math.min(100, +filters.limit || 10));
  const pq = parseQuery(query);
  const where = [], params = [];
  if (filters.licence === "exportable" || filters.licence === "open-source") where.push("s.redistributable = 1");
  if (filters.pack) { where.push("s.set_id LIKE ?"); params.push(filters.pack + "%"); }
  if (filters.engine) { where.push("s.engine LIKE ?"); params.push(filters.engine + "%"); }
  if (!pq.terms.length) {
    return db().prepare(`SELECT * FROM sets s ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY set_id LIMIT ?`).all(...params, limit);
  }
  // rank sets by card text + how many of the set's assets match the query
  const cards = db().prepare(`SELECT s.*, bm25(sets_fts, 3.0, 3.0, 1.0, 1.0) AS bm25 FROM sets_fts JOIN sets s ON s.rowid = sets_fts.rowid
    WHERE sets_fts MATCH ? ${where.length ? "AND " + where.join(" AND ") : ""} ORDER BY bm25 LIMIT 60`).all(ftsQuery(pq.terms), ...params);
  const hits = search(query, { ...filters, limit: 300, perVariant: 1000 });
  const per = new Map();
  for (const h of hits) per.set(h.set, (per.get(h.set) || 0) + h.score);
  const by = new Map();
  for (const c of cards) by.set(c.set_id, { ...c, score: Math.min(6, -c.bm25) });
  for (const [s, v] of per) {
    if (!by.has(s)) {
      const c = db().prepare("SELECT * FROM sets WHERE set_id = ?").get(s);
      if (c) by.set(s, { ...c, score: 0 });
    }
    if (by.has(s)) by.get(s).score += Math.min(12, v / 10);
  }
  return [...by.values()].sort((a, b) => b.score - a.score).slice(0, limit)
    .map((c) => ({ set: c.set_id, title: c.title, assets: c.assets, style: c.style, view: c.view, engine: c.engine,
      licence: c.licence, summary: c.summary, card: c.card ? "/game-assets/" + c.card : null, score: Math.round(c.score * 10) / 10 }));
}

// ------------------------------------------------------------------ style coherence
const FAMILY_LABEL = { pixel: "pixel art", "smooth-2d": "smooth 2D (vector/cartoon)", "drawn-2d": "hand-drawn 2D",
  realistic: "realistic", "low-poly-3d": "low-poly/stylised 3D", "voxel-3d": "voxel 3D" };

/** Given chosen ids, warn when styles / views / dimensions / scales / licences mix. */
export function checkStyle(ids, opts = {}) {
  const rows = ids.map((id) => db().prepare(`SELECT ${COLS}, 0 AS bm25 FROM assets a WHERE a.id = ?`).get(id));
  const missing = ids.filter((id, i) => !rows[i]);
  const got = rows.filter(Boolean);
  const warnings = [];
  const visual = got.filter((r) => r.dim === "2d" || r.dim === "3d");
  const groupBy = (arr, k) => arr.reduce((m, r) => (m.set(r[k] || "?", [...(m.get(r[k] || "?") || []), r.id]), m), new Map());
  const dims = groupBy(visual.filter((r) => !["ui", "icon", "font"].includes(r.kind)), "dim");
  if (dims.size > 1) warnings.push(`mixes 2D and 3D game art: ${[...dims].map(([k, v]) => `${k}: ${v.length}`).join(", ")} (fine only for UI/icons over a 3D scene)`);
  const fam = groupBy(visual, "family");
  if (fam.size > 1) {
    const parts = [...fam].map(([k, v]) => `${FAMILY_LABEL[k] || k}: ${v.slice(0, 3).join(", ")}${v.length > 3 ? ` +${v.length - 3}` : ""}`);
    const hasPixel = fam.has("pixel");
    warnings.push(`${hasPixel ? "pixel art mixed with non-pixel art" : "art styles mix"}: ${parts.join(" | ")}`);
  }
  const px = visual.filter((r) => r.family === "pixel");
  const one = px.filter((r) => r.style === "pixel-1bit"), colour = px.filter((r) => r.style !== "pixel-1bit");
  if (one.length && colour.length) warnings.push(`1-bit pixel art (${one.slice(0, 3).map((r) => r.id).join(", ")}) mixed with colour pixel art (${colour.slice(0, 3).map((r) => r.id).join(", ")})`);
  const tiles = groupBy(visual.filter((r) => r.tile), "tile");
  if (tiles.size > 1) warnings.push(`tile sizes differ: ${[...tiles.keys()].map((k) => k + " px").join(", ")} (scale to one grid or pick one size)`);
  // top-down, three-quarter and front-facing sprites work together (RPG maps); side-view and isometric do not mix
  const VIEW_GROUP = { "top-down": "top-down/three-quarter", "three-quarter": "top-down/three-quarter", front: "top-down/three-quarter", side: "side-view", isometric: "isometric" };
  const viewed = visual.filter((r) => r.dim === "2d" && !["ui", "icon", "font", "background", "texture"].includes(r.kind) && VIEW_GROUP[r.view])
    .map((r) => ({ ...r, vgroup: VIEW_GROUP[r.view] }));
  const views = groupBy(viewed, "vgroup");
  if (views.size > 1) warnings.push(`perspectives differ: ${[...views].map(([k, v]) => `${k}: ${v.slice(0, 3).join(", ")}`).join(" | ")}`);
  const models = visual.filter((r) => r.dim === "3d");
  const sets3d = groupBy(models, "set_id");
  if (sets3d.size > 1) {
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const scales = [...sets3d].map(([s]) => [s, db().prepare("SELECT footprint_m f FROM assets WHERE set_id = ? AND dim = '3d' AND footprint_m IS NOT NULL").all(s).map((x) => x.f)]);
    const meds = scales.filter(([, v]) => v.length).map(([s, v]) => [s, med(v)]);
    const lo = Math.min(...meds.map((m) => m[1])), hi = Math.max(...meds.map((m) => m[1]));
    if (meds.length > 1 && hi / Math.max(lo, 0.01) > 1.8) warnings.push(`3D kits use different scales (median footprint ${meds.map(([s, m]) => `${s} ${m.toFixed(1)} m`).join(", ")}): rescale with NK3D.model(..., { height }) or { scale }`);
  }
  const sets = groupBy(visual, "set_id");
  if (sets.size > 2) warnings.push(`assets come from ${sets.size} different sets (${[...sets.keys()].join(", ")}): check they look alike, prefer one main set`);
  const ci = got.filter((r) => !r.redistributable);
  if (ci.length) warnings.push(`${ci.length} asset(s) that are not redistributable (this server only, not for exported/open-source games): ${ci.slice(0, 4).map((r) => r.id).join(", ")}${ci.length > 4 ? " ..." : ""}`);
  return {
    ok: warnings.length === 0, warnings, missing,
    summary: `${got.length} assets; styles: ${[...fam.keys()].map((k) => FAMILY_LABEL[k] || k).join(", ") || "-"}; sets: ${[...groupBy(got, "set_id").keys()].join(", ")}`,
  };
}

// ------------------------------------------------------------------ formatting
/** One token-cheap line per asset. */
export function formatLine(r, { showDesc = false } = {}) {
  const tags = [];
  if (r.style) tags.push(r.style);
  if (r.view && r.view !== "3d") tags.push(r.view);
  if (r.licence !== "cc0") tags.push("not-redistributable");
  const u = r.use ? ` | ${r.use}` : "";
  const d = showDesc && r.desc ? ` | ${r.desc}` : "";
  const alt = r.alts ? " (+svg)" : "";
  const extra = (r.rig ? `, ${r.rig}` : "") + (r.inAtlas ? `, atlas ${r.inAtlas}` : "") + (r.pairs ? `; ${r.pairs}` : "");
  return `${r.id} | ${r.name} | ${r.kind} ${tags.join(" ")} | ${r.metrics}${alt}${extra}${d}${u}`;
}

export function meta() {
  return Object.fromEntries(db().prepare("SELECT k, v FROM meta").all().map((r) => [r.k, r.v]));
}
