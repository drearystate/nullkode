"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Blocks, FileUp, Gamepad2, Globe2, LayoutTemplate, PenTool, Sparkles } from "lucide-react";

/** The ways to start an app. Their words are in messages (studio.methods.<id>: title, label, description, help). */
export const BUILD_METHODS = [
  { id: "ai", href: "/new", icon: Blocks, color: "blue" },
  { id: "template", href: "/new?mode=template", icon: LayoutTemplate, color: "rose" },
  { id: "designer", href: "/designer", icon: Sparkles, color: "violet" },
  { id: "game", href: "/games", icon: Gamepad2, color: "mint" },
  { id: "clone", href: "/new?mode=clone", icon: Globe2, color: "mint" },
  { id: "blank", href: "/new?mode=blank", icon: PenTool, color: "amber" },
  { id: "import", href: "/new?mode=import", icon: FileUp, color: "blue" },
] as const;

export function BuildMethods({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("studio.methods");
  return <div className={`studio-methods ${compact ? "studio-methods-compact" : ""}`}>
    {BUILD_METHODS.map(({ id, href, icon: Icon, color }) => (
      <Link key={id} href={href} data-help={t(`${id}.help`)} className={`studio-method studio-accent-${color}`}>
        <div className="flex items-center justify-between"><span className="studio-method-icon"><Icon size={21} strokeWidth={1.6} /></span><ArrowUpRight size={17} className="studio-method-arrow" aria-hidden /></div>
        <span className="studio-eyebrow mt-6 block">{t(`${id}.label`)}</span><h3 className="mt-2 text-base font-semibold tracking-tight">{t(`${id}.title`)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-surface-400">{t(`${id}.description`)}</p>
      </Link>
    ))}
  </div>;
}
