"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Blocks, Database, ExternalLink, GitBranch, Globe2, House, Layers, Palette, Rocket, Smartphone, Sparkles } from "lucide-react";

const tabs = [
  { href: "", label: "Overview", icon: House, help: "Your app at a glance: its name, icon, link, launch checklist and settings." },
  { href: "/pages", label: "Pages", icon: Layers, help: "Open the page editor to change the words, pictures and layout of each page in your app." },
  { href: "/modules", label: "Features", icon: Blocks, help: "Add ready-made features to your app, like bookings, a shop or a contact form. Each comes with its own pages." },
  { href: "/flows", label: "Flows", icon: GitBranch, help: "Set up what your app does by itself, like sending you an email when someone fills in a form." },
  { href: "/data", label: "Data", icon: Database, help: "See and edit the information your app keeps, like sign-ups, orders and messages people send." },
  { href: "/theme", label: "Theme", icon: Palette, help: "Choose the colors, fonts and corner shapes for your whole app." },
  { href: "/domains", label: "Domains", icon: Globe2, help: "Put your app on your own web address (domain), like www.yourbusiness.com." },
  { href: "/native", label: "Mobile app", icon: Smartphone, help: "Turn your app into a phone app for Android or iPhone that people can install." },
];
export function ProjectTabs({ projectId, kind = "EDITOR", hasPush = false }: { projectId: string; kind?: "EDITOR" | "DESIGNER"; hasPush?: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  // Always shown: the page offers to turn notifications on when they're off.
  void hasPush;
  const withPush = [...tabs.slice(0, 5), { href: "/notifications", label: "Notifications", icon: Bell, help: "Send short alerts that pop up on the phones and computers of people who allowed them from your app." }, ...tabs.slice(5)];
  const visibleTabs = kind === "DESIGNER" ? [{ href: "/designer", label: "Designer", icon: Sparkles, help: "Go back to the AI Designer to keep building your app by describing what you want." }, ...withPush.filter((t) => t.href !== "")] : withPush;
  return <div className="studio-project-nav"><nav aria-label="Project navigation" className="studio-project-nav-links">{visibleTabs.map(({ href: suffix, label, icon: Icon, help }) => {
    const href = base + suffix;
    const active = suffix === "" ? pathname === base : pathname === href || pathname.startsWith(href + "/");
    return <Link key={suffix} href={href} data-help={help} aria-current={active ? "page" : undefined} className={active ? "active" : ""}><Icon size={15} strokeWidth={1.7} /><span>{label}</span></Link>;
  })}</nav><div className="studio-project-actions"><a href={`/preview/${projectId}`} target="_blank" rel="noopener noreferrer" className="studio-preview-link" data-help="Open your app in a new tab with your latest changes, to try it before your visitors see them."><ExternalLink size={14} /><span>Preview</span></a><Link href={`${base}/publish`} data-help="Go to Publish, where you make your latest changes live for visitors and get your app's link to share." className={`btn-primary ${pathname === `${base}/publish` ? "ring-2 ring-brand-300/30" : ""}`} aria-current={pathname === `${base}/publish` ? "page" : undefined}><Rocket size={14} />Publish</Link></div></div>;
}
