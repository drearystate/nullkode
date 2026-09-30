import Link from "next/link";
import { ChevronDown, LayoutGrid, LogOut, Sparkles, CreditCard, Shield, Briefcase, CircleHelp, UserRound } from "lucide-react";
import { getRealUser, getImpersonation, getCurrentUser } from "@/lib/auth";
import { getRequestBrand } from "@/lib/reseller";
import { ImpersonationBanner } from "./impersonation-banner";
import { HelpTipsLayer } from "./help-tips";
import { HelpLink } from "./help-link";
import { BrandWordmark } from "./brand-wordmark";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "./user-avatar";

type User = { id: string; name: string | null; email: string };
export async function TopBar({ user, children }: { user: User; children?: React.ReactNode }) {
  const [real, imp, viewer] = await Promise.all([getRealUser(), getImpersonation(), getCurrentUser()]);
  // Clients and resellers see their reseller's brand; everyone else the platform's.
  const { brand } = await getRequestBrand(viewer);
  const logo = brand.logoWideDataUrl || brand.logoDataUrl;
  const helpTipsOn = (viewer?.prefs as { helpTips?: boolean } | null)?.helpTips ?? true;
  return <>
    {imp && <ImpersonationBanner adminEmail={imp.admin.email} targetEmail={imp.target.email} targetName={imp.target.name} actorRole={imp.admin.role} />}
    <header className="studio-topbar">
      <div className="studio-topbar-inner">
        <Link href="/dashboard" className="studio-wordmark" aria-label={`${brand.appName} home`}>
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt={brand.appName} className="h-7 w-auto max-w-[160px] object-contain" />
            : <BrandWordmark name={brand.appName} />}
        </Link>
        <span className="studio-topbar-divider" />
        <div className="min-w-0 flex-1">{children || <span className="studio-workspace-label">Workspace</span>}</div>
        <nav aria-label="Account navigation" className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/dashboard" className="studio-top-link" data-help="All your apps in one place. Open one to keep working on it, or start a new one."><LayoutGrid size={15} /><span className="hidden md:inline">My apps</span></Link>
          <Link href="/designer" className="studio-top-link" aria-label="Designer" data-help="Describe a website in your own words and the AI designs it, then keeps changing it as you ask."><Sparkles size={15} /><span className="hidden md:inline">Designer</span></Link>
          {real?.role === "RESELLER" && <Link href="/reseller" className="studio-top-link" aria-label="Reseller dashboard" data-help="Manage your clients, your brand, your prices and your web address."><Briefcase size={15} /><span className="hidden md:inline">Reseller dashboard</span></Link>}
          {real?.role === "ADMIN" && <Link href="/admin" className="studio-top-link" aria-label="Admin" data-help="Settings for the whole platform: branding, AI, email, payments, users and resellers."><Shield size={15} /><span className="hidden md:inline">Admin</span></Link>}
          <HelpLink />
          <ThemeToggle signedIn />
          <details className="studio-account"><summary aria-label="Account menu"><UserAvatar name={user.name} email={user.email} avatarUrl={viewer?.avatarUrl} /><ChevronDown size={12} /></summary><div className="studio-account-menu"><div className="mb-2 flex items-center gap-3 border-b border-white/10 px-3 pb-3 pt-2"><UserAvatar name={user.name} email={user.email} avatarUrl={viewer?.avatarUrl} size={40} /><div className="min-w-0"><p className="truncate font-medium text-surface-100">{user.name || "Your account"}</p><p className="truncate text-xs text-surface-400">{user.email}</p></div></div><Link href="/account"><UserRound size={16} />Profile</Link><Link href="/billing"><CreditCard size={16} />Billing & plan</Link><Link href="/help"><CircleHelp size={16} />Help & guides</Link>{real?.role === "RESELLER" && <Link href="/reseller"><Briefcase size={16} />Reseller dashboard</Link>}{real?.role === "ADMIN" && <Link href="/admin"><Shield size={16} />Administration</Link>}<form action="/api/auth/logout" method="post"><button type="submit" className="w-full"><LogOut size={16} />Log out</button></form></div></details>
        </nav>
      </div>
    </header>
    <HelpTipsLayer initialOn={helpTipsOn} />
  </>;
}
