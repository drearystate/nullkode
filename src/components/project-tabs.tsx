"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Blocks, Database, ExternalLink, GitBranch, Globe2, House, Layers, Palette, Rocket, Smartphone, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

/** The project's tabs; names and hover notes are in project.json under tabs.<key>. */
const tabs = [
  { href: "", key: "overview", icon: House },
  { href: "/pages", key: "pages", icon: Layers },
  { href: "/modules", key: "features", icon: Blocks },
  { href: "/flows", key: "flows", icon: GitBranch },
  { href: "/data", key: "data", icon: Database },
  { href: "/theme", key: "theme", icon: Palette },
  { href: "/domains", key: "domains", icon: Globe2 },
  { href: "/native", key: "mobileApp", icon: Smartphone },
];
export function ProjectTabs({ projectId, kind = "EDITOR", hasPush = false }: { projectId: string; kind?: "EDITOR" | "DESIGNER"; hasPush?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("project.tabs");
  const base = `/projects/${projectId}`;
  // Always shown: the page offers to turn notifications on when they're off.
  void hasPush;
  const withPush = [...tabs.slice(0, 5), { href: "/notifications", key: "notifications", icon: Bell }, ...tabs.slice(5)];
  const visibleTabs = kind === "DESIGNER" ? [{ href: "/designer", key: "designer", icon: Sparkles }, ...withPush.filter((t) => t.href !== "")] : withPush;
  return <div className="studio-project-nav"><nav aria-label={t("navLabel")} className="studio-project-nav-links">{visibleTabs.map(({ href: suffix, key, icon: Icon }) => {
    const href = base + suffix;
    const active = suffix === "" ? pathname === base : pathname === href || pathname.startsWith(href + "/");
    return <Link key={suffix} href={href} data-help={t(`${key}.help`)} aria-current={active ? "page" : undefined} className={active ? "active" : ""}><Icon size={15} strokeWidth={1.7} /><span>{t(`${key}.label`)}</span></Link>;
  })}</nav><div className="studio-project-actions"><a href={`/preview/${projectId}`} target="_blank" rel="noopener noreferrer" className="studio-preview-link" data-help={t("previewHelp")}><ExternalLink size={14} /><span>{t("preview")}</span></a><Link href={`${base}/publish`} data-help={t("publishHelp")} className={`btn-primary ${pathname === `${base}/publish` ? "ring-2 ring-brand-300/30" : ""}`} aria-current={pathname === `${base}/publish` ? "page" : undefined}><Rocket size={14} />{t("publish")}</Link></div></div>;
}
