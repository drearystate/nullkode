import type { ModuleDefinition } from "./types";

// --- Original 31 ---
import { contactForm } from "./definitions/contact-form";
import { newsletter } from "./definitions/newsletter";
import { blog } from "./definitions/blog";
import { bookings } from "./definitions/bookings";
import { gallery } from "./definitions/gallery";
import { reviews } from "./definitions/reviews";
import { chat } from "./definitions/chat";
import { shop } from "./definitions/shop";
import { catalog } from "./definitions/catalog";
import { menu } from "./definitions/menu";
import { coupons } from "./definitions/coupons";
import { pricing } from "./definitions/pricing";
import { faq } from "./definitions/faq";
import { knowledgeBase } from "./definitions/knowledge-base";
import { timeline } from "./definitions/timeline";
import { portfolio } from "./definitions/portfolio";
import { testimonials } from "./definitions/testimonials";
import { classifieds } from "./definitions/classifieds";
import { jobs } from "./definitions/jobs";
import { team } from "./definitions/team";
import { fanwall } from "./definitions/fanwall";
import { events } from "./definitions/events";
import { appointments } from "./definitions/appointments";
import { survey } from "./definitions/survey";
import { quiz } from "./definitions/quiz";
import { audio } from "./definitions/audio";
import { video } from "./definitions/video";
import { radio } from "./definitions/radio";
import { links } from "./definitions/links";
import { places } from "./definitions/places";
import { waitlist } from "./definitions/waitlist";

// --- New 30 ---
// Personal productivity
import { todo } from "./definitions/todo";
import { habitTracker } from "./definitions/habit-tracker";
import { journal } from "./definitions/journal";
import { notes } from "./definitions/notes";
import { readingList } from "./definitions/reading-list";
// Business / ops
import { invoice } from "./definitions/invoice";
import { expenses } from "./definitions/expenses";
import { leads } from "./definitions/leads";
import { helpDesk } from "./definitions/help-desk";
import { kanban } from "./definitions/kanban";
import { featureVoting } from "./definitions/feature-voting";
// Commerce / services
import { wishlist } from "./definitions/wishlist";
import { serviceMenu } from "./definitions/service-menu";
import { quoteRequest } from "./definitions/quote-request";
import { subscription } from "./definitions/subscription";
import { giftRegistry } from "./definitions/gift-registry";
// Media / content
import { podcast } from "./definitions/podcast";
import { recipes } from "./definitions/recipes";
import { course } from "./definitions/course";
// Community
import { guestbook } from "./definitions/guestbook";
import { forum } from "./definitions/forum";
import { polls } from "./definitions/polls";
import { petitions } from "./definitions/petitions";
// Real estate
import { properties } from "./definitions/properties";
import { rentals } from "./definitions/rentals";
// Family / life
import { choreChart } from "./definitions/chore-chart";
import { weddingRsvp } from "./definitions/wedding-rsvp";
import { budget } from "./definitions/budget";
// AI + Utility
import { aiAssistant } from "./definitions/ai-assistant";
import { emergencyContacts } from "./definitions/emergency-contacts";

// --- Wave 3: advanced features ---
import { weather } from "./definitions/weather";
import { map } from "./definitions/map";
import { linkTracker } from "./definitions/link-tracker";
import { realtimeChat } from "./definitions/realtime-chat";
import { fileUpload } from "./definitions/file-upload";
import { qrScanner } from "./definitions/qr-scanner";
import { stripeCheckout } from "./definitions/stripe-checkout";
import { passwordVault } from "./definitions/password-vault";
import { pushNotifications } from "./definitions/push-notifications";

// --- Wave 4: integrated verticals ---
import { foodTruckFinder } from "./definitions/food-truck-finder";

