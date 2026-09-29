# Third-Party Licenses

This document lists third-party software incorporated into or derived from
in Nullkode.

---

## Open CoDesign (Nullkode Designer)

Portions of Nullkode Designer (`src/lib/designer/*`, `src/components/designer/*`,
related Prisma models, API routes, and design prompts) are derived from and
inspired by **Open CoDesign** by OpenCoworkAI.

- Upstream: https://github.com/OpenCoworkAI/open-codesign
- License: MIT

The original MIT License notice follows:

```
MIT License

Copyright (c) 2025 OpenCoworkAI / Open CoDesign contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### What we use

- Agent orchestration shape (prompt → artifact loop) from `packages/core`
- Design system principles (real content, hover/focus states, mobile-first,
  tokens, accessibility, no external JS) from `docs/PRINCIPLES.md`
- Skill module taxonomy (dashboard / landing / pricing / etc.) from
  `packages/templates`
- Artifact-as-HTML model from `packages/artifacts`

### What's different

- Nullkode Designer is web-hosted, not Electron-desktop.
- It uses Nullkode's server-side OpenAI / Claude provider abstraction
  (`src/lib/ai/provider.ts`) rather than `@mariozechner/pi-ai`.
- It persists sessions in PostgreSQL via Prisma (`DesignerSession`,
  `DesignerMessage`) instead of local TOML / file-session state.
- Artifacts are mirrored to the existing `Page` table so the Nullkode
  publish / domains / hosting pipeline serves them unchanged.
- It does not bundle Ollama, llama.cpp, esbuild-wasm, or any model runtime;
  generation is server-side via the user's configured API key.


## Template photographs

The original starter templates (src/lib/templates/originals/) use photographs released under CC0 1.0 (public domain dedication), found via Openverse (StockSnap and the WordPress Photo Directory). CC0 needs no attribution; credits are kept as a courtesy. Each folder under public/templates/originals/<template>/ has a CREDITS.md with the photographer, source page, original file and any edits:

- `public/templates/originals/original-beauty/CREDITS.md` (original-beauty)
- `public/templates/originals/original-corporate/CREDITS.md` (original-corporate)
- `public/templates/originals/original-creative/CREDITS.md` (original-creative)
- `public/templates/originals/original-ecommerce/CREDITS.md` (original-ecommerce)
- `public/templates/originals/original-education/CREDITS.md` (original-education)
- `public/templates/originals/original-finance/CREDITS.md` (original-finance)
- `public/templates/originals/original-fitness/CREDITS.md` (original-fitness)
- `public/templates/originals/original-food/CREDITS.md` (original-food)
- `public/templates/originals/original-health/CREDITS.md` (original-health)
- `public/templates/originals/original-hospitality/CREDITS.md` (original-hospitality)
- `public/templates/originals/original-legal/CREDITS.md` (original-legal)
- `public/templates/originals/original-nonprofit/CREDITS.md` (original-nonprofit)
- `public/templates/originals/original-personal/CREDITS.md` (original-personal)
- `public/templates/originals/original-portfolio/CREDITS.md` (original-portfolio)
- `public/templates/originals/original-realestate/CREDITS.md` (original-realestate)
- `public/templates/originals/original-restaurant/CREDITS.md` (original-restaurant)
- `public/templates/originals/original-saas/CREDITS.md` (original-saas)
- `public/templates/originals/original-travel/CREDITS.md` (original-travel)
