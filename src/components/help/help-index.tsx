"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";

export type HelpIndexGuide = { slug: string; title: string; summary: string; text: string };
export type HelpIndexGroup = { id: string; title: string; guides: HelpIndexGuide[] };

/** The guide list on /help, with a search box that filters it as you type. */
export function HelpIndex({ groups }: { groups: HelpIndexGroup[] }) {
  const [query, setQuery] = useState("");
  const terms = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const shown = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, guides: g.guides.filter((guide) => terms.every((t) => guide.text.includes(t))) }))
        .filter((g) => g.guides.length > 0),
    [groups, terms],
  );
  const count = shown.reduce((n, g) => n + g.guides.length, 0);

  return (
    <div className="mt-8">
      <div className="flex max-w-xl items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 focus-within:border-brand-400">
        <Search size={17} className="shrink-0 text-surface-400" aria-hidden />
        <label htmlFor="help-search" className="sr-only">
          Search the guides
        </label>
        <input
          id="help-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the guides, like “publish” or “domain”"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-surface-50 placeholder:text-surface-500 focus:outline-none"
          data-help="Type a word or two. The guides below are filtered as you type."
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded p-1 text-surface-400 hover:text-white">
            <X size={15} />
          </button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {terms.length ? `${count} ${count === 1 ? "guide matches" : "guides match"}` : ""}
      </p>

      {shown.length === 0 ? (
        <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="font-medium">No guides match “{query.trim()}”.</p>
          <p className="mt-1 text-sm text-surface-400">Try a different word, or look through all of them.</p>
          <button type="button" onClick={() => setQuery("")} className="btn-ghost mt-4">
            Show all guides
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {shown.map((group) => (
            <section key={group.id} aria-labelledby={`help-group-${group.id}`}>
              <h2 id={`help-group-${group.id}`} className="text-lg font-semibold tracking-tight">
                {group.title}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.guides.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      href={`/help/${guide.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-white/[0.07] bg-[#15161f] p-5 transition hover:border-brand-400/50 hover:bg-[#191a25]"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-surface-50">{guide.title}</span>
                        <ArrowRight size={15} className="mt-1 shrink-0 text-surface-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" aria-hidden />
                      </span>
                      <span className="mt-2 text-sm leading-relaxed text-surface-400">{guide.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
