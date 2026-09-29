import Link from "next/link";
import { ArrowUpRight, Blocks, FileUp, Globe2, LayoutTemplate, PenTool, Sparkles } from "lucide-react";

export const BUILD_METHODS = [
  { id: "ai", href: "/new", title: "Describe it", label: "From idea to app", description: "Say what you want in your own words. Check the plan, then get pages, data and working forms.", icon: Blocks, color: "blue", help: "Describe your app in a few words. The AI suggests a plan you can check and change, then builds the pages, forms and data for you." },
  { id: "template", href: "/new?mode=template", title: "Templates", label: "A beautiful head start", description: "Choose a ready-made design and make every detail your own.", icon: LayoutTemplate, color: "rose", help: "Start from a finished design, like a shop or portfolio. You can change every word, picture and colour afterwards." },
  { id: "designer", href: "/designer", title: "AI Designer", label: "Create together", description: "Shape your idea through a conversation. Design, refine, and explore.", icon: Sparkles, color: "violet", help: "Chat with the AI to design your app step by step. Ask for changes, click parts of the preview to comment, and go back to older versions." },
  { id: "clone", href: "/new?mode=clone", title: "Copy a website", label: "Start with a URL", description: "Bring a website into your workspace, ready to personalise.", icon: Globe2, color: "mint", help: "Type the address of a website you own and copy up to 30 of its pages, with their pictures and styles, into a new app you can edit." },
  { id: "blank", href: "/new?mode=blank", title: "Blank app", label: "Your canvas, your rules", description: "Build by hand with drag-and-drop blocks and ready-made features.", icon: PenTool, color: "amber", help: "Start from a simple welcome page and build the rest yourself by dragging blocks onto it. Best if you like to be fully in control." },
  { id: "import", href: "/new?mode=import", title: "Import an app", label: "From a backup", description: "Bring in an app from a backup .zip, from this server or another.", icon: FileUp, color: "blue", help: "Upload a backup .zip of an app to make a new copy of it here, with its pages, data and pictures. The backup can come from this server or another one." },
] as const;

export function BuildMethods({ compact = false }: { compact?: boolean }) {
  return <div className={`studio-methods ${compact ? "studio-methods-compact" : ""}`}>
    {BUILD_METHODS.map(({ id, href, title, label, description, icon: Icon, color, help }) => (
      <Link key={id} href={href} data-help={help} className={`studio-method studio-accent-${color}`}>
        <div className="flex items-center justify-between"><span className="studio-method-icon"><Icon size={21} strokeWidth={1.6} /></span><ArrowUpRight size={17} className="studio-method-arrow" aria-hidden /></div>
        <span className="studio-eyebrow mt-6 block">{label}</span><h3 className="mt-2 text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-surface-400">{description}</p>
      </Link>
    ))}
  </div>;
}
