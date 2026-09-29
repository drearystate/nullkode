"use client";
import { useState } from "react";
import { Copy, ExternalLink, Pause, Play, Trash2 } from "lucide-react";

type Row = {
  id: string; name: string; ownerId: string; ownerEmail: string; ownerInvited: boolean; status: "ACTIVE" | "SUSPENDED";
  clients: number; apps: number; maxClients: number | null; maxApps: number | null; ai: number; maxAiActions: number | null; domain: string | null; domainVerified: boolean;
};

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { code: data.code as string | undefined });
  return data;
}

const quota = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Math.floor(Number(v))));

export function ResellersManager({ resellers: initial, emailOn }: { resellers: Row[]; emailOn: boolean }) {
  const [rows, setRows] = useState(initial);
  const [form, setForm] = useState({ name: "", ownerEmail: "", ownerName: "", maxClients: "", maxApps: "", maxAiActions: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string; link?: string } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setNotice(null);
    try {
      const data = await call("/api/admin/resellers", "POST", {
        name: form.name, ownerEmail: form.ownerEmail, ownerName: form.ownerName || undefined,
        maxClients: quota(form.maxClients), maxApps: quota(form.maxApps), maxAiActions: quota(form.maxAiActions),
      });
      setRows((r) => [{ id: data.reseller.id, name: data.reseller.name, ownerId: data.reseller.ownerId, ownerEmail: form.ownerEmail.toLowerCase(), ownerInvited: Boolean(data.invite), status: "ACTIVE", clients: 0, apps: 0, maxClients: quota(form.maxClients), maxApps: quota(form.maxApps), ai: 0, maxAiActions: quota(form.maxAiActions), domain: null, domainVerified: false }, ...r]);
      setForm({ name: "", ownerEmail: "", ownerName: "", maxClients: "", maxApps: "", maxAiActions: "" });
      setNotice(data.invite
        ? { ok: true, text: data.invite.emailed ? `Reseller created and invitation emailed. Link:` : `Reseller created. Send them this link to set their password:`, link: data.invite.link }
        : { ok: true, text: "Reseller created. They can sign in with their existing password and will see the Reseller dashboard." });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Couldn't create the reseller." });
    } finally {
      setBusy(null);
    }
  }

  async function patch(row: Row, change: Partial<{ maxClients: number | null; maxApps: number | null; maxAiActions: number | null; status: "ACTIVE" | "SUSPENDED" }>) {
    setBusy(row.id);
    try {
      const data = await call(`/api/admin/resellers/${row.id}`, "PATCH", change);
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: data.reseller.status, maxClients: data.reseller.maxClients, maxApps: data.reseller.maxApps, maxAiActions: data.reseller.maxAiActions } : r)));
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Couldn't save." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: Row) {
    const typed = prompt(`Delete reseller "${row.name}"? Their ${row.clients} client(s) keep their accounts and apps and become your direct customers (on the free plan). Type the reseller name to confirm:`);
    if (typed === null) return;
    setBusy(row.id);
    try {
      try {
        await call(`/api/admin/resellers/${row.id}`, "DELETE", { confirmName: typed });
      } catch (err) {
        // A client's subscription couldn't be cancelled on the reseller's
        // Stripe account (for example, its key no longer works).
        if ((err as { code?: string }).code !== "billing") throw err;
        const handled = confirm(`${(err as Error).message}\n\nIf you've cancelled their subscriptions in the reseller's Stripe dashboard yourself, press OK to delete the reseller anyway.`);
        if (!handled) return;
        await call(`/api/admin/resellers/${row.id}`, "DELETE", { confirmName: typed, billingHandled: true });
      }
      setRows((rs) => rs.filter((r) => r.id !== row.id));
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Couldn't delete." });
    } finally {
      setBusy(null);
    }
  }

  async function signInAs(row: Row) {
    setBusy(row.id);
    const res = await fetch("/api/admin/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: row.ownerId }) });
    if (res.ok) window.location.href = "/reseller";
    else { setBusy(null); setNotice({ ok: false, text: "Couldn't sign in as this reseller." }); }
  }

  async function link(row: Row) {
    setBusy(row.id);
    try {
      const data = await call(`/api/admin/users/${row.ownerId}/link`, "POST", { purpose: row.ownerInvited ? "invite" : "reset" });
      setNotice({ ok: true, text: `${row.ownerInvited ? "Invitation" : "Password reset"} link for ${row.ownerEmail}${data.emailed ? " (also emailed)" : ""}:`, link: data.link });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Couldn't create a link." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={create} className="card p-6">
        <h2 className="font-semibold">Add a reseller</h2>
        <p className="mt-1 text-sm text-surface-400">{emailOn ? "New resellers get an invitation email." : "You'll get an invitation link to send them."} Leave a quota empty for unlimited.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <label className="block text-sm md:col-span-2" data-help="The reseller's business name. Their clients see it instead of yours; the reseller can change it later in their dashboard."><span className="label">Brand name</span><input className="input w-full" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bright Apps Agency" /></label>
          <label className="block text-sm md:col-span-4" data-help="The reseller signs in with this. A new address gets an invitation; if it already has an account here, that account becomes a reseller."><span className="label">Reseller's email</span><input className="input w-full" type="email" required value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} placeholder="owner@agency.com" /></label>
          <label className="block text-sm md:col-span-2"><span className="label">Their name (optional)</span><input className="input w-full" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></label>
          <label className="block text-sm" data-help="How many client accounts this reseller can have. Leave it empty for unlimited. You can change it later in the list below."><span className="label">Max clients</span><input className="input w-full" type="number" min={0} placeholder="∞" value={form.maxClients} onChange={(e) => setForm({ ...form, maxClients: e.target.value })} /></label>
          <label className="block text-sm" data-help="How many apps the reseller and all their clients can have in total. Leave it empty for unlimited."><span className="label">Max apps</span><input className="input w-full" type="number" min={0} placeholder="∞" value={form.maxApps} onChange={(e) => setForm({ ...form, maxApps: e.target.value })} /></label>
          <label className="block text-sm" data-help="AI uses shared by the reseller and all their clients each month. When they run out, AI pauses for all of them until next month. Leave it empty for unlimited."><span className="label">AI actions / month</span><input className="input w-full" type="number" min={0} placeholder="∞" value={form.maxAiActions} onChange={(e) => setForm({ ...form, maxAiActions: e.target.value })} /></label>
          <div className="flex items-end"><button className="btn-primary w-full justify-center" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create reseller"}</button></div>
        </div>
      </form>

      {notice && (
        <div role={notice.ok ? "status" : "alert"} className={`rounded-xl border p-4 text-sm ${notice.ok ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-50" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>
          <p>{notice.text}</p>
          {notice.link && <CopyLink link={notice.link} />}
        </div>
      )}

      <section className="card overflow-hidden" aria-label="Resellers">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">No resellers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-surface-400">
                <tr><th className="px-4 py-3 font-medium">Reseller</th><th className="px-4 py-3 font-medium">Clients</th><th className="px-4 py-3 font-medium">Apps</th><th className="px-4 py-3 font-medium" data-help="AI actions used this month by the reseller and all their clients together, out of their monthly limit. Click a number to change the limit.">AI this month</th><th className="px-4 py-3 font-medium" data-help="The reseller's own web address, where their clients sign in. “Not verified” means they haven't finished the setting at their domain company yet.">Domain</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className={busy === r.id ? "opacity-60" : ""}>
                    <td className="px-4 py-3"><span className="block font-medium">{r.name}</span><span className="block text-xs text-surface-400">{r.ownerEmail}{r.ownerInvited ? " · invitation pending" : ""}</span></td>
                    <td className="px-4 py-3"><QuotaCell used={r.clients} max={r.maxClients} label={`Max clients for ${r.name}`} onSave={(v) => patch(r, { maxClients: v })} /></td>
                    <td className="px-4 py-3"><QuotaCell used={r.apps} max={r.maxApps} label={`Max apps for ${r.name}`} onSave={(v) => patch(r, { maxApps: v })} /></td>
                    <td className="px-4 py-3"><QuotaCell used={r.ai} max={r.maxAiActions} label={`Monthly AI actions for ${r.name}`} onSave={(v) => patch(r, { maxAiActions: v })} /></td>
                    <td className="px-4 py-3 text-xs">{r.domain ? <span className={r.domainVerified ? "text-emerald-300" : "text-amber-200"}>{r.domain}{r.domainVerified ? "" : " (not verified)"}</span> : <span className="text-surface-400">—</span>}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "ACTIVE" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>{r.status === "ACTIVE" ? "Active" : "Suspended"}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {r.ownerId && <Btn label="Sign in as this reseller" help="Opens the reseller dashboard as this reseller, to help them or check their setup. Anything you change happens in their account." onClick={() => signInAs(r)} disabled={busy === r.id}><ExternalLink size={15} /></Btn>}
                        {r.ownerId && <Btn label={r.ownerInvited ? "Invitation link" : "Password reset link"} help={r.ownerInvited ? "Makes a new invitation link for them to set their password, valid once for 7 days. It's also emailed if email is on." : "Makes a link for them to choose a new password, valid once for 2 hours. It's also emailed if email is on."} onClick={() => link(r)} disabled={busy === r.id}><Copy size={15} /></Btn>}
                        <Btn label={r.status === "ACTIVE" ? "Suspend (signs out the reseller and all its clients)" : "Reactivate"} help={r.status === "ACTIVE" ? "Signs the reseller and all their clients out at once, and stops them signing in until you reactivate. Nothing is deleted." : "Lets the reseller and all their clients sign in again."} onClick={() => patch(r, { status: r.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })} disabled={busy === r.id}>{r.status === "ACTIVE" ? <Pause size={15} /> : <Play size={15} />}</Btn>
                        <Btn label="Delete reseller" help="Removes this reseller. Their clients keep their accounts and apps but become your direct customers on the Free plan; the reseller becomes a normal user. Can't be undone." onClick={() => remove(r)} disabled={busy === r.id} danger><Trash2 size={15} /></Btn>
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
  if (!editing) {
    return <button type="button" className="tabular-nums hover:underline" title="Change limit" data-help="Used so far, out of the limit. Click to change the limit; leave it empty for unlimited." onClick={() => setEditing(true)}>{used} / {max === null ? "∞" : max}</button>;
  }
  return (
    <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); onSave(quota(value)); setEditing(false); }}>
      <span className="tabular-nums text-surface-400">{used} /</span>
      <input autoFocus className="input w-20 py-1" type="number" min={0} placeholder="∞" aria-label={label} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn-ghost px-2 py-1 text-xs">Save</button>
    </form>
  );
}

function Btn({ label, help, onClick, disabled, danger, children }: { label: string; help?: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} data-help={help} onClick={onClick} disabled={disabled} className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40 ${danger ? "text-red-300 hover:bg-red-400/10" : "text-surface-300 hover:bg-white/10 hover:text-surface-50"}`}>{children}</button>;
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono text-xs" aria-label="Link" />
      <button type="button" className="btn-ghost shrink-0" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>
    </div>
  );
}
