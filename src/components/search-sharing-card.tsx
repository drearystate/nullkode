"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * "Search and sharing" on the Publish screen: the app's description, how its
 * link looks in Google and in WhatsApp, the "Hide from search engines"
 * switch, and the Google Search Console code. Everything here applies to the
 * live app straight away; none of it waits for the next publish.
 */

export type SearchSharingProps = {
  projectId: string;
  published: boolean;
  /** The app's own description (Project.description). */
  description: string;
  /** Used when the description is empty: the home page's first paragraph. */
  pageParagraph: string | null;
  /** Set when the live home page (an AI Designer page) has its own description, which wins. */
  designerDescription: string | null;
  /** The home page's title as search engines see it. */
  title: string;
  /** The app's primary address. */
  address: string;
  /** The picture shown with shared links (loadable from this screen). */
  image: string;
  imageIsCard: boolean;
  /** The generated share card, shown if the page's own picture can't be loaded. */
  cardImage: string;
  /** The app's icon (shown like a favicon). */
  iconUrl: string;
  siteName: string;
  noindex: boolean;
  searchConsoleToken: string | null;
  sitemapUrl: string;
};

const IDEAL_LENGTH = 160;

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** "example.com › about" style, the way Google prints addresses. */
function breadcrumb(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return [u.host, ...parts].join(" › ");
  } catch {
    return url;
  }
}