// --- Wave 5: module composition + more modules ---
import { auth } from "./definitions/auth";
import { userFavorites } from "./definitions/user-favorites";
import { userProfileCard } from "./definitions/user-profile-card";
import { donations } from "./definitions/donations";
import { lostFound } from "./definitions/lost-found";
import { loyaltyCard } from "./definitions/loyalty-card";

// --- Wave 6: 30 new modules ---
// Tier 1 — broad utility
import { eSignature } from "./definitions/e-signature";
import { emailVerify } from "./definitions/email-verify";
import { twoFactor } from "./definitions/two-factor";
import { inbox } from "./definitions/inbox";
import { referrals } from "./definitions/referrals";
import { reminders } from "./definitions/reminders";
import { tags } from "./definitions/tags";
import { analyticsDashboard } from "./definitions/analytics-dashboard";
import { webhooksIn } from "./definitions/webhooks-in";
import { sms } from "./definitions/sms";
// Tier 2 — vertical / business
import { marketplace } from "./definitions/marketplace";
import { inventory } from "./definitions/inventory";
import { eWallet } from "./definitions/e-wallet";
import { eventTickets } from "./definitions/event-tickets";
import { queue } from "./definitions/queue";
import { gym } from "./definitions/gym";
import { deliveryTracking } from "./definitions/delivery-tracking";
import { whatsappOrder } from "./definitions/whatsapp-order";
import { phonebook } from "./definitions/phonebook";
import { claims } from "./definitions/claims";
// Tier 3 — content / UX
import { slider } from "./definitions/slider";
import { beforeAfter } from "./definitions/before-after";
import { pdfEmbed } from "./definitions/pdf-embed";
import { statusPage } from "./definitions/status-page";
import { routes } from "./definitions/routes";
import { birthdays } from "./definitions/birthdays";
import { scratchCard } from "./definitions/scratch-card";
import { paywall } from "./definitions/paywall";
import { archive } from "./definitions/archive";
import { shareApp } from "./definitions/share-app";

// --- Wave 7: 19 BuildFire-inspired modules ---
// Tier A — broad composable utility
import { reactions } from "./definitions/reactions";
import { scheduledContent } from "./definitions/scheduled-content";
import { dripContent } from "./definitions/drip-content";
import { acknowledgments } from "./definitions/acknowledgments";
import { leaderboard } from "./definitions/leaderboard";
import { dynamicList } from "./definitions/dynamic-list";
import { countdown } from "./definitions/countdown";
import { webview } from "./definitions/webview";
import { rssReader } from "./definitions/rss-reader";
// Tier B — vertical / specific
import { geofencer } from "./definitions/geofencer";
import { personalizedDashboard } from "./definitions/personalized-dashboard";
import { tableReservations } from "./definitions/table-reservations";
import { memberIdCard } from "./definitions/member-id-card";
import { mediaPlaylist } from "./definitions/media-playlist";
import { calculatorBuilder } from "./definitions/calculator-builder";
import { businessCardWallet } from "./definitions/business-card-wallet";
import { nutritionTracker } from "./definitions/nutrition-tracker";
import { projectPortfolio } from "./definitions/project-portfolio";
import { purchaseOrder } from "./definitions/purchase-order";

// --- Wave 8: GoodBarber/Mobiroller-inspired adds ---
import { appWalkthrough } from "./definitions/app-walkthrough";
import { abandonedCart } from "./definitions/abandoned-cart";
import { submissionsQueue } from "./definitions/submissions-queue";
import { storeLocator } from "./definitions/store-locator";
import { deliveryZones } from "./definitions/delivery-zones";
import { liveStream } from "./definitions/live-stream";
import { channelFeed } from "./definitions/channel-feed";
import { inAppAds } from "./definitions/in-app-ads";
import { userGroups } from "./definitions/user-groups";

