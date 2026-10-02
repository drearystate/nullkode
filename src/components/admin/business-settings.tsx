"use client";
import { useTranslations } from "next-intl";
import { PlanPricesForm } from "@/components/billing/plan-prices-form";

/** Admin → Payments: the platform's plans, prices and Stripe connection. */
export function BusinessSettings() {
  const t = useTranslations("admin.business");
  return (
    <section id="payments" className="card mt-8 scroll-mt-40 space-y-5 p-6" aria-labelledby="payments-heading">
      <div>
        <h2 id="payments-heading" className="text-xl font-semibold" data-help={t("help")}>{t("title")}</h2>
        <p className="mt-1 text-sm text-surface-400">{t("body")}</p>
      </div>
      <PlanPricesForm endpoint="/api/admin/billing" audience="customers" />
    </section>
  );
}
