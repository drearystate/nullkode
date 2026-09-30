"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/** Longest idea the box takes. */
const IDEA_MAX_CHARS = 600;
/**
 * The idea travels in the address through sign-up (/signup?next=/new?idea=…),
 * encoded twice. Proxies refuse addresses over about 8 KB, and one character
 * in some scripts takes nine bytes once encoded, so the encoded length is
 * capped too.
 */
const IDEA_MAX_ENCODED = 2400;

// Starting points for the box. Tapping one fills it in to edit.
const IDEAS = [
  { label: "Bakery pre-orders", prompt: "A pre-order page for my bakery. Customers pick cakes and bread, choose a pickup day and leave their name and phone number. I see every order on an admin page." },
  { label: "Salon bookings", prompt: "A booking app for my hair salon. Clients pick a service, a stylist and a time, and I can see and manage all bookings in one place." },
  { label: "Gym timetable", prompt: "A class timetable for my gym. Members see this week's classes and book a spot. I can add classes and see who is coming to each one." },
  { label: "Tutoring sign-ups", prompt: "A sign-up page for my tutoring lessons. Parents pick a subject and a weekly time and leave their contact details. I see the list of students and their lessons." },
];

/** The idea as it will travel: at most IDEA_MAX_CHARS characters and IDEA_MAX_ENCODED encoded. */
function capIdea(text: string): string {
  let encoded = 0;
  let out = "";
  for (const ch of Array.from(text.trim()).slice(0, IDEA_MAX_CHARS)) {
    let size: number;
    try {
      size = encodeURIComponent(ch).length;
    } catch {
      continue; // a broken character from a paste
    }
    if (encoded + size > IDEA_MAX_ENCODED) break;
    encoded += size;
    out += ch;
  }
  return out;
}

export function LandingHero({ authed, moduleCount = 135, aiReady = false }: { authed: boolean; moduleCount?: number; aiReady?: boolean }) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [going, setGoing] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const ready = idea.trim().length >= 5 && !going;

  function start(e?: React.FormEvent) {
    e?.preventDefault();
    const text = capIdea(idea);
    if (going || text.length < 5) return;
    setGoing(true);
    // Re-enabled in case the visitor comes back to this page.
    setTimeout(() => setGoing(false), 4000);
    const target = `/new?idea=${encodeURIComponent(text)}`;
    // New visitors make an account first, then land on the plan for their idea.
    router.push(authed ? target : `/signup?next=${encodeURIComponent(target)}`);
  }

  function fillExample(prompt: string) {
    setIdea(prompt);
    box.current?.focus();
  }

  return (
    <section className="relative pt-28 pb-20 bg-surface-950 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 -translate-x-1/2 top-[-120px] h-[500px] w-[900px] rounded-full bg-blue-900/60 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-900 px-4 py-1.5 text-xs text-surface-300 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Describe it, check the plan, launch it
          </div>

          <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-surface-50">
            Build apps,{" "}
            <span className="bg-gradient-to-r from-[var(--nk-brand-primary,rgb(var(--c-blue-400)))] to-cyan-500 bg-clip-text text-transparent">
              not just pages.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-surface-400 leading-relaxed">
            Drag-and-drop the UI. Wire up real backend logic visually. Use a real
            database or your Google Sheets. Publish to your own domain. No code.
          </p>

          {aiReady ? (
            <form onSubmit={start} className="mt-9 mx-auto max-w-2xl text-left">
              <div className="rounded-2xl border border-white/10 bg-surface-900 p-2 shadow-xl shadow-black/5 transition focus-within:border-surface-600">
                <label htmlFor="landing-idea" className="block px-3 pt-2 text-sm font-semibold text-surface-50">
                  What should your app do?
                </label>
                <textarea
                  id="landing-idea"
                  ref={box}
                  rows={3}
                  maxLength={IDEA_MAX_CHARS}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start(); }}
                  placeholder="e.g. Customers order cakes online, choose a pickup day, and I see every order in one list."
                  className="w-full resize-none bg-transparent px-3 py-2 text-base text-surface-50 placeholder:text-surface-500 focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
                  <span className="text-xs text-surface-500" aria-live="polite">
                    {idea.length > IDEA_MAX_CHARS - 100 ? `${IDEA_MAX_CHARS - idea.length} characters left` : "Say who uses it and what they do."}
                  </span>
                  <button
                    type="submit"
                    disabled={!ready}
                    className="inline-flex items-center gap-2 rounded-xl bg-surface-50 hover:bg-surface-100 text-surface-900 px-6 py-3 text-sm font-semibold transition shadow-lg shadow-black/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {going ? "Opening…" : "Plan my app"}
                    <span aria-hidden className="text-surface-600">&rarr;</span>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-surface-400">Try one:</span>
                {IDEAS.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => fillExample(ex.prompt)}
                    className="rounded-full border border-white/10 bg-surface-900/70 px-3.5 py-1.5 text-xs font-medium text-surface-300 transition hover:border-surface-700 hover:text-surface-50"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-center text-sm text-surface-400">
                You&apos;ll check a plan before anything is built.{" "}
                {authed ? (
                  <Link href="/dashboard" className="font-medium text-surface-200 underline-offset-4 hover:underline">Open your dashboard</Link>
                ) : (
                  <a href="#features" className="font-medium text-surface-200 underline-offset-4 hover:underline">See how it works</a>
                )}
              </p>
            </form>
          ) : (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={authed ? "/dashboard" : "/signup"}
                className="inline-flex items-center gap-2 rounded-xl bg-surface-50 hover:bg-surface-100 text-surface-900 px-7 py-3.5 text-sm font-semibold transition shadow-lg shadow-black/20"
              >
                {authed ? "Open dashboard" : "Start building — it’s free"}
                <span aria-hidden className="text-surface-600">&rarr;</span>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-900 hover:bg-surface-950 text-surface-200 px-7 py-3.5 text-sm font-semibold transition"
              >
                See how it works
              </a>
            </div>
          )}
        </div>

        {/* Stats strip — social proof without a dark screenshot */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { value: String(moduleCount), label: "Ready-made features" },
            { value: "31k+", label: "Icons built in" },
            { value: "6", label: "Ways to start building" },
            { value: "Web + Android", label: "Apps from one project" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[var(--nk-brand-primary,rgb(var(--c-blue-400)))] to-cyan-500 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-surface-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-surface-500 uppercase tracking-widest font-medium">
          <span>No credit card</span>
          <span className="hidden sm:inline text-surface-700">&middot;</span>
          <span>Free forever plan</span>
          <span className="hidden sm:inline text-surface-700">&middot;</span>
          <span>Own your data</span>
        </div>
      </div>
    </section>
  );
}
