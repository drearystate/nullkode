import Link from "next/link";
import { ArrowUpRight, Blocks, FileUp, Globe2, LayoutTemplate, PenTool, Sparkles } from "lucide-react";

export const BUILD_METHODS = [
  { id: "ai", href: "/new", title: "Describe it", label: "From idea to app", description: "Say what you want in your own words. Check the plan, then get pages, data and working forms.", icon: Blocks, color: "blue" },
  { id: "template", href: "/new?mode=template", title: "Templates", label: "A beautiful head start", description: "Choose a ready-made design and make every detail your own.", icon: LayoutTemplate, color: "rose" },
  { id: "designer", href: "/designer", title: "AI Designer", label: "Create together", description: "Shape your idea through a conversation. Design, refine, and explore.", icon: Sparkles, color: "violet" },
  { id: "clone", href: "/new?mode=clone", title: "Copy a website", label: "Start with a URL", description: "Bring a website into your workspace, ready to personalise.", icon: Globe2, color: "mint" },
  { id: "blank", href: "/new?mode=blank", title: "Blank app", label: "Your canvas, your rules", description: "Build by hand with drag-and-drop blocks and ready-made features.", icon: PenTool, color: "amber" },
  { id: "import", href: "/new?mode=import", title: "Import an app", label: "From a backup", description: "Bring in an app from a backup .zip, from this server or another.", icon: FileUp, color: "blue" },
] as const;

export function BuildMethods({ compact = false }: { compact?: boolean }) {
  return <div className={`studio-methods ${compact ? "studio-methods-compact" : ""}`}>
    {BUILD_METHODS.map(({ id, href, title, label, description, icon: Icon, color }) => (
      <Link key={id} href={href} className={`studio-method studio-accent-${color}`}>
        <div className="flex items-center justify-between"><span className="studio-method-icon"><Icon size={21} strokeWidth={1.6} /></span><ArrowUpRight size={17} className="studio-method-arrow" aria-hidden /></div>
        <span className="studio-eyebrow mt-6 block">{label}</span><h3 className="mt-2 text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-surface-400">{description}</p>
      </Link>
    ))}
  </div>;
}
