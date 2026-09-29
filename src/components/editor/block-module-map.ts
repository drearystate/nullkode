import type { Component } from "grapesjs";

/**
 * Maps premade block IDs to the module that powers their backend.
 * When a user drops one of these blocks onto the canvas, we offer
 * to install the matching module (skipPages — just tables + flows)
 * and connect the block to the module's flows.
 *
 * How a block names the flow it needs (see premade-blocks.ts and blocks.ts):
 *  - forms: data-nk-flow-ref="<installed flow slug>", e.g. "contact-form-submit".
 *    Published pages already resolve that slug when the form is sent, so the
 *    form also works if the module is added some other way; connecting swaps
 *    it for data-nk-flow="<flow id>".
 *  - lists: data-nk-connect-list="<installed flow slug>" on the container,
 *    with one data-nk-item row holding data-nk-field bindings. The runtime
 *    ignores this attribute, so a list that was never connected keeps its
 *    sample items instead of turning into "Nothing here yet."; connecting
 *    swaps it for data-nk-bind-flow="<flow id>".
 *
 * Blocks not in this map are purely visual — no wiring needed.
 */
export type BlockModuleMapping = {
  /** The premade block ID */
  blockId: string;
  /** The module ID to suggest installing */
  moduleId: string;
  /** What the block can do once connected (the modal's first line). */
  purpose: string;
  /** What "Connect it" adds and connects when the app doesn't have the module yet. */
  description: string;
  /** What "Connect it" does when the app already has the module. */
  existing: string;
  /** The module's flow slugs the block uses, as the module definition names them. */
  flowRefs: string[];
  /** The module installs its flows under their own names ("login"), not "<module>-<slug>". */
  bareSlugs?: boolean;
  /** Starting rows for the module's tables: the block's own sample items, so a list looks the same once connected. */
  seed?: Record<string, Array<Record<string, string | number | boolean>>>;
};

const contactForm = (blockId: string, kept = ""): BlockModuleMapping => ({
  blockId,
  moduleId: "contact-form",
  purpose: "This form can save the messages people send you.",
  description: `adds a table for the messages${kept} and the automation that saves them, and connects this form to it.`,
  existing: "connects this form to the messages table your app already has.",
  flowRefs: ["submit"],
});

const newsletter = (blockId: string): BlockModuleMapping => ({
  blockId,
  moduleId: "newsletter",
  purpose: "This form can save the email address of everyone who signs up.",
  description: "adds a table for subscribers and the automation that saves each signup, and connects this form to it.",
  existing: "connects this form to the subscriber list your app already has.",
  flowRefs: ["subscribe"],
});

