import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import { themeColors, themeVariables } from "./src/lib/theme/palette";

const vars = themeVariables();

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Every colour is a CSS variable with a dark and a light value (see
    // src/lib/theme/palette.ts); the page's data-theme picks which.
    colors: themeColors(),
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          // Script fallbacks, so every studio language renders well.
          "Noto Sans",
          "Noto Sans Arabic",
          "Noto Sans Devanagari",
          "Noto Sans Bengali",
          "Noto Sans SC",
          "Noto Sans JP",
          "Noto Sans KR",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ":root": vars.dark, '[data-theme="light"]': vars.light });
    }),
  ],
} satisfies Config;
