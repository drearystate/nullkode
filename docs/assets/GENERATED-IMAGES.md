# Original generated image library

This collection was created with image generation tools for the platform's templates and Assets library. The individual prompts and intended subjects are recorded in `generated-image-prompts.json`, `generated-image-expansion.json`, `generated-image-business-100.json`, and `generated-image-templates.json`.

- Optimized images: `public/media/generated/*.webp`.
- Editor thumbnails: `public/media/generated/thumbs/*.webp`.
- Full-resolution generated PNGs are working files and are not kept in the source tree.
- Catalog, descriptions, tags and exact template bindings: `src/lib/assets/generated-catalog.json`.
- Visual gallery: `public/media/generated/index.html`.

The collection contains 285 independently generated pictures across 82 categories. Every one of the 134 picture slots in the 18 original templates now shows a generated picture; 121 additional business and lifestyle images are available in the image picker. Gallery thumbnails are resized copies, not additional generated pictures.

The images are fictional illustrative assets. Portraits do not document real staff or customers, and property/travel images do not document real listings or exact destinations. Operators should replace sample imagery and sample business content with their own material where factual representation matters.

The original templates reference their pictures in `/media/generated/` directly, in both their pages and their module seed values, so product and listing photos match between a designed page and its seeded module. The templates no longer use any stock photos, and the old `public/templates/originals/` photo folders and their credit files have been removed. Each template picture's catalog entry keeps `templateId` and `replaces` (the old file name), and template registration still maps any old `/templates/originals/<template>/<file>.webp` path to its generated picture. Registration does not rewrite previously created customer projects or change purchased theme assets.

Both AI builders and the AI page editor also receive a relevant shortlist (three images for small-context models, up to six otherwise), without extra model calls.

Asset search returns tagged local images first, with an Originals filter for this collection alone. No random-image fallback is used. Configured external image services and the private installation's purchased stock library remain available in the general search.

The source release includes the optimized images, thumbnails, catalog and prompts. Full-resolution working PNGs are not required at runtime. To refresh the searchable gallery after catalog changes, run `node scripts/build-generated-gallery.mjs`. To check the collection, run `pnpm exec tsx scripts/check-generated-images.ts`. To refresh actual template previews and check mobile overflow and broken images, run `pnpm exec tsx scripts/render-original-templates.ts`.

Validated on 2026-09-30: 54 unique WebP images and their thumbnails, 51 exact template assignments, and relevant image selection passed the asset checks. Browser checks passed for all 18 original templates and their 45 designed pages, plus gallery filtering and asset search. The optimized library including thumbnails occupies approximately 12 MB. Browser evidence is saved in `output/image-review/` in this working checkout.

Expansion validation on 2026-09-30: all 72 unique images and thumbnails passed checks; all 33 categories returned their assigned images. Browser checks confirmed all 72 entries appear under Assets → Originals, all gallery thumbnails decode, and searching for plumbing and inserting its image into the editor works. The release copy includes all 72 images and thumbnails. The expanded optimized library occupies approximately 16 MB.

The 100-image business expansion contains two scenes each for 50 business types, including home trades, specialty retail, manufacturing, energy, animal care, recreation, professional services, accessibility, and personal services. These additions have no template replacement bindings; they extend the shared Assets library and relevant AI image suggestions.

Business expansion validation on 2026-09-30: all 172 unique images and thumbnails passed the asset checks, with all 51 original template assignments preserved. Browser checks passed for all 82 category searches, the 172-image Originals picker, gallery filtering and thumbnail decoding, and insertion of the new water-filter image into an app page. The optimized library, including thumbnails, occupies approximately 35 MB.

Template completion on 2026-09-30: 83 new pictures replace the last stock photos in the original templates (named team members, products, rooms, listings, treks and decorative backgrounds), so all 134 template picture slots now use generated pictures. They keep the shape of the photos they replace (for example 4:5 portraits, square product shots and wide banners) so page layouts do not shift, and pictures that previously contained lettering (neon signs, painted boards) were redrawn without text, with their descriptions updated to match. The six pictures of Clara Holt in the personal template were made from one reference portrait so they show the same fictional person. Each catalog entry now also records the picture's `width` and `height`. Prompts, sizes and settings are in `generated-image-templates.json`.

Template completion validation on 2026-09-30: all 255 unique images and thumbnails passed the asset checks, with 134 exact template assignments and no remaining references to the old photo folders. The 18 gallery previews were re-rendered from the new pictures, and browser checks passed for all 18 original templates and their 45 designed pages (no broken images, no sideways scrolling on a phone), plus gallery filtering and asset search. The optimized library, including thumbnails, occupies approximately 49 MB.

Blocks and features update on 2026-09-30: 30 more pictures (people, food, products and before/after pairs) replaced every outside photo link in the page-editor blocks and ready-made features, so the platform shows only its own pictures. All 285 images and thumbnails pass the asset checks; prompts are in `generated-image-templates.json`.
