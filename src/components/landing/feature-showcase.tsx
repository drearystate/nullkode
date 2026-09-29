"use client";
import Image from "next/image";
import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "Compose pages like a designer.",
    body: "A real visual editor — blocks, layers, typography, responsive preview, class selectors. No cookie-cutter templates; build what you want.",
    points: ["Responsive devices", "Style manager", "Custom blocks", "Traits & data-bindings"],
    image: "/studio-preview/editor.png?v=4",
    reverse: false,
  },
  {
    title: "Spin up databases without thinking about it.",
    body: "Each project gets its own isolated Postgres schema. Point-and-click tables with typed columns. Or plug in Google Sheets and treat it like a CRUD backend.",
    points: ["Postgres schema per project", "Google Sheets adapter", "Typed columns", "Bring your own DB"],
    image: "/studio-preview/editor.png?v=4",
    reverse: true,
  },
];

export function FeatureShowcase() {
  return (
    <section className="relative py-32">
      <div className="mx-auto max-w-6xl px-6 space-y-32">
        {FEATURES.map((f, i) => (
          <FeatureRow key={i} feature={f} />
        ))}
      </div>
    </section>
  );
}

function FeatureRow({ feature }: { feature: (typeof FEATURES)[number] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`grid lg:grid-cols-2 gap-12 items-center ${
        feature.reverse ? "lg:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div>
        <h3 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">
          {feature.title}
        </h3>
        <p className="mt-5 text-lg text-surface-300 max-w-xl">{feature.body}</p>
        <ul className="mt-8 grid grid-cols-2 gap-3 max-w-lg">
          {feature.points.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-surface-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative">
        <div className="absolute -inset-10 bg-gradient-to-br from-brand-500/20 via-transparent to-cyan-500/10 blur-3xl rounded-full" />
        <div className="relative rounded-xl border border-surface-800 bg-surface-900/60 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-surface-800 bg-surface-900/80">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
            <span className="h-2 w-2 rounded-full bg-green-500/70" />
          </div>
          <div className="aspect-[16/10] relative">
            <Image
              src={feature.image}
              alt={feature.title}
              fill
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover object-top"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
