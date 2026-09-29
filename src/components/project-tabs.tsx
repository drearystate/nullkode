"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Blocks, Database, ExternalLink, GitBranch, Globe2, House, Layers, Palette, Rocket, Smartphone, Sparkles } from "lucide-react";

const tabs = [
  { href: "", label: "Overview", icon: House, help: "Your app, settings, and next steps." },
  { href: "/pages", label: "Pages", icon: Layers, help: "Design and edit your app’s pages." },
  { href: "/modules", label: "Features", icon: Blocks, help: "Add ready-made modules: bookings, shops, forms, and more." },
  { href: "/flows", label: "Flows", icon: GitBranch, help: "Connect actions and automate what happens in your app." },
  { href: "/data", label: "Data", icon: Database, help: "Manage the information your app stores." },
  { href: "/theme", label: "Theme", icon: Palette, help: "Choose colours and fonts for your app." },
  { href: "/domains", label: "Domains", icon: Globe2, help: "Connect your own web address." },
  { href: "/native", label: "Mobile app", icon: Smartphone, help: "Build an Android or iOS version of your app." },
];
export function ProjectTabs({ projectId, kind = "EDITOR", hasPush = false }: { projectId: string; kind?: "EDITOR" | "DESIGNER"; hasPush?: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  // Always shown: the page offers to turn notifications on when they're off.
  void hasPush;
  const withPush = [...tabs.slice(0, 5), { href: "/notifications", label: "Notifications", icon: Bell, help: "Send messages to the phones of people who follow your app." }, ...tabs.slice(5)];
  const visibleTabs = kind === "DESIGNER" ? [{ href: "/designer", label: "Designer", icon: Sparkles, help: "Continue creating with your AI design assistant." }, ...withPush.filter((t) => t.href !== "")] : withPush;
  return <div className="studio-project-nav"><nav aria-label="Project navigation" className="studio-project-nav-links">{visibleTabs.map(({ href: suffix, label, icon: Icon, help }) => {
    const href = base + suffix;
    const active = suffix === "" ? pathname === base : pathname === href || pathname.startsWith(href + "/");
    return <Link key={suffix} href={href} data-help={help} aria-current={active ? "page" : undefined} className={active ? "active" : ""}><Icon size={15} strokeWidth={1.7} /><span>{label}</span></Link>;
  })}</nav><div className="studio-project-actions"><a href={`/preview/${projectId}`} target="_blank" rel="noopener noreferrer" className="studio-preview-link"><ExternalLink size={14} /><span>Preview</span></a><Link href={`${base}/publish`} className={`btn-primary ${pathname === `${base}/publish` ? "ring-2 ring-brand-300/30" : ""}`} aria-current={pathname === `${base}/publish` ? "page" : undefined}><Rocket size={14} />Publish</Link></div></div>;
}
