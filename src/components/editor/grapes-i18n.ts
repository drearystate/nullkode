/**
 * GrapesJS's own words (the Layers names, the Design panel's smaller
 * fields, the class picker, the picture window), in the studio's language.
 * The texts are in messages/<locale>/editor.json under "grapes"; this maps
 * them onto GrapesJS's i18n message shape. Block and block-group names are
 * added once the blocks exist (see grapes-editor.tsx).
 */
import type { EditorT } from "./panel-help";

/** CSS properties GrapesJS labels itself (sub-fields and fields listed by name only), by GrapesJS id. */
const PROPERTY_IDS = ["display", "float", "position", "top", "right", "left", "bottom", "flex-direction", "flex-wrap", "justify-content", "align-items", "align-content", "order", "flex-basis", "flex-grow", "flex-shrink", "align-self", "text-shadow-h", "text-shadow-v", "text-shadow-blur", "text-shadow-color", "box-shadow-h", "box-shadow-v", "box-shadow-blur", "box-shadow-spread", "box-shadow-color", "box-shadow-type", "margin-top-sub", "margin-right-sub", "margin-bottom-sub", "margin-left-sub", "padding-top-sub", "padding-right-sub", "padding-bottom-sub", "padding-left-sub", "border-width-sub", "border-style-sub", "border-color-sub", "border-top-left-radius-sub", "border-top-right-radius-sub", "border-bottom-right-radius-sub", "border-bottom-left-radius-sub", "transform-rotate-x", "transform-rotate-y", "transform-rotate-z", "transform-scale-x", "transform-scale-y", "transform-scale-z", "transition-property-sub", "transition-duration-sub", "transition-timing-function-sub", "background-image-sub", "background-repeat-sub", "background-position-sub", "background-attachment-sub", "background-size-sub"];

/** Component types named in Layers and the selection label, by GrapesJS type ("" is a plain box). */
const COMPONENT_NAMES = ["", "wrapper", "text", "comment", "image", "video", "label", "link", "map", "tfoot", "tbody", "thead", "table", "row", "cell", "form", "input", "textarea", "select", "checkbox", "radio", "button", "iframe", "svg", "navbar"];

const key = (id: string) => {
  const k = id.replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_m, c: string) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "");
  return k.charAt(0).toLowerCase() + k.slice(1);
};

/**
 * The editor's `i18n` init option. English keeps GrapesJS's built-in words
 * (the source these were copied from); other languages get theirs.
 */
export function grapesI18n(locale: string, t: EditorT) {
  if (locale === "en") return { locale: "en", detectLocale: false, localeFallback: "en" };
  const properties: Record<string, string> = {};
  for (const id of PROPERTY_IDS) properties[id] = t(`grapes.properties.${key(id)}`);
  const names: Record<string, string> = {};
  for (const id of COMPONENT_NAMES) names[id] = t(`grapes.names.${id ? key(id) : "box"}`);
  return {
    locale,
    detectLocale: false,
    localeFallback: "en",
    messages: {
      [locale]: {
        assetManager: {
          addButton: t("grapes.assetManager.addButton"),
          modalTitle: t("grapes.assetManager.modalTitle"),
          uploadTitle: t("grapes.assetManager.uploadTitle"),
        },
        domComponents: { names },
        selectorManager: {
          label: t("grapes.selectorManager.label"),
          selected: t("grapes.selectorManager.selected"),
          emptyState: t("grapes.selectorManager.emptyState"),
          states: {
            hover: t("grapes.selectorManager.hover"),
            active: t("grapes.selectorManager.active"),
            "nth-of-type(2n)": t("grapes.selectorManager.evenOdd"),
          },
        },
        styleManager: {
          empty: t("grapes.styleManager.empty"),
          layer: t("grapes.styleManager.layer"),
          fileButton: t("grapes.styleManager.fileButton"),
          properties,
        },
        traitManager: {
          empty: t("grapes.traitManager.empty"),
          label: t("grapes.traitManager.label"),
          traits: { options: { target: { false: t("grapes.traitManager.thisWindow"), _blank: t("grapes.traitManager.newWindow") } } },
        },
      },
    },
  };
}
