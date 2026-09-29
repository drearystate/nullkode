"use client";
import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "Design your pages",
    body: "Start with a blank canvas or a block. Drag components, style them, mark buttons and forms as interactive — same way you'd build in Figma.",
    color: "from-brand-500 to-brand-700",
  },
  {
    n: "02",
    title: "Wire up a flow",
    body: "Open the flow canvas, drop a trigger and a few nodes, point them at your data, and connect them together. Test run it in one click.",
    color: "from-cyan-500 to-brand-500",
  },
  {
    n: "03",
    title: "Publish to your domain",
    body: "One click takes a snapshot and serves it live. Bring your own domain, verify DNS, and you're done. Update any time with a new publish.",
    color: "from-fuchsia-500 to-brand-500",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-32 border-y border-surface-800/60 bg-surface-900/20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400 font-medium">
            How it works
          </p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">
            From blank page to live app in three steps.
          </h2>
        </motion.div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.12,
                ease: "easeOut",
              }}
              className="relative rounded-2xl border border-surface-800 bg-surface-900/60 backdrop-blur p-8 overflow-hidden group"
            >
              <div
                className={`absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${s.color} opacity-20 blur-3xl group-hover:opacity-40 transition-opacity`}
              />
              <div
                className={`text-sm font-mono bg-gradient-to-r ${s.color} bg-clip-text text-transparent font-bold`}
              >
                {s.n}
              </div>
              <h3 className="mt-2 text-2xl font-bold">{s.title}</h3>
              <p className="mt-4 text-surface-300 text-sm leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
