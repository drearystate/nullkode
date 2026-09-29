import { ImageResponse } from "next/og";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { liveSnapshot } from "@/lib/deployments";
import { defaultAppIconPng } from "@/lib/app-icon";
import { hitLimit } from "@/lib/rate-limit";
import { CARD_HEIGHT, CARD_WIDTH, cardCanShowName, cardVersion, themePrimary } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The picture shown when an app's link is shared (og:image) and the page has
 * no picture of its own: 1200×630 in the app's theme colour, with its icon
 * and name. Built from the app's own name, icon and colour only; nothing in
 * the request changes what is drawn (?v= only busts caches).
 *
 * Kept cheap and safe: finished cards are cached (in memory and by browsers
 * and crawlers), at most two render at once, cache misses are rate limited per
 * visitor, and the icon is only ever read from this server's own files
 * (PNG or JPEG, size- and dimension-capped), never fetched from an address.
 * The card's font covers Latin letters only; a name in another script shows
 * the icon on its own rather than making the renderer download fonts.
 */

const MAX_ICON_BYTES = 1_000_000;
const MAX_ICON_SIDE = 2048;

const cards = new Map<string, Uint8Array>();
const CARDS_MAX = 64;

let active = 0;
const MAX_ACTIVE = 2;
const waiting: Array<() => void> = [];
const MAX_WAITING = 16;

/** Runs `fn` when a render slot is free; null when too many are queued. */
async function inSlot<T>(fn: () => Promise<T>): Promise<T | null> {
  if (active >= MAX_ACTIVE) {
    if (waiting.length >= MAX_WAITING) return null;
    await new Promise<void>((resolve) => waiting.push(resolve));
  } else {
    active++;
  }
  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next(); // hand the slot straight on
    else active--;
  }
}

function pngSize(buf: Buffer): [number, number] | null {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

function jpegSize(buf: Buffer): [number, number] | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xff) { i++; continue; }
    const len = buf.readUInt16BE(i + 2);
    // Baseline, extended and progressive frames (the ones the renderer reads).
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

/** The app's uploaded icon as a data URL, if it's a small PNG or JPEG in this server's public folder. */
async function localIcon(src: string | null): Promise<string | null> {
  if (!src || !src.startsWith("/") || src.startsWith("//")) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(src.split(/[?#]/)[0]);
  } catch {
    return null;
  }
  const ext = path.extname(rel).toLowerCase();
  if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") return null;
  try {
    const root = await realpath(path.join(process.cwd(), "public"));
    const file = await realpath(path.join(root, rel));
    if (!file.startsWith(root + path.sep)) return null;
    const info = await stat(file);
    if (!info.isFile() || info.size > MAX_ICON_BYTES) return null;
    const buf = await readFile(file);
    const png = pngSize(buf);
    const size = png ?? jpegSize(buf);
    if (!size || size[0] < 1 || size[1] < 1 || size[0] > MAX_ICON_SIDE || size[1] > MAX_ICON_SIDE) return null;
    return `data:image/${png ? "png" : "jpeg"};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function defaultIcon(color: string): string {
  return `data:image/png;base64,${defaultAppIconPng(256, color).toString("base64")}`;
}

/** Dark text on light colours, white on dark ones. */
function textColorOn(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111827" : "#ffffff";
}

function shortName(name: string): string {
  const chars = Array.from(name.normalize("NFC").replace(/\s+/g, " ").trim());
  return chars.length > 60 ? `${chars.slice(0, 59).join("").trimEnd()}…` : chars.join("");
}

async function renderCard(name: string, color: string, icon: string): Promise<Uint8Array> {
  const showName = cardCanShowName(name);
  const label = shortName(name);
  const fontSize = label.length <= 18 ? 88 : label.length <= 30 ? 72 : label.length <= 45 ? 60 : 52;
  const iconSize = showName ? 200 : 280;
  const card = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: color,
        backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 55%, rgba(0,0,0,0.16) 100%)",
        padding: "0 80px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" width={iconSize} height={iconSize} style={{ width: iconSize, height: iconSize, borderRadius: iconSize * 0.22, objectFit: "cover", boxShadow: "0 18px 48px rgba(0,0,0,0.25)" }} />
      {showName && (
        <div style={{ display: "flex", marginTop: 44, fontSize, lineHeight: 1.15, color: textColorOn(color), textAlign: "center", justifyContent: "center", maxWidth: 1040 }}>
          {label}
        </div>
      )}
    </div>
  );
  const res = new ImageResponse(card, { width: CARD_WIDTH, height: CARD_HEIGHT });
  return new Uint8Array(await res.arrayBuffer());
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, name: true, icon: true, theme: true, published: true, ownerId: true, liveDeploymentId: true },
  });
  if (!project) return new Response("Not found", { status: 404 });
  // Unpublished apps: only their owner (the Publish screen's preview).
  if (!project.published) {
    const user = await getCurrentUser();
    if (!user || user.id !== project.ownerId) return new Response("Not found", { status: 404 });
  }
  const live = project.liveDeploymentId ? await liveSnapshot(project.id) : null;
  const color = themePrimary(live && live.theme !== undefined ? live.theme : project.theme);
  const version = cardVersion(project.name, color, project.icon);
  const etag = `"${version}"`;
  const headers = {
    "content-type": "image/png",
    "cache-control": project.published ? "public, max-age=86400, stale-while-revalidate=604800" : "private, max-age=60",
    etag,
  };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const key = `${project.id}:${version}`;
  let png = cards.get(key);
  if (!png) {
    const ip = req.headers.get("x-real-ip")?.trim() || "unknown";
    const limit = hitLimit(`og-card:${ip}`, 30, 60_000);
    if (!limit.ok) return new Response("Too many requests", { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });
    const rendered = await inSlot(async () => {
      const icon = (await localIcon(project.icon)) ?? defaultIcon(color);
      try {
        return await renderCard(project.name, color, icon);
      } catch (err) {
        // An icon the renderer can't read: fall back to the generated one.
        console.warn("[og] share card fell back to the default icon:", err instanceof Error ? err.message : err);
        return renderCard(project.name, color, defaultIcon(color));
      }
    }).catch((err) => {
      console.error("[og] couldn't draw a share card:", err instanceof Error ? err.message : err);
      return undefined;
    });
    if (rendered === null) return new Response("Busy", { status: 503, headers: { "retry-after": "5" } });
    if (!rendered) return new Response("Couldn't draw the picture", { status: 500 });
    png = rendered;
    if (cards.size >= CARDS_MAX) cards.delete(cards.keys().next().value!);
    cards.set(key, png);
  }
  return new Response(new Uint8Array(png), { headers });
}