export const MODULE_REGISTRY: ModuleDefinition[] = [
  // Foundation
  auth,
  // Integrated verticals (showcase big multi-capability modules)
  foodTruckFinder,
  // Communication / content
  contactForm,
  newsletter,
  waitlist,
  blog,
  faq,
  knowledgeBase,
  timeline,
  portfolio,
  testimonials,
  guestbook,
  // Commerce
  shop,
  catalog,
  menu,
  pricing,
  coupons,
  wishlist,
  giftRegistry,
  subscription,
  serviceMenu,
  quoteRequest,
  bookings,
  appointments,
  invoice,
  expenses,
  properties,
  rentals,
  stripeCheckout,
  // Community
  chat,
  realtimeChat,
  fanwall,
  forum,
  reviews,
  classifieds,
  jobs,
  team,
  polls,
  petitions,
  featureVoting,
  pushNotifications,
  // Events / productivity
  events,
  survey,
  quiz,
  todo,
  habitTracker,
  journal,
  notes,
  readingList,
  kanban,
  leads,
  helpDesk,
  budget,
  choreChart,
  weddingRsvp,
  passwordVault,
  // Media
  gallery,
  audio,
  video,
  radio,
  podcast,
  recipes,
  course,
  // AI
  aiAssistant,
  // Utility
  links,
  places,
  emergencyContacts,
  weather,
  map,
  linkTracker,
  fileUpload,
  qrScanner,
  // Composition demos + standalone additions
  userFavorites,
  userProfileCard,
  donations,
  lostFound,
  loyaltyCard,
  // Wave 6 — Tier 1 (broad utility)
  eSignature,
  emailVerify,
  twoFactor,
  inbox,
  referrals,
  reminders,
  tags,
  analyticsDashboard,
  webhooksIn,
  sms,
  // Wave 6 — Tier 2 (vertical / business)
  marketplace,
  inventory,
  eWallet,
  eventTickets,
  queue,
  gym,
  deliveryTracking,
  whatsappOrder,
  phonebook,
  claims,
  // Wave 6 — Tier 3 (content / UX)
  slider,
  beforeAfter,
  pdfEmbed,
  statusPage,
  routes,
  birthdays,
  scratchCard,
  paywall,
  archive,
  shareApp,
  // Wave 7 — Tier A (broad composable utility)
  reactions,
  scheduledContent,
  dripContent,
  acknowledgments,
  leaderboard,
  dynamicList,
  countdown,
  webview,
  rssReader,
  // Wave 7 — Tier B (vertical / specific)
  geofencer,
  personalizedDashboard,
  tableReservations,
  memberIdCard,
  mediaPlaylist,
  calculatorBuilder,
  businessCardWallet,
  nutritionTracker,
  projectPortfolio,
  purchaseOrder,
  // Wave 8 — GoodBarber/Mobiroller-inspired
  appWalkthrough,
  abandonedCart,
  submissionsQueue,
  storeLocator,
  deliveryZones,
  liveStream,
  channelFeed,
  inAppAds,
  userGroups,
];

export function getModule(id: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.id === id);
}

/** Serializable module summary for the gallery page (no flow internals) */
export type ModuleSummary = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  tableCount: number;
  flowCount: number;
  pageCount: number;
  config: ModuleDefinition["config"];
  provides: string[];
  requires: string[];
  worksWith: string[];
  preview: string | null;
};

/**
 * A picture for each module's card: the preview of the starter template
 * closest in spirit (all of these files ship in public/templates/).
 */
