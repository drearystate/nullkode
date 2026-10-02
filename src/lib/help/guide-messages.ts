/**
 * The Help guides' text as translation messages (messages/<locale>/guides.json).
 *
 * guides.ts stays the English source. scripts/build-guide-messages.ts
 * (`pnpm guides:messages`) writes messages/en/guides.json from it, the
 * translation script translates that file like any other area, and
 * ./localized.ts lays the translations back over the guides.
 *
 * Keys: `<slug>.title`, `<slug>.summary`, `<slug>.sections.<n>.heading`,
 * `.body.<i>`, `.steps.<i>`, `.bullets.<i>`, `.shot.alt`, `.shot.caption`,
 * plus `groups.<id>` for the group titles. `{app}` stays as it is (an ICU
 * placeholder). **bold** is stored as <b>bold</b>, so the translation checks
 * (which compare {placeholders} and <tags>) make sure no bold is lost.
 */
import { GROUPS, allGuides, type Guide } from "./guides";

/** **bold** → <b>bold</b> (message form). */
export function toMessage(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

/** <b>bold</b> → **bold** (guide form). Null when the tags don't pair up. */
export function fromMessage(text: string): string | null {
  let open = false;
  let ok = true;
  const out = text.replace(/<(\/?)b>/g, (_m, close: string) => {
    if (Boolean(close) !== open) ok = false;
    open = !open;
    return "**";
  });
  if (!ok || open || /<\/?[A-Za-z][\w-]*>/.test(out)) return null;
  return out;
}

/** One guide's messages, flat: "sections.0.heading" → "Your dashboard" (no slug prefix). */
export function guideMessages(g: Guide): Record<string, string> {
  const out: Record<string, string> = { title: toMessage(g.title), summary: toMessage(g.summary) };
  g.sections.forEach((s, n) => {
    const at = `sections.${n}`;
    out[`${at}.heading`] = toMessage(s.heading);
    s.body.forEach((p, i) => (out[`${at}.body.${i}`] = toMessage(p)));
    s.steps?.forEach((p, i) => (out[`${at}.steps.${i}`] = toMessage(p)));
    s.bullets?.forEach((p, i) => (out[`${at}.bullets.${i}`] = toMessage(p)));
    if (s.screenshot) {
      out[`${at}.shot.alt`] = toMessage(s.screenshot.alt);
      out[`${at}.shot.caption`] = toMessage(s.screenshot.caption);
    }
  });
  return out;
}

/** Every guide message, flat with full keys ("getting-started.title", "groups.build"). */
export function allGuideMessages(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const group of GROUPS) out[`groups.${group.id}`] = toMessage(group.title);
  for (const g of allGuides()) for (const [k, v] of Object.entries(guideMessages(g))) out[`${g.slug}.${k}`] = v;
  return out;
}

type Tree = { [k: string]: string | Tree };

/** Flat keys → nested JSON, in the order given (the shape of messages/en/guides.json). */
export function nest(flat: Record<string, string>): Tree {
  const out: Tree = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split(".");
    let node = out;
    for (const p of parts.slice(0, -1)) {
      if (typeof node[p] !== "object") node[p] = {};
      node = node[p] as Tree;
    }
    node[parts[parts.length - 1]] = v;
  }
  return out;
}

/** Nested JSON → flat keys. */
export function flatten(t: Tree, pre = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) {
    const key = pre ? `${pre}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else if (v && typeof v === "object") Object.assign(out, flatten(v, key));
  }
  return out;
}
