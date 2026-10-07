import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { designRoot } from "./design";

/**
 * Art direction (the owner's standard, nk-games/design/ART-DIRECTION.md):
 * every game gets a stored VISUAL SPEC made at the brief (camera, palette,
 * shapes, materials, lighting, density, interface, motion) and the plan
 * (the compatible asset subset and scale notes); every step prompt carries
 * the condensed standard below plus that spec; the review passes
 * (playtest.ts) judge the rendered game against the spec and the full
 * standard's SELF-REVIEW questions.
 */

/** The standard, condensed for every step (~600 tokens). The full file goes to the review pass. */
export const ART_STANDARD = `ART DIRECTION STANDARD (the owner's; this game must look finished on the FIRST pass):
- Follow the game's VISUAL SPEC below in every step: its camera, palette (use the hex values for backgrounds, tints, HUD and text), shape language, materials, lighting, density, interface style and motion. Never drift to a generic default look.
- Asset coherence: use only the spec's compatible asset subset; normalise scale (one consistent pixel/unit size for characters vs tiles vs props), orientation, colour and material treatment. Same author does not mean compatible: never mix style families. Recognisable finished assets for everything important; primitives only where they fit the look, never as unexplained placeholders.
- Composition: a clear hierarchy (gameplay focus > supporting environment > background > interface). The first view is readable and inviting. Detail comes from purposeful grouping, layering and controlled variation (large forms, medium details, small accents at play scale). No arbitrary prop scattering, uniform spacing, accidental empty areas, or clutter over gameplay; empty space is intentional.
- Rendering: 2D = one resolution and line weight, clean edges, layered parallax/depth, animation on everything that moves. 3D = consistent scale, grounded objects with contact shadows, readable silhouettes, lighting that matches the spec. Effects (particles, shake, flashes, bloom) reinforce gameplay, never disguise an unfinished scene.
- Interface: HUD, menu text, icons, typography and touch controls are one system with the world (spec colours, consistent spacing, alignment, contrast, sizes). No generic default styling.
- Feedback: every important action (selection, success, damage, failure, state change) has immediate, proportionate animation + sound.
- Scope: a smaller, thoroughly finished game beats a bigger inconsistent one; keep the requested mechanics. Each step leaves what it touches visually finished (art, layout, animation, feedback): never "placeholder now, polish later".`;

export type VisualSpec = {
  camera?: string;
  palette?: Array<{ hex: string; role: string }>;
  shapes?: string;
  materials?: string;
  lighting?: string;
  density?: string;
  ui?: string;
  motion?: string;
  /** The compatible asset subset and scale normalisation (from the plan). */
  assets?: string;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Cleans an AI-written spec: short strings, real hex colours, at most 8 swatches. Null when empty. */
export function cleanSpec(v: unknown): VisualSpec | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const str = (k: string, max = 220) => (typeof o[k] === "string" ? (o[k] as string).replace(/\s+/g, " ").trim().slice(0, max) : undefined);
  const palette = Array.isArray(o.palette)
    ? (o.palette as unknown[])
        .map((p) => (p && typeof p === "object" ? (p as Record<string, unknown>) : typeof p === "string" ? { hex: p, role: "" } : null))
        .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p!.hex === "string" && HEX.test(String(p!.hex).trim()))
        .slice(0, 8)
        .map((p) => ({ hex: String(p.hex).trim().toLowerCase(), role: String(p.role ?? "").slice(0, 40) }))
    : [];
  const spec: VisualSpec = { camera: str("camera"), palette, shapes: str("shapes"), materials: str("materials"), lighting: str("lighting"), density: str("density"), ui: str("ui"), motion: str("motion"), assets: str("assets", 500) };
  const filled = Object.entries(spec).some(([k, x]) => (k === "palette" ? (x as unknown[]).length > 0 : Boolean(x)));
  return filled ? spec : null;
}

/** The spec as prompt text (one line per part). */
export function specText(spec: VisualSpec | null | undefined): string {
  if (!spec) return "";
  const lines = [
    spec.camera && `Camera: ${spec.camera}`,
    spec.palette?.length && `Palette: ${spec.palette.map((p) => `${p.hex}${p.role ? ` ${p.role}` : ""}`).join(", ")}`,
    spec.shapes && `Shape language: ${spec.shapes}`,
    spec.materials && `Materials: ${spec.materials}`,
    spec.lighting && `Lighting: ${spec.lighting}`,
    spec.density && `Environment density: ${spec.density}`,
    spec.ui && `Interface style: ${spec.ui}`,
    spec.motion && `Motion: ${spec.motion}`,
    spec.assets && `Asset subset and scale: ${spec.assets}`,
  ].filter(Boolean);
  return lines.length ? `VISUAL SPEC (this game's art direction; apply it consistently):\n${lines.join("\n")}` : "";
}

/** The full standard (for the review pass), or the condensed one without the playbook. */
export function fullStandard(): string {
  const file = path.join(designRoot(), "ART-DIRECTION.md");
  try {
    statSync(file);
    return readFileSync(file, "utf8").trim();
  } catch {
    return ART_STANDARD;
  }
}

/** The "3D look" card (nk-games/design/3D-LOOK.md, from the 3D showcase builds), or "" until it exists. */
export function look3dCard(): string {
  try {
    return readFileSync(path.join(designRoot(), "3D-LOOK.md"), "utf8").trim();
  } catch {
    return "";
  }
}
