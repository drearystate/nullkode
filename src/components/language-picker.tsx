"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, localeDir } from "@/i18n/locales";

/** Applies a language now, remembers it on this device, and saves it to the account when signed in. */
async function saveLocale(code: string, signedIn: boolean) {
  document.cookie = `${LOCALE_COOKIE}=${code}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  document.documentElement.lang = code;
  document.documentElement.dir = localeDir(code);
  if (signedIn) {
    await fetch("/api/me/prefs", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: code }) }).catch(() => {});
  }
}

/**
 * A labelled list of every language, each in its own script. `compact` is the
 * small one for headers and menus (native names only); `collapse` turns it
 * into just the language icon on phones, with the list opening from it.
 */
export function LanguagePicker({ signedIn = false, compact = false, collapse = false, className = "" }: { signedIn?: boolean; compact?: boolean; collapse?: boolean; className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [value, setValue] = useState(locale);
  const [pending, start] = useTransition();
  async function change(code: string) {
    setValue(code);
    await saveLocale(code, signedIn);
    start(() => router.refresh());
  }
  return (
    <label
      className={`relative inline-flex items-center gap-2 ${collapse ? "max-sm:rounded-full max-sm:border max-sm:border-white/10 max-sm:p-2 max-sm:hover:border-white/20" : ""} ${className}`}
      data-help={t("languageHelp")}
    >
      <Languages size={compact ? 15 : 16} className="shrink-0 text-surface-400" aria-hidden="true" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => void change(e.target.value)}
        className={`${compact ? "w-auto max-w-[11rem] rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs text-surface-300 hover:border-white/20" : "input w-auto min-w-[14rem] max-w-full"} ${collapse ? "max-sm:absolute max-sm:inset-0 max-sm:h-full max-sm:w-full max-sm:cursor-pointer max-sm:opacity-0" : ""}`}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}{!compact && l.name !== l.english ? ` · ${l.english}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
