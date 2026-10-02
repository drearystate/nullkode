"use client";
import { useState } from "react";
import { CheckCircle2, CircleDashed, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

type Check = { owned: boolean; pointsHere: boolean } | null;

export function DomainSetup({ initialDomain, initialToken, initiallyVerified, target, ip = null, autoTls = false }: { initialDomain: string | null; initialToken: string | null; initiallyVerified: boolean; target: string; ip?: string | null; autoTls?: boolean }) {
  const [domain, setDomain] = useState(initialDomain);
  const [token, setToken] = useState(initialToken);
  const [verified, setVerified] = useState(initiallyVerified);
  const [input, setInput] = useState(initialDomain ?? "");
  const [check, setCheck] = useState<Check>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("reseller.domain");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reseller/domain", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ domain: input.trim() || null }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || t("saveFailed"));
    setDomain(data.domain);
    setToken(data.token ?? null);
    setVerified(false);
    setCheck(null);
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reseller/domain", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || t("checkFailed"));
    setCheck({ owned: data.owned, pointsHere: data.pointsHere });
    if (data.verified) setVerified(true);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card p-6">
        <label className="block text-sm">
          <span className="label">{t("domain")}</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input data-help={t("domainHelp")} dir="ltr" className="input flex-1 font-mono" value={input} onChange={(e) => setInput(e.target.value)} placeholder="apps.youragency.com" aria-describedby="domain-hint" />
            <button className="btn-primary justify-center" disabled={busy || input.trim() === (domain ?? "")} data-help={t("saveHelp")}>{domain ? t("change") : t("use")}</button>
          </div>
        </label>
        <p id="domain-hint" className="mt-2 text-xs text-surface-400">{t("hint")}</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      </form>

      {domain && token && (
        <section className="card p-6" aria-labelledby="dns-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="dns-heading" className="font-semibold" data-help={t("dnsHelp")}>{t("connect", { domain })}</h2>
            {verified
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"><CheckCircle2 size={14} /> {t("connected")}</span>
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200"><CircleDashed size={14} /> {t("waiting")}</span>}
          </div>
          <p className="mt-2 text-sm text-surface-400">{t("addRecords")}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs uppercase tracking-wider text-surface-400"><tr><th className="py-2 pe-4 text-start font-medium">{t("colType")}</th><th className="py-2 pe-4 text-start font-medium">{t("colName")}</th><th className="py-2 text-start font-medium">{t("colValue")}</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                <DnsRow type={/^\d+\.\d+\.\d+\.\d+$/.test(target) ? "A" : "CNAME"} name={domain} value={target} />
                <DnsRow type="TXT" name={`_verify.${domain}`} value={token} />
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-surface-400">{ip ? t.rich("aRecordIp", { ip, mono: (c) => <span className="font-mono text-surface-200" dir="ltr">{c}</span> }) : t("aRecord")}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={verify} disabled={busy} data-help={t("checkHelp")}>{busy ? t("checking") : t("check")}</button>
            {check && (
              <ul className="space-y-1 text-sm">
                <li className={check.owned ? "text-emerald-300" : "text-amber-200"}>{check.owned ? t("owned") : t("notOwned")}</li>
                <li className={check.pointsHere ? "text-emerald-300" : "text-amber-200"}>{check.pointsHere ? t("pointsHere") : t("notPointsHere")}</li>
              </ul>
            )}
          </div>
          {verified && <p className="mt-4 text-sm text-surface-300">{t.rich("live", { url: `https://${domain}`, link: (c) => <a className="font-mono text-brand-300 underline" dir="ltr" href={`https://${domain}`} target="_blank" rel="noreferrer">{c}</a> })} {autoTls ? t("tlsAuto") : t("tlsManual")}</p>}
        </section>
      )}
    </div>
  );
}

function DnsRow({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <tr>
      <td className="py-2.5 pe-4 font-mono text-xs">{type}</td>
      <td className="py-2.5 pe-4"><CopyValue value={name} /></td>
      <td className="py-2.5"><CopyValue value={value} /></td>
    </tr>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("reseller.domain");
  return (
    <button dir="ltr" type="button" className="group inline-flex max-w-full items-center gap-2 rounded-md bg-white/5 px-2 py-1 font-mono text-xs hover:bg-white/10" onClick={async () => { await navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }} title={t("copy")}>
      <span className="truncate">{value}</span>
      <span className="shrink-0 text-surface-400 group-hover:text-surface-100">{copied ? t("copied") : <Copy size={12} />}</span>
    </button>
  );
}
