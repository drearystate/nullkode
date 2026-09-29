"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Globe, LayoutDashboard, Palette, AppWindow, Users } from "lucide-react";

const ITEMS = [
  { href: "/reseller", label: "Overview", Icon: LayoutDashboard },
  { href: "/reseller/clients", label: "Clients", Icon: Users },
  { href: "/reseller/apps", label: "Apps", Icon: AppWindow },
  { href: "/reseller/branding", label: "Branding", Icon: Palette },
  { href: "/reseller/domain", label: "Domain", Icon: Globe },
  { href: "/reseller/billing", label: "Billing & plans", Icon: CreditCard },
];

export function ResellerNav({ name }: { name: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Reseller" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <p className="studio-eyebrow mb-3 truncate">{name}</p>
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/reseller" ? path === href : path.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-white/10 font-medium text-surface-50" : "text-surface-400 hover:bg-white/5 hover:text-surface-100"}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
