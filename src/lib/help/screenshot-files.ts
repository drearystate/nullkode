import { open } from "node:fs/promises";
import path from "node:path";

/** Where scripts/help-screenshots.ts saves the guides' screenshots. */
export const HELP_IMAGE_DIR = path.join(process.cwd(), "public", "help");

/**
 * The on-screen size of a captured screenshot, or null when the file isn't
 * there (screenshots are captured separately, so a guide may reference one
 * that doesn't exist yet). Screenshots are taken at 2x, so the size is half
 * the image's pixels.
 */
export async function screenshotSize(file: string): Promise<{ width: number; height: number } | null> {
  if (!/^[a-z0-9-]+(?:\.light)?\.webp$/.test(file)) return null;
  let handle;
  try {
    handle = await open(path.join(HELP_IMAGE_DIR, file), "r");
    const buf = Buffer.alloc(30);
    const { bytesRead } = await handle.read(buf, 0, 30, 0);
    const size = webpSize(buf.subarray(0, bytesRead));
    // An unreadable header still means the file exists: show it unsized.
    return size ? { width: Math.round(size.width / 2), height: Math.round(size.height / 2) } : { width: 0, height: 0 };
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}

/** The light-theme copy of a screenshot (captured with THEME=light). */
export function lightScreenshot(file: string): string {
  return file.replace(/\.webp$/, ".light.webp");
}

/** Pixel size from a WebP file's first 30 bytes. */
function webpSize(b: Buffer): { width: number; height: number } | null {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  }
  if (chunk === "VP8 ") {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  return null;
}