export const BLOCK_MODULE_MAP: BlockModuleMapping[] = [
  contactForm("nk-form-contact"),
  contactForm("nk-contact-form"),
  contactForm("nk-litho-contact-modern", " (name, email and message; the mobile number isn't kept)"),
  newsletter("nk-newsletter"),
  newsletter("nk-litho-footer-newsletter"),
  {
    blockId: "nk-testimonials",
    moduleId: "testimonials",
    purpose: "This section can show testimonials you keep in your app's data, so you can change them without editing the page.",
    description: "adds a testimonials table, starting with the three quotes shown here, and connects this section to it. Add or change quotes in Data.",
    existing: "connects this section to the testimonials your app already has.",
    flowRefs: ["feed"],
    // The feed lists the newest first, so the rows go in last to first.
    seed: {
      items: [
        { author: "Priya S.", role: "First-time customer", quote: "Booking was easy and everything was ready on time. Highly recommended." },
        { author: "Devon K.", role: "Customer since 2021", quote: "They went out of their way to help. You can tell they really care." },
        { author: "Maya R.", role: "Regular customer", quote: "Friendly, quick and great value. I wouldn’t go anywhere else." },
      ],
    },
  },
  {
    blockId: "nk-reviews",
    moduleId: "reviews",
    purpose: "This section can show reviews you keep in your app's data.",
    description: "adds a reviews table, starting with the three reviews shown here, and connects this section to it. Only reviews marked approved are shown; manage them in Data.",
    existing: "connects this section to the approved reviews your app already has.",
    flowRefs: ["approved"],
    seed: {
      reviews: [
        { reviewer_name: "Alexa Harvard", rating: 5, approved: true, comment: "Easy to work with and delivered amazing results in a very short timeframe. Highly recommend their services." },
        { reviewer_name: "Shoko Mugikura", rating: 5, approved: true, comment: "Professional support and energy throughout the entire project. Truly a collaborative and creative process." },
        { reviewer_name: "Jacob Kalling", rating: 5, approved: true, comment: "Exceptional quality and outstanding service. The team went above and beyond to deliver a perfect result." },
      ],
    },
  },
  {
    blockId: "nk-team-grid",
    moduleId: "team",
    purpose: "This grid can show the team members you keep in your app's data.",
    description: "adds a team table, starting with the four people shown here, and connects this grid to it. Add or change people in Data.",
    existing: "connects this grid to the team members your app already has.",
    flowRefs: ["feed"],
    seed: {
      members: [
        { name: "Jeremy Dupont", role: "Executive Officer" },
        { name: "Jessica Dover", role: "Vice President" },
        { name: "Matthew Taylor", role: "Financial Officer" },
        { name: "Daniel James", role: "People Officer" },
      ],
    },
  },
  {
    blockId: "nk-faq-accordion",
    moduleId: "faq",
    purpose: "This list can show questions and answers you keep in your app's data.",
    description: "adds a questions table, starting with the four questions shown here, and connects this list to it. Add or change questions in Data.",
    existing: "connects this list to the questions your app already has.",
    flowRefs: ["feed"],
    seed: {
      items: [
        { sort_order: 1, question: "How do I get started?", answer: "Simply sign up for a free account, choose your plan, and you can start building right away. No credit card required for the trial period." },
        { sort_order: 2, question: "Can I upgrade or downgrade my plan?", answer: "Yes, you can change your plan at any time. Changes take effect at the start of your next billing cycle." },
        { sort_order: 3, question: "What kind of support do you offer?", answer: "We offer email support for all plans, live chat for Standard plans, and a dedicated account manager for Premium customers." },
        { sort_order: 4, question: "Is there a free trial available?", answer: "Absolutely! Every new account gets a 14-day free trial with full access to all features. No credit card needed." },
      ],
    },
  },
  {
    blockId: "nk-image-gallery",
    moduleId: "gallery",
    purpose: "This gallery can show photos you keep in your app's data.",
    description: "adds a photos table, starting with the five titles shown here, and connects this gallery to it. Add each picture's web address in Data.",
    existing: "connects this gallery to the photos your app already has.",
    flowRefs: ["feed"],
    seed: {
      photos: [
        { title: "Illustration" },
        { title: "Web design" },
        { title: "Photography" },
        { title: "Branding" },
        { title: "Featured project" },
      ],
    },
  },
  {
    blockId: "nk-litho-news-cards",
    moduleId: "blog",
    purpose: "These cards can show the latest posts you keep in your app's data.",
    description: "adds a posts table, starting with the three posts shown here, and connects these cards to it. Only published posts are shown; add or change posts in Data.",
    existing: "connects these cards to the posts your app already has.",
    flowRefs: ["feed"],
    seed: {
      posts: [
        { title: "Online website builder", slug: "online-website-builder", published: true },
        { title: "Beautiful layouts design", slug: "beautiful-layouts-design", published: true },
        { title: "Build perfect websites", slug: "build-perfect-websites", published: true },
      ],
    },
  },
  {
    blockId: "nk-services-grid",
    moduleId: "service-menu",
    purpose: "This grid can show the services you keep in your app's data.",
    description: "adds a services table, starting with the three services shown here, and connects this grid to it. Add or change services in Data.",
    existing: "connects this grid to the services your app already has.",
    flowRefs: ["feed"],
    seed: {
      services: [
        { name: "Web Development", price: 2500, description: "Custom websites and web applications built with modern technologies." },
        { name: "Brand Design", price: 1800, description: "Complete brand identity from logo design to full style guidelines." },
        { name: "Digital Marketing", price: 1200, description: "SEO, social media, and paid advertising strategies that convert." },
      ],
    },
  },
  {
    blockId: "nk-litho-login-form",
    moduleId: "auth",
    purpose: "These forms can sign people in and create new accounts.",
    description: "adds accounts, sign-in and sign-up to your app, and connects both forms to them.",
    existing: "connects both forms to your app's sign-in and accounts.",
    flowRefs: ["login", "register"],
    bareSlugs: true,
  },
];

export function getModuleForBlock(blockId: string): BlockModuleMapping | undefined {
  return BLOCK_MODULE_MAP.find((m) => m.blockId === blockId);
}

/** The slug a module flow gets when installed: "contact-form-submit", or "login" for bare modules. */
export function installedFlowSlug(mapping: BlockModuleMapping, ref: string): string {
  return mapping.bareSlugs ? ref : `${mapping.moduleId}-${ref}`;
}

/** Block attribute naming a flow by slug → the attribute published pages read the flow id from. */
const REF_ATTRS: Array<[string, string]> = [
  ["data-nk-flow-ref", "data-nk-flow"],
  ["data-nk-connect-list", "data-nk-bind-flow"],
];

/**
 * Points a dropped block's forms and lists at real flows: every
 * data-nk-flow-ref / data-nk-connect-list whose slug is in `flowIds`
 * (installed slug → flow id) becomes data-nk-flow / data-nk-bind-flow.
 * Returns the parts that changed.
 */
export function connectBlock(components: Component[], flowIds: Record<string, string>): Component[] {
  const changed: Component[] = [];
  for (const root of components) {
    root.onAll((c) => {
      const attrs = (c.get("attributes") ?? {}) as Record<string, unknown>;
      for (const [refAttr, idAttr] of REF_ATTRS) {
        const slug = attrs[refAttr];
        const id = typeof slug === "string" ? flowIds[slug] : undefined;
        if (!id) continue;
        c.removeAttributes(refAttr);
        c.addAttributes({ [idAttr]: id });
        if (!changed.includes(c)) changed.push(c);
      }
    });
  }
  return changed;
}
