"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileUp, Globe2, PenTool, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TemplateSummary } from "@/lib/templates/types";
import { useCatalog } from "@/lib/use-catalog";

// A spread of kinds of business, so the first few suggestions feel varied.
const FEATURED_ORDER = ["restaurant", "fitness", "portfolio", "ecommerce", "beauty", "education", "saas", "health", "creative", "hospitality"];

function pickFeatured(list: TemplateSummary[], count: number): TemplateSummary[] {
  const withPreview = list.filter((t) => t.preview);
  const picks: TemplateSummary[] = [];
  for (const category of FEATURED_ORDER) {
    const t = withPreview.find((x) => x.category === category && !picks.includes(x));
    if (t) picks.push(t);
    if (picks.length === count) return picks;
  }
  for (const t of withPreview) {
    if (picks.length === count) break;
    if (!picks.includes(t)) picks.push(t);
  }
  return picks;
}

/** Templates and the other ways to start, under the idea box on /new. */
export function StartAlternatives({ aiReady }: { aiReady: boolean }) {
  const t = useTranslations("studio.start");
  const cat = useCatalog();
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? [])).catch(() => setTemplates([]));
  }, []);
  const featured = useMemo(() => pickFeatured(templates ?? [], 4), [templates]);

  return (
    <div className="mt-16 space-y-12">
      {(templates === null || featured.length > 0) && (
        <section aria-labelledby="start-templates">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="studio-eyebrow">{t("templatesEyebrow")}</p>
              <h2 id="start-templates" className="mt-1.5 text-lg font-semibold tracking-tight">{t("pickTemplate")}</h2>
            </div>
            <Link href="/new?mode=template" data-help={t("seeAllHelp")} className="inline-flex items-center gap-1 text-sm text-brand-300 hover:text-brand-200">
              {templates ? t("seeAllCount", { count: templates.length }) : t("seeAll")} <ArrowRight size={14} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {templates === null
              ? Array.from({ length: 4 }, (_, i) => <div key={i} className="card animate-pulse" style={{ aspectRatio: "16/15" }} aria-hidden />)
              : featured.map((tpl) => (
                  <Link key={tpl.id} href={`/new?mode=template&t=${encodeURIComponent(tpl.id)}`} data-help={t("templateHelp")} className="card group block overflow-hidden p-0 transition hover:border-brand-500">
                    <div className="overflow-hidden bg-surface-800" style={{ aspectRatio: "16/11" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tpl.preview!} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="px-3 py-2.5">
                      <h3 className="truncate text-sm font-semibold">{cat.templateName(tpl)}</h3>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-surface-400">{cat.templateTagline(tpl)}</p>
                    </div>
                  </Link>
                ))}
          </div>
        </section>
      )}
      <section aria-labelledby="start-more">
        <p id="start-more" className="studio-eyebrow">{t("moreEyebrow")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {aiReady && <MoreWay href="/designer" icon={Sparkles} title={t("designTitle")} detail={t("designDetail")} help={t("designHelp")} />}
          <MoreWay href="/new?mode=clone" icon={Globe2} title={t("cloneTitle")} detail={t("cloneDetail")} help={t("cloneHelp")} />
          <MoreWay href="/new?mode=blank" icon={PenTool} title={t("blankTitle")} detail={t("blankDetail")} help={t("blankHelp")} />
          <MoreWay href="/new?mode=import" icon={FileUp} title={t("importTitle")} detail={t("importDetail")} help={t("importHelp")} />
        </div>
      </section>
    </div>
  );
}

function MoreWay({ href, icon: Icon, title, detail, help }: { href: string; icon: LucideIcon; title: string; detail: string; help?: string }) {
  return (
    <Link href={href} data-help={help} className="studio-next-step">
      <Icon size={17} className="shrink-0 text-brand-300" aria-hidden />
      <span className="flex-1">
        <strong className="block text-sm font-medium">{title}</strong>
        <span className="mt-0.5 block text-xs text-surface-400">{detail}</span>
      </span>
      <ArrowRight size={14} className="shrink-0 text-surface-500 rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}
