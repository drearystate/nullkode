"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppWindow, Check, Clock3, Gamepad2, LogOut, Mail, Sparkles, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocalTime } from "@/components/local-time";

type Kind = "app" | "design" | "game";
export type SharedItem = { id: string; kind: Kind; name: string; role: "editor" | "viewer"; owner: string; updatedAt: string; appKind?: "EDITOR" | "DESIGNER"; homePageId?: string | null; shotSeq?: number | null; engine?: string };
export type PendingInvite = { id: string; kind: Kind; targetId: string; title: string; role: "editor" | "viewer"; from: string; invitedAt: string; canAcceptHere: boolean };

/** Where the studio opens something shared with the person. */
export function sharedHref(item: Pick<SharedItem, "id" | "kind" | "role" | "appKind">): string {
  if (item.kind === "game") return `/games/${item.id}`;
  if (item.kind === "design") return `/designer/${item.id}`;
  if (item.role === "editor" && item.appKind !== "DESIGNER") return `/projects/${item.id}/pages`;
  return `/projects/${item.id}`;
}

const ICON = { app: AppWindow, design: Sparkles, game: Gamepad2 } as const;

/**
 * The dashboard's "Shared with me" (docs/sharing.md): pending invitations
 * (accept or decline) and the apps, designs and games other people invited
 * the person to work on. Nothing shows when there's neither.
 */
export function SharedWithMe({ items: initial, invites: initialInvites }: { items: SharedItem[]; invites: PendingInvite[] }) {
  const t = useTranslations("sharing");
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [invites, setInvites] = useState(initialInvites);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (!items.length && !invites.length) return null;

  async function answer(inv: PendingInvite, action: "accept" | "decline") {
    setBusy(inv.id);
    setError(null);
    try {
      const res = await fetch(`/api/me/invites/${inv.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error ?? t("dialog.networkError")); return; }
      setInvites((list) => list.filter((x) => x.id !== inv.id));
      if (action === "accept") router.refresh();
    } catch {
      setError(t("dialog.networkError"));
    } finally {
      setBusy(null);
    }
  }

  async function leave(item: SharedItem) {
    if (!window.confirm(t("shared.leaveConfirm", { name: item.name }))) return;
    const res = await fetch("/api/share/leave", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: item.kind, id: item.id }) }).catch(() => null);
    if (res?.ok) setItems((list) => list.filter((x) => !(x.id === item.id && x.kind === item.kind)));
    else setError(t("dialog.networkError"));
  }

  return <section id="shared-with-me" className="mt-10 scroll-mt-24" aria-labelledby="shared-heading" data-testid="shared-with-me">
    <div><p className="studio-eyebrow">{t("shared.eyebrow")}</p><h2 id="shared-heading" className="mt-2 text-2xl font-semibold tracking-tight" data-help={t("shared.help")}>{t("shared.title")} {items.length > 0 && <span className="studio-count">{items.length}</span>}</h2></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {invites.length > 0 && <div className="mt-5 space-y-2" aria-label={t("shared.invitesTitle")} data-testid="pending-invites">
      {invites.map((inv) => <div key={inv.id} className="flex flex-col gap-3 rounded-xl border border-brand-400/25 bg-brand-500/[0.07] p-4 sm:flex-row sm:items-center" data-testid="pending-invite">
        <Mail size={18} className="hidden shrink-0 text-brand-300 sm:block" aria-hidden />
        <p className="min-w-0 flex-1 text-sm" dir="auto">{t("shared.invite", { from: inv.from, title: inv.title, role: inv.role })}{!inv.canAcceptHere && <span className="mt-1 block text-xs text-surface-400">{t("shared.needsLink")}</span>}</p>
        <div className="flex shrink-0 gap-2">
          {inv.canAcceptHere && <button type="button" className="btn-primary" disabled={busy === inv.id} onClick={() => void answer(inv, "accept")} data-help={t("shared.acceptHelp")} data-testid="invite-accept"><Check size={15} aria-hidden />{t("shared.accept")}</button>}
          <button type="button" className="btn-ghost" disabled={busy === inv.id} onClick={() => void answer(inv, "decline")} data-help={t("shared.declineHelp")} data-testid="invite-decline"><X size={15} aria-hidden />{t("shared.decline")}</button>
        </div>
      </div>)}
    </div>}
    {items.length > 0 && <div className="studio-project-grid mt-6">{items.map((item) => {
      const Icon = ICON[item.kind];
      const href = sharedHref(item);
      return <article key={`${item.kind}:${item.id}`} className="studio-project-card" data-testid="shared-card" data-kind={item.kind} data-id={item.id}>
        <Link href={href} className="block" aria-label={t("shared.open", { name: item.name })} data-help={t("shared.openHelp")}>
          <div className="studio-project-preview" aria-hidden="true">
            {item.kind === "game" && item.shotSeq != null
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/api/games/${item.id}/versions/${item.shotSeq}/shot`} alt="" className="h-full w-full object-cover" loading="lazy" />
              : <div className="studio-preview-empty"><Icon size={36} strokeWidth={1} /></div>}
            <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white"><Users size={11} aria-hidden />{item.role === "viewer" ? t("shared.roleViewer") : t("shared.roleEditor")}</span>
            <div className="studio-preview-shade" />
          </div>
        </Link>
        <div className="p-5">
          <Link href={href} className="block min-w-0"><h3 className="flex min-w-0 items-center gap-2 font-semibold text-surface-50"><span className="truncate" dir="auto">{item.name}</span><span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-surface-300"><Icon size={11} aria-hidden />{item.kind === "game" ? t("shared.kindGame") : item.kind === "design" ? t("shared.kindDesign") : t("shared.kindApp")}</span></h3><p className="mt-1 truncate text-xs text-surface-400" dir="auto">{t("shared.by", { owner: item.owner })}</p></Link>
          <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="flex items-center gap-1.5 text-xs text-surface-400"><Clock3 size={12} aria-hidden /><span className="sr-only">{t("shared.updated")}</span><LocalTime value={item.updatedAt} options={{ month: "short", day: "numeric", timeZone: "UTC" }} /></span>
            <button type="button" className="studio-icon-button" onClick={() => void leave(item)} aria-label={t("shared.leaveNamed", { name: item.name })} title={t("shared.leave")} data-help={t("shared.leaveHelp")} data-testid="shared-leave"><LogOut size={15} /></button>
          </div>
        </div>
      </article>;
    })}</div>}
  </section>;
}
