"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, Copy, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

type Domain = {
  id: string;
  host: string;
  status: string;
  verifyToken: string;
};

type CheckResult = { owned: boolean; pointsHere: boolean };

export function DomainsPanel({ projectId, domains, target, ip = null }: { projectId: string; domains: Domain[]; target: string; ip?: string | null }) {
  const router = useRouter();
  const t = useTranslations("project.domains");
  const [host, setHost] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/domains`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ host }),
    });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) return setError(data?.error ?? t("addFailed"));
    setHost("");
    router.refresh();
  }

  async function verify(id: string) {
    setBusy(id);
    const res = await fetch(`/api/projects/${projectId}/domains/${id}`, { method: "PATCH" });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (res.ok && data) setChecks((c) => ({ ...c, [id]: { owned: data.owned, pointsHere: data.pointsHere } }));
    router.refresh();
  }

  async function remove(d: Domain) {
    if (!confirm(t("confirmDisconnect", { host: d.host }))) return;
    setBusy(d.id);
    await fetch(`/api/projects/${projectId}/domains/${d.id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={add} className="card p-5">
        <label className="block text-sm">
          <span className="label">{t("domain")}</span>
          <span className="flex flex-col gap-2 sm:flex-row">
            <input className="input flex-1 font-mono" placeholder="www.yourbusiness.com" data-help={t("hostHelp")} value={host} onChange={(e) => setHost(e.target.value)} />
            <button className="btn-primary justify-center" disabled={busy === "add" || !host.trim()} data-help={t("addHelp")}>{busy === "add" ? t("adding") : t("add")}</button>
          </span>
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
      </form>

      {domains.length === 0 && <p className="text-sm text-surface-400">{t("empty")}</p>}

      {domains.map((d) => {
        const connected = d.status === "ACTIVE";
        const check = checks[d.id];
        return (
          <section key={d.id} className="card p-5" aria-label={d.host}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{d.host}</p>
                {connected
                  ? <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle2 size={14} /> {t.rich("connected", { host: d.host, url: (c) => <span dir="ltr">{c}</span> })}</span>
                  : <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-amber-200"><CircleDashed size={14} /> {t("waiting")}</span>}
              </div>
              <div className="flex gap-2">
                {!connected && <button type="button" className="btn-primary" onClick={() => verify(d.id)} disabled={busy === d.id} data-help={t("checkHelp")}>{busy === d.id ? t("checking") : t("checkNow")}</button>}
                <button type="button" className="btn-ghost" onClick={() => remove(d)} disabled={busy === d.id} aria-label={t("disconnect", { host: d.host })} data-help={t("disconnectHelp")}><Trash2 size={15} /></button>
              </div>
            </div>
            {!connected && (
              <div className="mt-4">
                <p className="text-sm text-surface-400" data-help={t("recordsHelp")}>{t("recordsIntro")}</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-start text-xs uppercase tracking-wider text-surface-400"><tr><th className="py-2 pe-4 font-medium">{t("colType")}</th><th className="py-2 pe-4 font-medium">{t("colName")}</th><th className="py-2 font-medium">{t("colValue")}</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      <tr data-help={t("routingRecordHelp")}><td className="py-2.5 pe-4 font-mono text-xs">{/^\d+\.\d+\.\d+\.\d+$/.test(target) ? "A" : "CNAME"}</td><td className="py-2.5 pe-4"><Copyable value={d.host} /></td><td className="py-2.5"><Copyable value={target} /></td></tr>
                      <tr data-help={t("ownershipRecordHelp")}><td className="py-2.5 pe-4 font-mono text-xs">TXT</td><td className="py-2.5 pe-4"><Copyable value={`_verify.${d.host}`} /></td><td className="py-2.5"><Copyable value={d.verifyToken} /></td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-surface-400">{ip ? t.rich("rootHintIp", { ip, code: (c) => <span dir="ltr" className="font-mono text-surface-200">{c}</span> }) : t("rootHint")}</p>
                {check && (
                  <ul className="mt-3 space-y-1 text-sm">
                    <li className={check.owned ? "text-emerald-300" : "text-amber-200"}>{check.owned ? t("owned") : t("notOwned")}</li>
                    <li className={check.pointsHere ? "text-emerald-300" : "text-amber-200"}>{check.pointsHere ? t("pointsHere") : t("notPointsHere")}</li>
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("project.domains");
  return (
    <button type="button" title={t("copy")} aria-label={t("copyValue", { value })} data-help={t("copyHelp")} className="group inline-flex max-w-full items-center gap-2 rounded-md bg-white/5 px-2 py-1 font-mono text-xs hover:bg-white/10"
      onClick={async () => { await navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      <span className="truncate" dir="ltr">{value}</span>
      <span className="shrink-0 text-surface-400 group-hover:text-surface-100">{copied ? t("copied") : <Copy size={12} />}</span>
    </button>
  );
}
