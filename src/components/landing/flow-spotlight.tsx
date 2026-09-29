"use client";
import Image from "next/image";
import { motion } from "framer-motion";

const NODES = [
  { label: "HTTP Trigger", cat: "Trigger" },
  { label: "Query records", cat: "Data" },
  { label: "Insert record", cat: "Data" },
  { label: "Update records", cat: "Data" },
  { label: "Delete records", cat: "Data" },
  { label: "Read Google Sheet", cat: "Data" },
  { label: "Append to Sheet", cat: "Data" },
  { label: "Branch (if/else)", cat: "Logic" },
  { label: "Set variable", cat: "Logic" },
  { label: "HTTP request", cat: "Integration" },
  { label: "Respond", cat: "Response" },
];

export function FlowSpotlight() {
  return (
    <section id="backend" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[10%] top-[30%] h-[400px] w-[400px] rounded-full bg-brand-600/15 blur-[140px]" />
        <div className="absolute right-[5%] bottom-[10%] h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-medium">
            The part other no-code tools skip
          </p>
          <h2 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight">
            A real backend.{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-brand-400 bg-clip-text text-transparent">
              Without code.
            </span>
          </h2>
          <p className="mt-6 text-lg text-surface-300">
            Drop a trigger. Query some data. Branch on a condition. Hit an external API.
            Respond with JSON. Every step is a node. The whole thing is a flow you can
            see and reason about.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="mt-16 relative"
        >
          <div className="absolute -inset-16 bg-gradient-to-br from-brand-500/20 via-transparent to-cyan-500/15 blur-3xl rounded-full pointer-events-none" />
          <div className="relative rounded-2xl border border-surface-800 bg-surface-900/60 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-surface-800 bg-surface-900/80">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <div className="flex-1 text-center text-[11px] font-mono text-surface-500 truncate">
                flows/handle-signup
              </div>
            </div>
            <div className="aspect-[16/9] relative">
              <Image
                src="/studio-preview/flows.png?v=4"
                alt="Workflow editor canvas"
                fill
                sizes="(min-width: 1024px) 1100px, 100vw"
                className="object-cover object-top"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mt-16"
        >
          <p className="text-center text-sm uppercase tracking-[0.15em] text-surface-500 mb-5">
            Node library
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {NODES.map((n) => (
              <div
                key={n.label}
                className="group flex items-center gap-2 rounded-lg border border-surface-800 bg-surface-900/60 backdrop-blur px-3 py-2 text-sm text-surface-200 hover:border-brand-500 hover:bg-surface-800/70 transition"
              >
                <span>{n.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-surface-500 ml-1">
                  {n.cat}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
