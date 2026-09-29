"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Copy, Loader2, TriangleAlert, X } from "lucide-react";
import type { PageSettings, Visibility } from "@/lib/page-visibility";

/** What the dialog asks the page route to change (only what changed). */
export type PageSettingsChanges = {
  title?: string;
  visibility?: Visibility;
  hideInMenu?: boolean;
  /** Place in the page's menu group, from 1. */
  menuOrder?: number;
};

type Props = {
  projectId: string;
  page: { id: string; title: string; slug: string; isHome: boolean };
  /** The editor is busy saving or loading. */
  busy: boolean;
  onClose: () => void;
  /** Resolves true once saved (the editor then closes the dialog). */
  onSave: (changes: PageSettingsChanges) => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
};

const AUDIENCES: Array<{ value: Visibility; label: string; hint: string }> = [
  { value: "public", label: "Everyone", hint: "Anyone with the link can open it." },
  { value: "signed-in", label: "Signed-in people", hint: "Visitors sign in first. Anyone can make an account." },
  { value: "admin", label: "Admins only", hint: "Only you and the people you make admins." },
];

/** Who sees less, for the "making it more open" warnings. */
const OPENNESS: Record<string, number> = { public: 0, "signed-in": 1, admin: 2, role: 2 };

/**
 * Page settings, opened from the gear on a page in the page list: its
 * name, who can open it, whether and where it shows in the app's menu, and
 * making a copy. Saving rebuilds the menu on every page.
 */
