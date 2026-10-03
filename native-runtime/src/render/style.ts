import { Platform } from "react-native";
import type { NativeStyle } from "../spec";
import type { RenderContext } from "./context";

/** Generic families on each platform ("serif" is Android's name; iOS has Georgia). */
const GENERIC: Record<string, Record<string, string>> = {
  serif: { ios: "Georgia", android: "serif", web: "Georgia, 'Times New Roman', serif", default: "serif" },
  monospace: { ios: "Courier", android: "monospace", web: "ui-monospace, Menlo, Consolas, monospace", default: "monospace" },
};

type Style = Record<string, unknown>;

/**
 * A spec style as a React Native style: vh sizes in points, font keys that
 * failed to load dropped (system font), and on the web the background
 * gradient under its CSS name.
 */
export function toStyle(style: NativeStyle | undefined, vh: Record<string, number> | undefined, ctx: Pick<RenderContext, "fonts" | "screenHeight">): Style {
  const out: Style = { ...(style ?? {}) };
  if (vh) for (const [k, v] of Object.entries(vh)) out[k] = Math.round((v * ctx.screenHeight) / 100);
  const ff = out.fontFamily as string | undefined;
  if (ff) {
    const font = ctx.fonts.get(ff);
    if (GENERIC[ff]) out.fontFamily = GENERIC[ff][Platform.OS] ?? GENERIC[ff].default;
    else if (!font) {
      delete out.fontFamily;
    } else if (Platform.OS === "web") {
      // The browser has the faces under their family name with weight and
      // style descriptors (App.loadFonts), so text in other scripts that
      // falls back to a system font keeps its weight too.
      out.fontFamily = `"${font.family}"`;
      if (out.fontWeight !== "bold") out.fontWeight = String(font.weight);
      if (out.fontStyle !== "italic") out.fontStyle = font.style;
    }
  }
  if (Platform.OS === "web") {
    if (out.experimental_backgroundImage) {
      out.backgroundImage = out.experimental_backgroundImage;
      delete out.experimental_backgroundImage;
    }
  }
  return out;
}

/** Text props only (for the text inside a pressable box). */
export const TEXT_PROPS = new Set([
  "color",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textTransform",
  "textDecorationLine",
  "textDecorationColor",
  "textShadowColor",
  "textShadowOffset",
  "textShadowRadius",
  "writingDirection",
]);
