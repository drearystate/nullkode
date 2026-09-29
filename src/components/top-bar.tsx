import Link from "next/link";
import { ChevronDown, LayoutGrid, LogOut, Sparkles, CreditCard, Shield, Briefcase } from "lucide-react";
import { getRealUser, getImpersonation, getCurrentUser } from "@/lib/auth";
import { getRequestBrand } from "@/lib/reseller";
import { ImpersonationBanner } from "./impersonation-banner";

type User = { id: string; name: string | null; email: string };
export async function TopBar({ user, children }: { user: User; children?: React.ReactNode }) {
  const [real, imp, viewer] = await Promise.all([getRealUser(), getImpersonation(), getCurrentUser()]);
  // Clients and resellers see their reseller's brand; everyone else the platform's.
  const { brand } = await getRequestBrand(viewer);
  const logo = brand.logoWideDataUrl || brand.logoDataUrl;
  return <>
    {imp && <ImpersonationBanner adminEmail={imp.admin.email} targetEmail={imp.target.email} targetName={imp.target.name} actorRole={imp.admin.role} />}
    <header className="studio-topbar">
      <div className="studio-topbar-inner">
        <Link href="/dashboard" className="studio-wordmark" aria-label={`${brand.appName} home`}>
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt={brand.appName} className="h-7 w-auto max-w-[160px] object-contain" />
            : <><span className="studio-logo-mark"><span /><span /><span /></span><span>{brand.appName}<span className="text-brand-400">.</span></span></>}
        </Link>
        <span className="studio-topbar-divider" />
        <div className="min-w-0 flex-1">{children || <span className="studio-workspace-label">Workspace</span>}</div>
        <nav aria-label="Account navigation" className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/dashboard" className="studio-top-link"><LayoutGrid size={15} /><span className="hidden md:inline">My apps</span></Link>
          <Link href="/designer" className="studio-top-link hidden sm:inline-flex"><Sparkles size={15} /><span>Designer</span></Link>
          {real?.role === "RESELLER" && <Link href="/reseller" className="studio-top-link" aria-label="Reseller dashboard"><Briefcase size={15} /><span className="hidden md:inline">Reseller dashboard</span></Link>}
          {real?.role === "ADMIN" && <Link href="/admin" className="studio-top-link" aria-label="Admin"><Shield size={15} /><span className="hidden md:inline">Admin</span></Link>}
          <details className="studio-account"><summary aria-label="Account menu"><span className="studio-avatar">{(user.name || user.email).charAt(0).toUpperCase()}</span><ChevronDown size={12} /></summary><div className="studio-account-menu"><p className="px-3 pt-2 font-medium text-surface-100">{user.name || "Your account"}</p><p className="mb-2 truncate border-b border-white/10 px-3 pb-3 pt-1 text-xs text-surface-400">{user.email}</p><Link href="/billing"><CreditCard size={16} />Billing & plan</Link>{real?.role === "RESELLER" && <Link href="/reseller"><Briefcase size={16} />Reseller dashboard</Link>}{real?.role === "ADMIN" && <Link href="/admin"><Shield size={16} />Administration</Link>}<form action="/api/auth/logout" method="post"><button type="submit" className="w-full"><LogOut size={16} />Log out</button></form></div></details>
        </nav>
      </div>
    </header>
  </>;
}
