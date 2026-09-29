"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

type Submission = { tableId: string; tableLabel: string; rowId: string | null; createdAt: string; summary: string };

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ${d === 1 ? "day" : "days"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** The five newest things visitors sent in (form messages, bookings…), one click from the Data tab. */
export function LatestSubmissionsCard({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Submission[] | null>(null);

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
        <h2 id="latest-submissions-heading" className="flex items-center gap-2 font-semibold" data-help="The five newest things visitors sent through your app, like form messages or bookings.">
          <Inbox size={17} className="text-brand-300" aria-hidden />
          Latest submissions
        </h2>
        <Link href={`/projects/${projectId}/data`} className="text-sm text-brand-300 hover:underline" data-help="Open the Data page to see everything your app has saved.">
          See all data
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-surface-400">Nothing yet. When people send a form or make a booking in your app, it shows up here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {items.map((s) => (
            <li key={`${s.tableId}-${s.rowId}-${s.createdAt}`}>
              <Link href={`/projects/${projectId}/data?table=${encodeURIComponent(s.tableId)}`} className="group flex items-center gap-3 py-2.5" data-help="Open the table this came from to see it in full.">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{s.summary || "New entry"}</span>
                  <span className="mt-0.5 block text-xs text-surface-400">
                    {s.tableLabel} · {ago(s.createdAt)}
                  </span>
                </span>
                <ArrowRight size={14} className="text-surface-500 transition group-hover:text-white" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
