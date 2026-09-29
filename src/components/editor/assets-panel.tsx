"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Editor } from "grapesjs";

type Asset = {
  id: string;
  thumb: string;
  url: string;
  alt: string;
  credit?: { name: string; link: string };
  source: "unsplash" | "pexels" | "pixabay" | "curated";
};

type Category = {
  id: string;
  label: string;
  query: string;
};

const CATEGORIES: Category[] = [
  { id: "all", label: "All", query: "" },
  { id: "stock", label: "Stock", query: "home demo" },
  { id: "nature", label: "Nature", query: "nature landscape" },
  { id: "people", label: "People", query: "people portrait" },
  { id: "business", label: "Business", query: "business office" },
  { id: "tech", label: "Tech", query: "technology computer" },
  { id: "food", label: "Food", query: "food restaurant" },
  { id: "architecture", label: "Architecture", query: "architecture building" },
  { id: "fitness", label: "Fitness", query: "gym fitness" },
  { id: "medical", label: "Medical", query: "medical health" },
  { id: "travel", label: "Travel", query: "travel agency" },
];

export function AssetsPanel({ editor }: { editor: Editor }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAssets = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { assets: Asset[] };
      setAssets(data.assets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = query.trim() || CATEGORIES.find((c) => c.id === category)?.query || "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAssets(q), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, category, fetchAssets]);

  const insertImage = useCallback(
    (asset: Asset) => {
      const wrapper = editor.getWrapper();
      if (!wrapper) return;
      const selected = editor.getSelected();
      const target = selected ?? wrapper;
      target.append(
        `<img src="${asset.url}" alt="${asset.alt.replace(/"/g, "&quot;")}" class="img-fluid rounded"/>`
      );
    },
    [editor]
  );

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, asset: Asset) => {
      const html = `<img src="${asset.url}" alt="${asset.alt.replace(/"/g, "&quot;")}" class="img-fluid rounded"/>`;
      e.dataTransfer.setData("text/html", html);
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-surface-800 space-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search photos..."
          className="w-full bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                category === c.id
                  ? "bg-brand-500/20 border-brand-500 text-brand-200"
                  : "border-surface-800 text-surface-500 hover:text-surface-200 hover:border-surface-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="text-center text-surface-500 text-xs py-8">Loading…</div>
        )}
        {error && !loading && (
          <div className="text-center text-red-400 text-xs py-8">{error}</div>
        )}
        {!loading && !error && assets.length === 0 && (
          <div className="text-center text-surface-500 text-xs py-8">No results</div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {assets.map((a) => (
            <button
              key={a.id}
              draggable
              onDragStart={(e) => onDragStart(e, a)}
              onClick={() => insertImage(a)}
              title={a.credit ? `Photo by ${a.credit.name}` : a.alt}
              className="group relative aspect-square overflow-hidden rounded border border-surface-800 bg-surface-950 hover:border-brand-500 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.thumb}
                alt={a.alt}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {a.credit && (
                <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[9px] text-white opacity-0 group-hover:opacity-100 transition truncate">
                  {a.credit.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-surface-800 text-[10px] text-surface-600 text-center">
        Click or drag to insert · Free photos
      </div>
    </div>
  );
}
