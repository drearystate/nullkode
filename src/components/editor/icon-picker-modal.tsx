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

type Props = {
  editor: Editor;
  open: boolean;
  onClose: () => void;
  /** When set, the modal replaces this component's SVG instead of appending a new one. */
  replaceComponentId?: string | null;
};

export function IconPickerModal({ editor, open, onClose, replaceComponentId }: Props) {
  const t = useTranslations("editor.iconPicker");
  const ts = useTranslations("editor.iconSets");
  const tc = useTranslations("common");
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("all");
  const [icons, setIcons] = useState<IconRef[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSetId("all");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const fetchIcons = useCallback(async (q: string, prefix: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (prefix) params.set("prefix", prefix);
      params.set("limit", "120");
      const res = await fetch(`/api/icons/search?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { icons: IconRef[] };
      setIcons(data.icons ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prefix = ICON_SETS.find((s) => s.id === setId)?.prefix ?? "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchIcons(query.trim(), prefix), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, setId, fetchIcons, open]);

  const pickIcon = useCallback(
    (icon: IconRef) => {
      const sized = icon.svg.replace(/<svg([^>]*)>/, (_m, attrs: string) => {
        let a = attrs
          .replace(/\bwidth="[^"]*"/, 'width="32"')
          .replace(/\bheight="[^"]*"/, 'height="32"');
        if (!/\bwidth=/.test(a)) a += ' width="32"';
        if (!/\bheight=/.test(a)) a += ' height="32"';
        if (!/\bclass=/.test(a)) a += ' class="nk-icon"';
        return `<svg${a}>`;
      });

      if (replaceComponentId) {
        // Replace existing icon — find the component and swap its content.
        const comp = editor
          .getWrapper()
          ?.find(`#${replaceComponentId}`)?.[0];
        if (comp) {
          comp.replaceWith(sized);
        }
      } else {
        // Insert new icon into the selected component or the wrapper.
        const target = editor.getSelected() ?? editor.getWrapper();
        target?.append(sized);
      }
      onClose();
    },
    [editor, replaceComponentId, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[min(540px,calc(100vw-32px))] max-h-[min(640px,calc(100vh-64px))] rounded-xl border border-surface-700 bg-surface-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
          <h3 className="text-sm font-semibold">
            {replaceComponentId ? t("changeIcon") : t("pickIcon")}
          </h3>
          <button
            onClick={onClose}
            aria-label={tc("close")}
            data-help={t("closeHelp")}
            className="text-surface-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Search + set filter */}
        <div className="px-4 py-3 border-b border-surface-800 space-y-2 shrink-0">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            data-help={t("searchHelp")}
            className="w-full bg-surface-950 border border-surface-800 rounded px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
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

        {/* Icon grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {loading && (
            <div className="text-center text-surface-500 text-xs py-12">{tc("loading")}</div>
          )}
          {!loading && icons.length === 0 && (
            <div className="text-center text-surface-500 text-xs py-12">{t("noResults")}</div>
          )}
          <div className="grid grid-cols-8 gap-1.5">
            {icons.map((i) => (
              <button
                key={i.id}
                onClick={() => pickIcon(i)}
                title={i.id}
                aria-label={t("useIcon", { name: i.name })}
                data-help={replaceComponentId ? t("replaceHelp") : t("addHelp")}
                className="group aspect-square flex items-center justify-center rounded border border-surface-800 bg-surface-950 hover:border-brand-500 hover:bg-surface-900 transition text-surface-300 hover:text-white [&>svg]:w-5 [&>svg]:h-5"
                dangerouslySetInnerHTML={{ __html: i.svg }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
