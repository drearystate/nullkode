"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Globe, KeyRound, LayoutDashboard, Palette, AppWindow, Users } from "lucide-react";
import { useTranslations } from "next-intl";

const ITEMS = [
  { href: "/reseller", id: "overview", Icon: LayoutDashboard },
  { href: "/reseller/clients", id: "clients", Icon: Users },
  { href: "/reseller/apps", id: "apps", Icon: AppWindow },
  { href: "/reseller/branding", id: "branding", Icon: Palette },
  { href: "/reseller/domain", id: "domain", Icon: Globe },
  { href: "/reseller/billing", id: "billing", Icon: CreditCard },
  { href: "/reseller/partner-api", id: "partnerApi", Icon: KeyRound },
] as const;

export function ResellerNav({ name }: { name: string }) {
  const path = usePathname();
  const t = useTranslations("reseller.nav");
  return (
    <nav aria-label={t("label")} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <p className="studio-eyebrow mb-3 truncate">{name}</p>
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map(({ href, id, Icon }) => {
          const active = href === "/reseller" ? path === href : path.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                data-help={t(`${id}Help`)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-white/10 font-medium text-surface-50" : "text-surface-400 hover:bg-white/5 hover:text-surface-100"}`}
              >
                <Icon size={16} />
                {t(id)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
