"use client";
import { useState } from "react";
import { CheckCircle2, CircleDashed, Copy } from "lucide-react";

type Check = { owned: boolean; pointsHere: boolean } | null;

export function DomainSetup({ initialDomain, initialToken, initiallyVerified, target, ip = null, autoTls = false }: { initialDomain: string | null; initialToken: string | null; initiallyVerified: boolean; target: string; ip?: string | null; autoTls?: boolean }) {
  const [domain, setDomain] = useState(initialDomain);
  const [token, setToken] = useState(initialToken);
  const [verified, setVerified] = useState(initiallyVerified);
  const [input, setInput] = useState(initialDomain ?? "");
  const [check, setCheck] = useState<Check>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reseller/domain", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ domain: input.trim() || null }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Couldn't save the domain.");
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
    if (!res.ok) return setError(data.error || "Couldn't check the domain.");
    setCheck({ owned: data.owned, pointsHere: data.pointsHere });
    if (data.verified) setVerified(true);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card p-6">
        <label className="block text-sm">
          <span className="label">Domain</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input data-help="A web address you own, like apps.youragency.com. Your clients will sign in and build there, and their published apps are shared from it." className="input flex-1 font-mono" value={input} onChange={(e) => setInput(e.target.value)} placeholder="apps.youragency.com" aria-describedby="domain-hint" />
            <button className="btn-primary justify-center" disabled={busy || input.trim() === (domain ?? "")} data-help="Saves the address and shows the settings to add at the company where you bought your domain. A new address has to be checked again before it works.">{domain ? "Change domain" : "Use this domain"}</button>
          </div>
        </label>
        <p id="domain-hint" className="mt-2 text-xs text-surface-400">Use a subdomain you control, like apps.youragency.com. Leave it empty and save to stop using a custom domain.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      </form>

      {domain && token && (
        <section className="card p-6" aria-labelledby="dns-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="dns-heading" className="font-semibold" data-help="DNS records are settings at the company where you bought your domain. These two prove the address is yours and send visitors to your workspace.">Connect {domain}</h2>
            {verified
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"><CheckCircle2 size={14} /> Connected</span>
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200"><CircleDashed size={14} /> Waiting for DNS</span>}
          </div>
          <p className="mt-2 text-sm text-surface-400">Add these two records where you manage your domain&apos;s DNS (your registrar or DNS host). Changes usually take a few minutes, sometimes up to a few hours.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-surface-400"><tr><th className="py-2 pr-4 font-medium">Type</th><th className="py-2 pr-4 font-medium">Name / host</th><th className="py-2 font-medium">Value / points to</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                <DnsRow type={/^\d+\.\d+\.\d+\.\d+$/.test(target) ? "A" : "CNAME"} name={domain} value={target} />
                <DnsRow type="TXT" name={`_verify.${domain}`} value={token} />
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-surface-400">If your DNS host doesn&apos;t allow a CNAME here, use an A record pointing to {ip ? <span className="font-mono text-surface-200">{ip}</span> : <>this server&apos;s IP address</>} instead.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={verify} disabled={busy} data-help="Looks up your domain's settings now. As soon as the ownership record (TXT) is found, your address counts as connected.">{busy ? "Checking…" : "Check now"}</button>
            {check && (
              <ul className="space-y-1 text-sm">
                <li className={check.owned ? "text-emerald-300" : "text-amber-200"}>{check.owned ? "Ownership confirmed (TXT record found)." : "TXT record not found yet."}</li>
                <li className={check.pointsHere ? "text-emerald-300" : "text-amber-200"}>{check.pointsHere ? "The domain points to this server." : "The domain doesn't point here yet (CNAME/A record)."}</li>
              </ul>
            )}
          </div>
          {verified && <p className="mt-4 text-sm text-surface-300">Your clients can now sign in at <a className="font-mono text-brand-300 underline" href={`https://${domain}`} target="_blank" rel="noreferrer">https://{domain}</a>. {autoTls ? "A secure (HTTPS) certificate is set up automatically on the first visit." : "If the address doesn't open securely (https) yet, ask whoever runs this server to add a certificate for it."}</p>}
        </section>
      )}
    </div>
  );
}

function DnsRow({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <tr>
      <td className="py-2.5 pr-4 font-mono text-xs">{type}</td>
      <td className="py-2.5 pr-4"><CopyValue value={name} /></td>
      <td className="py-2.5"><CopyValue value={value} /></td>
    </tr>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="group inline-flex max-w-full items-center gap-2 rounded-md bg-white/5 px-2 py-1 font-mono text-xs hover:bg-white/10" onClick={async () => { await navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }} title="Copy">
      <span className="truncate">{value}</span>
      <span className="shrink-0 text-surface-400 group-hover:text-surface-100">{copied ? "Copied" : <Copy size={12} />}</span>
    </button>
  );
}
