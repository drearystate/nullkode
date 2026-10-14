"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Link2, Share2, Trash2, UserPlus, Users, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { CopyContents } from "./copy-contents";

type Kind = "app" | "design" | "game";
type LinkView = { id: string; kind: Kind; url: string; includeData: boolean; expiresAt: string | null; revokedAt: string | null; createdAt: string; active: boolean; copies: number };
type CopyView = { id: string; at: string; user: { name: string; email: string } | null; linkId: string | null; includeData: boolean };
type Collaborator = { id: string; email: string; name: string | null; role: "editor" | "viewer"; status: "pending" | "active"; invitedAt: string; acceptedAt: string | null; expired: boolean };
type Overview = { kind: Kind; id: string; name: string; links: LinkView[]; copies: CopyView[]; collaborators: Collaborator[] };
type Edit = { id: string; action: string; label: string | null; at: string; user: { name: string; email: string } | null };

const EXPIRY = [null, 1, 7, 30, 90] as const;

/**
 * The owner's Share button for an app, a design or a game (docs/sharing.md):
 * "Share a copy" links (each person gets their own copy) and "Edit together"
 * (invite editors and viewers). An app made from a design or a game shares
 * that design or game; the dialog says so.
 */
export function ShareButton({ kind, id, name, className = "btn-ghost", compact = false }: { kind: Kind; id: string; name: string; className?: string; compact?: boolean }) {
  const t = useTranslations("sharing");
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className} onClick={() => setOpen(true)} data-help={t("button.help")} data-testid="share-button" aria-haspopup="dialog">
      <Share2 size={14} aria-hidden /><span className={compact ? "hidden sm:inline" : ""}>{t("button.label")}</span>
    </button>
    {open && <ShareDialog kind={kind} id={id} name={name} onClose={() => setOpen(false)} />}
  </>;
}

export function ShareDialog({ kind, id, name, onClose, initialTab = "copy" }: { kind: Kind; id: string; name: string; onClose: () => void; initialTab?: "copy" | "together" }) {
  const t = useTranslations("sharing");
  const [tab, setTab] = useState<"copy" | "together">(initialTab);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/share?kind=${kind}&id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) { setError(body?.error ?? t("dialog.loadFailed")); return; }
      setError(null);
      setData(body as Overview);
    } catch {
      setError(t("dialog.networkError"));
    }
  }, [kind, id, t]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { closeRef.current?.focus(); }, [mounted]);

  if (!mounted) return null;
  const shownKind = data?.kind ?? kind;
  const shownName = data?.name ?? name;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" data-testid="share-dialog"
        className="card relative my-auto w-full max-w-2xl p-5 text-start shadow-2xl sm:p-6 [[data-theme=light]_&]:bg-surface-900"
        onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="share-dialog-title" className="min-w-0 text-lg font-semibold"><span className="block truncate" dir="auto">{t("dialog.title", { name: shownName })}</span></h2>
          <button ref={closeRef} type="button" className="studio-icon-button shrink-0" onClick={onClose} aria-label={t("dialog.close")}><X size={16} /></button>
        </div>
        {data && data.kind !== kind && <p className="mt-2 text-xs text-surface-400" data-testid="share-resolved">{data.kind === "game" ? t("dialog.asGame") : t("dialog.asDesign")}</p>}
        <div className="studio-segmented mt-4" role="tablist" aria-label={t("button.label")}>
          <button type="button" role="tab" aria-selected={tab === "copy"} className={tab === "copy" ? "active" : ""} onClick={() => setTab("copy")} data-help={t("dialog.tabCopyHelp")} data-testid="share-tab-copy"><Link2 size={14} aria-hidden className="me-1.5 inline" />{t("dialog.tabCopy")}</button>
          <button type="button" role="tab" aria-selected={tab === "together"} className={tab === "together" ? "active" : ""} onClick={() => setTab("together")} data-help={t("dialog.tabTogetherHelp")} data-testid="share-tab-together"><Users size={14} aria-hidden className="me-1.5 inline" />{t("dialog.tabTogether")}</button>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        {!data && !error && <p className="mt-6 text-sm text-surface-400">{t("dialog.loading")}</p>}
        {data && tab === "copy" && <CopyTab data={data} kind={shownKind} reload={load} />}
        {data && tab === "together" && <TogetherTab data={data} kind={shownKind} reload={load} />}
      </div>
    </div>,
    document.body,
  );
}

