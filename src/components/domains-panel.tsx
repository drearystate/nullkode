"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, Copy, Trash2 } from "lucide-react";

type Domain = {
  id: string;
  host: string;
  status: string;
  verifyToken: string;
};

type CheckResult = { owned: boolean; pointsHere: boolean };

export function DomainsPanel({ projectId, domains, target }: { projectId: string; domains: Domain[]; target: string }) {
  const router = useRouter();
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
    if (!res.ok) return setError(data?.error ?? "Couldn't add the domain.");
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
    if (!confirm(`Disconnect ${d.host} from this app?`)) return;
    setBusy(d.id);
    await fetch(`/api/projects/${projectId}/domains/${d.id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={add} className="card p-5">
        <label className="block text-sm">
          <span className="label">Domain</span>
          <span className="flex flex-col gap-2 sm:flex-row">
            <input className="input flex-1 font-mono" placeholder="www.yourbusiness.com" value={host} onChange={(e) => setHost(e.target.value)} />
            <button className="btn-primary justify-center" disabled={busy === "add" || !host.trim()}>{busy === "add" ? "Adding…" : "Add domain"}</button>
          </span>
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
      </form>

      {domains.length === 0 && <p className="text-sm text-surface-400">No domains yet. Your app is still available at its free address.</p>}

      {domains.map((d) => {
        const connected = d.status === "ACTIVE";
        const check = checks[d.id];
        return (
          <section key={d.id} className="card p-5" aria-label={d.host}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{d.host}</p>
                {connected
                  ? <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle2 size={14} /> Connected — visitors can use https://{d.host}</span>
                  : <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-amber-200"><CircleDashed size={14} /> Waiting for DNS records</span>}
              </div>
              <div className="flex gap-2">
                {!connected && <button type="button" className="btn-primary" onClick={() => verify(d.id)} disabled={busy === d.id}>{busy === d.id ? "Checking…" : "Check now"}</button>}
                <button type="button" className="btn-ghost" onClick={() => remove(d)} disabled={busy === d.id} aria-label={`Disconnect ${d.host}`}><Trash2 size={15} /></button>
              </div>
            </div>
            {!connected && (
              <div className="mt-4">
                <p className="text-sm text-surface-400">Add these records where you manage DNS for this domain. Changes usually show up within minutes, sometimes a few hours.</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-surface-400"><tr><th className="py-2 pr-4 font-medium">Type</th><th className="py-2 pr-4 font-medium">Name / host</th><th className="py-2 font-medium">Value / points to</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      <tr><td className="py-2.5 pr-4 font-mono text-xs">{/^\d+\.\d+\.\d+\.\d+$/.test(target) ? "A" : "CNAME"}</td><td className="py-2.5 pr-4"><Copyable value={d.host} /></td><td className="py-2.5"><Copyable value={target} /></td></tr>
                      <tr><td className="py-2.5 pr-4 font-mono text-xs">TXT</td><td className="py-2.5 pr-4"><Copyable value={`_verify.${d.host}`} /></td><td className="py-2.5"><Copyable value={d.verifyToken} /></td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-surface-400">For a root domain (yourbusiness.com without www), use an A record pointing to this server&apos;s IP address if your DNS host doesn&apos;t support CNAME there.</p>
                {check && (
                  <ul className="mt-3 space-y-1 text-sm">
                    <li className={check.owned ? "text-emerald-300" : "text-amber-200"}>{check.owned ? "Ownership confirmed (TXT record found)." : "TXT record not found yet."}</li>
                    <li className={check.pointsHere ? "text-emerald-300" : "text-amber-200"}>{check.pointsHere ? "The domain points to this server." : "The domain doesn't point here yet (CNAME/A record)."}</li>
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
  return (
    <button type="button" title="Copy" className="group inline-flex max-w-full items-center gap-2 rounded-md bg-white/5 px-2 py-1 font-mono text-xs hover:bg-white/10"
      onClick={async () => { await navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      <span className="truncate">{value}</span>
      <span className="shrink-0 text-surface-400 group-hover:text-surface-100">{copied ? "Copied" : <Copy size={12} />}</span>
    </button>
  );
}
