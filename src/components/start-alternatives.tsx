"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileUp, Globe2, PenTool, Sparkles, type LucideIcon } from "lucide-react";
import type { TemplateSummary } from "@/lib/templates/types";

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
              <p className="studio-eyebrow">OR START FROM A DESIGN</p>
              <h2 id="start-templates" className="mt-1.5 text-lg font-semibold tracking-tight">Pick a template</h2>
            </div>
            <Link href="/new?mode=template" data-help="Browse every ready-made design, with search and categories." className="inline-flex items-center gap-1 text-sm text-brand-300 hover:text-brand-200">
              See all{templates ? ` ${templates.length}` : ""} templates <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {templates === null
              ? Array.from({ length: 4 }, (_, i) => <div key={i} className="card animate-pulse" style={{ aspectRatio: "16/15" }} aria-hidden />)
              : featured.map((t) => (
                  <Link key={t.id} href={`/new?mode=template&t=${encodeURIComponent(t.id)}`} data-help="Preview this template and start an app from it. You can change every word, picture and colour afterwards." className="card group block overflow-hidden p-0 transition hover:border-brand-500">
                    <div className="overflow-hidden bg-surface-800" style={{ aspectRatio: "16/11" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.preview!} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="px-3 py-2.5">
                      <h3 className="truncate text-sm font-semibold">{t.name}</h3>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-surface-400">{t.tagline}</p>
                    </div>
                  </Link>
                ))}
          </div>
        </section>
      )}
      <section aria-labelledby="start-more">
        <p id="start-more" className="studio-eyebrow">MORE WAYS TO START</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {aiReady && <MoreWay href="/designer" icon={Sparkles} title="Design it together" detail="Chat with the AI Designer and shape your app step by step." help="Opens the AI Designer: describe your app, then keep asking for changes and see them in a live preview." />}
          <MoreWay href="/new?mode=clone" icon={Globe2} title="Copy your website" detail="Bring in a site you already have and make it editable." help="Type your website's address to copy up to 30 of its pages into a new app. Only copy sites you own or may use." />
          <MoreWay href="/new?mode=blank" icon={PenTool} title="Blank app" detail="Build it yourself with drag-and-drop blocks." help="Start from a simple welcome page and build the rest yourself in the drag-and-drop editor." />
          <MoreWay href="/new?mode=import" icon={FileUp} title="Import an app" detail="From a backup .zip, made on this server or another one." help="Upload a backup .zip to get a new copy of that app, with its pages, data and pictures." />
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
      <ArrowRight size={14} className="shrink-0 text-surface-500" aria-hidden />
    </Link>
  );
}
