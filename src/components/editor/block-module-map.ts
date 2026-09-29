/**
 * Maps premade block IDs to the module that powers their backend.
 * When a user drops one of these blocks onto the canvas, we offer
 * to install the matching module (skipPages — just tables + flows)
 * and auto-wire the block's data-nk-flow-ref to the module's flows.
 *
 * Blocks not in this map are purely visual — no wiring needed.
 */
export type BlockModuleMapping = {
  /** The premade block ID */
  blockId: string;
  /** The module ID to suggest installing */
  moduleId: string;
  /** Human-friendly description of what the module adds */
  description: string;
  /** The flow slug(s) the block expects (for auto-wiring after install) */
  flowRefs: string[];
};

export const BLOCK_MODULE_MAP: BlockModuleMapping[] = [
  {
    blockId: "nk-contact-form",
    moduleId: "contact-form",
    description: "Creates a messages table and a flow to receive form submissions. Your contact form will start collecting messages immediately.",
    flowRefs: ["submit-message"],
  },
  {
    blockId: "nk-litho-contact-modern",
    moduleId: "contact-form",
    description: "Creates a messages table and a flow to receive form submissions. Your contact form will start collecting messages immediately.",
    flowRefs: ["submit-message"],
  },
  {
    blockId: "nk-litho-contact-simple",
    moduleId: "contact-form",
    description: "Creates a messages table and a flow to receive form submissions. Your contact form will start collecting messages immediately.",
    flowRefs: ["submit-message"],
  },
  {
    blockId: "nk-newsletter",
    moduleId: "newsletter",
    description: "Creates a subscribers table and a flow to capture email signups. Visitors can subscribe from your page.",
    flowRefs: ["subscribe"],
  },
  {
    blockId: "nk-litho-footer-newsletter",
    moduleId: "newsletter",
    description: "Creates a subscribers table and a flow to capture email signups from the footer.",
    flowRefs: ["subscribe"],
  },
  {
    blockId: "nk-testimonials",
    moduleId: "testimonials",
    description: "Creates a testimonials table so you can manage quotes from the admin. The section will display real testimonials from your database.",
    flowRefs: ["list-testimonials"],
  },
  {
    blockId: "nk-reviews",
    moduleId: "reviews",
    description: "Creates a reviews table and submission flow. Visitors can leave reviews and they'll show up on your page.",
    flowRefs: ["submit-review", "list-reviews"],
  },
  {
    blockId: "nk-team-grid",
    moduleId: "team",
    description: "Creates a team members table so you can manage your team from the admin. The grid will display real team data.",
    flowRefs: ["list-members"],
  },
  {
    blockId: "nk-pricing-3col",
    moduleId: "pricing",
    description: "Creates a pricing plans table so you can manage tiers from the admin. The pricing section will display live data.",
    flowRefs: ["list-plans"],
  },
  {
    blockId: "nk-faq-accordion",
    moduleId: "faq",
    description: "Creates a FAQ table so you can manage questions from the admin. The accordion will display real FAQ entries.",
    flowRefs: ["list-faqs"],
  },
  {
    blockId: "nk-image-gallery",
    moduleId: "gallery",
    description: "Creates a gallery table and upload flow. Manage your images from the admin page.",
    flowRefs: ["list-images"],
  },
  {
    blockId: "nk-event-card",
    moduleId: "events",
    description: "Creates an events table and management flows. Your event section will display real upcoming events.",
    flowRefs: ["list-events"],
  },
  {
    blockId: "nk-litho-news-cards",
    moduleId: "blog",
    description: "Creates a posts table and management flows. The news section will display real blog posts.",
    flowRefs: ["list-posts"],
  },
  {
    blockId: "nk-services-grid",
    moduleId: "service-menu",
    description: "Creates a services table so you can manage your service offerings from the admin.",
    flowRefs: ["list-services"],
  },
  {
    blockId: "nk-litho-services-showcase",
    moduleId: "service-menu",
    description: "Creates a services table so you can manage your service offerings from the admin.",
    flowRefs: ["list-services"],
  },
  {
    blockId: "nk-litho-login-form",
    moduleId: "auth",
    description: "Creates the full authentication system — user accounts, login, register, and password reset.",
    flowRefs: ["login"],
  },
  {
    blockId: "nk-litho-video-section",
    moduleId: "video",
    description: "Creates a videos table so you can manage video embeds from the admin.",
    flowRefs: ["list-videos"],
  },
];

export function getModuleForBlock(blockId: string): BlockModuleMapping | undefined {
  return BLOCK_MODULE_MAP.find((m) => m.blockId === blockId);
}
