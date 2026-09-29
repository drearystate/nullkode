"use client";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, KeyRound, Search, Trash2, UserPlus, UserX, UserCheck } from "lucide-react";

type Client = {
  id: string; name: string | null; email: string; plan: string; paying: boolean;
  invited: boolean; suspended: boolean; apps: number; createdAt: string;
};

const PLANS = ["FREE", "STARTER", "PRO", "TEAM"] as const;
const planName = (p: string) => p[0] + p.slice(1).toLowerCase();

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export function ClientsManager({ clients: initial, emailOn, atLimit }: { clients: Client[]; emailOn: boolean; atLimit: boolean }) {
  const [clients, setClients] = useState(initial);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<string>("FREE");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string; link?: string } | null>(null);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => clients.filter((c) => `${c.name ?? ""} ${c.email}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy("invite");
    setNotice(null);
    try {
      const data = await call("/api/reseller/clients", "POST", { email, name: name || undefined, plan });
      setClients((cs) => [{ id: data.client.id, name: data.client.name, email: data.client.email, plan: data.client.plan, paying: false, invited: true, suspended: false, apps: 0, createdAt: new Date().toISOString() }, ...cs]);
      setEmail(""); setName(""); setPlan("FREE");
      setNotice({ kind: "ok", text: data.emailed ? `Invitation emailed to ${data.client.email}. You can also share this link:` : `Send ${data.client.email} this link to set their password (it works once, for 7 days):`, link: data.link });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Couldn't add the client." });
    } finally {
      setBusy(null);
    }
  }

  async function update(c: Client, patch: Partial<{ plan: string; suspended: boolean }>) {
    setBusy(c.id);
    setNotice(null);
    try {
      const data = await call(`/api/reseller/clients/${c.id}`, "PATCH", patch);
      setClients((cs) => cs.map((x) => (x.id === c.id ? { ...x, plan: data.client.plan, suspended: data.client.suspended } : x)));
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Couldn't save." });
    } finally {
      setBusy(null);
    }
  }

  async function link(c: Client) {
    setBusy(c.id);
    setNotice(null);
    try {
      const data = await call(`/api/reseller/clients/${c.id}/link`, "POST", { purpose: c.invited ? "invite" : "reset" });
      setNotice({ kind: "ok", text: `${c.invited ? "New invitation" : "Password reset"} link for ${c.email}${data.emailed ? " (also emailed)" : ""}:`, link: data.link });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Couldn't create a link." });
    } finally {
      setBusy(null);
    }
  }

  async function open(c: Client) {
    setBusy(c.id);
    try {
      await call(`/api/reseller/clients/${c.id}/impersonate`, "POST");
      window.location.href = "/dashboard";
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Couldn't open the workspace." });
      setBusy(null);
    }
  }

  async function remove(c: Client) {
    const typed = prompt(`This permanently deletes ${c.email} and all ${c.apps} of their apps. Type their email to confirm:`);
    if (typed === null) return;
    setBusy(c.id);
    try {
      await call(`/api/reseller/clients/${c.id}`, "DELETE", { confirmEmail: typed });
      setClients((cs) => cs.filter((x) => x.id !== c.id));
      setNotice({ kind: "ok", text: `${c.email} was deleted.` });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Couldn't delete the client." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="card p-6">
        <h2 className="flex items-center gap-2 font-semibold"><UserPlus size={17} /> Invite a client</h2>
        <p className="mt-1 text-sm text-surface-400">
          {emailOn ? "We'll email them a link to set their password." : "You'll get a link to send them (email isn't set up on this server)."}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_140px_auto]">
          <label className="block text-sm"><span className="label">Email</span><input className="input w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@business.com" disabled={atLimit} /></label>
          <label className="block text-sm"><span className="label">Name (optional)</span><input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" disabled={atLimit} /></label>
          <label className="block text-sm"><span className="label">Plan</span>
            <select className="input w-full" value={plan} onChange={(e) => setPlan(e.target.value)} disabled={atLimit}>{PLANS.map((p) => <option key={p} value={p}>{planName(p)}</option>)}</select>
          </label>
          <div className="flex items-end"><button className="btn-primary w-full justify-center" disabled={busy === "invite" || atLimit}>{busy === "invite" ? "Adding…" : "Send invite"}</button></div>
        </div>
        {atLimit && <p className="mt-3 text-sm text-amber-200">You've used all your client seats. Contact the platform operator to add more.</p>}
      </form>

      {notice && (
        <div role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${notice.kind === "error" ? "border-red-400/30 bg-red-400/10 text-red-100" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-50"}`}>
          <p>{notice.text}</p>
          {notice.link && <CopyLink link={notice.link} />}
        </div>
      )}

      <section className="card overflow-hidden" aria-label="Client list">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4">
          <h2 className="font-semibold">{clients.length} client{clients.length === 1 ? "" : "s"}</h2>
          {clients.length > 5 && <label className="studio-search"><Search size={14} /><input aria-label="Search clients" placeholder="Search clients…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>}
        </div>
        {clients.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">No clients yet. Invite one above — they'll appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-surface-400">
                <tr><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Apps</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((c) => (
                  <tr key={c.id} className={busy === c.id ? "opacity-60" : ""}>
                    <td className="px-4 py-3"><span className="block font-medium">{c.name || c.email}</span>{c.name && <span className="block text-xs text-surface-400">{c.email}</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${c.suspended ? "bg-red-400/10 text-red-300" : c.invited ? "bg-amber-400/10 text-amber-200" : "bg-emerald-400/10 text-emerald-300"}`}>
                        {c.suspended ? "Suspended" : c.invited ? "Invitation pending" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select aria-label={`Plan for ${c.email}`} className="input py-1" value={c.plan} disabled={busy === c.id} onChange={(e) => update(c, { plan: e.target.value })}>
                        {PLANS.map((p) => <option key={p} value={p}>{planName(p)}</option>)}
                      </select>
                      {c.paying && <span className="ml-2 text-xs text-surface-400">paying</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{c.apps}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton label="Open their workspace" onClick={() => open(c)} disabled={busy === c.id || c.suspended}><ExternalLink size={15} /></IconButton>
                        <IconButton label={c.invited ? "New invitation link" : "Password reset link"} onClick={() => link(c)} disabled={busy === c.id}><KeyRound size={15} /></IconButton>
                        <IconButton label={c.suspended ? "Restore access" : "Suspend"} onClick={() => update(c, { suspended: !c.suspended })} disabled={busy === c.id}>{c.suspended ? <UserCheck size={15} /> : <UserX size={15} />}</IconButton>
                        <IconButton label="Delete client" onClick={() => remove(c)} disabled={busy === c.id} danger><Trash2 size={15} /></IconButton>
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

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40 ${danger ? "text-red-300 hover:bg-red-400/10" : "text-surface-300 hover:bg-white/10 hover:text-surface-50"}`}>
      {children}
    </button>
  );
}

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono text-xs" aria-label="Link" />
      <button type="button" className="btn-ghost shrink-0" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
        <Copy size={14} /> {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
