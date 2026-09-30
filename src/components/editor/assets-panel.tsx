"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Editor, Component } from "grapesjs";
import { placeForBlock, scrollToPart } from "./plain-editor";

type Asset = {
  id: string;
  thumb: string;
  url: string;
  alt: string;
  credit?: { name: string; link: string };
  source: "unsplash" | "pexels" | "pixabay" | "generated" | "stock";
};

type Category = {
  id: string;
  label: string;
  query: string;
  /** Hover note for the category button. */
  help: string;
};

const CATEGORIES: Category[] = [
  { id: "all", label: "All", query: "", help: "Show a mix of free photos you can use on your page." },
  { id: "originals", label: "Originals", query: "originals", help: "Browse original AI-generated photos included with this installation." },
  { id: "nature", label: "Nature", query: "nature landscape", help: "Show free photos of nature and landscapes." },
  { id: "people", label: "People", query: "people portrait", help: "Show free photos of people." },
  { id: "business", label: "Business", query: "business office", help: "Show free photos of offices and people at work." },
  { id: "tech", label: "Tech", query: "technology computer", help: "Show free photos of computers and technology." },
  { id: "food", label: "Food", query: "food restaurant", help: "Show free photos of food and restaurants." },
  { id: "architecture", label: "Architecture", query: "architecture building", help: "Show free photos of buildings." },
  { id: "fitness", label: "Fitness", query: "gym fitness", help: "Show free photos of gyms and exercise." },
  { id: "medical", label: "Medical", query: "medical health", help: "Show free photos of health care and medicine." },
  { id: "beauty", label: "Beauty", query: "beauty", help: "Skincare, spa and beauty images." },
  { id: "products", label: "Products", query: "ecommerce", help: "Ceramics and product photography." },
  { id: "education", label: "Learning", query: "education", help: "Classrooms and collaborative learning." },
  { id: "legal", label: "Legal", query: "legal", help: "Law libraries and courthouse architecture." },
  { id: "community", label: "Community", query: "nonprofit", help: "Community markets and fresh produce." },
  { id: "travel", label: "Travel", query: "travel", help: "Show free photos of travel and places to visit." },
  { id: "trades", label: "Trades", query: "trades", help: "Plumbing, electrical work and construction." },
  { id: "automotive", label: "Auto", query: "automotive", help: "Vehicle repair and garages." },
  { id: "cleaning", label: "Cleaning", query: "cleaning", help: "Professional cleaning services." },
  { id: "pets", label: "Pets", query: "pets", help: "Pet care and grooming." },
  { id: "landscaping", label: "Gardens", query: "landscaping", help: "Gardening and landscaping services." },
  { id: "logistics", label: "Logistics", query: "logistics", help: "Warehouses, delivery and shipping." },
  { id: "agriculture", label: "Farming", query: "agriculture", help: "Farms and fresh produce." },
  { id: "events", label: "Events", query: "events", help: "Weddings and event services." },
];