function CopyTab({ data, kind, reload }: { data: Overview; kind: Kind; reload: () => Promise<void> }) {
  const t = useTranslations("sharing");
  const format = useFormatter();
  const [includeData, setIncludeData] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: data.kind, id: data.id, includeData, expiresInDays: days }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error ?? t("dialog.loadFailed")); return; }
      await reload();
      if (body.link?.url) void copy(body.link.id, body.link.url);
    } catch {
      setError(t("dialog.networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function copy(linkId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(linkId);
      setTimeout(() => setCopied((c) => (c === linkId ? null : c)), 2000);
    } catch {
      /* the field is there to copy by hand */
    }
  }

  async function revoke(linkId: string) {
    if (!window.confirm(t("copy.revokeConfirm"))) return;
    const res = await fetch(`/api/share/links/${linkId}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { setError(t("dialog.networkError")); return; }
    await reload();
  }

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });
  return <div className="mt-4 space-y-5">
    <p className="text-sm leading-relaxed text-surface-300">{t("copy.intro")}</p>
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {kind === "app" && <label className="flex flex-1 items-start gap-2 text-sm sm:min-w-[260px]">
          <input type="checkbox" className="mt-1" checked={includeData} onChange={(e) => setIncludeData(e.target.checked)} data-help={t("copy.includeDataHelp")} data-testid="share-include-data" />
          <span><span className="font-medium">{t("copy.includeData")}</span><span className="mt-0.5 block text-xs text-surface-400">{t("copy.includeDataHint")}</span></span>
        </label>}
        <label className="block text-sm">
          <span className="label">{t("copy.expiry")}</span>
          <select className="input mt-1 w-full sm:w-44" value={days ?? ""} onChange={(e) => setDays(e.target.value ? Number(e.target.value) : null)} data-help={t("copy.expiryHelp")} data-testid="share-expiry">
            {EXPIRY.map((d) => <option key={d ?? "never"} value={d ?? ""}>{d === null ? t("copy.expiryNever") : t("copy.expiryDays", { count: d })}</option>)}
          </select>
        </label>
        <button type="button" className="btn-primary justify-center" onClick={() => void create()} disabled={busy} data-help={t("copy.createHelp")} data-testid="share-create-link"><Link2 size={15} aria-hidden />{busy ? t("copy.creating") : t("copy.create")}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    </div>

    <section aria-labelledby="share-links-heading">
      <h3 id="share-links-heading" className="text-sm font-semibold">{t("copy.links")}</h3>
      {data.links.length === 0 ? <p className="mt-2 text-sm text-surface-400">{t("copy.noLinks")}</p> : <ul className="mt-2 space-y-2" data-testid="share-links">{data.links.map((l) => (
        <li key={l.id} className={`rounded-lg border border-white/[0.08] p-3 ${l.active ? "" : "opacity-60"}`} data-testid="share-link-row">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input className="input min-w-0 flex-1 font-mono text-xs" dir="ltr" readOnly value={l.url} aria-label={t("copy.linkLabel")} onFocus={(e) => e.currentTarget.select()} />
            {l.active && <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-ghost" onClick={() => void copy(l.id, l.url)} data-help={t("copy.copyLinkHelp")}>{copied === l.id ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied === l.id ? t("copy.copied") : t("copy.copyLink")}</button>
              <button type="button" className="btn-ghost" onClick={() => void revoke(l.id)} data-help={t("copy.revokeHelp")} data-testid="share-revoke"><X size={14} aria-hidden />{t("copy.revoke")}</button>
            </div>}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-400">
            <span className={l.active ? "text-emerald-300" : ""}>{l.revokedAt ? t("copy.revoked") : l.active ? t("copy.active") : t("copy.expired")}</span>
            {l.active && l.expiresAt && <span>{t("copy.endsOn", { date: date(l.expiresAt) })}</span>}
            {l.includeData && <span>{t("copy.withData")}</span>}
            <span>{t("copy.copiesMade", { count: l.copies })}</span>
          </p>
        </li>))}</ul>}
    </section>

    <CopyContents kind={kind} includeData={includeData} />

    <section aria-labelledby="share-copies-heading">
      <h3 id="share-copies-heading" className="text-sm font-semibold">{t("copy.copiesTitle", { count: data.copies.length })}</h3>
      {data.copies.length === 0 ? <p className="mt-2 text-sm text-surface-400">{t("copy.noCopies")}</p> : <ul className="mt-2 divide-y divide-white/[0.06] text-sm" data-testid="share-copies">{data.copies.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate" dir="auto">{c.user ? c.user.name : t("copy.someone")}{c.user && c.user.name !== c.user.email && <span className="ms-2 text-xs text-surface-400" dir="ltr">{c.user.email}</span>}</span><span className="shrink-0 text-xs text-surface-400">{date(c.at)}</span></li>))}</ul>}
    </section>
  </div>;
}

function TogetherTab({ data, kind, reload }: { data: Overview; kind: Kind; reload: () => Promise<void> }) {
  const t = useTranslations("sharing");
  const format = useFormatter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; link?: string } | null>(null);
  const [edits, setEdits] = useState<Edit[] | null>(null);
  // relativeTime needs a "now"; taken when the list loads.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    fetch(`/api/share/edits?kind=${data.kind}&id=${encodeURIComponent(data.id)}&take=20`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (alive) { setNow(new Date()); setEdits(b?.edits ?? []); } })
      .catch(() => { if (alive) setEdits([]); });
    return () => { alive = false; };
  }, [data.kind, data.id, data.collaborators.length]);

  async function invite(target = email, as = role) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/share/collaborators", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: data.kind, id: data.id, email: target, role: as }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error ?? t("dialog.loadFailed")); return; }
      const shown = body.collaborator?.email ?? target;
      if (body.collaborator?.status === "active") setNotice({ text: t("together.updated", { email: shown, role: as }) });
      else if (body.emailed) setNotice({ text: t("together.sent", { email: shown }) });
      else setNotice({ text: t("together.notSent", { email: shown }), link: body.link ?? undefined });
      setEmail("");
      await reload();
    } catch {
      setError(t("dialog.networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(c: Collaborator, next: "editor" | "viewer") {
    const res = await fetch(`/api/share/collaborators/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: next }) }).catch(() => null);
    if (!res?.ok) { setError(t("dialog.networkError")); return; }
    await reload();
  }

  async function remove(c: Collaborator) {
    if (!window.confirm(t("together.removeConfirm", { email: c.email }))) return;
    const res = await fetch(`/api/share/collaborators/${c.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { setError(t("dialog.networkError")); return; }
    await reload();
  }

  const knownActions = new Set(["page.save", "page.create", "page.delete", "page.translate", "flow.save", "flow.create", "flow.delete", "theme.save", "app.rename", "data.change", "modules.install", "game.version", "design.version", "collaborator.invite", "collaborator.remove", "collaborator.role", "collaborator.join"]);
  return <div className="mt-4 space-y-5">
    <p className="text-sm leading-relaxed text-surface-300">{t("together.intro")}</p>
    <form className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4" onSubmit={(e) => { e.preventDefault(); if (email.trim()) void invite(); }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 text-sm"><span className="label">{t("together.email")}</span>
          <input className="input mt-1 w-full" type="email" inputMode="email" autoComplete="off" dir="ltr" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("together.emailPlaceholder")} data-help={t("together.emailHelp")} data-testid="share-invite-email" />
        </label>
        <label className="block text-sm"><span className="label">{t("together.role")}</span>
          <select className="input mt-1 w-full sm:w-36" value={role} onChange={(e) => setRole(e.target.value === "viewer" ? "viewer" : "editor")} data-help={t("together.roleHelp")} data-testid="share-invite-role">
            <option value="editor">{t("together.editor")}</option>
            <option value="viewer">{t("together.viewer")}</option>
          </select>
        </label>
        <button type="submit" className="btn-primary justify-center" disabled={busy || !email.trim()} data-help={t("together.inviteHelp")} data-testid="share-invite"><UserPlus size={15} aria-hidden />{busy ? t("together.inviting") : t("together.invite")}</button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-surface-400">{role === "viewer" ? t("together.viewerHint") : t("together.editorHint")}</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      {notice && <div role="status" className="mt-3 text-sm text-emerald-200" data-testid="share-invite-notice"><p>{notice.text}</p>{notice.link && <input className="input mt-2 w-full font-mono text-xs" dir="ltr" readOnly value={notice.link} onFocus={(e) => e.currentTarget.select()} data-testid="share-invite-link" />}</div>}
    </form>

    <section aria-labelledby="share-people-heading">
      <h3 id="share-people-heading" className="text-sm font-semibold">{t("together.people")}</h3>
      {data.collaborators.length === 0 ? <p className="mt-2 text-sm text-surface-400">{t("together.noPeople")}</p> : <ul className="mt-2 divide-y divide-white/[0.06]" data-testid="share-people">{data.collaborators.map((c) => (
        <li key={c.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center" data-testid="share-person">
          <div className="min-w-0 flex-1"><p className="truncate text-sm" dir="auto">{c.name ?? c.email}</p><p className="text-xs text-surface-400"><span dir="ltr">{c.name ? c.email : ""}</span>{c.name ? " · " : ""}{c.status === "active" ? t("together.joined") : c.expired ? t("together.expiredInvite") : t("together.pending")}</p></div>
          <div className="flex shrink-0 items-center gap-2">
            <select className="input py-1 text-xs" value={c.role} aria-label={t("together.role")} onChange={(e) => void changeRole(c, e.target.value === "viewer" ? "viewer" : "editor")} data-help={t("together.roleChangeHelp")}>
              <option value="editor">{t("together.editor")}</option>
              <option value="viewer">{t("together.viewer")}</option>
            </select>
            {c.status === "pending" && <button type="button" className="btn-ghost text-xs" onClick={() => void invite(c.email, c.role)} data-help={t("together.resendHelp")}>{t("together.resend")}</button>}
            <button type="button" className="studio-icon-button" onClick={() => void remove(c)} aria-label={t("together.removeNamed", { email: c.email })} title={t("together.remove")} data-help={t("together.removeHelp")} data-testid="share-remove"><Trash2 size={14} /></button>
          </div>
        </li>))}</ul>}
    </section>

    <section aria-labelledby="share-activity-heading">
      <h3 id="share-activity-heading" className="text-sm font-semibold" data-help={t("together.activityHelp")}>{t("together.activity")}</h3>
      {edits === null ? <p className="mt-2 text-sm text-surface-400">{t("dialog.loading")}</p> : edits.length === 0 ? <p className="mt-2 text-sm text-surface-400">{t("together.noActivity")}</p> : <ul className="mt-2 space-y-1.5 text-sm" data-testid="share-activity">{edits.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-3"><span className="min-w-0" dir="auto">{t(knownActions.has(e.action) ? `together.actions.${e.action.replace(".", "_")}` : "together.actions.other", { who: e.user?.name ?? t("together.unknownPerson"), label: e.label ?? "" })}</span><span className="shrink-0 text-xs text-surface-400">{format.relativeTime(new Date(e.at), now)}</span></li>))}</ul>}
    </section>
    <p className="sr-only">{kind}</p>
  </div>;
}
