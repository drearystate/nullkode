#!/usr/bin/env node
// Plays an example game on this computer (127.0.0.1 only), with the same paths
// NullKode serves games on:
//   /              -> the game's folder (index.html, game.json, src/, assets.lock.json)
//   /nk-engine/    -> games/engine/kits (NK_GAME_KITS)
//   /game-assets/  -> the asset library (NK_GAME_ASSETS, default games/library)
//
//   node games/showcase/serve.mjs mars-base [port]
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
const games = fs.readdirSync(HERE, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(HERE, d.name, "game.json"))).map((d) => d.name);
if (!name || !games.includes(name)) {
  console.log(`Usage: node games/showcase/serve.mjs <game> [port]\nGames: ${games.join(", ")}`);
  process.exit(name ? 1 : 0);
}
const GAME = path.join(HERE, name);
const KITS = path.resolve(process.env.NK_GAME_KITS || path.join(HERE, "../engine/kits"));
const LIB = path.resolve(process.env.NK_GAME_ASSETS || path.join(HERE, "../library"));
if (!fs.existsSync(path.join(LIB, "catalog.jsonl"))) console.warn(`No asset library at ${LIB}: the game will start without its models, sprites and sounds. See docs/games.md.`);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".glb": "model/gltf-binary", ".bin": "application/octet-stream", ".wasm": "application/wasm", ".ttf": "font/ttf", ".otf": "font/otf", ".woff2": "font/woff2", ".xml": "application/xml", ".ktx2": "image/ktx2" };

const free = (port) => new Promise((res) => { const s = net.createServer().once("error", () => res(false)).once("listening", () => s.close(() => res(true))).listen(port, "127.0.0.1"); });

let port = Number(process.argv[3]) || 0;
if (!port) for (let p = 3460; p < 3500; p++) if (await free(p)) { port = p; break; }

http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end(); return; }
  let base = GAME, sub = rel;
  if (rel.startsWith("/nk-engine/")) { base = KITS; sub = rel.slice("/nk-engine/".length); }
  else if (rel.startsWith("/game-assets/")) { base = LIB; sub = rel.slice("/game-assets/".length); }
  let file = path.resolve(base, "." + path.posix.normalize("/" + sub));
  if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }).end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(data);
  });
}).listen(port, "127.0.0.1", () => console.log(`${name}: http://127.0.0.1:${port}/`));
