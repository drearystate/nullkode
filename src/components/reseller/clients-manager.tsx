"use client";
import { useMemo, useState } from "react";
import { Copy, Download, ExternalLink, KeyRound, Search, Trash2, UserPlus, UserX, UserCheck, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  ATTENTION_ORDER,
  isPaying,
  type AttentionFlag,
  type ClientRow,
} from "@/lib/reseller-client-labels";

type Client = ClientRow;

const PLANS = ["FREE", "STARTER", "PRO", "TEAM"] as const;

type StatusFilter = "all" | "active" | "invited" | "suspended";
type PayFilter = "all" | "paying" | "past-due" | "not-paying";

type BulkResult = {
  email: string;
  status: "invited" | "skipped";
  reason?: string;
  link?: string;
  emailed?: boolean;
  client?: { id: string; email: string; name: string | null; plan: string };
};

async function call(url: string, method: string, body?: unknown, fallback = "Something went wrong. Please try again.") {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || fallback);
  return data;
}

function newClient(c: { id: string; email: string; name: string | null; plan: string }, now: number): Client {
  return {
    id: c.id, name: c.name, email: c.email, plan: c.plan, subscriptionStatus: "NONE", paying: false,
    invited: true, suspended: false, apps: 0, liveApps: 0, aiUsed: 0, aiLimit: null,
    createdAt: new Date(now).toISOString(), lastActiveAt: null, renewsAt: null, flags: ["never-signed-in"],
  };
}

