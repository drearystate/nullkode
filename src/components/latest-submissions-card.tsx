"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

type Submission = { tableId: string; tableLabel: string; rowId: string | null; createdAt: string; summary: string };


/** The five newest things visitors sent in (form messages, bookings…), one click from the Data tab. */
export function LatestSubmissionsCard({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Submission[] | null>(null);
  const t = useTranslations("project.latestSubmissions");
  const format = useFormatter();

  function ago(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const s = Math.max(0, (now.getTime() - d.getTime()) / 1000);
    if (s < 60) return t("justNow");
    if (s < 3600) return format.relativeTime(d, { now, unit: "minute" });
    if (s < 86400) return format.relativeTime(d, { now, unit: "hour" });
    if (s < 30 * 86400) return format.relativeTime(d, { now, unit: "day" });
    return format.dateTime(d, { dateStyle: "medium" });
  }

  useEffect(() => {
    fetch(`/api/projects/${projectId}/data/latest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItems(d?.submissions ?? []))
      .catch(() => setItems([]));
  }, [projectId]);

  if (items === null) return null;

  return (
    <section className="card mt-6 p-6" aria-labelledby="latest-submissions-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="latest-submissions-heading" className="flex items-center gap-2 font-semibold" data-help={t("titleHelp")}>
          <Inbox size={17} className="text-brand-300" aria-hidden />
          {t("title")}
        </h2>
        <Link href={`/projects/${projectId}/data`} className="text-sm text-brand-300 hover:underline" data-help={t("seeAllHelp")}>
          {t("seeAll")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-surface-400">{t("empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {items.map((s) => (
            <li key={`${s.tableId}-${s.rowId}-${s.createdAt}`}>
              <Link href={`/projects/${projectId}/data?table=${encodeURIComponent(s.tableId)}`} className="group flex items-center gap-3 py-2.5" data-help={t("itemHelp")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{s.summary || t("newEntry")}</span>
                  <span className="mt-0.5 block text-xs text-surface-400">
                    {s.tableLabel} · {ago(s.createdAt)}
                  </span>
                </span>
                <ArrowRight size={14} className="text-surface-500 transition group-hover:text-white rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
