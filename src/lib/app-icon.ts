import { deflateSync } from "node:zlib";

/**
 * Default icon for apps that haven't uploaded one: the app's theme colour
 * with a soft white disc. Brand-neutral (published apps must never show the
 * platform's logo), full-bleed so Android/iOS can mask it, and rendered
 * without image libraries or fonts so it works in any install.
 */
export function defaultAppIconPng(size: number, hex: string): Buffer {
  const [r, g, b] = parseHex(hex);
  const c = (size - 1) / 2;
  const outer = size * 0.26;
  const inner = size * 0.15;
  const row = size * 4 + 1;
  const raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y++) {
    raw[y * row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      // Anti-aliased ring: white between inner and outer radius.
      const ring = Math.max(0, Math.min(1, outer - d + 0.5)) * Math.max(0, Math.min(1, d - inner + 0.5));
      const i = y * row + 1 + x * 4;
      raw[i] = Math.round(r + (255 - r) * ring);
      raw[i + 1] = Math.round(g + (255 - g) * ring);
      raw[i + 2] = Math.round(b + (255 - b) * ring);
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function parseHex(hex: string): [number, number, number] {
  const h = /^#?([0-9a-f]{6})$/i.exec(hex.trim())?.[1] ?? /^#?([0-9a-f]{3})$/i.exec(hex.trim())?.[1].replace(/./g, (x) => x + x) ?? "4f46e5";
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** URL of an app's icon: its uploaded one, or the generated default. */
export function appIconUrl(project: { id: string; icon: string | null }, size = 192): string {
  return project.icon ?? `/api/app-icon/${project.id}?size=${size}`;
}
