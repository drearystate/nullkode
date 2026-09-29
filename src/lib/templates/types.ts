import type { ProjectTheme } from "../theme";

export type TemplateCategory =
  | "saas"
  | "restaurant"
  | "portfolio"
  | "corporate"
  | "ecommerce"
  | "health"
  | "creative"
  | "hospitality"
  | "education"
  | "fitness"
  | "nonprofit"
  | "personal"
  | "finance"
  | "beauty"
  | "realestate"
  | "travel"
  | "legal"
  | "food";

export type StarterTemplate = {
  /** Unique ID, kebab-case (e.g. "crafto-startup") */
  id: string;
  /** Human-friendly name shown in the gallery */
  name: string;
  /** One-line description */
  tagline: string;
  /** Primary industry category */
  category: TemplateCategory;
  /** Additional tags for search */
  tags: string[];
  /** Source: which purchased template pack it came from */
  source: "crafto" | "litho" | "original";
  /** Theme preset to apply when this template is used */
  theme: ProjectTheme;
  /**
   * Module IDs to auto-install when this template is used. Each module
   * creates its tables, flows, and pages — giving the template a working
   * backend out of the box. E.g., ["auth", "menu", "bookings", "contact-form"].
   */
  modules: string[];
  /**
   * Sample rows that replace a module's own seed data, keyed by module ID and
   * then by the module's table name (as written in its definition), e.g.
   * { shop: { products: [{ name: "Speckled mug", price: 28, ... }] } }.
   * Tables not listed keep the module's defaults.
   */
  moduleSeeds?: Record<string, Record<string, Array<Record<string, string | number | boolean | null>>>>;
  /**
   * Pages in this template. Each page is a complete HTML body
   * using var(--nk-*) tokens — no hardcoded colors. The AI scaffold
   * can also reference these as starting points.
   */
  pages: Array<{
    title: string;
    slug: string;
    isHome: boolean;
    html: string;
    css: string;
  }>;
};

export type TemplateSummary = {
  id: string;
  name: string;
  tagline: string;
  category: TemplateCategory;
  tags: string[];
  pageCount: number;
  /** Preview image path relative to /public (e.g. "/templates/crafto-startup.jpg") */
  preview: string | null;
};
