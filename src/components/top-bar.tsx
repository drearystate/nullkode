import Link from "next/link";
import { ChevronDown, Gamepad2, LayoutGrid, LogOut, Sparkles, CreditCard, Shield, Briefcase, CircleHelp, UserRound } from "lucide-react";
import { getRealUser, getImpersonation, getCurrentUser } from "@/lib/auth";
import { getRequestBrand } from "@/lib/reseller";
import { getTranslations } from "next-intl/server";
import { LanguagePicker } from "./language-picker";
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
  const t = await getTranslations("nav");
  return <>
    {imp && <ImpersonationBanner adminEmail={imp.admin.email} targetEmail={imp.target.email} targetName={imp.target.name} actorRole={imp.admin.role} />}
    <header className="studio-topbar">
      <div className="studio-topbar-inner">
        <Link href="/dashboard" className="studio-wordmark" aria-label={t("home", { app: brand.appName })}>
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt={brand.appName} className="h-7 w-auto max-w-[160px] object-contain" />
            : <BrandWordmark name={brand.appName} />}
        </Link>
        <span className="studio-topbar-divider" />
        <div className="min-w-0 flex-1">{children || <span className="studio-workspace-label">{t("workspace")}</span>}</div>
        <nav aria-label={t("accountNavigation")} className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/dashboard" className="studio-top-link" data-help={t("myAppsHelp")}><LayoutGrid size={15} /><span className="hidden md:inline">{t("myApps")}</span></Link>
          <Link href="/designer" className="studio-top-link" aria-label={t("designer")} data-help={t("designerHelp")}><Sparkles size={15} /><span className="hidden md:inline">{t("designer")}</span></Link>
          <Link href="/games" className="studio-top-link" aria-label={t("games")} data-help={t("gamesHelp")}><Gamepad2 size={15} /><span className="hidden md:inline">{t("games")}</span></Link>
          {real?.role === "RESELLER" && <Link href="/reseller" className="studio-top-link" aria-label={t("resellerDashboard")} data-help={t("resellerHelp")}><Briefcase size={15} /><span className="hidden md:inline">{t("resellerDashboard")}</span></Link>}
          {real?.role === "ADMIN" && <Link href="/admin" className="studio-top-link" aria-label={t("admin")} data-help={t("adminHelp")}><Shield size={15} /><span className="hidden md:inline">{t("admin")}</span></Link>}
          <HelpLink />
          <ThemeToggle signedIn />
          <details className="studio-account"><summary aria-label={t("accountMenu")}><UserAvatar name={user.name} email={user.email} avatarUrl={viewer?.avatarUrl} /><ChevronDown size={12} /></summary><div className="studio-account-menu"><div className="mb-2 flex items-center gap-3 border-b border-white/10 px-3 pb-3 pt-2"><UserAvatar name={user.name} email={user.email} avatarUrl={viewer?.avatarUrl} size={40} /><div className="min-w-0"><p className="truncate font-medium text-surface-100">{user.name || t("yourAccount")}</p><p className="truncate text-xs text-surface-400">{user.email}</p></div></div><Link href="/account"><UserRound size={16} />{t("profile")}</Link><Link href="/billing"><CreditCard size={16} />{t("billing")}</Link><Link href="/help"><CircleHelp size={16} />{t("helpGuides")}</Link>{real?.role === "RESELLER" && <Link href="/reseller"><Briefcase size={16} />{t("resellerDashboard")}</Link>}{real?.role === "ADMIN" && <Link href="/admin"><Shield size={16} />{t("administration")}</Link>}<form action="/api/auth/logout" method="post"><button type="submit" className="w-full"><LogOut size={16} />{t("logOut")}</button></form><div className="mt-1 border-t border-white/10 px-3 pb-1 pt-3"><LanguagePicker signedIn compact /></div></div></details>
        </nav>
      </div>
    </header>
    <HelpTipsLayer initialOn={helpTipsOn} />
  </>;
}
