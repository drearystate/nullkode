import { readdirSync, statSync } from "fs";
import { join } from "path";
import { json } from "@/lib/utils";

type Asset = {
  id: string;
  thumb: string;
  url: string;
  alt: string;
  credit?: { name: string; link: string };
  source: "unsplash" | "pexels" | "pixabay" | "curated" | "stock";
};

// Cache provider responses per-query for an hour so the editor doesn't burn
// through rate limits when a user types in the search box.
const CACHE = new Map<string, { at: number; assets: Asset[] }>();
const CACHE_TTL = 60 * 60 * 1000;

async function fromUnsplash(q: string): Promise<Asset[] | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const url = `https://api.unsplash.com/search/photos?per_page=30&query=${encodeURIComponent(
    q || "landscape"
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results: Array<{
      id: string;
      urls: { regular: string; small: string };
      alt_description: string | null;
      user: { name: string; links: { html: string } };
    }>;
  };
  return data.results.map((r) => ({
    id: `unsplash-${r.id}`,
    thumb: r.urls.small,
    url: r.urls.regular,
    alt: r.alt_description ?? "",
    credit: { name: r.user.name, link: r.user.links.html },
    source: "unsplash",
  }));
}

async function fromPexels(q: string): Promise<Asset[] | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const url = `https://api.pexels.com/v1/search?per_page=30&query=${encodeURIComponent(
    q || "landscape"
  )}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    photos: Array<{
      id: number;
      src: { large: string; medium: string };
      alt: string;
      photographer: string;
      photographer_url: string;
    }>;
  };
  return data.photos.map((p) => ({
    id: `pexels-${p.id}`,
    thumb: p.src.medium,
    url: p.src.large,
    alt: p.alt ?? "",
    credit: { name: p.photographer, link: p.photographer_url },
    source: "pexels",
  }));
}

async function fromPixabay(q: string): Promise<Asset[] | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const url = `https://pixabay.com/api/?per_page=30&image_type=photo&key=${key}&q=${encodeURIComponent(
    q || "landscape"
  )}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    hits: Array<{
      id: number;
      webformatURL: string;
      largeImageURL: string;
      tags: string;
      user: string;
      pageURL: string;
    }>;
  };
  return data.hits.map((h) => ({
    id: `pixabay-${h.id}`,
    thumb: h.webformatURL,
    url: h.largeImageURL,
    alt: h.tags,
    credit: { name: h.user, link: h.pageURL },
    source: "pixabay",
  }));
}

// Curated fallback: when no API keys are configured we still want the Assets
// panel to feel alive. picsum.photos is a free, reliable stock-photo CDN —
// deterministic per seed, so the same query always returns the same photos.
const CURATED_SEEDS = [
  "mountain", "ocean", "forest", "desert", "city", "street",
  "office", "meeting", "laptop", "coffee", "table", "desk",
  "portrait", "team", "people", "crowd", "smile", "hands",
  "food", "pizza", "burger", "breakfast", "fruit", "wine",
  "architecture", "building", "bridge", "house", "interior", "room",
  "abstract", "texture", "pattern", "gradient", "neon", "light",
  "travel", "map", "passport", "airplane", "beach", "sunset",
  "nature", "flower", "tree", "leaf", "sky", "cloud",
];

function fromCurated(q: string): Asset[] {
  const query = q.trim().toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  const match = (seed: string) =>
    tokens.length === 0 || tokens.some((t) => seed.includes(t) || t.includes(seed));
  const matched = CURATED_SEEDS.filter(match);
  const seeds = matched.length > 0 ? matched : CURATED_SEEDS;
  return seeds.slice(0, 30).map((seed, i) => ({
    id: `curated-${seed}-${i}`,
    thumb: `https://picsum.photos/seed/${seed}-${i}/400/400`,
    url: `https://picsum.photos/seed/${seed}-${i}/1200/800`,
    alt: seed,
    source: "curated",
  }));
}

// Stock photos from purchased Crafto/Litho templates — cached on first load.
let stockCache: Asset[] | null = null;

function loadStockPhotos(): Asset[] {
  if (stockCache) return stockCache;
  const photos: Asset[] = [];
  const publicDir = join(process.cwd(), "public");
  for (const source of ["assets/crafto", "assets/litho"]) {
    const dir = join(publicDir, source);
    let files: string[];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(file)) continue;
      try {
        if (statSync(join(dir, file)).size < 20000) continue;
      } catch {
        continue;
      }
      const url = `/${source}/${file}`;
      const alt = file
        .replace(/\.(jpg|jpeg|png|webp)$/i, "")
        .replace(/^demo-|^home-|^litho-demo-/i, "")
        .replace(/-/g, " ");
      photos.push({ id: `stock-${source}-${file}`, thumb: url, url, alt, source: "stock" });
    }
  }
  stockCache = photos;
  return photos;
}

function fromStock(q: string): Asset[] {
  const all = loadStockPhotos();
  if (!q) return all.slice(0, 20);
  const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  return all
    .filter((p) => tokens.some((t) => p.alt.toLowerCase().includes(t)))
    .slice(0, 20);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const cacheKey = `q:${q}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return json({ assets: cached.assets, cached: true });
  }

  // Always include matching stock photos first, then external providers.
  const stock = fromStock(q);

  let external: Asset[] | null = null;
  try {
    external = (await fromUnsplash(q)) ?? (await fromPexels(q)) ?? (await fromPixabay(q));
  } catch {
    // fall through to curated
  }
  if (!external || external.length === 0) {
    external = fromCurated(q);
  }

  // Stock photos first, then external — deduplicated by putting stock at the front.
  const assets = [...stock, ...external];

  CACHE.set(cacheKey, { at: Date.now(), assets });
  return json({ assets });
}
