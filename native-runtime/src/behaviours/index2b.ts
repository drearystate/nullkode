import type { Behaviour } from "../render/behaviours";
import { CALENDAR_BEHAVIOURS } from "./calendar";
import { CART_BEHAVIOURS } from "./cart";
import { CHART_BEHAVIOURS } from "./chart";
import { LOCALE_BEHAVIOURS } from "./locale";
import { MAP_BEHAVIOURS } from "./map";
import { PUSH_BEHAVIOURS } from "./push";
import { QR_BEHAVIOURS } from "./qr";
import { RADIO_BEHAVIOURS } from "./radio";

/**
 * Phase 2B behaviours (cart and checkout, maps, calendars, charts, QR,
 * push, radio, languages), registered in render/behaviours.ts. Anchors
 * (in-page links) live in anchors.tsx and are wired by PageScreen and
 * Node.tsx, not by an attribute.
 */
export const BEHAVIOURS_2B: Behaviour[] = [
  ...CART_BEHAVIOURS,
  ...CALENDAR_BEHAVIOURS,
  ...CHART_BEHAVIOURS,
  ...MAP_BEHAVIOURS,
  ...QR_BEHAVIOURS,
  ...PUSH_BEHAVIOURS,
  ...RADIO_BEHAVIOURS,
  ...LOCALE_BEHAVIOURS,
];
