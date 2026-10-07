import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { asFiles, NotFound, ownedGame, versionFiles, type GameFiles } from "@/lib/game-studio/store";
import { readPlayPass } from "@/lib/game-studio/play-pass";
import { gameHtml, isEngine } from "@/lib/game-studio/kits";
import { cleanGamePath } from "@/lib/game-studio/files";

export const dynamic = "force-dynamic";

/**
 * The game for the studio canvas: /api/games/<id>/play/~<pass>/[v<seq>/]index.html
 * and the files next to it (game.json, src/…, assets.lock.json). The game is
 * the person's own AI-made code, so it runs sandboxed (an opaque origin: no
 * access to this site, its cookies or other windows); its own requests carry
 * the pass in the path instead of a cookie. The page accepts live patches
 * (nk-game:patch) from the studio's origin only (the runtime checks it).
 */

// The sandbox has no storage of its own; the runtime's saves get an in-memory stand-in.
const STORAGE = `<script>(function(){function mem(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}["localStorage","sessionStorage"].forEach(function(n){try{void window[n].length}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}})})();</script>\n`;

const HEADERS = {
  "cache-control": "no-store",
  "content-security-policy": "sandbox allow-scripts allow-pointer-lock; frame-ancestors 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  // The sandboxed page has an opaque origin, so its fetches of its own files are cross-origin.
  "access-control-allow-origin": "*",
};

/** The studio's origins as the browser sees them (behind the proxies), for the runtime's patch check. */
function studioOrigins(req: Request): string[] {
  const out = new Set<string>();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "")).split(",")[0].trim();
  if (host && /^[a-z0-9.:[\]-]+$/i.test(host)) {
    out.add(`${proto}://${host}`);
    if (proto === "http") out.add(`https://${host}`);
  }
  try {
    if (process.env.PUBLIC_BASE_URL) out.add(new URL(process.env.PUBLIC_BASE_URL).origin);
  } catch {
    /* not a URL */
  }
  return [...out];
}

function type(path: string): string {
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path: raw } = await ctx.params;
  const parts = raw ?? [];
  const passUser = parts[0]?.startsWith("~") ? readPlayPass(parts[0], id) : null;
  let rest = parts[0]?.startsWith("~") ? parts.slice(1) : parts;
  const userId = passUser ?? (await getCurrentUser())?.id ?? null;
  if (!userId) return new Response("Not found", { status: 404, headers: HEADERS });
  // v<seq>/…: an earlier version.
  let seq: number | null = null;
  if (/^v\d{1,6}$/.test(rest[0] ?? "")) {
    seq = Number(rest[0].slice(1));
    rest = rest.slice(1);
  }
  const file = rest.join("/") || "index.html";
  let game;
  let files: GameFiles;
  try {
    game = await ownedGame(userId, id);
    files = seq === null ? asFiles((await db.gameProject.findUnique({ where: { id }, select: { files: true } }))?.files) : await versionFiles(userId, id, seq);
  } catch (err) {
    if (err instanceof NotFound) return new Response("Not found", { status: 404, headers: HEADERS });
    throw err;
  }
  if (file === "index.html") {
    if (!isEngine(game.engine)) return new Response("Not found", { status: 404, headers: HEADERS });
    const html = gameHtml({ engine: game.engine, version: game.kitVersion, title: game.name, studioOrigins: studioOrigins(req), headExtra: STORAGE });
    return new Response(html, { headers: { ...HEADERS, "content-type": "text/html; charset=utf-8" } });
  }
  const clean = file === "assets.lock.json" ? file : cleanGamePath(file);
  const body = clean ? files[clean] : undefined;
  if (body === undefined) return new Response("Not found", { status: 404, headers: HEADERS });
  return new Response(body, { headers: { ...HEADERS, "content-type": type(clean!) } });
}