export function SearchSharingCard(props: SearchSharingProps) {
  const router = useRouter();
  const t = useTranslations("project.searchSharing");
  const [description, setDescription] = useState(props.description);
  const [savedDescription, setSavedDescription] = useState(props.description);
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionMessage, setDescriptionMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [noindex, setNoindex] = useState(props.noindex);
  const [savingNoindex, setSavingNoindex] = useState(false);
  const [noindexError, setNoindexError] = useState<string | null>(null);

  const [token, setToken] = useState(props.searchConsoleToken ?? "");
  const [savingToken, setSavingToken] = useState(false);
  const [tokenMessage, setTokenMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageSrc, setImageSrc] = useState(props.image);
  const imageRef = useRef<HTMLImageElement>(null);
  // A picture that failed before the page came alive never fires onError.
  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) setImageSrc(props.cardImage);
  }, [props.cardImage]);

  const trimmed = description.replace(/\s+/g, " ").trim();
  const shownDescription = props.designerDescription ?? (trimmed || props.pageParagraph || "");
  const dirty = trimmed !== savedDescription.replace(/\s+/g, " ").trim();

  async function saveDescription() {
    setSavingDescription(true);
    setDescriptionMessage(null);
    try {
      const res = await fetch(`/api/projects/${props.projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("descriptionSaveFailed"));
      setSavedDescription(trimmed);
      setDescription(trimmed);
      setDescriptionMessage({ ok: true, text: t("descriptionSaved") });
      router.refresh();
    } catch (err) {
      setDescriptionMessage({ ok: false, text: err instanceof Error ? err.message : t("descriptionSaveFailedRetry") });
    } finally {
      setSavingDescription(false);
    }
  }

  async function saveSeo(patch: { noindex?: boolean; searchConsoleToken?: string | null }) {
    const res = await fetch(`/api/projects/${props.projectId}/seo`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t("saveFailed"));
    return data as { noindex: boolean; searchConsoleToken: string | null };
  }

  async function toggleNoindex() {
    const next = !noindex;
    setNoindex(next);
    setSavingNoindex(true);
    setNoindexError(null);
    try {
      const saved = await saveSeo({ noindex: next });
      setNoindex(saved.noindex);
    } catch (err) {
      setNoindex(!next);
      setNoindexError(err instanceof Error ? err.message : t("changeFailed"));
    } finally {
      setSavingNoindex(false);
    }
  }

  async function saveToken() {
    setSavingToken(true);
    setTokenMessage(null);
    try {
      const saved = await saveSeo({ searchConsoleToken: token.trim() || null });
      setToken(saved.searchConsoleToken ?? "");
      setTokenMessage({ ok: true, text: saved.searchConsoleToken ? t("codeSaved") : t("codeRemoved") });
    } catch (err) {
      setTokenMessage({ ok: false, text: err instanceof Error ? err.message : t("codeSaveFailed") });
    } finally {
      setSavingToken(false);
    }
  }

  async function copySitemap() {
    try {
      await navigator.clipboard.writeText(props.sitemapUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const host = hostOf(props.address);

  return (
    <section className="card p-6 mt-6" id="search-sharing" aria-labelledby="search-sharing-title">
      <h2 id="search-sharing-title" className="font-semibold" data-help={t("titleHelp")}>{t("title")}</h2>
      <p className="mt-1 text-sm text-surface-400 max-w-2xl">{t("intro")}</p>
      {!props.published && (
        <p className="mt-3 text-xs text-amber-300">{t("notPublished")}</p>
      )}

      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <label className="label" htmlFor="seo-description">{t("description")}</label>
          <textarea
            id="seo-description"
            className="input min-h-[96px] resize-y"
            maxLength={300}
            data-help={t("descriptionHelp")}
            value={description}
            onChange={(e) => { setDescription(e.target.value); setDescriptionMessage(null); }}
            placeholder={t("descriptionPlaceholder")}
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-surface-500">
            <span>{!trimmed && props.pageParagraph ? t("descriptionEmptyHint") : t("descriptionHint")}</span>
            <span className={trimmed.length > IDEAL_LENGTH ? "text-amber-300" : undefined}>
              {trimmed.length > IDEAL_LENGTH ? t("lengthTooLong", { count: trimmed.length, max: IDEAL_LENGTH }) : t("length", { count: trimmed.length, max: IDEAL_LENGTH })}
            </span>
          </div>
          {props.designerDescription && (
            <p className="mt-2 text-xs text-surface-400">{t("designerDescription")}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={!dirty || savingDescription} onClick={saveDescription} data-help={t("saveDescriptionHelp")}>
              {savingDescription && <Loader2 size={15} className="animate-spin" />}
              {t("saveDescription")}
            </button>
            {descriptionMessage && (
              <span role={descriptionMessage.ok ? "status" : "alert"} className={`text-sm ${descriptionMessage.ok ? "text-emerald-300" : "text-red-300"}`}>{descriptionMessage.text}</span>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-surface-800 px-4 py-3">
            <span className="min-w-0">
              <span id="seo-noindex-label" className="block text-sm font-medium">{t("hide")}</span>
              <span className="block text-xs text-surface-400">{t("hideBody")}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={noindex}
              aria-labelledby="seo-noindex-label"
              data-help={t("hideHelp")}
              disabled={savingNoindex}
              onClick={toggleNoindex}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition disabled:opacity-60 ${noindex ? "border-brand-400 bg-brand-500" : "border-surface-600 bg-surface-800"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-fixed-white shadow transition ${noindex ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"}`} />
              <span className="sr-only">{noindex ? t("on") : t("off")}</span>
            </button>
          </div>
          {noindexError && <p role="alert" className="mt-2 text-sm text-red-300">{noindexError}</p>}

          <details className="mt-4 rounded-lg border border-surface-800 px-4 py-3" open={Boolean(props.searchConsoleToken)}>
            <summary className="cursor-pointer text-sm font-medium" data-help={t("consoleHelp")}>{t("consoleTitle")}</summary>
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-xs leading-relaxed text-surface-400">{t("consoleBody")}</p>
              <div className="flex flex-wrap gap-2">
                <input
                  className="input min-w-0 flex-1"
                  aria-label={t("codeLabel")}
                  data-help={t("codeHelp")}
                  dir="ltr"
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setTokenMessage(null); }}
                  placeholder='<meta name="google-site-verification" content="…">'
                  spellCheck={false}
                  autoComplete="off"
                />
                <button type="button" className="btn-ghost" disabled={savingToken || token.trim() === (props.searchConsoleToken ?? "")} onClick={saveToken} data-help={t("saveCodeHelp")}>
                  {savingToken && <Loader2 size={15} className="animate-spin" />}
                  {t("saveCode")}
                </button>
              </div>
              {tokenMessage && (
                <p role={tokenMessage.ok ? "status" : "alert"} className={`text-xs ${tokenMessage.ok ? "text-emerald-300" : "text-red-300"}`}>{tokenMessage.text}</p>
              )}
              <div className="text-xs text-surface-400">
                <span className="block">{t("sitemapIntro")}</span>
                <span className="mt-1 flex min-w-0 items-center gap-2">
                  <code dir="ltr" className="min-w-0 break-all rounded bg-white/[0.04] px-1.5 py-0.5 text-surface-200">{props.sitemapUrl}</code>
                  <button type="button" className="studio-icon-button" aria-label={copied ? t("sitemapCopied") : t("copySitemap")} title={copied ? t("copied") : t("copy")} data-help={t("copySitemapHelp")} onClick={copySitemap}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </span>
              </div>
            </div>
          </details>
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <p className="label" data-help={t("googleHelp")}>{t("google")}</p>
            <div className="rounded-lg bg-fixed-white p-4 text-left shadow-sm [[data-theme=light]_&]:ring-1 [[data-theme=light]_&]:ring-surface-700" aria-label={t("googlePreviewLabel")}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dadce0] bg-[#f1f3f4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={props.iconUrl} alt="" className="h-[18px] w-[18px] rounded-sm object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] leading-tight text-[#202124]">{props.siteName}</span>
                  <span className="block truncate text-[12px] leading-tight text-[#4d5156]">{breadcrumb(props.address)}</span>
                </span>
              </div>
              <div className="mt-2 truncate text-[20px] leading-snug text-[#1a0dab]">{props.title}</div>
              <div className="mt-1 line-clamp-2 text-[14px] leading-snug text-[#4d5156]">{shownDescription || t("googleNoDescription")}</div>
            </div>
            {noindex && <p className="mt-2 text-xs text-amber-300">{t("hiddenNote")}</p>}
          </div>

          <div>
            <p className="label" data-help={t("chatHelp")}>{t("chat")}</p>
            <div className="rounded-xl bg-[#0b141a] p-3" aria-label={t("chatPreviewLabel")}>
              <div className="ml-auto max-w-[340px] rounded-lg bg-[#005c4b] p-1 text-left">
                <div className="overflow-hidden rounded-md bg-[#025144]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt=""
                    className="aspect-[1.91/1] w-full bg-black/20 object-cover"
                    onError={() => { if (imageSrc !== props.cardImage) setImageSrc(props.cardImage); }}
                  />
                  <div className="px-2.5 py-2">
                    <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#e9edef]">{props.title}</div>
                    {shownDescription && <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#aebac1]">{shownDescription}</div>}
                    <div className="mt-1 text-[11px] text-[#8696a0]">{host}</div>
                  </div>
                </div>
                <div className="break-all px-1.5 pb-1 pt-1.5 text-[13px] text-[#53bdeb]">{props.address}</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-surface-500">
              {props.imageIsCard
                ? t("imageIsCard")
                : imageSrc === props.cardImage
                  ? t("imageFallback")
                  : t("imageFirst")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
