"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Blocks, Database, ExternalLink, GitBranch, Globe2, House, KeyRound, Layers, Palette, Rocket, Smartphone, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ShareButton } from "@/components/sharing/share-dialog";
import { CopyCredit } from "@/components/sharing/role-banner";

/** The project's tabs; names and hover notes are in project.json under tabs.<key>. */
const tabs = [
  { href: "", key: "overview", icon: House },
  { href: "/pages", key: "pages", icon: Layers },
  { href: "/modules", key: "features", icon: Blocks },
  { href: "/flows", key: "flows", icon: GitBranch },
  { href: "/data", key: "data", icon: Database },
  { href: "/ai", key: "aiKeys", icon: KeyRound },
  { href: "/theme", key: "theme", icon: Palette },
  { href: "/domains", key: "domains", icon: Globe2 },
  { href: "/native", key: "mobileApp", icon: Smartphone },
];
/** Tabs only the app's owner sees (lib/sharing/access.ts): keys, notifications, domains and phone-app builds. */
const OWNER_TABS = new Set(["/ai", "/notifications", "/domains", "/native"]);

export function ProjectTabs({ projectId, kind = "EDITOR", hasPush = false, role = "owner", name = "", credit = null }: { projectId: string; kind?: "EDITOR" | "DESIGNER"; hasPush?: boolean; role?: "owner" | "editor" | "viewer"; name?: string; credit?: { sourceName: string; sourceOwnerName: string } | null }) {
  const pathname = usePathname();
  const t = useTranslations("project.tabs");
  const base = `/projects/${projectId}`;
  // Always shown: the page offers to turn notifications on when they're off.
  void hasPush;
  const withPush = [...tabs.slice(0, 6), { href: "/notifications", key: "notifications", icon: Bell }, ...tabs.slice(6)];
  // Collaborators: no owner-only tabs; viewers don't see the app's data either (people's data).
  const forRole = role === "owner" ? withPush : withPush.filter((tab) => !OWNER_TABS.has(tab.href) && !(role === "viewer" && tab.href === "/data"));
  const visibleTabs = kind === "DESIGNER" ? [{ href: "/designer", key: "designer", icon: Sparkles }, ...forRole.filter((t) => t.href !== "")] : forRole;
  return <div className="studio-project-nav"><nav aria-label={t("navLabel")} className="studio-project-nav-links">{visibleTabs.map(({ href: suffix, key, icon: Icon }) => {
    const href = base + suffix;
    const active = suffix === "" ? pathname === base : pathname === href || pathname.startsWith(href + "/");
    return <Link key={suffix} href={href} data-help={t(`${key}.help`)} aria-current={active ? "page" : undefined} className={active ? "active" : ""}><Icon size={15} strokeWidth={1.7} /><span>{t(`${key}.label`)}</span></Link>;
  })}</nav><div className="studio-project-actions">{credit && <CopyCredit kind="app" id={projectId} sourceName={credit.sourceName} sourceOwnerName={credit.sourceOwnerName} />}<a href={`/preview/${projectId}`} target="_blank" rel="noopener noreferrer" className="studio-preview-link" data-help={t("previewHelp")}><ExternalLink size={14} /><span>{t("preview")}</span></a>{role === "owner" && <ShareButton kind="app" id={projectId} name={name} className="studio-preview-link" />}{role === "owner" && <Link href={`${base}/publish`} data-help={t("publishHelp")} className={`btn-primary ${pathname === `${base}/publish` ? "ring-2 ring-brand-300/30" : ""}`} aria-current={pathname === `${base}/publish` ? "page" : undefined}><Rocket size={14} />{t("publish")}</Link>}</div></div>;
}