export function ClientsManager({ clients: initial, emailOn, seatsLeft: initialSeats, now }: { clients: Client[]; emailOn: boolean; seatsLeft: number | null; now: number }) {
  const [clients, setClients] = useState(initial);
  const [seatsLeft, setSeatsLeft] = useState(initialSeats);
  const [bulkMode, setBulkMode] = useState(false);
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<string>("FREE");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string; link?: string } | null>(null);
  const [bulk, setBulk] = useState<{ invited: number; skipped: number; results: BulkResult[] } | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [pay, setPay] = useState<PayFilter>("all");
  const [attention, setAttention] = useState<AttentionFlag | null>(null);
  const t = useTranslations("reseller.clients");
  const tp = useTranslations("admin.plans");
  const tc = useTranslations("common");
  const format = useFormatter();
  const planLabel = (p: string) => ((PLANS as readonly string[]).includes(p) ? tp(p) : p);
  const statusLabel = (c: Client) => (c.suspended ? t("statusSuspended") : c.invited ? t("statusInvited") : t("statusActive"));
  /** "3 hours ago", "yesterday", "Sep 3, 2026": relative to `now` (from the server), so server and browser agree. */
  const whenLabel = (iso: string | null) => {
    if (!iso) return t("never");
    const ms = now - Date.parse(iso);
    if (ms < 2 * 60_000) return t("justNow");
    if (ms < 30 * 86_400_000) return format.relativeTime(new Date(iso), now);
    return format.dateTime(new Date(iso), { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  };

  const atLimit = seatsLeft !== null && seatsLeft <= 0;
  const pasted = useMemo(() => emails.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean), [emails]);

  const counts = useMemo(() => {
    const out = {} as Record<AttentionFlag, number>;
    for (const f of ATTENTION_ORDER) out[f] = clients.filter((c) => c.flags.includes(f)).length;
    return out;
  }, [clients]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (q && !`${c.name ?? ""} ${c.email}`.toLowerCase().includes(q)) return false;
      if (status === "active" && (c.suspended || c.invited)) return false;
      if (status === "invited" && (c.suspended || !c.invited)) return false;
      if (status === "suspended" && !c.suspended) return false;
      if (planFilter !== "all" && c.plan !== planFilter) return false;
      if (pay === "paying" && !isPaying(c.subscriptionStatus)) return false;
      if (pay === "past-due" && c.subscriptionStatus !== "PAST_DUE") return false;
      if (pay === "not-paying" && (isPaying(c.subscriptionStatus) || c.subscriptionStatus === "PAST_DUE")) return false;
      if (attention && !c.flags.includes(attention)) return false;
      return true;
    });
  }, [clients, query, status, planFilter, pay, attention]);

  const filtering = Boolean(query.trim()) || status !== "all" || planFilter !== "all" || pay !== "all" || attention !== null;
  function clearFilters() {
    setQuery(""); setStatus("all"); setPlanFilter("all"); setPay("all"); setAttention(null);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy("invite");
    setNotice(null);
    setBulk(null);
    try {
      if (bulkMode) {
        const data = await call("/api/reseller/clients", "POST", { emails: pasted, plan }, tc("tryAgain"));
        const results = data.results as BulkResult[];
        const added = results.flatMap((r) => (r.status === "invited" && r.client ? [newClient(r.client, Date.now())] : []));
        setClients((cs) => [...added, ...cs]);
        setSeatsLeft(data.seatsLeft ?? null);
        setBulk({ invited: data.invited, skipped: data.skipped, results });
        if (data.invited > 0) setEmails(results.filter((r) => r.status === "skipped").map((r) => r.email).join("\n"));
      } else {
        const data = await call("/api/reseller/clients", "POST", { email, name: name || undefined, plan }, tc("tryAgain"));
        setClients((cs) => [newClient(data.client, Date.now()), ...cs]);
        setSeatsLeft((s) => (s === null ? null : Math.max(0, s - 1)));
        setEmail(""); setName("");
        setNotice({ kind: "ok", text: data.emailed ? t("invitedEmailed", { email: data.client.email }) : t("invitedLink", { email: data.client.email }), link: data.link });
      }
      setPlan("FREE");
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : t("addFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function update(c: Client, patch: Partial<{ plan: string; suspended: boolean }>) {
    setBusy(c.id);
    setNotice(null);
    try {
      const data = await call(`/api/reseller/clients/${c.id}`, "PATCH", patch, tc("tryAgain"));
      setClients((cs) => cs.map((x) => (x.id === c.id ? { ...x, plan: data.client.plan, suspended: data.client.suspended } : x)));
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : t("saveFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function link(c: Client) {
    setBusy(c.id);
    setNotice(null);
    try {
      const data = await call(`/api/reseller/clients/${c.id}/link`, "POST", { purpose: c.invited ? "invite" : "reset" }, tc("tryAgain"));
      setNotice({ kind: "ok", text: t(c.invited ? (data.emailed ? "inviteLinkForEmailed" : "inviteLinkFor") : data.emailed ? "resetLinkForEmailed" : "resetLinkFor", { email: c.email }), link: data.link });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : t("linkFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function open(c: Client) {
    setBusy(c.id);
    try {
      await call(`/api/reseller/clients/${c.id}/impersonate`, "POST", undefined, tc("tryAgain"));
      window.location.href = "/dashboard";
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : t("openFailed") });
      setBusy(null);
    }
  }

  async function remove(c: Client) {
    const typed = prompt(c.apps === 1 ? t("deletePromptOne", { email: c.email }) : t("deletePromptMany", { email: c.email, count: c.apps }));
    if (typed === null) return;
    setBusy(c.id);
    try {
      await call(`/api/reseller/clients/${c.id}`, "DELETE", { confirmEmail: typed }, tc("tryAgain"));
      setClients((cs) => cs.filter((x) => x.id !== c.id));
      setSeatsLeft((s) => (s === null ? null : s + 1));
      setNotice({ kind: "ok", text: t("deleted", { email: c.email }) });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : t("deleteFailed") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><UserPlus size={17} aria-hidden /> {bulkMode ? t("inviteSeveralTitle") : t("inviteTitle")}</h2>
          <button type="button" className="text-sm text-brand-300 hover:text-brand-200" onClick={() => { setBulkMode((b) => !b); setNotice(null); setBulk(null); }}>
            {bulkMode ? t("inviteOne") : t("inviteSeveral")}
          </button>
        </div>
        <p className="mt-1 text-sm text-surface-400">
          {emailOn ? t("inviteBodyEmail") : t("inviteBodyLink")}
          {seatsLeft !== null && !atLimit && <> {t("seatsLeft", { count: seatsLeft })}</>}
        </p>
        {bulkMode ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_auto]">
            <label className="block text-sm">
              <span className="label">{t("emails")}</span>
              <textarea className="input min-h-[110px] w-full font-mono text-xs" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder={"jo@shop.com\nsam@cafe.com, lee@studio.com"} disabled={atLimit} />
              <span className="mt-1 block text-xs text-surface-500">{t("emailsHint")}{seatsLeft !== null && pasted.length > seatsLeft && !atLimit && <> {t("onlyFirst", { count: seatsLeft })}</>}</span>
            </label>
            <label className="block text-sm" data-help={t("planHelp")}><span className="label">{t("plan")}</span>
              <select className="input w-full" value={plan} onChange={(e) => setPlan(e.target.value)} disabled={atLimit}>{PLANS.map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}</select>
            </label>
            <div className="flex items-end"><button className="btn-primary w-full justify-center" disabled={busy === "invite" || atLimit || pasted.length === 0} data-help={t("sendInvitesHelp")}>{busy === "invite" ? t("adding") : pasted.length ? t("sendInvitesN", { count: pasted.length }) : t("sendInvites")}</button></div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_140px_auto]">
            <label className="block text-sm"><span className="label">{t("email")}</span><input className="input w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@business.com" disabled={atLimit} /></label>
            <label className="block text-sm"><span className="label">{t("name")}</span><input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} disabled={atLimit} /></label>
            <label className="block text-sm" data-help={t("planHelp")}><span className="label">{t("plan")}</span>
              <select className="input w-full" value={plan} onChange={(e) => setPlan(e.target.value)} disabled={atLimit}>{PLANS.map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}</select>
            </label>
            <div className="flex items-end"><button className="btn-primary w-full justify-center" disabled={busy === "invite" || atLimit} data-help={t("sendInviteHelp")}>{busy === "invite" ? t("adding") : t("sendInvite")}</button></div>
          </div>
        )}
        {atLimit && <p className="mt-3 text-sm text-amber-200">{t("atLimit")}</p>}
      </form>

      {notice && (
        <div role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${notice.kind === "error" ? "border-red-400/30 bg-red-400/10 text-red-100" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-50"}`}>
          <p>{notice.text}</p>
          {notice.link && <CopyLink link={notice.link} />}
        </div>
      )}

      {bulk && (
        <section role="status" className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm" aria-label={t("results")}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              {bulk.skipped > 0 ? t("bulkInvitedSkipped", { invited: bulk.invited, skipped: bulk.skipped }) : t("bulkInvited", { invited: bulk.invited })}
              {bulk.invited > 0 && ` ${emailOn ? t("bulkEmailed") : t("bulkLinks")}`}
            </p>
            <button type="button" aria-label={t("closeResults")} className="text-surface-400 hover:text-surface-100" onClick={() => setBulk(null)}><X size={16} /></button>
          </div>
          <ul className="mt-3 space-y-3">
            {bulk.results.map((r, i) => (
              <li key={`${r.email}-${i}`}>
                <span className="font-mono text-xs" dir="ltr">{r.email}</span>{" "}
                {r.status === "invited"
                  ? <span className="text-xs text-emerald-300">{r.emailed ? t("invitedEmailedShort") : t("invitedShort")}</span>
                  : <span className="text-xs text-amber-200">{t("skipped", { reason: r.reason ?? "" })}</span>}
                {r.link && <CopyLink link={r.link} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {clients.length > 0 && ATTENTION_ORDER.some((f) => counts[f] > 0) && (
        <section className="card p-4" aria-labelledby="attention-heading">
          <h2 id="attention-heading" className="text-sm font-semibold" data-help={t("attentionHelp")}>{t("attention")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ATTENTION_ORDER.filter((f) => counts[f] > 0).map((f) => (
              <li key={f}>
                <button
                  type="button"
                  title={t(`flags.${f}.hint`)}
                  aria-pressed={attention === f}
                  onClick={() => setAttention((a) => (a === f ? null : f))}
                  className={`rounded-full border px-3 py-1 text-xs transition ${attention === f ? "border-amber-300/60 bg-amber-300/15 text-amber-100" : "border-white/10 text-surface-300 hover:border-amber-300/40 hover:text-surface-100"}`}
                >
                  {t(`flags.${f}.label`)} <span className="tabular-nums font-semibold">{format.number(counts[f])}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden" aria-label={t("list")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4">
          <h2 className="font-semibold">
            {filtering ? t("countFiltered", { shown: shown.length, count: clients.length }) : t("count", { count: clients.length })}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {clients.length > 5 && <label className="studio-search"><Search size={14} aria-hidden /><input aria-label={t("search")} placeholder={t("searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} /></label>}
            {clients.length > 0 && (
              <a href="/api/reseller/clients/export" className="btn-ghost text-sm" download data-help={t("csvHelp")}>
                <Download size={14} aria-hidden /> {t("csv")}
              </a>
            )}
          </div>
        </div>
        {clients.length > 0 && (
          <div className="flex flex-wrap items-end gap-3 border-b border-white/5 px-4 py-3 text-sm">
            <label className="block"><span className="label">{t("status")}</span>
              <select className="input py-1" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
                <option value="all">{t("all")}</option><option value="active">{t("statusActive")}</option><option value="invited">{t("statusInvited")}</option><option value="suspended">{t("statusSuspended")}</option>
              </select>
            </label>
            <label className="block"><span className="label">{t("plan")}</span>
              <select className="input py-1" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                <option value="all">{t("all")}</option>{PLANS.map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}
              </select>
            </label>
            <label className="block" data-help={t("paymentHelp")}><span className="label">{t("payment")}</span>
              <select className="input py-1" value={pay} onChange={(e) => setPay(e.target.value as PayFilter)}>
                <option value="all">{t("all")}</option><option value="paying">{t("pay.ACTIVE")}</option><option value="past-due">{t("pay.PAST_DUE")}</option><option value="not-paying">{t("pay.NONE")}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pb-2"><input type="checkbox" checked={attention === "inactive"} onChange={(e) => setAttention(e.target.checked ? "inactive" : null)} /> {t("notSeen30")}</label>
            <label className="flex items-center gap-2 pb-2"><input type="checkbox" checked={attention === "never-signed-in"} onChange={(e) => setAttention(e.target.checked ? "never-signed-in" : null)} /> {t("neverSignedIn")}</label>
            {filtering && <button type="button" className="pb-2 text-brand-300 hover:text-brand-200" onClick={clearFilters}>{t("clearFilters")}</button>}
          </div>
        )}
        {clients.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">{t("none")}</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-sm text-surface-400">{t("noMatch")} <button type="button" className="text-brand-300 underline" onClick={clearFilters}>{t("showEveryone")}</button></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs uppercase tracking-wider text-surface-400">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t("colClient")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("plan")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colApps")}</th>
                  <th className="px-4 py-3 text-start font-medium" data-help={t("colAiHelp")}>{t("colAi")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colLastActive")}</th>
                  <th className="px-4 py-3 text-end font-medium">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((c) => (
                  <tr key={c.id} className={busy === c.id ? "opacity-60" : ""}>
                    <td className="px-4 py-3">
                      <span className="block font-medium">{c.name || c.email}</span>
                      {c.name && <span className="block text-xs text-surface-400">{c.email}</span>}
                      {c.flags.length > 0 && <span className="mt-0.5 block text-xs text-amber-200">{c.flags.map((f) => t(`flags.${f}.label`)).join(" · ")}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${c.suspended ? "bg-red-400/10 text-red-300" : c.invited ? "bg-amber-400/10 text-amber-200" : "bg-emerald-400/10 text-emerald-300"}`}>
                        {statusLabel(c)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select aria-label={t("planFor", { email: c.email })} data-help={t("planChangeHelp")} className="input py-1" value={c.plan} disabled={busy === c.id} onChange={(e) => update(c, { plan: e.target.value })}>
                        {PLANS.map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}
                      </select>
                      {c.subscriptionStatus !== "NONE" && <span className={`ms-2 text-xs ${c.subscriptionStatus === "PAST_DUE" ? "text-amber-200" : "text-surface-400"}`}>{t(`payLower.${c.subscriptionStatus}`)}</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{format.number(c.apps)}{c.liveApps > 0 && <span className="ms-1 whitespace-nowrap text-xs text-surface-400">{t("liveApps", { n: format.number(c.liveApps) })}</span>}</td>
                    <td className="px-4 py-3 tabular-nums text-surface-300">{format.number(c.aiUsed)}{c.aiLimit !== null && <span className="text-surface-500"> / {format.number(c.aiLimit)}</span>}</td>
                    <td className="px-4 py-3 text-surface-300" title={c.lastActiveAt ?? undefined} suppressHydrationWarning>{whenLabel(c.lastActiveAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton label={t("openWorkspace")} help={t("openWorkspaceHelp")} onClick={() => open(c)} disabled={busy === c.id || c.suspended}><ExternalLink size={15} /></IconButton>
                        <IconButton label={c.invited ? t("newInviteLink") : t("resetLink")} help={c.invited ? t("newInviteLinkHelp") : t("resetLinkHelp")} onClick={() => link(c)} disabled={busy === c.id}><KeyRound size={15} /></IconButton>
                        <IconButton label={c.suspended ? t("restore") : t("suspend")} help={c.suspended ? t("restoreHelp") : t("suspendHelp")} onClick={() => update(c, { suspended: !c.suspended })} disabled={busy === c.id}>{c.suspended ? <UserCheck size={15} /> : <UserX size={15} />}</IconButton>
                        <IconButton label={t("delete")} help={t("deleteHelp")} onClick={() => remove(c)} disabled={busy === c.id} danger><Trash2 size={15} /></IconButton>
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

function IconButton({ label, help, onClick, disabled, danger, children }: { label: string; help?: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} data-help={help} onClick={onClick} disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40 ${danger ? "text-red-300 hover:bg-red-400/10" : "text-surface-300 hover:bg-white/10 hover:text-surface-50"}`}>
      {children}
    </button>
  );
}

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("reseller.clients");
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono text-xs" dir="ltr" aria-label={t("link")} />
      <button type="button" className="btn-ghost shrink-0" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
        <Copy size={14} /> {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
