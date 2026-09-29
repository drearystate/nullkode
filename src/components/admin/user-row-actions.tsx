"use client";
import { useState } from "react";

const PLANS = ["FREE", "STARTER", "PRO", "TEAM"] as const;
const title = (p: string) => p[0] + p.slice(1).toLowerCase();

/** Plan picker and "password link" for one person in Admin → Users. */
export function UserPlanSelect({ userId, plan }: { userId: string; plan: string }) {
  const [value, setValue] = useState(plan);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function change(next: string) {
    setValue(next);
    setState("saving");
    const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: next }) });
    setState(res.ok ? "saved" : "error");
  }
  return (
    <span className="inline-flex items-center gap-2">
      <select aria-label="Plan" className="input h-8 min-h-0 w-auto py-0 text-xs" value={value} onChange={(e) => change(e.target.value)}>
        {PLANS.map((p) => <option key={p} value={p}>{title(p)}</option>)}
      </select>
      {state === "saved" && <span className="text-xs text-emerald-300">Saved</span>}
      {state === "error" && <span className="text-xs text-red-300">Couldn&apos;t save</span>}
    </span>
  );
}

export function PasswordLinkButton({ userId, email }: { userId: string; email: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function make() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purpose: "reset" }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setResult(data.error || "Couldn't make a link.");
    if (data.emailed) return setResult(`Emailed to ${email}.`);
    await navigator.clipboard.writeText(data.link).catch(() => {});
    setResult("Link copied. Send it to them; it works once for 2 hours.");
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs" onClick={make} disabled={busy}>{busy ? "Making…" : "Password link"}</button>
      {result && <span role="status" className="max-w-[16rem] text-left text-xs text-surface-300">{result}</span>}
    </span>
  );
}
