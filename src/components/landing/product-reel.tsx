"use client";
import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

// Bump whenever screenshots are recaptured to defeat browser cache.
const IMG_V = "4";

type Slide = {
  title: string;
  body: string;
  image: string;
  alt: string;
  badge: string;
};

const SLIDES: Slide[] = [
  {
    badge: "01 · Dashboard",
    title: "One place for every app you're building.",
    body: "A clean workspace for all your projects. Pick up where you left off, see what's live, and ship your next update without hunting for things.",
    image: `/studio-preview/dashboard.png?v=${IMG_V}`,
    alt: "Dashboard showing several apps",
  },
  {
    badge: "02 · Visual Editor",
    title: "Drag, drop, style — like a designer.",
    body: "A full-power GrapesJS-based editor with blocks, layers, responsive devices, custom classes, and a real styles panel. Every element is editable.",
    image: `/studio-preview/editor.png?v=${IMG_V}`,
    alt: "Visual page editor",
  },
  {
    badge: "03 · Backend Logic",
    title: "Wire up real backend flows, visually.",
    body: "Compose HTTP endpoints, database queries, branches, transforms, API calls — as a flow diagram. No code. Every node is a well-defined, testable step.",
    image: `/studio-preview/flows.png?v=${IMG_V}`,
    alt: "Visual workflow canvas",
  },
  {
    badge: "04 · Real Data",
    title: "Postgres in one click. Or your Google Sheet.",
    body: "Spin up an isolated Postgres schema per project with typed columns — zero config. Prefer a spreadsheet? Hook up Google Sheets and treat it like a database.",
    image: `/studio-preview/data.png?v=${IMG_V}`,
    alt: "Data panel",
  },
  {
    badge: "05 · Publish",
    title: "One click live. Your domain, your rules.",
    body: "Publishing saves a version of your pages and flows that visitors see while you keep editing, gives your app its own web address, and connects your own domain once you verify it. Roll back to any earlier version in one click.",
    image: `/studio-preview/publish.png?v=${IMG_V}`,
    alt: "Publish panel",
  },
];

export function ProductReel() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <section
      id="product"
      ref={ref}
      className="relative"
      style={{ height: `${(SLIDES.length + 1) * 100}vh` }}
    >
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-950 to-transparent pointer-events-none" />

        <div className="relative mx-auto w-full max-w-7xl px-6">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-400 font-medium">
              A whole platform, not a plugin
            </p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
              A quick tour of what you get.
            </h2>
            <p className="mt-3 text-sm text-surface-400">Keep scrolling &mdash; each panel is a real screenshot of the app.</p>
          </div>

          <div className="relative min-h-[480px] lg:min-h-[520px]">
            {SLIDES.map((slide, i) => (
              <Slide
                key={i}
                slide={slide}
                index={i}
                total={SLIDES.length}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </div>

          <ScrollIndicator count={SLIDES.length} progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}

function Slide({
  slide,
  index,
  total,
  scrollYProgress,
}: {
  slide: Slide;
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  // framer-motion 12 routes useTransform through an "accelerate" path that
  // feeds the input range straight to Element.animate() as WAAPI keyframe
  // offsets. WAAPI requires those offsets to live in [0, 1], so we can't use
  // the old <0 / >1 sentinels ("fade in from before scroll starts") anymore.
  // Instead, anchor the edge slides so they stay fully visible at the page
  // boundary: the first slide never fades in, the last slide never fades out.
  // EPS keeps adjacent anchors strictly increasing (WAAPI rejects duplicates).
  const EPS = 0.0001;
  const segment = 1 / total;
  const center = (index + 0.5) * segment;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const fadeIn = isFirst ? 0 : center - segment * 0.55;
  const holdIn = isFirst ? EPS : center - segment * 0.25;
  const holdOut = isLast ? 1 - EPS : center + segment * 0.25;
  const fadeOut = isLast ? 1 : center + segment * 0.55;

  // Edge slides hold their "in-frame" values through the boundary instead of
  // fading — this replaces the old <0/>1 sentinel trick without changing the
  // visual: slide 0 is at full scale/opacity at scroll 0, slide N at scroll 1.
  const opacity = useTransform(
    scrollYProgress,
    [fadeIn, holdIn, holdOut, fadeOut],
    [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0]
  );
  const scale = useTransform(
    scrollYProgress,
    [fadeIn, center, fadeOut],
    [isFirst ? 1 : 0.94, 1, isLast ? 1 : 0.94]
  );
  const y = useTransform(
    scrollYProgress,
    [fadeIn, center, fadeOut],
    [isFirst ? 0 : 30, 0, isLast ? 0 : -30]
  );

  return (
    <motion.div
      style={{ opacity, scale, y }}
      className="absolute inset-0 grid lg:grid-cols-2 gap-8 items-center"
    >
      <div className="order-2 lg:order-1">
        <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-brand-400 font-semibold">
          {slide.badge}
        </span>
        <h3 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
          {slide.title}
        </h3>
        <p className="mt-5 text-base md:text-lg text-surface-300 max-w-xl">{slide.body}</p>
      </div>
      <div className="order-1 lg:order-2">
        <div className="relative rounded-xl border border-surface-800 bg-surface-900/70 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-surface-800 bg-surface-900/80">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
            <span className="h-2 w-2 rounded-full bg-green-500/70" />
          </div>
          <div className="aspect-[16/10] relative">
            <Image
              src={slide.image}
              alt={slide.alt}
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

function ScrollIndicator({
  count,
  progress,
}: {
  count: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-8 flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} index={i} count={count} progress={progress} />
      ))}
    </div>
  );
}

function Dot({
  index,
  count,
  progress,
}: {
  index: number;
  count: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  // Same framer-motion-12 WAAPI-offset clamp as Slide above: keep the input
  // range inside [0, 1] and have edge dots stay at their active state at the
  // page boundary instead of using out-of-range sentinels.
  const segment = 1 / count;
  const center = (index + 0.5) * segment;
  const isFirst = index === 0;
  const isLast = index === count - 1;
  const inStart = isFirst ? 0 : center - segment * 0.5;
  const outEnd = isLast ? 1 : center + segment * 0.5;
  const w = useTransform(
    progress,
    [inStart, center, outEnd],
    [isFirst ? 32 : 8, 32, isLast ? 32 : 8]
  );
  const opacity = useTransform(
    progress,
    [inStart, center, outEnd],
    [isFirst ? 1 : 0.3, 1, isLast ? 1 : 0.3]
  );
  return <motion.div style={{ width: w, opacity }} className="h-1 rounded-full bg-brand-400" />;
}