export function AssetsPanel({ editor }: { editor: Editor }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether a picture is selected on the page (then a tap swaps it).
  const [imageSelected, setImageSelected] = useState(false);
  // The picture just swapped in, waiting for its description.
  const [describing, setDescribing] = useState<{ component: Component; alt: string } | null>(null);

  useEffect(() => {
    const check = () => setImageSelected(isImage(editor.getSelected()));
    check();
    editor.on("component:toggled", check);
    return () => {
      editor.off("component:toggled", check);
    };
  }, [editor]);

  const fetchAssets = useCallback(async (q: string, originalsOnly = false) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/search?q=${encodeURIComponent(q)}${originalsOnly ? "&source=generated" : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { assets: Asset[] };
      if (id === requestId.current) setAssets(data.assets ?? []);
    } catch (e) {
      if (id === requestId.current) {
        setError(e instanceof Error ? e.message : "Failed to load assets");
        setAssets([]);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = query.trim() || CATEGORIES.find((c) => c.id === category)?.query || "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAssets(q, category === "originals"), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, category, fetchAssets]);

  // A selected picture gets the new photo (and keeps its size and place);
  // otherwise the photo is added after the part that's picked.
  const insertImage = useCallback(
    (asset: Asset) => {
      const wrapper = editor.getWrapper();
      if (!wrapper) return;
      const selected = editor.getSelected();
      if (selected && isImage(selected)) {
        if (selected.is("image")) selected.set("src", asset.url);
        selected.addAttributes({ src: asset.url });
        setDescribing({ component: selected, alt: asset.alt || String(selected.getAttributes().alt ?? "") });
        return;
      }
      const { parent, at } = placeForBlock(editor, false);
      const added = parent.append(imageHtml(asset), { at })[0];
      if (added) {
        editor.select(added);
        scrollToPart(editor, added);
      }
    },
    [editor]
  );

  const saveDescription = useCallback(() => {
    if (!describing) return;
    describing.component.addAttributes({ alt: describing.alt.trim() });
    setDescribing(null);
  }, [describing]);

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, asset: Asset) => {
      e.dataTransfer.setData("text/html", imageHtml(asset));
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
          data-help="Type what you want a photo of, like “coffee” or “dog”, to find free photos you can use."
          className="w-full bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              data-help={c.help}
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

      {describing && (
        <form
          className="mx-2 mt-2 space-y-2 rounded border border-brand-500/40 bg-brand-500/10 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveDescription();
          }}
        >
          <label htmlFor="nk-picture-description" className="block text-[11px] font-semibold text-surface-100">
            Picture changed. Describe it for people who can&apos;t see it:
          </label>
          <input
            id="nk-picture-description"
            autoFocus
            value={describing.alt}
            maxLength={200}
            onChange={(e) => setDescribing({ ...describing, alt: e.target.value })}
            placeholder="e.g. Fresh bread on our shop counter"
            data-help="A few words saying what’s in the picture. Screen readers read it out to people who can’t see it, and search engines use it too."
            className="w-full rounded border border-surface-800 bg-surface-950 px-2 py-1.5 text-xs text-surface-100 placeholder:text-surface-600 focus:border-brand-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="submit" data-help="Save this description on the picture." className="rounded bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-fixed-white hover:bg-brand-400">Save description</button>
            <button type="button" className="rounded px-2 py-1 text-[11px] text-surface-400 hover:text-surface-100" onClick={() => setDescribing(null)} data-help="Keep the new picture without changing its description.">Skip</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="text-center text-surface-500 text-xs py-8">Loading…</div>
        )}
        {error && !loading && (
          <div className="text-center text-red-400 text-xs py-8">{error}</div>
        )}
        {!loading && !error && assets.length === 0 && (
          <div className="text-center text-surface-500 text-xs py-8">No matching images. Try a broader subject.</div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {assets.map((a) => (
            <button
              key={a.id}
              draggable
              onDragStart={(e) => onDragStart(e, a)}
              onClick={() => insertImage(a)}
              data-help={imageSelected ? "Tap to put this photo in place of the picture you picked. It keeps the same size and spot." : "Tap to add this photo below the part you picked, or drag it onto your page."}
              title={a.credit ? `Photo by ${a.credit.name}` : a.alt}
              aria-label={`${imageSelected ? "Use this photo instead" : "Add this photo"}${a.alt ? `: ${a.alt}` : ""}`}
              className="group relative aspect-square overflow-hidden rounded border border-surface-800 bg-surface-950 hover:border-brand-500 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.thumb}
                alt={a.alt}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {a.source === "generated" && (
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-fixed-white">AI original</span>
              )}
              {a.credit && (
                <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[9px] text-fixed-white opacity-0 group-hover:opacity-100 transition truncate">
                  {a.credit.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-surface-800 text-[10px] text-surface-600 [[data-theme=light]_&]:text-surface-500 text-center">
        {imageSelected ? "Tap a photo to use it instead of the picture you picked" : "Tap or drag to add · Free photos"}
      </div>
    </div>
  );
}

function isImage(c: Component | null | undefined): c is Component {
  return !!c && (c.is("image") || String(c.get("tagName") ?? "").toLowerCase() === "img");
}

function imageHtml(asset: Asset): string {
  const attr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<img src="${attr(asset.url)}" alt="${attr(asset.alt)}" loading="lazy" class="img-fluid rounded"/>`;
}
