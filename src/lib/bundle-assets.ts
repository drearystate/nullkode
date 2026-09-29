import { readFile, stat } from "fs/promises";
import { join, resolve, sep } from "path";

/**
 * Local files an app's pages point at (uploaded images, template photos,
 * shared assets), for bundles that must work without this server: the
 * offline zip and the backup export. Uploads are stored by month
 * (/uploads/<yyyymm>/…), not per app, so they're found by reading the
 * pages rather than by folder.
 */
const ASSET_RE = /\/(?:uploads|templates|assets)\/[^"'()\s<>?#\\]+/g;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function referencedAssets(texts: string[]): string[] {
  const found = new Set<string>();
  for (const text of texts) for (const m of text.matchAll(ASSET_RE)) found.add(m[0]);
  return [...found];
}

/** The file behind a public path, or null if it's missing, too big or outside public/. */
export async function readPublicAsset(path: string): Promise<Buffer | null> {
  const root = resolve(process.cwd(), "public");
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  const abs = resolve(join(root, decoded));
  if (!abs.startsWith(root + sep)) return null;
  try {
    const info = await stat(abs);
    if (!info.isFile() || info.size > MAX_FILE_BYTES) return null;
    return await readFile(abs);
  } catch {
    return null;
  }
}

/** Points every bundled path at its copy in the bundle (e.g. prefix "./assets"). */
export function rewriteAssets(text: string, bundled: Set<string>, prefix: string): string {
  return text.replace(ASSET_RE, (path) => (bundled.has(path) ? `${prefix}${path}` : path));
}
