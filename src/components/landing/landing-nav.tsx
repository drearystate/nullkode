"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandWordmark } from "@/components/brand-wordmark";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingNav({ authed, name = "Nullkode", logo }: { authed: boolean; name?: string; logo?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 bg-surface-950/85 backdrop-blur",
        scrolled
          ? "border-b border-white/10 shadow-sm shadow-black/5"
          : "border-b border-transparent"
      )}
    >
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight" aria-label={`${name} home`}>
          {logo ? <><img src={logo} alt="" className="h-8 w-auto" />{name}</> : <BrandWordmark name={name} />}
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-surface-400">
          <a href="#product" className="hover:text-white transition">Product</a>
          <a href="#backend" className="hover:text-white transition">Backend logic</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle signedIn={authed} className="rounded-full border border-white/10 !p-2 hover:border-white/20" />
          {authed ? (
            <Link href="/dashboard" className="btn-primary text-sm px-4 py-2">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-surface-400 hover:text-white transition hidden sm:inline">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary text-sm px-4 py-2">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
