"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

export type ThemePref = "light" | "dark" | "system";
const COOKIE = "nk-theme";

function current(): { pref: ThemePref; shown: "light" | "dark" } {
  const d = document.documentElement;
  const pref = (d.getAttribute("data-theme-pref") as ThemePref) || "system";
  return { pref, shown: d.getAttribute("data-theme") === "light" ? "light" : "dark" };
}

/** Applies a choice now, remembers it on this device, and saves it to the account when signed in. */
export async function setTheme(pref: ThemePref, opts: { signedIn?: boolean } = {}): Promise<void> {
  const d = document.documentElement;
  const shown = pref === "system" ? (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark") : pref;
  d.setAttribute("data-theme-pref", pref);
  d.setAttribute("data-theme", shown);
  d.style.colorScheme = shown;
  document.cookie = `${COOKIE}=${pref}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new CustomEvent("nk-theme", { detail: pref }));
  if (opts.signedIn) {
    await fetch("/api/me/prefs", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme: pref }) }).catch(() => {});
  }
}

function useThemeState() {
  const [state, setState] = useState<{ pref: ThemePref; shown: "light" | "dark" } | null>(null);
  useEffect(() => {
    const read = () => setState(current());
    read();
    window.addEventListener("nk-theme", read);
    const m = window.matchMedia?.("(prefers-color-scheme: light)");
    m?.addEventListener?.("change", read);
    return () => {
      window.removeEventListener("nk-theme", read);
      m?.removeEventListener?.("change", read);
    };
  }, []);
  return state;
}

/** One button: switches between light and dark. */
export function ThemeToggle({ signedIn = false, className = "" }: { signedIn?: boolean; className?: string }) {
  const state = useThemeState();
  const t = useTranslations("nav");
  const next = state?.shown === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      onClick={() => void setTheme(next, { signedIn })}
      aria-label={state ? t(next === "light" ? "switchToLight" : "switchToDark") : t("switchTheme")}
      data-help={t("themeHelp")}
      className={`studio-top-link ${className}`}
    >
      {state?.shown === "light" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}

/** Light / Dark / Match my device, for the profile page. */
export function ThemeChoice({ signedIn = true }: { signedIn?: boolean }) {
  const state = useThemeState();
  const t = useTranslations("account");
  const options: Array<{ value: ThemePref; label: string; icon: typeof Sun }> = [
    { value: "light", label: t("theme.light"), icon: Sun },
    { value: "dark", label: t("theme.dark"), icon: Moon },
    { value: "system", label: t("theme.system"), icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label={t("appearance.title")} className="flex flex-wrap gap-2">
      {options.map(({ value, label, icon: Icon }) => {
        const on = state?.pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => void setTheme(value, { signedIn })}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${on ? "border-brand-500 bg-brand-500/10 text-white" : "border-surface-700 text-surface-300 hover:border-surface-600 hover:text-white"}`}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
