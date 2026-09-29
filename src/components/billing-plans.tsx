"use client";
import { useState } from "react";

import type { PublicPlan } from "@/lib/stripe";

export function BillingPlans({
  plans,
  currentPlan,
  hasCustomer,
}: {
  plans: PublicPlan[];
  currentPlan: string;
  hasCustomer: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function checkout(plan: "STARTER" | "PRO" | "TEAM") {
    setBusy(plan);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setBusy(null);
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Unable to start checkout");
  }

  async function portal() {
    setBusy("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "Unable to open portal");
  }

  return (
    <div className="mt-8">
      <div className="grid gap-4 md:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = p.key === currentPlan;
          return (
            <div key={p.key} className="card p-6">
              <div className="text-sm text-surface-400">{p.name}</div>
              <div className="mt-1 text-2xl font-bold">{p.price}</div>
              <ul className="mt-3 space-y-1 text-xs text-surface-300">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <button
                className="btn-primary mt-4 w-full justify-center disabled:opacity-50"
                disabled={isCurrent || busy !== null || p.key === "FREE"}
                onClick={() => p.key !== "FREE" && checkout(p.key as "STARTER" | "PRO" | "TEAM")}
              >
                {isCurrent ? "Current" : p.key === "FREE" ? "Free" : busy === p.key ? "..." : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      {hasCustomer && (
        <div className="mt-6">
          <button className="btn-ghost" disabled={busy === "portal"} onClick={portal}>
            {busy === "portal" ? "..." : "Manage billing"}
          </button>
        </div>
      )}
    </div>
  );
}
