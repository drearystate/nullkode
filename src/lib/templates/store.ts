import type { StarterTemplate } from "./types";

/**
 * Internal template array. Templates push themselves here via
 * registerTemplate(). Separated from registry.ts to break circular imports.
 */
export const TEMPLATE_STORE: StarterTemplate[] = [];

export function registerTemplate(t: StarterTemplate) {
  TEMPLATE_STORE.push(t);
}
