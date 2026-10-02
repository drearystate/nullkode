/**
 * The languages the studio and the apps it builds speak. English is the source:
 * every other language is translated from messages/en (scripts/i18n-translate.ts)
 * and falls back to English for anything not translated yet.
 */
export const LOCALES = [
  { code: "en", name: "English", english: "English", dir: "ltr" },
  { code: "zh-Hans", name: "简体中文", english: "Chinese (Simplified)", dir: "ltr" },
  { code: "hi", name: "हिन्दी", english: "Hindi", dir: "ltr" },
  { code: "es", name: "Español", english: "Spanish", dir: "ltr" },
  { code: "fr", name: "Français", english: "French", dir: "ltr" },
  { code: "ar", name: "العربية", english: "Arabic", dir: "rtl" },
  { code: "bn", name: "বাংলা", english: "Bengali", dir: "ltr" },
  { code: "pt-BR", name: "Português (Brasil)", english: "Portuguese (Brazil)", dir: "ltr" },
  { code: "ru", name: "Русский", english: "Russian", dir: "ltr" },
  { code: "ur", name: "اردو", english: "Urdu", dir: "rtl" },
  { code: "id", name: "Bahasa Indonesia", english: "Indonesian", dir: "ltr" },
  { code: "de", name: "Deutsch", english: "German", dir: "ltr" },
  { code: "ja", name: "日本語", english: "Japanese", dir: "ltr" },
  { code: "ko", name: "한국어", english: "Korean", dir: "ltr" },
  { code: "tr", name: "Türkçe", english: "Turkish", dir: "ltr" },
  { code: "vi", name: "Tiếng Việt", english: "Vietnamese", dir: "ltr" },
  { code: "it", name: "Italiano", english: "Italian", dir: "ltr" },
  { code: "fa", name: "فارسی", english: "Persian", dir: "rtl" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "nk-locale";
const CODES = new Set<string>(LOCALES.map((l) => l.code));

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && CODES.has(v);
}

export function localeDir(code: string): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === code)?.dir ?? "ltr";
}

/** The closest supported language for a tag like "pt-PT", "zh-CN", "es-419" or "AR". */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const t = tag.trim().replace("_", "-").toLowerCase();
  const exact = LOCALES.find((l) => l.code.toLowerCase() === t);
  if (exact) return exact.code;
  const base = t.split("-")[0];
  if (base === "zh") return "zh-Hans";
  if (base === "pt") return "pt-BR";
  return LOCALES.find((l) => l.code.toLowerCase().split("-")[0] === base)?.code ?? null;
}

/** Best supported language from an Accept-Language header, by its q weights. */
export function fromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const m = matchLocale(tag);
    if (m) return m;
  }
  return null;
}