const MODULE_PREVIEWS: Record<string, string> = {
  "blog": "/templates/original-creative.jpg",
  "menu": "/templates/original-restaurant.jpg",
  "recipes": "/templates/original-restaurant.jpg",
  "reviews": "/templates/original-restaurant.jpg",
  "bookings": "/templates/original-beauty.jpg",
  "loyalty-card": "/templates/original-beauty.jpg",
  "service-menu": "/templates/original-beauty.jpg",
  "appointments": "/templates/original-health.jpg",
  "shop": "/templates/original-ecommerce.jpg",
  "stripe-checkout": "/templates/original-ecommerce.jpg",
  "subscription": "/templates/original-ecommerce.jpg",
  "gallery": "/templates/original-portfolio.jpg",
  "portfolio": "/templates/original-portfolio.jpg",
  "team": "/templates/original-corporate.jpg",
  "jobs": "/templates/original-corporate.jpg",
  "help-desk": "/templates/original-corporate.jpg",
  "kanban": "/templates/original-corporate.jpg",
  "todo": "/templates/original-corporate.jpg",
  "auth": "/templates/original-corporate.jpg",
  "forum": "/templates/original-nonprofit.jpg",
  "faq": "/templates/original-corporate.jpg",
  "events": "/templates/original-hospitality.jpg",
  "wedding-rsvp": "/templates/original-hospitality.jpg",
  "gift-registry": "/templates/original-hospitality.jpg",
  "rentals": "/templates/original-hospitality.jpg",
  "course": "/templates/original-education.jpg",
  "quiz": "/templates/original-education.jpg",
  "donations": "/templates/original-nonprofit.jpg",
  "properties": "/templates/original-realestate.jpg",
  "podcast": "/templates/original-creative.jpg",
  "radio": "/templates/original-creative.jpg",
  "video": "/templates/original-creative.jpg",
  "notes": "/templates/original-creative.jpg",
  "journal": "/templates/original-creative.jpg",
  "newsletter": "/templates/original-saas.jpg",
  "waitlist": "/templates/original-saas.jpg",
  "chat": "/templates/original-saas.jpg",
  "realtime-chat": "/templates/original-saas.jpg",
  "pricing": "/templates/original-saas.jpg",
  "testimonials": "/templates/original-saas.jpg",
  "contact-form": "/templates/original-saas.jpg",
  "leads": "/templates/original-saas.jpg",
  "survey": "/templates/original-saas.jpg",
  "polls": "/templates/original-saas.jpg",
  "invoice": "/templates/original-finance.jpg",
  "expenses": "/templates/original-finance.jpg",
  "budget": "/templates/original-finance.jpg",
  "weather": "/templates/original-travel.jpg",
  "map": "/templates/original-travel.jpg",
  "places": "/templates/original-travel.jpg",
  "food-truck-finder": "/templates/original-food.jpg",
};

function modulePreview(id: string, category: string): string | null {
  if (MODULE_PREVIEWS[id]) return MODULE_PREVIEWS[id];
  const categoryFallbacks: Record<string, string> = {
    communication: "/templates/original-saas.jpg",
    content: "/templates/original-creative.jpg",
    media: "/templates/original-creative.jpg",
    commerce: "/templates/original-ecommerce.jpg",
    productivity: "/templates/original-corporate.jpg",
    community: "/templates/original-nonprofit.jpg",
    utility: "/templates/original-corporate.jpg",
  };
  return categoryFallbacks[category] ?? null;
}

export function listModuleSummaries(): ModuleSummary[] {
  return MODULE_REGISTRY.map((m) => ({
    id: m.id,
    name: m.name,
    tagline: m.tagline,
    description: m.description,
    icon: m.icon,
    color: m.color,
    category: m.category,
    tableCount: m.tables.length,
    flowCount: m.flows.length,
    pageCount: m.pages.length,
    config: m.config,
    provides: (m.provides ?? []) as string[],
    requires: (m.requires ?? []) as string[],
    worksWith: m.worksWith ?? [],
    preview: modulePreview(m.id, m.category),
  }));
}

/**
 * Given a list of module ids already installed in a project, return a
 * map of moduleId → capabilities provided. Used by the gallery UI to
 * check whether a candidate module's `requires` are satisfied.
 */
export function providedCapabilities(installedIds: string[]): Set<string> {
  const set = new Set<string>();
  for (const id of installedIds) {
    const m = getModule(id);
    if (!m) continue;
    for (const c of m.provides ?? []) set.add(c);
  }
  return set;
}
