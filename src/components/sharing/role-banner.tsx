"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut, PenLine, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

type Kind = "app" | "design" | "game";

/** For collaborators: whose this is and what their role lets them do, with a way to leave (docs/sharing.md). */
export function RoleBanner({ kind, id, name, role, owner }: { kind: Kind; id: string; name: string; role: "editor" | "viewer"; owner: string }) {
  const t = useTranslations("sharing");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function leave() {
    if (!window.confirm(t("banner.leaveConfirm", { name }))) return;
    setBusy(true);
    const res = await fetch("/api/share/leave", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.push("/dashboard#shared-with-me");
  }
  return <div role="status" className="border-b border-brand-400/20 bg-brand-500/[0.08] px-4 py-2 text-sm text-brand-100" data-testid="role-banner" data-role={role}>
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
      {role === "viewer" ? <Eye size={15} className="shrink-0 text-brand-300" aria-hidden /> : <PenLine size={15} className="shrink-0 text-brand-300" aria-hidden />}
      <span className="min-w-0 flex-1">{t(role === "viewer" ? "banner.viewer" : "banner.editor", { owner, kind })}</span>
      <button type="button" className="inline-flex items-center gap-1 text-xs text-brand-200 hover:text-brand-100" onClick={() => void leave()} disabled={busy} data-help={t("banner.leaveHelp")}><LogOut size={13} aria-hidden />{t("banner.leave")}</button>
    </div>
  </div>;
}

/** On a copy: where it came from ("Copied from …"); its owner can hide it. */
export function CopyCredit({ kind, id, sourceName, sourceOwnerName }: { kind: Kind; id: string; sourceName: string; sourceOwnerName: string }) {
  const t = useTranslations("sharing");
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  async function hide() {
    const res = await fetch("/api/share/credit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id }) }).catch(() => null);
    if (res?.ok) setHidden(true);
  }
  return <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-surface-300" data-testid="copy-credit">
    <Sparkles size={12} className="shrink-0 text-brand-300" aria-hidden />
    <span className="truncate" dir="auto">{sourceOwnerName ? t("credit.fromBy", { name: sourceName, owner: sourceOwnerName }) : t("credit.from", { name: sourceName })}</span>
    <button type="button" className="shrink-0 rounded p-0.5 text-surface-400 hover:text-surface-100" onClick={() => void hide()} aria-label={t("credit.hide")} title={t("credit.hide")} data-help={t("credit.hideHelp")} data-testid="copy-credit-hide"><X size={12} /></button>
  </span>;
}

/** The compact form of RoleBanner for the full-height Game Studio and Designer workspaces (in the top bar). */
export function RolePill({ kind, id, name, role, owner }: { kind: Kind; id: string; name: string; role: "editor" | "viewer"; owner: string }) {
  const t = useTranslations("sharing");
  const router = useRouter();
  async function leave() {
    if (!window.confirm(t("banner.leaveConfirm", { name }))) return;
    const res = await fetch("/api/share/leave", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id }) }).catch(() => null);
    if (res?.ok) router.push("/dashboard#shared-with-me");
  }
  return <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-brand-400/25 bg-brand-500/10 px-2.5 py-1 text-xs text-brand-100" data-testid="role-banner" data-role={role} title={t(role === "viewer" ? "banner.viewer" : "banner.editor", { owner, kind })}>
    {role === "viewer" ? <Eye size={12} className="shrink-0" aria-hidden /> : <PenLine size={12} className="shrink-0" aria-hidden />}
    <span className="truncate">{t(role === "viewer" ? "shared.roleViewer" : "shared.roleEditor")} · {t("shared.by", { owner })}</span>
    <button type="button" className="shrink-0 rounded p-0.5 text-brand-200 hover:text-white" onClick={() => void leave()} aria-label={t("banner.leave")} title={t("banner.leave")} data-help={t("banner.leaveHelp")}><X size={12} /></button>
  </span>;
}
