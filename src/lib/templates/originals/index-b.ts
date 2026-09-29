// Original template set B. Each template lives in its own file and
// registers itself on import.
import saas from "./original-saas";
import corporate from "./original-corporate";
import finance from "./original-finance";
import legal from "./original-legal";
import education from "./original-education";
import nonprofit from "./original-nonprofit";
import portfolio from "./original-portfolio";
import creative from "./original-creative";
import personal from "./original-personal";

/**
 * Editor-safe CSS.
 *
 * The visual editor (GrapesJS 0.22) parses page CSS through the browser's
 * CSSOM. A shorthand whose value contains var() cannot be expanded into its
 * longhands until computed time, so GrapesJS reads those longhands back as
 * empty strings and silently drops the declaration on the first save. That
 * would strip `background: var(--nk-surface)`, `border: 1px solid
 * var(--nk-border)`, `outline: …` and friends from every themed page.
 *
 * Set-B templates are written with ordinary shorthands for readability; this
 * pass rewrites the ones that carry theme tokens into longhands
 * (background-color / background-image, border-*-width/style/color,
 * border-*-radius, outline-width/style/color, -webkit-text-stroke-width/color),
 * which survive an editor round trip intact.
 */
const BORDER_STYLE = /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/;
const BORDER_WIDTH = /^(0|thin|medium|thick|[\d.]+(px|rem|em))$/;
const IMAGE_LAYER = /^(repeating-)?(linear|radial|conic)-gradient\(|^url\(/;

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === separator && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function widthStyleColor(value: string): [string, string, string] {
  let width = "medium";
  let style = "none";
  const colour: string[] = [];
  for (const token of splitTopLevel(value, " ")) {
    if (!colour.length && width === "medium" && BORDER_WIDTH.test(token)) width = token;
    else if (!colour.length && BORDER_STYLE.test(token)) style = token;
    else colour.push(token);
  }
  if (!colour.length) throw new Error(`editorSafeCss: border/outline value without a colour: ${value}`);
  return [width, style, colour.join(" ")];
}

export function editorSafeCss(css: string): string {
  return css.replace(
    /([{;])(\s*)(background|border|border-(?:top|right|bottom|left|block|inline)|border-color|border-radius|outline|-webkit-text-stroke)\s*:\s*([^;{}]+?)\s*(!important)?\s*(?=[;}])/g,
    (whole, pre: string, ws: string, prop: string, value: string, important?: string) => {
      if (!/var\(|color-mix\(/.test(value)) return whole;
      const imp = important ? "!important" : "";
      const decl = (p: string, v: string) => `${p}:${v}${imp}`;
      let out: string[];
      if (prop === "border-radius") {
        if (splitTopLevel(value, " ").length !== 1 || value.includes("/")) {
          throw new Error(`editorSafeCss: use one value (or longhands) for border-radius: ${value}`);
        }
        out = ["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => decl(`border-${c}-radius`, value));
      } else if (prop === "background") {
        const layers = splitTopLevel(value, ",");
        const isImage = (layer: string) => {
          if (!IMAGE_LAYER.test(layer)) return false;
          if (!layer.endsWith(")")) throw new Error(`editorSafeCss: use longhands for background layer "${layer}"`);
          return true;
        };
        const last = layers[layers.length - 1];
        if (layers.length === 1 && !isImage(last)) out = [decl("background-color", last)];
        else if (isImage(last)) out = [decl("background-image", layers.join(","))];
        else {
          layers.slice(0, -1).forEach(isImage);
          out = [decl("background-image", layers.slice(0, -1).join(",")), decl("background-color", last)];
        }
      } else if (prop === "border-color") {
        out = ["top", "right", "bottom", "left"].map((s) => decl(`border-${s}-color`, value));
      } else if (prop === "-webkit-text-stroke") {
        const [width, ...colour] = splitTopLevel(value, " ");
        if (!colour.length) throw new Error(`editorSafeCss: -webkit-text-stroke needs a width and a colour: ${value}`);
        out = [decl("-webkit-text-stroke-width", width), decl("-webkit-text-stroke-color", colour.join(" "))];
      } else if (prop === "outline") {
        const [w, s, c] = widthStyleColor(value);
        out = [decl("outline-width", w), decl("outline-style", s), decl("outline-color", c)];
      } else {
        const [w, s, c] = widthStyleColor(value);
        const sides =
          prop === "border" ? ["top", "right", "bottom", "left"]
          : prop === "border-block" ? ["top", "bottom"]
          : prop === "border-inline" ? ["left", "right"]
          : [prop.slice("border-".length)];
        out = sides.flatMap((side) => [
          decl(`border-${side}-width`, w),
          decl(`border-${side}-style`, s),
          decl(`border-${side}-color`, c),
        ]);
      }
      return pre + ws + out.join(";");
    },
  );
}

for (const template of [saas, corporate, finance, legal, education, nonprofit, portfolio, creative, personal]) {
  for (const page of template.pages) page.css = editorSafeCss(page.css);
}

export {};
