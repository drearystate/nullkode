/**
 * Platform nav merged into the Designer top bar: back to your apps, Admin
 * (admins only) and a user menu with Log out. User info (and the brand) come
 * from the codesign shim's `me.get`, fetched once via the ui-prefs store.
 * On small screens the pills shrink to icons so the header never overlaps.
 */

import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useUiPrefs } from '../state/ui-prefs';

const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

const pillClass =
  'inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.04] px-2.5 text-[13px] text-[var(--color-text-secondary)] hover:bg-white/[0.08] hover:text-[var(--color-text-primary)] transition-colors';

export function NullkodeNav() {
  const me = useUiPrefs((s) => s.me);
  const loadMe = useUiPrefs((s) => s.loadMe);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  // Close menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (!me) return null;

  async function logout() {
    if (!me) return;
    try {
      await fetch(me.links.logout, { method: 'POST', credentials: 'same-origin' });
    } catch {}
    window.location.href = '/login';
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" style={noDragStyle}>
      <a href={me.links.dashboard} className={pillClass} title="Back to your apps" aria-label="Your apps">
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden lg:inline">Your apps</span>
      </a>
      {me.links.admin ? (
        <a href={me.links.admin} className={`${pillClass} hidden sm:inline-flex`} title="Admin settings" aria-label="Admin">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden lg:inline">Admin</span>
        </a>
      ) : null}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.04] px-1.5 hover:bg-white/[0.08] transition-colors"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Your account"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 text-[11px] font-bold text-white">
            {me.name.charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-[140px] truncate pr-1 text-[13px] text-[var(--color-text-secondary)] xl:inline">
            {me.name}
          </span>
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-[var(--radius-md)] border border-white/10 bg-[#0a0a14] shadow-2xl"
          >
            <div className="border-b border-white/5 px-3 py-2.5">
              <div className="text-[11px] text-[var(--color-text-muted)]">Signed in as</div>
              <div className="mt-0.5 truncate text-[13px] text-[var(--color-text-primary)]">
                {me.email}
              </div>
            </div>
            {me.links.admin ? (
              <a
                href={me.links.admin}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-white/[0.04] hover:text-[var(--color-text-primary)] sm:hidden"
              >
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Admin
              </a>
            ) : null}
            <a
              href={me.links.billing}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-white/[0.04] hover:text-[var(--color-text-primary)]"
            >
              <UserIcon className="h-3.5 w-3.5" aria-hidden />
              Billing
            </a>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 border-t border-white/5 px-3 py-2 text-left text-[13px] text-[var(--color-text-secondary)] hover:bg-white/[0.04] hover:text-[var(--color-text-primary)]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
