"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Friendly hover notes for the builder UI.
 *
 * Any element with a `data-help="..."` attribute gets a plain-language
 * tooltip on hover/focus — including DOM that React doesn't own (the
 * GrapesJS panels), because the listener is delegated on the document.
 * The on/off state is a per-account preference saved via /api/me/prefs;
 * the server passes the initial value so there's no flash.
 */

type Tip = { text: string; x: number; y: number; below: boolean };

const TIP_DELAY_MS = 200;
const TIP_MAX_WIDTH = 280;

export function HelpTips({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [tip, setTip] = useState<Tip | null>(null);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<number | null>(null);
  const onRef = useRef(on);
  onRef.current = on;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    const hide = () => {
      clearTimer();
      setTip(null);
    };
    const show = (el: HTMLElement) => {
      const text = el.getAttribute("data-help") ?? "";
      if (!text) return;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        const below = r.bottom + 100 < window.innerHeight;
        const half = TIP_MAX_WIDTH / 2 + 8;
        setTip({
          text,
          x: Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half),
          y: below ? r.bottom + 8 : r.top - 8,
          below,
        });
      }, TIP_DELAY_MS);
    };
    const onOver = (e: Event) => {
      if (!onRef.current) return;
      const t = e.target as HTMLElement | null;
      const el = t?.closest?.("[data-help]") as HTMLElement | null;
      if (el) show(el);
      else hide();
    };
    const onOut = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-help]")) hide();
    };
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("focusin", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("click", hide, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      clearTimer();
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("focusin", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("click", hide, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  async function toggle() {
    const next = !on;
    setOn(next);
    setTip(null);
    try {
      await fetch("/api/me/prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ helpTips: next }),
      });
    } catch {
      /* keep the optimistic state; it re-syncs from the server next load */
    }
  }

  return (
    <>
      <button
        onClick={toggle}
        data-help="This switch turns the helper notes on or off. When it's on, hold your mouse over any button to learn what it does."
        aria-pressed={on}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
          on
            ? "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100"
            : "border-surface-300 text-surface-500 hover:border-surface-400 hover:text-surface-700"
        }`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Help tips
        <span
          className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
            on ? "bg-brand-600 text-white" : "bg-surface-200 text-surface-600"
          }`}
        >
          {on ? "ON" : "OFF"}
        </span>
      </button>

      {mounted &&
        tip &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[9999] rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-xs leading-relaxed text-surface-50 shadow-2xl"
            style={{
              left: tip.x,
              top: tip.y,
              maxWidth: TIP_MAX_WIDTH,
              transform: `translate(-50%, ${tip.below ? "0" : "-100%"})`,
            }}
          >
            {tip.text}
          </div>,
          document.body
        )}
    </>
  );
}
