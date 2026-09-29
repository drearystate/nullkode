"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Globe, LayoutDashboard, Palette, AppWindow, Users } from "lucide-react";

const ITEMS = [
  { href: "/reseller", label: "Overview", Icon: LayoutDashboard, help: "Your usage, setup steps and newest clients at a glance." },
  { href: "/reseller/clients", label: "Clients", Icon: Users, help: "Invite clients, change their plan, open their workspace to help, or suspend them." },
  { href: "/reseller/apps", label: "Apps", Icon: AppWindow, help: "Every app you and your clients have made. Open one to help, or give an app you built to a client." },
  { href: "/reseller/branding", label: "Branding", Icon: Palette, help: "The name, logo and colours your clients see instead of the platform's." },
  { href: "/reseller/domain", label: "Domain", Icon: Globe, help: "Connect your own web address, where your clients sign in." },
  { href: "/reseller/billing", label: "Billing & plans", Icon: CreditCard, help: "Set your prices, connect Stripe, and choose what each plan includes." },
];

export function ResellerNav({ name }: { name: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Reseller" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <p className="studio-eyebrow mb-3 truncate">{name}</p>
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map(({ href, label, Icon, help }) => {
          const active = href === "/reseller" ? path === href : path.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                data-help={help}
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