export function PageSettingsDialog({ projectId, page, busy, onClose, onSave, onDuplicate }: Props) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState(page.title);
  const [visibility, setVisibility] = useState<PageSettings["visibility"]>("public");
  const [showInMenu, setShowInMenu] = useState(true);
  const [position, setPosition] = useState<number | null>(null);
  const [working, setWorking] = useState<"save" | "copy" | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/projects/${projectId}/pages/${page.id}?settings=1`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.settings) throw new Error(data.error || "We couldn't load this page's settings. Please try again.");
        if (!live) return;
        const s = data.settings as PageSettings;
        setSettings(s);
        setName(data.page?.title ?? page.title);
        setVisibility(s.visibility);
        setShowInMenu(s.inMenu);
        setPosition(s.menuPosition);
      })
      .catch((err) => live && setLoadError(err instanceof Error ? err.message : "We couldn't load this page's settings."));
    return () => {
      live = false;
    };
  }, [projectId, page.id, page.title]);

  useEffect(() => {
    if (settings) setTimeout(() => nameRef.current?.focus(), 30);
  }, [settings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !working) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, working]);

  const s = settings;
  const trimmed = name.trim();
  const opened = s ? OPENNESS[visibility] < OPENNESS[s.visibility] : false;
  // A page that becomes (or stops being) admins only moves between the
  // visitor menu and the admins' "Manage" menu, so its place is set after.
  const groupChanges = s ? (OPENNESS[visibility] === 2) !== (OPENNESS[s.visibility] === 2) : false;
  const canMove = !!s && showInMenu && s.inMenu && !groupChanges && (s.menuGroup === "main" || s.menuGroup === "staff") && s.menuCount > 1 && position !== null;

  function changes(): PageSettingsChanges | null {
    if (!s) return null;
    const out: PageSettingsChanges = {};
    if (trimmed && trimmed !== page.title) out.title = trimmed;
    if (visibility !== s.visibility && visibility !== "role") out.visibility = visibility;
    if (s.canShowInMenu && showInMenu !== s.inMenu) out.hideInMenu = !showInMenu;
    if (canMove && position !== null && position !== s.menuPosition) out.menuOrder = position;
    return out;
  }

  async function save() {
    const c = changes();
    if (!c) return;
    if (!trimmed) {
      nameRef.current?.focus();
      return;
    }
    if (Object.keys(c).length === 0) return onClose();
    setWorking("save");
    const ok = await onSave(c);
    if (!ok) setWorking(null);
  }

  async function duplicate() {
    setWorking("copy");
    const ok = await onDuplicate();
    if (!ok) setWorking(null);
  }

  const disabled = busy || working !== null;
  const where = s?.menuGroup === "staff" ? "the admins’ “Manage” menu" : "the menu";

  const dialog = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => !working && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-md flex-col rounded-2xl border border-surface-700 bg-surface-900 text-surface-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-800 px-6 py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold">Page settings</h2>
            <p className="mt-0.5 truncate text-xs text-surface-400">{page.title}</p>
          </div>
          <button type="button" className="studio-icon-button" aria-label="Close page settings" onClick={onClose} disabled={working !== null}>
            <X size={16} />
          </button>
        </div>

        {!s ? (
          <div className="p-6 text-sm text-surface-400">
            {loadError ? <p role="alert" className="text-red-300">{loadError}</p> : <p className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" aria-hidden />Loading…</p>}
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {s.designer && (
                <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                  This app&apos;s pages come from the AI Designer, so change them there.
                </p>
              )}
              <div>
                <label className="label" htmlFor={`${titleId}-name`}>Name</label>
                <input
                  id={`${titleId}-name`}
                  ref={nameRef}
                  className="input"
                  maxLength={80}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-surface-500">Shown in the menu and on the browser tab.</p>
              </div>

              <fieldset>
                <legend className="label">Who can see this page</legend>
                <div className="mt-2 space-y-1.5">
                  {[...AUDIENCES, ...(s.visibility === "role" ? [{ value: "role" as const, label: `People with the “${s.role}” role`, hint: "Set by the page itself. Pick another option to change it." }] : [])].map((a) => (
                    <label key={a.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${visibility === a.value ? "border-brand-500/60 bg-brand-500/10" : "border-surface-800 hover:border-surface-700"}`}>
                      <input
                        type="radio"
                        name={`${titleId}-audience`}
                        className="mt-1 accent-brand-500"
                        value={a.value}
                        checked={visibility === a.value}
                        onChange={() => setVisibility(a.value)}
                      />
                      <span>
                        <span className="block font-medium text-surface-100">{a.label}</span>
                        <span className="block text-xs text-surface-400">{a.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {s.privateData && opened && (
                  <Warning>
                    {visibility === "public"
                      ? "This page shows private data; making it public exposes it."
                      : "This page shows private data. Anyone who signs up would be able to see it."}
                  </Warning>
                )}
                {!s.hasLogin && visibility !== "public" && (
                  <Warning>
                    Your app has no sign-in page yet, so only you can open this page.{" "}
                    <a href={`/projects/${projectId}/modules`} className="underline underline-offset-2">Add “Sign-in and accounts” from Features.</a>
                  </Warning>
                )}
              </fieldset>

              <fieldset>
                <legend className="label">Menu</legend>
                {s.canShowInMenu ? (
                  <label className="mt-2 flex cursor-pointer items-center gap-3 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={showInMenu} onChange={(e) => setShowInMenu(e.target.checked)} />
                    <span>
                      Show in menu
                      {s.menuGroup === "button" && <span className="block text-xs text-surface-400">It shows as a button at the end of the menu.</span>}
                    </span>
                  </label>
                ) : (
                  <p className="mt-2 text-sm text-surface-400">This page never appears in the menu.</p>
                )}
                {showInMenu && s.menuGroup === "home" && <p className="mt-2 text-xs text-surface-400">The home page always comes first.</p>}
                {showInMenu && !s.inMenu && s.canShowInMenu && <p className="mt-2 text-xs text-surface-400">It goes at the end of the menu. You can move it once it&apos;s saved.</p>}
                {showInMenu && s.inMenu && groupChanges && <p className="mt-2 text-xs text-surface-400">Save first, then set its place in the menu.</p>}
                {canMove && position !== null && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-surface-300" aria-live="polite">
                      Place in {where}: <strong className="text-surface-100">{position}</strong> of {s.menuCount}
                    </span>
                    <span className="ml-auto flex gap-2">
                      <button type="button" className="btn-ghost !min-h-0 !px-3 !py-1.5 text-xs" disabled={position <= 1} onClick={() => setPosition(position - 1)}>
                        <ArrowUp size={14} aria-hidden />Move up
                      </button>
                      <button type="button" className="btn-ghost !min-h-0 !px-3 !py-1.5 text-xs" disabled={position >= s.menuCount} onClick={() => setPosition(position + 1)}>
                        <ArrowDown size={14} aria-hidden />Move down
                      </button>
                    </span>
                  </div>
                )}
              </fieldset>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-800 p-4">
              <button type="button" className="btn-ghost" onClick={() => void duplicate()} disabled={disabled || s.designer}>
                {working === "copy" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Copy size={14} aria-hidden />}
                Duplicate
              </button>
              <span className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={onClose} disabled={working !== null}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={disabled || s.designer || !trimmed}>
                  {working === "save" ? "Saving…" : "Save"}
                </button>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
      <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
