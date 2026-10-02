"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Editor, Component } from "grapesjs";
import { useTranslations } from "next-intl";
import { placeForBlock, scrollToPart } from "./plain-editor";

type Asset = {
  id: string;
  thumb: string;
  url: string;
  alt: string;
  credit?: { name: string; link: string };
  source: "unsplash" | "pexels" | "pixabay" | "generated" | "stock";
};

/** A photo category; its name and hover note are in editor.json under assets.categories.<id>. */
type Category = {
  id: string;
  query: string;
};

const CATEGORIES: Category[] = [
  { id: "all", query: "" },
  { id: "originals", query: "originals" },
  { id: "nature", query: "nature landscape" },
  { id: "people", query: "people portrait" },
  { id: "business", query: "business office" },
  { id: "tech", query: "technology computer" },
  { id: "food", query: "food restaurant" },
  { id: "architecture", query: "architecture building" },
  { id: "fitness", query: "gym fitness" },
  { id: "medical", query: "medical health" },
  { id: "beauty", query: "beauty" },
  { id: "products", query: "ecommerce" },
  { id: "education", query: "education" },
  { id: "legal", query: "legal" },
  { id: "community", query: "nonprofit" },
  { id: "travel", query: "travel" },
  { id: "trades", query: "trades" },
  { id: "automotive", query: "automotive" },
  { id: "cleaning", query: "cleaning" },
  { id: "pets", query: "pets" },
  { id: "landscaping", query: "landscaping" },
  { id: "logistics", query: "logistics" },
  { id: "agriculture", query: "agriculture" },
  { id: "events", query: "events" },
];

export function AssetsPanel({ editor }: { editor: Editor }) {
  const t = useTranslations("editor.assets");
  const tc = useTranslations("common");
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
        setError(e instanceof Error ? e.message : t("failedToLoad"));
        setAssets([]);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [t]);

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
          placeholder={t("searchPlaceholder")}
          data-help={t("searchHelp")}
          className="w-full bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              data-help={t(`categories.${c.id}.help`)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                category === c.id
                  ? "bg-brand-500/20 border-brand-500 text-brand-200"
                  : "border-surface-800 text-surface-500 hover:text-surface-200 hover:border-surface-700"
              }`}
            >
              {t(`categories.${c.id}.label`)}
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
            {t("describeLabel")}
          </label>
          <input
            id="nk-picture-description"
            autoFocus
            value={describing.alt}
            maxLength={200}
            onChange={(e) => setDescribing({ ...describing, alt: e.target.value })}
            placeholder={t("describePlaceholder")}
            data-help={t("describeHelp")}
            className="w-full rounded border border-surface-800 bg-surface-950 px-2 py-1.5 text-xs text-surface-100 placeholder:text-surface-600 focus:border-brand-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="submit" data-help={t("saveDescriptionHelp")} className="rounded bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-fixed-white hover:bg-brand-400">{t("saveDescription")}</button>
            <button type="button" className="rounded px-2 py-1 text-[11px] text-surface-400 hover:text-surface-100" onClick={() => setDescribing(null)} data-help={t("skipHelp")}>{t("skip")}</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="text-center text-surface-500 text-xs py-8">{tc("loading")}</div>
        )}
        {error && !loading && (
          <div className="text-center text-red-400 text-xs py-8">{error}</div>
        )}
        {!loading && !error && assets.length === 0 && (
          <div className="text-center text-surface-500 text-xs py-8">{t("noMatches")}</div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {assets.map((a) => (
            <button
              key={a.id}
              draggable
              onDragStart={(e) => onDragStart(e, a)}
              onClick={() => insertImage(a)}
              data-help={imageSelected ? t("swapHelp") : t("addHelp")}
              title={a.credit ? t("photoBy", { name: a.credit.name }) : a.alt}
              aria-label={a.alt ? (imageSelected ? t("useInsteadNamed", { alt: a.alt }) : t("addPhotoNamed", { alt: a.alt })) : imageSelected ? t("useInstead") : t("addPhoto")}
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
                <span className="absolute bottom-1 start-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-fixed-white">{t("aiOriginal")}</span>
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
        {imageSelected ? t("footerSwap") : t("footerAdd")}
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
