import type { StarterTemplate, TemplateSummary } from "./types";
import { TEMPLATE_STORE } from "./store";

import "./originals/index-a";
import "./originals/index-b";

// Auto-generated imports

export { registerTemplate } from "./store";

export function getTemplate(id: string): StarterTemplate | undefined {
  return TEMPLATE_STORE.find((t) => t.id === id);
}
export function listTemplates(): StarterTemplate[] {
  return TEMPLATE_STORE;
}
export function listTemplateSummaries(): TemplateSummary[] {
  return TEMPLATE_STORE.map((t) => ({
    id: t.id, name: t.name, tagline: t.tagline, category: t.category,
    tags: t.tags, pageCount: t.pages.length, preview: `/templates/${t.id}.jpg`,
  }));
}
export function findTemplateForPrompt(prompt: string): StarterTemplate | null {
  const lower = prompt.toLowerCase();
  let best: StarterTemplate | null = null;
  let bestScore = 0;
  for (const t of TEMPLATE_STORE) {
    let score = 0;
    const haystack = [t.name, t.tagline, t.category, ...t.tags].join(" ").toLowerCase();
    for (const word of lower.split(/\s+/)) {
      if (word.length < 3) continue;
      if (haystack.includes(word)) score++;
    }
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return bestScore >= 2 ? best : null;
}
