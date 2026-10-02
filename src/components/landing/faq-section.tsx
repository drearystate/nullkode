"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

/** The questions, in order (landing.faq.<id>.q / .a). */
const FAQS = ["noCode", "data", "domain", "export", "webflow", "bubble"] as const;

export function FaqSection({ name = "Nullkode" }: { name?: string }) {
  const t = useTranslations("landing.faq");
  return (
    <section id="faq" className="bg-surface-900 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-semibold">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-surface-50">
            {t("heading")}
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((id) => (
            <FaqItem key={id} item={{ q: t(`${id}.q`), a: t(`${id}.a`, { app: name }) }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-surface-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-start px-5 py-4 text-surface-50 font-medium hover:bg-white/[0.03] transition"
      >
        <span>{item.q}</span>
        <span
          className={`text-blue-500 text-xl transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden
        >
          +
        </span>
      </button>
      {open && (
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-surface-400 text-sm leading-relaxed">
            {item.a}
          </p>
        </div>
      )}
    </div>
  );
}
