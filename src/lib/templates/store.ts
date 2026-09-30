import type { StarterTemplate } from "./types";
import { withGeneratedTemplateImages } from "../assets/generated";

/**
 * Internal template array. Templates push themselves here via
 * registerTemplate(). Separated from registry.ts to break circular imports.
 */
export const TEMPLATE_STORE: StarterTemplate[] = [];

export function registerTemplate(t: StarterTemplate) {
  if (t.source === "original") {
    for (const page of t.pages) {
      page.html = withGeneratedTemplateImages(page.html);
      page.css = withGeneratedTemplateImages(page.css);
    }
    for (const tables of Object.values(t.moduleSeeds ?? {})) {
      for (const rows of Object.values(tables)) {
        for (const row of rows) {
          for (const [key, value] of Object.entries(row)) {
            if (typeof value === "string") row[key] = withGeneratedTemplateImages(value);
          }
        }
      }
    }
  }
  TEMPLATE_STORE.push(t);
}
