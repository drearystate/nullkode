"use client";
import { PlanPricesForm } from "@/components/billing/plan-prices-form";

/** Admin → Payments: the platform's plans, prices and Stripe connection. */
export function BusinessSettings() {
  return (
    <section id="payments" className="card mt-8 scroll-mt-40 space-y-5 p-6" aria-labelledby="payments-heading">
      <div>
        <h2 id="payments-heading" className="text-xl font-semibold" data-help="Set your prices and connect Stripe, the card payment service. Your direct customers pay straight into your own Stripe account.">Payments</h2>
        <p className="mt-1 text-sm text-surface-400">Your prices, and the Stripe account customers pay. Resellers set their own prices for their clients.</p>
      </div>
      <PlanPricesForm endpoint="/api/admin/billing" audience="customers" />
    </section>
  );
}
