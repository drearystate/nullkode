"use client";
import { useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { LOCALES } from "@/i18n/locales";

/**
 * The language an app is built in (its visitors read it): the describe-it
 * box, the plan review and the dashboard's idea box. Defaults to the studio
 * language; the build sends it as `locale` (lib/app-locale.ts).
 */
export function AppLanguageSelect({
  value,
  onChange,
  compact = false,
  id = "app-language",
  className = "",
}: {
  value: string;
  onChange: (code: string) => void;
  compact?: boolean;
  id?: string;
  className?: string;
}) {
  const t = useTranslations("apps.buildLanguage");
  return (
    <label htmlFor={id} className={`inline-flex min-w-0 max-w-full items-center gap-2 text-xs text-surface-400 ${className}`} data-help={t("help")}>
      <Languages size={compact ? 14 : 15} className="shrink-0 text-surface-400" aria-hidden />
      <span className={compact ? "sr-only" : "shrink-0"}>{t("label")}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={id}
        className="min-w-0 max-w-[11rem] truncate rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs text-surface-200 hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-brand-400"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}{l.name !== l.english ? ` · ${l.english}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
