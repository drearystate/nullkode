"use client";
import { useState } from "react";
import { Copy, ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

type Row = {
  id: string; name: string; ownerId: string; ownerEmail: string; ownerInvited: boolean; status: "ACTIVE" | "SUSPENDED";
  clients: number; apps: number; maxClients: number | null; maxApps: number | null; ai: number; maxAiActions: number | null; domain: string | null; domainVerified: boolean;
};

async function call(url: string, method: string, body?: unknown, fallback = "Something went wrong.") {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || fallback), { code: data.code as string | undefined });
  return data;
}

const quota = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Math.floor(Number(v))));

export function ResellersManager({ resellers: initial, emailOn }: { resellers: Row[]; emailOn: boolean }) {
  const [rows, setRows] = useState(initial);
  const [form, setForm] = useState({ name: "", ownerEmail: "", ownerName: "", maxClients: "", maxApps: "", maxAiActions: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string; link?: string } | null>(null);
  const t = useTranslations("admin.resellers");
  const tc = useTranslations("common");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setNotice(null);
    try {
      const data = await call("/api/admin/resellers", "POST", {
        name: form.name, ownerEmail: form.ownerEmail, ownerName: form.ownerName || undefined,
        maxClients: quota(form.maxClients), maxApps: quota(form.maxApps), maxAiActions: quota(form.maxAiActions),
      }, tc("tryAgain"));
      setRows((r) => [{ id: data.reseller.id, name: data.reseller.name, ownerId: data.reseller.ownerId, ownerEmail: form.ownerEmail.toLowerCase(), ownerInvited: Boolean(data.invite), status: "ACTIVE", clients: 0, apps: 0, maxClients: quota(form.maxClients), maxApps: quota(form.maxApps), ai: 0, maxAiActions: quota(form.maxAiActions), domain: null, domainVerified: false }, ...r]);
      setForm({ name: "", ownerEmail: "", ownerName: "", maxClients: "", maxApps: "", maxAiActions: "" });
      setNotice(data.invite
        ? { ok: true, text: data.invite.emailed ? t("createdEmailed") : t("createdLink"), link: data.invite.link }
        : { ok: true, text: t("createdExisting") });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : t("createFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function patch(row: Row, change: Partial<{ maxClients: number | null; maxApps: number | null; maxAiActions: number | null; status: "ACTIVE" | "SUSPENDED" }>) {
    setBusy(row.id);
    try {
      const data = await call(`/api/admin/resellers/${row.id}`, "PATCH", change, tc("tryAgain"));
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: data.reseller.status, maxClients: data.reseller.maxClients, maxApps: data.reseller.maxApps, maxAiActions: data.reseller.maxAiActions } : r)));
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : t("saveFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: Row) {
    const typed = prompt(row.clients === 1 ? t("deletePromptOne", { name: row.name }) : t("deletePromptMany", { name: row.name, count: row.clients }));
    if (typed === null) return;
    setBusy(row.id);
    try {
      try {
        await call(`/api/admin/resellers/${row.id}`, "DELETE", { confirmName: typed }, tc("tryAgain"));
      } catch (err) {
        // A client's subscription couldn't be cancelled on the reseller's
        // Stripe account (for example, its key no longer works).
        if ((err as { code?: string }).code !== "billing") throw err;
        const handled = confirm(t("billingConfirm", { error: (err as Error).message }));
        if (!handled) return;
        await call(`/api/admin/resellers/${row.id}`, "DELETE", { confirmName: typed, billingHandled: true }, tc("tryAgain"));
      }
      setRows((rs) => rs.filter((r) => r.id !== row.id));
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : t("deleteFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function signInAs(row: Row) {
    setBusy(row.id);
    const res = await fetch("/api/admin/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: row.ownerId }) });
    if (res.ok) window.location.href = "/reseller";
    else { setBusy(null); setNotice({ ok: false, text: t("signInFailed") }); }
  }

  async function link(row: Row) {
    setBusy(row.id);
    try {
      const data = await call(`/api/admin/users/${row.ownerId}/link`, "POST", { purpose: row.ownerInvited ? "invite" : "reset" }, tc("tryAgain"));
      setNotice({ ok: true, text: t(row.ownerInvited ? (data.emailed ? "inviteLinkForEmailed" : "inviteLinkFor") : data.emailed ? "resetLinkForEmailed" : "resetLinkFor", { email: row.ownerEmail }), link: data.link });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : t("linkFailed") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={create} className="card p-6">
        <h2 className="font-semibold">{t("addTitle")}</h2>
        <p className="mt-1 text-sm text-surface-400">{emailOn ? t("addBodyEmail") : t("addBodyLink")}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <label className="block text-sm md:col-span-2" data-help={t("brandNameHelp")}><span className="label">{t("brandName")}</span><input className="input w-full" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bright Apps Agency" /></label>
          <label className="block text-sm md:col-span-4" data-help={t("emailHelp")}><span className="label">{t("email")}</span><input className="input w-full" type="email" required value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} placeholder="owner@agency.com" /></label>
          <label className="block text-sm md:col-span-2"><span className="label">{t("ownerName")}</span><input className="input w-full" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></label>
          <label className="block text-sm" data-help={t("maxClientsHelp")}><span className="label">{t("maxClients")}</span><input className="input w-full" type="number" min={0} placeholder="∞" value={form.maxClients} onChange={(e) => setForm({ ...form, maxClients: e.target.value })} /></label>
          <label className="block text-sm" data-help={t("maxAppsHelp")}><span className="label">{t("maxApps")}</span><input className="input w-full" type="number" min={0} placeholder="∞" value={form.maxApps} onChange={(e) => setForm({ ...form, maxApps: e.target.value })} /></label>
          <label className="block text-sm" data-help={t("maxAiHelp")}><span className="label">{t("maxAi")}</span><input className="input w-full" type="number" min={0} placeholder="∞" value={form.maxAiActions} onChange={(e) => setForm({ ...form, maxAiActions: e.target.value })} /></label>
          <div className="flex items-end"><button className="btn-primary w-full justify-center" disabled={busy === "create"}>{busy === "create" ? t("creating") : t("create")}</button></div>
        </div>
      </form>

      {notice && (
        <div role={notice.ok ? "status" : "alert"} className={`rounded-xl border p-4 text-sm ${notice.ok ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-50" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>
          <p>{notice.text}</p>
          {notice.link && <CopyLink link={notice.link} />}
        </div>
      )}

      <section className="card overflow-hidden" aria-label={t("title")}>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">{t("none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs uppercase tracking-wider text-surface-400">
                <tr><th className="px-4 py-3 text-start font-medium">{t("colReseller")}</th><th className="px-4 py-3 text-start font-medium">{t("colClients")}</th><th className="px-4 py-3 text-start font-medium">{t("colApps")}</th><th className="px-4 py-3 text-start font-medium" data-help={t("colAiHelp")}>{t("colAi")}</th><th className="px-4 py-3 text-start font-medium" data-help={t("colDomainHelp")}>{t("colDomain")}</th><th className="px-4 py-3 text-start font-medium">{t("colStatus")}</th><th className="px-4 py-3 text-end font-medium">{t("colActions")}</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className={busy === r.id ? "opacity-60" : ""}>
                    <td className="px-4 py-3"><span className="block font-medium">{r.name}</span><span className="block text-xs text-surface-400">{r.ownerInvited ? t("invitePending", { email: r.ownerEmail }) : r.ownerEmail}</span></td>
                    <td className="px-4 py-3"><QuotaCell used={r.clients} max={r.maxClients} label={t("maxClientsFor", { name: r.name })} onSave={(v) => patch(r, { maxClients: v })} /></td>
                    <td className="px-4 py-3"><QuotaCell used={r.apps} max={r.maxApps} label={t("maxAppsFor", { name: r.name })} onSave={(v) => patch(r, { maxApps: v })} /></td>
                    <td className="px-4 py-3"><QuotaCell used={r.ai} max={r.maxAiActions} label={t("maxAiFor", { name: r.name })} onSave={(v) => patch(r, { maxAiActions: v })} /></td>
                    <td className="px-4 py-3 text-xs">{r.domain ? <span className={r.domainVerified ? "text-emerald-300" : "text-amber-200"}><span dir="ltr">{r.domain}</span>{r.domainVerified ? "" : ` ${t("notVerified")}`}</span> : <span className="text-surface-400">—</span>}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "ACTIVE" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>{r.status === "ACTIVE" ? t("active") : t("suspended")}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {r.ownerId && <Btn label={t("signInAs")} help={t("signInAsHelp")} onClick={() => signInAs(r)} disabled={busy === r.id}><ExternalLink size={15} /></Btn>}
                        {r.ownerId && <Btn label={r.ownerInvited ? t("inviteLink") : t("resetLink")} help={r.ownerInvited ? t("inviteLinkHelp") : t("resetLinkHelp")} onClick={() => link(r)} disabled={busy === r.id}><Copy size={15} /></Btn>}
                        <Btn label={r.status === "ACTIVE" ? t("suspend") : t("reactivate")} help={r.status === "ACTIVE" ? t("suspendHelp") : t("reactivateHelp")} onClick={() => patch(r, { status: r.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })} disabled={busy === r.id}>{r.status === "ACTIVE" ? <Pause size={15} /> : <Play size={15} />}</Btn>
                        <Btn label={t("delete")} help={t("deleteHelp")} onClick={() => remove(r)} disabled={busy === r.id} danger><Trash2 size={15} /></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function QuotaCell({ used, max, label, onSave }: { used: number; max: number | null; label: string; onSave: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(max === null ? "" : String(max));
  const t = useTranslations("admin.resellers");
  const tc = useTranslations("common");
  if (!editing) {
    return <button type="button" className="tabular-nums hover:underline" title={t("changeLimit")} data-help={t("changeLimitHelp")} onClick={() => setEditing(true)}>{used} / {max === null ? "∞" : max}</button>;
  }
  return (
    <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); onSave(quota(value)); setEditing(false); }}>
      <span className="tabular-nums text-surface-400">{used} /</span>
      <input autoFocus className="input w-20 py-1" type="number" min={0} placeholder="∞" aria-label={label} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn-ghost px-2 py-1 text-xs">{tc("save")}</button>
    </form>
  );
}

function Btn({ label, help, onClick, disabled, danger, children }: { label: string; help?: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} data-help={help} onClick={onClick} disabled={disabled} className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40 ${danger ? "text-red-300 hover:bg-red-400/10" : "text-surface-300 hover:bg-white/10 hover:text-surface-50"}`}>{children}</button>;
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("admin.resellers");
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono text-xs" dir="ltr" aria-label={t("link")} />
      <button type="button" className="btn-ghost shrink-0" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} /> {copied ? t("copied") : t("copy")}</button>
    </div>
  );
}
