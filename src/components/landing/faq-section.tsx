"use client";
import { useState } from "react";

const faqs = (name: string) => [
  {
    q: "Is this real no-code, or will I need to write code eventually?",
    a: "Real no-code. The UI editor and the flow engine cover pages and backend logic end-to-end. You can embed snippets of HTML if you want to, but nothing in the product requires you to read or write code.",
  },
  {
    q: "Where does my data actually live?",
    a: "If you use the built-in Postgres data source, each project gets its own isolated schema on this installation’s PostgreSQL database. You can also bring your own Postgres via a connection string, or connect a Google Sheet. Your data, your choice.",
  },
  {
    q: "Can I use my own domain?",
    a: `Yes. Add a domain, verify it with a DNS TXT record, and ${name} routes traffic to your project.`,
  },
  {
    q: "Can I export what I build?",
    a: "You can export the HTML and CSS of any page, and download your Postgres data at any time. Flows are stored as a portable JSON graph you can take with you.",
  },
  {
    q: "How are you different from Webflow or Framer?",
    a: `Those are page builders. ${name} is an app builder: beyond pages, you get a real visual backend-logic engine, first-class data sources, and runtime flows that actually execute.`,
  },
  {
    q: "How are you different from Bubble or Adalo?",
    a: `Describe your app in a sentence and ${name} builds the pages, the database tables and the backend workflows for you \u2014 then you keep editing visually. Your data lives in a standard Postgres database you can export at any time.`,
  },
];

export function FaqSection({ name = "Nullkode" }: { name?: string }) {
  return (
    <section id="faq" className="bg-surface-900 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-semibold">
            FAQ
          </p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-surface-50">
            Questions, honestly answered.
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs(name).map((item, i) => (
            <FaqItem key={i} item={item} />
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
        className="w-full flex items-center justify-between text-left px-5 py-4 text-surface-50 font-medium hover:bg-white/[0.03] transition"
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
