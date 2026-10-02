"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Editor } from "grapesjs";
import { useTranslations } from "next-intl";

type IconRef = {
  id: string;
  prefix: string;
  name: string;
  svg: string;
};

/** An icon style; its name and hover note are in editor.json under iconSets.<id>. */
type IconSet = {
  id: string;
  prefix: string;
};

// Matches the sets downloaded by scripts/download-icons.mjs. The "All" tab
// searches across every set at once; the rest scope to a single prefix.
const ICON_SETS: IconSet[] = [
  { id: "all", prefix: "" },
  { id: "lucide", prefix: "lucide" },
  { id: "heroicons", prefix: "heroicons" },
  { id: "tabler", prefix: "tabler" },
  { id: "ph", prefix: "ph" },
  { id: "mdi", prefix: "mdi" },
  { id: "fa6-solid", prefix: "fa6-solid" },
  { id: "fa6-brands", prefix: "fa6-brands" },
  { id: "simple-icons", prefix: "simple-icons" },
];

/** The message key for an icon style ("fa6-solid" → "fa6Solid"). */
const setKey = (id: string) => id.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());

export function IconsPanel({ editor }: { editor: Editor }) {
  const t = useTranslations("editor.iconsPanel");
  const ts = useTranslations("editor.iconSets");
  const tc = useTranslations("common");
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState<string>("all");
  const [icons, setIcons] = useState<IconRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIcons = useCallback(async (q: string, prefix: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (prefix) params.set("prefix", prefix);
      params.set("limit", "120");
      const res = await fetch(`/api/icons/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { icons: IconRef[] };
      setIcons(data.icons ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failedToLoad"));
      setIcons([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const prefix = ICON_SETS.find((s) => s.id === setId)?.prefix ?? "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchIcons(query.trim(), prefix), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, setId, fetchIcons]);

  const insertIcon = useCallback(
    (icon: IconRef) => {
      // The API response already contains the full <svg> markup, so we just
      // stamp it into the canvas. No extra network call on insert.
      const wrapper = editor.getWrapper();
      if (!wrapper) return;
      const target = editor.getSelected() ?? wrapper;
      // Give the inserted icon a sensible starter size by rewriting the
      // width/height attrs before inject — the source uses viewBox-native
      // values which can be tiny on some sets.
      const sized = icon.svg.replace(
        /<svg([^>]*)>/,
        (_m, attrs: string) => {
          let a = attrs
            .replace(/\bwidth="[^"]*"/, 'width="32"')
            .replace(/\bheight="[^"]*"/, 'height="32"');
          if (!/\bwidth=/.test(a)) a += ' width="32"';
          if (!/\bheight=/.test(a)) a += ' height="32"';
          if (!/\bclass=/.test(a)) a += ' class="nk-icon"';
          return `<svg${a}>`;
        }
      );
      target.append(sized);
    },
    [editor]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-surface-800 space-y-2 shrink-0">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          data-help={t("searchHelp")}
          className="w-full bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
        />
        <div className="flex flex-wrap gap-1">
          {ICON_SETS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSetId(s.id)}
              data-help={ts(`${setKey(s.id)}.help`)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                setId === s.id
                  ? "bg-brand-500/20 border-brand-500 text-brand-200"
                  : "border-surface-800 text-surface-500 hover:text-surface-200 hover:border-surface-700"
              }`}
            >
              {ts(`${setKey(s.id)}.label`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {loading && (
          <div className="text-center text-surface-500 text-xs py-8">{tc("loading")}</div>
        )}
        {error && !loading && (
          <div className="text-center text-red-400 text-xs py-8">{error}</div>
        )}
        {!loading && !error && icons.length === 0 && (
          <div className="text-center text-surface-500 text-xs py-8">{t("noResults")}</div>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          {icons.map((i) => (
            <button
              key={i.id}
              onClick={() => insertIcon(i)}
              title={i.id}
              aria-label={t("addIcon", { name: i.name })}
              data-help={t("addHelp")}
              className="group relative aspect-square flex items-center justify-center rounded border border-surface-800 bg-surface-950 hover:border-brand-500 hover:bg-surface-900 transition text-surface-300 hover:text-white [&>svg]:w-5 [&>svg]:h-5 [&>svg]:opacity-90 hover:[&>svg]:opacity-100"
              dangerouslySetInnerHTML={{ __html: i.svg }}
            />
          ))}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-surface-800 text-[10px] text-surface-600 [[data-theme=light]_&]:text-surface-500 text-center shrink-0">
        {t("clickToInsert")}
      </div>
    </div>
  );
}
